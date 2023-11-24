#!/bin/bash

export KUBECONFIG=/home/wir_wolf/.kube/dijust.dev.yaml

#kubectl get nodes
kubectl get jobs -A -o json --selector app.kubernetes.io/instance=king-dev-skg-job-migration
