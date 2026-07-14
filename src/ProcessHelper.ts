export class ProcessHelper {
    public exitHandler!: Function;


    public subscribeOnProcessExit(): void {


        /*do something when app is closing*/
        // process.on('exit', this.exitHandler.bind(null, {cleanup: true, code:'exit'}));

        /*catches ctrl+c event*/
        process.on('close', this.exitHandler.bind(null, {code: 'close'}));
        process.on('SIGINT', this.exitHandler.bind(null, {code: 'SIGINT'}));
        process.on('SIGQUIT', this.exitHandler.bind(null, {code: 'SIGQUIT'}));

        /*catches "kill pid" (for example: nodemon restart)*/
        process.on('SIGUSR1', this.exitHandler.bind(null, {code: 'SIGUSR1'}));
        process.on('SIGUSR2', this.exitHandler.bind(null, {code: 'SIGUSR2'}));
        process.on('SIGTERM', this.exitHandler.bind(null, {code: 'SIGTERM'}));

        /*catches uncaught exceptions*/
        process.on('uncaughtException', this.uncaughtExceptionHandler);
        process.on('unhandledRejection', this.uncaughtRejectionHandler);
    }

    public setExitHandler(cb: Function): void {
        this.exitHandler = cb;
    }


    public uncaughtExceptionHandler(error: Error) {
        console.error('[Helm Assistant]: Uncaught Exception');
        console.error('-----------------------------------');
        console.error(error.message, error.stack, error.name);
        console.error('-----------------------------------');
        process.emit('SIGTERM');

    }

    public uncaughtRejectionHandler(reason: unknown, promise: Promise<unknown>) {
        console.error('Helm Assistant: Uncaught Rejection');
        console.error('-----------------------------------');
        if (reason instanceof Error) {
            console.error(reason.message);
            console.error(reason.stack);
        } else {
            console.error(JSON.stringify(reason));
        }
        console.error('-----------------------------------');
        process.emit('SIGTERM');

    }

}
