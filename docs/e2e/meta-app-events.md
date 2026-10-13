# Meta 앱 이벤트 SDK — 값이 없으면 조용한가

호스트 앱에 Meta(Facebook) SDK를 넣은 변경(작업 `meta-sdk`)을 **기기에서 본다.** 이 문서가 지는 것은 자동 계층이 대신할 수 없는 둘이다.

1. **값이 없는 빌드에서 SDK가 아무것도 하지 않는가** — Meta 도메인으로 나가는 요청이 0건이고, iOS에서 추적 허용 같은 새 시스템 팝업이 뜨지 않는다.
2. **동적 프레임워크가 붙은 iOS 앱 · 새 의존이 붙은 Android 앱이 기기에서 평소처럼 뜨는가.**

이벤트 매핑 · 호스트 모듈 해석 · 추적 파일이 계약과 같은지는 unit · integration이 진다(JS 매핑은 `apps/mobile/src/lib/meta-events.unit.test.ts`, 호스트 쪽은 `devtools/android-bundle/host-meta-app-events.integration.test.mjs`와 네이티브 테스트 `MetaAppEventsConfigTest` · `MetaAppEventsHostTest` · `MetaAppEventsTests`). 결정과 대가는 [ADR-0057](../adr/0057-meta-app-events.md)이, 값 넣기 · 스토어 고지는 [운영 안내](../meta-app-events.md)가 진다. 이 문서는 **절차**다.

## 실행 상태

| 시나리오 | 상태 |
|---|---|
| A 값 없는 빌드의 무동작 | **2026-10-13에 두 플랫폼에서 실행 — 한계가 있는 통과.** 실행 · 재시작 · 로그인 화면까지만 보았고 로그인 이후(가입 완료 · 유닛 완료)는 수행하지 않았다. 아래 「A 결과 기록」 |
| B 가짜 값 빌드 | **Android만 부분 실행**(SDK 시작 · 요청 나감 · 죽지 않음까지. 이벤트 전달은 미실행). iOS는 미실행 — 구현 중에 비공식으로 본 것만 있다(아래 「B 결과 기록」의 주) |
| C 실제 값으로 Meta 이벤트 관리자 확인 | **미실행 — 이번 범위 밖, 사용자 몫** |

**미실행 · 관찰 불가는 통과가 아니다.**

## 공통 전제

- 앱 설치 · 실행법은 새로 적지 않는다. iOS는 [e2e README 「자동화 → iOS」](README.md#ios)의 빌드 · 설치 명령, Android는 [`apps/android/README.md`](../../apps/android/README.md)의 「APK 자산으로 실행」(`assembleBundled`)과 「HTTP 미리보기로 실행」을 따른다.
- **iOS는 Release로 빌드한다.** Debug 호스트는 `localhost:3000`의 dev 서버를 읽어 다른 작업 트리의 코드가 뜰 수 있다([README](README.md#ios)의 같은 주의).
- 로그인 · 진입 흐름의 전제(토큰 없는 상태, 전용 시뮬레이터 · 에뮬레이터)는 [진입 흐름](entry-flow.md)과 README의 「공통 전제」를 따른다. 흐름 중 안내 오버레이가 끼어들면 [학습 문항 안내 e2e](learning-item-guides.md)의 주대로 먼저 닫는다.
- 값 파일은 둘 다 `.gitignore`에 있고 추적되지 않는다. 경로는 아래와 같고 **A는 둘 다 없어야 한다.**

| 플랫폼 | 값 파일(추적 안 함) | 예시(추적함) |
|---|---|---|
| iOS | `apps/ios/Config/Meta.local.xcconfig` | `apps/ios/Config/Meta.local.xcconfig.example` |
| Android | `apps/android/app/meta.properties` | `apps/android/app/meta.properties.example` |

- 이 문서의 값은 모두 자리표시자(`123` · `abc`)다. **실제 앱 ID · 클라이언트 토큰을 이 문서 · 실행 기록 · 로그에 적지 않는다.**
- 관찰할 Meta 도메인: `facebook.com`의 모든 하위 이름, 특히 `graph.facebook.com`과 `ep1.facebook.com` · `ep2.facebook.com`(`ep*.facebook.com`).

### 요청 관찰 수단

요청 관찰은 [분석 e2e의 「요청 관찰 수단」](analytics.md)을 그대로 쓴다. 호스트만 `posthog` 대신 `facebook`으로 바꾼다.

1. **권장(강함): 맥의 HTTP 프록시**(Proxyman · Charles 등). iOS 시뮬레이터는 맥의 시스템 프록시를 따른다. Android 에뮬레이터는 `emulator -avd <이름> -http-proxy http://<맥 주소>:<포트>` 또는 기기 Wi-Fi 설정의 프록시로 맥 프록시를 바라보게 한다. 호스트 필터에 `facebook`을 걸고 **앱 실행 시점부터** 끝까지 기록한다. HTTPS 본문 복호화는 필요 없다(CONNECT 대상 호스트만 보여도 0건 판정은 선다).
2. **대체: DNS 조회 관찰.** 맥에서 `sudo tcpdump -i any -n 'port 53' | grep -i facebook`. 0줄이면 접속 시도가 없었다는 뜻이다. 캐시된 이름은 놓칠 수 있어 앱을 **새로 띄워** 시작부터 잡는다. 에뮬레이터 DNS는 맥을 거치므로 같은 방법이 선다.
3. **약함: 기기 로그.** 아래 각 플랫폼 절의 로그 명령. 이 앱의 호스트 코드는 요청을 로그로 남기지 않고 SDK 로그는 기본으로 꺼져 있다 — **로그에 없다는 것은 요청이 없다는 증거가 아니다.** 로그는 SDK 시작 흔적과 크래시를 보는 보조 수단일 뿐이다.
4. 1~3과 아래 5 · 6을 모두 쓸 수 없으면 「요청 0건」은 **관찰 불가**로 적고 통과로 세지 않는다.

**2026-10-13 실행에서 실제로 쓴 수단은 위 1 ~ 3이 아니다.** 프록시는 대조군이 모자랐고 에뮬레이터 패킷 캡처는 동작하지 않았다. 대신 **「이 앱의 프로세스가 연결을 열었는가」를 운영체제에 직접 물었다.** 호스트 이름이 아니라 앱 단위로 보므로 Meta 도메인뿐 아니라 그 앱의 모든 외부 연결이 잡힌다 — 0이면 Meta로 간 것도 0이다. 다음 실행에서도 이것을 **우선 수단**으로 쓴다.

5. **Android(우선): 앱 UID의 네트워크 통계와 소켓.**

   ```sh
   # 앱 UID
   adb -s <기기> shell cmd package list packages -U libitum.duru.android     # … uid:<UID>
   # (1) 통계 행 — 앱 UID로 잡힌 트래픽 버킷의 수. 실행 전에 한 번, 실행 · 재시작 뒤에 한 번
   adb -s <기기> shell dumpsys netstats detail | grep -c 'ident=.* uid=<UID> '
   # (2) 지금 열린 TCP 소켓 — uid 열이 <UID>인 줄
   adb -s <기기> shell cat /proc/net/tcp /proc/net/tcp6 | awk '$8 == <UID>'
   # 대조 — 같은 명령을 트래픽이 있는 다른 UID(예: Google Play 서비스)로 돌려 행이 나오는지 본다
   ```

   - 통과: (1)이 실행 전후 모두 0이고 (2)가 비어 있다. **대조 UID에서 행이 나와야** 0이 「도구가 못 본 것」이 아니라 「없던 것」이 된다.
   - `dumpsys netstats detail`의 `mUidCounterSetMap` 구획에 `uid=<UID> set=1` 한 줄이 나올 수 있다. 앱이 전경에 있었다는 표시이고 트래픽 행이 아니다 — 세지 않는다.
   - `/proc/net/tcp`를 읽으려면 root 셸이 필요할 수 있다(에뮬레이터는 `adb root`). 소켓은 **그 순간**만 보이므로 실행 직후 · 로그인 화면 · 재시작 뒤처럼 여러 시점에 찍는다. 짧게 열렸다 닫힌 연결은 (2)가 놓치고 (1)이 잡는다.
   - ⚠ 위 명령 꼴은 2026-10-13 실행의 출력에서 되짚어 적은 것이다. 통계 행의 모양은 Android 버전마다 다를 수 있다 — 대조 UID로 먼저 맞춰 본다.
   - **에뮬레이터 `-tcpdump <파일>`은 이 환경에서 쓰지 못했다**(API 37 · Pixel_8 AVD). 캡처 파일에 부팅 구간만 담기고 그 뒤 패킷이 없었다. 근거에서 뺐다.
   - `-http-proxy`로 맥 프록시를 물리는 방법(위 1)도 돌렸고 앱 실행 구간에 기록된 CONNECT가 없었다. 그러나 그 프록시를 에뮬레이터의 다른 트래픽이 실제로 지나는지를 받칠 대조가 모자라 **근거에서 뺐다.**

6. **iOS 시뮬레이터(우선): Host 프로세스의 소켓.** 시뮬레이터 앱은 맥의 프로세스라 맥 도구로 보인다.

   ```sh
   PID=$(pgrep -x Host)
   lsof -a -p "$PID" -i -n -P          # 열린 인터넷 소켓. 0줄이어야 한다
   nettop -P -L 1 -p "$PID"            # 프로세스별 연결 · 바이트. 머리줄만 나와야 한다
   # 대조 — 같은 두 명령을 맥에서 방금 띄운 curl의 PID로 돌려 연결이 잡히는지 본다
   ```

   - 한 번으로 끝내지 않는다. 2026-10-13에는 실행 +5초 · +13초 · +35초 · 로그인 화면 · 재시작 +3초 · +15초의 여섯 시점에 찍었다.
   - 순간 관찰이라 시점 사이에 열렸다 닫힌 연결은 놓친다. Android의 (1) 같은 누적 통계가 없다.
   - ⚠ 위 명령 꼴도 2026-10-13 실행의 출력에서 되짚어 적은 것이다 — 대조(`curl`)로 먼저 맞춰 본다.
   - ⚠ **앱 자체의 대조 요청이 있어야 강하다.** 번들 환경 변수(`apps/mobile/.env.local`)가 없는 워크트리에서는 앱이 PostHog · Supabase로도 아무것도 보내지 않아 「소켓 0」이 앱의 평소 모습과 구분되지 않는다. 가능하면 환경 변수가 있는 번들로 돌려 다른 요청은 잡히고 Meta만 0인 것을 본다.

## A — 값 없는 빌드의 무동작 (iOS · Android 둘 다, 이번에 실행)

### A0. 값 파일이 없는지 확인

```sh
# 저장소 루트 — 둘 다 "없음"이어야 한다
ls apps/ios/Config/Meta.local.xcconfig 2>&1
ls apps/android/app/meta.properties 2>&1
git status --short apps/ios/Config apps/android/app   # 추적 파일 변경 없음
```

파일이 있으면 옮겨 두거나 지운 뒤 시작한다(실제 값이 든 파일이면 지우지 말고 저장소 밖으로 옮긴다). 값을 바꾸면 **다시 빌드한다** — 값은 빌드 시점에 박힌다.

### A1. iOS (시뮬레이터)

1. 전용 시뮬레이터를 고르고, 앱이 이미 깔려 있으면 지운다(`xcrun simctl uninstall <UDID> com.libitum.host`) — 「첫 실행」의 팝업을 보려면 깨끗한 설치여야 한다.
2. README 「자동화 → iOS」대로 `pnpm bundle:host` → `pod install` → Release `xcodebuild` → `simctl install`. (`pod install`이 고친 `project.pbxproj`는 되돌린다. HostTests의 Pods xcconfig 참조가 사라졌는지도 본다.)
3. 관찰을 켠다.
   - 프록시 / tcpdump: 위 「요청 관찰 수단」 1 또는 2를 먼저 켠다.
   - 시뮬레이터 로그(보조): 별도 터미널에서 실행 전부터 흘린다.

   ```sh
   xcrun simctl spawn <UDID> log stream --level debug \
     --predicate 'process == "Host" AND (eventMessage CONTAINS[c] "facebook" OR eventMessage CONTAINS[c] "FBSDK" OR subsystem CONTAINS[c] "facebook")'
   ```

   사후 확인은 `xcrun simctl spawn <UDID> log show --last 5m --style compact --predicate '<같은 술어>'`.
4. 앱을 실행한다: `xcrun simctl launch <UDID> com.libitum.host`.
5. 진입 흐름을 완주한다: 스플래시 → 온보딩 → 로그인 → 코드 검증 → 언어 선택 → 여정 입장 → 여정 맵 → 메신저 유닛 열기 → 끝까지 진행해 **유닛 완료**. (「가입 완료」로 보내는 이벤트는 로그인 · 코드 검증이 아니라 **여정 입장의 「여정 시작하기」**에서 난다 — `entry_completed`와 같은 순간이다. ⟨2026-10-13 정정 — 처음에는 「로그인 · 코드 검증 단계」로 적혀 있었다⟩)
6. 앱을 종료했다가 다시 띄워 여정 맵까지 간다(재시작에서도 요청이 없어야 한다).
7. 네이티브 테스트(N-I5 · N-I6)를 **값 없는 상태로** 돌려 증거로 남긴다.

   ```sh
   cd apps/ios && xcodebuild -workspace Host.xcworkspace -scheme Host \
     -destination "platform=iOS Simulator,id=<UDID>" test -only-testing:HostTests/MetaAppEventsTests
   ```

   `MetaAppEvents.isStarted`가 `false`로 판정된 것(N-I5)이 이 시나리오의 직접 증거다. 이 테스트는 호스트 앱 안에서 도므로 Debug 구성이고 `localhost:3000` 번들을 읽는다 — 테스트 판정에는 무관하다.

### A2. Android (에뮬레이터)

1. 에뮬레이터를 고르고 앱이 깔려 있으면 지운다(`adb -s <기기> uninstall libitum.duru.android`).
2. 번들 포함 APK를 빌드 · 설치한다([`apps/android/README.md`](../../apps/android/README.md)의 「APK 자산으로 실행」).

   ```sh
   pnpm bundle:android
   cd apps/android && ./gradlew :app:assembleBundled
   adb -s <기기> install -r app/build/outputs/apk/bundled/app-bundled.apk
   ```

3. 관찰을 켠다. 프록시 / tcpdump는 iOS와 같다. 기기 로그(보조):

   ```sh
   adb -s <기기> logcat -c
   adb -s <기기> logcat -v time | grep -i -E 'facebook|fbsdk|MetaAppEvents|FATAL EXCEPTION|AndroidRuntime'
   ```

4. 앱을 실행한다: `adb -s <기기> shell am start -n libitum.duru.android/com.libitum.host.MainActivity`.
5. iOS A1의 5 · 6과 같은 흐름을 수행한다.
6. SDK가 시작되지 않았음을 호스트 쪽에서 직접 확인한다.
   - 자동 진입로가 닫혔는지(정적): 설치된 패키지에 **등록된 ContentProvider 가운데 `FacebookInitProvider`가 없다.**

     ```sh
     adb -s <기기> shell dumpsys package libitum.duru.android | grep -c 'FacebookInitProvider'
     ```

     `0`이어야 한다.

     ⟨2026-10-13 정정⟩ 처음 적은 기준은 `grep -i -E 'FacebookInitProvider|com.facebook.sdk'`의 출력이 없는 것이었다. **이 기준은 틀렸다** — 값이 없는 빌드에서도 출력이 있다. SDK의 BroadcastReceiver 둘(`com.facebook.CurrentAccessTokenExpirationBroadcastReceiver` · `com.facebook.AuthenticationTokenManager$CurrentAuthenticationTokenChangedBroadcastReceiver`)이 AAR에서 병합 매니페스트로 들어오고, 그 인텐트 필터의 액션 이름 `com.facebook.sdk.ACTION_CURRENT_ACCESS_TOKEN_CHANGED` · `com.facebook.sdk.ACTION_CURRENT_AUTHENTICATION_TOKEN_CHANGED`가 `com.facebook.sdk`에 걸린다. 이 수신자들은 등록만 돼 있을 뿐 SDK를 시작하지 않으며(비공개이고, 로그인 토큰용이다) 판정 대상이 아니다. 보는 것은 provider 하나다.
   - 계측 테스트 `MetaAppEventsHostTest`(N-A4)를 **값 없는 상태로** 돌려, `started()` · `FacebookSdk.isInitialized()`가 모두 `false`이고 `FacebookInitProvider`가 없음을 확인한다. 이 테스트는 debug 변형의 androidTest APK이므로 번들 서빙이 필요 없다. 앞 단계의 `bundled` APK와 서명이 달라 같은 패키지를 덮어쓰지 못하므로 먼저 지우고 debug를 새로 깐다 (관찰 5는 그 전에 끝낸다). 빌드 · 설치 · 실행 줄은 [`apps/android/README.md`의 「계측 `MetaAppEventsHostTest` 실행」](../../apps/android/README.md#계측-metaappeventshosttest-실행)에 있다.

     `OK (3 tests)`이어야 한다. 값이 없으니 단언이 `false == false`로 서는 것이므로, 그 판정이 「꺼짐」인 채 통과했음을 기록에 적는다.

### A 관찰 항목과 통과 기준

| id | 관찰 | 통과 기준 |
|---|---|---|
| A-1 | 앱이 평소처럼 뜬다 | 스플래시 → 첫 화면, 진입 흐름 완주, 유닛 완료까지 간다. 크래시 · 빨간 오류 화면 · 멈춤 없음. 화면이 이 변경 전과 같다 |
| A-2 | 새 시스템 팝업이 없다 | **첫 실행** 직후부터 흐름 끝까지 추적 허용(ATT) · 광고 ID · 알림 이외의 새 권한 대화상자가 뜨지 않는다. iOS에서 「Allow … to track」이 한 번도 뜨지 않는다. (알림 권한은 이 변경 전부터 있던 것이라 이번 판정 밖) |
| A-3 | Meta 도메인으로 요청 0건 | 앱 시작부터 재시작 뒤 여정 맵까지 `facebook.com` · `graph.facebook.com` · `ep*.facebook.com`으로의 요청 · DNS 조회 **0건**. 1건이라도 있으면 실패. 앱 단위 수단(「요청 관찰 수단」 5 · 6)을 쓰면 「앱이 연 연결 0」이 이것을 포함한다 — 대조군이 함께 있어야 한다 |
| A-4 | SDK 미시작 | iOS: N-I5에서 `isStarted == false`. Android: N-A4 세 단언 통과 + `dumpsys`의 등록된 provider에 `FacebookInitProvider` 없음(SDK의 BroadcastReceiver 둘은 있어도 된다 — A2의 6). 보조로 로그에 SDK 초기화 흔적 없음 |

**A-3의 한계.** 프록시 · DNS 관찰은 맥을 거친 트래픽만 본다. 앱이 프록시를 무시하는 직접 소켓이나 IP 직접 접속은 DNS 방식에서 놓친다. 패킷 캡처(`tcpdump`로 .pcap을 받아 대상 IP를 보는 것)도 TLS 안을 보지 못한다. 로그 방식은 SDK가 로그를 남기지 않으면 아무것도 안 보이므로 가장 약하다. 그래서 **A-4의 네이티브 테스트(시작 여부 직접 판정)와 A-3의 외부 관찰을 함께** 판정 근거로 삼는다.

### A 결과 기록

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| 2026-10-13 | `bc9d7185` | iOS 시뮬레이터 — iPhone 17 Pro, iOS 26.5, Release, 전용 시뮬레이터, 값 파일 없음 | **한계가 있는 통과** — A-1은 로그인 화면까지만(부분), A-2 · A-3 · A-4는 본 구간에서 통과. **흐름 완주는 미수행** | **A-1** 실행 · 로그인 화면 도달 · 종료 뒤 재시작이 됐고 크래시 · 오류 화면이 없었다. 로그인 이후(코드 검증 · 여정 · 유닛 완료)는 수행하지 않았다 — 로그인에 사람이 필요하다. 변경 전 빌드와 화면을 나란히 비교하지 않았다. **A-2** 첫 실행 ~ 로그인 화면 ~ 재시작 구간에 ATT · 그 밖의 시스템 팝업이 없었다(화면 캡처). **A-3** 수단 6 — Host 프로세스의 `lsof` · `nettop`을 여섯 시점(실행 +5초 · +13초 · +35초 · 로그인 화면 · 재시작 +3초 · +15초)에 찍어 소켓 0. 도구가 동작한다는 것은 맥의 `curl` 연결이 같은 도구에 잡히는 것으로 확인했다. ⚠ **앱 자체의 대조 요청은 없다** — 이 워크트리에 `.env.local`이 없어 앱이 다른 외부 요청도 내지 않은 것으로 추정한다. 순간 관찰이라 시점 사이의 짧은 연결은 놓칠 수 있다. **A-4** `HostTests/MetaAppEventsTests` 12건 통과 · skip 0(N-I5의 `isStarted == false`, N-I6의 추적 문구 없음 포함) |
| 2026-10-13 | `bc9d7185` | Android 에뮬레이터 — Pixel_8 AVD, API 37, `bundled`(R8), `-read-only`, 값 파일 없음 | **한계가 있는 통과** — A-1은 로그인 화면까지만(부분), A-2 · A-3 · A-4는 본 구간에서 통과. **흐름 완주는 미수행** | **A-1** 실행 · 로그인 화면 도달(Maestro) · 재시작이 됐고 크래시가 없었다. 로그인 이후는 수행하지 않았다. 변경 전 빌드와 비교하지 않았다. **A-2** 본 구간에 새 권한 대화상자가 없었다(화면 캡처). **A-3** 수단 5 — 앱 UID의 `dumpsys netstats detail` 통계 행 0(실행 전 0, 실행 45초 + 재시작 20초 뒤 0. 대조 UID는 34행) + 그 시점의 TCP 소켓 0. `mUidCounterSetMap`의 `uid=… set=1` 한 줄은 트래픽 행이 아니라 세지 않았다. 에뮬레이터 `-tcpdump` 캡처는 부팅 구간만 담겨 근거에서 뺐고, 프록시 로그는 대조군이 모자라 뺐다. **A-4** 계측 `MetaAppEventsHostTest` `OK (3 tests)` — 값이 없어 단언이 「꺼짐」(`false == false`)인 채 통과했다. 등록된 provider에 `FacebookInitProvider` 없음. ⚠ 처음 적힌 A2-6의 `grep` 기준(`com.facebook.sdk` 출력 없음)은 SDK의 BroadcastReceiver 인텐트 필터에 걸려 **출력이 있었다** — 기준이 틀린 것이라 절차를 정정했다 |

(근거 칸에는 A-1 ~ A-4 각각의 관찰, 쓴 관찰 수단, N-I5 · N-A4의 출력 요약을 적는다. 값은 적지 않는다.)

**이 회차가 닫지 못한 것.** ① 진입 흐름 완주와 유닛 완료까지의 구간 — 가입 완료 · 유닛 완료 시점에 요청이 없는지는 보지 않았다(값이 없으면 호스트 모듈이 등록되지 않아 JS가 부를 대상이 없다는 것은 자동 계층이 진다). ② 변경 전 빌드와의 화면 비교. ③ iOS의 앱 자체 대조 요청. ④ 실기. 다음 실행은 로그인할 수 있는 사람이 `.env.local`이 있는 워크트리에서 완주한다.

## B — 가짜 값 빌드 (선택)

**목적**: SDK가 실제로 시작되고 이벤트가 SDK까지 도달하는지, 그러면서 앱이 죽지 않는지 본다([ADR-0057](../adr/0057-meta-app-events.md) 「확인하지 못한 것」 3의 유일한 관찰 자리). 응답이 실패(잘못된 앱 ID)해도 된다 — 요청이 **나가는 것**이 관찰 대상이다.

### B1. 가짜 값 넣기

```sh
# 둘 다 같은 자리표시자 — 실제 값이 아니다
cp apps/ios/Config/Meta.local.xcconfig.example apps/ios/Config/Meta.local.xcconfig
#   META_APP_ID = 123
#   META_CLIENT_TOKEN = abc
cp apps/android/app/meta.properties.example apps/android/app/meta.properties
#   META_APP_ID=123
#   META_CLIENT_TOKEN=abc
```

앱 ID는 숫자만, 토큰은 공백 없는 한 덩어리여야 SDK가 선다(그렇지 않으면 A와 같이 꺼진다). 파일을 만들었으면 해당 플랫폼을 **다시 빌드 · 설치**한다(A1의 2, A2의 2). iOS는 값이 바뀌면 clean 빌드가 안전하다.

### B2. 관찰

「요청 관찰 수단」 1(프록시)을 쓴다. B는 요청이 **나가야** 하므로 로그만으로는 판정하지 않는다.

| id | 단계 | 통과 기준 |
|---|---|---|
| B-1 | 앱 실행 → 진입 흐름 완주 | 앱이 죽지 않는다. iOS에서 URL scheme이 없다는 이유로 SDK가 예외를 내지 않는다. iOS에서 추적 허용 팝업이 여전히 없다 |
| B-2 | 앱 시작 직후 | `graph.facebook.com`으로 요청이 **나간다**(앱 활성화 · 설정 조회 등. 응답은 4xx여도 된다). 이는 SDK가 시작된 증거다 |
| B-3 | 가입 완료 시점(여정 입장의 「여정 시작하기」) | 그 직후 `graph.facebook.com`(또는 `ep*.facebook.com`)으로 이벤트 전송 요청이 나간다. 이벤트는 SDK 안에서 묶음 전송되어 즉시 나가지 않을 수 있으니 앱을 홈으로 보냈다 되돌려 flush를 유도하고 몇 초 기다린다 |
| B-4 | 유닛 완료 시점 | B-3과 같은 방식으로 요청이 이어진다 |
| B-5 | Android: `MetaAppEventsHostTest` | 값이 있는 빌드에서 `started() == true` · `FacebookSdk.isInitialized() == true` · provider 없음. 실행 명령은 A2의 6과 같고 debug를 `meta.properties`가 있는 상태로 다시 빌드한 것이어야 한다 |

**B의 한계.** 요청 본문이 암호화되어 있고 SDK가 묶어 보내므로, 어떤 이벤트(`fb_mobile_complete_registration` · `fb_mobile_level_achieved`)가 실렸는지는 프록시가 TLS를 복호화해도 SDK 내부 형식이라 확인이 어렵다. B는 「SDK가 시작되고 요청이 나가며 앱이 죽지 않는다」까지만 판정한다. 이벤트 이름이 Meta에 찍히는지는 C가 진다.

### B3. 끝나면 값 파일 삭제

```sh
rm apps/ios/Config/Meta.local.xcconfig
rm apps/android/app/meta.properties
git status --short apps/ios/Config apps/android/app   # 아무것도 안 나와야 한다
```

값 파일을 지운 뒤에는 **다시 빌드해야** 값 없는 빌드로 돌아간다 — 지우고 곧바로 A를 이어 돌릴 때는 재빌드를 잊지 않는다.

### B 결과 기록

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| | | iOS 시뮬레이터 | **미실행** | |
| 2026-10-13 | `56365c01` | Android 에뮬레이터 (Pixel_8 AVD, API 37, debug, `-read-only`) | **부분 실행 — B-1 · B-2 · B-5만** | 가짜 값 `123` / `abc`. 계측 `MetaAppEventsHostTest` OK (3 tests) — 이번에는 「켜짐」인 채 통과(`started` · `FacebookSdk.isInitialized()`가 참, `FacebookInitProvider` 미등록). 앱 실행 30초 뒤 프로세스 생존, `FATAL EXCEPTION` 0건. 앱 UID의 netstats 통계 행 2(값 없는 빌드에서는 0 — 관찰 수단의 양성 대조). logcat에 `com.facebook.GraphResponse` HTTP 400 · `OAuthException`(가짜 앱 ID라 예상된 응답)과 `NativeProtocol`의 패키지 가시성 경고 1종. 진입 흐름 · 가입 완료 · 유닛 완료(B-3 · B-4)는 로그인이 필요해 **보지 않았다**. 끝난 뒤 `meta.properties` 삭제 확인 |

**주 — 이 표의 실행이 아닌 관찰이 하나 있다.** 구현 중(2026-10-13)에 iOS 시뮬레이터에서 가짜 값(`123` / `abc`) 빌드를 띄워 본 적이 있다: SDK가 시작됐고, URL scheme이 없다는 이유의 예외가 없었고, `ep2.facebook.com/v26.0/123/server_domain_infos`로 요청이 나갔다(B-1의 일부 · B-2에 해당 — 다만 호스트가 `graph.facebook.com`이 아니라 `ep2.facebook.com`이었다. B-2 · B-3의 통과 기준은 `ep*.facebook.com`도 받는 것으로 읽는다). 진입 흐름 · 가입 완료 · 유닛 완료(B-3 · B-4)는 보지 않았다. Android는 그때 가짜 값으로 빌드되고 `BuildConfig`에 값이 반영되는 것까지만 보았고, 기기 실행은 위 표의 2026-10-13 행에서 따로 했다. iOS의 이 관찰은 이 절차대로 돈 것이 아니므로 판정은 「미실행」으로 둔다.

## C — 실제 값으로 Meta 이벤트 관리자 수신 확인 (사용자 몫, 이번 범위 밖)

**실행하지 않는다.** 실제 앱 ID · 클라이언트 토큰은 사용자가 가지고 있고, 이 저장소의 에이전트 · 문서 · 로그 어디에도 적지 않는다. 절차만 둔다.

1. Meta 개발자 계정에서 앱을 만들고 앱 ID · 클라이언트 토큰을 받는다(앱 설정 → 고급 → 클라이언트 토큰). iOS는 번들 ID, Android는 패키지 이름 · 키 해시를 앱 설정에 등록한다.
2. 값을 B1의 로컬 값 파일에 넣고 다시 빌드 · 설치한다(파일은 추적되지 않는다. 커밋하지 않는다).
3. Meta **이벤트 관리자 → 테스트 이벤트**를 열어 둔다(SDK 이벤트는 수 분 늦게 올 수 있다).
4. 새 설치에서 진입 흐름을 「여정 시작하기」까지 가고(가입 완료), 여정의 메신저 유닛을 끝낸다.
5. 기대: 이벤트 관리자에 **설치 이벤트**와 `fb_mobile_complete_registration`(가입 완료), `fb_mobile_level_achieved`(유닛 완료)가 찍힌다. 파라미터 `fb_content_type` · `fb_level`이 계약대로 실리는지도 본다.
6. 함께 볼 것(미확인 항목 — 결과를 적는다): Android 11+에서 Meta 설치 리퍼러 조회에 `<queries>`가 필요한지, 자동 결제 이벤트가 실리는지(대시보드의 자동 인앱 구매 로깅을 끄는 안내는 [운영 안내](../meta-app-events.md#meta-이벤트-관리자에서-수신-확인)에 있다). 둘 다 [ADR-0057](../adr/0057-meta-app-events.md) 「확인하지 못한 것」 7 · 8이다.
7. 끝나면 로컬 값 파일을 지운다(B3).

| 날짜 | 커밋 | 기기 | 판정 | 근거 |
|---|---|---|---|---|
| | | | **미실행** | |

## 이 절차로 확인되지 않는 것

- 이벤트가 Meta 쪽에서 어떻게 집계 · 귀속되는지(C의 몫).
- 요청 본문에 무엇이 실렸는지(TLS · SDK 내부 형식).
- 실기, API 37 밖의 Android, 앱 심사 단계의 개인정보 선언(`docs/ios-privacy.md`가 진다).
- iOS ATT를 추가하는 후속 작업(이번 범위 밖 — 팝업 문구 · 사전 안내 화면은 그때 디자인이 정한다).
