#!/bin/sh
set -eu

if [ -n "${E2E_UDID:-}" ]; then
  set -- --udid "$E2E_UDID"
else
  set --
fi

maestro "$@" test -e "DOCUMENT_LABEL=Terms of Use" \
  -e "DOCUMENT_TITLE=DURU Term of Use" \
  e2e/android-legal-documents.yaml
maestro "$@" test -e "DOCUMENT_LABEL=Privacy Policy" \
  -e "DOCUMENT_TITLE=DURU Privacy Policy" \
  e2e/android-legal-documents.yaml
