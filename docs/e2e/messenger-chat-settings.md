# 수동 e2e — 메신저 대화 설정 (ADR-0126)

가짜 출처의 기본 씨앗에 공유 기억 둘 · 미나 기억 둘이 있어 실제 앱 흐름으로 본다(임시 화면 없음).

| id | 확인 | 기대 |
|---|---|---|
| CS-E1 | 설정 탭 | 학습 묶음 끝 「Chats」 줄(설명 한 줄) |
| CS-E2 | Chats 화면 | Reply ideas 스위치 · They message you first(Once a day · Any time) · 공유 기억(2 memories) · Birth year · 각주 |
| CS-E3 | 먼저 보내는 메시지 시트 | 빈도 셋 · 시각 다섯 · 안내 · Save → 줄 값이 바뀜 |
| CS-E4 | 공유 기억 화면 | 제목 · 2 / 30 · 안내 · 목록, 고치기 → 대화상자 → Save → 「Edited」, 지우기 → 확인 → 빠짐 |
| CS-E5 | 방 ☰ | 「What 미나 remembers 2 / 50」 · 「Correction style Card only」, 자동 보기 토글 없음 |
| CS-E6 | 교정 방식 시트 | 라디오 셋 · Save → 사이드바 값이 바뀌고 **휴대폰 키보드가 뜨지 않음** |
| CS-E7 | 인물 기억 화면 | 미나 기억 둘, 뒤로 → 방(키보드 없음) |
| CS-E8 | 접근성 트리 | 줄마다 「제목, 값」 하나, 섹션 제목 · 각주 · 시트 설명이 읽힘, 시트가 열리면 뒤 화면이 트리에서 빠짐 |
| CS-E9 | 실기기 TalkBack · VoiceOver | 낭독 순서 · 라디오 「…, selected」 · 끔이면 시각 비활성 |

## 실행 기록

### 2026-11-11 — Android 에뮬레이터 CS-E1 ~ E8 통과(기기 결함 셋 고침), iOS 시뮬레이터 CS-E1 ~ E4 통과

- Pixel_8 에뮬레이터(읽기 전용), `assembleBundled`, 손님으로 시작. 소리 없음(`-no-audio`).
- **결함 1 — 시트 닫은 뒤 휴대폰 키보드**: 교정 방식 Save로 사이드바에 돌아오면 Gboard가 떴다(`mInputShown=true`). ADR-0125의 처방은 겹침이 다 닫힐 때만 돌았다 → 「부모로 닫힘」이면 모두 다음 프레임에 초점을 내린다(CS-UI13). 그 뒤 `mInputShown=false`.
- **결함 2 — 글이 접근성 트리에 없음**: 섹션 제목 · 각주 · 시트 설명 · 라벨 · 안내 · 화면 제목 · 기억 개수가 화면에는 서는데 트리에 없었다 → `flatten={false}` · `accessibility-element`(공용 `ChatHeader` 제목 포함). 그 뒤 모두 나왔다.
- **결함 3 — 사이드바 Story point · Get coins가 실제 트리에 없음**(#406부터): `uiautomator dump --compressed`(접근성 서비스가 보는 트리)에서 빠졌다 → `flatten={false}`.
- 참고: 압축하지 않은 `uiautomator dump`는 숨긴 노드도 보여 줄이 두 번 나온다. 실제 트리(`--compressed`)에서는 줄마다 하나, 시트가 열리면 뒤 화면이 빠진다.
- 사이드바가 열렸을 때 방(뒤 화면)이 실제 트리에 남는 것은 1.5(ADR-0113)부터의 동작이라 이번에 고치지 않았다.
- iOS: iPhone 17 Pro 시뮬레이터, 이 브랜치 Host.app(`--bundle-url=main.lynx`), 앱 언어 일본어 — Chats 화면 · 시트 · 공유 기억 화면이 시안대로, 긴 제목(「みんなが知っているあなたのこと」)도 머리에 들어갔다.
- 남은 것: CS-E9(실기기 · 스크린리더 낭독).
