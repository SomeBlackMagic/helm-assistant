import {ChildProcessWithoutNullStreams, spawn} from 'child_process';
import {processSignalDebug} from '../Helpers';
import {clearTimeout} from 'timers';

export class HelmProxyModule {
    private process: ChildProcessWithoutNullStreams;

    public async runHelmCMD(cmd: string, cliArgs: string[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.process = spawn(cmd, cliArgs.filter((item) => { return item !== ''; }));

            this.process.stdout.on('data', (arrayBuffer) => {
                const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                data.forEach((item, index) => {
                    if (item !== '') {
                        console.log(item);
                    }
                });
            });
            this.process.stderr.on('data', (arrayBuffer) => {
                const data = Buffer.from(arrayBuffer, 'utf-8').toString().split('\n');
                data.forEach((item, index) => {
                    if (item !== '') {
                        console.error(item);
                    }
                });

            });

            processSignalDebug('helm:->', this.process);

            this.process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                if (code === 0 || signal === 'SIGINT') {
                    resolve();
                    this.process = null;
                } else {
                    this.process = null;
                    process.exitCode = code;
                    console.log('Helm command failed. Exit code: ' + code);
                    resolve();
                }
            });
        });
    }

    public async stop(): Promise<void> {
        if (this.process === null) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            this.process.kill('SIGINT');
            const  timer = setTimeout(() => {
                console.log('Timeout waiting stop helm. Killing');
                this.process.kill('SIGKILL');
                // clearInterval(interval);
            }, 10000);
            this.process.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
                console.log('close');
            });
            this.process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
                this.process = null;
                console.log('Helm exit code: ' + code + ' signal ' + signal);
                clearTimeout(timer);
                resolve();
            });
        });
    }
}
