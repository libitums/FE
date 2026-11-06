# Facebook 수단 숨김(정책 칸) · Android Apple 사용 불가 해제 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 로그인 화면에서 Facebook 버튼을 **숨깁니다**(두 플랫폼 — ADR-0111 개정 4, 사용자 결정 「메타 로그인 버튼 숨겨줘」). 숨김 목록의 정본은 앱 정책 `app-policy.json`의 새 선택 칸 `hidden_login_methods`이고 없으면 상수 기본값(`facebook`)입니다. Android의 Apple은 사용 불가(안내 모달) 기본값에서 **뺍니다** — 사용자가 실기에서 Android Apple 웹 OAuth 로그인 성공을 확인했고(2026-11-06), Supabase `/authorize?provider=apple`이 Services ID `com.libitum.host.web`로 Apple의 진짜 로그인 폼을 여는 것을 차등 테스트로 확인했습니다. 앞선 「완료 0건 → 죽은 버튼」 판단은 오판이었습니다.
- 대상 commit: `feat/hide-facebook-login` 0144b005(origin/main d825768d 위, `pnpm verify` 안의 `size:check`로 잼).
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` **3,963.6 kB**(상한 4,060.0 kB — 남은 여유 96.4 kB). 직전 main(#392 병합 뒤 d825768d)은 3,962.6 kB였으니 이 변경은 **+1.0 kB**(정책 칸 하나 · 순수 함수 둘 · prop 하나)입니다. ui-lynx **557.8 kB**(상한 559.0 kB — 이 변경의 ui-lynx 변경은 0). 상한을 올리지 않았습니다.
- 런타임: 미측정. 로그인 화면 렌더마다 기기 저장소의 정책 원문을 읽어 디코드하는 호출이 둘(보이는 목록 · 사용 불가 목록)인데, 같은 저장소 읽기 두 번이고 로그인 화면에서만 돕니다. 네트워크 · 재시도 변화 없음.

## 이 변경이 무엇을 건드렸나

- `lib/app-policy.ts` — `LoginMethodSelection` 타입 · `hidden_login_methods` 디코드(사용 불가 칸과 같은 규칙: 칸만 무시 · 모르는 이름 버림 · 어휘 순서).
- `screens/login/login.ts` — `productHiddenLoginMethods = ["facebook"]` · `androidHiddenLoginMethods = []` · `hiddenLoginMethodsFor` · `visibleSocialLoginMethodsFor`; `androidUnavailableLoginMethods`를 `[]`로.
- `screens/login/login.contract.ts` · `LoginScreen.tsx` — `visibleMethods` prop(결선이 만든 목록을 그대로 그림).
- `app/screen-wiring.ts` · `render-entry-screen.tsx` · `playground/screens.tsx` — `visibleSocialMethods()` 결선.
- 사용자 관찰 가능 런타임 변경 파일(정책 기준 — 테스트 · test-helpers 제외): 8개. 새 CSS 규칙 0 · 새 토큰 0 · ui-lynx 변경 0 · 서버 · 호스트 변경 0.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 버튼 하나가 빠져 로그인 화면의 요소 수는 줄고, 정책 디코드가 렌더마다 두 번 도는 비용은 수십 바이트 JSON 파싱이라 체감 영향은 없다고 **추론**합니다 — 재지 않았으므로 지연 · 메모리는 수치로 말할 수 없습니다(미측정의 한계).

## 결론과 후속

- 미측정입니다.
- 후속: 비회원 진입 e2e GE-E1 · E2 · E9(정책으로 Facebook 버튼 되살리기) 첫 회차에서 Android Apple 웹 OAuth 완주와 함께 봅니다.

## 개인정보 점검

- 보고서에 사용자 식별 정보 · 토큰 · 기기 식별자 없음. 정책 파일은 공개 콘텐츠 버킷의 설정값입니다.
