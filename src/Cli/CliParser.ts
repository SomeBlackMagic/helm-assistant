import { ParsedCliArgs } from '../Types';
import { hideBin } from 'yargs/helpers';
import * as yargs from 'yargs';
import * as process from 'process';

export class CliParser {

    public parse(): ParsedCliArgs {
        const argv: any = yargs(hideBin(process.argv))
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
            .option('version', {type: 'string'})
            .parse();

        const command: string = argv._[0] || '';
        const releaseName: string = argv._[1] || '';

        let namespace: string = 'default';
        if (typeof argv.namespace !== 'undefined') {
            namespace = argv.namespace;
        } else if (typeof argv.n !== 'undefined') {
            namespace = argv.n;
        }

        return {
            command,
            releaseName,
            namespace,
            waitForJobs: argv.waitForJobs || false,
            rawArgs: process.argv.slice(2),
            ...argv,
        };
    }
}
