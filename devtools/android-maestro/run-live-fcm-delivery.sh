#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../../apps/android" && pwd)
REPO_DIR=$(CDPATH= cd -- "$APP_DIR/../.." && pwd)
: "${FCM_UDID:?Set FCM_UDID to a dedicated Google Play emulator ID}"
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
: "${FCM_SERVICE_ACCOUNT_FILE:?Set FCM_SERVICE_ACCOUNT_FILE to a local service account JSON path}"
if [ ! -f "$FCM_SERVICE_ACCOUNT_FILE" ]; then
  echo 'FCM_SERVICE_ACCOUNT_FILE does not exist' >&2
  exit 1
fi
ADB="$ANDROID_HOME/platform-tools/adb"

cleanup() {
  "$ADB" -s "$FCM_UDID" shell am broadcast \
    -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null 2>&1 || true
  if [ -n "${fixture_pid:-}" ]; then wait "$fixture_pid" || true; fi
  if [ -n "${server_pid:-}" ]; then kill "$server_pid" 2>/dev/null || true; fi
  "$ADB" -s "$FCM_UDID" shell am force-stop com.libitum.host >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

cd "$REPO_DIR"
PUBLIC_SUPABASE_URL=https://example.invalid \
  PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
FCM_UDID="$FCM_UDID" ANDROID_HOME="$ANDROID_HOME" \
  "$APP_DIR/test-live-fcm-token.sh"

python3 -m http.server 18773 --bind 127.0.0.1 --directory "$REPO_DIR/apps/mobile/dist" \
  >/tmp/libitum-live-fcm-preview.log 2>&1 &
server_pid=$!
sleep 1
kill -0 "$server_pid"

"$ADB" -s "$FCM_UDID" shell wm size 390x844
"$ADB" -s "$FCM_UDID" shell wm density 160
"$ADB" -s "$FCM_UDID" shell settings put system font_scale 1.0
"$ADB" -s "$FCM_UDID" shell am instrument -w \
  -e class com.libitum.host.SignedInScreenFixtureTest \
  -e bundleUrl http://10.0.2.2:18773/main.lynx.bundle \
  com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner \
  >/tmp/libitum-live-fcm-fixture.log 2>&1 &
fixture_pid=$!

cd "$REPO_DIR"
maestro --udid "$FCM_UDID" test e2e/android-fcm-delivery-ready.yaml
"$ADB" -s "$FCM_UDID" shell input keyevent HOME
node devtools/android-maestro/send-live-fcm.mjs
maestro --udid "$FCM_UDID" test e2e/android-fcm-delivery-open.yaml
"$ADB" -s "$FCM_UDID" shell am broadcast \
  -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null
wait "$fixture_pid"
fixture_pid=
grep -q 'OK (1 test)' /tmp/libitum-live-fcm-fixture.log
