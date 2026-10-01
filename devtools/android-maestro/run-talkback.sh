#!/bin/sh
set -eu

if [ -z "${E2E_UDID:-}" ]; then
  echo "E2E_UDID must name the dedicated Google Play Android emulator" >&2
  exit 1
fi

if ! adb -s "$E2E_UDID" shell pm path com.google.android.marvin.talkback | grep -q package:; then
  echo "TalkBack is not installed on $E2E_UDID" >&2
  exit 1
fi

adb -s "$E2E_UDID" shell wm size 390x844
adb -s "$E2E_UDID" shell wm density 160
adb -s "$E2E_UDID" shell settings put system font_scale 1.0
adb -s "$E2E_UDID" shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/.TalkBackService
adb -s "$E2E_UDID" shell settings put secure accessibility_enabled 1

attempt=0
until adb -s "$E2E_UDID" shell dumpsys accessibility | grep -q 'Bound services:{Service\[label=TalkBack'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 10 ]; then
    echo "TalkBack did not bind on $E2E_UDID" >&2
    exit 1
  fi
  sleep 1
done

if [ "$(adb -s "$E2E_UDID" shell settings get secure touch_exploration_enabled | tr -d '\r')" != "1" ]; then
  echo "TalkBack touch exploration is not enabled on $E2E_UDID" >&2
  exit 1
fi

maestro --udid "$E2E_UDID" test e2e/android-host.yaml
