export interface ProcessLockerOptions {
    maxRetries: number;
    driver: string;
    fsDirPath: string;
}

export interface IProcessLocker {
    options: ProcessLockerOptions;
    getLock(resource: string): Promise<boolean>;
    clearLock(resource: string): Promise<any>;
}
