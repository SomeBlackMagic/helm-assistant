#helm dependency build
helm install --debug --dry-run -f ci/default-values.yaml app .
