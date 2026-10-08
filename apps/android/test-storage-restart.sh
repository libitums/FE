#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ -n "${ANDROID_HOME:-}" ] && [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$ANDROID_HOME/platform-tools/adb"
else
  ADB=adb
fi

cd "$APP_DIR"
./gradlew assembleDebug assembleDebugAndroidTest
"$ADB" install -r app/build/outputs/apk/debug/app-debug.apk
"$ADB" install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk

run_case() {
  output=$("$ADB" shell am instrument -w -e class \
    "com.libitum.host.StorageRestartTest#$1" \
    libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner)
  printf '%s\n' "$output"
  printf '%s\n' "$output" | grep -q 'OK (1 test)'
}

run_case writeSession
"$ADB" shell am force-stop libitum.duru.android
run_case readAndRemoveSession
"$ADB" shell am force-stop libitum.duru.android
run_case removedSessionStaysRemoved
