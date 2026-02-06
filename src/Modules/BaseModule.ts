import { IModule, ILogger, ParsedCliArgs } from '../Types';
import Logger from '../Components/Logger';

export abstract class BaseModule implements IModule {
    public abstract readonly name: string;
    protected logger: ILogger;
    protected isWork: boolean = false;

    constructor() {
        this.logger = Logger.getInstance(this.constructor.name);
    }

    public abstract run(cliArgs: ParsedCliArgs): Promise<void>;

    public async stop(): Promise<void> {
        // Default no-op; subclasses override as needed
    }
}
