#helm plugin install https://github.com/helm-unittest/helm-unittest.git
set -exu
helm unittest --debug --update-snapshot --color --strict .