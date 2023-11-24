{{/* vim: set filetype=mustache: */}}
{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "worker.hpa_metric_name" -}}
{{- printf "%s-%s" .Release.Namespace .Release.Name | replace "+" "_" | replace "-" "_" | trunc 63 -}}
{{- end -}}


{{- define "deployment.getSecretNames" -}}
  {{- $names := "" -}}
  {{- range .Values.extraEnvVarsSecrets }}
    {{- $names = printf "%s%s," $names .name }}
  {{- end }}
  {{- $names = trimSuffix $names "," }}

  {{- $names }}
{{- end }}


{{- define "common.externalsecretEnvVarsSecrets" -}}
  {{- if $.Values.externalSecret.enabled }}
- secretRef:
    name: {{ $.Release.Name }}-external-secret
  {{- end }}
{{- end -}}
