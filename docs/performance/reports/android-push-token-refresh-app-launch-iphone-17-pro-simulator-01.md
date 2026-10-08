# Android 푸시 토큰 갱신 연결 후 앱 초기 로드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-06T02:06:21Z
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다.
- 기능 PR: Android에서 FCM 토큰이 실행 중 바뀌면 조용히 다시 등록하고, 로그아웃이 이 실행에서 등록한 토큰 전부를
  해제하게 한 변경(이 보고서와 같은 PR, 작업 id `android-push-token-refresh`)
- 대상 commit: `bc9a091e08eb6eab3d956011bc531062ed3745bd`
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기, 측정 뒤 삭제)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`(1,388,212 bytes);
  `--performance-capture --bundle-url=main.lynx`로 실행. Xcode 26.6(17F113)
- 실행 회차: 01
- 측정 뒤의 변경: 대상 commit 뒤에 `apps/mobile/src/app/push-wiring.ts`가 한 번 더 바뀌었습니다(`7633d96e` — 등록이 성공한 뒤
  세션을 다시 읽어 사용자가 달라졌으면 그 등록을 해제). 더해진 코드는 `syncPushDevice` 안에서
  **호스트가 기기 토큰을 돌려준 뒤 — 세션과 기기가 둘 다 있을 때**(`push-wiring.ts:32` 다음)에만 닿습니다. 그 가운데 액세스 토큰과
  사용자를 잡아 두는 두 줄(`:34-35`)은 등록 RPC **전에**, 나머지(`:37-46`)는 RPC가 성공한 뒤에 돕니다. 이 시나리오(로그인 전
  초기 로드)에서는 함수가 불리더라도 첫 줄의 세션 확인(`:26`)에서 끝나 그 코드에 닿지 않고, 새로 import한 모듈은 이미 번들에 있던 것입니다. **그 commit으로는 다시 재지 않았습니다.** 작업
  기록은 그 변경으로 번들이 약 0.3 kB 늘었다고(1388.2 → 1388.5 kB) 적고 있으나 이 기록이 직접 확인한 값이 아닙니다.

## 시나리오

- 전제: 새로 만든 시뮬레이터에 앱을 새로 설치했습니다(직전 설치본을 `simctl uninstall`로 지운 뒤). 저장된 로그인 세션이 없어
  스플래시가 끝나면 온보딩 첫 스텝으로 갑니다.
- 단계: `pnpm bundle:host` → `pod install --deployment` → Release Host 빌드 → 설치 → 성능 캡처 모드로
  실행하고 조작하지 않습니다. 9초 뒤 캡처 파일을 `performance:report` 분석기로 읽고 Host를 종료합니다.
  `performance:capture:smoke`가 하는 순서와 같고, 그 명령은 수치를 출력하지 않아 같은 단계를 손으로 밟았습니다.
- 이 회차의 자리: 시뮬레이터 부팅 뒤 **세 번째 실행**입니다. 앞의 둘은 준비 실행 하나(대상 commit)와 직전 commit 번들의
  실행 하나이고, 이 회차는 [전후 5회차씩 비교](android-push-token-refresh-ab-app-launch-iphone-17-pro-simulator-05runs.md)의
  대상 commit 01회차와 같은 실행입니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 이 회차의 9초 뒤
  스크린샷은 눈으로 확인하지 않았습니다(같은 세션의 대상 commit 05회차 스크린샷이 온보딩 첫 스텝인 것은 확인했습니다).

⚠ **이 시나리오에서 토큰 갱신은 한 번도 일어나지 않고, 로그인 뒤 경로에도 닿지 않습니다.** iOS 호스트는
`pushTokenRefreshed` 이벤트를 보내지 않습니다. 시뮬레이터에서 로그인을 지날 수단이 없어 기기 등록(`syncPushDevice`의
등록 성공 분기)과 로그아웃(`forgetPushDevice`)도 실행되지 않습니다. 이 캡처가 지나는 것은 이 변경이 **초기 로드에 얹은
것**뿐입니다.

## 이 변경이 무엇을 건드렸나

Android 호스트가 FCM 토큰이 바뀌었다고 전역 이벤트로 알리면 공유 JS가 묻지 않고 다시 등록합니다. 대상 commit까지 공유
JS에서 바뀐 것은 세 파일입니다.

- `apps/mobile/src/app/use-push-token-refresh.ts`(신규): 훅 하나입니다. `useCallback` 하나와
  `useLynxGlobalEventListener("pushTokenRefreshed", …)` 하나를 부릅니다. 리스너는 이벤트를 받으면
  `syncPushDevice({ ask: false })`를 부릅니다.
- `apps/mobile/src/app/AppSession.tsx`: 그 훅을 부르는 한 줄입니다. `AppSession`은 첫 렌더부터 그려지므로 **이 시나리오가
  지나는 경로**입니다 — 첫 렌더에 훅 호출 하나, 전역 이벤트 리스너 등록 하나가 더해졌습니다.
  `useLynxGlobalEventListener`는 background 전용 훅이라 리스너 등록(`GlobalEventEmitter.addListener`)은 background
  스레드에서 일어납니다.
- `apps/mobile/src/app/push-wiring.ts`: 등록한 토큰을 값 하나(`string | null`)가 아니라 모듈 수준 `Set`으로 기억합니다.
  모듈이 평가될 때 빈 `Set` 하나가 만들어집니다. 등록 성공 때의 `add`와 로그아웃 때의 순회 · `clear`는 이 시나리오에서
  실행되지 않습니다.

iOS에서 사용자가 보는 동작은 바뀌지 않습니다. 번들에 코드가 더해졌고 첫 렌더에 훅이 하나 늘었으므로 영향 시나리오는
**앱 실행(초기 로드)** 입니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 32.156 ms, fcp 32.692 ms
  LoadBundle loadBundle: loadBundle 14.039 ms, parse 3.637 ms,
    loadBackground 13.937 ms, pipeline 32.162 ms, mtsRender 6.318 ms,
    resolve 1.092 ms, layout 0.125 ms,
    paintingUiOperationExecute 1.854 ms, layoutUiOperationExecute 0.21 ms

Memory
  after-initial-load [complete]: totalBytes 2084224 bytes,
    elementBytes 6240 bytes, viewBytes 3072 bytes,
    mainThreadRuntimeBytes 2074912 bytes, backgroundThreadRuntimeBytes 0 bytes,
    appBytes 49170688 bytes, elementNodeCount 6 nodes;
    instances 1/1; collection 1 ms
```

캡처 레코드는 둘(Rendering entry 하나 · Memory snapshot 하나)이고 분석기는 종료 코드 0으로 끝났습니다.

## 비교

- 이 파일은 회차 하나만 담습니다. 이 변경 직전 commit(`f4b35ef0`)과의 비교는 같은 세션에서 두 commit의 번들을 번갈아
  5회차씩 잰 [전후 5회차씩 비교](android-push-token-refresh-ab-app-launch-iphone-17-pro-simulator-05runs.md)에 있습니다.
  거기서 `mainThreadRuntimeBytes`는 직전 2,074,224 bytes → 대상 2,074,912 bytes(+688 bytes, 두 쪽 모두 회차 사이에 흔들리지
  않음)였고, 초기 `pipeline`의 평균 차이(+2.559 ms)는 같은 번들 안의 회차 사이 폭(9.3 ~ 9.8 ms)보다 작았습니다.
- 이 회차의 `pipeline` 32.162 ms는 그 비교에서 대상 commit 5회차 중 가장 작은 값입니다. 이 한 회차를 대표값으로 읽지
  않습니다.

## 해석

이 실행에서 초기 `pipeline`은 32.162 ms, `parse`는 3.637 ms였고 element node는 6개(스플래시)였습니다. 첫 paint 직후
memory query는 Lynx 귀속 2,084,224 bytes를 반환했고 그중 main thread runtime이 2,074,912 bytes입니다.

**단일 실행이라 이 기록만으로는 이 변경이 초기 로드를 느리게 했는지 · 메모리를 늘렸는지 판정할 수 없습니다.** 렌더 시간은
같은 commit에서도 10 ms 안팎으로 흔들리므로 한 회차의 `pipeline` 값은 방향을 말하지 않습니다.

측정 한계는 다음과 같습니다.

- **background 스레드 쪽 비용은 이 캡처에 잡히지 않았습니다.** 이 변경이 첫 렌더에 얹은 리스너 등록은 background
  스레드에서 일어나는데, snapshot의 `backgroundThreadRuntimeBytes`는 0 bytes로 보고됐습니다(이 수집기가 이 시점에 background
  runtime 메모리를 돌려주지 않습니다). 등록 한 번의 시간도 따로 재지 않았습니다.
- 로그인 뒤의 기기 등록, 로그아웃 때의 해제 순회, 토큰 갱신 이벤트 수신과 재등록(Android 전용)은 실행되지 않았습니다.
- 대상 commit 뒤의 `push-wiring.ts` 변경(`7633d96e`)이 든 번들은 재지 않았습니다.

수치의 분산, 실제 기기 체감, Android에서의 결과(이 변경이 실제로 동작하는 플랫폼입니다), 다른 iOS · 기기에서의 결과를
일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다.
- fluency: 해당 없음 — 이 시나리오에 스크롤 · 전환이 없습니다.
- memory: `after-initial-load` 하나뿐입니다. background runtime 메모리는 0 bytes로 보고돼 리스너 등록의 메모리 비용은 이
  기록 밖입니다. 토큰이 여러 번 바뀌어 `Set`이 자라는 경우의 잔류도 재지 않았습니다.
- NativeModule: 이 변경은 공유 JS에서 NativeModule을 더하지 않았습니다. 토큰 갱신 이벤트를 받은 뒤의 재등록(토큰 조회와
  등록 요청)은 iOS에서 일어나지 않고, Android에서의 비용은 재지 않았습니다(iOS 수집기의 범위 밖입니다).

## 결론과 후속

- 결론: 푸시 토큰 갱신 연결이 들어간 대상 commit에서 iOS 초기 load를 한 회차 수집했습니다(초기 `pipeline`
  32.162 ms · `mainThreadRuntimeBytes` 2,074,912 bytes). 이 변경의 영향은 이 한 회차로 판정되지 않으며, 직전 commit과의
  비교는 별도 기록에 있습니다.
- 후속: Android에서 토큰 갱신 → 재등록 왕복과 background runtime 쪽 비용은 Android 수집 경로가 생긴 뒤에 봅니다.
  `7633d96e`가 든 번들의 초기 로드는 다음 측정 때 함께 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
