# Supabase 소셜 로그인 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: 로그인의 소셜 셋을 Supabase에 잇는 변경(이 보고서와 같은 PR) — Google · Facebook은
  OAuth(PKCE)와 호스트의 웹 인증 창 모듈, Apple은 네이티브 Sign in with Apple 모듈과 ID 토큰 교환.
  같은 PR에서 임시 토큰 모듈(`lib/auth-token.ts`)을 지웠다.
- 대상 commit: `feat/supabase-social-login` `b15adab`(main `242b7cb` 위). 처음 기록(2026-09-29 앞선
  회차)은 `feat/supabase-login` `4215930` 위의 작업 트리였다 — 아래 「분석 결과」에 둘 다 남긴다.
- 기기: iPhone 시뮬레이터(393×852pt) — 화면 확인만 했습니다(Lynx Explorer dev 번들, Debug 호스트
  앱 내장 번들).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`입니다. Release Host는 빌드하지 않았습니다.

## 시나리오

- 번들 크기: 루트 `pnpm build`(ui-lynx → mobile → storybook)로 빌드해
  `apps/mobile/dist/main.lynx.bundle` 크기를 비교했습니다. 기준 main(`242b7cb`)과 앞선 회차 끝
  (`12a986f`)은 임시 worktree에서, 이 브랜치(`b15adab`)는 작업 트리에서 `dist`를 지우고 빌드했습니다.
  dev 서버는 띄우지 않았습니다.
- 화면 확인: Explorer에서 소셜 버튼 → 모듈 없음 문구, 호스트에서 소셜 버튼 → 시스템 확인 알림 →
  인증 창 → 닫기 뒤 로그인 화면 복귀를 눈으로 확인했습니다. 수치를 남기지 않았습니다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 셋(`lib/pkce.ts` — SHA-256 순수 구현 · `lib/web-authentication.ts` · `lib/social-sign-in.ts`)과
  `lib/auth-response.ts`(응답 파서 이동).
- 로그인 화면의 소셜 버튼 상태(`LoginSocialMethods`로 분리).
- 호스트 네이티브 모듈 하나(`WebAuthenticationModule.swift`).
- (같은 PR 둘째 회차) `lib/apple-sign-in.ts`(nonce 16진 해시 · 페이로드 좁히기) ·
  `api-client.ts`의 ID 토큰 교환 · `social-sign-in.ts`의 Apple 갈래, 호스트 모듈
  `AppleSignInModule.swift` · 엔타이틀먼트. `lib/auth-token.ts` 삭제.

## 분석 결과

| 번들                                              | 크기            | main 대비       |
| ------------------------------------------------- | --------------- | --------------- |
| main (`242b7cb`)                                  | 1,144,029 bytes | —               |
| 앞선 회차 끝 — 웹 OAuth 셋 (`12a986f`)            | 1,158,006 bytes | +13,977 bytes   |
| 이 브랜치 — Apple 네이티브 · 임시 토큰 제거 (`b15adab`) | 1,160,471 bytes | **+16,442 bytes** |

둘째 회차(Apple 네이티브 · 임시 토큰 제거)만의 차는 +2,465 bytes입니다. 모바일 번들 상한
(1,171,000 bytes) 안이고 `pnpm size:check`가 통과했습니다(1160.5 kB / 1171.0 kB — 남은 여유 약
10.5 kB).

처음 기록(참고 — 기준이 달라 위 표와 섞지 않는다): `feat/supabase-login`(`4215930`) 1,144,212 bytes →
그 위 작업 트리 1,158,145 bytes, +13,933 bytes. 렌더링 · 메모리 값은 **없습니다** — 재지
않았습니다.

## 해석

- **미측정 기록입니다.** SHA-256 순수 구현의 계산 시간(검증자 32바이트 한 번)은 재지 않았습니다 —
  입력이 작아 체감되지 않을 것으로 보지만 근거는 없습니다.
- 새 서드파티 의존은 0건입니다. Apple nonce 해시는 기존 SHA-256 순수 구현을 다시 쓰고, 계산도
  한 번(43자)이라 체감되지 않을 것으로 보지만 재지 않았습니다.

## 결론과 후속

- 번들 main 대비 +16,442 bytes, 상한 안(여유 약 10.5 kB). 렌더링 · 메모리는 미측정이며 이 기록은
  성능 판정이 아닙니다.
- 후속: 제공자 설정 뒤 실기(Release Host)에서 소셜 로그인 왕복(창 열기 · 교환)의 체감 시간을 잽니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
