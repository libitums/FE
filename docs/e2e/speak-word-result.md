# 말하기 퀴즈 결과 시트 · 공용 마이크 (ADR-0201 D6 적용 1)

그림 보고 말하기(SPEAK_WORD)의 새 화면이 기기에서 그려지는지 확인하는 **수동 절차**다 — 공용 마이크(음량 막대 · 남은 시간 링 · `Listening…` ·
`Checking…`), 결과 시트 셋(perfect · close · 오답), 다른 음절 밑줄, 저절로 넘어가지 않음, 다시 말하기 한 번. 결정은
[ADR-0201](../adr/0201-spoken-answer-pronunciation-judge.md) 「D6 적용 1」, 시안은 말하기 개선 시안 S1 ~ S4.

| 이미 지는 층 | 무엇을 |
|---|---|
| unit | 음절 차이(`syllable-diff`) · 마이크 계산(음량 → 막대 · 링) · 결과 보기 모형 · 리듀서(다시 말하기 한 번) · 판정 뒤 조작 · 알림 문구 · `grade` 이벤트 |
| ui | 공용 마이크(국면 · 움직임 줄이기 · 8초 만료 · 권한 창 동안 시계 멈춤) · 활동(결과 시트 셋 · Continue · Try again → 두 번째 Continue · Next · 보고 한 번) |
| integration | 내장 `S6` 낱말 활동 — 정답 → Continue → PERFECT, 오답 → Next → 다시 도전 판 Continue |

## 전제

- 탐침 번들: `src/app/index.tsx`를 잠시 바꿔 결과 시트 셋 · 마이크 · 활동을 그리는 탐침을 띄운다(커밋하지 않음, 끝나면 `git diff` 0).
- iOS: iPhone 17 Pro 시뮬레이터(전용), Android: Pixel_8 읽기 전용 에뮬레이터(포트 5562, 네트워크 끔) + `assembleBundled`.

## 관찰 항목 (SWR1 ~ SWR6)

| id | 관찰(통과 조건) | iOS 2026-11-27 | Android 2026-11-27 |
|---|---|---|---|
| SWR1 | perfect 시트: 초록 면 · ✓ · `Perfect!` · 중립 정답 상자(소리 단추 · 낱말 · 로마자) | 통과 | 통과 |
| SWR2 | close 시트: `Correct` + `Almost perfect` 알약 · `Model answer` · `You said` 들은 말, 다른 음절만 주황 밑줄 | 통과 | 통과 |
| SWR3 | 오답 시트: 흰 면 · `Not quite` · `You said`(다른 음절 밑줄) ↔ `Answer` 정답 상자(다른 음절 밑줄) | 통과 | 통과 |
| SWR4 | 듣는 중: 88pt 단추(멈춤 아이콘) · 남은 시간 링이 준다 · `Listening…` · `Tap to stop when you're done` | 통과(링이 줄어듦) | 판정 불가: 에뮬레이터 인식기 없음 → 꺼짐 국면 · 안내로 접힘(통과) |
| SWR5 | 권한 창이 떠 있는 동안 링이 다 찬 채 멈춰 있다(만료되지 않음) | 통과 | 통과 |
| SWR6 | 실제 음량에 맞춰 막대가 움직인다 | 판정 불가: 시뮬레이터에서 말하지 않음 | 판정 불가: 인식기 없음 |

**미확인(실기)**: 실제 인식으로 결과 시트까지 가는 흐름, 음량 막대의 움직임(iOS RMS · Android `levelDb`), VoiceOver · TalkBack의 결과 알림.
캡처: 작업 보고에 경로를 남긴다(저장소에 넣지 않음).
