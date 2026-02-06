export type ExitHandlerCallback = (data: { code: string }) => void;

export class ProcessHelper {
    public exitHandler: ExitHandlerCallback;

    public subscribeOnProcessExit(): void {
        process.on('close' as any, this.exitHandler.bind(null, {code: 'close'}));
        process.on('SIGINT', this.exitHandler.bind(null, {code: 'SIGINT'}));
        process.on('SIGQUIT', this.exitHandler.bind(null, {code: 'SIGQUIT'}));

        process.on('SIGUSR1', this.exitHandler.bind(null, {code: 'SIGUSR1'}));
        process.on('SIGUSR2', this.exitHandler.bind(null, {code: 'SIGUSR2'}));
        process.on('SIGTERM', this.exitHandler.bind(null, {code: 'SIGTERM'}));

        process.on('uncaughtException', this.uncaughtExceptionHandler);
        process.on('unhandledRejection', this.uncaughtRejectionHandler);
    }

    public setExitHandler(cb: ExitHandlerCallback): void {
        this.exitHandler = cb;
    }

    public uncaughtExceptionHandler(error: Error): void {
        console.error('[Helm Assistant]: Uncaught Exception');
        console.error('-----------------------------------');
        console.error(error.message, error.stack, error.name);
        console.error('-----------------------------------');
        process.emit('SIGTERM');
    }

    public uncaughtRejectionHandler(reason: {} | null | undefined, promise: Promise<any>): void {
        console.error('Helm Assistant: Uncaught Rejection');
        console.error('-----------------------------------');
        if (typeof reason !== 'undefined') {
            console.error(reason['message']);
            console.error(reason['stack']);
        } else {
            console.error(JSON.stringify(reason));
        }
        console.error('-----------------------------------');
        process.emit('SIGTERM');
    }
}
