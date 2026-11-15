# 수동 e2e — 메신저 사진 · 음성 앱 연결 (ADR-0146 「앱 연결」)

전제: 서버에 `20261130120000_companion_snapshot_voice.sql` · `20261202120000_companion_media_limits.sql`과 함수 `companion-snapshot` ·
`companion-voice`가 적용된 프로젝트, **로그인한 시험 계정**(서버 모드), 엽전 100 이상, 기기 소리 끔(재생 확인 때만 켬).
사진은 한 장에 1분 안팎 걸린다 — 실제 엔진 비용이 나므로 회차마다 몇 장만.

| id | 확인 | 기대 |
|---|---|---|
| CM-E1 | 덕수쌤 방에서 첫 인사가 선 뒤 Snapshot → 확인 | 곧바로 인사 아래 사진 자리표시자, 목록 미리보기 「is sending a picture…」. 1분 안팎 뒤 3:2 또는 1:1 사진 + 「AI-generated」. 머리 엽전 칩 · 방 잔액 35 줄어듦 |
| CM-E2 | 같은 메시지에 Snapshot 알약 | 흐리고 눌리지 않음(VoiceOver 「Already sent for this message」) |
| CM-E3 | Snap voice → 확인 | 음성 자리표시자 → 음성 말풍선(덕수쌤 한국어 · 번역, 길이 글자 없음). 재생 단추 → 0.85배로 들림, 다시 누르면 멈춤, 끝나면 Play로 |
| CM-E4 | 사진을 요청하고 곧바로 방을 나갔다가 1분 뒤 다시 열기 | 사진이 그 메시지 아래에 섬(나가 있는 동안 다시 읽기 없음 — 네트워크 로그) |
| CM-E5 | 비행기 모드로 Snapshot → 확인 | 10초 안에 「Couldn't send your request…」 회색 줄, 엽전 그대로 |
| CM-E6 | 운영 설정으로 `snapshot_daily_attempts`를 낮춘 개발 DB에서 넘기기 | 「You've reached today's limit. Try again after h:mm.」(기기 시각 = 다음 UTC 자정) |
| CM-E7 | Android(저사양)에서 CM-E1 · E3 | 화면이 막히지 않음, clearTimeout 오류 없음, 원격 mp3 재생 |
| CM-E8 | VoiceOver · TalkBack | 꺼진 알약 = 가격 + 까닭, 결과가 서면 한 번 낭독(사진 「Photo from 덕수쌤」은 로그에서, 음성 · 회색 줄은 도착 낭독) |
| CM-E9 | 5개 언어(es · id · ja · vi) | 회색 줄 · 꺼진 알약 낭독 · AI 표시가 그 언어 |
| CM-E10 | 시험 계정이 아닌 회원(가짜 출처) | 지금 그대로 — 알약 늘 켜짐, 앱 지갑 차감, 픽스처 사진 |

## 실행 기록
- 미실행 — 실서버 엽전 · 기기 연결 대기(이번 실행은 운영 Supabase · 유료 API를 부르지 않음).
- 통과 뒤 `MESSENGER_MEDIA_READY`를 true로(방 코치마크 사진 · 음성 단계).
