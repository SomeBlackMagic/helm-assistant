#!/bin/bash
export HELM_ASSISTANT_UPGRADE_PIPE_LOGS=true
export HELM_ASSISTANT_UPGRADE_JOB_STRICT=true
#helm upgrade \
#node -r ts-node/register -r tsconfig-paths/register ../src/App.ts

helm dependency build ${TESTS_PWD}data/charts/app-job

${HELM_ASSISTANT_BIN_CMD} upgrade \
  --install helm-assistant-test-worker \
  --debug \
  --wait \
  --wait-for-jobs \
  --timeout 15m \
  ${TESTS_PWD}data/charts/app-job \
  -f ${TESTS_PWD}cases/job-complited.yaml