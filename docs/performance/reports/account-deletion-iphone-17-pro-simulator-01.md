# 계정 삭제 · 로그아웃 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: 설정의 Sign out · Delete account, 서버 함수 앱(`apps/supabase-functions`), Apple 재인증 · 토큰 철회,
  App 세션 재시작(ADR-0032) — 이 보고서와 같은 PR.
- 대상 commit: `feat/account-deletion`(main `7c94fe8` 위 — #163 · #164 병합 뒤로 리베이스).
- 기기: iPhone 시뮬레이터(402×874pt) — e2e 회차(`docs/e2e/account-deletion.md`)에서 화면 확인만 했습니다(Debug
  호스트 앱 내장 번들).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`입니다. Release Host는 빌드하지 않았습니다.

## 시나리오

- 번들 크기: 루트 `pnpm build`로 빌드해 `apps/mobile/dist/main.lynx.bundle` 크기를 비교했습니다. 기준
  main `7c94fe8`은 임시 worktree에서, 이 브랜치는 작업 트리에서 `dist`를 지우고 빌드했습니다. dev 서버는 띄우지
  않았습니다.
- 화면 확인: 설정 → 계정 묶음 → 삭제 · 로그아웃 대화상자 → 로그아웃 → 재실행을 눈으로 확인했습니다. 시간
  수치는 남기지 않았습니다.

## 이 변경이 무엇을 건드렸나

- 앱: 요청 빌더 분리(`lib/auth-request.ts`), 로그아웃 · 삭제 요청, 삭제 흐름(`lib/account-deletion.ts`), 분석
  `user.reset` · 대기열 버림, 설정 계정 묶음 · 확인 대화상자 · 상태 전이 훅, App을 바깥 `App` + `AppSession`으로
  나눠 떠날 때 새 key로 다시 세움.
- ui-lynx `Dialog` 계약 완화(로딩 액션 허용).
- 호스트: `AppleSignInModule` 페이로드에 `authorizationCode`.
- 서버 함수 앱은 Lynx 번들에 들어가지 않습니다(Supabase Edge Function, 별도 배포).

## 분석 결과

| 번들                                  | 크기            | 기준 대비         |
| ------------------------------------- | --------------- | ----------------- |
| 기준 main (`7c94fe8`)                  | 1,298,626 bytes | —                 |
| 이 브랜치 (`feat/account-deletion`)   | 1,313,727 bytes | **+15,101 bytes** |

모바일 번들 상한(1,336,000 bytes) 안이고 `pnpm size:check`가 통과했습니다(1313.7 kB / 1336.0 kB — 남은 여유 약
22.3 kB). 렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 늘어난 크기는 설정 상태 전이 · 삭제 흐름 · 요청 빌더 · 문구로 보이지만 소스맵으로
  나눠 보지는 않았습니다.
- App 세션 재시작은 떠날 때 한 번 전체를 다시 세웁니다 — 새 설치 부팅과 같은 비용이라 체감 문제는 없을 것으로
  보지만 재지 않았습니다.
- 새 서드파티 의존은 0건입니다.

## 결론과 후속

- 번들 기준 대비 +15,101 bytes, 상한 안(여유 약 22.3 kB). 렌더링 · 메모리는 미측정이며 이 기록은 성능 판정이
  아닙니다.
- 후속: 여유가 약 22 kB로 줄었습니다 — 다음 기능 전에 상한 조정이나 번들 줄이기를 검토합니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.

리베이스 전 기록(참고): 기준 `feat/ui-language-catalog` `5a1c45c` 1,291,591 bytes → 1,306,394 bytes, +14,803 bytes.
