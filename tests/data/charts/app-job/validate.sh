#helm dependency update
#helm dependency build
#helm install --debug --dry-run \
helm template --debug \
    -f ../../apps/job-migration.yaml \
    --set job.id=${CI_JOB_ID} \
    \
    --set extraEnvVarsSecrets[0].name=2345-generic \
    --set extraEnvVarsSecrets[0].checksum=yes \
    app .
#helm template --debug -f ci/default-values.yaml .
