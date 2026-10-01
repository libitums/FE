#!/bin/sh
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../../apps/android" && pwd)
REPO_DIR=$(CDPATH= cd -- "$APP_DIR/../.." && pwd)
: "${E2E_UDID:?Set E2E_UDID to a dedicated Google Play Android emulator ID}"
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK directory}"
ADB="$ANDROID_HOME/platform-tools/adb"
if [ ! -x "$ADB" ]; then
  echo "adb is missing from ANDROID_HOME" >&2
  exit 1
fi
if [ ! -f "$REPO_DIR/apps/mobile/.env.local" ]; then
  echo "apps/mobile/.env.local with live public Supabase settings is required" >&2
  exit 1
fi
if ! "$ADB" -s "$E2E_UDID" shell pm path com.android.chrome | grep -q package:; then
  echo "Chrome is required on the dedicated emulator" >&2
  exit 1
fi

cd "$REPO_DIR"
pnpm bundle:android
python3 devtools/android-maestro/check-live-providers.py \
  apps/mobile/.env.local apps/mobile/dist/main.lynx.bundle
cd "$APP_DIR"
./gradlew assembleDebug
python3 -m http.server 18768 --bind 0.0.0.0 --directory "$REPO_DIR/apps/mobile/dist" \
  >/tmp/libitum-live-provider-preview.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT HUP INT TERM
sleep 1
kill -0 "$server_pid"

"$ADB" -s "$E2E_UDID" install -r app/build/outputs/apk/debug/app-debug.apk
"$ADB" -s "$E2E_UDID" shell wm size 390x844
"$ADB" -s "$E2E_UDID" shell wm density 160
"$ADB" -s "$E2E_UDID" shell settings put system font_scale 1.0

run_provider() {
  name=$1
  button_y=$2
  domain=$3
  "$ADB" -s "$E2E_UDID" shell am force-stop com.android.chrome
  "$ADB" -s "$E2E_UDID" shell pm clear com.libitum.host
  "$ADB" -s "$E2E_UDID" shell am start -n com.libitum.host/.MainActivity \
    --es bundle-url http://10.0.2.2:18768/main.lynx.bundle
  # The host shows a four-second splash before onboarding is ready.
  sleep 6
  cd "$REPO_DIR"
  if maestro --udid "$E2E_UDID" test \
    -e "BUTTON_Y=$button_y" -e "PROVIDER_DOMAIN=$domain" \
    e2e/android-live-provider-preflight.yaml; then
    echo "$name: provider sign-in page reached"
  else
    echo "$name: provider sign-in page NOT reached" >&2
    return 1
  fi
  cd "$APP_DIR"
}

status=0
run_provider apple 27% appleid.apple.com || status=1
run_provider google 35% accounts.google.com || status=1
run_provider facebook 43% m.facebook.com || status=1
exit "$status"
