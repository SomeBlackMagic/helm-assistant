import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import {ConfigFactory} from '../Config/app-config';
import {clearTimeout} from 'timers';
import ProcessLocker from '../Components/ProcessLocker';
import * as console from 'console';
import Logger from '../Components/Logger';
import {SubProcessTracer} from '../Components/SubProcessTracer';

const cliColor = require('cli-color');

export class UpgradeModule {
    private isWork: boolean = false; // for detect is module active on stop application
    private isExit: boolean = false;
    private subProcesses: { [n: string]: ChildProcessWithoutNullStreams } = {};
    private releaseName: string = '';
    private namespace: string = '';
    private timeouts: NodeJS.Timeout[] = [];
    private intervals: any[] = [];
    private lockComponent: ProcessLocker = new ProcessLocker();

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

        if (ConfigFactory.getCore().HELM_ASSISTANT_RELEASE_LOCK_ENABLED === true) {
            await this.lockComponent.getLock(this.namespace + '-' + this.releaseName);
        }

        if (ConfigFactory.getCore().HELM_ASSISTANT_UPGRADE_PIPE_LOGS === true) {
            Logger.info('UpgradeModule', 'Start watch new pods, logs and event', {namespace: this.namespace, releaseName: this.releaseName});
            this.kubectlWatchPodsLogsAndEvents();
            await this.kubectlWatchPods();
        }
        if (ConfigFactory.getCore().HELM_ASSISTANT_UPGRADE_JOB_STRICT === true && cliArgs?.waitForJobs === true) {
            await this.watchJobStatus();
        }
    }

    public async stop(): Promise<any> {
        if (this.isWork === false) {
            return Promise.resolve();
        }
        this.isExit = true;
        this.timeouts.forEach((item) => {
            clearTimeout(item);
        });
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
                        podItem.status.initContainerStatuses.forEach((initContainer) => {
                            if (initContainer.state.running !== undefined) {
                                this.kubectlWatchPodContainerLogs(podItem.metadata.name, initContainer.name);
                            }
                        });
                    }
                    if (podItem.status.containerStatuses !== undefined) {
                        podItem.status.containerStatuses.forEach((container) => {
                            if (container.state.running !== undefined) {
                                this.kubectlWatchPodContainerLogs(podItem.metadata.name, container.name);
                            }
                        });
                    }
                });
            })();
        }, 1000));
    }

    private async kubectlWatchPodEvents(podName) {
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
                const result = await this.createChildProcess(ConfigFactory.getCore().KUBECTL_BIN_PATH, newProcessArgs, true, true);
                if (result === '') {
                    Logger.info('UpgradeModule:watchJobStatus', 'Job not found in release. Wait for job');
                    return;
                }

                let resultJson:any = {};
                try {
                    resultJson = JSON.parse(result);
                } catch (e) {
                    Logger.fatal('UpgradeModule', 'Can not parse JSON output.', result);
                    return;
                }

                if (Object.keys(resultJson).length === 0) {
                    Logger.warn('UpgradeModule:watchJobStatus', 'Empty result from kube api');
                    return;
                }
                if (resultJson.items.length === 0) {
                    Logger.info('UpgradeModule:watchJobStatus', 'Jobs not found in release. Wait for job');
                    return;
                }
                resultJson.items.forEach((jobItem: any) => {
                    if (typeof jobItem?.status?.conditions !== 'undefined') {
                        jobItem.status.conditions.forEach((item: any) => {
                            if (item.type === 'Failed' && item.status === 'True') {
                                Logger.info('UpgradeModule:watchJobStatus', 'Job is failed. Exit!', {
                                    job: jobItem?.metadata?.name,
                                    reason: item.reason,
                                    message: item.message,
                                });
                                process.exitCode = 1;
                                process.emit('SIGTERM');
                            }
                        });
                    } else {
                        Logger.trace('UpgradeModule:watchJobStatus', 'Conditions not found in Job');
                    }
                });
            })();
        }, 1000));
    }

    private async createChildProcess(command: string, args: string[], wait: boolean = false, grabStdOut: boolean = false, pipeLogs: boolean = false, logPrefix: string = '', logColor: string = 'white') {
        if (this.isExit === true) {
            // console.log('Application is in exit process. Skip create new process');
            return Promise.resolve();
        }
        if (this.subProcesses[logPrefix.replace(/\s/g, '-')]) {
            return Promise.resolve(true);
        }
        let colorator;
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
            if (pipeLogs === true) {
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

            if (wait === true) {
                process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                    if ((code === 0 || code === 1) && wait === true) {
                        resolve(stdout);
                    } else if (signal === 'SIGINT') {
                        resolve('{}');
                    } else {
                        reject(new Error('command failed. Code: ' + code));
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
