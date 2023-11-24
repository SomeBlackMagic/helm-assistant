#!/bin/bash
export HELM_ASSISTANT_UPGRADE_PIPE_LOGS=true
export HELM_ASSISTANT_UPGRADE_JOB_STRICT=true
#helm upgrade \
#node -r ts-node/register -r tsconfig-paths/register ../src/App.ts

${HELM_ASSISTANT_BIN_CMD} upgrade \
  --install helm-assistant-test-job \
  --debug \
  --wait \
  --wait-for-jobs \
  --timeout 15m \
  ./data/charts/app-job \
  -f cases/job-complited.yaml