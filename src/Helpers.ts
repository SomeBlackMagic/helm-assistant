'use strict';
import {config, DotenvParseOutput} from 'dotenv';
import * as fs from 'fs';
import {ChildProcessWithoutNullStreams} from 'child_process';
import {ConfigFactory} from './Config/app-config';
import * as console from 'console';
import Logger from './Components/Logger';

export function inArray(arr: string[] | number[] = [], val:string|number): boolean {
    let len = arr.length;
    let i;

    for (i = 0; i < len; i++) {
        if (arr[i] === val) {
            return true;
        }
    }
    return false;
}

export function env(key: string, defaultValue: any = null): string {
    return process.env[key] ?? defaultValue;
}

/**
 *
 * @param key
 * @param defaultValue
 * @param radix
 */
export function envNumber(key: string, defaultValue: number = 0, radix: number): number {
    return process.env[key] ? parseInt(process.env[key]!, radix) : defaultValue;
}


/**
 *
 * @param key
 * @param defaultValue
 */
export function envBoolean(key: string, defaultValue: boolean): boolean {
    let value = process.env[key] ? process.env[key] : defaultValue;
    // @ts-ignore
    switch (value) {
        case true:
        case 'true':
        case 'True':
        case '1':
        case 'on':
        case 'yes':
            return true;
        default:
            return false;
    }
}

export function processSignalDebug(name: string, stream: ChildProcessWithoutNullStreams | NodeJS.Process) {
    if (ConfigFactory.getCore().HELM_ASSISTANT_DEBUG) {
        if ('spawnargs' in stream) {
            Logger.trace('processDebugger', 'Spawn new process: [' + stream.pid + ']' + name + ' ' + stream.spawnargs.join(' '));
        } else {
            Logger.trace('processDebugger', 'Spawn new process: [' + stream.pid + ']' + name + ' ' + stream.argv.join(' '));
        }

        stream.on('beforeExit', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => beforeExit'); });
        stream.on('disconnect', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => disconnect'); });
        stream.on('rejectionHandled', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => rejectionHandled'); });
        stream.on('uncaughtException', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => uncaughtException'); });
        stream.on('unhandledRejection', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => unhandledRejection'); });
        stream.on('warning', (warning: Error) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => warning' , warning); });
        stream.on('message', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => message'); });
        stream.on('removeListener', (type: string) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => removeListener' , {type}); });
        stream.on('multipleResolves', () => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => multipleResolves '); });
        stream.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
            if (code !== 0 ) {
                Logger.error('processDebugger', '[' + stream.pid + ']' + ' send => exit:' + code, {signal: signal} );
            } else {
                Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => exit:' + code, {signal: signal} );
            }
        });

        stream.on('SIGHUP', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGHUP. args:' + args); });
        stream.on('SIGINT', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGINT. args:' + args); });
        stream.on('SIGQUIT', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGQUIT. args:' + args); });
        stream.on('SIGTERM', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGTERM. args:' + args); });

    }

    // stream.on('SIGABRT', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGABRT. args:' + args); });
    // stream.on('SIGALRM', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGALRM. args:' + args); });
    // stream.on('SIGBUS', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGBUS. args:' + args); });
    // stream.on('SIGCHLD', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGCHLD. args:' + args); });
    // stream.on('SIGCONT', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGCONT. args:' + args); });
    // stream.on('SIGFPE', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGFPE. args:' + args); });
    // stream.on('SIGILL', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGILL. args:' + args); });
    // stream.on('SIGIO', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGIO. args:' + args); });
    // stream.on('SIGIOT', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGIOT. args:' + args); });
    // stream.on('SIGPIPE', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGPIPE. args:' + args); });
    // stream.on('SIGPOLL', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGPOLL. args:' + args); });
    // stream.on('SIGPROF', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGPROF. args:' + args); });
    // stream.on('SIGPWR', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGPWR. args:' + args); });
    // stream.on('SIGSEGV', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGSEGV. args:' + args); });
    // stream.on('SIGSTKFLT', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGSTKFLT. args:' + args); });
    // stream.on('SIGSYS', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGSYS. args:' + args); });
    // stream.on('SIGTRAP', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGTRAP. args:' + args); });
    // stream.on('SIGTSTP', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGTSTP. args:' + args); });
    // stream.on('SIGTTIN', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGTTIN. args:' + args); });
    // stream.on('SIGTTOU', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGTTOU. args:' + args); });
    // stream.on('SIGUNUSED', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGUNUSED. args:' + args); });
    // stream.on('SIGURG', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGURG. args:' + args); });
    // stream.on('SIGUSR1', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGUSR1. args:' + args); });
    // stream.on('SIGUSR2', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGUSR2. args:' + args); });
    // stream.on('SIGVTALRM', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGVTALRM. args:' + args); });
    // stream.on('SIGWINCH', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGWINCH. args:' + args); });
    // stream.on('SIGXCPU', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGXCPU. args:' + args); });
    // stream.on('SIGXFSZ', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGXFSZ. args:' + args); });
    // stream.on('SIGBREAK', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGBREAK. args:' + args); });
    // stream.on('SIGLOST', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGLOST. args:' + args); });
    // stream.on('SIGINFO', (...args: any[]) => {Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => SIGINFO. args:' + args); });
    //
    // stream.stdout.on('close', () => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => close'); });
    // stream.stdout.on('data', (chunk: any) => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => data ' + chunk); });
    // stream.stdout.on('end', () => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => end'); });
    // stream.stdout.on('error', (err: Error) => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => error. ' + err); });
    // stream.stdout.on('pause', () => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => pause'); });
    // stream.stdout.on('readable', () => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => readable'); });
    // stream.stdout.on('resume', () => { Logger.trace('processDebugger', '[' + stream.pid + ']' + ' send => resume'); });
}

export function loadEnvVariablesFromFile(): void {
    let currentEnv = env('APP_ENV');
        if (fs.existsSync(process.cwd() + '/.env.local')) {
        const env = loadEnvFile(process.cwd() + '/.env.local');
        if (env === false) {
            process.exit(1);
        }
    }
    if (currentEnv !== null && currentEnv !== 'local') {
        if (fs.existsSync(process.cwd() + '/.env.' + currentEnv)) {
            const env = loadEnvFile(process.cwd() + '/.env.' + currentEnv);
            if (env === false) {
                process.exit(1);
            }
        }
    }
}

function loadEnvFile(path: string): boolean | DotenvParseOutput {
    try {
        fs.accessSync(path, fs.constants.R_OK);
        console.log('[helm-assistant] Load env vars from file: ' + path);
        const dotEnv = config({path: path, override: true, debug: process.env.DEBUG === '*'});

        if (dotEnv.error !== undefined) {
            console.warn('Can not parse .env file in ');
            console.warn(dotEnv.error);
            return false;
        }
        return dotEnv.parsed ?? false;
    } catch (err) {
        console.warn(err);
        return false;
    }

}
