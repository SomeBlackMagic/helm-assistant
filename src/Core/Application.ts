import { Container } from './Container';
import { IModule, ParsedCliArgs, IConfigProvider } from '../Types';
import { ProcessHelper } from '../ProcessHelper';
import { inArray } from '../Helpers';
import * as console from 'console';
import * as process from 'process';

export class Application {
    public readonly container: Container;
    private modules: Map<string, IModule> = new Map();
    private processHelper: ProcessHelper;
    private isShuttingDown: boolean = false;

    constructor(container: Container) {
        this.container = container;
        this.processHelper = new ProcessHelper();
    }

    public registerModule(name: string, module: IModule): void {
        this.modules.set(name, module);
    }

    public getModule<T extends IModule>(name: string): T {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`Module "${name}" is not registered`);
        }
        return module as T;
    }

    public hasModule(name: string): boolean {
        return this.modules.has(name);
    }

    public bootstrap(): void {
        this.processHelper.setExitHandler((data: { code: string }) => {
            if (this.isShuttingDown) {
                return;
            }
            this.isShuttingDown = true;

            process.emit('message', '' as any, '' as any);
            (async () => {
                if (!inArray(['exit'], data.code)) {
                    console.log('[helm-assistant] Stop signal received ', [data.code]);
                }
                await this.shutdown();
            })();
        });
        this.processHelper.subscribeOnProcessExit();
    }

    public async runModule(name: string, args: ParsedCliArgs): Promise<void> {
        const module = this.modules.get(name);
        if (!module) {
            return;
        }
        await module.run(args);
    }

    public async shutdown(): Promise<void> {
        console.log('[helm-assistant] Graceful stop all modules');
        const stopPromises = Array.from(this.modules.values()).map((module) => {
            return module.stop().catch((error) => {
                console.log(`[helm-assistant] Error stopping module ${module.name}:`, error);
            });
        });

        await Promise.all(stopPromises).catch((error) => {
            console.log('[helm-assistant] Can not stop services', error);
        });
        console.log('[helm-assistant] System gracefully stopped');
    }

    public triggerExit(): void {
        this.processHelper.exitHandler({ code: 'exit' });
    }
}
