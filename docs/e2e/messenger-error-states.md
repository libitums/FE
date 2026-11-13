# 수동 e2e — 메신저 배달 실패 (ADR-0138)

| id | 확인 | 기대 |
|---|---|---|
| DE-E1 | 비행기 모드로 보내기 | 내 글 옅은 주황 + 「Not sent」 + ↻, 회색 줄 없음, 크레딧 그대로 |
| DE-E2 | 비행기 모드 끄고 ↻ → Send again | 같은 글이 가고 답이 옴, Not sent 사라짐 |
| DE-E3 | Not sent 상태에서 하나 더 보냄 → Send again | 두 글이 위에서부터 차례로 감 |
| DE-E4 | ↻ → Delete | 글이 사라짐 |
| DE-E5 | 답이 자라는 도중 비행기 모드 → 끄기 | 「Getting the rest of the reply…」 → 나머지가 채워짐 |
| DE-E6 | 비행기 모드로 새 인물 방 열기(처음) | 가운데 「Couldn't load your chat」 + Try again → 연결 뒤 Try again |
| DE-E7 | 답 도중 앱을 뒤로 → 다시 앞으로 | 답이 채워짐 |
| DE-E8 | VoiceOver · TalkBack | Not sent 글 낭독에 「Not sent」, ↻ 단추 「Send again」 |

## 실행 기록
- 미실행 — 사용자 기기 확인 대기.
