import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import {ConfigFactory} from '../Config/app-config';
import {clearTimeout} from 'timers';
import ProcessLocker from '../Components/ProcessLocker';
import * as console from 'console';
import Logger from '../Components/Logger';
import {SubProcessTracer} from '../Components/SubProcessTracer';
import {V1Job, V1JobList} from '../Kubernetes/JobTypes';

import cliColor = require('cli-color');

export interface JobWatchDecision {
    failed: boolean;
    jobName?: string;
    reason?: string;
    message?: string;
}

/**
 * Pure decision function: given the Jobs matched by the release selector and the
 * time the watcher started, decide whether any of them has terminally failed.
 * Deliberately has no I/O and no side effects so it can be unit tested with
 * hand-written fixtures instead of a real kubectl/cluster.
 */
export function evaluateJobItems(items: V1Job[], watchStartedAt: Date): JobWatchDecision {
    for (const jobItem of items) {
        const creationTimestamp = jobItem.metadata?.creationTimestamp;
        if (creationTimestamp instanceof Date && creationTimestamp < watchStartedAt) {
            // Job existed before this upgrade started (e.g. left over, not yet
            // garbage-collected, from a previous release) - not ours to react to.
            continue;
        }
        const conditions = jobItem.status?.conditions ?? [];
        for (const condition of conditions) {
            // Deliberately not using status.failed/status.succeeded counters here: they can
            // increment on individual pod retries before backoffLimit is exhausted, and
            // re-deriving "is this terminal" from counters + backoffLimit would duplicate
            // (and could race with) the Job controller's own logic. status.conditions is
            // set by the controller as soon as it reaches a terminal state, so it's both
            // simpler and safer to rely on.
            if (condition.status === 'True' && (condition.type === 'Failed' || condition.type === 'FailureTarget')) {
                return {
                    failed: true,
                    jobName: jobItem.metadata?.name,
                    reason: condition.reason,
                    message: condition.message,
                };
            }
        }
    }
    return {failed: false};
}

export type ChildProcessExitOutcome =
    | {kind: 'success'; stdout: string}
    | {kind: 'resolved-empty'}
    | {kind: 'error'; error: Error};

/**
 * Pure decision function for how createChildProcess should settle its promise
 * once the underlying process exits, isolated from spawn() so it is unit
 * testable without a real child process.
 */
export function interpretChildProcessExit(code: number | null, signal: NodeJS.Signals | null, stdout: string): ChildProcessExitOutcome {
    if (code === 0) {
        return {kind: 'success', stdout};
    }
    if (signal === 'SIGINT') {
        return {kind: 'resolved-empty'};
    }
    return {kind: 'error', error: new Error('command failed. Code: ' + code)};
}

export class UpgradeModule {
    private isWork: boolean = false; // for detect is module active on stop application
    private isExit: boolean = false;
    private subProcesses: { [n: string]: ChildProcessWithoutNullStreams } = {};
    private releaseName: string = '';
    private namespace: string = '';
    private intervals: NodeJS.Timeout[] = [];
    private lockComponent: ProcessLocker = new ProcessLocker();
    private initialJobUids: Set<string> = new Set();
    private isFirstPoll: boolean = true;

    public async run(cliArgs: any): Promise<any> {
        this.isWork = true;
        // if (ConfigFactory.getCore().HELM_ASSISTANT_DEBUG === true && ConfigFactory.getCore().HELM_ASSISTANT_DEBUG_LEVEL >= 3) {
        //     const tracer = setInterval(() => {
        //         // this.subProcesses
        //         for (const [key, value] of Object.entries(this.subProcesses)) {
        //             Logger.trace('UpgradeModule', `${key}: ${value.pid}`);
        //         }
        //
        //
        //         if (Object.entries(this.subProcesses).length === 0 && this.isExit) {
        //             Logger.trace('UpgradeModule', 'All subProcesses stop.');
        //             clearInterval(tracer);
        //         }
        //     }, 500);
        // }
        this.releaseName = cliArgs._[1];
        if (typeof cliArgs.namespace !== 'undefined') {
            this.namespace = cliArgs.namespace;
        } else if (typeof cliArgs.n !== 'undefined') {
            this.namespace = cliArgs.n;
        } else {
            this.namespace = 'default';
        }

        if (ConfigFactory.getCore().HELM_ASSISTANT_RELEASE_LOCK_ENABLED) {
            await this.lockComponent.getLock(this.namespace + '-' + this.releaseName);
        }

        if (ConfigFactory.getCore().HELM_ASSISTANT_UPGRADE_PIPE_LOGS) {
            Logger.info('UpgradeModule', 'Start watch new pods, logs and event', {namespace: this.namespace, releaseName: this.releaseName});
            this.kubectlWatchPodsLogsAndEvents();
            await this.kubectlWatchPods();
        }
        if (ConfigFactory.getCore().HELM_ASSISTANT_UPGRADE_JOB_STRICT && cliArgs?.waitForJobs === true) {
            await this.watchJobStatus();
        }
    }

    public async stop(): Promise<any> {
        if (!this.isWork) {
            return Promise.resolve();
        }
        this.isExit = true;
        this.intervals.forEach((item) => {
            clearInterval(item);
        });
        await this.lockComponent.clearLock(this.namespace + '-' + this.releaseName);

        Logger.trace('UpgradeModule:stop', 'Stop all subprocess', {count: Object.entries(this.subProcesses).length});
        let promises = Object.entries(this.subProcesses).map((entry) => {
            const [key, item] = entry;
            return new Promise((resolve, reject) => {
                // https://github.com/kubernetes/kubectl/blob/652881798563c00c1895ded6ced819030bfaa4d7/pkg/util/interrupt/interrupt.go#L28
                item.kill('SIGTERM');
                const interval = setInterval(() => {
                    // https://github.com/kubernetes/kubectl/blob/652881798563c00c1895ded6ced819030bfaa4d7/pkg/util/interrupt/interrupt.go#L28
                    Logger.trace('UpgradeModule:stop', 'Send SIGTERM again', {pid: item.pid});
                    item.kill('SIGTERM');
                }, 1000);
                const timer = setTimeout(() => {
                    clearInterval(interval);
                    Logger.trace('UpgradeModule:stop', 'Stop process ' + key + ' timeout. Killing', {pid: item.pid});
                    item.kill('SIGKILL');
                }, 5000);

                item.on('exit', (code: number) => {
                    clearInterval(interval);
                    clearTimeout(timer);
                    Logger.trace('UpgradeModule:stop', 'Process ' + key + ' stopped', {pid: item.pid});
                    resolve({exitCode: code});
                });
            });
        });
        return await Promise.all(promises);
    }

    private async kubectlWatchPods() {
        let args: string[] = [
            ...ConfigFactory.getCore().KUBECTL_CMD_ARGS.split(' '),
            'get', 'pods',
            '--watch',
            '--namespace', this.namespace,
            '--selector', 'app.kubernetes.io/instance=' + this.releaseName
        ];
        await this.createChildProcess(ConfigFactory.getCore().KUBECTL_BIN_PATH, args, false, false, true, 'pods', 'magenta');

    }

    private kubectlWatchPodsLogsAndEvents() {
        this.intervals.push(setInterval(() => {
            (async () => {
                let newProcessArgs: string[] = [
                    ...ConfigFactory.getCore().KUBECTL_CMD_ARGS.split(' '),
                    'get', 'pods',
                    '--namespace', this.namespace,
                    '--selector', 'app.kubernetes.io/instance=' + this.releaseName,
                    '-o', 'json'
                ];
                const pods = await this.createChildProcess(ConfigFactory.getCore().KUBECTL_BIN_PATH, newProcessArgs, true, true);
                let podList: any = {};
                try {
                    podList = JSON.parse(pods);
                } catch (e) {
                    Logger.fatal('UpgradeModule', 'Can not parse JSON output.', pods);
                    return;
                }

                if (podList.items === undefined) {
                    Logger.warn('UpgradeModule', 'Empty pod list on kubectl get pods');
                    return;
                }
                podList.items.forEach((podItem: any) => {
                    this.kubectlWatchPodEvents(podItem.metadata.name);
                    if (podItem.status.initContainerStatuses !== undefined) {
                        podItem.status.initContainerStatuses.forEach((initContainer: any) => {
                            if (initContainer.state.running !== undefined) {
                                this.kubectlWatchPodContainerLogs(podItem.metadata.name, initContainer.name);
                            }
                        });
                    }
                    if (podItem.status.containerStatuses !== undefined) {
                        podItem.status.containerStatuses.forEach((container: any) => {
                            if (container.state.running !== undefined) {
                                this.kubectlWatchPodContainerLogs(podItem.metadata.name, container.name);
                            }
                        });
                    }
                });
            })();
        }, 1000));
    }

    private async kubectlWatchPodEvents(podName: string) {
        let newProcessArgs: string[] =
            [
                ...ConfigFactory.getCore().KUBECTL_CMD_ARGS.split(' '),
                'get', 'events',
                '--watch-only',
                '--field-selector', 'involvedObject.name=' + podName,
                '--namespace', this.namespace,
            ];
        await this.createChildProcess(ConfigFactory.getCore().KUBECTL_BIN_PATH, newProcessArgs, false, false, true, 'pod ' + podName + ' events', 'yellow');
    }

    private async kubectlWatchPodContainerLogs(podName: string, containerName: string) {
        let newProcessArgs: string[] =
            [
                ...ConfigFactory.getCore().KUBECTL_CMD_ARGS.split(' '),
                'logs',
                '--follow',
                '--tail', ConfigFactory.getCore().HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES.toString(),
                '--namespace', this.namespace,
                '--container', containerName,
                podName
            ];
        await this.createChildProcess(ConfigFactory.getCore().KUBECTL_BIN_PATH, newProcessArgs, false, false, true, 'logs ' + podName + ' [' + containerName + ']', 'blue');
    }

    private async watchJobStatus() {
        Logger.info('UpgradeModule:watchJobStatus', 'Start watch for jobs status', {namespace: this.namespace, releaseName: this.releaseName});
        const watchStartedAt = new Date();
        const newProcessArgs: string[] =
            [
                ...ConfigFactory.getCore().KUBECTL_CMD_ARGS.split(' '),
                'get', 'job',
                '--selector', 'app.kubernetes.io/instance=' + this.releaseName,
                '--namespace', this.namespace,
                '-o', 'json',
            ];
        this.intervals.push(setInterval(() => {
            (async () => {
                try {
                    const result: string = await this.createChildProcess(ConfigFactory.getCore().KUBECTL_BIN_PATH, newProcessArgs, true, true);
                    if (result === '') {
                        Logger.info('UpgradeModule:watchJobStatus', 'Job not found in release. Wait for job');
                        return;
                    }

                    let resultJson: Partial<V1JobList> = {};
                    try {
                        resultJson = JSON.parse(result) as V1JobList;
                    } catch (e) {
                        Logger.fatal('UpgradeModule', 'Can not parse JSON output.', {result});
                        return;
                    }

                    if (Object.keys(resultJson).length === 0) {
                        Logger.warn('UpgradeModule:watchJobStatus', 'Empty result from kube api');
                        return;
                    }
                    if (resultJson.items === undefined || resultJson.items.length === 0) {
                        Logger.info('UpgradeModule:watchJobStatus', 'Jobs not found in release. Wait for job');
                        return;
                    }

                    // Filter out jobs that existed before the monitoring started to avoid reacting to old, failed jobs.
                    if (this.isFirstPoll) {
                        resultJson.items.forEach(item => {
                            if (item.metadata?.uid) {
                                this.initialJobUids.add(item.metadata.uid);
                            }
                        });
                        this.isFirstPoll = false;
                        Logger.info('UpgradeModule:watchJobStatus', 'Initialized initial Job UIDs from existing jobs', { count: this.initialJobUids.size });
                        return;
                    }

                    const currentItems = resultJson.items.filter(item => {
                        const uid = item.metadata?.uid;
                        return typeof uid === 'string' && !this.initialJobUids.has(uid);
                    });

                    if (currentItems.length === 0) {
                        Logger.debug('UpgradeModule:watchJobStatus', 'No new jobs detected yet.');
                        return;
                    }

                    const decision = evaluateJobItems(currentItems, watchStartedAt);
                    if (decision.failed) {
                        Logger.info('UpgradeModule:watchJobStatus', 'Job is failed. Exit!', {
                            job: decision.jobName,
                            reason: decision.reason,
                            message: decision.message,
                        });
                        process.exitCode = 1;
                        process.emit('SIGTERM');
                    }
                } catch (e) {
                    Logger.error('UpgradeModule:watchJobStatus', 'Failed to poll job status from kube api', {error: e instanceof Error ? e.message : String(e)});
                }
            })();
        }, 1000));
    }

    private async createChildProcess(
        command: string,
        args: string[],
        wait: boolean = false,
        grabStdOut: boolean = false,
        pipeLogs: boolean = false,
        logPrefix: string = '',
        logColor: string = 'white'
    ) {
        if (this.isExit) {
            // console.log('Application is in an exit process. Skip create a new process');
            return Promise.resolve();
        }
        if (this.subProcesses[logPrefix.replace(/\s/g, '-')]) {
            return Promise.resolve(true);
        }
        let colorator: typeof cliColor.white;
        switch (logColor) {
            case 'blue':
                colorator = cliColor.blue;
                break;
            case 'yellow':
                colorator = cliColor.yellow;
                break;
            case 'magenta':
                colorator = cliColor.magenta;
                break;
            case 'white':
            default:
                colorator = cliColor.white;
                break;


        }
        return new Promise<any>((resolve, reject) => {
            const process = spawn(command, args.filter((item) => {
                return item !== '';
            }));
            let stdout: string = '';
            if (pipeLogs) {
                process.stdout.on('data', (arrayBuffer) => {
                    const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                    data.forEach((item, index) => {
                        if (item !== '') {
                            console.log(colorator(logPrefix + ' ' + item));
                        }
                    });

                });
                process.stderr.on('data', (arrayBuffer) => {
                    const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                    data.forEach((item, index) => {
                        if (item !== '') {
                            console.error(item);
                        }
                    });

                });
            } else if (grabStdOut === true) {
                process.stdout.on('data', (arrayBuffer) => {
                    const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                    data.forEach((item, index) => {
                        if (item !== '') {
                            stdout += item;
                        }
                    });

                });
            }
            SubProcessTracer.getInstance().watch(process);

            if (wait) {
                process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                    const outcome = interpretChildProcessExit(code, signal, stdout);
                    switch (outcome.kind) {
                        case 'success':
                            resolve(outcome.stdout);
                            break;
                        case 'resolved-empty':
                            resolve('{}');
                            break;
                        case 'error':
                            reject(outcome.error);
                            break;
                    }
                });
            } else {
                this.subProcesses[logPrefix.replace(/\s/g, '-')] = process;
                Logger.trace('UpgradeModule', 'Add to subProcesses', {name: logPrefix.replace(/\s/g, '-'), pid:process.pid });
                process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                    Logger.trace('UpgradeModule', 'Remove from subProcesses', {name: logPrefix.replace(/\s/g, '-'), pid:process.pid });
                    delete this.subProcesses[logPrefix.replace(/\s/g, '-')];
                });
                resolve('{}');
            }

        });
    }
}
