export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface ILogger {
    trace(text: string, data?: object): void;
    debug(text: string, data?: object): void;
    info(text: string, data?: object): void;
    warn(text: string, data?: object): void;
    error(text: string, data?: object): void;
    fatal(text: string, data?: object): void;
}

export interface ILoggerFactory {
    create(category: string): ILogger;
}
