# 수동 e2e — 사진 · 음성 앨범 · 사진 속 내 모습 · 다시 그리기 (ADR-0150)

전제:
- 서버: [companion-media-app.md](companion-media-app.md)의 전제 + `20261203120000_companion_media_album.sql` 적용.
  - 미적용이면 앨범 칸의 말이 비고, 지난 대화 표시가 없다.
- 계정: **로그인한 시험 계정**(서버 모드), 엽전 100 이상.
- 기기 소리 끔(재생 확인 때만 켬).
- 다시 그리기는 실제 엔진 비용이 나므로 회차마다 한두 장만.

| id | 확인 | 기대 |
|---|---|---|
| AL-E1 | 덕수쌤 방 → 「…」 사이드바 | 이야기 시점 다음에 「Album · Pictures and voice messages」 줄. 누르면 「덕수쌤's album」 화면, 뒤로 가면 방 |
| AL-E2 | 사진 · 음성이 있는 앨범 | Today · Yesterday · 월 일 묶음, 사진 칸 · 음성 칸(아이콘 + 한국어), 아래 「Pictures and voice messages stay here…」. 탭 All · Photos · Voice가 거름 |
| AL-E3 | 사진 칸 → 보기 | 전체 화면 그림, 「AI-generated」, 그때의 한국어 · 번역, 「Redraw · 25」. 닫기 · 시스템 뒤로가 보기만 닫음 |
| AL-E4 | Redraw → 확인 「Redraw for 25 Yeopjeon」 | 보기가 닫히고 칸에 「Drawing…」(반짝임). 방으로 가면 사진 자리에 자리표시자 → 1분 안팎 뒤 **새 사진이 옛 사진 자리에**(방에는 한 장). 앨범을 다시 열면 그 칸에 「2 versions」, 보기에서 1 · 2 칩으로 두 판 |
| AL-E5 | 음성 칸 → 시트 | 재생(0.85배) ↔ 멈춤, 「Record again · 15」 → 확인 → 방 음성 자리에 새 음성 |
| AL-E6 | 운영 도구로 그 인물 대화를 초기화(`companion_operator_reset`) 뒤 앨범 | 칸이 그대로 있고 「From a past chat」. 보기 · 시트에 Redraw · Record again 없음 |
| AL-E7 | 앱을 지우고 다시 설치 → 시험 계정 → 덕수쌤 Snapshot | 요청 모달에 「How should you appear?」 Woman · Man · Just hands. Just hands로 확정 → 사진에 손 · 어깨만. 다음 Snapshot은 묻지 않음 |
| AL-E8 | 설정 탭 → Chats → About you → You in snapshots | 지금 값(AL-E7 뒤 Just hands). Man → Save → 다음 사진은 남자 뒷모습 |
| AL-E9 | 엽전 20으로 Redraw | 확인의 주 버튼이 「Get Yeopjeon」 → 엽전 상점, 요청 없음 |
| AL-E10 | Android(저사양) · VoiceOver · TalkBack | 칸 낭독 「Picture from 덕수쌤, <말>, 2 versions」, 탭 · 판 칩은 「선택됨」, 시트 · 보기에서 뒤로 순서. 화면 막힘 · clearTimeout 오류 없음 |
| AL-E11 | 5개 언어(es · id · ja · vi) | 앨범 · 보기 · 시트 · 확인 · 내 모습 문구가 그 언어(ja 날짜 「11月12日」) |

## 실행 기록
- 미실행 — 실서버 엽전 · 기기 연결 대기(이번 실행은 운영 Supabase · 유료 API를 부르지 않음).
- 통과하면 [companion-media-app.md](companion-media-app.md)와 함께 `MESSENGER_MEDIA_READY`를 true로 바꾼다.
