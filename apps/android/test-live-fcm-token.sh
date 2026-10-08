#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
: "${FCM_UDID:?Set FCM_UDID to a dedicated Google Play emulator ID}"
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
ADB="$ANDROID_HOME/platform-tools/adb"

if [ ! -f "$APP_DIR/app/google-services.json" ]; then
  echo 'Place a matching google-services.json in apps/android/app/ first.' >&2
  exit 1
fi
python3 - "$APP_DIR/app/google-services.json" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as config_file:
    config = json.load(config_file)
if not any(
    client.get("client_info", {}).get("android_client_info", {}).get("package_name")
    == "libitum.duru.android"
    for client in config.get("client", [])
):
    raise SystemExit("Firebase config does not contain libitum.duru.android")
PY

cd "$APP_DIR"
./gradlew :app:assembleDebug :app:assembleDebugAndroidTest --console=plain
"$ADB" -s "$FCM_UDID" install -r app/build/outputs/apk/debug/app-debug.apk
"$ADB" -s "$FCM_UDID" install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
"$ADB" -s "$FCM_UDID" shell pm clear libitum.duru.android
result=$("$ADB" -s "$FCM_UDID" shell am instrument -w \
  -e class com.libitum.host.LiveFcmTokenTest#bridgeReturnsARealFcmRegistration \
  -e liveFcm true \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner)
printf '%s\n' "$result"
printf '%s\n' "$result" | grep -q '^OK (1 test)$'
