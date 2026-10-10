# 학습 문항 안내가 뜬 전화 화면의 초기 로드 (안내 있음 · 없음 대조) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-10-09T13:47:40Z ~ 13:49:21Z(캡처 레코드의 `capturedAt` 기준, 예비 회차 포함. 한국 시간 22:47 ~ 22:49)
- 상태: 측정 — Release Simulator Host를 이 측정 전용으로 새로 만든 시뮬레이터에 설치하고, 성능 캡처 모드로 **dev 서버의 playground 번들**(전화 화면 `tutorial-call`)을
  읽혀 초기 load의 Rendering entry와 `after-initial-load` Memory snapshot을 수집했습니다. 같은 번들 · 같은 화면에서 **기기에 저장된 안내 기록만** 바꿔
  안내가 뜨는 회차(A)와 뜨지 않는 회차(B)를 번갈아 각 3회 쟀습니다.
- 기능 PR: 학습 문항 첫 열기 안내(작업 `learning-item-guides`, [ADR-0054](../../adr/0054-learning-item-guides.md)). 이 보고서와 같은 PR이며 브랜치
  `feat/scrollbar-and-learning-guides`에서 아직 열리지 않았습니다. 이 브랜치에는 작업 셋(`hide-scrollbars` · `learning-item-guides` ·
  `learning-shell-large-font`)의 커밋이 섞여 있습니다.
- 대상 commit: `aaa58aad878382c52b6a5d5d9671b203505008e9` — 측정 시점의 PR HEAD입니다. 측정하는 동안 브랜치 HEAD가 문서 커밋 하나(`a29eab17`)로
  움직였지만, 두 commit 사이에 `apps/mobile/src` · `apps/ios`의 변경은 0줄입니다(`git diff --stat`). 측정 뒤의 런타임 변경은 이 보고서를 쓴 시점까지 없습니다.
- 기기: iPhone 17 Pro 시뮬레이터(이 측정을 위해 새로 만든 기기, 글자 크기 설정은 시작값 `large` 그대로)
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값(`pod install --deployment`)
- 빌드: Host는 Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, Xcode 26.6 (17F113), 대상 commit의 일회용 사본 워크트리에서 빌드했습니다. 번들은 Host에
  내장된 `main.lynx`가 아니라 같은 사본의 `pnpm dev`(Rspeedy 개발 서버)가 내는 `playground.lynx.bundle`을 `--performance-capture`와 로컬 dev 서버 주소의
  `--bundle-url`로 읽었습니다. playground의 첫 화면(`apps/mobile/src/playground/current.ts`)은 사본 안에서만 `tutorial-call`로 바꿨고 커밋하지 않았습니다.
  개발 서버는 다른 워크트리가 쓸 수 있는 3000 포트가 아니라 서버 로그가 고른 포트를 썼습니다.
- 실행 회차: 01 — 안내 있음(A) 3회 · 안내 없음(B) 3회를 한 기록에 둡니다(같은 세션 · 같은 기기에서 번갈아 잰 대조라 나누지 않았습니다). 예비 1회는 버렸습니다.

## 시나리오

- 전제: 시뮬레이터에서는 로그인을 지날 수단이 없어(소셜 로그인만 보이고 개발용 세션 주입이 없습니다) Release 내장 번들로는 학습 화면에 닿지 못합니다. 그래서
  dev 전용 playground로 전화 화면을 첫 화면으로 띄웠습니다(같은 방식의 선례:
  [서사 배경 보고서](android-assets-narrative-background-iphone-17-pro-simulator-01.md)). 전화는 조건 없이 안내 대상이고, 안내를 띄울지는 기기 저장소의 키
  `libitum.libitum.learning-item-guides.seen`이 정합니다.
  - **A(안내 있음)**: 실행 전에 그 키를 `simctl spawn … defaults delete`로 지웁니다.
  - **B(안내 없음)**: 실행 전에 같은 키에 `["phone-call"]`을 `defaults write`로 심습니다.
- 단계: 앱 종료 → 기록 상태를 정함 → 성능 캡처 모드로 실행 → 조작 없이 12초 → 스크린샷 → 앱 컨테이너의 캡처 파일(`Library/Caches/LynxPerformance/capture.ndjson`,
  시뮬레이터를 UDID로 짚음)을 복사해 `performance:report` 분석기로 읽음 → 앱 종료. 순서는 예비(A) → A1 B1 A2 B2 A3 B3입니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지, 그 직후 전역 Lynx 메모리 snapshot, 그리고 수집기가 남긴 그 밖의 pipeline entry(A에만 있는
  `react_lynx_hydrate`)입니다.
- 조건이 실제로 갈렸는가: 12초 시점 스크린샷에서 **A 세 회 · 예비에는 안내가 떠 있고 B 세 회에는 없습니다.** 화면 네 모서리의 표본점 색이 A는 모두 RGB
  (71,72,74)(스크림), B는 모두 (250,247,244)(전화 화면의 바탕)입니다.
  - 기록을 심고 지운 방법(`simctl spawn … defaults`)은 앱이 아직 기록을 직접 쓴 적이 없는 상태에서만 듣습니다. 같은 세션 뒤에 한 e2e E18에서, 앱이 닫을 때 쓴
    기록은 앱 컨테이너의 plist에 들어가 이 방법으로 지워지지 않는다는 것이 드러났습니다
    ([학습 문항 안내 e2e](../../e2e/learning-item-guides.md) 「저장 기록 읽고 지우고 심기」).
  - 이 측정의 회차들에서는 안내를 한 번도 닫지 않았고, 위 스크린샷이 조건이 갈렸음을 보여 줍니다.

## 이 변경이 무엇을 건드렸나

대상 화면을 처음 열 때 안내 루트(스크림 · 글자 뒤 판 · 제목 · 설명 · 닫는 법 · 화살표)가 화면 위에 서고, 화면 루트의 `accessibility-elements-hidden`이 `true`가
됩니다. B는 같은 번들 · 같은 화면에서 그것들이 없습니다. 안내를 띄울지 정하는 훅은 화면이 설 때 **A · B 모두** 기기 저장소를 한 번 읽습니다(전화는 대상이라
기록이 있어도 읽습니다). B에서는 첫 렌더 뒤 벨(`ring_bell`)이 울리고 A에서는 안내가 그것을 막습니다. 이 측정 조건(대상 화면이 번들의 첫 화면)에서 안내가
첫 paint가 아니라 hydrate 때 서는 것으로 보인다는 점은 「해석」에 있습니다.

## 분석 결과

모든 회차의 분석기 종료 코드는 0, snapshot은 `complete`(instances 1/1)입니다. 캡처 레코드는 A 회차가 셋(Rendering entry · Memory snapshot ·
`react_lynx_hydrate` pipeline), B 회차가 둘(Rendering entry · Memory snapshot)입니다.

| 회차 | `pipeline` | `parse` | `mtsRender` | `layout` | hydrate `pipeline` | `elementNodeCount` | `elementBytes` | `mainThreadRuntimeBytes` | `viewBytes` | `totalBytes` | `appBytes` |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 예비 A (설치 뒤 첫 실행 — 비교에서 뺌) | 67.363 ms | 4.444 ms | 23.445 ms | 29.174 ms | 13.273 ms | 51 | 53,040 | 7,055,648 | 29,056 | 7,137,744 | 78,678,296 |
| A1 | 42.386 ms | 2.909 ms | 22.077 ms | 10.689 ms | 4.392 ms | 39 | 40,560 | 7,045,872 | 1,070,848 | 8,157,280 | 78,809,392 |
| B1 | 60.649 ms | 3.193 ms | 21.403 ms | 6.714 ms | 없음 | 39 | 40,560 | 7,045,872 | 1,070,848 | 8,157,280 | 86,608,176 |
| A2 | 36.882 ms | 3.096 ms | 21.291 ms | 6.201 ms | 3.6 ms | 39 | 40,560 | 7,045,872 | 1,070,848 | 8,157,280 | 78,809,368 |
| B2 | 39.584 ms | 3.367 ms | 21.894 ms | 7.64 ms | 없음 | 39 | 40,560 | 7,045,872 | 1,070,848 | 8,157,280 | 87,820,592 |
| A3 | 38.362 ms | 2.784 ms | 20.759 ms | 7.856 ms | 4.112 ms | 39 | 40,560 | 7,045,872 | 1,070,848 | 8,157,280 | 78,383,384 |
| B3 | 40.907 ms | 2.937 ms | 23.615 ms | 7.104 ms | 없음 | 39 | 40,560 | 7,045,872 | 1,070,848 | 8,157,280 | 87,427,376 |

`pipeline` · `parse` · `mtsRender` · `layout`은 `loadBundle` Rendering entry의 값입니다. 바이트 단위는 bytes입니다. `backgroundThreadRuntimeBytes`는
모든 회차가 0입니다. `appBytes`는 Lynx snapshot의 항목이 아니라 같은 snapshot 줄에 함께 찍히는 **앱 프로세스 전체**의 메모리입니다.

A1 · B1의 분석기 출력(Rendering · Memory 구간만, 줄 내용은 원문 그대로):

```text
A1
  FCP loadBundle: lynxFcp 42.382 ms, fcp 63.179 ms
  LoadBundle loadBundle: loadBundle 42.321 ms, parse 2.909 ms, loadBackground 56.209 ms, pipeline 42.386 ms, mtsRender 22.077 ms, resolve 0.894 ms, layout 10.689 ms, paintingUiOperationExecute 2.612 ms, layoutUiOperationExecute 1.068 ms; paintEnd 1791553689445.909 ms
  Pipeline reactLynxHydrate (react_lynx_hydrate): pipeline 4.392 ms, mtsRender 0.272 ms, resolve 0.298 ms, layout 1.568 ms, paintingUiOperationExecute 0.602 ms, layoutUiOperationExecute 0.059 ms; paintEnd 1791553689487.281 ms
  after-initial-load [complete]: totalBytes 8157280 bytes, elementBytes 40560 bytes, viewBytes 1070848 bytes, mainThreadRuntimeBytes 7045872 bytes, backgroundThreadRuntimeBytes 0 bytes, appBytes 78809392 bytes, elementNodeCount 39 nodes; status completed; instances 1/1; collection 1 ms
B1
  FCP loadBundle: lynxFcp 60.635 ms, fcp 80.345 ms
  LoadBundle loadBundle: loadBundle 38.045 ms, parse 3.193 ms, loadBackground 53.077 ms, pipeline 60.649 ms, mtsRender 21.403 ms, resolve 0.888 ms, layout 6.714 ms, paintingUiOperationExecute 2.392 ms, layoutUiOperationExecute 0.943 ms; paintEnd 1791553703626.977 ms
  after-initial-load [complete]: totalBytes 8157280 bytes, elementBytes 40560 bytes, viewBytes 1070848 bytes, mainThreadRuntimeBytes 7045872 bytes, backgroundThreadRuntimeBytes 0 bytes, appBytes 86608176 bytes, elementNodeCount 39 nodes; status completed; instances 1/1; collection 231 ms
```

이 보고서의 이전 판은 위 블록에서 `; paintEnd …`와 `appBytes …`를 말없이 뺐습니다. 지금은 원문대로 되돌렸습니다.

기록 순서와 수집 시간(캡처 레코드의 사실):

- A 세 회는 `capturedAt` 순서가 **`loadBundle` entry → Memory snapshot → `react_lynx_hydrate` pipeline**이고, 셋이 2 ~ 5 ms 안에 남았습니다. 예비 회차도 같은 순서입니다.
- A의 `paintEnd` 간격: `react_lynx_hydrate`의 `paintEnd`가 `loadBundle`의 `paintEnd`보다 A1 41.372 · A2 41.718 · A3 39.962 ms 뒤입니다(예비 31.069 ms).
- snapshot 수집 시간은 A 1 · 1 · 2 ms, B 231 · 189 · 180 ms입니다.

정적 크기: 대상 commit의 `main.lynx.bundle`(`pnpm bundle:host`가 `pnpm build`로 만든 Host 내장 번들)은 1,405,601 bytes이고, 측정 시점의
`devtools/bundle-size/budget.json` 상한은 1,412,000 bytes입니다. 위 회차가 읽은 dev 번들과는 다른 산출물입니다.

## 비교

- 기준: 같은 세션 · 같은 Host · 같은 시뮬레이터 · 같은 dev 번들에서 저장된 기록만 심은 B 3회입니다. 저장소의 다른 보고서와는 견주지 않습니다(dev 번들 —
  「해석」).
- **Lynx snapshot의 요소 · 바이트 항목은 A − B가 모두 0입니다.** `elementNodeCount` 39 · `elementBytes` 40,560 · `mainThreadRuntimeBytes` 7,045,872 ·
  `viewBytes` 1,070,848 · `totalBytes` 8,157,280 bytes가 여섯 회 모두 같습니다. 이 0을 「안내의 비용이 0」으로 읽지 않습니다 — 아래 「해석」.
- **앱 전체 메모리 `appBytes`는 B가 약 8 ~ 9 MB 큽니다 — 원인은 확인하지 않았습니다.** A 78,383,384 ~ 78,809,392 bytes, B 86,608,176 ~ 87,820,592 bytes로
  두 폭이 겹치지 않습니다(B의 최솟값 − A의 최댓값 7,798,784 bytes, B의 최댓값 − A의 최솟값 9,437,208 bytes). 시간 지표와 같은 원칙으로 3 대 3 · 단일 세션이라
  이것을 안내 · 벨 · 그 밖의 무엇의 효과로 단정하지 않습니다. 겹치지 않는다는 사실만 적습니다. 후보는 「해석」에 [추론]으로만 둡니다.
- **A에만 `react_lynx_hydrate` pipeline(3.6 ~ 4.392 ms)이 있고 B에는 그 entry가 없습니다.** 세 회 모두 그렇습니다.
- 렌더 시간: 네 항목 모두 A와 B의 폭이 겹칩니다. **회차가 적어 차이의 방향을 말하지 않습니다.**

  | 항목 | A | B |
  |---|---|---|
  | `pipeline` | 36.882 ~ 42.386 ms | 39.584 ~ 60.649 ms |
  | `parse` | 2.784 ~ 3.096 ms | 2.937 ~ 3.367 ms |
  | `mtsRender` | 20.759 ~ 22.077 ms | 21.403 ~ 23.615 ms |
  | `layout` | 6.201 ~ 10.689 ms | 6.714 ~ 7.64 ms |

  B1의 `pipeline` 60.649 ms가 B의 폭을 넓혔고, 그 회차의 `loadBundle`은 38.045 ms입니다.
- 예비 회차는 요소 51 · `viewBytes` 29,056 bytes로 다른 여섯 회와 다릅니다. 설치 뒤 첫 실행이라 미리 정한 대로 비교에서 뺐습니다.

## 해석

이 기록의 수치는 **dev 번들**에서 나왔습니다. dev 번들은 압축 · 최적화되지 않았고 HMR 런타임과 playground 셸이 얹혀 있어, 같은 화면을 Release 내장 번들로
띄운 값과 크기 · 시간이 다릅니다. 절대값을 다른 보고서의 앱 실행 수치와 나란히 놓지 않습니다. 쓸 수 있는 것은 같은 조건의 A − B 차이뿐입니다.

**요소 · 바이트 차 0의 해석 한계.** 12초 시점의 A 화면에는 안내가 떠 있었는데 `after-initial-load` snapshot의 Lynx 요소 · 바이트 항목
(`elementNodeCount` · `elementBytes` · `mainThreadRuntimeBytes` · `viewBytes` · `totalBytes`)은 B와 한 바이트도 다르지 않습니다.
그래서 **이 snapshot은 안내가 마운트되기 전에 찍힌 것으로 보입니다 [추론].** 근거는 셋입니다.

1. A의 snapshot이 `react_lynx_hydrate` pipeline보다 먼저 남았습니다 [캡처 레코드].
2. 그 hydrate entry는 A에만 있습니다 [캡처 레코드].
3. 안내를 띄울지는 훅의 `useState` 초기값이 저장소를 읽어 정합니다 [코드 `components/use-learning-item-guide.ts`].

첫 화면 렌더에서 그 판정이 어느 스레드의 어떤 값으로 나는지는 읽지 않았습니다. 그러므로 **이 기록은 안내가 첫 화면에 더하는 요소 수 · 메모리를 말할 수 없습니다.**
「0」은 측정 시점이 안내보다 앞섰다는 뜻일 수 있고, 안내가 공짜라는 증거가 아닙니다. A에만 있는 hydrate pipeline 3.6 ~ 4.392 ms가 안내를 그리는 갱신인지도 같은
추론에 기대며, entry의 내용을 갈라 보지는 않았습니다. B의 snapshot 수집이 180 ~ 231 ms 걸린 까닭도 확인하지 않았습니다(B에서는 첫 렌더 뒤 벨이 울립니다 —
관련이 있는지 모릅니다).

**그래서 이 대조의 A − B는 「안내가 첫 화면에 더하는 비용」이 아니라 「안내를 세우는 hydrate 한 번(약 4 ms)」으로 읽습니다 [추론].** 같은 근거에서,
**이 측정 조건에서는 안내가 첫 paint가 아니라 hydrate 때 서는 것으로 보입니다 [추론 — 훅이 `useState` 초기값에서 저장소를 읽음 · 요소 수 A = B ·
hydrate pipeline이 A에만].** A의 hydrate `paintEnd`는 첫 paint(`loadBundle`의 `paintEnd`)보다 39.962 ~ 41.718 ms 뒤입니다 [캡처 레코드]. 그러니 첫 프레임부터
그동안(수십 ms) 뒤 화면이 가림 없이 보일 수 있습니다 — **미확인**입니다. 스크린샷은 12초 시점 하나뿐이라 그 틈을 찍지 않았습니다. 이 순서는 대상 화면이
번들의 **첫 화면**인 이 playground 조건의 것이고, 학습 화면을 맵에서 여는 제품 경로에는 생기지 않는 것으로 봅니다 [추론 — 그 마운트는 background
thread의 갱신이라 저장소가 처음부터 읽힙니다]. 계약 판단은 [ADR-0054](../../adr/0054-learning-item-guides.md) 「미확인 · 후속」 12에 있습니다.

**앱 전체 메모리 `appBytes`의 차 — 원인 미확인.** Lynx 항목이 같은데 `appBytes`는 B가 A보다 약 8 ~ 9 MB 크고 두 폭이 겹치지 않습니다(「비교」). 이
기록은 그 원인을 가르지 못합니다. 후보는 추론으로만 적습니다.

- B의 snapshot 수집이 늦게 끝났습니다(B 180 ~ 231 ms 대 A 1 ~ 2 ms). 수집이 늦은 만큼 앱이 그 사이 더 많은 메모리를 잡은 뒤에 `appBytes`를 읽었을 수 있습니다 [추론].
- B에서만 첫 렌더 뒤 벨 effect가 네이티브 오디오를 부릅니다. 오디오 자원의 로드가 앱 메모리에 잡혔을 수 있습니다 [추론].

어느 쪽인지, 둘 다인지, 다른 것인지 확인하지 않았습니다. 이 차를 안내의 메모리 이득으로 읽지 않습니다.

예비 회차의 요소 51은 A · B 어느 쪽의 39와도 다릅니다. 그 12개가 안내의 서브트리인지는 **판정할 수 없습니다**. 한 회뿐이고, 설치 뒤 첫 실행이라 `viewBytes`도
29,056 bytes로 이상하며, 순서는 다른 A 회차와 같았습니다. 그래서 이 값을 안내의 비용으로 쓰지 않습니다.

이 대조가 계약상 처음부터 가르지 못하는 것:

- **동기 저장소 읽기 한 번의 비용** — 전화는 대상이라 A · B 모두 읽습니다. 갈라 재려면 구현 전 소스로 바꿔 끼워야 하고 계약이 요구하지 않았습니다.
- **벨 effect** — B에서만 첫 렌더 뒤 벨 effect가 네이티브 오디오를 부릅니다. 그 호출이 수집 구간에 걸리는지는 모릅니다.
- **종류 범위** — 전화 한 종류뿐입니다. 학습 셸을 쓰는 문장 만들기 · 말하기 · 쓰기와 메신저 · 비주얼 노벨은 재지 않았습니다.
- **닫는 순간** — 안내를 닫는 순간과 닫은 뒤의 재렌더는 재지 않았습니다(timing flag가 없습니다).
- **그 밖의 환경** — 로그인 뒤 제품 경로 · 실기 · Android입니다.

시뮬레이터 한 대 · 단일 세션 · 회차당 3회의 기록입니다. 수치의 분산, 실기 체감, Release 내장 번들에서의 값을 일반화하지 않으며 성능 통과 · 개선 · 회귀를 주장하지
않습니다.

## Trace 후속 확인

- render: Trace를 수집하지 않았습니다. 초기 load와 수집기가 남긴 hydrate entry만 봤습니다.
- fluency: 미측정 — 조작 없는 초기 로드 시나리오입니다. 안내를 닫는 탭과 그 뒤의 화면 전환은 이 캡처에 없습니다.
- memory: `after-initial-load` 하나뿐이고, 위 해석대로 안내가 마운트되기 전의 값으로 보입니다. 안내가 떠 있는 동안의 snapshot은 없습니다. `appBytes`의
  A · B 차(B가 약 8 ~ 9 MB 큼)는 Xcode Allocations 같은 도구로 보지 않았습니다.
- NativeModule: 저장소 읽기(`StorageModule`)는 A · B 모두에 있어 갈라지지 않습니다. 벨(`SoundEffectsModule`)은 B에만 있습니다. 둘 다 따로 재지 않았습니다.

## 결론과 후속

- 결론: 대상 commit `aaa58aad`의 dev playground 전화 화면 초기 로드를 iPhone 17 Pro 시뮬레이터에서 안내 있음 · 없음 3회씩 수집했습니다. Lynx snapshot의 요소 · 바이트
  항목은 여섯 회 모두 같았고(snapshot이 안내 마운트 전에 찍힌 것으로 보여 안내의 비용을 말할 수 없다), 앱 전체 메모리 `appBytes`는 B가 약 8 ~ 9 MB 커 폭이
  겹치지 않았으나 원인은 확인하지 않았습니다. A에만 hydrate pipeline 3.6 ~ 4.392 ms가 있고 — 안내를 세우는 갱신으로 읽습니다 [추론] — 렌더 시간은 폭이
  겹쳐 방향을 말하지 않습니다.
- 후속: 안내가 첫 화면에 더하는 요소 · 메모리를 재려면 안내가 마운트된 뒤의 snapshot이 필요합니다. 예를 들어 안내 화면에 timing flag를 다는 방법이 있는데, 그것은
  `apps/mobile/src` 변경이라 이 작업이 하지 않았습니다. 계약도 요구하지 않습니다. 할지는 root가 정합니다.
- 같은 세션에서 한 iOS 최소 확인(E18)은 [학습 문항 안내 e2e](../../e2e/learning-item-guides.md)에 있습니다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았습니다.
- [x] 로컬 절대 경로와 계정 이름을 제거했습니다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했습니다(dev 서버 주소 · 포트는 적지 않았습니다).
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했습니다(이 화면의 캡처에는 timing flag identifier가 없습니다).
- [x] 단일 측정을 baseline이나 성능 통과로 표현하지 않았습니다.
