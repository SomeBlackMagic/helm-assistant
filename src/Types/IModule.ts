export interface IModule {
    readonly name: string;
    run(cliArgs: ParsedCliArgs): Promise<void>;
    stop(): Promise<void>;
}

export interface ParsedCliArgs {
    command: string;
    releaseName?: string;
    namespace?: string;
    waitForJobs?: boolean;
    rawArgs: string[];
    [key: string]: any;
}
