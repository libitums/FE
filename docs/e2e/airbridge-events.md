# Airbridge 앱 이벤트 SDK — 값이 없으면 조용하고, 있으면 시작하는가

> ⟨2026-10-21 — [ADR-0081](../adr/0081-tutorial-as-catalog-episode.md)⟩ 옛 튜토리얼(고정 목록 · 스텝 · 프롤로그 · 최종 스토리 · 손글씨)과 메신저 · 전화 · 비주얼 노벨 화면이 지워졌다. 이 문서에서 그 화면을 단계로 쓰는 절은 **더 실행할 수 없다 — 기록으로 남긴다.** 튜토리얼은 이제 카탈로그 에피소드 `u00-tutorial`(맵 첫 구획 `Episode 0.`)이고 절차는 [튜토리얼 u00 e2e](tutorial-u00.md)다.

호스트 앱의 광고 측정 SDK를 Meta에서 Airbridge로 바꾼 변경(작업 `airbridge-sdk`)을 **기기에서 본다.** 이 문서가 지는 것은 자동 계층이 대신할 수 없는 셋이다.

1. **값이 없는 빌드에서 Airbridge가 아무 요청도 내지 않는가** — `*.airbridge.io` · `abr.ge`로 나가는 요청이 0건이고, 새 시스템 팝업(iOS 추적 허용 · 붙여넣기 허용 포함)이 뜨지 않는다.
2. **가짜 값 빌드에서 SDK가 실제로 시작하고 앱이 죽지 않는가** — Airbridge 도메인으로 연결이 열린다(응답이 실패해도 된다).
3. **새 의존이 붙은 iOS 앱 · Android 앱이 기기에서 평소처럼 뜨는가.**

이벤트 매핑 · 호스트 모듈 해석 · 추적 파일이 계약과 같은지는 unit · integration이 진다(JS 매핑은 `apps/mobile/src/lib/airbridge-events.unit.test.ts`, 호스트 쪽은 `devtools/android-bundle/host-airbridge-events.integration.test.mjs`와 네이티브 테스트 `AirbridgeEventsConfigTest` · `AirbridgeEventsHostTest` · `AirbridgeEventsTests`). 결정과 대가는 [ADR-0063](../adr/0063-airbridge-events.md)이, 값 넣기 · 스토어 고지는 [운영 안내](../airbridge-events.md)가 진다. 이 문서는 **절차**다.

## 실행 상태

| 시나리오 | 상태 |
|---|---|
| A 값 없는 빌드의 무동작 | **통과(한계 있음)** — 2026-10-13 · `77cad033` · iOS 시뮬레이터 · Android 에뮬레이터. 로그인 화면 · 재시작까지, 로그인 이후 미수행([A 결과 기록](#a-결과-기록)) |
| B 가짜 값 빌드 | **통과(한계 있음)** — 같은 날 · 같은 커밋 · 같은 기기. SDK 시작 · 연결 · 무크래시까지, 이벤트 전달(B-6)은 로그인이 필요해 미수행([B 결과 기록](#b-결과-기록)) |
| C 실제 값으로 Airbridge 대시보드 확인 | **미실행 — 이번 범위 밖, 사용자 몫** |
| D 추적 허용(ATT) 대화상자 ⟨2026-10-22, ADR-0079⟩ | **일부 통과** — 2026-10-22 · iPhone 13 mini · Release · 실제 값. D-2(맵 진입에 한 번 뜸) 통과, D-1 · D-3 · D-4 · D-5 미실행([D](#d--추적-허용att-대화상자-adr-0079)) |
| E 딥링크 · 지연 딥링크 ⟨2026-10-22, ADR-0080⟩ | **일부 통과** — iOS 실기 E-1 ~ E-3 통과(사용자 관찰), Android는 호스트 수신까지, E-4 ~ E-6 미실행([E](#e--딥링크--지연-딥링크-adr-0080)) |
| F 웹 랜딩 → 설치 귀속 ⟨2026-10-30, ADR-0090⟩ | **미실행 — AB-M1 · M2 · M3 전부.** Vercel Production에 Web SDK Token이 아직 없다(사용자 작업). 자동 e2e(AB-E1 ~ E4 · 128건 중 12)는 2026-10-30 통과([F](#f--웹-랜딩--설치-귀속-adr-0090)) |

**미실행 · 관찰 불가는 통과가 아니다.** 2026-10-13 실행에서 이 문서의 명령 다섯 곳이 그대로는 맞지 않아 고쳤다 — [절차 정정 기록](#절차-정정-기록).

## 공통 전제

- 앱 설치 · 실행법은 새로 적지 않는다. iOS는 [e2e README 「자동화 → iOS」](README.md#ios)의 빌드 · 설치 명령, Android는 [`apps/android/README.md`](../../apps/android/README.md)의 「APK 자산으로 실행」(`assembleBundled`)과 「HTTP 미리보기로 실행」을 따른다.
- **iOS는 Release로 빌드한다.** Debug 호스트는 `localhost:3000`의 dev 서버를 읽어 다른 작업 트리의 코드가 뜰 수 있다([README](README.md#ios)의 같은 주의).
- 로그인 · 진입 흐름의 전제(토큰 없는 상태, 전용 시뮬레이터 · 에뮬레이터)는 [진입 흐름](entry-flow.md)과 README의 「공통 전제」를 따른다. 안내 오버레이가 끼어들면 [학습 문항 안내 e2e](learning-item-guides.md)의 주대로 먼저 닫는다.
- **로그인 필요 표시.** 가입 완료(여정 입장의 「여정 시작하기」)와 유닛 완료는 로그인한 뒤에야 닿는다. 로그인은 사람이 해야 한다. 이 문서에서 **「로그인 필요」**가 붙은 단계는 로그인할 수 있는 사람이 있을 때만 수행하고, 못 하면 「로그인 화면까지」로 적는다(통과가 아니라 한계가 있는 결과다).
  ⟨2026-10-18⟩ **가입 완료를 보려면 서버 기록이 없는 새 계정으로 로그인한다** — 기록 있는 계정은 로그인 뒤 언어 선택 · 여정 입장을 건너뛰고 바로 맵으로 가
  「여정 시작하기」(가입 완료)를 지나지 않는다([ADR-0069](../adr/0069-returning-learner-login.md) D6). 아래 절차의 「여정 시작하기」까지 가는 단계도 그렇게 읽는다.
- 값 파일은 둘 다 `.gitignore`에 있고 추적되지 않는다. **A는 둘 다 없어야 한다.**

| 플랫폼 | 값 파일(추적 안 함) | 예시(추적함) |
|---|---|---|
| iOS | `apps/ios/Config/Airbridge.local.xcconfig` | `apps/ios/Config/Airbridge.local.xcconfig.example` |
| Android | `apps/android/app/airbridge.properties` | `apps/android/app/airbridge.properties.example` |

- B의 가짜 값은 자리표시자다(`AIRBRIDGE_APP_NAME=duruexample` · `AIRBRIDGE_SDK_TOKEN=00000000000000000000000000000000`). **실제 앱 이름 · SDK 토큰을 이 문서 · 실행 기록 · 로그에 적지 않는다.**
- 관찰할 Airbridge 도메인: `config.airbridge.io` · `tracking-link.airbridge.io`(지연 딥링크 조회) · `attribution.airbridge.io` · `event.airbridge.io` · `iap.airbridge.io` · `abr.ge`. 판정은 `*.airbridge.io`와 `abr.ge` 전체로 한다.
- **첫 실행에 새 시스템 팝업이 없어야 한다.** 사용자가 보는 팝업은 iOS의 추적 허용(ATT)과 붙여넣기 허용(「…에서 붙여넣기」, iOS 16+)이다. 둘 다 이 변경이 켜지 않는 전제이므로 **앱을 지운 깨끗한 설치의 첫 실행**부터 본다. 알림 권한은 이 변경 전부터 있던 것이라 판정 밖이다.

### 환경 준비 (Android)

```sh
# 사용자 SDK 경로에 맞게 고친다. 아래는 기본 위치
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
adb version && emulator -list-avds
```

에뮬레이터는 **사용자의 AVD 데이터를 건드리지 않도록** 읽기 전용으로, 다른 포트로 따로 띄운다.

```sh
emulator -avd <AVD 이름> -read-only -no-snapshot-save -port 5584 &
# 이 문서의 <기기>는 emulator-5584
adb -s emulator-5584 wait-for-device shell getprop sys.boot_completed   # 1이 될 때까지
```

DNS 관찰이 필요하면(선택, 아래 「관찰 수단」 7) `-dns-server <맥 주소>`를 더한다.

## 요청 관찰 수단

호스트 이름이 아니라 **앱 단위로 운영체제에 직접 묻는다.** 0이면 Airbridge로 간 것도 0이다. 프록시 · DNS 방식(분석 e2e의 [「요청 관찰 수단」](analytics.md#요청-관찰-수단a2--a3))은 보조로 쓸 수 있다.

**양성 대조가 먼저다.** 이 앱은 값이 없을 때 Airbridge 요청이 없다는 것이 판정 대상이므로, 「0」이 도구가 못 본 것이 아님을 B(가짜 값)에서 같은 도구로 연결이 **잡히는 것**으로 확인한다. A와 B를 같은 도구 · 같은 명령으로 돌린다.

### iOS 시뮬레이터 — Host 프로세스의 소켓

시뮬레이터 앱은 맥의 프로세스다. **PID는 `simctl launch`가 돌려준 값을 쓴다** — `pgrep -x Host`는 같은 맥에서 돌고 있는 다른 시뮬레이터의 `Host`까지 잡는다(정정 2).

```sh
PID=$(xcrun simctl launch <UDID> com.libitum.host | awk '{print $NF}')   # 출력은 "com.libitum.host: <PID>"
lsof -a -i -n -P -p "$PID"            # 열린 인터넷 소켓
nettop -P -L 1 -p "$PID"              # 프로세스별 연결 · 바이트
```

- A는 소켓 0줄이어야 한다. B는 시작 **0.5초 안에** `config.airbridge.io` · `tracking-link.airbridge.io/.../deferred-deeplink` · `attribution.airbridge.io` · `event.airbridge.io`로 연결이 열린다 — 이것이 양성 대조다.
- **원격 주소는 역방향 조회로 가리지 않는다**(정정 3). 이름을 붙이면 `server-….cloudfront.net` · `ec2-….amazonaws.com`처럼 CDN · 클라우드 이름만 나와 Airbridge인지 알 수 없다. 대신 관찰과 **같은 시각에** Airbridge 도메인을 정방향으로 조회해 IP를 대조한다.

  ```sh
  for d in config.airbridge.io tracking-link.airbridge.io attribution.airbridge.io event.airbridge.io iap.airbridge.io abr.ge; do
    echo "$d: $(dig +short "$d" | tr '\n' ' ')"
  done
  ```

  CDN 주소라 IP가 바뀌고 다른 서비스와 겹칠 수 있다 — 대조는 「그 IP가 그 순간 Airbridge 도메인의 답에 있었다」까지이고, 판정의 중심은 A의 「0줄」과 B의 「실행 직후 새로 열린 연결」이다.
- 한 번으로 끝내지 않는다. 실행 +1초 · +5초 · +15초 · +35초 · 재시작 +3초 · +15초처럼 여러 시점에 찍는다. 순간 관찰이라 시점 사이에 열렸다 닫힌 연결은 놓친다. B는 실행 **직후부터** 짧은 간격으로 반복해 찍는다.

  ```sh
  PID=$(xcrun simctl launch <UDID> com.libitum.host | awk '{print $NF}')
  for i in $(seq 1 25); do echo "t#$i"; lsof -a -i -n -P -p "$PID" 2>/dev/null | tail -n +2; sleep 0.2; done
  ```

- 대조: 같은 두 명령을 맥에서 방금 띄운 `curl`의 PID로 돌려 연결이 잡히는지 먼저 본다(예: `curl -s -o /dev/null https://config.airbridge.io & lsof -a -i -n -P -p $!`).

### Android 에뮬레이터 — 로그와 앱 소켓

⚠ 이전 변경(#242)의 방법 가운데 **쓰지 못하는 것**이 있다.

- 에뮬레이터 `-tcpdump <파일>`은 동작하지 않았다(부팅 구간만 담김). 쓰지 않는다.
- **앱 UID의 `dumpsys netstats detail` 통계는 Airbridge 0건 판정에 쓰지 않는다.** 값 없는 빌드에서도 앱 자체 트래픽 행이 생겨 0이 되지 않는다(구현 중 관찰). 행이 있다고 실패도 아니고 없다고 통과도 아니다.

대신 쓰는 것은 다음 셋이다.

1. **logcat의 Airbridge SDK 로그.** 값 없음 → `initializeSDK` 0건. 가짜 값 → `initializeSDK` 호출과 `invalid SDK token` 계열 응답 로그.

   ```sh
   adb -s <기기> logcat -c
   adb -s <기기> logcat -v time | grep -i -E 'airbridge|initializeSDK|invalid SDK token|FATAL EXCEPTION|AndroidRuntime'
   ```

2. **계측 `AirbridgeEventsHostTest`**(N-A4) — 호스트의 `AirbridgeEvents.started()`가 빌드 값과 같은 상태인지. 값 없음에서는 `false`, 가짜 값에서는 `true`로 서야 한다. 명령은 A2의 5.
3. **앱 프로세스 소켓의 원격 주소.** `/proc/net/tcp`는 네임스페이스를 공유하므로 **UID 열로 걸러야 한다.** 에뮬레이터는 `adb root`가 필요할 수 있다.

   UID는 **패키지 이름이 정확히 같은 줄**에서만 뽑는다(정정 4) — `list packages`의 인자는 부분 일치 필터라 다른 패키지 줄(실행에서는 `…gms.supervision`)이 섞여 UID가 둘 이상 나올 수 있다. 16진수 주소는 **python3로** 바꾼다(정정 5) — macOS 기본 `awk`에는 `strtonum`이 없다.

   ```sh
   UID_APP=$(adb -s <기기> shell cmd package list packages -U libitum.duru.android \
     | awk '$1 == "package:libitum.duru.android" { sub(/^uid:/, "", $2); print $2 }')
   echo "$UID_APP"   # 숫자 하나여야 한다
   adb -s <기기> shell 'cat /proc/net/tcp /proc/net/tcp6' > tcp.txt   # 작업 폴더(저장소 밖)에서
   python3 - "$UID_APP" tcp.txt <<'PY'
   import socket, struct, sys
   uid, path = sys.argv[1], sys.argv[2]
   for line in open(path):
       f = line.split()
       if len(f) < 8 or f[7] != uid:
           continue
       addr, port = f[2].split(":")
       if len(addr) == 8:   # tcp — 리틀 엔디안 32비트
           ip = socket.inet_ntoa(struct.pack("<I", int(addr, 16)))
       else:                # tcp6 — 32비트 워드 넷이 각각 리틀 엔디안
           raw = b"".join(struct.pack("<I", int(addr[i:i + 8], 16)) for i in range(0, 32, 8))
           ip = socket.inet_ntop(socket.AF_INET6, raw)
       print(f"st={f[3]} {ip}:{int(port, 16)}")
   PY
   ```

   찍힌 원격 IP를 iOS 절의 `dig +short` 대조로 Airbridge 도메인의 답과 맞춰 본다(정정 3 — 역방향 조회는 CDN 이름만 준다). 소켓은 **그 순간만** 보이므로 B는 실행 직후부터 반복해 찍는다. 대조: 같은 명령을 트래픽이 있는 다른 UID(Google Play 서비스, `com.google.android.gms`)로 돌려 행이 나오는지 먼저 본다.

위 Android 명령은 2026-10-13 실행에서 고쳐 쓴 꼴이다(대조 UID에서 행이 나오는 것을 먼저 확인했다).

**7. (선택) DNS 관찰.** 에뮬레이터를 `-dns-server <맥 주소>`로 띄워 맥에서 로컬 로깅 리졸버(예: `dnsmasq --log-queries`)가 받게 하면 앱이 조회한 이름이 그대로 남는다. 캐시된 이름은 놓칠 수 있어 앱을 **새로 띄워** 시작부터 잡는다. 이 방법은 문서 작성 시점에 돌려 보지 않았다.

관찰 수단이 모두 동작하지 않으면 「요청 0건」은 **관찰 불가**로 적고 통과로 세지 않는다.

## A — 값 없는 빌드의 무동작 (iOS · Android 둘 다)

### A0. 값 파일이 없는지 확인

```sh
# 저장소 루트 — 둘 다 "No such file"이어야 한다
ls apps/ios/Config/Airbridge.local.xcconfig 2>&1
ls apps/android/app/airbridge.properties 2>&1
git status --short apps/ios/Config apps/android/app   # 추적 파일 변경 없음
```

파일이 있으면 옮겨 두거나 지운 뒤 시작한다(실제 값이 든 파일이면 지우지 말고 저장소 밖으로 옮긴다). 값은 빌드 시점에 박히므로 바꾸면 **다시 빌드한다.**

### A1. iOS (시뮬레이터)

1. 전용 시뮬레이터를 고르고, 앱이 깔려 있으면 지운다: `xcrun simctl uninstall <UDID> com.libitum.host` — 첫 실행의 팝업을 보려면 깨끗한 설치여야 한다.
2. README 「자동화 → iOS」대로 `pnpm bundle:host` → `pod install` → Release `xcodebuild` → `simctl install`. (`pod install`이 고친 `project.pbxproj`는 되돌린다. HostTests의 Pods xcconfig 참조가 사라졌는지도 본다.)
3. 관찰을 켠다: 「요청 관찰 수단」의 iOS 절. 보조로 시뮬레이터 로그를 실행 전부터 흘린다.

   ```sh
   xcrun simctl spawn <UDID> log stream --level debug \
     --predicate 'process == "Host" AND (eventMessage CONTAINS[c] "airbridge" OR subsystem CONTAINS[c] "airbridge")'
   ```

4. 앱을 실행한다: `xcrun simctl launch <UDID> com.libitum.host`. 실행 직후부터 소켓을 여러 시점에 찍고 화면에서 시스템 팝업이 뜨는지 본다(캡처).
5. 진입 흐름을 가능한 데까지 진행한다: 스플래시 → 온보딩 → 로그인 화면. **로그인 필요** — 로그인 → 코드 검증 → 언어 선택 → 여정 입장(「여정 시작하기」 = 가입 완료) → 여정 맵 → 메신저 유닛 열기 → 끝까지 진행해 유닛 완료.
6. 앱을 종료했다가 다시 띄워(`xcrun simctl terminate` → `launch`) 재시작에서도 소켓이 0인지 찍는다.
7. 네이티브 테스트를 **값 없는 상태로** 돌려 증거로 남긴다.

   ```sh
   cd apps/ios && xcodebuild -workspace Host.xcworkspace -scheme Host \
     -destination "platform=iOS Simulator,id=<UDID>" test -only-testing:HostTests/AirbridgeEventsTests
   ```

   `AirbridgeEvents.isStarted == false`로 판정된 것(N-I5)과 모듈이 등록되지 않은 것(N-I7)이 직접 증거다. 이 테스트는 Debug 구성이라 `localhost:3000` 번들을 읽는다 — 판정에는 무관하다.

### A2. Android (에뮬레이터)

1. 「환경 준비」의 에뮬레이터(`emulator-5584`)를 쓰고 앱이 깔려 있으면 지운다: `adb -s <기기> uninstall libitum.duru.android`.
2. 번들 포함 APK를 빌드 · 설치한다.

   ```sh
   pnpm bundle:android
   cd apps/android && ./gradlew :app:assembleBundled
   adb -s <기기> install -r app/build/outputs/apk/bundled/app-bundled.apk
   ```

3. 관찰을 켠다: 위 logcat 명령을 실행 전부터 흘린다.
4. 앱을 실행한다: `adb -s <기기> shell am start -n libitum.duru.android/com.libitum.host.MainActivity`. 소켓을 여러 시점에 찍고 새 권한 대화상자가 뜨는지 본다(캡처).
5. SDK가 시작되지 않았음을 호스트 쪽에서 직접 확인한다. 계측 `AirbridgeEventsHostTest`를 **값 없는 상태로** 돌린다. debug 변형이고 `bundled` APK와 서명이 달라 같은 패키지를 덮어쓰지 못하므로 먼저 지우고 debug를 새로 깐다(관찰 4는 그 전에 끝낸다).

   ```sh
   cd apps/android
   ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
   adb -s <기기> uninstall libitum.duru.android
   adb -s <기기> install -r -t app/build/outputs/apk/debug/app-debug.apk
   adb -s <기기> install -r -t app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
   adb -s <기기> shell am instrument -w -r -e class com.libitum.host.AirbridgeEventsHostTest \
     libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
   ```

   `OK (1 test)`이어야 한다. 값이 없으니 단언이 `false == false`로 서는 것이므로, 「꺼짐」인 채 통과했음을 기록에 적는다.
6. logcat에 `initializeSDK`가 **0건**인지 본다. 주의: 이 SDK의 `AirbridgeLifecycleProvider`는 제거하지 않았으므로 값이 없는 빌드에서도 Airbridge 클래스 일부가 로드되고 수명주기 콜백 하나가 등록된다. 그것은 요청이 아니며, 판정은 `initializeSDK` 호출 · 외부 연결 유무로 한다.
7. 재시작(`am force-stop` → `am start`)과 로그인 이후 구간(**로그인 필요**)은 iOS A1의 5 · 6과 같다.

### A 관찰 항목과 통과 기준

| id | 관찰 | 통과 기준 |
|---|---|---|
| A-1 | 앱이 평소처럼 뜬다 | 스플래시 → 첫 화면, 진입 흐름, (로그인 필요) 유닛 완료까지. 크래시 · 빨간 오류 화면 · 멈춤 없음. 못 간 구간은 「로그인 화면까지」로 적는다 |
| A-2 | 새 시스템 팝업이 없다 | 깨끗한 설치의 **첫 실행** 직후부터 흐름 끝까지 추적 허용(ATT) · 붙여넣기 허용 · 새 권한 대화상자가 뜨지 않는다. 알림 권한은 판정 밖 |
| A-3 | Airbridge로 요청 0건 | 앱 시작부터 재시작 뒤까지 `*.airbridge.io` · `abr.ge`로의 연결 **0건.** iOS: 앱 프로세스 소켓 0줄(모든 시점). Android: logcat에 `initializeSDK` 0건 + 앱 UID 소켓 원격 주소에 Airbridge 없음. 1건이라도 있으면 실패. **B에서 같은 수단이 연결을 잡았을 때만** 0이 근거가 된다 |
| A-4 | SDK 미시작 | iOS: N-I5에서 `isStarted == false`, N-I7에서 모듈 미등록. Android: `AirbridgeEventsHostTest` 통과(`started() == false`) |

**A-3의 한계.** 소켓은 순간 관찰이라 시점 사이에 열렸다 닫힌 연결을 놓치고, Android는 누적 통계를 쓰지 못한다. 그래서 A-4의 네이티브 테스트(시작 여부 직접 판정)와 A-3의 외부 관찰을 함께 판정 근거로 삼는다.

### A 결과 기록

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| 2026-10-13 | `77cad033` | iOS 시뮬레이터 — 전용 기기 `FE-meta-sdk-e2e`(iOS 26.5), Release, 깨끗한 설치 | **통과(한계 있음)** — 로그인 화면 · 재시작까지 | A0: 값 파일 둘 다 없음. **A-1** 실행 → 온보딩 → 로그인 화면(Maestro 온보딩 흐름 완료) · 재시작 정상, 크래시 0. **A-2** 첫 실행 · +60초 · 로그인 화면 · 재시작 화면 캡처에 새 팝업 0(ATT · 붙여넣기 허용 없음). **A-3** `simctl launch` PID의 `lsof` — 실행 0 ~ 6.4초 25시점 · +15 · +35 · +60초 · 로그인 화면 · 재시작 3시점 **모두 0줄**. 시뮬레이터 로그의 Airbridge 관련 줄은 JS가 모듈을 찾지 못했다는 Lynx 경고(`try to find module: AirbridgeEventsModule failed`)뿐이다 — 「모듈 미등록」의 방증. 대조: 맥의 `curl` → `config.airbridge.io` 연결을 같은 `lsof` · `nettop`이 잡았다. **A-4** `AirbridgeEventsTests` 15건 통과(N-I5 `isStarted == false` · N-I7 모듈 미등록) |
| 2026-10-13 | `77cad033` | Android 에뮬레이터 — Pixel_8 AVD(API 37) `-read-only`, `bundled`, 깨끗한 설치 | **통과(한계 있음)** — 로그인 화면 · 재시작까지 | A0: 같음. **A-1** 실행 → 온보딩 → 로그인 화면 · `force-stop` 뒤 재시작 정상, `FATAL EXCEPTION` 0. **A-2** 같은 네 시점 캡처에 새 권한 대화상자 0. **A-3** logcat의 `initializeSDK` **0건**(Airbridge 관련 줄은 Lynx의 모듈 조회 실패 경고뿐) · 앱 UID의 `/proc/net/tcp*` — 실행 직후 0.4초 간격 15시점 · +5 · +10 · +20초 · 로그인 화면 · 재시작 3시점 **모두 0행**. 대조: 같은 명령을 Play 서비스 UID로 돌려 3행(443 · 5228)이 나왔다. **A-4** 계측 `AirbridgeEventsHostTest` `OK (1 test)` — 「꺼짐」인 채 통과(`started() == false`) |

**A의 한계.** 로그인 이후(가입 완료 · 유닛 완료)는 사람 손이 필요해 수행하지 않았다. iOS · Android 각 한 대이고 실기는 보지 않았다. 소켓은 순간 관찰이다 — A-4의 직접 판정과 함께 읽는다. 실행 로그 · 캡처는 저장소 밖 작업 폴더에 있다(값은 어디에도 적지 않았다).

## B — 가짜 값 빌드 (두 플랫폼)

**목적**: SDK가 실제로 시작되고, 죽지 않고, Airbridge 도메인으로 연결이 열리는지 본다. 응답이 실패(잘못된 토큰)해도 된다 — 요청이 **나가는 것**이 관찰 대상이다. 이 시나리오는 A-3의 0이 근거가 되는 양성 대조이기도 하다.

### B1. 가짜 값 넣기

**예시 파일을 복사만 하면 값이 비어 있다**(정정 1) — 그 빌드는 A와 같은 「값 없음」이다. 파일에 자리표시자 값을 직접 쓴다.

```sh
# 저장소 루트
printf 'AIRBRIDGE_APP_NAME = duruexample\nAIRBRIDGE_SDK_TOKEN = 00000000000000000000000000000000\n' \
  > apps/ios/Config/Airbridge.local.xcconfig
printf 'AIRBRIDGE_APP_NAME=duruexample\nAIRBRIDGE_SDK_TOKEN=00000000000000000000000000000000\n' \
  > apps/android/app/airbridge.properties
git status --short apps/ios/Config apps/android/app   # 아무것도 안 나와야 한다(무시되는 파일)
```

앱 이름은 영문 · 숫자 · 밑줄 · 하이픈만, 토큰은 공백 없는 한 덩어리여야 SDK가 선다(아니면 A와 같이 꺼진다). 파일을 만들었으면 해당 플랫폼을 **다시 빌드 · 설치한다**(A1의 2, A2의 2). iOS는 값이 바뀌면 clean 빌드가 안전하다. 팝업을 보려면 B도 앱을 지운 깨끗한 설치로 시작한다.

**값이 빌드에 들어갔는지 실행 전에 본다.**

```sh
plutil -extract AirbridgeAppName raw "$(xcrun simctl get_app_container <UDID> com.libitum.host)/Info.plist"   # duruexample
grep AIRBRIDGE_APP_NAME apps/android/app/build/generated/source/buildConfig/bundled/com/libitum/host/BuildConfig.java   # "duruexample"
```

비어 있으면 그 빌드는 B가 아니다 — 지우고 다시 빌드한다.

### B2. 관찰

| id | 단계 | 통과 기준 |
|---|---|---|
| B-1 | 앱 실행 → 30초 이상 둔다 → (로그인 필요) 진입 흐름 | 앱이 죽지 않는다. Android logcat `FATAL EXCEPTION` 0건, iOS 크래시 로그 0건. 프로세스가 살아 있다 |
| B-2 | 시작 직후 | Airbridge 도메인으로 연결이 **열린다.** iOS: 소켓에 `config.airbridge.io` · `tracking-link.airbridge.io` · `attribution.airbridge.io` · `event.airbridge.io` 중 하나 이상. Android: logcat에 `initializeSDK` 호출 + `invalid SDK token` 계열 응답 로그, 가능하면 앱 소켓의 Airbridge 원격 주소 |
| B-3 | iOS 요청 시작 시각 | 실행 직후 **수 초 안에** 요청이 시작된다(30초 ATT 대기 없음). 0.2초 간격 관찰에서 첫 연결이 잡힌 시각을 기록한다 |
| B-4 | 팝업 | iOS에서 추적 허용 · 붙여넣기 허용 팝업이 첫 실행부터 한 번도 뜨지 않는다. Android에서 새 권한 대화상자가 없다 |
| B-5 | 호스트 테스트가 「켜짐」 | iOS: `AirbridgeEventsTests`의 N-I5 · N-I7이 `isStarted == true` · 모듈 등록으로 통과. Android: `AirbridgeEventsHostTest`가 `started() == true`로 `OK (1 test)` |
| B-6 | (로그인 필요) 가입 완료 · 유닛 완료 직후 | 앱 홈으로 보냈다 되돌려 몇 초 기다린 뒤 `event.airbridge.io`로 연결이 이어진다. 로그인할 수 없으면 「미실행」과 이유를 적는다 |

**B의 한계.** 요청 본문은 TLS로 암호화되어 있어 어떤 이벤트(`airbridge.user.signup` · `airbridge.achieveLevel`)가 실렸는지는 보이지 않는다. B는 「SDK가 시작되고 연결이 열리며 앱이 죽지 않는다」까지만 판정한다. 이벤트 이름이 대시보드에 찍히는지는 C가 진다. 또한 지연 딥링크 조회(iOS `tracking-link.airbridge.io/.../deferred-deeplink`, Android logcat의 `fetching deferred-deeplink`)는 값이 있으면 나간다 — B에서 그 연결 · 로그가 보이는 것은 실패가 아니다.

### B3. 끝나면 값 파일 삭제

```sh
rm apps/ios/Config/Airbridge.local.xcconfig
rm apps/android/app/airbridge.properties
git status --short apps/ios/Config apps/android/app   # 아무것도 안 나와야 한다
```

값 파일을 지운 뒤에는 **다시 빌드해야** 값 없는 빌드로 돌아간다 — 지우고 곧바로 A를 이어 돌릴 때는 재빌드를 잊지 않는다.

### B 결과 기록

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| 2026-10-13 | `77cad033` | iOS 시뮬레이터 — A와 같은 기기, Release, 깨끗한 설치 | **통과(한계 있음)** — B-1 ~ B-5. B-6 미수행 | 첫 B 빌드는 예시를 복사만 해 값이 비어 버렸다 — 버리고 다시 빌드했다(정정 1). **B-1** 실행 · +35초 · 로그인 화면 · 재시작까지 프로세스 생존, 크래시 0. **B-2 · B-3** `simctl launch` PID의 `lsof` — **+0.5초**에 첫 연결(`config.airbridge.io`의 답에 있던 IP), +0.8초에 넷(그 밖에 `tracking-link` · `attribution` · `event`의 답에 있던 IP — 같은 시각 `dig +short` 대조). ATT 대기 없음. 시뮬레이터 로그에 SDK의 저장 키(`CO__AB180__AIRBRIDGE_IOS_SDK__…`) 조회가 실행 직후 찍혔다. **B-4** 같은 네 시점 캡처에 추적 허용 · 붙여넣기 허용 팝업 0. **B-5** `AirbridgeEventsTests` 15건 가운데 14 통과 · 1 건너뜀 — N-I7은 모듈 등록으로 통과, 건너뛴 것은 N-I5의 「시작 안 됨이면 무동작」 케이스다(값이 있는 빌드에서는 실제 이벤트가 나가므로 테스트가 스스로 건너뛴다). **건너뜀은 통과로 세지 않는다** — 「켜짐」의 근거는 N-I7과 B-2다 |
| 2026-10-13 | `77cad033` | Android 에뮬레이터 — A와 같은 기기, `bundled`, 깨끗한 설치 | **통과(한계 있음)** — B-1 ~ B-5. B-6 미수행 | **B-1** 실행 · +35초 · 로그인 화면까지 `FATAL EXCEPTION` · ANR 0. **B-2** logcat `{initializeSDK} is called` · `{setTrackMetaDeferredAppLinkEnabled} is called: {false}` · 광고 ID 클라이언트 연결 · Lynx `LynxModuleAndroid Create: AirbridgeEventsModule` · `Failed on fetching deferred-deeplink: … invalid SDK token`(가짜 토큰이라 거절 — 요청이 나갔다는 뜻). 앱 UID 소켓에 원격 443 연결이 반복해 잡혔고(약 90행) IP는 `tracking-link` · `event` · `attribution`의 `dig` 답에 있었다. 대조: Play 서비스 UID 3행. **B-4** 새 권한 대화상자 0. **B-5** `AirbridgeEventsHostTest` `OK (1 test)` — 같은 실행의 logcat에 `initializeSDK`가 있어 「켜짐」으로 통과했다 |

**B의 한계.** B-6(가입 완료 · 유닛 완료 직후의 `event.airbridge.io` 연결)은 로그인이 필요해 수행하지 않았다 — 앱이 낸 이벤트가 호스트 모듈을 지나 SDK까지 닿는 것은 기기에서 보지 않았다. 지연 딥링크 조회는 두 플랫폼 모두 나갔다(iOS `tracking-link` 연결, Android `fetching deferred-deeplink` 로그) — 계약대로 실패가 아니지만 끄는 옵션은 확인하지 못했다(ADR-0063 D5).

## 절차 정정 기록

2026-10-13 실행(`77cad033`, test-runner)에서 처음 판의 명령이 그대로는 맞지 않은 곳 다섯. 위 본문은 고친 꼴이다.

| # | 처음 판 | 무엇이 틀렸나 | 고친 꼴 |
|---|---|---|---|
| 1 | B1이 예시 파일을 `cp`만 하고 값은 주석으로 보여 줌 | 예시 파일은 값이 비어 있어 `cp`만으로는 「값 없음」 빌드가 된다. 첫 iOS B 빌드가 그렇게 버려졌다 | `printf`로 자리표시자 값을 직접 쓰고, 빌드 산출물(`Info.plist` · `BuildConfig`)에서 값이 들어갔는지 본 뒤 실행 |
| 2 | iOS PID를 `pgrep -x Host`로 | 같은 맥의 다른 시뮬레이터에서 도는 `Host`까지 잡는다 | `xcrun simctl launch`가 돌려준 PID |
| 3 | 원격 IP를 `host <IP>`로 역방향 조회 | CDN · 클라우드 이름(`…cloudfront.net` · `…amazonaws.com`)만 나와 판정에 쓸 수 없다 | 같은 시각에 Airbridge 도메인을 `dig +short`로 정방향 조회해 IP 대조 |
| 4 | Android UID를 `list packages -U libitum.duru.android`의 출력 전체에서 `sed`로 | 인자가 부분 일치 필터라 다른 패키지 줄(`…gms.supervision`)까지 섞였다 | `$1 == "package:libitum.duru.android"`인 줄에서만 |
| 5 | 16진수 주소를 `awk`로(`strtonum`) | macOS 기본 `awk`에 `strtonum`이 없다 | python3 스크립트 |

## C — 실제 값으로 Airbridge 대시보드 수신 확인 (사용자 몫, 이번 범위 밖)

**실행하지 않는다.** 실제 앱 이름 · App SDK Token은 사용자가 가지고 있고, 이 저장소의 에이전트 · 문서 · 로그 어디에도 적지 않는다. 절차만 둔다.

1. Airbridge 대시보드 [Settings] > [Tokens]에서 앱 이름과 **App SDK Token**(Web SDK Token · API Token이 아니다)을 받는다.
2. 값을 B1의 로컬 값 파일에 넣고 다시 빌드 · 설치한다(파일은 추적되지 않는다. 커밋하지 않는다).
3. 대시보드의 **Real-time Logs**를 열어 둔다(이벤트는 수 분 늦게 올 수 있다).
4. 새 설치에서 진입 흐름을 「여정 시작하기」까지 가고(가입 완료), 여정의 메신저 유닛을 끝낸다. **로그인 필요.**
5. 기대: Real-time Logs에 **Install** · **Open** 이벤트와 `airbridge.user.signup`(가입 완료), `airbridge.achieveLevel`(유닛 완료)이 찍히고, 후자에 `level` · `label` 속성이 계약대로 실린다.
6. 함께 볼 것: 개인정보가 속성에 실리지 않았는지. ~~iOS에서 설치 이벤트가 실행 직후 곧바로 나가는지(ATT 대기 없음)~~ ⟨2026-10-22⟩ iOS 설치 이벤트는 이제 ATT 결정까지(최대 600초) 기다린다 — 아래 D.
7. 끝나면 로컬 값 파일을 지운다(B3).

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| | | | **미실행** | |

## D — 추적 허용(ATT) 대화상자 (ADR-0079)

iOS 실기(iPhone 13 mini) · **Release** · 실제 값이 든 빌드. 추적 허용 상태를 처음으로 되돌리려면 앱을 지우고 다시 설치한다
(설정 › 개인정보 보호 › 추적에서 앱을 끄는 것은 「거부」이고 `notDetermined`로 돌아가지 않는다). 설정 › 개인정보 보호 › 추적의
「앱이 추적을 요청하도록 허용」이 켜져 있어야 한다 — 꺼져 있으면 시스템이 묻지 않고 거부로 답한다.

| # | 하는 것 | 기대 |
|---|---|---|
| D-1 | 새 설치 → 온보딩 · 로그인 · 이름 · 나라 · 언어 선택까지 간다 | 추적 허용 대화상자가 **뜨지 않는다** |
| D-2 | 「여정 시작하기」 → 여정 맵 | 맵이 선 직후 시스템 대화상자가 **한 번** 뜨고, 문구가 「Allow tracking so we can measure which ads helped you find Duru. We never sell your data.」이다 |
| D-3 | 「허용」(또는 「요청하지 않음」)을 누르고 롤플레이 탭 → 여정 탭 | 다시 뜨지 않는다. 앱을 껐다 켜도 뜨지 않는다 |
| D-4 | Airbridge Real-time Logs | **Install** · **Open**이 결정 뒤에 들어온다(허용이면 IDFA가 실린다). 결정 전 600초 안에는 Install이 늦을 수 있다 |
| D-5 | 기록 있는 계정으로 새 설치 → 로그인 | 바로 맵에 들어설 때 한 번 뜬다(D2) |

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| 2026-10-22 | `0cf652e3` | iPhone 13 mini(iOS 27.0.1) — Release, 실제 값, 덮어 설치(로그인된 세션 그대로) | **D-2 통과** · D-1 · D-3 · D-4 · D-5 미실행 | 기기 콘솔(`devicectl … --console`): 실행 +0초 `AirbridgeEventsModule registered`(SDK 시작), 맵이 선 +3.6초에 `invokeMethod: AirbridgeEventsModule.requestTrackingAuthorization` 1회. **대화상자가 화면에 뜬 것은 사용자가 기기에서 봤다**(문구 대조는 하지 않음). 새 설치가 아니라 진입 흐름(D-1)은 지나지 않았다. Real-time Logs(D-4)는 보지 않았다 |

## E — 딥링크 · 지연 딥링크 (ADR-0080)

실제 값이 든 빌드. 로그인된 세션으로 시작한다(E-4만 새 설치).

| # | 하는 것 | 기대 |
|---|---|---|
| E-1 | 앱을 끈 채 `duru://roleplay` 열기 — iOS `xcrun devicectl device process launch --payload-url duru://roleplay …` 또는 Safari 주소창, Android `adb shell am start -a android.intent.action.VIEW -d duru://roleplay` | 앱이 켜지고 맵을 지나 롤플레이 탭이 선다 |
| E-2 | 앱이 켜진 채(여정 탭) `duru://settings` | 설정 탭으로 옮긴다 |
| E-3 | `duru://shop` · `duru://` | 앱만 열리고 화면은 그대로다 |
| E-4 | 앱을 지우고 대시보드 트래킹 링크(딥링크 `duru://roleplay`)를 누른 뒤 설치 · 실행 | 온보딩 · 가입 중에는 그대로, 「여정 시작하기」 뒤 롤플레이 탭이 선다 |
| E-5 | 대시보드 트래킹 링크를 앱이 설치된 기기에서 누른다 | 브라우저를 거치지 않고(universal link · App Link) 앱이 그 탭으로 열린다. Real-time Logs에 딥링크 열림이 찍힌다 |
| E-6 | 로그인(Google · Apple 웹 인증)을 한 번 끝까지 | 로그인 콜백(`duru://auth-callback`)이 그대로 동작하고 딥링크로 화면이 옮겨지지 않는다 |

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| 2026-10-22 | `b6124067` | iPhone 13 mini(iOS 27.0.1) — Release, 실제 값, 로그인된 세션 | **E-1 · E-2 · E-3 통과** | Safari 주소창에서 `duru://roleplay` · `duru://settings` · `duru://shop`을 열어 사용자가 기기에서 봤다(「잘되네」). 서명된 `.app`의 entitlements에 `applinks:duru.airbridge.io` · `applinks:duru.abr.ge`가 실렸다(`codesign -d --entitlements`). 콘솔에 맵 진입 직후 `takeOpenedDeeplink` 호출 |
| 2026-10-22 | `b6124067` | Android 에뮬레이터(Pixel 8) — `bundled`, 실제 값, **로그인 전** | **호스트 수신만** | `am start -d duru://roleplay` → logcat `sendGlobalEvent airbridgeDeeplinkOpened`. 로그인 전이라 온보딩에 머물렀고(링크는 들고 있음 — D3대로), 탭 이동은 보지 않았다 |

## F — 웹 랜딩 → 설치 귀속 (ADR-0090)

⟨2026-10-30⟩ 앱이 아니라 **랜딩 `apps/landing`**의 Airbridge Web SDK다([ADR-0090](../adr/0090-landing-airbridge-web-sdk.md) · [랜딩 README 「분석」](../../apps/landing/README.md#airbridge-web-sdk-2026-10-30)).
자동 e2e(`apps/landing/e2e/airbridge.e2e.ts` AB-E1 ~ E4 — 스텁 SDK에 넘어간 `init` · `openDeeplink` 인자 · 이동 없음 · GA `download_click` · 시간대별 `startTracking` · 스텁 없는 클릭의
기본 이동 · 토큰 없는 빌드의 무동작)는 로더를 빈 스크립트로 막고 `window.airbridge`를 스텁으로 갈아 끼우므로 **실제 SDK · 대시보드 · 실기 설치는 보지 못한다.** 이 절이 그 셋이다.

전제: Vercel 랜딩 프로젝트 **Production**에 `PUBLIC_AIRBRIDGE_WEB_TOKEN`(Airbridge [Settings] › [Tokens]의 **Web SDK Token** — App SDK Token · API Token이 아니다)을 넣고
프로덕션(`k-duru.com`)을 다시 배포한 뒤. 프리뷰는 값이 있어도 싣지 않는다. Android 실기에는 앱이 **설치되어 있지 않아야** 한다(AB-M1). Airbridge 대시보드의
Google Ads 연동 · Google Ads 최종 URL 접미사(`utm_source=google&utm_medium=cpc&utm_campaign={_c}&utm_content={_ag}&utm_term={keyword}`)는 사용자가 앞서 맞춘 것을 전제한다.
**실제 토큰 값을 이 문서 · 실행 기록 · 로그 · 스크린샷에 적지 않는다**(테스트의 가짜 값은 `e2e-test-web-token-0000000000`뿐).

| # | 기기 · 조건 | 하는 것 | 기대 |
|---|---|---|---|
| AB-M1 | 실제 토큰이 든 프로덕션, **Android Chrome 실기 · 앱 미설치**, Google Ads 테스트 링크(utm 접미사가 붙은 랜딩 주소) | 링크로 랜딩에 들어가 `/` 또는 `/ko/`의 Play 카드(「Android · Google Play · Download」)를 누른다 → Play 스토어에서 설치 → 첫 실행 → 「여정 시작하기」까지 | 카드를 누르면 **같은 탭**에서 Play 스토어로 간다(`google-play` 폴백 — 새 탭이 아니다). Airbridge **Real-time Logs**에 웹 이벤트(Web-to-App 클릭)가 먼저 찍히고, 설치 · 첫 실행 뒤 **Install**이 채널 `google.adwords`(연동) 또는 `k-duru.com`(직접 유입), 캠페인 · 광고그룹 · 키워드 = 접미사의 `utm_campaign` · `utm_content` · `utm_term` 값으로 찍힌다. 앱이 지연 딥링크로 여정 탭을 연다(E-4 꼴, [추정]). 랜딩 GA4 실시간에 `download_click { store: android }`가 함께 보인다 |
| AB-M2 | 같은 배포, **데스크톱 Chrome**(DevTools › Sensors › Location으로 시간대 `Europe/Paris`) | 시크릿 창으로 `/`를 연다 → DevTools Network(`airbridge` · `abr.ge` 필터)와 Application › Cookies를 본다 → 시간대를 `Asia/Seoul`로 바꾸고 **새로고침** | `Europe/Paris`: `static.airbridge.io` 로더 요청 하나뿐이고 Airbridge **수집 요청 0 · `airbridge_*` 쿠키 0**(init은 되지만 `startTracking`이 불리지 않는다). `Asia/Seoul`로 바꾸고 새로고침하면 수집 요청 · 쿠키가 **생긴다**. 콘솔 오류 0 |
| AB-M3 | 같은 배포, **데스크톱**(아무 브라우저)과 **iOS Safari**(앱 없음) | Play 카드를 누른다 | SDK가 떠 있으면 `desktop` · `fallbacks.ios`가 **지금 보는 랜딩 URL**이라 **같은 페이지로 돌아온다**(페이지가 다시 로드되고 포커스가 처음으로 간다) — 사용자 결정의 체감이다. 「아무 일도 안 일어난 것」처럼 보이면 ADR-0090 「재검토 조건」(Play 웹 주소 대안 · WCAG 2.4.4 · 2.4.3)의 자료로 적는다. SDK가 안 떴으면(차단기) 새 탭에 Play 웹 페이지가 열린다 |

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| — | — | — | **미실행** | Vercel Production에 토큰을 넣기 전. 자동 e2e만 2026-10-30 통과(chromium · analytics · analytics-mobile 128건) |

## 이 절차로 확인되지 않는 것

- 이벤트가 Airbridge 쪽에서 어떻게 집계 · 귀속되는지(C의 몫).
- 요청 본문에 무엇이 실렸는지(TLS · SDK 내부 형식).
- Android에서 Airbridge 요청 0건의 누적 증명(netstats · 패킷 캡처를 쓰지 못한다 — 로그 · 계측 · 순간 소켓의 조합이다).
- 실기, API 37 밖의 Android, 앱 심사 단계의 개인정보 선언(`docs/ios-privacy.md`가 진다).
- ~~iOS ATT를 추가하는 후속 작업~~ ⟨2026-10-22⟩ ADR-0079가 열었다 — 시나리오 D. 사전 안내 화면은 여전히 없다.
