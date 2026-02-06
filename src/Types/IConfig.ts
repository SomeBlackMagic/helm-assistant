export interface AppInfo {
    id: string;
    version: string;
}

export interface CoreConfig {
    LOGGER_DRIVER: string;
    HELM_BIN_PATH: string;
    HELM_CMD_ARGS: string;
    KUBECTL_BIN_PATH: string;
    KUBECTL_CMD_ARGS: string;
    HELM_DEBUG: boolean;
    HELM_DRY_RUN: boolean;
    HELM_ASSISTANT_DEBUG: boolean;
    HELM_ASSISTANT_DEBUG_LEVEL: number;
    HELM_ASSISTANT_UPGRADE_PIPE_LOGS: boolean;
    HELM_ASSISTANT_UPGRADE_PIPE_LOGS_TAIL_LINES: number;
    HELM_ASSISTANT_UPGRADE_JOB_STRICT: boolean;
    HELM_ASSISTANT_RELEASE_LOCK_ENABLED: boolean;
    HELM_ASSISTANT_RELEASE_LOCK_MAX_RETRIES: number;
    HELM_ASSISTANT_RELEASE_LOCK_DRIVER: string;
    HELM_ASSISTANT_RELEASE_LOCK_FS_DIR_PATH: string;
}

export interface IConfigProvider {
    getBase(): AppInfo;
    getCore(): CoreConfig;
}
