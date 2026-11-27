# 답하면 흰 카드가 펼쳐짐(C안) — Android API 30 저사양 에뮬레이터 — 01

## 실행 조건

- 측정 일시: 2026-11-27T19:50:00+09:00
- 상태: 부분 측정 — 프레임 시간(`dumpsys gfxinfo`)과 화면 녹화만 모았다. Lynx Trace · 메모리는 수집하지 않았다
- 기능 PR: `feat/answer-card-expand`([ADR-0212](../../adr/0212-answer-card-expand.md))
- 대상 commit: 브랜치 `feat/answer-card-expand`의 기기 수정 반영본(`origin/main` `cfa994e9` 위에서 측정, 뒤에 `3b654f61` 위로 옮김 — 앱 코드 차이 없음)
- 기기: Android 에뮬레이터 AVD `R6_API30`(arm64, google_apis, RAM 2 GB, 코어 4), 1080 × 2340 · 440 dpi, 애니메이션 배율 1. 대조로 iOS 시뮬레이터 iPhone 17 Pro(iOS 26.5)에서 녹화만
- OS: Android 11 (API 30)
- Lynx SDK: 4.0.1
- 빌드: `assembleBundled`(release 설정 + debug 서명, 번들 내장). 번들은 측정용 임시 진입점(듣기 활동을 바로 세우는 화면 + 카드만 되풀이하는 화면)으로 지었고 저장소에 넣지 않았다. 효과음 · 문항 음성 모듈은 측정 중 가렸다
- 실행 회차: 01

## 시나리오

- (가) 실제 듣기 활동: 앱을 새로 띄우고 첫 문항의 정답 보기를 누른 뒤 2초 동안의 프레임(gfxinfo reset → 탭 → dump). C안 · A안(측정을 끈 임시 번들) 각 3회.
- (나) 카드 되풀이: 흰 카드(듣기 제시 + 보기 셋)를 1.2초마다 펼침 ↔ 닫힘으로 20번 되풀이하는 49초 동안의 프레임. C안 2회 · A안 1회 · 움직임 줄이기 1회.
- (다) 화면 녹화: `adb shell screenrecord` · `simctl io recordVideo`를 60fps로 풀어 카드 줄만 시간순으로 놓았다(가변 프레임 녹화라 간격은 참고만).

## 분석 결과

```text
(가) 실제 듣기 활동, 정답 한 번                 frames  janky   p90    p99   deadline missed
  C안 1                                          27      0 %     8 ms   9 ms   0
  C안 2                                          27      0 %     6 ms   11 ms  0
  C안 3                                          27      0 %     7 ms   11 ms  0
  A안 1                                          29      0 %     12 ms  16 ms  0
  A안 2                                          29      0 %     13 ms  14 ms  0
  A안 3                                          27      29.6 %  24 ms  40 ms  2

(나) 카드만 20번 되풀이(49초)
  C안 1                                          552     18.5 %  18 ms  22 ms  6
  C안 2                                          546     16.5 %  18 ms  30 ms  7
  A안                                            472     0 %     7 ms   11 ms  0
  움직임 줄이기                                   80      5.0 %   13 ms  21 ms  2
  (C안 두 회 모두 Missed Vsync 0 · Slow UI thread 0)
```

- 녹화: 두 플랫폼 모두 카드가 여러 프레임에 걸쳐 늘고 보기 버튼이 같은 동안 밀려 내려간 뒤 한글 → 로마자가 차례로 진해진다. 움직임 줄이기에서는 한 프레임에 다 선다.
  증거: `docs/e2e/evidence/android-answer-card-expand-frames.png` · `android-answer-card-expand-reduced-frames.png` · `ios-answer-card-expand-frames.png` · `ios-answer-card-expand-reduced-frames.png`
- 번들: `main.lynx.bundle` 5,857,121 → 5,866,888 bytes(+9,767, 같은 base `cfa994e9`에서 CI 설정으로 지음). 천장 6,180,000 안.

## 비교

- 기준 기록: 없음 — 같은 회차 안의 A안 · 움직임 줄이기가 대조다.
- (가)에서 C안은 세 번 모두 끊김 0이었다. A안 한 번의 끊김은 해설 판 · 보기 색 전환과 겹친 프레임으로 보이며, 카드 높이 전환 때문이 아니다.
- (나)에서 C안은 높이 전환 동안 프레임마다 다시 배치해 한 프레임이 18 ms 안팎으로 16.7 ms를 조금 넘는다. A안(높이 즉시)에는 이것이 없다.

## 해석

- 높이 전환은 Lynx가 매 프레임 레이아웃을 다시 하는 비용이 든다 — 카드만 되풀이할 때 약 17 %의 프레임이 예산을 1~2 ms 넘긴다. 그러나 Missed Vsync · Slow UI thread는 0이고, 실제 듣기 화면의 정답 한 번(3회)에서는 끊김이 관찰되지 않았다.
- 그래서 C안을 기본으로 둔다(ADR-0212 D5). 끊김 신고가 생기면 A안으로 내리는 길은 측정 실패 물러섬과 같은 단계(`fading`)라 코드가 이미 있다.
- 한계: 에뮬레이터(호스트 GPU)라 실기기 GPU · 열 조건과 다르다. 회차가 적다. 해설 판의 올라옴과 같은 시간대라 화면 전체 비용에서 카드 몫만 떼어 내지 못했다. Trace를 수집하지 않아 레이아웃 시간 자체는 모른다.

## Trace 후속 확인

- render: 해당 없음 — Trace를 수집하지 않았다.
- fluency: gfxinfo 백분위만 — 위 표.
- memory: 해당 없음 — 수집하지 않았다.
- NativeModule: 해당 없음 — 펼침은 호스트 모듈을 부르지 않는다(높이는 `layoutchange` 이벤트로 받는다).

## 결론과 후속

- 결론: 저사양 Android 에뮬레이터에서 C안은 실제 듣기 화면의 정답 한 번 동안 끊김 0(3/3)이고, 카드만 되풀이하면 프레임 약 17 %가 1~2 ms 넘는다. C안을 기본으로 유지한다.
- 후속: 실기기(저사양 Android)에서 같은 (가)를 한 번 더 재고, 끊김이 보이면 A안으로 내린다.

## 정제 확인

- [x] 원본 JSON/NDJSON 캡처를 포함하지 않았다.
- [x] 로컬 절대 경로와 계정 이름을 제거했다.
- [x] URL, NativeModule 파라미터, 사용자 콘텐츠를 제거하거나 일반화했다.
- [x] timing flag identifier가 사용자·콘텐츠 식별자가 아닌지 확인했다.
- [x] `미측정` 기록을 baseline이나 성능 통과로 표현하지 않았다.
