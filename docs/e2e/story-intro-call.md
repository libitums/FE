# Story 시작 화면 · 전화 막간 · 노드 아이콘

Story 노드의 바로 시작, 시작 화면의 Skip · Start, 전화 막간 화면, 노드 아이콘([ADR-0088](../adr/0088-interlude-story-unit.md) D6)을 보는 **수동 절차**다.

| 이미 지는 층 | 무엇을 |
| --- | --- |
| unit | 전화 해석 CC1 ~ CC3 · 통화 표시 모델 · 시간 SC1 ~ SC3 · 노드 아이콘 ST8 · 이야기 모델 ST6 |
| ui | 시작 화면 SIU1 ~ SIU4 · 전화 화면 SCU1 ~ SCU4 · 노드 아이콘 · 바로 시작 SU4 · SU5 · SpecialUnit icon SUU13 |
| integration | 컷 Story Start · 배너 · 이벤트 SI1, Skip SSK1, 뒤로 SEX1, 메신저 SMI1, 전화 SCI1 |

## 전제

- [막간 이야기 e2e](interlude-story.md)와 같다 — 테스트 버킷 또는 커밋하지 않는 임시 내장 픽스처.

## 단계

| id | 조작 | 기대 |
| --- | --- | --- |
| SC1 | 맵의 Story 노드들을 본다 | u01 · u03 · u05 · u07 필름, u04 · u06 · u08 · u10 말풍선, u02 · u09 전화 아이콘 |
| SC2 | Story 노드를 누른다 | 말풍선 없이 시작 화면 — 배경 · 「STORY · EPISODE n」 · 자막, 아래 Skip · Start →, 왼쪽 위 뒤로 |
| SC3 | 가만히 둔다 | 저절로 넘어가지 않는다 |
| SC4 | Skip → Keep watching | 대화상자만 닫힌다 |
| SC5 | Skip → Skip | 배너 없이 맵, Story 끝남, 다음 레슨 열림 |
| SC6 | u02 · u09 Story → Start | 수신 화면(이니셜 · 물결 · Answer) |
| SC7 | Answer | Connecting… 뒤 가운데 대사가 하나씩 바뀜 — 상대 회색 이름, 나 「Me」 주황 글, 배경 소리 기울임 · 시계가 감 |
| SC8 | 끝까지 | Call ended · 시간 · 끊김 지문 · Finish story → To be continued… → 맵 |

## 기록 ⟨2026-10-28⟩

- 회차: iPhone 17 Pro 시뮬레이터(iOS 26.5), Debug 호스트 + 내장 번들, 임시 내장 픽스처(새 묶음 u01 ~ u10, 문자 · 전화 막간에 `profiles` — 미나 · 윤경 그림, 전화 확인은 u03 자리에 u09 전화 막간을 잠시 넣음), 회차 뒤 되돌림.
- SC1 **부분 통과** — u01 · u03 필름 아이콘 확인. 말풍선 · 전화 아이콘은 기기에서 보지 않았다(ui SU4가 진다).
- SC2 **통과** — 말풍선 없이 시작 화면(u01 · u03), Skip · Start →, 뒤로.
- SC3 **통과** — 저절로 넘어가지 않음.
- SC6 · SC7 · SC8 **통과**(u09 전화) — 수신(윤경 그림 · 물결 · Answer) → 시계 · 「Me」 주황 대사 → 끊김 지문 「뚝. ...뭘 먹으라고 했지?」 · Finish story. 끊김 화면에 물결이 남던 것 · 빨간 「Call ended」가 그림 위에서 읽기 어렵던 것을 고쳤다(물결은 통화 중에만, 글은 밝은 회색).
- SC4 · SC5(Skip 확인 · 확정)는 기기에서 누르지 않았다(ui SIU3 · integration SSK1이 진다). Android · VoiceOver 미확인.

## 기록 ⟨2026-10-28⟩ 2회차

- 프로필을 키움(수신 136 · 통화 104), 음소거 · 스피커 · 끊기 아이콘(mic · volume · 눕힌 phone)이 보임 — iPhone 17 Pro 시뮬레이터, 보강판 콘텐츠(`profiles`) 임시 내장, 회차 뒤 되돌림.
- 대사 시간: 소리 줄은 말 끝 + 0.9초, 소리 없는 줄은 글 기반 2.8 ~ 7초로 늘림. 녹음이 아직 없어 소리 줄은 기기에서 듣지 못했다(ui SCA1 · SCA2가 진다).
