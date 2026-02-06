import {ChildProcess, spawn} from 'child_process';
import {clearTimeout} from 'timers';
import Logger from '../Components/Logger';
import {SubProcessTracer} from '../Components/SubProcessTracer';
import {ConfigFactory} from '../Config/app-config';
import {IModule, ParsedCliArgs} from '../Types';

export class HelmProxyModule implements IModule {
    public readonly name: string = 'helm-proxy';
    private helmProcess: ChildProcess | null = null;

    public async run(cliArgs: ParsedCliArgs): Promise<void> {
        let HELM_CMD_ARGS = ConfigFactory.getCore().HELM_CMD_ARGS;
        if (ConfigFactory.getCore().HELM_DEBUG === true) {
            HELM_CMD_ARGS += ' --debug';
        }
        if (ConfigFactory.getCore().HELM_DRY_RUN === true) {
            HELM_CMD_ARGS += ' --dry-run';
        }

        await this.runHelmCMD(ConfigFactory.getCore().HELM_BIN_PATH, [
            ...HELM_CMD_ARGS.split(' '),
            ...cliArgs.rawArgs
        ]);
    }

    public async runHelmCMD(cmd: string, cliArgs: string[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.helmProcess = spawn(cmd, cliArgs.filter((item) => { return item !== ''; }), {
                env: process.env
            });
            this.helmProcess.stdout.on('data', (arrayBuffer) => {
                const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                data.forEach((item, index) => {
                    if (item !== '') {
                        console.log(item);
                    }
                });
            });
            this.helmProcess.stderr.on('data', (arrayBuffer) => {
                const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                data.forEach((item, index) => {
                    if (item !== '') {
                        console.error(item);
                    }
                });
            });

            SubProcessTracer.getInstance().watch(this.helmProcess);

            this.helmProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                if (code === 0 || signal === 'SIGTERM') {
                    resolve();
                    this.helmProcess = null;
                } else {
                    this.helmProcess = null;
                    process.exitCode = code;
                    Logger.error('HelmProxyModule', 'helm process failed', {code, signal});
                    resolve();
                }
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.helmProcess === null) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.helmProcess.kill('SIGTERM');

            const timer = setTimeout(() => {
                console.log('[helm-assistant] Timeout waiting stop helm. Killing');
                this.helmProcess.kill('SIGKILL');
            }, 10000);

            this.helmProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                Logger.trace('HelmProxyModule', 'helm process finished', {code, signal});
                clearTimeout(timer);
                this.helmProcess = null;
                resolve();
            });
        });
    }
}
