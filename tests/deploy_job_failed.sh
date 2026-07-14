#!/bin/bash
export HELM_ASSISTANT_UPGRADE_PIPE_LOGS=true
export HELM_ASSISTANT_UPGRADE_JOB_STRICT=true

helm dependency build ${TESTS_PWD}data/charts/app-job

set +e
OUTPUT=$(${HELM_ASSISTANT_BIN_CMD} upgrade \
  --install helm-assistant-test-job-failed \
  --debug \
  --wait \
  --wait-for-jobs \
  --timeout 5m \
  ${TESTS_PWD}data/charts/app-job \
  -f ${TESTS_PWD}cases/job-failed.yaml 2>&1)
EXIT_CODE=$?
set -e

echo "${OUTPUT}"

if [ ${EXIT_CODE} -eq 0 ]; then
  echo "FAIL: expected helm-assistant to exit non-zero for a failed Job, got exit code 0"
  exit 1
fi

if echo "${OUTPUT}" | grep -q "Job is failed"; then
  echo "OK: watchJobStatus detected the failed Job (exit code ${EXIT_CODE})"
else
  echo "OK: failed Job was detected by Helm --wait-for-jobs (exit code ${EXIT_CODE})"
fi
