# 막간(INT) 이야기 유닛 — 맵 Story 노드 · 말풍선 · 컷 화면

막간 이야기 유닛([ADR-0088](../adr/0088-interlude-story-unit.md))이 맵에서 스페셜 노드 「Story」로 서고, 말풍선에 티켓 표시 없이
`Start`가 서며, 컷 화면이 자막부터 그려지는지 보는 **수동 절차**다.

| 이미 지는 층 | 무엇을 |
| --- | --- |
| unit | 막간 해석(IL1 ~ IL8) · 이야기 키 · 레슨 번호 · 사슬 · 완료 · 티켓 · 컷 모델(ST1 ~ ST7) |
| ui | 맵의 Story 노드가 `SpecialUnit` · 라벨 `SPECIAL`/`Story` · S5 = Lesson 5(SU1 ~ SU3) |
| integration | Story 시작 → 컷 → 끝 → 진행에 INT · 티켓 기록 없음 · S5 열림(SI1) |

## 전제

- 수준 2 매니페스트(`manifests/level-2.json`)를 읽을 수 있어야 한다 — 테스트 버킷(`PUBLIC_CONTENT_BUCKET=content-test`) 또는 **커밋하지 않는 임시 내장 픽스처**(내장 `u01` ~ `u08`을 막간 판으로 바꾸고 내장 버전을 원격보다 높게, 막간 그림을 내장 그림 표에 잠시 추가).
- iPhone 17 Pro 시뮬레이터, Debug 호스트 + 내장 번들(`--bundle-url=main.lynx`).

## 단계

| id | 조작 | 기대 |
| --- | --- | --- |
| IE1 | 맵에서 u01 구획을 본다 | Lesson 4와 Lesson 5 사이에 스페셜 노드(둥근 사각 · 별) · 라벨 `SPECIAL` / `Story`, 아래 레슨이 Lesson 5부터 이어진다 |
| IE2 | Story 노드를 누른다 | 말풍선 제목 `Story: “<에피소드 제목>”`, 티켓 표시 없음, `Start` |
| IE3 | `Start` | 컷 화면, 머리 `Episode n.` · `Scene 1 / N`, 첫 컷이 자막(「그 시각, …」)과 영어 줄, 그림은 막간 첫 컷 |
| IE4 | 끝까지 넘긴다 | 마지막 버튼 뒤 「To be continued…」 배너, 그 뒤 맵으로 돌아오고 Story가 끝남, 티켓 수 그대로 |
| IE5 | 메신저(u04) · 전화(u02) 막간을 연다 | 배경 그림 위 대사 컷, 메신저 답장은 첫 보기 |

## 기록 ⟨2026-10-26⟩

- 회차: iPhone 17 Pro 시뮬레이터(iOS 26.5), Debug 호스트 + 내장 번들, 임시 내장 픽스처(새 묶음 u01 ~ u08, 버전 `2026-10-26.9`, 막간 · `-v2` 그림 36장), 시험 계정(모든 유닛 열림).
- IE1 **통과** — Lesson 4 · Story(스페셜) · Lesson 5 · Lesson 6. 이미 끝낸 S5 이후는 끝남, Story는 열림.
- IE2 **통과** — 「Story: “Buying Water”」, 티켓 표시 없음. 머리 띠 `Episode 1, unit 05` · `11 / 12`(사슬 전체의 자리 — ADR-0088 D2).
- IE3 **통과** — `Episode 1.` · `Scene 1 / 7`, 「그 시각, 익선 게스트하우스」 / 「Meanwhile, at Ikseon Guesthouse」, 막간 첫 그림.
- IE4 · IE5 **미확인** — 사람이 이어서 넘겨 본다.
- Android · VoiceOver **미확인**.
