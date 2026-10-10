# 학습 듣기 화면의 아래 흐림 상자와 끝 상자 (있음 · 없음 대조) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-09T13:54:07Z ~ 13:56:08Z(캡처 레코드의 `capturedAt` 기준, 예비 회차 포함. 한국 시간 22:54 ~ 22:56)
- 상태: 측정 — Release Simulator Host를 이 측정 전용으로 새로 만든 시뮬레이터에 설치하고, 성능 캡처 모드로 **dev 서버의 playground 번들**(학습 듣기 `listening`)을
  읽혀 초기 load의 Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 세션에서 소스 한 줄을 바꿔 끼워 흐림 상자 · 끝 상자가 서는
  회차(A)와 서지 않는 회차(B)를 번갈아 각 3회 쟀습니다.
- 기능 PR: 스크롤 바 끄기와 학습 · 피드백 화면의 아래 흐림(작업 `hide-scrollbars`, [ADR-0055](../../adr/0055-scroll-bars-off.md)). 이 보고서와 같은 PR이며
  브랜치 `feat/scrollbar-and-learning-guides`에서 아직 열리지 않았습니다. 이 브랜치에는 작업 셋(`hide-scrollbars` · `learning-item-guides` ·
  `learning-shell-large-font`)의 커밋이 섞여 있습니다.
- 대상 commit: `aaa58aad878382c52b6a5d5d9671b203505008e9` — 측정 시점의 PR HEAD입니다. 측정하는 동안 브랜치 HEAD가 문서 커밋 하나(`a29eab17`)로
  움직였지만, 두 commit 사이에 `apps/mobile/src` · `apps/ios`의 변경은 0줄입니다(`git diff --stat`). 측정 뒤의 런타임 변경은 이 보고서를 쓴 시점까지 없습니다.
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기, 글자 크기 설정은 시작값 `large` 그대로)
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Host는 Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6 (17F113), 대상 commit의 일회용 사본 워크트리에서 빌드했습니다. 번들은 Host에
  내장된 `main.lynx`가 아니라 같은 사본의 `pnpm dev`(Rspeedy 개발 서버)가 내는 `playground.lynx.bundle`을 `--performance-capture`와 로컬 dev 서버 주소의
  `--bundle-url`로 읽었습니다. playground의 첫 화면(`apps/mobile/src/playground/current.ts`)은 사본 안에서만 `listening`으로 바꿨고 커밋하지 않았습니다.
  개발 서버는 다른 워크트리가 쓸 수 있는 3000 포트가 아니라 서버 로그가 고른 포트를 썼습니다. 형제 작업 `learning-item-guides`의 측정과 같은 Host · 같은
  시뮬레이터 · 같은 개발 서버로 이어서 했습니다([그 보고서](learning-item-guides-iphone-17-pro-simulator-01.md)).
- 실행 회차: 01 — 흐림 있음(A) 3회 · 없음(B) 3회를 한 기록에 둡니다(같은 세션 · 같은 기기에서 번갈아 잰 대조라 나누지 않았습니다). 예비 1회는 버렸습니다.

## 시나리오

- 전제: 시뮬레이터에서는 로그인을 지날 수단이 없어(소셜 로그인만 보이고 개발용 세션 주입이 없습니다) Release 내장 번들로는 학습 화면에 닿지 못합니다. 그래서
  dev 전용 playground로 실제 `ListeningScreen`을 학습 껍데기 안에 띄웠습니다. 첫 화면이 답하기 전 문항이라 액션 행이 없고, 이때 껍데기의 작업 영역 모드가
  `scroll-with-rest-fog`가 되어 아래 흐림 상자 · 끝 상자가 섭니다.
  - **A**: 대상 commit 그대로입니다.
  - **B**: 사본에서 `apps/mobile/src/screens/learning/learning-shell.contract.ts`의 `learningWorkspaceMode`가 `scroll-with-rest-fog` 대신 늘 `scroll`을
    돌려주게 한 줄을 바꿨습니다. 그 결과 흐림 상자 · 끝 상자만 빠지고 나머지 소스는 같습니다.
  - 회차마다 그 파일을 `git checkout --`으로 되돌린 뒤 B면 다시 바꾸고, 개발 서버가 다시 빌드할 시간(6초)을 둔 다음 앱을 새로 실행해 새 번들을 받았습니다.
    끝에 되돌렸고, 사본의 `git diff --stat`에 `current.ts`만 남은 것을 확인했습니다.
- 단계: 앱 종료 → (B면 한 줄 적용) → 성능 캡처 모드로 실행 → 조작 없이 12초 → 스크린샷 → 앱 컨테이너의 캡처 파일(시뮬레이터를 UDID로 짚음)을 복사해
  `performance:report` 분석기로 읽음 → 앱 종료. 순서는 예비(A) → A1 B1 A2 B2 A3 B3입니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지, 그 직후 전역 Lynx 메모리 snapshot, 그리고 `react_lynx_hydrate` pipeline입니다.
  - 이 화면의 `loadBundle` entry에는 학습 껍데기의 timing flag identifier `libitum:navigation:learning-listening`이 붙어 있습니다.
  - 그 flag의 pipeline이 따로 남지는 않았습니다.
- 조건이 실제로 갈렸는가:
  - A1 스크린샷에서 듣기 문항을 확인했습니다.
  - 기본 글꼴에서는 흐림 띠 안에 내용이 없어 흐림이 눈에 보이지 않는 것이 정상입니다. 그래서 갈림은 요소 수로 확인했습니다 — A는 세 회 모두 79, B는 세 회 모두
    76입니다(계약이 기대한 차이 3).

## 이 변경이 무엇을 건드렸나

작업 `hide-scrollbars`는 모든 `<scroll-view>` · `<list>`에 `scroll-bar-enable={false}`를 적고, 스크롤 바가 사라진 대신 학습 화면(답하기 전)과 피드백 화면의
작업 영역 아래에 흐림 상자를 세웠습니다. 학습 화면에는 끝 상자도 함께 섭니다.

이 대조의 A − B가 가르는 것은 **학습 듣기 화면의 흐림 상자 · 끝 상자 · `Fog`**뿐입니다. 스크롤 바 속성 값과 작업 영역 컴포넌트의 분리는 A · B 모두에
들어 있어 차이에 남지 않습니다.

## 분석 결과

모든 회차의 분석기 종료 코드는 0, 캡처 레코드는 셋(Rendering entry · Memory snapshot · `react_lynx_hydrate` pipeline), snapshot은 `complete`(instances 1/1)입니다.

| 회차 | `pipeline` | `parse` | `mtsRender` | `layout` | hydrate `pipeline` | `elementNodeCount` | `elementBytes` | `mainThreadRuntimeBytes` | `viewBytes` | `totalBytes` |
|---|---|---|---|---|---|---|---|---|---|---|
| 예비 A (설치 뒤 첫 실행 — 비교에서 뺌) | 112.889 ms | 4.306 ms | 25.017 ms | 19.971 ms | 5.719 ms | 79 | 82,160 | 7,099,088 | 40,192 | 7,221,440 |
| A1 | 84.325 ms | 3.852 ms | 25.821 ms | 13.466 ms | 3.068 ms | 79 | 82,160 | 7,099,088 | 40,192 | 7,221,440 |
| B1 | 71.037 ms | 2.883 ms | 21.619 ms | 11.874 ms | 3.216 ms | 76 | 79,040 | 7,092,576 | 37,504 | 7,209,120 |
| A2 | 46.683 ms | 3.038 ms | 21.948 ms | 11.49 ms | 3.004 ms | 79 | 82,160 | 7,099,088 | 40,192 | 7,221,440 |
| B2 | 96.674 ms | 3.752 ms | 23.442 ms | 11.713 ms | 3.284 ms | 76 | 79,040 | 7,092,576 | 37,504 | 7,209,120 |
| A3 | 92.031 ms | 3.146 ms | 23.578 ms | 12.275 ms | 3.151 ms | 79 | 82,160 | 7,099,088 | 40,192 | 7,221,440 |
| B3 | 91.207 ms | 3.203 ms | 22.604 ms | 11.715 ms | 20.728 ms | 76 | 79,040 | 7,092,768 | 37,504 | 7,209,312 |

`pipeline` · `parse` · `mtsRender` · `layout`은 `loadBundle` Rendering entry의 값입니다. 바이트 단위는 bytes입니다. `backgroundThreadRuntimeBytes`는
모든 회차가 0입니다.

A1 · B1의 분석기 출력(Rendering · Memory 구간만):

```text
A1
  FCP loadBundle: lynxFcp 84.322 ms, fcp 107.149 ms
  LoadBundle loadBundle: loadBundle 84.154 ms, parse 3.852 ms, loadBackground 52.351 ms, pipeline 84.325 ms, mtsRender 25.821 ms, resolve 1.276 ms, layout 13.466 ms, paintingUiOperationExecute 3.055 ms, layoutUiOperationExecute 1.037 ms
  Pipeline reactLynxHydrate (react_lynx_hydrate): pipeline 3.068 ms, mtsRender 0.084 ms, resolve 0.019 ms, layout 0 ms, paintingUiOperationExecute 0.044 ms, layoutUiOperationExecute 0.02 ms
  after-initial-load [complete]: totalBytes 7221440 bytes, elementBytes 82160 bytes, viewBytes 40192 bytes, mainThreadRuntimeBytes 7099088 bytes, backgroundThreadRuntimeBytes 0 bytes, elementNodeCount 79 nodes; status completed; instances 1/1; collection 4 ms
B1
  FCP loadBundle: lynxFcp 71.032 ms, fcp 101.146 ms
  LoadBundle loadBundle: loadBundle 70.844 ms, parse 2.883 ms, loadBackground 51.294 ms, pipeline 71.037 ms, mtsRender 21.619 ms, resolve 1.076 ms, layout 11.874 ms, paintingUiOperationExecute 3.03 ms, layoutUiOperationExecute 0.964 ms
  Pipeline reactLynxHydrate (react_lynx_hydrate): pipeline 3.216 ms, mtsRender 0.067 ms, resolve 0.017 ms, layout 0 ms, paintingUiOperationExecute 0.058 ms, layoutUiOperationExecute 0.013 ms
  after-initial-load [complete]: totalBytes 7209120 bytes, elementBytes 79040 bytes, viewBytes 37504 bytes, mainThreadRuntimeBytes 7092576 bytes, backgroundThreadRuntimeBytes 0 bytes, elementNodeCount 76 nodes; status completed; instances 1/1; collection 5 ms
```

## 비교

- 기준: 같은 세션 · 같은 Host · 같은 시뮬레이터 · 같은 dev 서버에서 한 줄만 바꿔 끼운 B 3회입니다. 저장소의 다른 보고서와는 견주지 않습니다(dev 번들 — 「해석」).
- **요소 · 바이트(A − B)**: 세 쌍 모두 같은 값이라 회차 흔들림이 아니고, 이 차이는 흐림 상자 · 끝 상자에 귀속합니다.
  - `elementNodeCount` +3(79 − 76).
  - `elementBytes` +3,120 bytes — 요소 하나에 1,040 bytes꼴입니다.
  - `viewBytes` +2,688 bytes.
- **`mainThreadRuntimeBytes`**: 첫 두 쌍은 +6,512 bytes입니다. 셋째 쌍만 B3이 192 bytes 커서(7,092,768) +6,320 bytes입니다. 그래서 `totalBytes`는
  +12,320 bytes(셋째 쌍 +12,128)입니다. 약 6.3 ~ 6.5 kB로 읽고, 192 bytes 흔들림의 원인은 확인하지 않았습니다.
- **렌더 시간 — `loadBundle` 쪽**: 네 항목 모두 A와 B의 폭이 겹칩니다. **회차가 적어 차이의 방향을 말하지 않습니다.**

  | 항목 | A | B |
  |---|---|---|
  | `pipeline` | 46.683 ~ 92.031 ms | 71.037 ~ 96.674 ms |
  | `parse` | 3.038 ~ 3.852 ms | 2.883 ~ 3.752 ms |
  | `mtsRender` | 21.948 ~ 25.821 ms | 21.619 ~ 23.442 ms |
  | `layout` | 11.49 ~ 13.466 ms | 11.713 ~ 11.874 ms |

  `pipeline`은 같은 쪽 안에서도 회차마다 크게 흔들렸습니다(A 46.7 ~ 92.0 ms). `loadBundle` 값과 `pipeline` 값이 크게 다른 회차도 있습니다(B3 49.537 대
  91.207 ms). 다만 이 보고서는 분석기의 `pipeline`을 그대로 옮겼습니다.
- **렌더 시간 — hydrate `pipeline`**: A 3.004 ~ 3.151 ms, B 3.216 ~ 20.728 ms로 폭이 겹치지 않습니다. 그래도 **방향을 말하지 않습니다.**
  - B3의 20.728 ms 한 회가 폭을 만들었습니다. 그 entry의 하위 단계(`mtsRender` 0.087 · `layout` 0.001 ms 등)는 다른 회차와 같은 크기라, 어디서 시간이 든 것인지
    이 자료로 보이지 않습니다.
  - 나머지 두 쌍의 차이는 0.3 ms 아래입니다.
  - 요소가 적은 쪽(B)이 더 오래 걸렸다는 방향을 설명할 근거도 없습니다.

## 해석

이 기록의 수치는 **dev 번들**에서 나왔습니다. dev 번들은 압축 · 최적화되지 않았고 HMR 런타임과 playground 셸이 얹혀 있어, 같은 화면을 Release 내장 번들로
띄운 값과 크기 · 시간이 다릅니다. 절대값을 다른 보고서의 앱 실행 수치와 나란히 놓지 않습니다. 쓸 수 있는 것은 같은 조건의 A − B 차이뿐입니다.

그 차이는 학습 듣기 첫 화면(답하기 전, 기본 글꼴)에서 요소 3개 · `elementBytes` 3,120 bytes · `viewBytes` 2,688 bytes · `mainThreadRuntimeBytes` 약
6.3 ~ 6.5 kB입니다. 세 요소가 계약이 기대한 흐림 상자 · 끝 상자 · `Fog`인지는 요소 수가 맞는다는 것까지만 봤고, 트리를 열어 이름으로 확인하지는 않았습니다
[추론]. 렌더 시간의 변화는 판정할 수 없습니다(「비교」).

이 기록의 한계:

- **B는 실제 이전 commit이 아닙니다.** 대상 commit에서 소스 한 줄을 바꿔 끼운 것입니다. 작업 전체(스크롤 바 속성 · 작업 영역 컴포넌트 분리 · 피드백의 흐림)와
  작업 이전 상태의 비교가 아닙니다.
- **피드백 화면은 미측정입니다.** playground에 피드백 픽스처가 없고, 더하면 `apps/mobile/src` 변경입니다. 학습의 흐림 상자와 같은 부품 · 같은 CSS 패턴이라 비용의
  성격이 같을 것으로 보지만 [추론], 재지 않았습니다.
- **스크롤 비용은 미측정입니다.** 수집기에는 초기 로드의 entry와 snapshot만 있고 스크롤 중 프레임 지표가 없습니다. 「스크롤 바를 그리지 않는다」의 비용과 흐림이
  선 채 스크롤할 때의 비용은 이 기록으로 말할 수 없습니다. 여정 맵도 재지 않았습니다(속성 값 하나의 차이라 초기 로드로는 갈리지 않습니다).
- **환경의 범위**: 기본 글꼴 한 조건 · 시뮬레이터 한 대 · 단일 세션 · 회차당 3회입니다. 큰 글꼴에서 껍데기가 한 스크롤로 합쳐지는 배치(작업
  `learning-shell-large-font`)는 이 조건에 서지 않았을 것으로 보이며 [추론], 그 배치에서의 흐림은 재지 않았습니다.
- **같은 번들의 다른 작업**: 형제 작업의 변경이 같은 번들에 있습니다. 학습 문항 안내는 듣기 화면에 서지 않습니다 [코드 `lib/learning-item-guide.ts`].
  `learning-shell-large-font`의 변경은 A · B 모두에 같이 들어 있어 차이에는 남지 않습니다 [추론].

수치의 분산, 실기 체감, Release 내장 번들에서의 값, Android에서의 결과를 일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지 않습니다.

## Trace 후속 확인

- render: Trace를 수집하지 않았습니다. 초기 load와 hydrate entry만 봤습니다.
- fluency: 미측정 — 조작 없는 초기 로드 시나리오이고 수집기에 스크롤 지표가 없습니다. 흐림이 선 작업 영역을 스크롤할 때의 프레임은 Trace로만 볼 수 있습니다.
- memory: `after-initial-load` 하나뿐입니다. 답한 뒤(흐림이 사라지는 시점)와 스크롤 중의 값은 재지 않았습니다.
- NativeModule: 해당 없음 — 이 변경은 NativeModule을 더하거나 바꾸지 않았습니다.

## 결론과 후속

- 결론: 대상 commit `aaa58aad`의 dev playground 학습 듣기 첫 화면 초기 로드를 iPhone 17 Pro 시뮬레이터에서 흐림 상자 · 끝 상자가 있을 때와 없을 때(소스 한 줄
  대조) 3회씩 수집했고, 요소 +3 · `elementBytes` +3,120 bytes · `viewBytes` +2,688 bytes가 세 쌍 모두 같게 나타났으며, `mainThreadRuntimeBytes`는 +6,512
  bytes(한 쌍 +6,320)였고, 렌더 시간은 방향을 말하지 않습니다.
- 후속: 피드백 화면 · 스크롤 중 프레임은 미측정으로 남습니다. 피드백 픽스처나 스크롤 지표가 생기면 같은 대조로 다시 잽니다. 정해진 일정은 없습니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다(dev 서버 주소 · 포트는 적지 않았습니다).
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다(`libitum:navigation:learning-listening` — 화면 이름입니다).
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
