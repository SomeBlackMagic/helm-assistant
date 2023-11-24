#helm dependency update
#helm dependency build
#helm install --debug --dry-run -f ci/default-values.yaml app .
helm template --debug -f ci/default-values.yaml .
