#!/usr/bin/env bash
# 스플래시 워드마크 이미지의 콜드 스타트 반복 실행기 (작업 android-splash-wordmark).
# 절차 · 판정 · 횟수의 근거: docs/e2e/android-splash-wordmark.md
#
# bash · zsh 어느 쪽으로 불러도 돈다(`bash apps/android/tools/splash-wordmark-repeat.sh …` ·
# `zsh apps/android/tools/splash-wordmark-repeat.sh …`). adb 호출은 문자열 변수가 아니라 함수 `A`다.
#
# 쓰는 법:
#   splash-wordmark-repeat.sh --serial <adb 기기> --build dev|bundled --count <유효 시도 수> \
#       --cold clear|stop|install:<apk 경로> --out <절대 경로 디렉터리> \
#       [--bundle-url http://10.0.2.2:18790/main.lynx.bundle]   (dev 필수, 3000 포트 금지)
#       [--server-log <요청 기록 서버의 표준 출력 파일>]          (dev: 없으면 「늦은 도착」을 못 가른다)
#       [--wait 12] [--max-attempts <count*2+10>] [--label <이름>] [--expect pass|load-failure]
#       [--shot] [--stop-on-fail]
#   splash-wordmark-repeat.sh --selftest [--samples <logcat 표본 디렉터리>]
# --label: 어느 AVD든 하나만 켜면 emulator-5554 라 기본 라벨(<기기>-<빌드>-<cold>)로는 API 를 알 수 없다 —
#          라벨에 API · 빌드를 넣는다(예: --label sw1-a30-debug).
#
# 판정(실행마다 하나): PASS · FAIL(결함) · FAIL(요청 없음) · LATE(늦은 도착) · 판정 불가 — 계약 r02.2.
# 종료 코드: 0 = 유효 시도 count회 전부 통과 · 1 = 실패 1건 이상(결함이든 요청 없음이든) ·
#            2 = 사용법 · 사전 조건 오류 · 3 = 판정 불가가 많아 상한 안에 유효 시도 count회를 못 채움(실패는 0건) ·
#            4 = 기기가 사라졌다(adb 응답 없음 — 실행 중단) · 5 = 환경 부적합(LATE가 시도의 5%를 넘음 — 통과가 아니다)
# 환경: ADB 로 adb 경로를 바꿀 수 있다(기기 없이 모의 adb 로 확인할 때). ADB_TIMEOUT(초, 기본 60)은 adb 한 번의 상한이다.
set -u

ADB_BIN="${ADB:-adb}"
ADB_TIMEOUT="${ADB_TIMEOUT:-60}"
PKG=libitum.duru.android
ACT=$PKG/com.libitum.host.MainActivity
LATE_MIN_END_MS=3000      # LATE 의 (b): 스플래시가 첫 화면 뒤 이 시간 이후에 끝났다
LATE_BUDGET_PERCENT=5     # 한 실행에서 LATE 가 시도의 이 비율을 넘으면 환경 부적합

# ---------------------------------------------------------------------------
# 판정 — 실행 한 번의 logcat 파일 하나(와 dev 의 서버 기록 구간)를 읽는다. 기기와 무관하다(selftest 가 검증한다).
#   judge <logcat 파일> <mode: pass|load-failure> [next: y|n|na] [서버 기록 구간 파일]
# 결과는 전역 J_* 에 둔다.
#   J_VERDICT  PASS | FAIL | LATE | UNDECIDED
#   J_KIND     FAIL 일 때 defect(onFailed ≥ 1) | no-request(요청 없음), 그 밖에는 빈 값
#   J_REASON   짧은 이유(no-request 는 빠진 증거를 붙인다: no-finalloopcomplete(<증거>))
#   J_LEN      onFirstScreen → 끝 이벤트(error · finalloopcomplete, LATE 는 스플래시 끝 표지)의 logcat 시각 차(ms). 기록만 한다 — 판정에 쓰지 않는다
#   J_FAILED_ALL · J_FAILED_LOGO · J_FIRST · J_FINAL · J_ERREV · J_WM200(구간의 워드마크 200 응답 수, 없으면 NA)
#
# mode=pass(계약 r02.2):
#   - onFailed ≥ 1 → FAIL(결함). onFirstScreen 이 없어도 실패 신호는 버리지 않는다.
#   - onFirstScreen 0 → UNDECIDED(번들 미로드. 횟수에서 빼고 다시 채운다)
#   - finalloopcomplete ≥ 1 → PASS
#   - 그 밖(onFirstScreen 있음 · onFailed 0 · finalloopcomplete 0)은 둘로 가른다:
#       LATE        = dev 에서만. error 이벤트 0 그리고 서버 구간에 `/static/image/logo-handwriting.*` 200 응답이 정확히 1건
#                     그리고 스플래시가 첫 화면 뒤 3.0 s 이후에 끝났다(auth.session 조회 또는 DestroyLayoutNodeBeforeRemoveFromParent tag:image)
#       FAIL(요청 없음) = 그 증거가 하나라도 빠졌다. 내장 빌드(서버가 없다)는 항상 이쪽이다
# mode=load-failure(워드마크가 없는 번들, 계약 AC4): onFirstScreen 있음 · 워드마크 onFailed 1줄 이상 ·
#   그 이유 어디에도 `Unsupported uri scheme` 없음 · error 이벤트 있음 · 온보딩 「Next」 표지가 있음(next=y).
# ---------------------------------------------------------------------------
ms_of() { # "HH:MM:SS.mmm" -> ms
  awk -v t="$1" 'BEGIN{split(t,a,/[:.]/); print ((a[1]*60+a[2])*60+a[3])*1000+a[4]}'
}

# 두 logcat 시각(HH:MM:SS.mmm)의 차 ms. 자정을 넘긴 실행도 양수로.
diff_ms() { # <앞> <뒤>
  dd=$(( $(ms_of "$2") - $(ms_of "$1") ))
  if [ "$dd" -lt 0 ]; then dd=$(( dd + 86400000 )); fi
  echo "$dd"
}

# 첫 화면 줄 뒤의 스플래시 끝 표지 시각을 돌려준다(없으면 빈 값). 계약의 표지 둘 가운데
#   `DestroyLayoutNodeBeforeRemoveFromParent tag:image`(스플래시 그림 노드가 지워진 줄 — 안전 타이머가 끝낸 시각과 맞는다)를 먼저 쓰고,
#   그 줄이 없을 때만 **마지막** `StorageModule.get.libitum.auth.session` 조회를 쓴다.
# 첫 auth.session 조회는 스플래시 도중(0.2 ~ 2.6 s)에도 나온다 — 실기 확인(API 30): 끝 표지로 쓰면 늦은 도착을 「일찍 닫힘」으로 오판한다.
splash_end_mark() { # <logcat 파일>
  awk '
    /LynxTemplateRender: onFirstScreen/ && !seen { seen=1; next }
    seen && /DestroyLayoutNodeBeforeRemoveFromParent tag:image/ && !destroy { destroy=$2 }
    seen && /StorageModule\.get\.libitum\.auth\.session/ { auth=$2 }
    END { if (destroy != "") print destroy; else if (auth != "") print auth }
  ' "$1"
}

# LATE 의 증거를 확인한다. 결과: J_LATE_OK(1|0) · J_LATE_WHY(빠진 증거) · J_LATE_END_MS
late_check() { # <logcat 파일> <서버 구간 파일 | 빈 값>
  lf=$1; lseg=${2:-}
  J_LATE_OK=0; J_LATE_WHY=""; J_LATE_END_MS=NA; J_WM200=NA
  if [ -z "$lseg" ] || [ ! -s "$lseg" ]; then J_LATE_WHY=no-server-record; return 0; fi
  J_WM200=$(grep -cE 'END +[0-9]+ +/static/image/logo-handwriting\.[^ ]+ +200 ' "$lseg")
  if [ "$J_ERREV" -gt 0 ]; then J_LATE_WHY=error-event; return 0; fi
  if [ "$J_WM200" -ne 1 ]; then J_LATE_WHY="wordmark-200-count=$J_WM200"; return 0; fi
  l_fs=$(grep -m1 "LynxTemplateRender: onFirstScreen" "$lf" | awk '{print $2}')
  l_end=$(splash_end_mark "$lf")
  if [ -z "$l_fs" ] || [ -z "$l_end" ]; then J_LATE_WHY=no-splash-end-mark; return 0; fi
  J_LATE_END_MS=$(diff_ms "$l_fs" "$l_end")
  if [ "$J_LATE_END_MS" -lt "$LATE_MIN_END_MS" ]; then J_LATE_WHY="ended-early(${J_LATE_END_MS}ms)"; return 0; fi
  J_LATE_OK=1
  return 0
}

judge() {
  jf=$1; jmode=${2:-pass}; jnext=${3:-na}; jseg=${4:-}
  J_FIRST=$(grep -c "LynxTemplateRender: onFirstScreen" "$jf")
  J_FAILED_ALL=$(grep -c "LynxImageManager: onFailed" "$jf")
  J_FAILED_LOGO=$(grep -c "LynxImageManager: onFailed.*logo-handwriting" "$jf")
  J_FINAL=$(grep -c "SendCustomEvent event name:finalloopcomplete" "$jf")
  J_ERREV=$(grep -c "SendCustomEvent event name:error" "$jf")
  j_scheme=$(grep -c "LynxImageManager: onFailed.*Unsupported uri scheme" "$jf")
  j_fs=$(grep -m1 "LynxTemplateRender: onFirstScreen" "$jf" | awk '{print $2}')
  j_fin=$(grep -m1 "SendCustomEvent event name:finalloopcomplete" "$jf" | awk '{print $2}')
  j_err=$(grep -m1 "SendCustomEvent event name:error" "$jf" | awk '{print $2}')
  j_end=${j_err:-$j_fin}
  J_LEN=NA; J_KIND=""; J_WM200=NA
  if [ -n "$j_fs" ] && [ -n "$j_end" ]; then J_LEN=$(diff_ms "$j_fs" "$j_end"); fi

  if [ "$jmode" = "load-failure" ]; then
    if [ "$J_FIRST" -eq 0 ]; then J_VERDICT=UNDECIDED; J_REASON=no-onFirstScreen
    elif [ "$j_scheme" -gt 0 ]; then J_VERDICT=FAIL; J_REASON=unsupported-uri-scheme
    elif [ "$J_FAILED_LOGO" -eq 0 ]; then J_VERDICT=FAIL; J_REASON=no-wordmark-onFailed
    elif [ "$J_ERREV" -eq 0 ]; then J_VERDICT=FAIL; J_REASON=splash-did-not-end
    elif [ "$jnext" != "y" ]; then J_VERDICT=FAIL; J_REASON=onboarding-next-missing
    else J_VERDICT=PASS; J_REASON=ok
    fi
    return 0
  fi

  if [ "$J_FAILED_ALL" -gt 0 ]; then J_VERDICT=FAIL; J_KIND=defect; J_REASON=onFailed
  elif [ "$J_FIRST" -eq 0 ]; then J_VERDICT=UNDECIDED; J_REASON=no-onFirstScreen
  elif [ "$J_FINAL" -gt 0 ]; then J_VERDICT=PASS; J_REASON=ok
  else
    late_check "$jf" "$jseg"
    if [ "$J_LATE_OK" -eq 1 ]; then
      J_VERDICT=LATE; J_REASON=late-arrival; J_LEN=$J_LATE_END_MS
    else
      J_VERDICT=FAIL; J_KIND=no-request; J_REASON="no-finalloopcomplete($J_LATE_WHY)"
    fi
  fi
  return 0
}

median_of() { # 줄마다 숫자 하나 → 중앙값(없으면 NA)
  printf '%s\n' "$1" | grep -E '^[0-9]+$' | sort -n | awk '{a[NR]=$1} END{
    if (NR==0) print "NA"; else if (NR%2) print a[(NR+1)/2]; else print int((a[NR/2]+a[NR/2+1])/2) }'
}

# 서버 기록(표준 출력 파일)에서 이 실행의 구간을 자른다: 실행 직전에 센 줄 수 뒤부터, 그 실행의 번들 요청(START … /main.lynx.bundle)부터 끝까지.
# 앞 실행의 늦은 응답이 이 실행의 번들 요청 전에 끝난 줄은 들어오지 않는다. 기기 시계와 호스트 시계를 맞대지 않는다.
seg_extract() { # <서버 기록> <실행 직전 줄 수> <출력 파일>
  tail -n +$(( $2 + 1 )) "$1" 2>/dev/null \
    | awk '/START +[0-9]+ +\/main\.lynx\.bundle/ && !s { s=1 } s' > "$3"
}

# LATE 가 시도의 5%를 넘었는가(넘으면 0 종료) — 정수 계산: late * 100 > attempts * 5
late_over_budget() { # <late 수> <시도 수>
  [ $(( $1 * 100 )) -gt $(( $2 * LATE_BUDGET_PERCENT )) ]
}

load_now() { # 호스트 1분 부하
  uptime | awk -F'load averages?: ' '{print $2}' | awk '{print $1}' | tr -d ,
}

# 모든 adb 는 ADB_TIMEOUT 초 안에 끝나야 한다(기기가 사라지면 `- waiting for device -`에서 멈추는 것을 막는다).
# 상한을 넘기면 adb 를 죽이고 124 를 돌려준다.
A() {
  "$ADB_BIN" -s "$SER" "$@" &
  a_pid=$!
  ( sleep "$ADB_TIMEOUT"; kill "$a_pid" 2>/dev/null ) >/dev/null 2>&1 &
  a_watch=$!
  wait "$a_pid" 2>/dev/null
  a_rc=$?
  pkill -P "$a_watch" 2>/dev/null
  kill "$a_watch" 2>/dev/null
  wait "$a_watch" 2>/dev/null
  if [ "$a_rc" -eq 143 ] || [ "$a_rc" -eq 137 ]; then return 124; fi
  return "$a_rc"
}

# ---------------------------------------------------------------------------
# selftest — 기기 없이 judge · 서버 구간 · 예산 · adb 상한을 검증한다.
# ---------------------------------------------------------------------------
st_fail=0
st_expect() { # <이름> <logcat 파일> <mode> <next> <기대 verdict> [기대 kind] [서버 구간 파일]
  judge "$2" "$3" "$4" "${7:-}"
  st_kind_ok=1
  if [ -n "${6:-}" ] && [ "$J_KIND" != "$6" ]; then st_kind_ok=0; fi
  if [ "$J_VERDICT" = "$5" ] && [ "$st_kind_ok" -eq 1 ]; then printf 'ok    %-52s -> %s%s (%s)\n' "$1" "$J_VERDICT" "${J_KIND:+/$J_KIND}" "$J_REASON"
  else printf 'NOT OK %-51s -> %s%s (%s), 기대 %s%s\n' "$1" "$J_VERDICT" "${J_KIND:+/$J_KIND}" "$J_REASON" "$5" "${6:+/$6}"; st_fail=$((st_fail+1)); fi
}

st_check() { # <이름> <실제> <기대>
  if [ "$2" = "$3" ]; then printf 'ok    %-52s = %s\n' "$1" "$2"
  else printf 'NOT OK %-51s = %s, 기대 %s\n' "$1" "$2" "$3"; st_fail=$((st_fail+1)); fi
}

selftest() {
  samples=${1:-}
  d=$(mktemp -d "${TMPDIR:-/tmp}/splash-selftest.XXXXXX") || return 2
  L='10-06 22:48:21.000  4684  4684 I'
  # 합성 표본 — 실제 logcat 과 같은 줄 모양(날짜 시각 pid tid 레벨 태그: 메시지)
  { echo "$L ActivityTaskManager: Displayed libitum.duru.android/com.libitum.host.MainActivity"
    echo "10-06 22:48:21.265  4684  4684 I LynxTemplateRender: onFirstScreen"
    echo "10-06 22:48:21.282  4684  4684 E LynxImageManager: onFailed src:asset:///static/image/logo-handwriting.31d15f7dc3.webp,with reason:Unsupported uri scheme! Uri is: /static/image/logo-handwriting..."
    echo "10-06 22:48:21.282  4684  4684 I lynx    : [1:INFO:touch_event_handler.cc(374)] SendCustomEvent event name:error tag:15"
  } > "$d/fail.log"
  { echo "10-06 22:48:29.577  4850  4850 I LynxTemplateRender: onFirstScreen"
    echo "10-06 22:48:32.012  4850  4850 I lynx    : [1:INFO:touch_event_handler.cc(374)] SendCustomEvent event name:finalloopcomplete tag:15"
  } > "$d/pass.log"
  { echo "$L ActivityTaskManager: Displayed libitum.duru.android/com.libitum.host.MainActivity"
    echo "$L Choreographer: Skipped 30 frames!"
  } > "$d/nosignal.log"
  { echo "10-06 22:48:29.577  4850  4850 I LynxTemplateRender: onFirstScreen"
  } > "$d/nofinal.log"
  { echo "10-06 22:48:29.577  4850  4850 I LynxTemplateRender: onFirstScreen"
    echo "10-06 22:48:29.700  4850  4850 E LynxImageManager: onFailed src:asset:///static/image/onboarding-1.webp,with reason:Unsupported uri scheme! Uri is: /static/image/onboarding-1..."
    echo "10-06 22:48:32.012  4850  4850 I lynx    : [1:INFO:touch_event_handler.cc(374)] SendCustomEvent event name:finalloopcomplete tag:15"
  } > "$d/otherimage-fail.log"
  { echo "10-06 23:59:59.500  4850  4850 I LynxTemplateRender: onFirstScreen"
    echo "10-07 00:00:02.100  4850  4850 I lynx    : [1:INFO:touch_event_handler.cc(374)] SendCustomEvent event name:finalloopcomplete tag:15"
  } > "$d/midnight.log"
  { echo "10-06 22:48:29.577  4850  4850 I LynxTemplateRender: onFirstScreen"
    echo "10-06 22:48:29.600  4850  4850 E LynxImageManager: onFailed src:asset:///static/image/logo-handwriting.31d15f7dc3.webp,with reason:Failed to open asset: static/image/logo-handwriting.31d15f7dc3.webp"
    echo "10-06 22:48:29.610  4850  4850 I lynx    : [1:INFO:touch_event_handler.cc(374)] SendCustomEvent event name:error tag:15"
  } > "$d/loadfail-ok.log"

  st_expect "합성 실패(onFailed + error 이벤트)"          "$d/fail.log"          pass na FAIL defect
  st_expect "합성 성공(onFirstScreen + finalloopcomplete)" "$d/pass.log"          pass na PASS
  st_expect "합성 신호 없음(번들 미로드)"                  "$d/nosignal.log"      pass na UNDECIDED
  st_expect "onFirstScreen 만 있고 끝 이벤트 없음(서버 없음)" "$d/nofinal.log"    pass na FAIL no-request
  st_expect "다른 이미지의 onFailed + finalloopcomplete"   "$d/otherimage-fail.log" pass na FAIL defect
  st_expect "자정을 넘긴 성공"                             "$d/midnight.log"      pass na PASS
  st_expect "load-failure: 다른 이유 + error + Next"       "$d/loadfail-ok.log"   load-failure y PASS
  st_expect "load-failure: Next 표지 없음"                 "$d/loadfail-ok.log"   load-failure n FAIL
  st_expect "load-failure: 경합 실패(Unsupported scheme)"  "$d/fail.log"          load-failure y FAIL
  st_expect "load-failure: 번들 미로드"                    "$d/nosignal.log"      load-failure y UNDECIDED
  st_expect "load-failure: 워드마크가 멀쩡히 떴다"          "$d/pass.log"          load-failure y FAIL
  judge "$d/midnight.log" pass na
  st_check "자정 넘김의 스플래시 길이(ms)" "$J_LEN" 2600
  st_check "중앙값 1 2 3 4" "$(median_of "$(printf '3\n1\n2\n4\n')")" 2
  st_check "중앙값 빈 입력" "$(median_of "")" NA

  # --- r02.2: 늦은 도착(LATE) — 합성. 첫 화면 22:48:29.577, 스플래시 끝 표지(auth.session) 3.5 s 뒤.
  FS='10-06 22:48:29.577  4850  4850 I LynxTemplateRender: onFirstScreen'
  AUTH='10-06 22:48:33.077  4850  4912 I lynx    : [1:INFO:method_invoker.cc(482)] NativeModule: LynxModuleAndroid MethodInvoker::InvokeMethod, method: (StorageModule.get.libitum.auth.session) will fire 0xB4000073'
  DESTROY='10-06 22:48:33.980  4850  4850 E lynx    : [1:ERROR:layout_context.cc(548)] DestroyLayoutNodeBeforeRemoveFromParent tag:image'
  { echo "$FS"; echo "$AUTH"; echo "$DESTROY"; } > "$d/late.log"
  { echo "$FS"; echo "$DESTROY"; } > "$d/late-destroy-only.log"
  { echo "$FS"; echo "$AUTH"; } > "$d/late-auth-only.log"
  { echo "$FS"; echo '10-06 22:48:29.739  4850  4912 I lynx    : [1:INFO:method_invoker.cc(482)] NativeModule: LynxModuleAndroid MethodInvoker::InvokeMethod, method: (StorageModule.get.libitum.auth.session) will fire 0xB4000073'
    echo '10-06 22:48:33.577  4850  4912 I lynx    : [1:INFO:method_invoker.cc(482)] NativeModule: LynxModuleAndroid MethodInvoker::InvokeMethod, method: (StorageModule.get.libitum.auth.session) will fire 0xB4000073'
    echo '10-06 22:48:33.580  4850  4850 E lynx    : [1:ERROR:layout_context.cc(548)] DestroyLayoutNodeBeforeRemoveFromParent tag:image'; } > "$d/early-auth.log"
  { echo "$FS"; echo '10-06 22:48:30.877  4850  4912 I lynx    : [1:INFO:method_invoker.cc(482)] NativeModule: LynxModuleAndroid MethodInvoker::InvokeMethod, method: (StorageModule.get.libitum.auth.session) will fire 0xB4000073'; } > "$d/ended-early.log"
  { echo '10-06 22:48:28.100  4850  4912 I lynx    : [1:INFO:method_invoker.cc(482)] NativeModule: LynxModuleAndroid MethodInvoker::InvokeMethod, method: (StorageModule.get.libitum.auth.session) will fire 0xB4000073'
    echo "$FS"; echo "$AUTH"; } > "$d/auth-before-first-screen.log"
  { echo "$FS"; echo "10-06 22:48:33.050  4850  4850 I lynx    : [1:INFO:touch_event_handler.cc(374)] SendCustomEvent event name:error tag:15"; echo "$AUTH"; } > "$d/late-with-error.log"
  { echo "$FS"; echo "10-06 22:48:29.700  4850  4850 E LynxImageManager: onFailed src:http://10.0.2.2:18793/static/image/logo-handwriting.webp,with reason:HTTP code 404"; echo "$AUTH"; } > "$d/late-with-onfailed.log"
  { echo '10-06 23:59:58.000  4850  4850 I LynxTemplateRender: onFirstScreen'
    echo '10-07 00:00:01.600  4850  4912 I lynx    : [1:INFO:method_invoker.cc(482)] NativeModule: LynxModuleAndroid MethodInvoker::InvokeMethod, method: (StorageModule.get.libitum.auth.session) will fire 0xB4000073'; } > "$d/late-midnight.log"
  # 서버 구간(요청 기록 서버의 표준 출력 모양)
  B1='02:35:23.521 START 51406 /main.lynx.bundle'; B2='02:35:24.124 END   51406 /main.lynx.bundle 200 603ms'
  W1='02:35:25.654 START 51412 /static/image/logo-handwriting.31d15f7dc3.webp'
  W2='02:35:27.666 END   51412 /static/image/logo-handwriting.31d15f7dc3.webp 200 2011ms'
  { echo "$B1"; echo "$B2"; echo "$W1"; echo "$W2"; } > "$d/seg-ok.log"
  { echo "$B1"; echo "$B2"; echo "$W1"; echo '02:35:27.666 END   51412 /static/image/logo-handwriting.31d15f7dc3.webp 404 2ms'; } > "$d/seg-404.log"
  { echo "$B1"; echo "$B2"; echo "$W1"; } > "$d/seg-noend.log"
  { echo "$B1"; echo "$B2"; echo "$W1"; echo "$W2"; echo "$W1"; echo "$W2"; } > "$d/seg-two.log"
  { echo "$B1"; echo "$B2"; echo "$W1"; echo '02:35:27.666 END   51412 /static/image/logo-handwriting.31d15f7dc3.webp 2011ms'; } > "$d/seg-oldformat.log"
  : > "$d/seg-empty.log"

  st_expect "LATE: 서버 200 1건 · 4.4 s 뒤 끝남(Destroy)"        "$d/late.log"               pass na LATE "" "$d/seg-ok.log"
  st_expect "LATE: 끝 표지가 auth.session 뿐(Destroy 없음)"       "$d/late-auth-only.log"      pass na LATE "" "$d/seg-ok.log"
  st_expect "LATE: 스플래시 도중의 이른 auth.session 은 끝이 아니다" "$d/early-auth.log"       pass na LATE "" "$d/seg-ok.log"
  st_expect "LATE: 끝 표지가 Destroy 뿐"                       "$d/late-destroy-only.log"   pass na LATE "" "$d/seg-ok.log"
  st_expect "LATE: 자정을 넘긴 3.6 s"                           "$d/late-midnight.log"       pass na LATE "" "$d/seg-ok.log"
  st_expect "LATE: 첫 화면 앞의 auth.session 은 끝 표지가 아니다" "$d/auth-before-first-screen.log" pass na LATE "" "$d/seg-ok.log"
  st_expect "요청 없음: 서버 기록을 안 줬다(--server-log 없음)"  "$d/late.log"               pass na FAIL no-request
  st_expect "요청 없음: 서버 구간이 비었다"                     "$d/late.log"               pass na FAIL no-request "$d/seg-empty.log"
  st_expect "요청 없음: 워드마크 응답이 404"                    "$d/late.log"               pass na FAIL no-request "$d/seg-404.log"
  st_expect "요청 없음: 워드마크 요청만 있고 응답이 안 끝남"      "$d/late.log"               pass na FAIL no-request "$d/seg-noend.log"
  st_expect "요청 없음: 워드마크 200 응답이 2건"                "$d/late.log"               pass na FAIL no-request "$d/seg-two.log"
  st_expect "요청 없음: 상태 칸이 없는 옛 서버 기록"             "$d/late.log"               pass na FAIL no-request "$d/seg-oldformat.log"
  st_expect "요청 없음: 3.0 s 전에 닫혔다(일찍 닫힘 회귀)"       "$d/ended-early.log"        pass na FAIL no-request "$d/seg-ok.log"
  st_expect "요청 없음: error 이벤트가 있다"                    "$d/late-with-error.log"    pass na FAIL no-request "$d/seg-ok.log"
  st_expect "결함: onFailed 가 있으면 서버가 200 이어도 FAIL"    "$d/late-with-onfailed.log" pass na FAIL defect "$d/seg-ok.log"
  st_expect "PASS 는 서버 구간이 있어도 PASS"                   "$d/pass.log"               pass na PASS "" "$d/seg-ok.log"
  judge "$d/late.log" pass na "$d/seg-ok.log"
  st_check "LATE 의 길이(첫 화면 → Destroy, ms)" "$J_LEN" 4403
  judge "$d/early-auth.log" pass na "$d/seg-ok.log"
  st_check "이른 auth.session 이 있어도 길이는 Destroy 기준(ms)" "$J_LEN" 4003
  judge "$d/late.log" pass na "$d/seg-two.log"
  st_check "워드마크 200 응답 수(2건 구간)" "$J_WM200" 2
  judge "$d/nofinal.log" pass na ""
  case "$J_REASON" in *no-server-record*) echo "ok    요청 없음의 이유에 빠진 증거를 적는다 ($J_REASON)" ;; *) echo "NOT OK 이유에 빠진 증거가 없다: $J_REASON"; st_fail=$((st_fail+1)) ;; esac

  # 서버 구간 자르기 — 앞 실행의 늦은 응답(번들 요청 전에 끝난 줄)은 이 실행에 들어오지 않는다.
  { echo '02:35:10.000 START 1 /static/image/logo-handwriting.31d15f7dc3.webp'
    echo '02:35:12.000 END   1 /static/image/logo-handwriting.31d15f7dc3.webp 200 2000ms'
    echo "$B1"; echo "$B2"; echo "$W1"; echo "$W2"; } > "$d/server-all.log"
  seg_extract "$d/server-all.log" 2 "$d/seg-cut.log"
  st_check "서버 구간: 앞 실행의 줄 수(2) 뒤 · 번들 요청부터" "$(wc -l < "$d/seg-cut.log" | tr -d ' ')" 4
  seg_extract "$d/server-all.log" 0 "$d/seg-cut0.log"
  st_check "서버 구간: 직전 줄 수가 0 이어도 번들 요청부터 4줄" "$(grep -c . "$d/seg-cut0.log" | tr -d ' ')" 4
  judge "$d/late.log" pass na "$d/seg-cut0.log"
  st_check "서버 구간에서 센 앞 실행의 응답은 빠진다" "$J_VERDICT" LATE

  # LATE 예산 — 시도의 5% 초과(정수 계산)
  if late_over_budget 3 70; then v=over; else v=within; fi; st_check "LATE 3 / 시도 70 (4.3%)" "$v" within
  if late_over_budget 4 71; then v=over; else v=within; fi; st_check "LATE 4 / 시도 71 (5.6%)" "$v" over
  if late_over_budget 1 20; then v=over; else v=within; fi; st_check "LATE 1 / 시도 20 (정확히 5%)" "$v" within
  if late_over_budget 0 10; then v=over; else v=within; fi; st_check "LATE 0 / 시도 10" "$v" within
  if late_over_budget 2 10; then v=over; else v=within; fi; st_check "LATE 2 / 시도 10 (20%)" "$v" over

  # adb 상한 — 응답하지 않는 adb 는 ADB_TIMEOUT 안에 124 로 끝난다(기기가 사라졌을 때 영원히 기다리지 않는다)
  printf '#!/bin/sh\nsleep 30\n' > "$d/hang-adb"; chmod +x "$d/hang-adb"
  save_adb=$ADB_BIN; save_to=$ADB_TIMEOUT; save_ser=${SER:-}
  ADB_BIN="$d/hang-adb"; ADB_TIMEOUT=1; SER=dummy
  t0=$(date +%s); A get-state >/dev/null 2>&1; a_res=$?; t1=$(date +%s)
  ADB_BIN=$save_adb; ADB_TIMEOUT=$save_to; SER=$save_ser
  st_check "멈춘 adb 는 124 로 끝난다" "$a_res" 124
  if [ $(( t1 - t0 )) -le 5 ]; then v=fast; else v=slow; fi; st_check "멈춘 adb 는 상한(1 s) 근처에 끝난다" "$v" fast
  printf '#!/bin/sh\necho device\n' > "$d/ok-adb"; chmod +x "$d/ok-adb"
  ADB_BIN="$d/ok-adb"; SER=dummy
  a_out=$(A get-state); a_res=$?
  ADB_BIN=$save_adb; SER=$save_ser
  st_check "정상 adb 의 출력과 종료 코드" "$a_out/$a_res" "device/0"

  # 실제 logcat 표본(선택). 파일 이름 규칙: <이름>-<판정>[-…].log, 판정 = OK(PASS) · FAIL(결함) · NOREQ(요청 없음) · LATE.
  #   같은 이름의 `<이름>-….server.log` 가 있으면 그 파일의 서버 구간으로 판정한다(LATE 표본은 필수).
  if [ -n "$samples" ]; then
    n=0
    for f in "$samples"/*-FAIL*.log "$samples"/*-OK*.log "$samples"/*-NOREQ*.log "$samples"/*-LATE*.log; do
      [ -f "$f" ] || continue
      case "$f" in *.server.log) continue ;; esac
      base=$(basename "$f")
      srv="${f%.log}.server.log"; [ -f "$srv" ] || srv=""
      case "$base" in
        *-FAIL*) want=FAIL; wkind=defect ;;
        *-NOREQ*) want=FAIL; wkind=no-request ;;
        *-LATE*) want=LATE; wkind="" ;;
        *) want=PASS; wkind="" ;;
      esac
      st_expect "표본 $base" "$f" pass na "$want" "$wkind" "$srv"; n=$((n+1))
    done
    if [ "$n" -eq 0 ]; then echo "NOT OK 표본 디렉터리에 *-FAIL*.log · *-OK*.log · *-NOREQ*.log · *-LATE*.log 가 없다: $samples"; st_fail=$((st_fail+1)); fi
  fi
  rm -rf "$d"
  if [ "$st_fail" -eq 0 ]; then echo "selftest: 전부 통과"; return 0; fi
  echo "selftest: $st_fail 건 실패"; return 1
}

# ---------------------------------------------------------------------------
# 인자
# ---------------------------------------------------------------------------
SELF=$0   # zsh 에서는 함수 안의 $0 이 함수 이름이라 최상위에서 붙잡아 둔다
usage() { sed -n '2,23p' "$SELF" | sed 's/^# \{0,1\}//'; }

SER=""; BUILD=""; COUNT=""; COLD=""; OUT=""; BURL=""; WAIT=12; MAXA=""; LABEL=""; EXPECT=pass; SRVLOG=""
SHOT=0; STOPFAIL=0; DOSELF=0; SAMPLES=""
while [ $# -gt 0 ]; do
  case "$1" in
    --serial) SER=$2; shift 2 ;;
    --build) BUILD=$2; shift 2 ;;
    --count) COUNT=$2; shift 2 ;;
    --cold) COLD=$2; shift 2 ;;
    --out) OUT=$2; shift 2 ;;
    --bundle-url) BURL=$2; shift 2 ;;
    --server-log) SRVLOG=$2; shift 2 ;;
    --wait) WAIT=$2; shift 2 ;;
    --max-attempts) MAXA=$2; shift 2 ;;
    --label) LABEL=$2; shift 2 ;;
    --expect) EXPECT=$2; shift 2 ;;
    --shot) SHOT=1; shift ;;
    --stop-on-fail) STOPFAIL=1; shift ;;
    --selftest) DOSELF=1; shift ;;
    --samples) SAMPLES=$2; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "알 수 없는 인자: $1" >&2; usage >&2; exit 2 ;;
  esac
done

if [ "$DOSELF" -eq 1 ]; then selftest "$SAMPLES"; exit $?; fi

die() { echo "오류: $*" >&2; exit 2; }
[ -n "$SER" ] || die "--serial 이 없다"
case "$BUILD" in dev|bundled) ;; *) die "--build 는 dev 또는 bundled" ;; esac
case "$COUNT" in ''|*[!0-9]*) die "--count 는 양의 정수" ;; esac
[ "$COUNT" -gt 0 ] || die "--count 는 양의 정수"
case "$COLD" in clear|stop|install:?*) ;; *) die "--cold 는 clear | stop | install:<apk 경로>" ;; esac
case "$OUT" in /*) ;; *) die "--out 은 절대 경로여야 한다: '$OUT'" ;; esac
case "$EXPECT" in pass|load-failure) ;; *) die "--expect 는 pass | load-failure" ;; esac
case "$WAIT" in ''|*[!0-9]*) die "--wait 는 정수(초)" ;; esac
case "$ADB_TIMEOUT" in ''|*[!0-9]*) die "ADB_TIMEOUT 은 정수(초)" ;; esac
if [ "$BUILD" = "dev" ]; then
  [ -n "$BURL" ] || die "dev(debug) 빌드는 --bundle-url 이 필수다(없으면 10.0.2.2:3000 을 읽는다)"
  case "$BURL" in *:3000/*|*:3000) die "3000 포트의 번들은 다른 작업의 서버일 수 있다 — 18790 같은 전용 포트를 쓴다" ;; esac
fi
if [ "$BUILD" = "bundled" ] && [ -n "$BURL" ]; then
  echo "경고: bundled 빌드는 bundle-url extra 를 무시한다(HostPaths.template) — 건네지 않는다" >&2
  BURL=""
fi
if [ "$BUILD" = "bundled" ] && [ -n "$SRVLOG" ]; then
  echo "경고: bundled 빌드는 번들 서버가 없다 — --server-log 를 무시한다(finalloopcomplete 없음은 늘 FAIL(요청 없음))" >&2
  SRVLOG=""
fi
if [ -n "$SRVLOG" ]; then
  case "$SRVLOG" in /*) ;; *) die "--server-log 는 절대 경로여야 한다: '$SRVLOG'" ;; esac
  [ -f "$SRVLOG" ] || die "서버 기록 파일이 없다: $SRVLOG (apps/android/tools/wordmark-delay-server.py 의 표준 출력 파일)"
fi
case "$COLD" in install:*) APK=${COLD#install:}; [ -f "$APK" ] || die "apk 가 없다: $APK" ;; *) APK="" ;; esac
[ -n "$MAXA" ] || MAXA=$(( COUNT * 2 + 10 ))
[ -n "$LABEL" ] || LABEL="$SER-$BUILD-$(printf '%s' "$COLD" | sed 's/:.*//')"
[ "$MAXA" -ge "$COUNT" ] || die "--max-attempts 는 --count 이상"

# 사전 점검 — 기기 · 패키지 · (dev) 번들 서버
if [ "$(A get-state 2>/dev/null | tr -d '\r')" != "device" ]; then die "기기 '$SER' 가 device 상태가 아니다(adb devices)"; fi
SDK=$(A shell getprop ro.build.version.sdk | tr -d '\r')
if [ "$COLD" != "${COLD#install:}" ]; then :; elif ! A shell pm path "$PKG" 2>/dev/null | grep -q package:; then die "$PKG 가 설치돼 있지 않다"; fi
if [ "$BUILD" = "dev" ]; then
  HURL=$(printf '%s' "$BURL" | sed 's#//10\.0\.2\.2#//localhost#')
  if command -v curl >/dev/null 2>&1; then
    curl -sfI "$HURL" >/dev/null 2>&1 || die "번들 서버가 응답하지 않는다: $HURL (호스트 쪽에서 본 주소)"
  fi
fi
mkdir -p "$OUT" || die "출력 디렉터리를 못 만든다: $OUT"
SUMMARY="$OUT/$LABEL.summary.txt"

# 다음 회차 번호 — 이미 있는 <label>-<N>.log 보다 큰 번호부터. 파일을 덮어쓰지 않는다(요약 줄 수를 세지 않는다).
next_no() {
  nn=1
  while [ -e "$OUT/$LABEL-$nn.log" ]; do nn=$((nn+1)); done
  echo "$nn"
}

# 이 회차 프로세스의 logcat 만 읽는다. API 30 에서는 `logcat -c` 가 버퍼를 비우지 않아 앞 회차의 꼬리가 섞인다(e2e 결함 T1).
PID=""
lc() { if [ -n "$PID" ]; then A logcat -d --pid="$PID" -v threadtime 2>&1; fi; }

LOAD_START=$(load_now)
echo "# $LABEL · sdk=$SDK · build=$BUILD · cold=$COLD · expect=$EXPECT · 유효 시도 목표 $COUNT · 상한 $MAXA · wait ${WAIT}s · 서버 기록 ${SRVLOG:-없음} · 부하(1분) 시작 ${LOAD_START:-NA} · $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$SUMMARY"

VALID=0; NFAILED=0; NDEFECT=0; NNOREQ=0; NPASS=0; NLATE=0; NUND=0; ATT=0; LENS=""; LOST=0
while [ "$VALID" -lt "$COUNT" ] && [ "$ATT" -lt "$MAXA" ]; do
  # 기기가 사라졌으면 멈춘다(기기를 기다리며 영원히 멈추지 않는다)
  if [ "$(A get-state 2>/dev/null | tr -d '\r')" != "device" ]; then LOST=1; break; fi
  ATT=$((ATT+1)); N=$(next_no)
  F="$OUT/$LABEL-$N.log"
  A shell am force-stop "$PKG" >/dev/null 2>&1
  case "$COLD" in
    clear) A shell pm clear "$PKG" >/dev/null 2>&1 ;;
    stop) ;;
    install:*) A uninstall "$PKG" >/dev/null 2>&1; A install -r "$APK" >/dev/null 2>&1 || { echo "설치 실패: $APK" >&2; exit 2; } ;;
  esac
  sleep 1
  : > "$F"     # 회차 번호가 든 파일을 먼저 만들어 다음 회차가 같은 번호를 못 받게 한다
  SL0=0; if [ -n "$SRVLOG" ]; then SL0=$(wc -l < "$SRVLOG" | tr -d ' '); fi
  PID=""
  if [ "$BUILD" = "dev" ]; then
    A shell am start -W -n "$ACT" --es bundle-url "$BURL" > "$OUT/$LABEL-$N.start.txt" 2>&1
  else
    A shell am start -W -n "$ACT" > "$OUT/$LABEL-$N.start.txt" 2>&1
  fi
  PID=$(A shell pidof "$PKG" 2>/dev/null | tr -d '\r' | awk '{print $1}')
  if [ "$SHOT" -eq 1 ]; then sleep 0.6; A exec-out screencap -p > "$OUT/$LABEL-$N.png" 2>/dev/null; fi
  # 끝 이벤트가 찍힐 때까지 1초 간격으로 본다(최대 WAIT 초) — 고정 sleep 대신.
  # 끝 이벤트: finalloopcomplete · error, 또는 스플래시 이미지 노드가 지워진 표지(늦은 도착은 이벤트 없이 끝난다)
  w=0
  while [ "$w" -lt "$WAIT" ]; do
    if lc | grep -q "SendCustomEvent event name:\(finalloopcomplete\|error\)\|DestroyLayoutNodeBeforeRemoveFromParent tag:image"; then break; fi
    sleep 1; w=$((w+1))
  done
  sleep 1
  lc > "$F"
  NEXT=na
  if [ "$EXPECT" = "load-failure" ]; then
    A shell uiautomator dump /sdcard/splash-ui.xml >/dev/null 2>&1
    A exec-out cat /sdcard/splash-ui.xml > "$OUT/$LABEL-$N.ui.xml" 2>/dev/null
    if grep -q -E '(text|content-desc)="Next"' "$OUT/$LABEL-$N.ui.xml" 2>/dev/null; then NEXT=y; else NEXT=n; fi
  fi
  SEG=""
  if [ -n "$SRVLOG" ]; then
    SEG="$OUT/$LABEL-$N.server.log"
    seg_extract "$SRVLOG" "$SL0" "$SEG"
  fi
  judge "$F" "$EXPECT" "$NEXT" "$SEG"
  LAUNCH=$(grep -m1 LaunchState "$OUT/$LABEL-$N.start.txt" 2>/dev/null | awk '{print $2}')
  case "$J_VERDICT" in
    PASS) VALID=$((VALID+1)); NPASS=$((NPASS+1)); LENS="$LENS
$J_LEN" ;;
    FAIL) VALID=$((VALID+1)); NFAILED=$((NFAILED+1))
          if [ "$J_KIND" = "no-request" ]; then NNOREQ=$((NNOREQ+1)); else NDEFECT=$((NDEFECT+1)); fi ;;
    LATE) NLATE=$((NLATE+1)) ;;      # 유효 시도에서 빼고 다시 채운다
    UNDECIDED) NUND=$((NUND+1)) ;;
  esac
  echo "$LABEL run=$N verdict=$J_VERDICT kind=${J_KIND:--} reason=$J_REASON splashMs=$J_LEN onFailedAll=$J_FAILED_ALL onFailedLogo=$J_FAILED_LOGO onFirstScreen=$J_FIRST finalloop=$J_FINAL errorEvent=$J_ERREV wordmark200=$J_WM200 next=$NEXT launch=${LAUNCH:-NA} load=$(load_now)" | tee -a "$SUMMARY"
  if [ "$J_VERDICT" = "FAIL" ] && [ "$STOPFAIL" -eq 1 ]; then break; fi
done

MED=$(median_of "$LENS")
LOAD_END=$(load_now)
LATE_PCT=$(awk -v l="$NLATE" -v a="$ATT" 'BEGIN{ if (a==0) print "0.0"; else printf "%.1f", l*100/a }')
if [ "$NFAILED" -gt 0 ]; then FINAL=FAIL; RC=1
elif [ "$LOST" -eq 1 ]; then FINAL="INTERRUPTED(기기가 사라졌다 — adb 가 ${ADB_TIMEOUT}s 안에 응답하지 않음)"; RC=4
elif late_over_budget "$NLATE" "$ATT"; then FINAL="환경 부적합(LATE ${NLATE}/${ATT} = ${LATE_PCT}% > ${LATE_BUDGET_PERCENT}% — 통과가 아니다, 단독 기기로 다시 돈다)"; RC=5
elif [ "$VALID" -lt "$COUNT" ]; then FINAL=INCOMPLETE; RC=3
else FINAL=PASS; RC=0; fi
if [ "$NFAILED" -gt 0 ] && late_over_budget "$NLATE" "$ATT"; then FINAL="$FINAL · 환경 부적합이기도 하다(LATE ${NLATE}/${ATT} = ${LATE_PCT}%)"; fi
if [ "$NFAILED" -gt 0 ] && [ "$LOST" -eq 1 ]; then FINAL="$FINAL · 기기가 사라져 중단됐다"; fi
echo "== $LABEL: 실패 $NFAILED(결함 $NDEFECT · 요청 없음 $NNOREQ) / 유효 시도 $VALID (목표 $COUNT) · LATE $NLATE (${LATE_PCT}%) · 판정 불가 $NUND · 시도 $ATT/$MAXA · 부하(1분) 시작 ${LOAD_START:-NA} → 끝 ${LOAD_END:-NA} · 통과 실행의 스플래시 길이 중앙값 ${MED} ms(기록만) · $FINAL" | tee -a "$SUMMARY"
exit "$RC"
