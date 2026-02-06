import {env, envBoolean, envNumber} from '../Helpers';
import {IConfigProvider, CoreConfig, AppInfo} from '../Types';
import * as os from 'os';


export class ConfigFactory implements IConfigProvider {

    private static instance: ConfigFactory;

    public static getInstance(): ConfigFactory {
        if (!ConfigFactory.instance) {
            ConfigFactory.instance = new ConfigFactory();
        }
        return ConfigFactory.instance;
    }

    public static getBase(): AppInfo {
        return ConfigFactory.getInstance().getBase();
    }

    public static getCore(): CoreConfig {
        return ConfigFactory.getInstance().getCore();
    }

    public getBase(): AppInfo {
        return {
            id: 'helm-assistant',
            version: 'dev-dirty',
        };
    }

    public getCore(): CoreConfig {
        return {
            LOGGER_DRIVER: env('HELM_ASSISTANT_LOGGER_DRIVER', 'console'),
            HELM_ASSISTANT_RELEASE_LOCK_DRIVER: '',
            HELM_BIN_PATH:  env('HELM_BIN_PATH', 'helm'),
            HELM_CMD_ARGS: env('HELM_CMD_ARGS', ''),
            KUBECTL_BIN_PATH: env('KUBECTL_BIN_PATH', 'kubectl'),
            KUBECTL_CMD_ARGS: env('KUBECTL_CMD_ARGS', ''),
            HELM_DEBUG: envBoolean('HELM_DEBUG', false),
            HELM_DRY_RUN:  envBoolean('HELM_DRY_RUN', false),
            HELM_ASSISTANT_DEBUG: envBoolean('HELM_ASSISTANT_DEBUG', false),
            HELM_ASSISTANT_DEBUG_LEVEL: envNumber('HELM_ASSISTANT_DEBUG_LEVEL', 0, 0),
            HELM_ASSISTANT_UPGRADE_PIPE_LOGS: envBoolean('HELM_ASSISTANT_UPGRADE_PIPE_LOGS', false),
            HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES: envNumber('HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES', 10, 0),
            HELM_ASSISTANT_UPGRADE_JOB_STRICT: envBoolean('HELM_ASSISTANT_UPGRADE_JOB_STRICT', false),
            HELM_ASSISTANT_RELEASE_LOCK_ENABLED: envBoolean('HELM_ASSISTANT_RELEASE_LOCK_ENABLED', false),
            HELM_ASSISTANT_RELEASE_LOCK_MAX_RETRIES: envNumber('HELM_ASSISTANT_RELEASE_LOCK_MAX_RETRIES', 600, 0),
            HELM_ASSISTANT_RELEASE_LOCK_FS_DIR_PATH: env('HELM_ASSISTANT_RELEASE_LOCK_FS_DIR_PATH', os.homedir() + '/.resource_lock')
        };
    }
}
