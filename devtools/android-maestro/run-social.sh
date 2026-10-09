#!/bin/sh
set -eu

# 이 실행기는 앱을 설치하지 않는다. 모의 Supabase URL로 만든 bundled APK
# (PUBLIC_SUPABASE_URL=https://example.invalid pnpm bundle:android, 그 뒤
# apps/android에서 ./gradlew assembleBundled)가 이미 설치돼 있어야 한다.
if [ -n "${E2E_UDID:-}" ]; then
  MAESTRO_UDID="--udid $E2E_UDID"
  ADB_SERIAL="-s $E2E_UDID"
else
  MAESTRO_UDID=
  ADB_SERIAL=
fi
if [ -n "${ANDROID_HOME:-}" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$ANDROID_HOME/platform-tools/adb"
else
  ADB=adb
fi

# Custom Tab 주소창은 도메인만 보여 주므로, 열린 URL의 provider · redirect_to · PKCE
# challenge는 logcat의 capturedLink(Chrome으로 넘어가는 VIEW Intent의 전체 URL)로 판정한다.
# 이 줄을 남기지 않는 시스템 이미지에서는 실패한다(API 37 에뮬레이터에서 확인).
run_provider() {
  provider=$1
  label=$2
  # shellcheck disable=SC2086
  "$ADB" $ADB_SERIAL logcat -c
  maestro $MAESTRO_UDID test -e "PROVIDER=$provider" -e "BUTTON_LABEL=$label" e2e/android-social-login.yaml
  # shellcheck disable=SC2086
  "$ADB" $ADB_SERIAL logcat -d >/tmp/libitum-social-"$provider"-logcat.txt
  expected="capturedLink=https://example.invalid/auth/v1/authorize?provider=$provider&redirect_to=duru%3A%2F%2Fauth-callback&code_challenge="
  if ! grep -qF "$expected" /tmp/libitum-social-"$provider"-logcat.txt; then
    echo "Custom Tab URL for $provider was not logged as: $expected..." >&2
    exit 1
  fi
}

run_provider apple "Sign in with Apple"
run_provider google "Connect with Google"
run_provider facebook "Connect with Facebook"
