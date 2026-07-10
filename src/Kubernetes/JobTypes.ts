export type V1ConditionStatus = 'True' | 'False' | 'Unknown';

export type V1JobConditionType = 'Suspended' | 'Complete' | 'Failed' | 'FailureTarget';

export interface V1JobCondition {
    type: V1JobConditionType;
    status: V1ConditionStatus;
    lastProbeTime?: string | null;
    lastTransitionTime?: string | null;
    reason?: string;
    message?: string;
}

export interface V1LabelSelectorRequirement {
    key: string;
    operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
    values?: string[];
}

export interface V1LabelSelector {
    matchLabels?: {[key: string]: string};
    matchExpressions?: V1LabelSelectorRequirement[];
}

export interface V1OwnerReference {
    apiVersion: string;
    kind: string;
    name: string;
    uid: string;
    controller?: boolean;
    blockOwnerDeletion?: boolean;
}

export interface V1ObjectMeta {
    name?: string;
    generateName?: string;
    namespace?: string;
    selfLink?: string;
    uid?: string;
    resourceVersion?: string;
    generation?: number;
    creationTimestamp?: string;
    deletionTimestamp?: string;
    deletionGracePeriodSeconds?: number;
    labels?: {[key: string]: string};
    annotations?: {[key: string]: string};
    ownerReferences?: V1OwnerReference[];
    finalizers?: string[];
}

export interface V1ListMeta {
    selfLink?: string;
    resourceVersion?: string;
    continue?: string;
    remainingItemCount?: number;
}

/**
 * Pod template contents are not inspected anywhere in this application.
 * Kept as Record<string, unknown> (never `any`) instead of fully modelling
 * PodSpec, which this codebase has no need to read.
 */
export interface V1PodTemplateSpec {
    metadata?: V1ObjectMeta;
    spec?: Record<string, unknown>;
}

export interface V1UncountedTerminatedPods {
    succeeded?: string[];
    failed?: string[];
}

export interface V1JobStatus {
    active?: number;
    succeeded?: number;
    failed?: number;
    ready?: number;
    terminating?: number;
    startTime?: string;
    completionTime?: string;
    conditions?: V1JobCondition[];
    completedIndexes?: string;
    failedIndexes?: string;
    uncountedTerminatedPods?: V1UncountedTerminatedPods;
}

export interface V1JobSpec {
    parallelism?: number;
    completions?: number;
    activeDeadlineSeconds?: number;
    backoffLimit?: number;
    backoffLimitPerIndex?: number;
    maxFailedIndexes?: number;
    selector?: V1LabelSelector;
    manualSelector?: boolean;
    template: V1PodTemplateSpec;
    ttlSecondsAfterFinished?: number;
    completionMode?: 'NonIndexed' | 'Indexed';
    suspend?: boolean;
    // Has its own nested rule schema (onExitCodes/onPodConditions); not consumed here.
    podFailurePolicy?: Record<string, unknown>;
}

export interface V1Job {
    apiVersion?: string;
    kind?: 'Job';
    metadata: V1ObjectMeta;
    spec?: V1JobSpec;
    status?: V1JobStatus;
}

export interface V1JobList {
    apiVersion?: string;
    kind?: 'JobList';
    metadata?: V1ListMeta;
    items: V1Job[];
}
