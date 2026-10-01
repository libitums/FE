#!/bin/sh
set -eu

if [ -n "${E2E_UDID:-}" ]; then
  set -- --udid "$E2E_UDID"
else
  set --
fi

maestro "$@" test -e "DOCUMENT_LABEL=Terms of Use" \
  -e "DOCUMENT_PATH=DURU-Term-of-Use-3eb0c2540c0180ef9072f0b447b3b468" \
  e2e/android-legal-documents.yaml
maestro "$@" test -e "DOCUMENT_LABEL=Privacy Policy" \
  -e "DOCUMENT_PATH=DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402" \
  e2e/android-legal-documents.yaml
