# 바텀 네비게이션을 ui-lynx로 옮긴 뒤 탭 전환 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-25T11:21:46Z
- 상태: 측정 — Release Simulator Host를 새로 설치해 성능 캡처 모드로 실행하고, 초기 load와
  탭 전환 셋의 Rendering entry, 그리고 각 전환 직후 Memory snapshot을 수집했습니다.
- 기능 PR: 바텀 네비게이션을 피그마 디자인에 맞추고 앱이 ui-lynx `BottomNavigator`를 쓰도록
  바꾼 변경(이 보고서와 같은 PR)
- 대상 commit: `807de8e077022af08b43be61023dc8d601191cd6` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`; `--performance-capture`로 실행
- 실행 회차: 01

## 시나리오

- 전제: 앱을 새로 설치했습니다. 저장된 로그인 토큰이 없어 스플래시 뒤 온보딩으로 갑니다.
- 단계: `performance:capture -- start`로 Host를 실행하고, 온보딩 세 스텝 → 구글 로그인 →
  언어 선택 Continue → 여정 입장 Start로 여정 맵에 닿습니다. 그 다음 바텀 네비에서
  롤플레이 · 설정을 차례로 누릅니다. `report`로 보고하고 `stop`으로 종료합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지, 그리고 `libitum:navigation:*` timing
  flag가 붙은 update pipeline 셋과 그 직후 전역 Lynx 메모리 snapshot입니다.

## 이 변경이 무엇을 건드렸나

바텀 네비게이션의 시각을 피그마에 맞추고, 앱이 들고 있던 자체 구현을 ui-lynx
`BottomNavigator`로 갈아 끼웠습니다.

- 라벨을 걷고 아이콘만 남겼습니다. 이름은 `accessibility-label`로만 남습니다.
- 선택 표시가 지시선에서 주황 알약으로 바뀌었습니다. 항목 상자는 선택 여부와 무관하게
  58 × 40이라, 선택이 옮겨 가도 이웃 항목이 밀리지 않습니다.
- 앱의 `BottomNavigator`는 이제 `Tab` union을 ui-lynx의 문자열 id API로 옮기는 어댑터입니다.
  앱 쪽 CSS 파일은 지웠습니다.
- ui-lynx 계약에 `timingFlag`를 더했습니다. 성능 수집이 `libitum:navigation:<tab>`이 붙은
  update pipeline 뒤에서만 지표를 걷는데(ADR-0019), 옮기기 전 ui-lynx에는 그 통로가
  없었습니다. **이 보고서가 그 통로가 실제로 살아 있는지 보는 자리이기도 합니다.**
- ui-lynx 바에서 `position: fixed`를 걷었습니다. 바를 어디에 세울지는 셸이 정합니다.

측정 뒤에 치수를 세 번 더 고쳤습니다 — 바 세로 패딩 24 → 4px, 아이콘 상자 32 → 24px,
그리고 바가 설 때 셸이 두는 아래 여백을 홈 인디케이터 높이 대신 12px로. **이 회차는 그
셋을 반영하기 전 빌드입니다.** 셋 다 CSS 치수만 바꾸므로 element 수와 update 경로는 같지만,
그것이 지표가 같다는 증거는 아닙니다 — 여기 숫자를 그 뒤 코드의 값으로 읽으면 안 됩니다.

## 분석 결과

```text
Rendering
  FCP loadBundle: lynxFcp 104.495 ms, fcp 105.07 ms
  LoadBundle loadBundle: loadBundle 15.881 ms, parse 4.158 ms, loadBackground 11.437 ms,
    pipeline 104.507 ms, mtsRender 5.823 ms, resolve 1.58 ms, layout 0.148 ms,
    paintingUiOperationExecute 2.928 ms, layoutUiOperationExecute 0.269 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 19.108 ms,
    mtsRender 0.985 ms, resolve 2.304 ms, layout 8.848 ms
  Pipeline updateTriggeredByBts (libitum:navigation:roleplay): pipeline 11.19 ms,
    mtsRender 0.622 ms, resolve 2.965 ms, layout 2.287 ms
  Pipeline updateTriggeredByBts (libitum:navigation:settings): pipeline 9.225 ms,
    mtsRender 0.466 ms, resolve 1.621 ms, layout 2.104 ms

Memory
  after-initial-load: totalBytes 1307984, mainThreadRuntimeBytes 1298672, elementNodeCount 6
  after-navigation-journey-01: totalBytes 1520800, mainThreadRuntimeBytes 1390832, 75 nodes
  after-navigation-roleplay-01: totalBytes 1465792, mainThreadRuntimeBytes 1382832, 49 nodes
  after-navigation-settings-01: totalBytes 1475392, mainThreadRuntimeBytes 1387680, 50 nodes
```

**timing flag 셋이 모두 섰습니다.** `journey` · `roleplay` · `settings` 전환이 각자 이름이
붙은 update pipeline으로 잡혔습니다. 계약에 `timingFlag`를 더한 것이 실제 속성까지 가서
호스트가 읽었다는 뜻입니다 — 옮기는 과정에서 성능 수집이 조용히 끊기지 않았습니다.

전환 pipeline은 19.108 / 11.19 / 9.225 ms입니다. 첫 전환(`journey`)이 가장 큰 것은 여정 맵이
그 자리에서 처음 서기 때문이고, 그 안에서 layout이 8.848 ms로 가장 큰 몫입니다.

## 해석

**이 숫자로 「빨라졌다 · 느려졌다」를 말할 수 없습니다.** 같은 절차를 바꾸기 전 코드에서
재지 않았고 회차도 하나뿐입니다. 같은 commit을 다섯 번 잰 앞선 기록
(`same-commit-variance-iphone-17-pro-simulator-01.md`)에서 초기 `pipeline`의 흔들림 폭이
최솟값의 19.2%였으므로, 단일 회차 값은 그 폭 안에 있는지조차 이 자료만으로는 가릴 수 없습니다.

이 보고서가 실제로 짓는 것은 하나입니다 — **timing flag 통로가 살아 있다**는 것.
그 셋이 보고서에 나타났다는 사실 자체가 증거이고, 여기에는 비교 기준이 필요 없습니다.

메모리는 전환마다 화면이 갈려 element 수가 다르므로(75 / 49 / 50 nodes) 세 snapshot을 서로
견주는 데 뜻이 없습니다. 같은 화면끼리의 비교가 아니면 증거가 되지 않습니다.

바 자체가 무거워졌는지도 **판정할 수 없습니다.** 바는 세 전환 모두에서 같이 다시 그려지므로
전환 pipeline 안에 섞여 있고, 바만 떼어 낸 측정이 없습니다.

## 결론과 후속

- ui-lynx로 옮긴 뒤에도 `libitum:navigation:*` 수집이 그대로 돕니다. 이 PR이 성능 측정 체계를
  깨지 않았습니다.
- 바꾸기 전후 비교가 필요해지면 같은 절차를 main에서도 돌려 짝을 맞춰야 합니다. 지금은 그
  짝이 없으므로 이 회차를 기준선으로만 둡니다.
- 전환 pipeline의 layout 몫(첫 전환 8.848 ms)이 궁금해지면 여정 맵 쪽을 따로 재야 합니다 —
  바가 아니라 그 화면의 문제일 가능성이 큽니다.

## 개인정보 점검

- [x] timing flag identifier(`libitum:navigation:journey` · `roleplay` · `settings`)가 사용자 ·
      콘텐츠 식별자가 아닌지 확인했습니다 — 탭 이름 셋뿐입니다.
- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
