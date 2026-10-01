#!/bin/sh
set -eu

if [ -n "${E2E_UDID:-}" ]; then
  set -- --udid "$E2E_UDID"
else
  set --
fi

maestro "$@" test -e PROVIDER=apple -e BUTTON_POINT=50%,27% e2e/android-social-login.yaml
maestro "$@" test -e PROVIDER=google -e BUTTON_POINT=50%,35% e2e/android-social-login.yaml
maestro "$@" test -e PROVIDER=facebook -e BUTTON_POINT=50%,43% e2e/android-social-login.yaml
