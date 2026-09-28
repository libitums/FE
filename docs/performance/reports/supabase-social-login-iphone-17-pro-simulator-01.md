# Supabase 소셜 로그인 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다. 번들
  크기만 재었습니다.
- 기능 PR: 로그인의 소셜 셋(Apple · Google · Facebook)을 Supabase OAuth(PKCE)와 호스트의 웹 인증
  창 모듈에 잇는 변경(이 보고서와 같은 PR)
- 대상 commit: 전화번호 로그인 브랜치(`feat/supabase-login` `4215930`) 위의 작업 트리
- 기기: iPhone 시뮬레이터(393×852pt) — 화면 확인만 했습니다(Lynx Explorer dev 번들, Debug 호스트
  앱 내장 번들).
- OS: iOS 26.5
- Lynx SDK: 4.0.1
- 빌드: 번들 크기는 `pnpm build`의 `main.lynx.bundle`입니다. Release Host는 빌드하지 않았습니다.

## 시나리오

- 번들 크기: `feat/supabase-login`(`4215930`)과 이 작업 트리를 각각 `pnpm build`로 빌드해
  `apps/mobile/dist/main.lynx.bundle` 크기를 비교했습니다.
- 화면 확인: Explorer에서 소셜 버튼 → 모듈 없음 문구, 호스트에서 소셜 버튼 → 시스템 확인 알림 →
  인증 창 → 닫기 뒤 로그인 화면 복귀를 눈으로 확인했습니다. 수치를 남기지 않았습니다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 셋(`lib/pkce.ts` — SHA-256 순수 구현 · `lib/web-authentication.ts` · `lib/social-sign-in.ts`)과
  `lib/auth-response.ts`(응답 파서 이동).
- 로그인 화면의 소셜 버튼 상태(`LoginSocialMethods`로 분리).
- 호스트 네이티브 모듈 하나(`WebAuthenticationModule.swift`).

## 분석 결과

| 번들                                   | 크기            |
| -------------------------------------- | --------------- |
| `feat/supabase-login` (`4215930`)      | 1,144,212 bytes |
| 이 작업 트리                           | 1,158,145 bytes |
| 차                                     | +13,933 bytes   |

모바일 번들 상한(1,171,000 bytes) 안입니다. 렌더링 · 메모리 값은 **없습니다** — 재지
않았습니다.

## 해석

- **미측정 기록입니다.** SHA-256 순수 구현의 계산 시간(검증자 32바이트 한 번)은 재지 않았습니다 —
  입력이 작아 체감되지 않을 것으로 보지만 근거는 없습니다.
- 새 서드파티 의존은 0건입니다.

## 결론과 후속

- 번들 +13,933 bytes, 상한 안. 렌더링 · 메모리는 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 제공자 설정 뒤 실기(Release Host)에서 소셜 로그인 왕복(창 열기 · 교환)의 체감 시간을 잽니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
