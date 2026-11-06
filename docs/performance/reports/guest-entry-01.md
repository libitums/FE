# 비회원으로 계속 · Facebook 수단 임시 제거 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 로그인 화면에서 Facebook(두 플랫폼) · Apple(Android)을 누르면 인증 창 대신 「사용 불가 안내」 대화상자를 띄우고(개정 2 — 버튼은 숨기지 않습니다), 「Continue without an account」로 계정 없이 ① 이름 → ② 나라 → 언어 선택 → 여정 입장 → 맵까지 서버 요청 0건으로 들어가며, 진행 · 학습일을 기기에만 적고, 설정 「Sign in」으로 로그인하면 기기 기록을 그 계정의 미전송 칸으로 옮겨 올립니다 — ADR-0111(임시).
- 대상 commit: `feat/guest-entry` bda2be5f(개정 2 — 사용 불가 안내 대화상자까지 든 커밋, `pnpm verify` 안의 `size:check`로 잼). 개정 1 시점(15c2195d)은 main 3,910.1 kB였고, 개정 2의 새 컴포넌트 · 훅 · 문구 셋 × 다섯 언어로 **+5.5 kB**다. 개정 3(정책 칸 · 결선) 포함 재측정: main **3,961.6 kB**(상한 4,060.0 — 여유 98.4 kB) · ui-lynx 557.8 / 559.0 kB(`pnpm verify`, HEAD b6964c92). 개정 4(Facebook 버튼 숨김 기본 · 정책 칸 `hidden_login_methods` · `visibleMethods` prop · Android Apple 사용 불가 제외)는 별도 보고서 [hide-facebook-login-01](hide-facebook-login-01.md)에 있다 — main **3,963.6 kB**(직전 main 3,962.6에서 +1.0 kB) · ui-lynx 557.8 / 559.0 kB.
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` **3,915.6 kB**(상한 4,060.0 kB — 남은 여유 144.4 kB). main cc886146(#385~#388 — 글꼴 · 레슨 단위 받기 · 보기 로마자) 위로 리베이스한 뒤 같은 검사는 **3,960.5 kB**(여유 99.5 kB)이고 ui-lynx는 557.8 / 559.0 kB다 — 늘어난 몫은 그 PR들의 것, ui-lynx **555.6 kB**(상한 556.0 kB — 남은 여유 0.4 kB, 이 변경의 ui-lynx 변경은 0). 상한을 올리지 않았습니다.
- 런타임: 미측정. 비회원 구간은 서버 요청 · 재시도 · 알림 등록이 없고, 유닛 완료마다 기기 저장소에 진행 · 학습일을 한 번씩 적습니다. 로그인 성공 때 비회원 칸을 읽어 합쳐 쓰는 일이 한 번 더 있습니다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 일곱 — `lib/guest-session.ts`(표식 · 계정 상태) · `app/guest-progress.ts`(연속 규칙 · 합치기 · 이관) · `app/guest-progress-store.ts`(기기 전용 저장 객체) · `app/store-session.ts`(세션 저장 한 자리) · `app/guest-wiring.ts`(비회원 결선) · `app/use-account-state.ts` · `app/use-session-catalog.ts`(300줄 분할).
- 고친 모듈 — 진입 결선(스플래시 `guest` 갈래) · 진행 훅(`startGuestProgress` · 비회원 설문 가드) · 화면 결선 · `AppSession` · `nav-state`(`guest-login`) · 렌더 둘 · 로그인 화면(소셜 셋 · 사용 불가 안내 대화상자 · 비회원 버튼 — 개정 2에서 `LoginUnavailableDialog.tsx` · `use-login-unavailable.ts` 둘이 새로 섭니다) · 설정 화면 셋(행 구성 · 「Sign in」) · 문구 다섯 언어 × 둘.
- 사용자 관찰 가능 런타임 변경 파일(정책 기준 — 테스트 · test-helpers 제외): 42개. 새 CSS 규칙 0 · 새 토큰 0 · ui-lynx 변경 0 · 서버 · 호스트 변경 0.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 비회원 구간이 서버 요청 없이 돈다는 것은 테스트(가짜 fetch 0건)가 지키는 사실이고, 체감 지연 · 메모리 · 저장소 쓰기 비용은 재지 않아 수치로 말할 수 없습니다(미측정의 한계).
- 비회원 → 로그인 전환 때 진행 객체가 한 번 되돌아가고 옮긴 칸을 다시 읽어 적용하므로 맵이 한 렌더 비어 보일 수 있다는 것은 추론입니다 — 기기에서 보지 않았습니다.

## 결론과 후속

- 미측정입니다.
- 후속: 비회원 진입 e2e(GE-E1 ~ GE-E8) 첫 회차에서 실기의 비회원 완주 체감과 설정 로그인 뒤 맵 복원을 함께 봅니다. ui-lynx 상한 여유가 0.4 kB라 다음 ui-lynx 변경은 상한 조정이 먼저입니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
