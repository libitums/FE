#!/bin/sh
set -eu

if [ -n "${E2E_UDID:-}" ]; then
  set -- --udid "$E2E_UDID"
else
  set --
fi

maestro "$@" test -e PROVIDER=apple -e "BUTTON_LABEL=Sign in with Apple" e2e/android-social-login.yaml
maestro "$@" test -e PROVIDER=google -e "BUTTON_LABEL=Connect with Google" e2e/android-social-login.yaml
maestro "$@" test -e PROVIDER=facebook -e "BUTTON_LABEL=Connect with Facebook" e2e/android-social-login.yaml
