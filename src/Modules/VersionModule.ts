import {ConfigFactory} from '../Config/app-config';
import Logger from '../Components/Logger';
import {IModule, ParsedCliArgs} from '../Types';

export class VersionModule implements IModule {
    public readonly name: string = 'version';

    public async run(cliArgs: ParsedCliArgs): Promise<void> {
        Logger.info('VersionModule', 'Installed version:', [ConfigFactory.getBase().version]);
    }

    public async stop(): Promise<void> {
        // No-op for version module
    }
}
