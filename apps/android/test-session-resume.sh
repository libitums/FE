#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_DIR=$(CDPATH= cd -- "$APP_DIR/../.." && pwd)
: "${E2E_UDID:?Set E2E_UDID to a dedicated Android emulator ID}"
if [ -n "${ANDROID_HOME:-}" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$ANDROID_HOME/platform-tools/adb"
else
  ADB=adb
fi

cd "$REPO_DIR"
PUBLIC_SUPABASE_URL=https://example.invalid \
  PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
cd "$APP_DIR"
./gradlew assembleDebug assembleDebugAndroidTest

python3 -m http.server 18765 --bind 0.0.0.0 --directory "$REPO_DIR/apps/mobile/dist" \
  >/tmp/libitum-session-preview.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT HUP INT TERM
sleep 1
kill -0 "$server_pid"

"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/debug/app-debug.apk
"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
"$ADB" -s "$E2E_UDID" shell pm clear libitum.duru.android

run_case() {
  case_name=$1
  stage=$2
  output=$("$ADB" -s "$E2E_UDID" shell am instrument -w \
    -e class "com.libitum.host.SessionResumeTest#$case_name" \
    -e stage "$stage" \
    -e bundleUrl http://10.0.2.2:18765/main.lynx.bundle \
    libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner)
  printf '%s\n' "$output"
  printf '%s\n' "$output" | grep -q 'OK (1 test)'
  "$ADB" -s "$E2E_UDID" shell am force-stop libitum.duru.android
}

run_case seedSession 0
run_case resumeSession 1
run_case resumeSession 2
run_case rejectedRefreshClearsSession 0
