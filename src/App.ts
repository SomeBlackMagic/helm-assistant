import {loadEnvVariablesFromFile} from './Helpers';
import {UpgradeModule} from './Modules/UpgradeModule';
import {HelmProxyModule} from './Modules/HelmProxyModule';
import {VersionModule} from './Modules/VersionModule';
import {Container} from './Core/Container';
import {Application} from './Core/Application';
import {CliParser} from './Cli/CliParser';
import {ConfigFactory} from './Config/app-config';
import {IConfigProvider} from './Types';

loadEnvVariablesFromFile();

const container = new Container();

container.registerSingleton<IConfigProvider>('config', () => ConfigFactory.getInstance());

const app = new Application(container);

app.registerModule('upgrade', new UpgradeModule());
app.registerModule('helm-proxy', new HelmProxyModule());
app.registerModule('version', new VersionModule());

app.bootstrap();

(async () => {
    const cliParser = new CliParser();
    const args = cliParser.parse();

    switch (args.command) {
        case 'upgrade':
            await app.runModule('upgrade', args);
            break;
        case 'version':
            await app.runModule('version', args);
            break;
    }

    await app.runModule('helm-proxy', args);
    app.triggerExit();
})();
