# 바텀 네비게이션을 ui-lynx로 옮긴 뒤 탭 전환 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-09-25T14:33:04Z
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 초기 load와 탭 전환의
  Rendering entry, 그리고 전환 직후 Memory snapshot을 **세 회차** 수집했습니다. 절대 배치
  여부만 가르는 비교 조건도 세 회차 따로 쟀습니다(아래 「분석 결과」).
- 기능 PR: 바텀 네비게이션을 피그마 디자인에 맞추고 앱이 ui-lynx `BottomNavigator`를 쓰도록
  바꾼 변경(이 보고서와 같은 PR)
- 대상 commit: `c1d1a13987ffff9ae4a8d5a9f4bdda4caf42b907`
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`; `--performance-capture`로 실행
- 실행 회차: 01 (같은 빌드 안에서 3회 반복)

## 시나리오

- 전제: 저장된 로그인 토큰이 없어 스플래시 뒤 온보딩으로 갑니다.
- 단계: `performance:capture -- start`로 Host를 실행하고, 온보딩 세 스텝 → 구글 로그인 →
  언어 선택 Continue → 여정 입장 Start로 여정 맵에 닿습니다. `report`로 보고하고 `stop`으로
  종료한 뒤, 같은 절차를 두 번 더 반복합니다.
- 관찰 구간: native `loadBundle` 시작부터 첫 paint까지, 그리고 `libitum:navigation:*` timing
  flag가 붙은 update pipeline과 그 직후 전역 Lynx 메모리 snapshot입니다.

## 이 변경이 무엇을 건드렸나

바텀 네비게이션의 시각을 피그마에 맞추고, 앱이 들고 있던 자체 구현을 ui-lynx
`BottomNavigator`로 갈아 끼웠습니다.

- 라벨을 걷고 아이콘만 남겼습니다. 이름은 `accessibility-label`로만 남습니다.
- 선택 표시가 지시선에서 주황 알약으로 바뀌었습니다. 항목 상자는 선택 여부와 무관하게
  64 × 48이라, 선택이 옮겨 가도 이웃 항목이 밀리지 않습니다.
- 앱의 `BottomNavigator`는 이제 `Tab` union을 ui-lynx의 문자열 id API로 옮기는 어댑터입니다.
- ui-lynx 계약에 `timingFlag`를 더했습니다. 성능 수집이 `libitum:navigation:<tab>`이 붙은
  update pipeline 뒤에서만 지표를 걷는데(ADR-0019), 옮기기 전 ui-lynx에는 그 통로가
  없었습니다. **이 보고서가 그 통로가 살아 있는지 보는 자리이기도 합니다.**
- 바를 흐름에서 빼 콘텐츠 **위에 겹칩니다**(절대 배치). 그래야 바 위쪽 모서리 밖으로
  콘텐츠가 비쳐 라운드가 드러납니다. 콘텐츠가 가리지 않도록 화면 열여섯 곳에 하단 여백
  68px을 더했습니다.

## 분석 결과

**timing flag 셋이 모두 섰습니다.** 첫 회차에서 `journey` · `roleplay` · `settings` 전환이
각자 이름이 붙은 update pipeline으로 잡혔습니다. 계약에 `timingFlag`를 더한 것이 실제
속성까지 가서 호스트가 읽었다는 뜻입니다 — 옮기는 과정에서 성능 수집이 끊기지 않았습니다.

여정 맵 전환(`libitum:navigation:journey`)의 `pipeline`입니다.

| 조건                           | 1회차(빌드 직후) | 2회차     | 3회차     |
| ------------------------------ | ---------------- | --------- | --------- |
| 이 PR (바가 절대 배치)         | 85.778 ms        | 45.714 ms | 46.897 ms |
| 비교 조건 (바를 흐름에 되돌림) | 90.236 ms        | 45.0 ms   | 46.719 ms |

**빌드 직후 첫 회차가 두 배 느립니다 — 두 조건 모두에서 같은 모양으로 재현됩니다.** 그 뒤
두 회차는 45~47 ms로 모입니다.

**절대 배치는 전환 비용을 바꾸지 않았습니다.** 두 조건의 안정 구간이 45.0~46.9 ms로
겹칩니다. 겹치기로 바꾸면 layout 계산이 달라질 수 있다고 보았는데, 실측은 그 걱정을 받쳐
주지 않습니다.

첫 회차의 전체 기록입니다.

```text
Rendering
  FCP loadBundle: lynxFcp 69.716 ms, fcp 70.238 ms
  LoadBundle loadBundle: loadBundle 8.187 ms, parse 1.893 ms, loadBackground 7.896 ms,
    pipeline 69.727 ms, mtsRender 2.913 ms, resolve 0.817 ms, layout 0.022 ms
  Pipeline updateTriggeredByBts (libitum:navigation:journey): pipeline 85.778 ms,
    mtsRender 1.799 ms, resolve 2.197 ms, layout 64.748 ms,
    paintingUiOperationExecute 4.5 ms, layoutUiOperationExecute 7.981 ms

Memory
  after-initial-load: totalBytes 3697832, viewBytes 2392136,
    mainThreadRuntimeBytes 1299456, elementNodeCount 6
  after-navigation-journey-01: totalBytes 1477520, viewBytes 52864,
    mainThreadRuntimeBytes 1345616, elementNodeCount 76
```

## 해석

**이 PR이 전환을 느리게 했는지 이 자료로는 판정할 수 없습니다.** 앞선 회차(이 PR의 초기
코드)에서 같은 전환이 19.108 ms였는데 지금은 45~47 ms입니다. 두 배가 넘는 차이지만, 그
사이에 바뀐 것이 여럿입니다 — 알약과 아이콘 크기, 화면 열여섯 곳의 하단 여백, 그리고 절대
배치. 절대 배치는 위 비교로 지웠지만 나머지 둘은 따로 재지 않았습니다. 가리려면 각 조건을
세 회차 이상 재야 하고, 이 보고서는 그 자료를 갖고 있지 않습니다.

**전환 pipeline의 흔들림 폭을 우리는 아직 모릅니다.** 같은 commit 다섯 회차를 잰 앞선
기록(`same-commit-variance-iphone-17-pro-simulator-01.md`)이 잰 것은 **초기 load**의 흔들림
(최솟값의 19.2%)이고, 전환 pipeline은 그 대상이 아니었습니다. 여기서 관측한 45 ↔ 90 ms는
그 폭을 한참 넘습니다. **그러므로 전환 숫자를 회차 하나로 견주는 일에는 지금까지 근거가
없었습니다** — 이 보고서의 표가 세 회차인 이유입니다.

**첫 회차가 느린 이유는 여기서 판정하지 않습니다.** 빌드 직후라는 것 말고 무엇이 다른지 이
자료가 말해 주지 않습니다. 다만 두 조건에서 같은 모양으로 재현되므로, **회차 하나만 재면 그
회차가 첫 회차인지에 따라 결론이 뒤집힙니다.**

메모리는 전환마다 화면이 갈려 element 수가 다르므로 snapshot을 서로 견주는 데 뜻이
없습니다. 다만 `after-initial-load`의 `viewBytes`가 2,392,136 bytes로, 앞선 회차의
3,072 bytes보다 세 자리 큽니다. 같은 값이 회차마다 그대로 재현됩니다. **무엇이 그렇게
만들었는지 이 보고서는 모릅니다** — 초기 load는 스플래시 화면이고 바가 서지 않는 구간이라
이 PR과 잇기 어렵습니다. 따로 볼 자리입니다.

## 결론과 후속

- ui-lynx로 옮긴 뒤에도 `libitum:navigation:*` 수집이 그대로 돕니다. 이 PR이 성능 측정
  체계를 깨지 않았습니다.
- 바를 절대 배치로 겹친 것은 전환 비용을 바꾸지 않았습니다 — 같은 빌드에서 조건만 갈라 각
  세 회차씩 재서 확인했습니다.
- **전환 pipeline의 흔들림 폭을 따로 재야 합니다.** 초기 load만 재 둔 탓에 전환 숫자를 견줄
  기준이 없습니다. 같은 commit 다섯 회차를 전환까지 포함해 재는 것이 다음 자리입니다.
- `after-initial-load`의 `viewBytes`가 세 자리 커진 것은 이 PR과 잇지 못했습니다. 언제부터
  그런지 이력을 따라가 봐야 합니다.

## 개인정보 점검

- [x] timing flag identifier(`libitum:navigation:journey` · `roleplay` · `settings`)가 사용자 ·
      콘텐츠 식별자가 아닌지 확인했습니다 — 탭 이름 셋뿐입니다.
- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값을 싣지 않았습니다.
