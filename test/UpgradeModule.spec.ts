import {expect} from 'chai';
import {evaluateJobItems, interpretChildProcessExit} from '../src/Modules/UpgradeModule';
import {V1Job} from '../src/Kubernetes/JobTypes';

function buildJob(overrides: Partial<V1Job> & {name: string; creationTimestamp: string}): V1Job {
    return {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
            name: overrides.name,
            namespace: 'default',
            creationTimestamp: overrides.creationTimestamp,
        },
        status: overrides.status,
    };
}

describe('evaluateJobItems', () => {
    const watchStartedAt = new Date('2026-07-10T09:00:00Z');
    const createdAfterWatchStarted = '2026-07-10T09:05:00Z';
    const createdBeforeWatchStarted = '2026-07-10T08:00:00Z';

    it('detects a Job with a Failed condition whose status is True', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-abcde',
                creationTimestamp: createdAfterWatchStarted,
                status: {
                    conditions: [
                        {type: 'Failed', status: 'True', reason: 'BackoffLimitExceeded', message: 'Job has reached the specified backoff limit'},
                    ],
                },
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(true);
        expect(decision.jobName).to.equal('release-abcde');
        expect(decision.reason).to.equal('BackoffLimitExceeded');
        expect(decision.message).to.equal('Job has reached the specified backoff limit');
    });

    it('surfaces DeadlineExceeded as the reason when that is why the Job failed', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-fghij',
                creationTimestamp: createdAfterWatchStarted,
                status: {
                    conditions: [
                        {type: 'Failed', status: 'True', reason: 'DeadlineExceeded', message: 'Job was active longer than specified deadline'},
                    ],
                },
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(true);
        expect(decision.reason).to.equal('DeadlineExceeded');
    });

    it('does not treat a Failed condition with status False as a failure', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-klmno',
                creationTimestamp: createdAfterWatchStarted,
                status: {
                    conditions: [{type: 'Failed', status: 'False'}],
                },
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(false);
    });

    it('does not treat a Failed condition with status Unknown as a failure', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-pqrst',
                creationTimestamp: createdAfterWatchStarted,
                status: {
                    conditions: [{type: 'Failed', status: 'Unknown'}],
                },
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(false);
    });

    it('ignores a stale Job created before the watcher started', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-old',
                creationTimestamp: createdBeforeWatchStarted,
                status: {
                    conditions: [{type: 'Failed', status: 'True', reason: 'BackoffLimitExceeded'}],
                },
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(false);
    });

    it('reports only the first failing Job when several match in the same tick', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-first',
                creationTimestamp: createdAfterWatchStarted,
                status: {conditions: [{type: 'Failed', status: 'True', reason: 'BackoffLimitExceeded'}]},
            }),
            buildJob({
                name: 'release-second',
                creationTimestamp: createdAfterWatchStarted,
                status: {conditions: [{type: 'Failed', status: 'True', reason: 'BackoffLimitExceeded'}]},
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(true);
        expect(decision.jobName).to.equal('release-first');
    });

    it('does not fail when a Job has no status.conditions yet', () => {
        const items: V1Job[] = [
            buildJob({name: 'release-pending', creationTimestamp: createdAfterWatchStarted}),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(false);
    });

    it('does not fail on a Complete condition', () => {
        const items: V1Job[] = [
            buildJob({
                name: 'release-done',
                creationTimestamp: createdAfterWatchStarted,
                status: {conditions: [{type: 'Complete', status: 'True'}]},
            }),
        ];

        const decision = evaluateJobItems(items, watchStartedAt);

        expect(decision.failed).to.equal(false);
    });

    it('does not fail when there are no Jobs at all', () => {
        const decision = evaluateJobItems([], watchStartedAt);

        expect(decision.failed).to.equal(false);
    });
});

describe('interpretChildProcessExit', () => {
    it('treats exit code 0 as success and returns collected stdout', () => {
        const outcome = interpretChildProcessExit(0, null, '{"items":[]}');

        expect(outcome.kind).to.equal('success');
        expect(outcome.kind === 'success' && outcome.stdout).to.equal('{"items":[]}');
    });

    it('treats exit code 1 as an error, not a success', () => {
        const outcome = interpretChildProcessExit(1, null, '');

        expect(outcome.kind).to.equal('error');
        expect(outcome.kind === 'error' && outcome.error.message).to.contain('Code: 1');
    });

    it('treats a non-zero exit code as an error', () => {
        const outcome = interpretChildProcessExit(137, null, '');

        expect(outcome.kind).to.equal('error');
    });

    it('resolves empty on SIGINT regardless of exit code', () => {
        const outcome = interpretChildProcessExit(null, 'SIGINT', '');

        expect(outcome.kind).to.equal('resolved-empty');
    });

    it('treats a null exit code without SIGINT as an error', () => {
        const outcome = interpretChildProcessExit(null, null, '');

        expect(outcome.kind).to.equal('error');
    });
});
