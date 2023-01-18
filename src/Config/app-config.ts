import {env, envBoolean, envNumber} from '../Helpers';
import * as os from 'os';


export class ConfigFactory {

    public static getBase(): AppInfo {
        return {
            id: 'helm-assistant',
            version: 'dev-dirty',
        };
    }


    public static getCore(): CoreConfigInterface {
        return {
            HELM_ASSISTANT_REALISE_LOCK_DRIVER: '',
            HELM_BIN_PATH:  env('HELM_BIN_PATH', 'helm'),
            HELM_CMD_ARGS: env('HELM_CMD_ARGS', ''),
            KUBECTL_BIN_PATH: env('KUBECTL_BIN_PATH', 'kubectl'),
            KUBECTL_CMD_ARGS: env('KUBECTL_CMD_ARGS', ''),
            HELM_DEBUG: envBoolean('HELM_DEBUG', false),
            HELM_DRY_RUN:  envBoolean('HELM_DRY_RUN', false),
            KUBE_NAMESPACE:  env('KUBE_NAMESPACE', 'default'),
            HELM_ASSISTANT_DEBUG: envBoolean('HELM_ASSISTANT_DEBUG', false),
            HELM_ASSISTANT_UPGRADE_PIPE_LOGS: envBoolean('HELM_ASSISTANT_UPGRADE_PIPE_LOGS', false),
            HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES: envNumber('HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES', 10, 0),
            HELM_ASSISTANT_UPGRADE_JOB_STRICT: envBoolean('HELM_ASSISTANT_UPGRADE_JOB_STRICT', false),
            HELM_ASSISTANT_REALISE_LOCK_ENABLED: envBoolean('HELM_ASSISTANT_REALISE_LOCK_ENABLED', false),
            HELM_ASSISTANT_REALISE_LOCK_MAX_RETRIES: env('HELM_ASSISTANT_UPGRADE_JOB_STRICT', 600),
            HELM_ASSISTANT_REALISE_LOCK_FS_DIR_PATH: env('HELM_ASSISTANT_UPGRADE_JOB_STRICT', os.homedir() + '/.resource_lock')
        };
    }
}


interface AppInfo {
    id: string;
    version: string;
}

interface CoreConfigInterface {
    HELM_BIN_PATH: string;
    HELM_CMD_ARGS: string;
    KUBECTL_BIN_PATH: string;
    KUBECTL_CMD_ARGS: string;
    HELM_DEBUG: boolean;
    HELM_DRY_RUN: boolean;
    KUBE_NAMESPACE: string;
    HELM_ASSISTANT_DEBUG: boolean;
    HELM_ASSISTANT_UPGRADE_PIPE_LOGS: boolean;
    HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES: number;
    HELM_ASSISTANT_UPGRADE_JOB_STRICT: boolean;
    HELM_ASSISTANT_REALISE_LOCK_ENABLED: boolean;
    HELM_ASSISTANT_REALISE_LOCK_DRIVER: string;
    HELM_ASSISTANT_REALISE_LOCK_FS_DIR_PATH: string;
    HELM_ASSISTANT_REALISE_LOCK_MAX_RETRIES: string;
}
