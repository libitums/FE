# Android 푸시 토큰 갱신 연결 전후 5회차씩 비교 — 앱 초기 로드 — iPhone 17 Pro 시뮬레이터

⚠ **이 파일은 [기록 규칙](README.md)의 「파일 하나는 실행 회차 하나」 · 「여러 회차를 한 파일에 합치지 않는다」에서 벗어나
있습니다.** 한 파일에 직전 commit 5회차 · 대상 commit 5회차 · 준비 1회, 모두 11번의 실행을 담았습니다. README에는 기능 변경의
전후를 번갈아 잰 묶음에 대한 규정이 따로 있지 않습니다. 회차별 수치 표와 쌍별 차이를 한곳에 놓아야 비교가 읽히기 때문에
묶었고, 이름은 회차 수를 드러낸 [같은 commit 5회차 반복 측정](same-commit-variance-app-launch-iphone-17-pro-simulator-05runs.md)의
관례(`-05runs`)를 따랐습니다. 다만 그 기록은 「기능 변경을 재는 기록이 아니다」라고 밝힌 것이고 **이 파일은 기능 변경의 전후
비교라 성격이 다릅니다** — 그 선례가 이 파일을 정당화하지는 않습니다. 이런 묶음을 규칙에 넣을지, 회차마다 파일을 나누게 할지는
저장소의 결정으로 남깁니다. 규칙에 맞춘 회차 하나짜리 기록은
[대상 commit 01회차](android-push-token-refresh-app-launch-iphone-17-pro-simulator-01.md)입니다.

## 실행 조건

- 측정 일시: 2026-10-06T02:05Z ~ 02:08Z(준비 1회 + 직전 commit · 대상 commit 각 5회차를 한 세션에서 번갈아 실행)
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 회차마다 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 세션에서 이 변경 직전 commit의 번들도
  같은 Host에 넣어 같은 횟수로 쟀습니다.
- 기능 PR: Android에서 FCM 토큰이 실행 중 바뀌면 조용히 다시 등록하고, 로그아웃이 이 실행에서 등록한 토큰 전부를
  해제하게 한 변경(이 보고서와 같은 PR, 작업 id `android-push-token-refresh`)
- 대상 commit: `bc9a091e08eb6eab3d956011bc531062ed3745bd`
- 비교 commit: `f4b35ef0`(이 변경 직전). 두 commit 사이에 `apps/ios`와 lockfile 변경은 없고, 테스트를 뺀 `apps/mobile/src`
  변경은 아래 「이 변경이 무엇을 건드렸나」의 세 파일뿐입니다.
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기, 측정 뒤 삭제)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture --bundle-url=main.lynx`로 실행. Xcode 26.6(17F113). **Host는 대상 commit에서 한 번만 빌드했고**,
  비교 쪽은 그 `Host.app` 사본의 `main.lynx.bundle`만 직전 commit에서 빌드한 것으로 바꿨습니다(정적 자원 디렉터리는 두
  빌드가 바이트 단위로 같았습니다).
- 번들 크기: 직전 1,388,065 bytes → 대상 1,388,212 bytes(+147 bytes)
- 실행 회차: 변형마다 01 ~ 05, 그 앞에 준비 1회(대상 commit)
- 측정 뒤의 변경: 대상 commit 뒤에 `apps/mobile/src/app/push-wiring.ts`가 한 번 더 바뀌었습니다(`7633d96e` — 등록이 성공한 뒤
  세션을 다시 읽어 사용자가 달라졌으면 그 등록을 해제). 더해진 코드는 `syncPushDevice` 안에서
  **호스트가 기기 토큰을 돌려준 뒤 — 세션과 기기가 둘 다 있을 때**(`push-wiring.ts:32` 다음)에만 닿습니다. 그 가운데 액세스 토큰과
  사용자를 잡아 두는 두 줄(`:34-35`)은 등록 RPC **전에**, 나머지(`:37-46`)는 RPC가 성공한 뒤에 돕니다. 이 시나리오(로그인 전
  초기 로드)에서는 함수가 불리더라도 첫 줄의 세션 확인(`:26`)에서 끝나 그 코드에 닿지 않고, 새로 import한 모듈은 이미 번들에 있던 것입니다. **그 commit으로는 다시 재지 않았습니다** — 아래
  수치는 모두 `bc9a091e`와 `f4b35ef0`의 것입니다. 작업 기록은 그 변경으로 번들이 약 0.3 kB 늘었다고(1388.2 → 1388.5 kB)
  적고 있으나 이 기록이 직접 확인한 값이 아닙니다.

## 시나리오

- 전제: 새로 만든 시뮬레이터에 앱을 처음 설치했습니다. 저장된 로그인 세션이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다.
- 단계: `pnpm bundle:host` → `pod install --deployment` → Release Host 빌드. 그 뒤 회차마다 `simctl uninstall` → 해당 변형의
  `Host.app` 설치 → 성능 캡처 모드로 실행하고 조작하지 않습니다. 9초 뒤 캡처 파일을 `performance:report` 분석기로 읽고
  Host를 종료합니다. `performance:capture:smoke`가 하는 순서와 같고, 그 명령은 수치를 출력하지 않아 같은 단계를 손으로
  밟았습니다.
- 순서: 부팅 직후의 첫 실행 하나(대상 commit)는 준비 회차로 두고 통계에서 뺐습니다. 이어서 「직전 → 대상」, 「대상 → 직전」을
  번갈아 5쌍(직전 · 대상 · 대상 · 직전 · 직전 · 대상 · 대상 · 직전 · 직전 · 대상) 실행했습니다. 실행 간격은 약 10초입니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 9초 뒤 화면이 온보딩
  첫 스텝인 것은 두 변형의 5회차 스크린샷 한 장씩으로 확인했습니다(나머지 회차의 스크린샷은 눈으로 보지 않았습니다).

⚠ **이 시나리오에서 토큰 갱신은 한 번도 일어나지 않고, 로그인 뒤 경로에도 닿지 않습니다.** iOS 호스트는
`pushTokenRefreshed` 이벤트를 보내지 않습니다. 시뮬레이터에서 로그인을 지날 수단이 없어 기기 등록(`syncPushDevice`의
등록 성공 분기)과 로그아웃(`forgetPushDevice`)도 실행되지 않습니다. 이 캡처가 지나는 것은 이 변경이 **초기 로드에 얹은
것**뿐입니다.

## 이 변경이 무엇을 건드렸나

Android 호스트가 FCM 토큰이 바뀌었다고 전역 이벤트로 알리면 공유 JS가 묻지 않고 다시 등록합니다. 공유 JS에서 바뀐 것은
세 파일입니다.

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

회차 번호는 쌍의 번호입니다. 각 실행의 캡처 레코드는 둘(Rendering entry 하나 · Memory snapshot 하나)이고 분석기는
11번 모두 종료 코드 0으로 끝났습니다.

대상 commit(`bc9a091e`):

| 회차 | 초기 `pipeline` | `parse` | `mtsRender` | `loadBackground` | `mainThreadRuntimeBytes` |
|---|---|---|---|---|---|
| 준비(통계 제외) | 49.442 ms | 6.084 ms | 5.399 ms | 18.231 ms | 2,074,912 bytes |
| 01 | 32.162 ms | 3.637 ms | 6.318 ms | 13.937 ms | 2,074,912 bytes |
| 02 | 34.989 ms | 4.316 ms | 7.949 ms | 15.437 ms | 2,074,912 bytes |
| 03 | 32.387 ms | 4.369 ms | 5.749 ms | 13.707 ms | 2,074,912 bytes |
| 04 | 38.799 ms | 3.404 ms | 5.084 ms | 13.756 ms | 2,074,912 bytes |
| 05 | 41.418 ms | 3.108 ms | 4.583 ms | 12.420 ms | 2,074,912 bytes |

직전 commit(`f4b35ef0`):

| 회차 | 초기 `pipeline` | `parse` | `mtsRender` | `loadBackground` | `mainThreadRuntimeBytes` |
|---|---|---|---|---|---|
| 01 | 40.753 ms | 4.794 ms | 6.532 ms | 15.251 ms | 2,074,224 bytes |
| 02 | 32.255 ms | 4.043 ms | 5.809 ms | 13.574 ms | 2,074,224 bytes |
| 03 | 31.299 ms | 3.630 ms | 6.245 ms | 14.137 ms | 2,074,224 bytes |
| 04 | 30.942 ms | 3.776 ms | 5.467 ms | 13.143 ms | 2,074,224 bytes |
| 05 | 31.711 ms | 4.005 ms | 5.051 ms | 13.814 ms | 2,074,224 bytes |

Memory snapshot의 나머지 값은 변형 안에서 모든 회차가 같았습니다.

```text
대상  after-initial-load [complete]: totalBytes 2084224 bytes,
        elementBytes 6240 bytes, viewBytes 3072 bytes,
        mainThreadRuntimeBytes 2074912 bytes, backgroundThreadRuntimeBytes 0 bytes,
        elementNodeCount 6 nodes; instances 1/1; collection 0 ~ 1 ms
직전  after-initial-load [complete]: totalBytes 2083536 bytes,
        elementBytes 6240 bytes, viewBytes 3072 bytes,
        mainThreadRuntimeBytes 2074224 bytes, backgroundThreadRuntimeBytes 0 bytes,
        elementNodeCount 6 nodes; instances 1/1; collection 0 ~ 1 ms
```

`appBytes`는 회차마다 달랐습니다(대상 48,924,904 ~ 49,449,240 bytes, 직전 49,039,592 ~ 49,383,680 bytes).

## 비교

- 기준 기록: 이 보고서 안의 직전 commit 5회차입니다. 같은 세션 · 같은 시뮬레이터 · 같은 Host 바이너리이고 번들만 다릅니다.
  선례([Android 3버튼 하단 여백 수정 후 앱 초기 로드 — 01](android-tappable-inset-app-launch-iphone-17-pro-simulator-01.md))는
  다른 날의 단일 회차 기록과 비교했는데, 이번에는 그 날짜 · 시뮬레이터 차이를 없애려고 직전 commit을 다시 쟀습니다.

| 값(5회차) | 직전(`f4b35ef0`) | 대상(`bc9a091e`) | 차이(대상 − 직전) |
|---|---|---|---|
| 초기 `pipeline` 평균 | 33.392 ms | 35.951 ms | +2.559 ms |
| 초기 `pipeline` 중앙값 | 31.711 ms | 34.989 ms | +3.278 ms |
| 초기 `pipeline` 최소 ~ 최대(폭) | 30.942 ~ 40.753 ms(9.811 ms) | 32.162 ~ 41.418 ms(9.256 ms) | — |
| 초기 `pipeline` 표본표준편차 | 4.144 ms | 4.062 ms | — |
| `parse` 평균(폭) | 4.050 ms(1.164 ms) | 3.767 ms(1.261 ms) | −0.283 ms |
| `mtsRender` 평균(폭) | 5.821 ms(1.481 ms) | 5.937 ms(3.366 ms) | +0.116 ms |
| `loadBackground` 평균(폭) | 13.984 ms(2.108 ms) | 13.851 ms(3.017 ms) | −0.133 ms |
| `mainThreadRuntimeBytes` | 2,074,224 bytes(5회차 모두 같음) | 2,074,912 bytes(준비 포함 6번 모두 같음) | +688 bytes |
| `totalBytes` | 2,083,536 bytes | 2,084,224 bytes | +688 bytes |
| `viewBytes` · `elementBytes` · `elementNodeCount` | 3,072 · 6,240 bytes · 6 nodes | 같음 | 0 |

- 메모리: `mainThreadRuntimeBytes`가 688 bytes(약 0.03%) 큽니다. 두 변형 모두 회차 사이에 한 바이트도 흔들리지 않았고
  두 변형의 차이는 번들뿐이므로, **이 688 bytes는 이 변경에서 온 실제 차이로 읽습니다**(측정 잡음 밖). `totalBytes`의 차이도
  전부 이 값입니다.
- 렌더 시간: 초기 `pipeline` 평균이 2.559 ms, 중앙값이 3.278 ms 큽니다. **이 차이는 측정 잡음 안입니다.** 근거는 셋입니다.
  같은 번들 안에서 5회차의 폭이 9.3 ~ 9.8 ms, 표본표준편차가 약 4.1 ms로 차이보다 큽니다. 쌍별 차이(대상 − 직전)가
  −8.591 · +2.734 · +1.088 · +7.857 · +9.707 ms로 부호가 섞이고 크기가 평균의 몇 배입니다. 두 변형의 값 범위가 거의
  겹칩니다(30.9 ~ 40.8 대 32.2 ~ 41.4). 다섯 쌍 중 넷이 양수라는 것만으로 방향을 말하지 않습니다 — 표본이 5개입니다.
- 구간별: 메인 스레드에서 번들 코드를 실행하는 `parse` · `mtsRender`와 background 로드(`loadBackground`)의 평균 차이는
  모두 0.3 ms 아래이고 각 구간의 회차 사이 폭(1.2 ~ 3.4 ms)보다 작습니다. `pipeline` 평균의 차이는 이 구간들에서 오지
  않았습니다 — 대상 04 · 05회차는 `parse` · `mtsRender` · `loadBackground`가 그 변형에서 가장 작은 편인데 `pipeline`은 가장
  깁니다. 그 나머지 시간이 어디서 쓰였는지는 Trace 없이는 가릴 수 없습니다.
- 준비 회차(부팅 뒤 첫 실행)는 `pipeline` 49.442 ms로 뒤의 어느 회차보다 길었습니다. 통계에서 뺀 이유입니다. 직전 commit에는
  대응하는 준비 회차가 없습니다.
- 참고: [같은 commit 5회차 반복 측정](same-commit-variance-app-launch-iphone-17-pro-simulator-05runs.md)이 관측한 폭은
  12.640 ms였고 메모리는 흔들리지 않았습니다. 이번 두 묶음의 모습(폭 9 ~ 10 ms, 메모리 고정)이 그것과 어긋나지 않습니다.
  선례가 원인을 모른다고 적은 `viewBytes` 약 2.39 MB는 이번 11번의 실행에서 한 번도 나오지 않았습니다(모두 3,072 bytes).

## 해석

대상 commit의 5회차에서 초기 `pipeline`은 32.162 ~ 41.418 ms(평균 35.951 ms), element node는 6개(스플래시)였고, 첫 paint
직후 memory query는 Lynx 귀속 2,084,224 bytes를 반환했습니다(main thread runtime 2,074,912 bytes).

같은 세션에서 번들만 바꿔 잰 직전 commit과 나란히 놓으면 main thread runtime이 688 bytes 늘었고 이는 이 변경에 귀속됩니다.
렌더 시간의 차이(+2.6 ms)는 같은 번들 안의 흔들림보다 작아 **이 자료로는 이 변경이 초기 로드를 느리게 했는지 판정할 수
없습니다.** 수 ms 크기의 차이가 실제로 있는지 가리려면 회차가 훨씬 더 필요합니다.

측정 한계는 다음과 같습니다.

- 변형마다 5회차입니다. 분포를 말하기에 적은 수이고, 표본표준편차는 폭을 가늠하는 값으로만 적었습니다.
- **background 스레드 쪽 비용은 이 캡처에 잡히지 않았습니다.** 이 변경이 첫 렌더에 얹은 리스너 등록은 background
  스레드에서 일어나는데, snapshot의 `backgroundThreadRuntimeBytes`는 두 변형 모두 0 bytes로 보고됐습니다(이 수집기가 이
  시점에 background runtime 메모리를 돌려주지 않습니다). 등록 한 번의 시간도 따로 재지 않았습니다 — `loadBackground`
  평균은 차이가 없었지만 그 구간이 등록 시점을 포함하는지 확인하지 않았습니다.
- 비교 쪽은 직전 commit에서 Host를 다시 빌드하지 않고 번들만 바꿨습니다. 두 commit 사이에 `apps/ios` 변경이 없어 Host
  소스는 같지만, 직전 commit을 통째로 빌드한 산출물과 같다는 것을 따로 대조하지는 않았습니다.
- 로그인 뒤의 기기 등록, 로그아웃 때의 해제 순회, 토큰 갱신 이벤트 수신과 재등록(Android 전용)은 실행되지 않았습니다.

수치의 분산, 실제 기기 체감, Android에서의 결과(이 변경이 실제로 동작하는 플랫폼입니다), 다른 iOS · 기기에서의 결과를
일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. `pipeline`에서 `parse` · `mtsRender` · `loadBackground`로 설명되지 않는 흔들림이 어느 구간인지는
  Trace의 구간별 값을 봐야 갈립니다.
- fluency: 해당 없음 — 이 시나리오에 스크롤 · 전환이 없습니다.
- memory: 회차마다 `after-initial-load` 하나씩입니다. background runtime 메모리는 0 bytes로 보고돼 리스너 등록의 메모리
  비용은 이 기록 밖입니다. 토큰이 여러 번 바뀌어 `Set`이 자라는 경우의 잔류도 재지 않았습니다.
- NativeModule: 이 변경은 공유 JS에서 NativeModule을 더하지 않았습니다. 토큰 갱신 이벤트를 받은 뒤의 재등록(토큰 조회와
  등록 요청)은 iOS에서 일어나지 않고, Android에서의 비용은 재지 않았습니다(iOS 수집기의 범위 밖입니다).

## 결론과 후속

- 결론: 푸시 토큰 갱신 연결이 들어간 대상 commit과 그 직전 commit의 iOS 초기 load를 같은 세션에서 5회차씩 수집했습니다.
  main thread runtime은 688 bytes(2,074,224 → 2,074,912 bytes), 번들은 147 bytes 늘었습니다. 초기 `pipeline` 평균은
  33.392 → 35.951 ms이고 이 차이는 같은 번들 안의 흔들림(폭 9 ~ 10 ms) 안이라 방향을 말하지 않습니다.
- 후속: 렌더 시간의 수 ms 차이를 가리려면 회차를 늘리거나 Trace로 구간을 좁힙니다. Android에서 토큰 갱신 → 재등록
  왕복과 background runtime 쪽 비용은 Android 수집 경로가 생긴 뒤에 봅니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
