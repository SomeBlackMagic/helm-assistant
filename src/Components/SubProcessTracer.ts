import Logger from './Logger';
import {ILogger} from '../Types';
import {ChildProcessWithoutNullStreams, ChildProcess} from 'child_process';
import * as process from 'process';

export class SubProcessTracer {
    private static instance: SubProcessTracer;
    private logger: ILogger;
    private processList: { [n: number]: ChildProcessWithoutNullStreams | ChildProcess } = {};
    private processListPrintInterval: NodeJS.Timer | null = null;
    private shutdown: boolean = false;

    private constructor() {
        this.logger = Logger.getInstance('SubProcessTracer');
        process.on('message', () => {
            this.shutdown = true;
        });
        this.displaySubProcess();
    }

    public static getInstance(): SubProcessTracer {
        if (!SubProcessTracer.instance) {
            SubProcessTracer.instance = new SubProcessTracer();
        }

        return SubProcessTracer.instance;
    }

    public watch(stream: ChildProcessWithoutNullStreams | ChildProcess) {
        this.processList[stream.pid] = stream;
        if (stream.spawnargs) {
            this.logger.trace('Spawn new process: [' + stream.pid + '] ' + stream.spawnargs.join(' '));
        } else {
            this.logger.trace('Spawn new process: [' + stream.pid + ']');
        }

        stream.on('beforeExit', () => {this.logger.trace( '[' + stream.pid + ']' + ' send => beforeExit'); });
        stream.on('disconnect', () => {this.logger.trace('[' + stream.pid + ']' + ' send => disconnect'); });
        stream.on('rejectionHandled', () => {this.logger.trace('[' + stream.pid + ']' + ' send => rejectionHandled'); });
        stream.on('uncaughtException', () => {this.logger.trace('[' + stream.pid + ']' + ' send => uncaughtException'); });
        stream.on('unhandledRejection', () => {this.logger.trace('[' + stream.pid + ']' + ' send => unhandledRejection'); });
        stream.on('warning', (warning: Error) => {this.logger.trace('[' + stream.pid + ']' + ' send => warning' , warning); });
        stream.on('message', () => {this.logger.trace('[' + stream.pid + ']' + ' send => message'); });
        stream.on('removeListener', (type: string) => {this.logger.trace('[' + stream.pid + ']' + ' send => removeListener' , {type}); });
        stream.on('multipleResolves', () => {this.logger.trace('[' + stream.pid + ']' + ' send => multipleResolves '); });
        stream.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
            delete this.processList[stream.pid];

            if (code !== 0 ) {
                this.logger.debug('[' + stream.pid + ']' + ' send => exit:' + code, {signal: signal} );
            } else {
                this.logger.trace('[' + stream.pid + ']' + ' send => exit:' + code, {signal: signal} );
            }
        });

        stream.on('SIGHUP', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGHUP. args:' + args); });
        stream.on('SIGINT', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGINT. args:' + args); });
        stream.on('SIGQUIT', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGQUIT. args:' + args); });
        stream.on('SIGTERM', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGTERM. args:' + args); });


        // stream.on('SIGABRT', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGABRT. args:' + args); });
        // stream.on('SIGALRM', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGALRM. args:' + args); });
        // stream.on('SIGBUS', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGBUS. args:' + args); });
        // stream.on('SIGCHLD', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGCHLD. args:' + args); });
        // stream.on('SIGCONT', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGCONT. args:' + args); });
        // stream.on('SIGFPE', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGFPE. args:' + args); });
        // stream.on('SIGILL', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGILL. args:' + args); });
        // stream.on('SIGIO', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGIO. args:' + args); });
        // stream.on('SIGIOT', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGIOT. args:' + args); });
        // stream.on('SIGPIPE', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGPIPE. args:' + args); });
        // stream.on('SIGPOLL', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGPOLL. args:' + args); });
        // stream.on('SIGPROF', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGPROF. args:' + args); });
        // stream.on('SIGPWR', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGPWR. args:' + args); });
        // stream.on('SIGSEGV', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGSEGV. args:' + args); });
        // stream.on('SIGSTKFLT', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGSTKFLT. args:' + args); });
        // stream.on('SIGSYS', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGSYS. args:' + args); });
        // stream.on('SIGTRAP', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGTRAP. args:' + args); });
        // stream.on('SIGTSTP', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGTSTP. args:' + args); });
        // stream.on('SIGTTIN', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGTTIN. args:' + args); });
        // stream.on('SIGTTOU', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGTTOU. args:' + args); });
        // stream.on('SIGUNUSED', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGUNUSED. args:' + args); });
        // stream.on('SIGURG', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGURG. args:' + args); });
        // stream.on('SIGUSR1', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGUSR1. args:' + args); });
        // stream.on('SIGUSR2', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGUSR2. args:' + args); });
        // stream.on('SIGVTALRM', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGVTALRM. args:' + args); });
        // stream.on('SIGWINCH', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGWINCH. args:' + args); });
        // stream.on('SIGXCPU', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGXCPU. args:' + args); });
        // stream.on('SIGXFSZ', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGXFSZ. args:' + args); });
        // stream.on('SIGBREAK', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGBREAK. args:' + args); });
        // stream.on('SIGLOST', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGLOST. args:' + args); });
        // stream.on('SIGINFO', (...args: any[]) => {this.logger.trace('[' + stream.pid + ']' + ' send => SIGINFO. args:' + args); });
        //
        // stream.stdout.on('close', () => { this.logger.trace('[' + stream.pid + ']' + ' send => close'); });
        // stream.stdout.on('data', (chunk: any) => { this.logger.trace('[' + stream.pid + ']' + ' send => data ' + chunk); });
        // stream.stdout.on('end', () => { this.logger.trace('[' + stream.pid + ']' + ' send => end'); });
        // stream.stdout.on('error', (err: Error) => { this.logger.trace('[' + stream.pid + ']' + ' send => error. ' + err); });
        // stream.stdout.on('pause', () => { this.logger.trace('[' + stream.pid + ']' + ' send => pause'); });
        // stream.stdout.on('readable', () => { this.logger.trace('[' + stream.pid + ']' + ' send => readable'); });
        // stream.stdout.on('resume', () => { this.logger.trace('[' + stream.pid + ']' + ' send => resume'); });
    }

    private displaySubProcess() {
        if (null === this.processListPrintInterval) {
            this.processListPrintInterval = setInterval(() => {
                if (this.shutdown === true && Object.entries(this.processList).length === 0) {
                    clearInterval(this.processListPrintInterval);
                }
                let list = [];
                for (const [key, value] of Object.entries(this.processList)) {
                    list.push(key);
                }
                this.logger.trace('Running process:', list);
            }, 1000);
        }
    }
}
