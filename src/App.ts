import {inArray, loadEnvVariablesFromFile} from './Helpers';
import {UpgradeModule} from './Modules/UpgradeModule';
import {ProcessHelper} from './ProcessHelper';
import {ConfigFactory} from './Config/app-config';
import {HelmProxyModule} from './Modules/HelmProxyModule';
import {VersionModule} from './Modules/VersionModule';
import * as console from 'console';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs';
import process from 'process';

loadEnvVariablesFromFile();

const processHelper = new ProcessHelper();
const upgradeModule = new UpgradeModule();
const helmProxyModule = new HelmProxyModule();
const versionModule = new VersionModule();

processHelper.setExitHandler((data: { code: string }) => {
    (async () => {
        if (!inArray(['exit'], data.code)) {
            console.log('[helm-assistant] Stop signal received ', [data.code]);
        }
        console.log('[helm-assistant] Graceful stop all modules');
        await Promise.all([upgradeModule, helmProxyModule].map((item: any) => {
            return item.stop();
        })).catch((error) => {
            console.log('[helm-assistant] Can not stop services', error);
        });
        console.log('[helm-assistant] System gracefully stopped');
        process.exit(process.exitCode ?? 0);
    })();
});
processHelper.subscribeOnProcessExit();

(async () => {

    let HELM_CMD_ARGS = ConfigFactory.getCore().HELM_CMD_ARGS;
    if (ConfigFactory.getCore().HELM_DEBUG) {
        HELM_CMD_ARGS += ' --debug';
    }
    if (ConfigFactory.getCore().HELM_DRY_RUN) {
        HELM_CMD_ARGS += ' --dry-run';
    }
    const argv:any = yargs(hideBin(process.argv))
        .version(false)
        .option('wait', {type: 'boolean'})
        .option('wait-for-jobs', {type: 'boolean'})
        .option('atomic', {type: 'boolean'})
        .option('debug', {type: 'boolean'})
        .option('dry-run', {type: 'boolean'})
        .option('install', {type: 'boolean'})
        .option('cleanup-on-fail', {type: 'boolean'})
        .option('create-namespace', {type: 'boolean'})
        .option('devel', {type: 'boolean'})
        .option('disable-openapi-validation', {type: 'boolean'})
        .option('force', {type: 'boolean'})
        .option('insecure-skip-tls-verify', {type: 'boolean'})
        .option('no-hooks', {type: 'boolean'})
        .option('reset-values', {type: 'boolean'})
        .option('reuse-values', {type: 'boolean'})
        .option('skip-crds', {type: 'boolean'})
        .option('verify', {type: 'boolean'})
        .option('verify', {type: 'boolean'})
        .option('version', {type: 'string'})
        .parse();

    const mode: string = argv._[0];
    switch (mode) {
        case 'upgrade':
            await upgradeModule.run(argv);
            break;
        case 'version':
            await versionModule.run(argv);
            break;
    }


    await helmProxyModule.runHelmCMD(ConfigFactory.getCore().HELM_BIN_PATH, [
        ...HELM_CMD_ARGS.split(' '),
        ...process.argv.slice(2)
    ]);
    processHelper.exitHandler({code: 'exit'});

})();


