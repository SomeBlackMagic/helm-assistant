#!/bin/bash
export HELM_ASSISTANT_UPGRADE_PIPE_LOGS=true
export HELM_ASSISTANT_UPGRADE_JOB_STRICT=true
#helm upgrade \
#node -r ts-node/register -r tsconfig-paths/register ../src/App.ts

helm dependency build ${TESTS_PWD}data/charts/app-worker

${HELM_ASSISTANT_BIN_CMD} upgrade \
  --install helm-assistant-test-worker \
  --debug \
  --wait \
  --timeout 15m \
  ${TESTS_PWD}data/charts/app-worker \
  -f ${TESTS_PWD}cases/worker-success.yaml
