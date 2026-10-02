#!/bin/sh
set -eu

if [ -z "${E2E_UDID:-}" ]; then
  echo "E2E_UDID must name the dedicated Android emulator" >&2
  exit 1
fi

restore_display() {
  adb -s "$E2E_UDID" shell wm size 390x844
  adb -s "$E2E_UDID" shell wm density 160
  adb -s "$E2E_UDID" shell settings put system font_scale 1.0
}
trap restore_display EXIT HUP INT TERM

adb -s "$E2E_UDID" shell wm size 320x640
adb -s "$E2E_UDID" shell wm density 160
adb -s "$E2E_UDID" shell settings put system font_scale 1.0
maestro --udid "$E2E_UDID" test -e SCALE=100 e2e/android-small-screen.yaml

adb -s "$E2E_UDID" shell settings put system font_scale 1.3
maestro --udid "$E2E_UDID" test -e SCALE=130 e2e/android-small-screen.yaml
