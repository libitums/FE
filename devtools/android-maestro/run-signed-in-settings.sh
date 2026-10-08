#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../../apps/android" && pwd)
REPO_DIR=$(CDPATH= cd -- "$APP_DIR/../.." && pwd)
: "${E2E_UDID:?Set E2E_UDID to a dedicated Android emulator ID}"
if [ -n "${ANDROID_HOME:-}" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$ANDROID_HOME/platform-tools/adb"
else
  ADB=adb
fi

restore_display() {
  "$ADB" -s "$E2E_UDID" shell wm size 390x844
  "$ADB" -s "$E2E_UDID" shell wm density 160
  "$ADB" -s "$E2E_UDID" shell settings put system font_scale 1.0
}
trap restore_display EXIT HUP INT TERM

cd "$REPO_DIR"
PUBLIC_SUPABASE_URL=https://example.invalid \
  PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
cd "$APP_DIR"
./gradlew assembleDebug assembleDebugAndroidTest
python3 -m http.server 18766 --bind 0.0.0.0 --directory "$REPO_DIR/apps/mobile/dist" \
  >/tmp/libitum-signed-in-preview.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true; restore_display' EXIT HUP INT TERM
sleep 1
kill -0 "$server_pid"

"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/debug/app-debug.apk
"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
"$ADB" -s "$E2E_UDID" shell wm size 320x640
"$ADB" -s "$E2E_UDID" shell wm density 160

run_case() {
  scale=$1
  label=$2
  "$ADB" -s "$E2E_UDID" shell pm clear libitum.duru.android
  "$ADB" -s "$E2E_UDID" shell settings put system font_scale "$scale"
  "$ADB" -s "$E2E_UDID" shell am instrument -w \
    -e class com.libitum.host.SignedInScreenFixtureTest \
    -e bundleUrl http://10.0.2.2:18766/main.lynx.bundle \
    libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner \
    >"/tmp/libitum-signed-in-fixture-${scale}.log" 2>&1 &
  fixture_pid=$!
  status=0
  cd "$REPO_DIR"
  maestro --udid "$E2E_UDID" test \
    -e "SCALE=$scale" -e "DOCUMENT_LABEL=$label" \
    e2e/android-signed-in-settings.yaml || status=$?
  "$ADB" -s "$E2E_UDID" shell am broadcast \
    -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null
  wait "$fixture_pid" || status=1
  cat "/tmp/libitum-signed-in-fixture-${scale}.log"
  "$ADB" -s "$E2E_UDID" shell am force-stop libitum.duru.android
  cd "$APP_DIR"
  [ "$status" -eq 0 ]
  grep -q 'OK (1 test)' "/tmp/libitum-signed-in-fixture-${scale}.log"
}

run_case 1.0 'Terms of Use'
run_case 1.3 'Privacy Policy'
