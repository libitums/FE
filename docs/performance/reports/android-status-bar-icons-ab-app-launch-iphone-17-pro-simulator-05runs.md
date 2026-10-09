# Android 상태바 아이콘 표지 추가 전후 5회차씩 비교 — 앱 초기 로드 — iPhone 17 Pro 시뮬레이터

⚠ **이 파일은 [기록 규칙](README.md)의 「파일 하나는 실행 회차 하나」 · 「여러 회차를 한 파일에 합치지 않는다」에서 벗어나
있습니다.** 한 파일에 「직전 commit 5회차 · 대상 commit 5회차 · 준비 1회」 묶음을 **둘**, 모두 22번의 실행을 담았습니다.
README에는 기능 변경의 전후를 번갈아 잰 묶음에 대한 규정이 따로 있지 않습니다. 회차별 수치 표와 쌍별 차이를 한곳에 놓아야
비교가 읽히기 때문에 묶었고, 이름과 구성은 같은 브랜치의 직전 선례
([Android 푸시 토큰 갱신 연결 전후 5회차씩 비교](android-push-token-refresh-ab-app-launch-iphone-17-pro-simulator-05runs.md))를
따랐습니다. 그 선례도 같은 벗어남을 스스로 밝힌 파일이라 **이 파일을 정당화하지는 않습니다.** 이런 묶음을 규칙에 넣을지,
회차마다 파일을 나누게 할지는 저장소의 결정으로 남깁니다. 규칙에 맞춘 회차 하나짜리 기록은
[대상 commit 01회차](android-status-bar-icons-app-launch-iphone-17-pro-simulator-01.md)입니다.

⚠ **둘째 묶음은 계획에 없던 것입니다.** 계획은 선례와 같은 묶음 하나(5회차씩)였습니다. 첫째 묶음의 렌더 시간이 한쪽으로
기운 듯 보여(아래 「비교」), 그것이 실행 순서와 우연에서 온 것인지 보려고 같은 시뮬레이터에서 순서를 뒤집어 한 묶음을 더
쟀습니다. 결과를 보고 측정을 더한 것이므로 두 묶음을 모두 그대로 적고, 유리한 쪽만 고르지 않습니다.

## 실행 조건

- 측정 일시: 2026-10-06T08:00:59Z ~ 08:02:45Z(첫째 묶음) · 08:03:27Z ~ 08:05:10Z(둘째 묶음). 묶음마다 준비 1회 + 직전
  commit · 대상 commit 각 5회차를 번갈아 실행
- 상태: 측정 — Release Simulator Host를 새 시뮬레이터에 회차마다 새로 설치해 성능 캡처 모드로 실행하고, 초기 load의
  Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 시뮬레이터에서 이 변경 직전 commit의 번들도
  같은 Host에 넣어 같은 횟수로 쟀습니다.
- 기능 PR: 어두운 윗면을 가진 화면의 루트에 `data-statusbar` 표지를 달아 Android 호스트가 상태바 아이콘 색을 맞추게 한
  변경(이 보고서와 같은 PR, 작업 id `android-status-bar-appearance`)
- 대상 commit: `f6aae70e22807fddee636a379bf1c5f0d8c47bc8`
- 비교 commit: `84759d5c`(이 변경 직전). 두 commit 사이에 `apps/ios`와 lockfile 변경은 없고, 테스트를 뺀 `apps/mobile/src`
  변경은 아래 「이 변경이 무엇을 건드렸나」의 아홉 파일뿐입니다.
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기 하나, 두 묶음에 같이 썼고 측정 뒤 삭제)
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 내장 `main.lynx.bundle`;
  `--performance-capture --bundle-url=main.lynx`로 실행. Xcode 26.6(17F113). **Host는 대상 commit에서 한 번만 빌드했고**,
  비교 쪽은 그 `Host.app` 사본의 `main.lynx.bundle`만 직전 commit에서 빌드한 것으로 바꿨습니다(정적 자원 디렉터리는 두
  빌드가 바이트 단위로 같았습니다). 직전 commit의 번들은 임시 워크트리에서 빌드했습니다 — 같은 임시 워크트리에서 대상
  commit을 다시 빌드한 번들이 본 워크트리의 것과 바이트 단위로 같아, 빌드 위치가 번들을 바꾸지 않는 것은 확인했습니다.
- 번들 크기: 직전 1,388,505 bytes → 대상 1,389,146 bytes(+641 bytes)
- 실행 회차: 묶음마다 변형별 01 ~ 05, 그 앞에 준비 1회(첫째 묶음은 대상 commit, 둘째 묶음은 직전 commit)
- 측정 뒤의 변경: 대상 commit 뒤에 `apps/mobile/src`에서 테스트가 아닌 파일 둘이 한 번 더 바뀌었습니다(`6b3110c3` — 연속 학습
  모달의 장식 운석 하나를 상태바 아래로 내림). `screens/journey-map/JourneyStatModal.tsx`에 한 줄이 더해졌고(운석 c에만 인라인
  `top`을 safe area inset 값으로 줌), `screens/journey-map/journey-stat-modal.css`에서 그 운석의 `top: -17px` 선언 한 줄이 빠지고
  주석이 바뀌었습니다. 같은 구간의 나머지 `apps/mobile/src` 변경은 ui 테스트 파일 하나뿐이고(`git diff --stat f6aae70e HEAD --
  apps/mobile/src`의 세 파일), `apps/ios` · `packages` · lockfile 변경은 없습니다. 바뀐 코드는 로그인 뒤 탭 루트에서 연속 학습 칩을
  눌러야 서는 모달 안에서만 그려집니다 — 이 시나리오(로그인 전 초기 로드 → 온보딩 첫 스텝)의 관찰 구간에서는 그 모달이 그려지지
  않습니다. 번들에 실리는 것은 CSS 선언 한 줄이 빠지고 인라인 `style` 하나가 드는 것입니다. **그 commit으로는 다시 재지
  않았습니다.** 작업 기록은 그 변경 뒤의 번들을 1389.3 kB로 적고 있으나 이 기록이 직접 확인한 값이 아닙니다. 이 변경으로
  iOS에서도 그 운석의 자리가 바뀝니다(공유 JS · CSS) — 「iOS에서 사용자가 보는 동작은 바뀌지 않습니다」는 아래 서술은 대상
  commit까지의 것입니다.

## 시나리오

- 전제: 새로 만든 시뮬레이터에 앱을 처음 설치했습니다. 저장된 로그인 세션이 없어 스플래시가 끝나면 온보딩
  첫 스텝으로 갑니다.
- 단계: `pnpm bundle:host` → `pod install --deployment` → Release Host 빌드. 그 뒤 회차마다 `simctl uninstall` → 해당 변형의
  `Host.app` 설치 → 성능 캡처 모드로 실행하고 조작하지 않습니다. 9초 뒤 캡처 파일을 `performance:report` 분석기로 읽고
  Host를 종료합니다. `performance:capture:smoke`가 하는 순서와 같고, 그 명령은 수치를 출력하지 않아 같은 단계를 손으로
  밟았습니다.
- 순서(첫째 묶음): 부팅 직후의 첫 실행 하나(대상 commit)는 준비 회차로 두고 통계에서 뺐습니다. 이어서 「직전 → 대상」,
  「대상 → 직전」을 번갈아 5쌍(직전 · 대상 · 대상 · 직전 · 직전 · 대상 · 대상 · 직전 · 직전 · 대상) 실행했습니다.
- 순서(둘째 묶음): 첫째 묶음이 끝나고 약 40초 뒤, 시뮬레이터를 다시 부팅하지 않고 이어서 쟀습니다. 준비 회차 하나(직전
  commit)를 통계에서 빼고, 첫째 묶음을 뒤집은 순서(대상 · 직전 · 직전 · 대상 · 대상 · 직전 · 직전 · 대상 · 대상 · 직전)로
  실행했습니다. 두 묶음 모두 실행 간격은 약 10초입니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지와 그 직후 전역 Lynx 메모리 snapshot입니다. 9초 뒤 화면이 온보딩
  첫 스텝인 것은 첫째 묶음 두 변형의 5회차 스크린샷 한 장씩으로 확인했습니다(나머지 회차와 둘째 묶음의 스크린샷은 눈으로
  보지 않았습니다).

⚠ **이 시나리오는 표지가 달린 요소를 하나도 그리지 않습니다.** 로그인 전 초기 로드가 그리는 것은 스플래시와 온보딩이고
둘 다 표지 대상이 아닙니다(`SplashScreen.tsx` · `OnboardingScreen.tsx`에 `data-statusbar`가 없습니다). 표지가 달린 여덟 곳은
모두 로그인 뒤에 닿습니다 — 가장 이른 `JourneyEntryScreen`도 로그인 → 언어 선택의 `다음` 뒤에 쌓입니다
(`entry-wiring.ts`의 `onContinueLanguageSelect`). 시뮬레이터에서 로그인을 지날 수단이 없어 그 화면들은 실행되지 않았습니다.
이 캡처가 지나는 것은 이 변경이 **번들에 더한 641 bytes를 읽어 들이는 비용**뿐이고, 표지 속성을 요소에 싣는 비용은 이 기록
밖입니다.

## 이 변경이 무엇을 건드렸나

Android 호스트가 화면 트리에서 `data-statusbar="light-icons"` 표지를 찾아 상태바 아이콘을 밝게 · 어둡게 바꿉니다. 공유
JS에서 테스트를 빼고 바뀐 것은 아홉 파일입니다.

- `apps/mobile/src/lib/status-bar-icons.ts`(신규): 문자열 상수 하나(`lightStatusBarIcons = "light-icons"`)와 그 타입입니다.
  로직이 없습니다.
- 컴포넌트 여덟 파일: 위 상수의 import 한 줄과 요소 하나에 `data-statusbar={lightStatusBarIcons}` 속성 한 줄씩입니다.
  루트 요소에 단 것이 일곱(`EpisodeIntroScreen` · `EpisodeNarrativeScreen` · `EpisodeFinalScreen` · `VisualNovelScreen` ·
  `JourneyEntryScreen` · `JourneyStatModal` · `FirstUnitGuide`), 안내 스크림 요소에 단 것이 하나(`JourneyMapScreen`의
  `first-unit-map-scrim`)입니다. 훅 · 효과 · 상태 · 이벤트 리스너는 더해지지 않았습니다.

iOS 호스트는 이 속성을 읽지 않습니다(`apps/ios/Host` · `apps/ios/HostTests`에 dataset 키 `statusbar`를 읽는 코드가
없습니다). iOS에서 사용자가 보는 동작은 바뀌지 않습니다. 번들이 달라졌으므로 영향 시나리오로 **앱 실행(초기 로드)** 을
쟀습니다 — 다만 위 ⚠대로 이 시나리오는 바뀐 컴포넌트를 그리지 않습니다.

## 분석 결과

회차 번호는 묶음 안의 쌍 번호입니다. 각 실행의 캡처 레코드는 둘(Rendering entry 하나 · Memory snapshot 하나)이고 분석기는
22번 모두 종료 코드 0으로 끝났습니다.

### 첫째 묶음

대상 commit(`f6aae70e`):

| 회차 | 초기 `pipeline` | `parse` | `mtsRender` | `loadBackground` | `mainThreadRuntimeBytes` |
|---|---|---|---|---|---|
| 준비(통계 제외, 부팅 뒤 첫 실행) | 56.480 ms | 6.622 ms | 8.404 ms | 57.052 ms | 2,077,728 bytes |
| 01 | 52.464 ms | 6.757 ms | 8.480 ms | 23.365 ms | 2,077,536 bytes |
| 02 | 48.400 ms | 5.419 ms | 11.268 ms | 22.442 ms | 2,077,536 bytes |
| 03 | 44.008 ms | 4.266 ms | 6.998 ms | 20.070 ms | 2,077,536 bytes |
| 04 | 46.832 ms | 4.034 ms | 7.182 ms | 21.228 ms | 2,077,536 bytes |
| 05 | 44.934 ms | 8.564 ms | 6.647 ms | 19.887 ms | 2,077,536 bytes |

직전 commit(`84759d5c`):

| 회차 | 초기 `pipeline` | `parse` | `mtsRender` | `loadBackground` | `mainThreadRuntimeBytes` |
|---|---|---|---|---|---|
| 01 | 65.490 ms | 6.896 ms | 10.319 ms | 30.574 ms | 2,075,360 bytes |
| 02 | 39.455 ms | 4.004 ms | 6.683 ms | 20.811 ms | 2,075,360 bytes |
| 03 | 45.399 ms | 5.256 ms | 7.434 ms | 21.866 ms | 2,075,360 bytes |
| 04 | 37.871 ms | 3.627 ms | 5.938 ms | 18.921 ms | 2,075,360 bytes |
| 05 | 34.576 ms | 3.599 ms | 5.722 ms | 18.787 ms | 2,075,360 bytes |

### 둘째 묶음(순서를 뒤집음)

대상 commit(`f6aae70e`):

| 회차 | 초기 `pipeline` | `parse` | `mtsRender` | `loadBackground` | `mainThreadRuntimeBytes` |
|---|---|---|---|---|---|
| 01 | 36.936 ms | 3.665 ms | 5.757 ms | 19.585 ms | 2,077,536 bytes |
| 02 | 56.290 ms | 3.727 ms | 7.686 ms | 20.014 ms | 2,077,536 bytes |
| 03 | 34.937 ms | 3.499 ms | 5.593 ms | 18.920 ms | 2,077,536 bytes |
| 04 | 45.733 ms | 3.574 ms | 5.602 ms | 18.222 ms | 2,077,536 bytes |
| 05 | 35.521 ms | 3.670 ms | 5.925 ms | 18.889 ms | 2,077,536 bytes |

직전 commit(`84759d5c`):

| 회차 | 초기 `pipeline` | `parse` | `mtsRender` | `loadBackground` | `mainThreadRuntimeBytes` |
|---|---|---|---|---|---|
| 준비(통계 제외) | 54.427 ms | 5.020 ms | 7.496 ms | 19.928 ms | 2,075,360 bytes |
| 01 | 41.876 ms | 5.032 ms | 7.813 ms | 19.869 ms | 2,075,360 bytes |
| 02 | 48.191 ms | 4.450 ms | 6.605 ms | 19.711 ms | 2,075,360 bytes |
| 03 | 35.333 ms | 3.616 ms | 5.933 ms | 18.943 ms | 2,075,360 bytes |
| 04 | 47.160 ms | 4.721 ms | 10.983 ms | 21.578 ms | 2,075,360 bytes |
| 05 | 55.536 ms | 9.334 ms | 6.180 ms | 19.864 ms | 2,075,360 bytes |

### Memory snapshot

통계에 넣은 20번의 실행에서 Memory snapshot의 나머지 값은 변형 안에서 모든 회차가 같았습니다.

```text
대상  after-initial-load [complete]: totalBytes 2086848 bytes,
        elementBytes 6240 bytes, viewBytes 3072 bytes,
        mainThreadRuntimeBytes 2077536 bytes, backgroundThreadRuntimeBytes 0 bytes,
        elementNodeCount 6 nodes; instances 1/1; collection 0 ~ 1 ms
직전  after-initial-load [complete]: totalBytes 2084672 bytes,
        elementBytes 6240 bytes, viewBytes 3072 bytes,
        mainThreadRuntimeBytes 2075360 bytes, backgroundThreadRuntimeBytes 0 bytes,
        elementNodeCount 6 nodes; instances 1/1; collection 0 ~ 1 ms
```

**첫째 묶음의 준비 회차(부팅 뒤 첫 실행, 대상 commit)만 달랐습니다.** `mainThreadRuntimeBytes` 2,077,728 bytes(같은 번들의
다른 10번보다 192 bytes 큼), `viewBytes` 2,392,136 bytes, `totalBytes` 4,476,104 bytes, collection 2 ms였습니다. 둘째 묶음의
준비 회차(직전 commit, 부팅 뒤 열두 번째 실행)는 같은 번들의 다른 회차와 같았습니다.

`appBytes`는 회차마다 달랐습니다(첫째 묶음: 대상 48,826,648 ~ 49,088,744 bytes, 직전 48,679,168 ~ 49,301,736 bytes. 둘째 묶음:
대상 49,121,488 ~ 49,285,376 bytes, 직전 48,892,160 ~ 49,039,616 bytes).

## 비교

- 기준 기록: 이 보고서 안의 직전 commit 회차들입니다. 같은 시뮬레이터 · 같은 Host 바이너리이고 번들만 다릅니다.

초기 `pipeline`(묶음마다 5회차):

| 값 | 첫째 직전 | 첫째 대상 | 첫째 차이 | 둘째 직전 | 둘째 대상 | 둘째 차이 |
|---|---|---|---|---|---|---|
| 평균 | 44.558 ms | 47.328 ms | +2.769 ms | 45.619 ms | 41.883 ms | −3.736 ms |
| 중앙값 | 39.455 ms | 46.832 ms | +7.377 ms | 47.160 ms | 36.936 ms | −10.224 ms |
| 최소 ~ 최대 | 34.576 ~ 65.490 ms | 44.008 ~ 52.464 ms | — | 35.333 ~ 55.536 ms | 34.937 ~ 56.290 ms | — |
| 폭 | 30.914 ms | 8.456 ms | — | 20.203 ms | 21.353 ms | — |
| 표본표준편차 | 12.342 ms | 3.336 ms | — | 7.536 ms | 9.159 ms | — |

구간별 평균(괄호는 폭):

| 값 | 첫째 직전 | 첫째 대상 | 첫째 차이 | 둘째 직전 | 둘째 대상 | 둘째 차이 |
|---|---|---|---|---|---|---|
| `parse` | 4.676 ms(3.297) | 5.808 ms(4.530) | +1.132 ms | 5.431 ms(5.718) | 3.627 ms(0.228) | −1.804 ms |
| `mtsRender` | 7.219 ms(4.597) | 8.115 ms(4.621) | +0.896 ms | 7.503 ms(5.050) | 6.113 ms(2.093) | −1.390 ms |
| `loadBackground` | 22.192 ms(11.787) | 21.398 ms(3.478) | −0.793 ms | 19.993 ms(2.635) | 19.126 ms(1.792) | −0.867 ms |

메모리와 번들(두 묶음이 같음):

| 값 | 직전(`84759d5c`) | 대상(`f6aae70e`) | 차이(대상 − 직전) |
|---|---|---|---|
| 번들 크기 | 1,388,505 bytes | 1,389,146 bytes | +641 bytes |
| `mainThreadRuntimeBytes` | 2,075,360 bytes(준비 포함 11번 모두 같음) | 2,077,536 bytes(통계에 넣은 10번 모두 같음, 부팅 뒤 첫 실행만 +192) | +2,176 bytes |
| `totalBytes` | 2,084,672 bytes | 2,086,848 bytes | +2,176 bytes |
| `viewBytes` · `elementBytes` · `elementNodeCount` | 3,072 · 6,240 bytes · 6 nodes | 같음 | 0 |

- 번들: 641 bytes(약 0.05%) 큽니다. 빌드는 같은 commit에서 바이트 단위로 재현되므로 **이 차이는 잡음이 아니라 이 변경의
  크기입니다.** 상수 하나와 속성 여덟 개가 번들 안에서 각각 몇 바이트를 차지하는지는 뜯어보지 않았습니다.
- 메모리: `mainThreadRuntimeBytes`가 2,176 bytes(약 0.10%) 큽니다. **이 차이는 측정 잡음 밖으로 읽습니다.** 근거: 통계에 넣은
  20번에서 두 변형 모두 한 바이트도 흔들리지 않았고, 순서를 뒤집은 둘째 묶음에서도 같은 값이 나왔으며, 두 변형의 차이는
  번들뿐입니다. 이 값이 흔들린 유일한 실행은 부팅 뒤 첫 실행(+192 bytes)이고 차이는 그 11배입니다. `totalBytes`의 차이도
  전부 이 값입니다. **이 시나리오는 표지가 달린 컴포넌트를 그리지 않으므로** 이 2,176 bytes는 요소에 실린 속성이 아니라
  번들이 main thread runtime에 올려 둔 코드 · 정의 쪽에서 온 것으로 추정합니다 — 어느 부분인지는 확인하지 않았습니다.
- 렌더 시간: **차이는 측정 잡음 안입니다.** 근거는 넷입니다.
  - 두 묶음의 방향이 반대입니다. 초기 `pipeline` 평균 차이가 첫째 +2.769 ms, 둘째 −3.736 ms이고 중앙값 차이는
    +7.377 ms, −10.224 ms입니다. `parse` · `mtsRender`의 평균 차이도 묶음 사이에 부호가 뒤집혔습니다.
  - 차이가 같은 번들 안의 흔들림보다 작습니다. 같은 번들 5회차의 폭이 8.5 ~ 30.9 ms, 표본표준편차가 3.3 ~ 12.3 ms입니다.
  - 쌍별 차이(대상 − 직전)의 부호가 섞이고 크기가 평균의 몇 배입니다. 첫째 −13.026 · +8.945 · −1.391 · +8.961 ·
    +10.358 ms, 둘째 −4.940 · +8.099 · −0.396 · −1.427 · −20.015 ms.
  - 두 변형의 값 범위가 겹칩니다(두 묶음을 합치면 직전 34.576 ~ 65.490 ms, 대상 34.937 ~ 56.290 ms).
- 첫째 묶음만 보았다면 다르게 읽힐 수 있었습니다. 다섯 쌍 중 셋이 +9 ms 안팎이었고, 직전 commit의 01회차(65.490 ms, 준비
  회차 바로 다음 실행)를 빼면 직전 34.6 ~ 45.4 ms와 대상 44.0 ~ 52.5 ms가 거의 겹치지 않습니다. 둘째 묶음에서 이 모습은
  되풀이되지 않았습니다(대상 5회차 중 셋이 34.9 ~ 36.9 ms). 5회차 한 묶음이 방향을 말하지 못한다는 것을 이 두 묶음이
  보여 줍니다.
- 준비 회차는 두 묶음 모두 `pipeline`이 54 ~ 56 ms로 긴 편이었으나, 통계에 넣은 회차에도 그만큼 길거나 더 긴 값(65.490 ms ·
  56.290 ms · 55.536 ms)이 있습니다.
- 참고: [같은 commit 5회차 반복 측정](same-commit-variance-app-launch-iphone-17-pro-simulator-05runs.md)이 관측한 폭은
  12.640 ms였고, [직전 선례](android-push-token-refresh-ab-app-launch-iphone-17-pro-simulator-05runs.md)는 9.3 ~ 9.8 ms였습니다.
  이번 폭(8.5 ~ 30.9 ms)은 그보다 넓습니다. 이번 측정 중 같은 머신에서 다른 작업(다른 워크트리의 dev 서버 등)이 함께
  돌고 있었고 이를 통제하지 않았습니다 — 폭이 넓은 원인이 그것인지는 확인하지 않았습니다. 그 선례들이 원인을 모른다고 적은
  `viewBytes` 약 2.39 MB는 이번에 부팅 뒤 첫 실행에서 한 번 나왔습니다(2,392,136 bytes). 원인은 이번에도 확인하지 않았습니다.

## 해석

대상 commit의 10회차에서 초기 `pipeline`은 34.937 ~ 56.290 ms(평균 44.605 ms, 직전 commit 10회차 평균 45.089 ms), element
node는 6개(스플래시)였고, 첫 paint 직후 memory query는 Lynx 귀속 2,086,848 bytes를 반환했습니다(main thread runtime
2,077,536 bytes).

같은 시뮬레이터에서 번들만 바꿔 잰 직전 commit과 나란히 놓으면 번들이 641 bytes, main thread runtime이 2,176 bytes
늘었고 이는 이 변경에 귀속됩니다. 렌더 시간은 두 묶음의 차이가 서로 반대 방향이고 같은 번들 안의 흔들림보다 작아
**이 자료로는 이 변경이 초기 로드를 느리게 했는지 판정할 수 없습니다.** 이 자료가 말하는 것은 「회차 사이 흔들림(수십 ms
폭)을 넘는 차이는 보이지 않았다」까지이고, 수 ms 아래의 차이가 없다는 뜻은 아닙니다.

측정 한계는 다음과 같습니다.

- **표지가 달린 화면의 렌더는 재지 않았습니다.** 여덟 곳 모두 로그인 뒤 경로에 있고 이 시나리오는 거기에 닿지 않습니다.
  속성 하나를 요소에 싣는 비용, 그 화면들의 첫 렌더 시간 · 메모리는 이 기록에 없습니다. 이 시나리오가 잰 것은 번들
  증가분을 읽어 들이는 쪽뿐입니다.
- **Android 호스트의 비용은 재지 않았습니다.** 표지를 실제로 읽는 것은 Android 호스트이고(화면 트리를 걸어 dataset을
  읽습니다), 그 비용은 iOS 수집기의 범위 밖입니다. 작업 기록에는 Android 계측 테스트가 잰 값(여정 맵, 170 ~ 171 노드에서
  200회 평균 12 ~ 83 µs)이 있으나 **이 보고서가 잰 값이 아니고 iOS의 값도 아닙니다.**
- 변형마다 5회차씩 두 묶음입니다. 분포를 말하기에 적은 수이고, 표본표준편차는 폭을 가늠하는 값으로만 적었습니다. 둘째
  묶음은 첫째의 결과를 보고 더한 것입니다.
- 두 묶음은 같은 시뮬레이터의 한 부팅 안에서 이어 쟀습니다. 서로 독립된 세션이 아닙니다.
- 머신 부하를 통제하지 않았습니다. 회차 사이 폭이 선례보다 넓습니다.
- 비교 쪽은 직전 commit에서 Host를 다시 빌드하지 않고 번들만 바꿨습니다. 두 commit 사이에 `apps/ios` 변경이 없어 Host
  소스는 같지만, 직전 commit을 통째로 빌드한 산출물과 같다는 것을 따로 대조하지는 않았습니다.
- background 스레드 쪽은 이 캡처에 잡히지 않습니다. snapshot의 `backgroundThreadRuntimeBytes`는 두 변형 모두 0 bytes로
  보고됐습니다(이 수집기가 이 시점에 background runtime 메모리를 돌려주지 않습니다).

수치의 분산, 실제 기기 체감, Android에서의 결과(이 변경이 실제로 동작하는 플랫폼입니다), 다른 iOS · 기기에서의 결과를
일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace 미수집입니다. `pipeline`의 회차 사이 흔들림이 어느 구간에서 오는지는 Trace의 구간별 값을 봐야 갈립니다.
- fluency: 해당 없음 — 이 시나리오에 스크롤 · 전환이 없습니다.
- memory: 회차마다 `after-initial-load` 하나씩입니다. 표지가 달린 화면을 연 뒤의 snapshot은 없습니다. main thread
  runtime의 2,176 bytes가 번들의 어느 부분에서 오는지는 가르지 않았습니다.
- NativeModule: 이 변경은 공유 JS에서 NativeModule을 더하지 않았습니다. Android 호스트가 트리를 걷는 비용은 iOS 수집기의
  범위 밖이고 이 기록에서 재지 않았습니다.

## 결론과 후속

- 결론: 상태바 아이콘 표지가 들어간 대상 commit과 그 직전 commit의 iOS 초기 load를 같은 시뮬레이터에서 5회차씩 두 묶음
  수집했습니다. 번들은 641 bytes(1,388,505 → 1,389,146 bytes), main thread runtime은 2,176 bytes(2,075,360 →
  2,077,536 bytes) 늘었습니다. 초기 `pipeline` 평균 차이는 첫째 묶음 +2.769 ms, 순서를 뒤집은 둘째 묶음 −3.736 ms로
  방향이 뒤집혀 같은 번들 안의 흔들림 안이고, 이 시나리오는 표지가 달린 요소를 그리지 않습니다.
- 후속: 표지가 달린 화면의 렌더는 로그인 뒤 경로를 시뮬레이터에서 지날 수단이 생긴 뒤에 봅니다. Android 호스트 쪽 비용은
  Android 수집 경로가 생긴 뒤에 봅니다. 렌더 시간의 수 ms 차이를 가리려면 회차를 늘리고 머신 부하를 통제하거나 Trace로
  구간을 좁힙니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다.
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
