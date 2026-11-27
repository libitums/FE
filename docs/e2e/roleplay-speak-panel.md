# 롤플레이 말하기 패널 (ADR-0201 D6 적용 2)

롤플레이 대화의 새 아래 패널이 기기에서 그려지는지 확인하는 **수동 절차**다 — 흰 카드 패널(Your line · 뜻) · 공용 마이크 · Hint 단계(Hear it ·
Show Korean) · 정답(내 말풍선 + 상대 반응 · 2초 뒤 다음 턴) · 오답(정답 문장 주인공 · You said 작게 · 다른 낱말 밑줄) · 칸 막대 · 머리
「Episode N」(마침표 없음) · 「Can't speak now」 잘림. 결정은 [ADR-0201](../adr/0201-spoken-answer-pronunciation-judge.md) 「D6 적용 2」, 시안은 R1 ~ R5.

| 이미 지는 층 | 무엇을 |
|---|---|
| unit | 힌트 단계 · 판정 담기 · 턴 보고 · 낱말 차이(`wordDiff`) · 머리 이름표 · 칸 막대 |
| ui | 대화 화면(패널 · 반응 · 2초 넘김 · 오답 패널 · Show Korean · 턴 보고) · 못 알아들음 · 권한(#646) |
| integration | 내장 u01 롤플레이 세 턴 → 결과, `roleplay_story_turn_answered` 세 번(들은 문장 없음) |

## 전제

- 탐침 번들(커밋 안 함): 패널 · 결과 패널 둘 · 대화 화면을 그린다. iOS 17 Pro 시뮬레이터 · Pixel_8 에뮬레이터(`assembleBundled`, 네트워크 끔).

## 관찰 항목 (RSP1 ~ RSP6)

| id | 관찰(통과 조건) | iOS 2026-11-27 | Android 2026-11-27 |
|---|---|---|---|
| RSP1 | 흰 패널 위 `Your line` · 뜻 · 마이크 · `Show hint` · `Can't speak now`(잘리지 않음), 그림 위 흰 글자 없음 | 통과 | 통과 |
| RSP2 | Hint 펼침: `Hear it` · Show Korean 뒤 한국어 · 로마자가 패널 맨 위 | 통과 | 미확인(탐침 첫 장은 iOS만 캡처) |
| RSP3 | 정답 패널: ✓ `Great` · Next | 통과 | 통과 |
| RSP4 | 오답 패널: 정답 문장(크게 · 로마자 · 소리 단추) · 다른 낱말 주황 밑줄 · `You said` 작게 · Try again · Next | 통과 | 통과 |
| RSP5 | 머리 `Episode 1`(마침표 없음) · 칸 막대 | 통과 | 통과 |
| RSP6 | 실제 인식으로 정답 → 상대 반응 → 2초 뒤 다음 턴 | 판정 불가: 시뮬레이터에서 말하지 않음 | 판정 불가: 에뮬레이터 인식기 없음 |

**미확인(실기)**: 실제 인식 흐름 · VoiceOver/TalkBack 낭독 · 밝은 장면 그림 위 대비(탐침은 단색 바탕).
