type Factory<T> = () => T;

export class Container {
    private singletons: Map<string, any> = new Map();
    private factories: Map<string, Factory<any>> = new Map();

    public registerSingleton<T>(name: string, factory: Factory<T>): void {
        this.factories.set(name, factory);
    }

    public resolve<T>(name: string): T {
        if (this.singletons.has(name)) {
            return this.singletons.get(name) as T;
        }

        const factory = this.factories.get(name);
        if (!factory) {
            throw new Error(`Service "${name}" is not registered in the container`);
        }

        const instance = factory();
        this.singletons.set(name, instance);
        return instance as T;
    }

    public has(name: string): boolean {
        return this.factories.has(name);
    }

    public clear(): void {
        this.singletons.clear();
        this.factories.clear();
    }
}
