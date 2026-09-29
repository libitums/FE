# 에피소드 표지 유닛과 표지 게이트 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-29T03:24:57Z (1회차) · 03:25:17Z (2회차) · 03:25:36Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 여정 맵의 Rendering
  entry와 Memory snapshot을 세 회차 수집하고 기존 분석기로 검증했다.
- 기능 PR: 러닝 유닛을 타입에 맞게 정리하고 에피소드 표지를 맵 항목으로 세우는 변경
  (이 보고서와 같은 PR)
- 대상 commit: `be176701f922eee525503b163af54cc6656bb005`
- 기기: iPhone 17 Pro 시뮬레이터 (`3B5DADAD-597A-406C-AC83-26B3D3FADECB`)
- OS: iOS 26.5 (23F77) / macOS 26.5.1
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(1,132,069 bytes, SHA-256
  `7e5aaa9881c84d74cbb38e14247e4ec47da8fa981f13f28e3c2143a87ae7f02b`)
- 실행 회차: 01 (Host를 껐다 켜는 것으로 회차를 가른 3회)

**부팅된 시뮬레이터가 하나뿐인 상태에서 쟀다.** 캡처 CLI가 `booted`로 기기를 고르므로
같은 기종이 둘 이상 떠 있으면 **다른 기기의 파일을 읽는다** — 지난 회차(낱말 고르기)가
그 이유로 측정을 두 번 버렸다. 이번에는 재기 전에 `xcrun simctl list devices booted`로
하나임을 확인했고, 다른 둘(`conch-header` · `turban-onboarding-check`)은 사용자 승인을
받아 껐다.

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗(스텝 둘 완료)이고, **이번 변경으로 그 둘이 표지 게이트에 덮여 잠김으로 그려진다.**
  시스템 글자 크기는 기본이다.
- 단계: Host를 `--performance-capture`로 띄우고 8초 둔다. 맵의 **첫 항목인 에피소드
  표지**를 누르고(3초), 표지 화면의 `Skip`(2초) → 확인 모달의 `건너뛰기`를 누른 뒤
  4초 두고 캡처 파일을 분석기로 읽는다.
- 관찰 구간: `libitum:navigation:journey` timing flag가 붙은 update pipeline과 그 직후의
  전역 메모리 snapshot.

## 이 변경이 무엇을 건드렸나

- **맵의 항목이 아홉에서 열이 됐다.** 에피소드 표지가 구획의 첫 항목으로 서고, 그것을
  그리는 `EpisodeIntroMapItem`이 새로 생겼다 — 다른 특별 유닛 넷과 같은 어댑터이고
  아이콘만 `bookmark`다.
- **잠김 파생이 항목 종류 전부로 넓어졌다.** 전에는 최종 테스트만 `episodeFinalStatus`를
  거쳤고 스텝 노드·특별 유닛 셋은 삼항이었다. `mapItemStatus` 하나로 모이면서 맵이 매
  렌더에 항목마다 그 함수를 한 번 부른다 — **부르는 횟수가 1에서 10이 됐다.**
- **삼항 사슬이 `default` 없는 `switch`가 됐다.** 렌더 자체의 일은 같고 망라를 `tsc`가
  지게 된 것이라 런타임 비용은 바뀌지 않는다.
- 결선에서 표지 가로채기(`gate` · `startTarget` · `continueToTarget`)를 걷었다 —
  **맵 렌더 경로 밖**이라 아래 수치에 안 잡힌다.

## 분석 결과

여정 맵 진입의 update pipeline이다.

| 회차  | `lynxFcp`   | `fcp`       | `libitum:navigation:journey` |
| ----- | ----------- | ----------- | ---------------------------- |
| 1회차 | 101.245 ms  | 101.868 ms  | 39.113 ms                    |
| 2회차 | 129.716 ms  | 131.430 ms  | 63.303 ms                    |
| 3회차 | 145.094 ms  | 145.854 ms  | 42.316 ms                    |

같은 회차들의 단계별 값이다.

```text
libitum:navigation:journey
  1회차: mtsRender 2.177 / resolve 5.277 / layout 18.031 / paintingUiOperationExecute 7.449
  2회차: mtsRender 3.507 / resolve 7.948 / layout 26.398 / paintingUiOperationExecute 11.429
  3회차: mtsRender 2.300 / resolve 5.450 / layout 18.448 / paintingUiOperationExecute 7.794
```

메모리 snapshot은 **세 회차가 바이트까지 같다.**

```text
after-navigation-journey-01 [complete]
  totalBytes 2155312 / elementBytes 173680 / viewBytes 111360
  mainThreadRuntimeBytes 1870272 / elementNodeCount 167 nodes
```

## 노드가 열여섯 늘었다 — 항목 하나의 값이다

같은 화면·같은 시나리오 자리를 잰 지난 보고서
([`episode-prologue-call`](episode-prologue-call-iphone-17-pro-simulator-01.md),
commit `cd83b93`)와 나란히 둔다.

| | 그때 (항목 9) | 지금 (항목 10) | 차 |
| --- | --- | --- | --- |
| `elementNodeCount` | 151 | **167** | **+16** |
| `elementBytes` | 157,040 | 173,680 | +16,640 |
| `viewBytes` | 99,840 | 111,360 | +11,520 |

**항목 하나가 노드 열여섯이다.** `LearningUnit`의 링·안쪽 원·아이콘·배지와 그 아래
이름표까지 세면 다른 특별 유닛 항목과 같은 값이고, **표지가 특별히 무겁지 않다**는 뜻이다.
노드당 바이트도 그대로다(elementBytes/노드가 1,040으로 양쪽 같다).

⚠ **통제된 비교가 아니다.** commit이 다르고 그 사이에 다른 변경이 들어 있다. 같은 화면의
같은 자리라 방향과 크기는 읽을 수 있지만, **이 표를 회귀 판정으로 쓰면 안 된다.**

## 읽지 않는 것

- **`lynxFcp`가 101 → 130 → 145로 회차마다 커진 것**을 이 변경의 값으로 읽지 않는다.
  세 회차가 한 번도 안 겹치게 단조 증가하는 것은 부하가 아니라 **시뮬레이터가 데워지는
  방향의 반대**라 설명이 안 되고, 같은 빌드를 껐다 켠 것뿐이라 코드가 그 사이에 바뀌지
  않았다. 원인을 모르는 채로 남긴다 — 지어내지 않는다.
- **`mapItemStatus` 호출이 1회에서 10회가 된 것**이 위 수치의 어디에 얼마나 실렸는지
  이 캡처는 가르지 못한다. pipeline 전체값만 있고 파생 계산은 `mtsRender` 안에 섞인다.
  `mtsRender`가 2.2~3.5 ms로 지난 회차들과 같은 자릿수라 **눈에 띄는 값이 아니라는 것까지**가
  여기서 말할 수 있는 전부다.
- 예산 판정을 하지 않는다. 이 저장소에 성능 예산이 없다(ADR-0018 · 보류 표의 「성능 회귀
  예산」 행).

## 점검

- [x] 부팅된 시뮬레이터가 하나임을 재기 전에 확인했다 — 지난 회차가 이것으로 측정을
      두 번 버렸다.
- [x] 빌드된 `.app` 안의 `main.lynx.bundle` SHA-256이 `pnpm bundle:host`가 낸 것과 같다.
- [x] timing flag identifier(`libitum:navigation:journey`)가 사용자 · 콘텐츠 식별자가
      아닌지 확인했다 — 탭 이름뿐이다.
- [x] `미측정` 구간을 baseline이나 성능 통과로 표현하지 않았다.
- [x] 통제되지 않은 회차 간 비교를 회귀 판정으로 쓰지 않았다.
