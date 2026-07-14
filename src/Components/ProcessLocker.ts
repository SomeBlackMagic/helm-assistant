import * as fs from 'fs';
import { ConfigFactory } from '../Config/app-config';
import * as console from 'console';
// import { NodeJS } from 'timers';

export default class ProcessLocker {

    public options: ProcessLockerOptions;

    private timer: NodeJS.Timeout | string | number | undefined;

    public constructor() {
        this.options = {
            maxRetries: ConfigFactory.getCore().HELM_ASSISTANT_RELEASE_LOCK_MAX_RETRIES,
            driver: ConfigFactory.getCore().HELM_ASSISTANT_RELEASE_LOCK_DRIVER,
            fsDirPath: ConfigFactory.getCore().HELM_ASSISTANT_RELEASE_LOCK_FS_DIR_PATH
        };
    }
    public async getLock(resource: string): Promise<boolean> {
        await this.initFSLocker();
        return await this.waitAvailability(resource);

    }
    public clearLock(resource: string): Promise<any> {
        return new Promise((resolve: (arg0: boolean) => void, reject: any) => {
            if (fs.existsSync(this.options.fsDirPath + '/' + resource + '.lock')) {
                fs.unlink(this.options.fsDirPath + '/' + resource + '.lock', (err) => {
                    if (err) {
                        process.stderr.write('[helm-assistant][release-locker] ERROR: Can not remove lock file: ' + this.options.fsDirPath + '/' + resource + '.lock' + '\n');
                        resolve(true);
                    } else {
                        process.stdout.write('[helm-assistant][release-locker] INFO: Successfully unlock: ' + this.options.fsDirPath + '/' + resource + '.lock' + '\n');
                        resolve(true);
                    }
                });
            } else {
                if (ConfigFactory.getCore().HELM_ASSISTANT_DEBUG_LEVEL >= 1) {
                    process.stderr.write('[helm-assistant][release-locker] DEBUG: lock file not found' + '\n');
                }
                resolve(true);
            }
        });
    }

    private initFSLocker():  Promise<any> {
        const res = fs.mkdirSync(this.options.fsDirPath, {recursive: true});
        return Promise.resolve();
    }

    private async waitAvailability(key:string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            process.stdout.write('[helm-assistant][release-locker] NOTICE: Waiting for lock on: ' + this.options.fsDirPath + '/' + key + '.lock' + '\n');
            this.timer = setInterval(() => {
                (async () => {
                    const content = this.getLockData(key);
                    if (content === false) {
                        const result = await this.putLockData(key);
                        clearInterval(this.timer);
                        resolve(result);
                        return;
                    }
                    const data = new Date(content.toString());
                    if (data < new Date()) {
                        process.stdout.write('[helm-assistant][release-locker] WARNING: Lock file exist it is expired: ' + this.options.fsDirPath + '/' + key + '.lock' + '\n');
                        const result = await this.putLockData(key);
                        clearInterval(this.timer);
                        resolve(result);
                    } else {
                        process.stdout.write('.');
                    }
                })();
            }, 1000);
        });
    }

    private getLockData(key: string):  string | false {
        if (fs.existsSync(this.options.fsDirPath + '/' + key + '.lock')) {
            return fs.readFileSync(this.options.fsDirPath + '/' + key + '.lock', 'utf8');
        }
        return false;
    }
    private putLockData(key: string): Promise<boolean> {
        const date = new Date();
        date.setSeconds(date.getSeconds() + this.options.maxRetries);
        return new Promise((resolve, reject) => {
            fs.writeFile(this.options.fsDirPath + '/' + key + '.lock', date.toString(), 'utf8', (err) => {
                if (err) {
                    process.stderr.write('\n' + '[helm-assistant][release-locker] ERROR: Can not create lock file: ' + JSON.stringify(err) + '\n');
                    reject(false);
                } else {
                    process.stdout.write('\n' + '[helm-assistant][release-locker] INFO: Successfully acquired lock on: ' + this.options.fsDirPath + '/' + key + '.lock' + '\n');
                    resolve(true);
                }
            });
        });
    }

}
interface ProcessLockerOptions {
    maxRetries: number;
    driver: string;
    fsDirPath: string;
}
