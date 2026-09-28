# 낱말 고르기 화면 디자인 — 활동 둘을 잇는 스텝 — iPhone 17 Pro 시뮬레이터 — 01

> 상태: **측정.** 시뮬레이터 세 회차 기록이고 예산 판정이 아니다.

## 실행 조건

- 측정 일시: 2026-09-28T07:35:46Z (1회차) · 07:36:41Z (2회차) · 07:43:25Z (3회차)
- 상태: 측정 — Release Simulator Host를 성능 캡처 모드로 실행해 듣기 · 낱말 고르기
  두 학습 화면의 Rendering entry와 Memory snapshot을 세 회차 수집하고 기존 분석기로
  검증했다.
- 기능 PR: 낱말 고르기 화면에 Figma 65-327 디자인을 입히고, 그 화면에 닿는 길을
  여는 변경(이 보고서와 같은 PR)
- 대상 commit: `a6261a30f269bb98bc1f66b890e092ce80e66c4d` 위의 작업 트리
- 기기: iPhone 17 Pro 시뮬레이터
- OS: iOS 26.5 (23F77)
- Lynx SDK: 4.0.1 — 측정 Host의 `Podfile.lock` 고정값
- 빌드: Release / iphonesimulator, 내장 `main.lynx.bundle`(922,207 bytes, SHA-256
  `17d11d4f9039432e4ee6e99811d8e7cb1a4f89d549d4090a6a537e2d24ee9897`)
- 실행 회차: 01 (Host를 껐다 켜는 것으로 회차를 가른 3회)

## 시나리오

- 전제: 저장된 로그인 토큰이 있어 Host가 곧장 여정 맵으로 뜬다. 여정 진행은 제품의
  씨앗(스텝 둘 완료)이라 `이름 묻기`가 이미 done이고 시트가 열린다. 시스템 글자
  크기는 기본이다.
- 단계: Host를 `--performance-capture`로 띄우고 8초 둔다. `이름 묻기` 노드 → 시트의
  `시작`을 누른다. 에피소드 표지가 뜨면 `Skip` → `건너뛰기`로 지난다. 듣기 문항 셋을
  응답하고(각 3.5초 대기 — 자동 넘김 2.5초보다 길다) `결과 보기`를 누르면 **둘째
  활동인 낱말 고르기**가 선다. 첫 보기를 골라 판정 배지를 띄우고 캡처 파일을
  분석기로 읽는다.
- 관찰 구간: `libitum:navigation:learning-listening` · `libitum:navigation:learning-word-choice`
  timing flag가 붙은 update pipeline과 그 직후의 전역 메모리 snapshot.

**측정을 두 번 버렸다.** 같은 기종의 다른 시뮬레이터(`pleco-intro` ·
`turban-onboarding-check`)가 함께 떠 있던 회차가 있었고, 캡처 CLI가 `booted`로 기기를
고르므로 그때 읽은 파일이 **다른 기기의 것**이었다. 전부 끈 뒤 다시 쟀다. 아래 수치는
부팅된 시뮬레이터가 하나뿐인 상태에서 나온 것이다.

## 이 변경이 무엇을 건드렸나

- **보기가 행에서 칩으로 갈렸다.** 줄을 채우던 행 넷이 60×60 칩 넷이 가로로 서는
  한 줄이 됐다. 보기 안의 판정 표식(`<svg>` + 낱말)이 걷혀, 보기 하나가 지던 노드가
  줄었다.
- **판정이 무대 카드의 배지로 옮겨 갔다.** 듣기가 쓰던 조각을
  `components/AnswerVerdict`로 올려 두 화면이 같은 것을 쓴다 — 새로 그린 것이 아니라
  자리를 옮긴 것이라 번들에 더해진 코드가 없다.
- **이 화면에 닿는 길이 처음 생겼다.** `introduction` 스텝의 활동 목록이
  `["listening"]`에서 `["listening", "word-choice"]`가 됐고 그 스텝에 낱말 고르기
  문항 셋이 들어왔다. 그전까지 이 화면은 제품 경로에서 열리지 않았다.
- 죽은 코드 둘을 걷었다(`wordChoiceProgressLabel` · `questionProgressLabel`) —
  껍데기의 세션 헤더가 순번을 지게 되면서 참조가 0이 됐던 함수들이다.

## 분석 결과

학습 화면 둘의 update pipeline이다.

| 회차  | listening | word-choice |
| ----- | --------- | ----------- |
| 1회차 | 17.011 ms | 9.542 ms    |
| 2회차 | 19.431 ms | 9.532 ms    |
| 3회차 | 19.219 ms | 11.770 ms   |

같은 회차들의 단계별 값이다.

```text
libitum:navigation:learning-listening
  1회차: mtsRender 0.803 / resolve 3.028 / layout 3.735 / paintingUiOperationExecute 2.186
  2회차: mtsRender 0.573 / resolve 2.333 / layout 3.857 / paintingUiOperationExecute 2.211
  3회차: mtsRender 1.057 / resolve 3.070 / layout 3.157 / paintingUiOperationExecute 1.847

libitum:navigation:learning-word-choice
  1회차: mtsRender 0.720 / resolve 3.150 / layout 1.879 / paintingUiOperationExecute 1.607
  2회차: mtsRender 0.698 / resolve 2.827 / layout 1.924 / paintingUiOperationExecute 1.828
  3회차: mtsRender 0.709 / resolve 2.875 / layout 4.431 / paintingUiOperationExecute 1.735
```

메모리 snapshot이다. 세 회차 모두 같은 값이었다.

```text
after-navigation-learning-listening-01 [complete]:
  totalBytes 1629520, elementBytes 76960, viewBytes 36608,
  mainThreadRuntimeBytes 1515952, elementNodeCount 74 nodes

after-navigation-learning-word-choice-01 [complete]:
  totalBytes 1620464, elementBytes 65520, viewBytes 31744,
  mainThreadRuntimeBytes 1523200, elementNodeCount 63 nodes
```

**낱말 고르기가 듣기보다 가볍다** — 노드 11개(74 → 63), element 11,440 bytes,
view 4,864 bytes가 적다. 두 화면은 껍데기(상단 바 · 세션 헤더 · 지시문 · 무대 카드)를
문자 그대로 공유하므로 이 차이는 전부 카드 안과 작업 영역에서 난다: 듣기는 제시 채널에
재생 컨트롤 둘과 로마자 한 줄을 세우고 보기 넷이 각각 행이지만, 낱말 고르기는 제시문
`text` 요소 하나에 보기가 낱말 `text` 하나씩인 칩이다.

pipeline도 같은 방향이다(9.5~11.8 ms 대 17.0~19.4 ms). 갈리는 자리는 layout으로,
낱말 고르기가 1.9~4.4 ms인 데 비해 듣기는 3.2~3.9 ms다 — 다만 3회차의 4.431 ms가
듣기의 최솟값보다 크므로 이 차이를 layout 하나로 돌리지 않는다. 회차 셋의 폭이 좁지
않아 **순위만 말하고 배수는 말하지 않는다.**

보기를 고르는 구간(판정 배지가 뜨는 update)과 문항 사이 자동 넘김에는 timing flag가
없어 pipeline entry가 생기지 않았다. 그 값을 추정하거나 `0`으로 쓰지 않는다.

## 해석

**세 회차뿐이고 시뮬레이터 하나다.** 실기가 아니고 부하도 없으므로 이 수치는 예산
판정의 근거가 아니다. 회차 폭이 낱말 고르기에서 9.5~11.8 ms로 24% 벌어지는데 표본이
셋이라 그 폭이 잡음인지 구간인지 말할 수 없다 — 그래서 아래에서 순위만 말한다.

**「가볍다」가 「빨라졌다」는 아니다.** 낱말 고르기가 듣기보다 노드가 적고 pipeline이
짧은 것은 두 화면의 비교이지 이 변경의 전후 비교가 아니다. 이 화면은 전까지 제품
경로에서 열리지 않아 **비교할 전(前)이 없다.** 같은 이유로 보기에서 표식을 걷은 것이
몇 노드를 줄였는지도 이 자료로는 판정할 수 없다.

**측정되지 않은 구간이 둘이다.** 보기를 고를 때의 판정 배지 update와 문항 사이 자동
넘김에는 timing flag가 없어 entry가 없다. 필요해지면 그 자리에 flag를 붙여 따로 재야
한다.

같은 빌드에서 접근성 트리로 기하를 재고 눈으로 확인한 것은 다음과 같다.

- **칩이 디자인 치수 그대로다.** 보기 넷이 `(69,412,60×60)` `(137,…)` `(205,…)`
  `(273,…)`로, 60pt 정사각에 8pt 간격이고 줄이 가운데에 선다(69 + 4×60 + 3×8 = 333,
  남는 69가 양쪽으로 갈린다).
- **배지가 떠도 아래가 밀리지 않는다.** 처음 쟀을 때 제시문이 y348 → y352, 보기가
  y404 → y408로 **4pt 내려갔다** — 배지 자리(`min-height: spacing-32`)가 배지가
  실제로 차지하는 36보다 작아서였다. 듣기는 카드의 높이 예산이 그 4pt를 먹지만 이
  화면에는 그 예산이 없어 밖으로 나왔다. 자리를 `spacing-40`(디자인의 배지 높이)으로
  올린 뒤 다시 재니 제시문 y356 · 보기 y412로 **배지 유무와 무관하게 같았다.**
- **판정이 색 하나로 말하지 않는다.** 고른 칩은 테두리가 굵어지고(2px) 글자와 테두리가
  초록이 되며, 판정 자체는 카드의 배지가 아이콘 · 면 · 낱말 셋으로 말한다.
  보조기술에는 `학생, 정답`으로 읽힌다(WCAG 1.4.1).
- **활동 둘이 실제로 이어진다.** 듣기 셋을 마치고 `결과 보기`를 누르면 평가가 아니라
  낱말 고르기가 서고 순번이 `Lesson 1 / 3`으로 돌아간다. 낱말 고르기까지 마쳐야 학습
  결과 화면(`LESSON COMPLETE!`)에 닿는다. 시트의 활동 수도 `2/2 활동`으로 읽힌다.

**재지 못한 것 하나.** 칩의 `min-width`는 하한이라 긴 낱말에서는 폭이 늘어나야 하는데,
오늘 데이터의 낱말이 전부 2~3자라 **늘어나는 갈래가 한 번도 밟히지 않았다.** 3자
(`먹어요`)까지는 60pt 안에 들어가고 잘리지 않는 것을 확인했다. 4자 이상이 오는 날
`flex-wrap`과 함께 다시 봐야 한다.

## 결론과 후속

- 낱말 고르기 화면이 Figma 65-327대로 서고, 기기에서 칩 기하(60×60 · 8pt 간격 · 가운데
  정렬)와 배지 자리가 디자인과 같다.
- 배지가 뜰 때 아래가 4pt 밀리던 것은 배지 자리를 `spacing-40`으로 올려 0이 됐고,
  같은 빌드에서 다시 재서 확인했다.
- 활동 둘을 잇는 스텝이 제품에서 처음 돌았다. `learningFormAt`·`activityIndex`는
  2026-09-26에 들어왔지만 배정표가 전부 활동 하나였던 탓에 밟히지 않던 코드였고, 그
  경로를 통합 테스트 셋이 함께 짚는다.
- 후속 둘을 남긴다. (1) 칩이 낱말만큼 넓어지는 갈래가 아직 안 밟혔다 — 4자 이상
  낱말이 오는 날 `flex-wrap`과 함께 다시 본다. (2) 판정 배지 update와 자동 넘김
  구간에 timing flag가 없다. 둘 다 이 PR에서 하지 않는다 — 전자는 컨텐츠가, 후자는
  잴 이유가 아직 없다.
