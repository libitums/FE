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

cleanup() {
  "$ADB" -s "$E2E_UDID" shell am broadcast \
    -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null 2>&1 || true
  if [ -n "${fixture_pid:-}" ]; then wait "$fixture_pid" || true; fi
  if [ -n "${server_pid:-}" ]; then kill "$server_pid" 2>/dev/null || true; fi
  "$ADB" -s "$E2E_UDID" shell am force-stop com.libitum.host >/dev/null 2>&1 || true
}
trap cleanup EXIT HUP INT TERM

cd "$REPO_DIR"
PUBLIC_SUPABASE_URL=https://example.invalid \
  PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
cd "$APP_DIR"
./gradlew assembleDebug assembleDebugAndroidTest
python3 -m http.server 18767 --bind 0.0.0.0 --directory "$REPO_DIR/apps/mobile/dist" \
  >/tmp/libitum-audio-preview.log 2>&1 &
server_pid=$!
sleep 1
kill -0 "$server_pid"

"$ADB" -s "$E2E_UDID" shell pm clear com.libitum.host
"$ADB" -s "$E2E_UDID" shell wm size 390x844
"$ADB" -s "$E2E_UDID" shell wm density 160
"$ADB" -s "$E2E_UDID" shell settings put system font_scale 1.0
"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/debug/app-debug.apk
"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
"$ADB" -s "$E2E_UDID" shell am instrument -w \
  -e class com.libitum.host.SignedInScreenFixtureTest \
  -e audioProgress true \
  -e bundleUrl http://10.0.2.2:18767/main.lynx.bundle \
  com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner \
  >/tmp/libitum-audio-fixture.log 2>&1 &
fixture_pid=$!

cd "$REPO_DIR"
"$ADB" -s "$E2E_UDID" logcat -c
maestro --udid "$E2E_UDID" test e2e/android-audio-playback.yaml
"$ADB" -s "$E2E_UDID" logcat -d > /tmp/libitum-audio-maestro-logcat.txt
play_count=$(grep -c 'AudioPlaybackModule.play.phone-call-confirm-01' \
  /tmp/libitum-audio-maestro-logcat.txt || true)
if [ "$play_count" -lt 6 ]; then
  echo "Expected automatic playback and two replays; saw $play_count native play calls" >&2
  exit 1
fi
grep -q 'AudioPlaybackModule.stop' /tmp/libitum-audio-maestro-logcat.txt
"$ADB" -s "$E2E_UDID" shell am broadcast \
  -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null
wait "$fixture_pid"
fixture_pid=
cat /tmp/libitum-audio-fixture.log
grep -q 'OK (1 test)' /tmp/libitum-audio-fixture.log
