# ADR-0111 — Facebook 수단을 임시로 「사용 불가」로 안내하고, 계정 없이 「비회원으로 계속」한다 (Android는 Apple도 사용 불가 · 기기 전용 진행 · 설정에서 로그인하면 이어 올린다)

- 상태: **채택 — 임시.** 서버 · 호스트 · ui-lynx · 토큰 변경은 0이다(RPC · 마이그레이션 · globalProps · 새 토큰 0).
  사용자 발화(2026-11-06)는 둘이다 — 첫째 「페이스북 로그인을 임시로 제거하고 비회원으로도 임시로 진행할 수 있는 버튼을 추가」 + 인자(비회원은 언어 선택 → 여정 입장 → 여정 맵,
  진행 · 프로필은 기기에만, 나중에 로그인하면 기기 값이 서버로). 둘째(같은 날, 개정 1 구현 뒤) 「**페이스북 로그인 끄지 말고** 잠시 이관 작업 중이다 뭐 이런 식으로 추천 방안으로 **에러 뜨면 모달창만 띄워줘**」 —
  이 발화가 [추론] 첫째(표시 제외 방식)를 **되돌려** D1이 「사용 불가 안내 모달」로 다시 쓰였다(**개정 2**). 셋째(같은 날, 개정 2 구현 뒤) 사용자 결정 「**A로 진행**」 — 상수를 비우는 되살리기는 앱 재배포 · 스토어 심사가 필요하다는 지적에, 사용 불가 목록의 **정본을 앱 정책 파일(`app-policy.json`)로** 옮기고 상수는 기본값으로 남겼다(**개정 3**, D1 · 재검토 조건 1 · 2). 그 밖의 결정은 **사용자 부재 · 자율 진행**으로 요구사항의 [추론] 일곱(Android의 Apple도 같은 안내 ·
  재실행 때 바로 맵 · 알림 권한 미요청 · 합치기 규칙 · 서버 전용 행 숨김 · `method: "guest"` 값 하나 · 낮은 강조 한 줄 버튼)을 계약 단계가 그대로 채택하고, 메인이 수용했다(아래 「확인 필요」).
  ⚠ **기기 확인이 아직 없다** — [비회원 진입 e2e](../e2e/guest-entry.md) GE-E1 ~ GE-E8은 실행된 회차가 없다.
- 날짜: 2026-11-06(개정 2 · 개정 3도 같은 날).
- **임시의 뜻 — 재검토 조건이 둘 있다.** ① Meta 앱 게시가 끝나면 버킷 `app-policy.json`의 `unavailable_login_methods.all`에서 `facebook`을 지운다 — 다음 실행부터 Facebook이 두 플랫폼에서 다시 인증 창을 연다.
  ② Supabase Apple 제공자의 Services ID(Android 웹 OAuth, [ADR-0039](0039-android-social-oauth.md))가 설정되면 `unavailable_login_methods.android`에서 `apple`을 지운다 — Android의 Apple이 다시 인증 창을 연다.
  둘은 각각 정책 파일의 배열 원소 하나이고 따로 되돌릴 수 있다 — **앱 배포 0**(개정 3). 절차는 [정책 파일 스펙 「되살리기」](../specs/app-update-policy.md). ⚠ 2026-11-06 현재 버킷에 그 파일이 **없다** — 첫 업로드 전까지는 `screens/login/login.ts`의 상수 기본값(`facebook` · Android `apple`)이 적용된다(확인 필요 12). **비회원 진입 자체는 수단이 돌아와도 자동으로 걷지 않는다** — 비회원 선택 비율 · 전환율(「측정」)을 보고 따로 정한다.
- 다루는 축: **로그인 수단의 사용 불가 안내**(어느 수단을 · 언제 띄우나 · 무엇을 말하나 · 되돌리는 법) · **비회원 진입과 표식**(누가 비회원인가 · 재실행 때 어디로 가는가) · **기기 전용 진행**(어느 칸에 · 서버 요청 없이 · 연속 학습일 계산) ·
  **설정에서의 로그인과 이관**(어느 화면 · 어떤 순서 · 무엇을 옮기는가 · 어디로 돌아오는가) · **측정** · **비회원에게 숨기는 서버 행**.
  **다루지 않는 것**: 서버 쪽 비회원 저장(기기를 바꾸면 비회원 기록은 사라진다 — 의도) · Facebook · Apple 코드 · 계약 · 분석 어휘 삭제 · Meta 앱 게시 · Apple Services ID 설정(대시보드 작업) ·
  전화번호 수단(지금처럼 숨김) · 「기록 지우기」 · 비회원 계정 삭제(삭제할 계정이 없다) · 로그인 화면 문구(안내 모달의 네 문구는 제외 — D1) · 가입 설득 카피 · 온보딩 변경 · 안내 모달 노출 횟수 측정(확인 필요 10) ·
  수단 성공을 보고 정책을 스스로 고치는 **자동 플립(B)** · 정책 즉시 재조회(개정 3 scope_out — 앱 시작마다 받으므로 다음 실행부터 반영).
- 이어받는 결정(결정 문장은 바꾸지 않는다 — 각 ADR에 적용 기록 ⟨2026-11-06⟩):
  [ADR-0028](0028-social-oauth-web-authentication.md)(Facebook · Android Apple은 버튼은 그대로 서고 **누르면 인증 창 대신 사용 불가 안내** — 결정 · 코드 · 어휘는 그대로),
  [ADR-0029](0029-product-analytics-posthog.md) D8(비회원 구간 식별 0) · D14(`entry_login_method_selected.method` 값 +1, 이름 수 변경 0),
  [ADR-0032](0032-account-sign-out-and-deletion.md) D6(키 표 세 행),
  [ADR-0034](0034-server-push-notifications.md) D4(비회원은 진입 끝에서 묻지 않는다 · 「진입 흐름의 끝」 셋째 자리),
  [ADR-0059](0059-learner-profile.md) D3 · D7(손님 칸이 비회원 구간 전체에 산다 · ① 이름 · ② 나라를 비회원도 지난다),
  [ADR-0062](0062-progress-cache-first.md)(비회원 미전송 칸이 로그인 때 사용자 미전송 칸에 합쳐진다),
  [ADR-0069](0069-returning-learner-login.md)(설정에서의 비회원 로그인은 판정을 지나지 않는다),
  [ADR-0086](0086-app-version-and-forced-update.md) D3(개정 3 — 같은 `app-policy.json`에 선택 칸 `unavailable_login_methods`가 더해진다 · `schema` 불변 · 칸 모양이 틀리면 칸만 무시).

**왜 새 번호인가** — 진입 흐름의 전이 표([진입 흐름 계약](../specs/entry-flow.md) §3) · 세션 저장 자리(ADR-0029 D8이 가리키는 `storeSession`) · 설정 행 구성(ADR-0032 D8) · 분석 값(ADR-0029 D14) ·
알림 묻는 자리(ADR-0034 D4) 위에 코드 · 테스트 · 측정이 이미 지어졌고, 이 변경이 그 결정 여럿을 **한꺼번에** 건드린다(ADR README 「형식」의 둘째 줄). 0103은 비어 있지만 재사용하지 않고(「형식」 첫째 항목), 0106이 마지막이던 아침에 0107로 썼으나 같은 날 [ADR-0107](0107-app-body-font-duru-sans.md)(글꼴 · #386) · [ADR-0108](0108-choice-romanization.md)(보기 로마자 · #388) · [ADR-0109](0109-haptic-feedback.md)(진동 · #390) · [ADR-0110](0110-app-version-in-analytics.md)(앱 버전 속성 · #389)이 먼저 병합되어 **0111**로 옮겼다.

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/` 기준) · **[실측]** 빌드 · 테스트 실행 · PostHog 조회 · **[사용자]** 사용자 발화 · **[추론]** 관찰 없이 이어 붙인 것.
계약의 정본은 저장소 밖 작업 폴더의 spec이고 이 문서는 그중 **결정**만 옮긴다. 시그니처는 코드가 진다.

## 맥락

1. **로그인 수단 둘이 죽어 있다** [실측 — PostHog, 2026-11-06 조회]. 2026-10-20 이후 로그인 화면에서 **Facebook 흐름을 시작한 930건 · Android의 Apple 흐름 95건** 가운데 **완료가 0건**이다.
   같은 기간 로그인 화면에 닿은 사용자 가운데 로그인에 성공한 비율은 **55 %**다. 사용자의 **63 %가 필리핀 · 27 %가 인도**(로그인 화면 기준)다 — Facebook 비중이 큰 시장이다.
2. **원인은 저장소 밖에 있다** [추론 — 대시보드 상태]. Facebook은 Meta 앱이 게시 전(테스터가 아닌 계정은 거절)이고, Android의 Apple은 웹 OAuth 경로(ADR-0039)인데 Supabase Apple 제공자에
   Services ID가 없다. 둘 다 코드가 아니라 대시보드 작업이고, 언제 끝날지 이 저장소가 정하지 못한다 — 그래서 **임시**다.
3. **플랫폼은 이미 내려온다** [코드]. 호스트 globalProps `appVersion.platform`(`lib/app-version.ts` `AppPlatform = "ios" | "android"`, 없으면 `null` — Explorer · 테스트)이 `ScreenWiring.appVersion`으로 화면 결선에 있다.
4. **비회원이 서버에 닿지 않게 하는 장치는 대부분 있다** [코드]. `syncPushDevice({ ask })`는 `loadAuthSession() === null`이면 첫 줄에서 돌아가고(알림 권한을 묻지 않는다 — 코드 변경 0),
   `authorizedRpc`는 세션이 없으면 요청 없이 `null`이다. 다만 진행 동기화 객체(`createJourneyProgressSync`)는 세션 없이 세우면 `load` 실패 → 재시도 루프 · 맵의 「확인 실패」 줄이 선다 —
   **비회원에게는 그 객체를 만들지 않는 것**이 RPC 0건의 보장이다.
5. **손님 프로필 칸은 이미 이관된다** [코드]. `libitum.learner-profile.guest` → 사용자 칸은 `createLearnerProfileSync`가 한다(ADR-0059 D3). 진행 · 학습일에는 그런 이관이 없다.
6. **서버의 연속 학습일 규칙**(ADR-0035): 오늘 했으면 오늘까지, 아니면 어제까지 이어진 날 수, 둘 다 없으면 0. 비회원의 기기 계산이 같은 규칙이어야 로그인 뒤 수가 바뀌지 않는다.
7. `AppSession.tsx` · `entry-wiring.ts`가 **각 300줄**(상한)이다 [코드] — 새 줄을 더하려면 먼저 떼어야 한다.
8. **인증 창 안의 실패를 앱은 알 수 없다** [코드 — ADR-0028 D1 · D2]. 창은 제공자의 것이고 사용자가 닫으면 `cancelled`만 온다 — 「에러 뜨면 모달」을 글자 그대로 하려면 Meta의 거절 페이지를 먼저 보여 준 뒤에야 모달이 설 수 있고, 그 순간을 잡을 신호도 없다(개정 2의 D1이 「누르는 즉시」인 이유). 같은 이유로 수단이 **살아났는지**도 앱은 스스로 알 수 없다 — 되살리기는 사람이 정하는 스위치여야 한다(개정 3).
9. **앱 정책 파일은 이미 앱 시작마다 받아 기기에 저장된다** [코드 — ADR-0086 D3]. `lib/app-policy.ts`의 디코더 · `loadStoredAppPolicy()`는 순수이고 결선이 이미 import한다. 상수 두 줄을 비우는 되살리기는 앱 재배포 · 스토어 심사를 거쳐야 한다 [사용자 지적, 2026-11-06] — 그 창을 서버 쪽 플래그 하나로 닫을 자리가 이 파일이다. ⚠ 2026-11-06 현재 버킷에 그 파일은 **없다**(`storage.objects` 조회).

## 결정

### D1. 수단을 숨기지 않고, 누르면 **「사용 불가 안내」 모달**을 띄운다 — 사용 불가 목록의 정본은 **앱 정책 파일**이고 상수는 기본값, 코드 · 계약 · 어휘는 그대로다 (개정 2 · 개정 3 — 2026-11-06, 사용자 결정)

- **버튼은 셋 다 선다**(두 플랫폼 — Apple · Google · Facebook, `socialLoginMethods` 상수 하나 · `LoginSocialMethods`는 `methods` prop을 그대로 순회). 사용 불가 수단을 누르면 **인증 요청 0건으로** 안내 모달이 뜬다 — 「지금은 이 수단으로 로그인할 수 없다 · 새 설정으로 옮기는 중 · Google로 계속하거나 계정 없이 진행하라」.
- **사용 불가 목록 한 곳** — `screens/login/login.ts`: 상수 `productUnavailableLoginMethods = ["facebook"]`(두 플랫폼) · `androidUnavailableLoginMethods = ["apple"]`(Android만), 순수 함수 `unavailableLoginMethods({ platform, unavailable })`(둘의 합집합 — 어휘 순서 · 중복 없음 · 입력 불변 · `platform`이 `null`이면 플랫폼 몫은 없다) ·
  `isLoginMethodUnavailable(method, input)` · `unavailableSocialLoginMethods(platform, unavailable = productUnavailableLoginMethods)`(`phone` 제외) · `unavailableDialogActions(copy)`. ~~되돌리기는 **상수 비우기** — 비우면 모달 없이 지금처럼 인증 창이 열린다.~~ 개정 3: 상수는 **정책이 없을 때의 기본값**이다 — 아래.
- **정본은 정책, 상수는 기본값**(개정 3 · 사용자 결정 「A로 진행」). 버킷 `app-policy.json`(ADR-0086 D3)의 선택 칸 `unavailable_login_methods: { "all": [...], "android": [...] }`를 `lib/app-policy.ts`가 `AppPolicy.unavailableLoginMethods?`로 디코드한다 — 키 없음 · object 아님이면 필드 없음(**정책 전체는 유효** — `min_build` 판정 불변), `all` · `android`는 각각 없거나 배열이 아니면 `[]`, 모르는 이름 · 문자열 아닌 원소는 버리고 중복 없이 어휘 순서. `schema`는 `app-policy-1` 그대로(호환 변경) · `app-policy-refresh.ts` 변경 0.
  판정은 `login.ts`의 `unavailableLoginMethodsFor(platform, policy)` — 칸이 있으면 `all ∪ (Android면 android)`, 없으면 위 상수 경로 — 와 `unavailableSocialLoginMethodsFor`(`phone` 제외). 결선 `ScreenWiring.unavailableSocialMethods()`가 렌더 때 `loadStoredAppPolicy()`로 저장본을 읽어 만들고, `LoginScreenProps.platform`은 **`unavailableMethods: readonly SocialLoginMethod[]`**(플랫폼 · 정책이 이미 반영된 목록)로 바뀌었다 — 훅 `use-login-unavailable`은 `includes`로만 판정한다. 진입 로그인 · `guest-login` 둘이 같은 함수를 지난다.
  되돌리기는 **정책에서 이름을 지우고 다시 올리는 것** — 앱 배포 0, 다음 실행부터(앱 시작마다 받는다 — 즉시 재조회는 하지 않는다). 절차 · 첫 파일 · 덮어쓰기 명령은 [정책 파일 스펙](../specs/app-update-policy.md) 「되살리기」. ⚠ 2026-11-06 현재 버킷에 파일이 없어 지금 적용되는 것은 상수 기본값이다(확인 필요 12).
- **언제 띄우나 — 누르는 즉시, 인증 창은 열지 않는다** [추론, 맥락 8]. 실패 페이지를 먼저 보여 준 뒤 모달을 띄우는 쪽은 더 나쁜 경험이라 고르지 않았다. 판정은 화면 로컬 훅 `use-login-unavailable.ts`가 한다 — 사용 불가면 `onSelectSocialMethod`를 **부르지 않고** `notice = method`, 아니면 지금 그대로. 요청 중(`requesting`)에는 지금처럼 탭 무시(모달도 뜨지 않는다).
  분석 이벤트는 결선이 `onSelectSocialMethod` 안에서 내므로, 사용 불가 수단의 탭은 `entry_login_method_selected`를 **내지 않는다**(모달 노출 자체도 재지 않는다 — 확인 필요 10).
- **모달의 모양** — ui-lynx `Dialog` 기존(settings 로그아웃 대화상자와 같은 패턴 · 새 토큰 0 · 새 CSS 규칙 0), 컴포넌트 `LoginUnavailableDialog.tsx`, 래퍼 `data-testid="login-screen-unavailable-dialog"`(새 test-id 1).
  제목 `login.unavailable.title(제공자 이름)`(`socialProviderName` — Apple · Google · Facebook, 상표라 번역 없음; en `{provider} sign-in is temporarily unavailable`. 버튼 라벨을 넣으면 「Connect with Facebook sign-in is …」 비문 — 접근성 R1 정정 2026-11-06) · 설명 `login.unavailable.description`(en `We're moving this sign-in to a new setup. For now, continue with Google or without an account.` — 비회원 버튼이 없는 `guest-login`에서는 `descriptionWithoutGuest` 「… please continue with Google.」, 접근성 R3) ·
  액션 둘 — **「Connect with Google」**(화면의 Google 버튼 라벨 `loginMethodLabel("google")` 재사용 — 같은 동작 같은 이름, 접근성 R2; `use-google` · brand → 닫고 `google` 탭과 같은 경로 = `onSelectSocialMethod("google")`) · **「Close」**(`close` · subtle → 닫기). 시스템 뒤로가기(`useLayerBack` — 국가 시트와 같은 훅) = 닫기. 떠 있는 동안 뒤 화면은 `accessibility-elements-hidden`(Dialog 기존 규칙, ADR-0016 D9).
  새 copy 키 **넷**(`login.unavailable.title · description · descriptionWithoutGuest · close`, 다섯 언어 동시 — 대가 8). 모달 안에 비회원 동작은 두지 않는다 — 화면에 이미 「Continue without an account」가 있다.
- **설정에서 연 로그인(`guest-login`, D5)도 같다** — 같은 `LoginScreen`이라 같은 모달이 선다(결선 · 분석 변경 0). 모달의 「Connect with Google」은 그 화면의 Google 경로(D6)로 간다.
- `EntryLoginMethod` 넷 · `entryLoginMethods` 순서 · `oauthProviderFor` · `socialLogo` · Facebook · Apple의 코드 · 계약 · 분석 어휘 · Airbridge 매핑은 **변경 0**이다.
- 왜 `lib/entry-flow.ts`가 아니라 `login.ts`인가 — 「전화번호를 잠시 숨긴다」(`productPhoneSignIn`, ADR-0027 D7)와 같은 성격의 **제품 표시 결정**이고 그 선례가 여기 있다. 어휘는 바뀌지 않는다.
- 테스트는 `unavailable` 입력으로 **사용 불가 · 복원 두 상태를 모두** 본다 — 되돌리는 날 테스트를 고치지 않는다. 개정 3은 정책 입력으로 셋째 상태(정책이 비운 목록 · 정책이 다른 수단을 막는 목록)를 더 본다 — unit AP-U1 ~ U5 · LG-P1 ~ P4, ui LG-D7, integration GE14 · GE14b · GE14c.
- **개정 1(같은 날 아침)은 「표시 목록 제외」였다** — `visibleLoginMethods` + `productHiddenLoginMethods` · `androidHiddenLoginMethods`로 버튼을 숨겼다(unit 4,700 · ui 2,113 · integration 741로 green). 사용자가 되돌렸고(머리의 둘째 발화) 그 다섯 export는 삭제됐다 — 버린 대안 10.

### D2. 비회원은 기기 표식 하나로 서고, 세션이 표식을 이긴다

- 새 모듈 `lib/guest-session.ts`: 저장 키 **`libitum.auth.guest`**, 값은 `"1"` 하나(ADR-0032 D6 키 표의 행). `loadGuestSession` · `saveGuestSession` · `clearGuestSession`은 `auth-session.ts`와 같은 꼴이고 저장소가 없어도 던지지 않는다.
- 앱이 「누구로」 도는가 — `AccountState = "signed-out" | "guest" | "signed-in"`(`accountStateFrom(session, guest)`). **세션이 있으면 표식과 무관하게 `signed-in`**이고, 둘 다 없으면 `signed-out`(진입 구간)이다.
  첫 값은 `app/use-account-state.ts`가 저장소에서 읽고, 전이는 결선이 setter로 적는다(D3 · D7).
- 스플래시: `entryAuthStateFrom(session, guest?)`에 셋째 갈래 `{ kind: "guest" }`(세션 없음 + 표식) — **갱신 요청 없이** 비회원 진행(D4)을 세우고 곧 `enterApp`이다. `entry_*` 이벤트 · `syncPushDevice` · 프로필 동기화는 0이다
  (손님 칸은 `useLearnerProfile`의 마운트 효과가 이미 읽는다). 강제 업데이트 판정(ADR-0086)은 지금처럼 이 분기 **앞**이다. 둘째 인자 기본값이 `false`라 기존 호출은 그대로다.
- 표식을 지우는 자리는 셋 — 세션 저장(D7) · 로그아웃 · 계정 삭제 뒤처리(`account-wiring.ts` `leave()` — **있을 때만** 지우는 방어, 정상 경로에서는 이미 없다). 「기록 지우기」는 만들지 않는다.

### D3. 「비회원으로 계속」 — 로그인 화면 소셜 묶음 아래 한 줄, 누르면 네트워크 0건으로 ① 이름이다

- 자리와 모양(디자인 결정): ui-lynx `Button` **`text` · `l` · `fill`** — 소셜 묶음 **밖**(부모 gap만, 「or」 구분 없음), 소셜 실패 문구 **아래** · 약관 안내 **위**. 라벨 정본 **"Continue without an account"**(`login.guest`, 다섯 언어 동시).
  로딩 · disabled 시각 없음 — 전이가 동기라 로딩이 없고, 소셜 요청 중에는 기존 `guard`로 **탭만 무시**한다(`text` disabled 라벨은 대비 1.13:1이라 버튼이 사라진 것처럼 보인다). 새 토큰 0 · **새 CSS 규칙 0** · ui-lynx 변경 0.
  `LoginScreenProps` + `platform` · `guestSignIn("visible" | "hidden")` · `onContinueAsGuest`. test-id `login-screen-method-guest`.
- `app/guest-wiring.ts` `onContinueAsGuest` — **순서가 계약이다**: ① `saveGuestSession()` → ② `setAccountState("guest")` → ③ `startGuestProgress()`(D4) → ④ `entry_login_method_selected { method: "guest" }` →
  ⑤ `entry_screen_viewed { screen: "learner-name" }` → ⑥ `push(learner-name, initialName)`(`initialName` = 기기 기록의 이름 → 무작위 이름; 세션이 없어 표시 이름 단계는 없다).
  세션 저장 · 식별 · 기존 회원 판정 · 프로필 동기화 · 푸시는 **0**이다.
- 그 뒤 ② 나라 → 언어 선택 → 여정 입장 → `enterApp`은 **기존 `entry-wiring` 콜백 그대로**다 — ② 나라의 `saveLearnerProfile`은 동기화 객체가 없어 손님 칸에 쓰고(지금 코드의 분기 — 변경 0),
  여정 입장의 `syncPushDevice({ ask: true })`는 세션이 없어 즉시 돌아온다(알림 다이얼로그가 뜨지 않는다 — 맥락 4).

### D4. 비회원의 진행 · 학습일은 **기존 미전송 칸을 `id = "guest"`로** 쓰고, 동기화 객체 대신 저장 객체를 세운다

- 새 키 형식을 만들지 않는다. `libitum.progress.pending.guest` · `libitum.learning-days.pending.guest`(`guestProgressId = "guest"`, `app/guest-progress.ts`). Supabase 사용자 ID는 UUID라 충돌하지 않는다.
  `cached` 칸은 쓰지 않는다 — 서버 확인본이 없다. `pending-*` · `cached-learning-progress.ts` · `journey-progress-sync.ts` · `learning-day-sync.ts`는 **변경 0**이다.
- `app/guest-progress-store.ts`의 `createGuestProgressStore` · `createGuestLearningDayStore`는 `createJourneyProgressSync` · `createLearningDaySync`와 **같은 반환 모양**(`ProgressSyncHandle` · `LearningDayHandle` — 기존 반환 타입에 이름을 붙인 것)이라
  `use-journey-progress`가 둘을 같은 자리(`sync.current` · `days.current`)에 둔다. **RPC 0건 · 재시도 없음.** `flush()`는 첫 호출에서 `onLoadSettled("loaded")` 한 번 — 첫 유닛 안내 · 업데이트 안내 조건이 지금처럼 산다.
  `isCurrent()` = `!disposed && loadGuestSession() && progressUserId() === null` — 세션이 서면 곧 거짓이 되어 늦은 `capture`가 사용자 진행을 덮지 않는다. `capture`는 JSON이 마지막 것과 다를 때만 쓴다.
- 연속 학습일은 기기에서 **서버 규칙 그대로** 센다 — 순수 `learningStreakOf(days, today)`(맥락 6; 중복 · 순서 무관, 형식이 틀린 날 무시) · `previousLocalDay`(월말 · 연말 · 윤년). 기록은 `record(day)` → 대기열에 더해 쓰고 축하와 함께 적용.
- `startGuestProgress`(`use-journey-progress`): 이미 비회원 객체면 no-op. 다른 객체가 있으면 계정 전환과 같은 되돌림(dispose · 초기 상태 · 연속 0 · 축하 · 범프 · 설문 · `recordingDay` 초기화) 뒤 세운다. `syncFromServer`는 변경 0 —
  `sync.current.userId`(`"guest"`)가 새 `userId`와 달라 지금 코드의 전환 분기가 비회원 객체를 버리고 사용자 객체를 세우며, 사용자 객체는 `readPendingProgress(userId)`에서 **옮겨 둔 비회원 진행**(D6)을 읽어 적용한다.
- **비회원에게 에피소드 설문을 내놓지 않는다** — `episodeSurvey`는 비회원 객체가 서 있으면 `null`(`submit_feedback` RPC 0건). `markEpisodeSurveyDone`도 부르지 않으므로 로그인 뒤 다음 완료에서 묻는다(기존 규칙). 로그인 유도 창은 만들지 않는다.

### D5. 설정 — 비회원은 서버 행이 필요한 둘을 숨기고, 계정 동작은 「Sign in」 한 행이다

- `settingsNavTargetsFor(account)`: `signed-in` → 여덟 그대로, `guest` → **`notifications` · `feedback`을 뺀 여섯**(`profile` · `learner-profile` · `language` · `download` · `privacy-policy` · `terms-of-use`). 순서 유지.
  `SettingsAccountState = Exclude<AccountState, "signed-out">` — 설정은 앱 구간이라 `signed-out`은 오지 않는다(오면 `signed-in`으로 읽는 방어).
- `accountActionsFor(account)`: `guest` → `["sign-in"]`, `signed-in` → `["sign-out", "delete-account"]`(지금 `accountActions` 상수와 같은 값 — AX1 유지). 「Sign in」(`settings.action.sign-in`, 다섯 언어)은 일반 navigation 셀 · 아이콘 없음 ·
  **확인 대화상자 없음**(되돌릴 수 있는 동작) · 실패 문구 없음. 전이표에 한 줄 — `idle` + `open(sign-in)` → `idle` · 효과 `sign-in`. test-id `ui-lynx-settings-group-item-sign-in`.
- 「Sign in」은 `entry_screen_viewed { screen: "login" }` → **새 route `{ name: "guest-login" }`를 설정 탭 스택에 `push`**한다(탭 바가 숨는다). 화면은 같은 `LoginScreen`이고 `guestSignIn: "hidden"` · `phoneSignIn: "hidden"`(**고정** —
  전화번호의 코드 검증 route는 진입 스택 전용 전이(① 이름 `push`)를 타므로 설정 스택에서는 열지 않는다) · 뒤로는 `back`(설정). `EntryScreen` 타입(아홉)은 바뀌지 않는다 — `guest-login`은 진입 route가 아니다.
- `learnerProfileSummary`는 지금 로직 그대로 — 비회원은 `learnerSync`가 `"none"`(`useLearnerProfile`의 `signedIn`은 동기화 객체 콜백에서만 참)이라 **「기기에 저장됨 · 온라인이면 올림」 꼴의 동기화 대기 문구가 붙지 않고** 이름 · 나라만 선다 [코드] (접근성 점검 #3 정정 2026-11-06). 비회원의 `Language` · `Downloads` · 롤플레이 · 티켓 · 젬은 지금 동작 그대로(기기 상태 · 공개 콘텐츠).

### D6. 설정에서의 로그인 성공 — 이관은 **세션 저장 전**, 판정 없이 **설정 루트**로 돌아온다

`guestWiring.onSelectGuestSignInMethod(method)` — `signInWithSocialProvider(oauthProviderFor(method))`가 `signed-in`이면 **순서가 계약이다**:

| 순서 | 무엇 | 왜 |
|---|---|---|
| ① | `userId = authUserIdFrom(accessToken)`; `userId !== null`이면 **`adoptGuestRecords(userId)`** | 비회원 칸을 그 사용자의 미전송 칸으로 옮긴다 — 진행은 `mergeJourneyProgress(user, guest)`(한쪽만 있으면 그쪽), 날짜는 합집합(중복 없음 · 오름차순). 옮긴 뒤 비회원 칸을 지운다. 저장소 예외는 삼킨다. 세션 저장 **전**이어야 D7의 진행 동기화가 옮긴 칸을 읽는다 |
| ② | `storeSignedInSession(session, …)`(D7) | 세션 저장 · 표식 삭제 · `signed-in` · 진행 동기화 시작(옮긴 칸을 읽어 ADR-0062 규칙으로 서버와 합친다) · 식별 |
| ③ | `entry_login_method_selected { method }` | 진입 흐름과 **같은 이벤트 · 같은 모양** — `source` 속성을 더하지 않는다(D8) |
| ④ | `void syncLearnerProfile()` | 판정이 없으므로 바로 — 손님 칸이 `pending`으로 이긴다(ADR-0059 D3 그대로) |
| ⑤ | `dispatch({ type: "backToRoot" })` | 설정 루트. 사용자가 설정에서 떠났으니 설정으로 돌아온다 — 언어 선택 · 여정 입장 · 기존 회원 판정(ADR-0069)은 **지나지 않는다**(이미 앱 구간) |
| ⑥ | `void syncPushDevice({ ask: true })` | ADR-0034 D4 「진입 흐름의 끝」 **셋째 자리** — 비회원이 건너뛴 그 질문을 서버 행이 생긴 지금 묻는다(미요청일 때만 다이얼로그) |

- `cancelled` · `failed`는 결과 그대로 — 저장 · 이벤트 · 전이 0. 토큰에 `sub`가 없으면(`userId === null`) **옮기지 않고** ②부터 진행한다(비회원 칸은 남는다 — 「확인 필요」 3).
- **App 세션을 재시작하지 않는다**(`leaveApp` · `signedOutNav` 아님) — 떠나는 것이 아니라 같은 사람이 계정을 얻는 것이고, 재시작하면 진행 · 알림 · 젬 상태가 처음 값으로 돌아간다.
- 「서버와 합치기」를 새로 쓰지 않는다 — 옮긴 뒤 `createJourneyProgressSync(userId)`가 지금 규칙(ADR-0062: 기기 값 먼저 → 서버 불러와 `mergeJourneyProgress` → 덮이지 않은 것은 저장)으로 올린다.
  그 계정에 서버 기록이 있으면 **합쳐지고**, 학습일은 `record_learning_days`가 멱등 저장한다(ADR-0035 D6). `entry_returning_learner_entered`는 0이다.

### D7. 세션 저장은 **한 자리** — `storeSignedInSession`

새 모듈 `app/store-session.ts`(지금 `entry-wiring.ts`의 `storeSession`을 떼어 낸 것 + 두 줄). 순서: `saveAuthSession(session)` → **`clearGuestSession()`** → `setAccountState("signed-in")` → `void syncProgress()` →
`authUserIdFrom` → `analyticsUser?.identify(userId)`(실패 삼킴). 부팅 갱신 · 소셜 · 코드 검증 · 비회원 로그인 **넷이 이 함수 하나**를 부른다. ADR-0029 D8의 「세션을 저장한 직후 `identify`」는 이 함수 안으로 옮겨졌고 자리는 같다.
300줄 분할의 둘째는 `app/use-session-catalog.ts`(`AppSession`의 `useMemo` 둘 — `episodeContent` · `catalogSections`)다. 새 모듈 어느 것도 `"background only"` 라이브러리를 값으로 import하지 않는다.

### D8. 측정 — 이벤트 이름 0 추가, `method` 값 하나

`EntryLoginChoice = EntryLoginMethod | "guest"` — `entry_login_method_selected.method`에 `"guest"`가 더해진다. `EntryReturningLearnerEnteredEvent.method`는 `EntryLoginMethod` 그대로(비회원은 판정을 지나지 않는다).
이름 수 변경 0 — `AnalyticsContractChecks`가 그대로 통과한다. 비회원 구간은 **익명 distinct id**로 간다(식별 호출은 세션 저장 자리에만 — D7).

| 지표(요구사항) | 무엇으로 재나 |
|---|---|
| 로그인 화면 → 비회원 선택 비율 | 분모 `entry_screen_viewed { screen: "login" }`, 분자 `entry_login_method_selected { method: "guest" }`(표식 저장 직후 1회 — D3 ④) |
| 비회원 → 로그인 전환율 | 같은 기기(익명 distinct id)의 `method: "guest"` 뒤 PostHog `$identify`(`storeSignedInSession`의 `identify`) |
| 비회원의 첫 유닛 완료율 | 기존 유닛 완료 이벤트(`episode_lesson_finished` 등) 그대로 — 새 속성 0, 익명 id로 간다. 로그인 사용자와 비교 |

설정에서의 로그인은 같은 이벤트 · 같은 모양이다 — 「화면 출처 `settings`」 속성은 **채택하지 않았다**(이벤트 모양이 바뀌어 퍼널 해석이 단절된다 — ADR-0069 Q3와 같은 판단).

## 테스트 계층 적용 판정 (ADR-0038)

| 계층 | 판정 | 볼 것 | 결과 [실측] |
|---|---|---|---|
| unit | 적용 | 사용 불가 목록 LG-A1 ~ A6(`unavailableLoginMethods` 기본 입력 iOS = [facebook] · android = [apple, facebook] 어휘 순서 · null 플랫폼 = iOS · 비운 입력 · 입력 불변 · `isLoginMethodUnavailable` · `socialLoginMethods` 셋) · **개정 3** 정책 칸 디코드 AP-U1 ~ U5(`lib/app-policy.unit.test.ts` — 칸 없음 → 필드 없음 · 정상 · object 아님 → 필드 없음 + `min_build` 유지 · 배열 아님 → 그 키만 `[]` · 모르는 이름 · 중복 · 어휘 순서) · 정책 판정 LG-P1 ~ P4(`unavailableLoginMethodsFor` — null 정책 = 상수 · 빈 배열 = 없음 · android 분기 · phone 제외) · 표식 · `accountStateFrom` · `entryAuthStateFrom` 셋째 갈래 · 연속 규칙 · 합치기 · 이관 · 저장 객체의 current · capture · settle · 설정 행 · 전이표 한 줄 · 이벤트 팩토리 · `storeSignedInSession` 순서 · 비회원 결선 넷 · 스플래시 guest 갈래 | 4,807 / 4,807 |
| ui | 적용 | `LoginScreen` 비회원 버튼 · `hidden` 미렌더 · 소셜 셋(두 플랫폼) · 요청 중 무동작 · `LoginSocialMethods` `methods` 순회 · **사용 불가 모달 LG-D1 ~ D5**(Facebook 탭 → 모달 · `onSelectSocialMethod` 0회 · 제목에 제공자 이름(버튼 라벨 아님) / 「use-google」 → 닫힘 + `google` 1회 / 「close」 · 뒤로가기 → 닫힘 · 호출 0 / Android Apple 탭 → 모달 · iOS Apple 탭 → 인증 / 요청 중 탭 → 모달 0), `SettingsScreen` 비회원 행 구성 · 「Sign in」 행 · 로그인 사용자 회귀 · **개정 3** LG-D7(`unavailableMethods: []` → facebook 탭 → `onSelectSocialMethod("facebook")` 1회 · 대화상자 0; LG-D 전부 `unavailableMethods` prop으로 — 기본 `["facebook"]` · Android `["apple","facebook"]`) | 2,146 / 2,146 |
| integration | 적용 | `App.guest-entry*.integration.test.tsx` GE1 ~ GE13 — 비회원 완주(fetch 0 · 저장 키) · 유닛 완료 → 기기 저장 · RPC 0 · 재실행 → 바로 맵 · 설정 행 · 설정 로그인 → 이관 · 세션 · 식별 · `backToRoot` · 서버 합치기 · 재실행 세션 갱신 · 비회원 설문 없음 · **GE13 Facebook 탭 → 모달 · fetch · 인증 창 0 → 「use-google」 → Google 인증 창 1회**(GE1 Android Apple 탭 · GE6 `guest-login`에서 같은 모달). 기존 `App.entry` · `App.returning-login`의 수단 순회 줄은 사용 불가 수단을 제외 · **개정 3** GE14(저장소 `libitum.app-policy` = `{schema, min_build:{}, unavailable_login_methods:{all:[],android:[]}}` → iOS Facebook 탭 → 대화상자 0 · 웹 인증 창 1회(facebook 인자)) · GE14b(정책 있음 · 칸 없음 → 상수 기본 → 대화상자) · GE14c(정책이 `google`을 막으면 Google 탭도 대화상자 — 목록은 정책이 정한다) · GE13은 정책 없음 그대로. test-helpers `content` 옵션(콘텐츠 버킷 파일 서빙 — 정책 refresh가 404로 저장본을 지우는 것을 막음) | 764 / 764 |
| e2e | 적용(수동) | [비회원 진입 e2e](../e2e/guest-entry.md) GE-E1 ~ E8 — 기기에서만 보는 것: 실제 Android 호스트의 Apple 탭 → 안내 모달(플랫폼 값) · 실기의 Facebook 탭 → 모달 · 「Connect with Google」로 Google 창 · 실제 Google 로그인으로의 이관과 Supabase 행 · 알림 다이얼로그 타이밍 · 네트워크 0건(프록시) · 재설치 뒤 비회원 기록 소멸(의도) · **개정 3** GE-E9(버킷에 `all: []` 정책 업로드 → 완전 종료 · 재실행 → Facebook 탭이 인증 창 · 되돌려 올리면 다시 대화상자) | **미실행** |

## 버린 대안

1. **Facebook 코드 · 계약 · 어휘 삭제** — 되돌릴 때 코드 · 테스트 · Airbridge 매핑을 다시 세워야 한다. 임시 조치에 맞지 않는다(D1).
2. **`progressUserId()`가 비회원에게 `"guest"`를 돌려주어 기존 동기화 객체를 그대로 쓰기** — 세션이 없어 `load` 실패 → 재시도 루프 · 맵의 「확인 실패」 줄(맥락 4). 요구사항 「RPC 0건」과 맞지 않는다(D4).
3. **비회원용 새 저장 키 형식**(요구사항 data_state) — 기존 `pending.<id>` 칸에 `id = "guest"`로 충분하고, 이관 · 합치기 · 지우기 함수가 그대로 쓰인다(D4).
4. **새 분석 이벤트 이름**(`entry_guest_continued` 등) — 값 하나(`method: "guest"`)로 같은 퍼널에서 읽힌다(D8). 설정 로그인에 `source: "settings"` 속성 — 이벤트 모양이 바뀐다.
5. **비회원에게 로그인 유도 창**(알림 · 피드백 · 설문 자리) — 새 화면 · 문구가 늘고 임시 조치의 범위를 넘는다. 행을 숨긴다(D4 · D5).
6. **로그인 성공 뒤 여정 맵으로 복귀**(요구사항 「설정으로 돌아오고(또는 맵)」) — 사용자가 설정에서 떠났으니 설정으로 돌아온다(D6 ⑤). 맵을 원하면 `backToRoot` 대신 `tabRootActions("journey")` 두 액션 — 한 줄이다(「확인 필요」 2).
7. **비회원 로그인을 App 세션 재시작(`leaveApp`)으로** — 진행 · 알림 · 젬 상태가 처음 값으로 돌아간다. 같은 사람이 계정을 얻는 것이라 재시작이 아니다(D6).
8. **비회원도 기존 회원 판정(ADR-0069)을 지나기** — 이미 앱 구간이고 언어 선택 · 여정 입장을 다시 지날 자리가 없다. 서버 기록 유무와 무관하게 합치기 규칙(ADR-0062)이 같은 결과를 낸다(D6).
9. **서버 쪽 비회원 저장**(익명 사용자 · 기기 ID 행) — 서버 · 마이그레이션 변경 0이 제약이고, 기기를 바꾸면 사라지는 것을 의도로 받았다(scope_out).
10. **수단 숨기기 — 표시 목록에서 Facebook(두 플랫폼) · Apple(Android)을 빼기**(개정 1 · 같은 날 구현 · green까지 갔다). **사용자가 되돌렸다** — 이유: 버튼이 사라지면 Facebook으로 쓰던 사용자에게 아무 설명이 없고, 「이관 중」임을 알리고 Google로 유도하는 쪽이 사용자에게 설명이 된다(D1). 「인증 창 안에서 에러가 난 뒤 모달」도 버렸다 — 앱이 그 실패를 볼 수 없다(맥락 8).
11. **수단이 살아난 것을 앱이 자동 감지해 모달을 거두기**(개정 3 검토) — 인증 창 안의 성공 · 실패를 앱이 못 본다(맥락 8). 모달을 띄우는 한 시도 자체가 없어 신호가 생기지 않는다. 사람이 끄는 스위치(정책 파일)만 둔다(D1).
12. **B — 자동 플립**(서버 정기 작업이 그 수단의 완료 1건을 보고 정책에서 지우기 · 모달에 「그래도 시도」 버튼) — 성공 1건이 나오기 전까지는 A(정책 플래그)와 결과가 같고, 서버 작업 · 버튼 하나가 더 든다. 사용자가 A로 정했다(2026-11-06) — 후속으로 미룬다(scope_out).

## 대가

1. **기기를 바꾸거나 앱을 지우면 비회원 기록이 사라진다** — 진행 · 학습일 · 이름 · 나라 전부 기기에만 있다(의도). 로그인하기 전까지 복구 수단이 없다.
2. **비회원은 에피소드 설문을 보지 않는다**(D4) — 그 구간의 설문 응답이 0이다. 로그인 뒤 다음 완료에서 묻는다.
3. **설정에서 연 로그인 화면(`guest-login`)에서는 전화번호 수단을 켤 수 없다**(D5 — `phoneSignIn` 고정 `hidden`). 전화번호를 되살리는 날 설정 스택용 코드 검증 route가 필요하다.
4. **비회원 → 사용자 전환 때 맵이 한 렌더 비어 보일 수 있다** [추론] — `use-journey-progress`의 계정 전환 되돌림(`apply(initial)`)이 돌고 바로 뒤 사용자 객체가 옮긴 미전송 칸을 읽어 다시 적용한다. 지금 계정 전환과 같은 성질이다. 통합 GE7에서는 체감되지 않았다.
5. **비회원 구간의 이벤트는 익명이다** — 전환율은 같은 기기의 `$identify`로만 읽힌다. 앱을 지우고 다시 설치하면 끊긴다(ADR-0029 D8 그대로).
6. **Facebook으로 가입한 계정이 있다면 지금 로그인 화면에서 들어올 수 없다** [추론] — 2026-10-20 이후 Facebook 완료가 0이라 그 뒤 가입은 없지만, 그 전에 가입한 계정이 있는지는 보지 않았다(「확인 필요」 4). 개정 2로 그 사용자에게는 적어도 「이관 중 · Google로」라는 설명이 선다.
7. **번들** [실측 — 측정 커밋 bda2be5f, 개정 2 포함]: main 3,915.6 kB(상한 4,060.0 kB — 개정 1 시점 3,910.1에서 모달 컴포넌트 · 훅 · 문구 셋 × 다섯 언어로 +5.5 kB) · ui-lynx 555.6 kB(상한 556.0 kB, 변경 0). 상한을 올리지 않았다. 런타임은 재지 않았다([보고서](../performance/reports/guest-entry-01.md)).
8. **문구 다섯 언어는 번역 초안이다**(`login.guest` · `settings.action.sign-in` · 개정 2의 `login.unavailable` 넷). 언어 검수 없음.
9. **Facebook(두 플랫폼) · Apple(Android) 사용자는 눌러 보고 나서야 안다**(모달 1회) — 버튼이 서 있으니 누르게 되고, 그때 「사용 불가」를 본다. 숨기기(버린 대안 10)보다 탭 한 번이 더 들지만 설명이 선다. 개정 1의 「비회원 길만 보인다」와 달리 Google 유도가 모달 안에 있다.
10. **정책 파일이 로그인 수단까지 쥔다**(개정 3) — 최소 빌드만 들던 `app-policy.json`에 잘못 올린 배열 하나가 **모든 사용자의 소셜 수단을 다음 실행부터 막을 수 있다**(`all: ["apple","google","facebook"]`이면 셋 다 대화상자 — 전화번호는 숨김이라 로그인 길이 없다). 코드가 막지 않는다 — 통합 GE14c가 「정책이 google을 막으면 Google도 대화상자」를 그대로 보여 준다. 방어는 정책 파일 스펙 「올리는 규칙」 2(배열을 눈으로 본다 · 올린 뒤 받아 본다)와 cacheControl 60초(되돌리면 1분 안에 엣지가 따라온다)뿐이다. 막는 방향의 실수가 치명적인 것은 `min_build`와 같다(ADR-0086 「올리는 규칙」 1).

## 확인 필요

1. ⚠ **[사용자] [추론] 일곱** — 사용자 부재 · 자율 진행으로 채택했다(머리). 특히 **Android의 Apple도 같은 안내**(데이터 95건 · 완료 0 — 별도 상수라 따로 되돌릴 수 있다)와 **알림 미요청**은 사용자 결정이 아니다. 개정 2에서 더해진 [추론] 둘 — **누르는 즉시 모달**(인증 창을 열지 않는다 — 맥락 8) · **모달 문구 네 줄의 영어 정본** — 도 사용자 확인 대상이다. [추론] 첫째(숨기기)는 사용자가 되돌렸다(버린 대안 10).
2. ⚠ **[사용자] 로그인 성공 뒤 복귀 자리 = 설정 루트**(D6 ⑤). 요구사항은 「설정(또는 맵)」이었다 — 맵을 원하면 한 줄(버린 대안 6).
3. **토큰에 `sub`가 없는 세션**(D6 ①)은 비회원 칸을 옮기지 않고 남긴다(표식은 지운다). 실제 Supabase 토큰에는 `sub`가 늘 있어 관찰되지 않는 경우다 [추론].
4. **Facebook으로 가입한 기존 계정 수**(대가 6) — PostHog · Supabase `auth.users`의 `provider`로 확인할 수 있다. 있으면 그 사용자에게 수단이 없다.
5. **통합 테스트가 전제한 둘**(GE9 · GE7, integration-design 보고) — 로그인 뒤 `libitum.learner-profile.guest` 칸이 지워진다는 가정(`createLearnerProfileSync`의 손님 칸 처리 — 코드 그대로) · 설정 로그인 성공 뒤 `register_push_device` **1회** 전제. 기기 회차(GE-E6 · GE-E7)가 본다.
6. **실제 Android 호스트가 `appVersion.platform = "android"`를 준다는 것**(D1) — 테스트는 값을 넣어 줄 뿐이다. GE-E2가 본다(Apple 탭이 모달이면 값이 왔고, 인증 창이면 `null`이다).
7. **문구 「Sign in」** — 계약 표 원안은 "Log in"이었고 ui-scaffold가 기존 「Sign out」과 짝으로 "Sign in"으로 정정했다(2026-11-06). 영어 정본 확정은 사용자 몫.
8. **계약과 코드가 다른 작은 점**(구현 보고 — 결정은 바꾸지 않는다): 새 CSS 규칙 1 → **0**(디자인 판정 「부모 gap만」 — 규칙을 두지 않았다) · `EntryWiringArgs`의 새 필드 둘은 scaffold에서 optional이었다가 integration에서 필수화 ·
   `use-account-actions`가 대화상자가 열리지 않는 `sign-in` 효과에서 `onLayerChange`를 부르지 않는다(공용 `useScreenLayer` 불변) · 분석 이벤트 이름 수는 계약 문서의 47이 아니라 **46**이다 [코드 — `analytics-event-names.ts`](변경 0은 같다) ·
   GE8의 합치기 기대는 `mergeJourneyProgress(guestState, serverState)`(동기화 객체는 기기 값 먼저 — ADR-0062 변경 0).

9. **약관 안내 lead 문구 변경(계약 밖 · 수용)** — 접근성 점검 #2: 비회원 길에서 「By signing up」은 거짓 문장이라 `legal.lead`를 「By continuing, you agree to the」로 다섯 언어 동시 바꿨다(db2a947c, spec §8-7). 요구사항 scope_out 「로그인 화면 문구 개편」 경계와 맞닿아 있어 사용자 확인 대상이다 — 되돌리면 다섯 파일 한 줄씩.
10. **안내 모달 노출을 재지 않는다**(D1 · 개정 2 scope_out) — 사용 불가 수단의 탭은 `entry_login_method_selected`를 내지 않고 새 이벤트도 없다(이벤트 이름 수 46 불변). 그래서 「Facebook을 누른 사람이 몇이고 그중 몇이 Google로 갔나」는 지금 읽을 수 없다 — 로그인 화면 → `method: "google"` 비율의 변화로 간접 추정만 가능하다. 재고 싶으면 이벤트 이름 하나(또는 `method` 값)가 필요하고, 그것은 ADR-0029 D14의 어휘 변경이다.

11. **접근성 후속(개정 2 점검 R4 · R5 · R6)** — ui 테스트 LG-D에 본문 가림 `true/false` · 액션 라벨 · traits · 「Connect with Google」 뒤 Google 버튼 `loading` 발화 단언이 없다(지금 트리에서 전부 참 — 회귀 가드만 비어 있다). 모달 열림 · 전이 뒤 초점과 최대 배율의 세로 넘침은 기기 몫([e2e](../e2e/guest-entry.md) GE-A6 · A7). Dialog 열림 발화 0 · 초점 이동 0은 이 앱의 Dialog 사용처 전부와 같은 규칙이라 ADR-0016 D8 적용 기록 한 줄이 남아 있다.
12. **버킷에 `app-policy.json`이 없다**(2026-11-06 `storage.objects` 조회 — ADR-0086 「후속」의 첫 업로드가 아직) — 개정 3의 정책 경로는 코드 · 테스트로만 확인됐고 **지금 사용자에게 적용되는 것은 상수 기본값**이다. 첫 업로드(지금 기본값을 그대로 적은 파일 — 정책 파일 스펙 「되살리기」)는 사용자 몫. 자동 플립 B(버린 대안 12)는 후속이고, 정책 즉시 재조회도 하지 않았다(다음 실행부터 — 켜 둔 앱은 바뀌지 않는다).

## 재검토 조건

1. **Meta 앱이 게시되면** → D1. 버킷 `app-policy.json`의 `unavailable_login_methods.all`에서 `facebook`을 지우고 다시 올린다(**앱 배포 없음** — 개정 3) — 다음 실행부터 모달이 사라지고 Facebook 탭이 인증 창을 연다. 실기에서 Facebook 완료 1건을 본 뒤 지운다 — 절차는 [정책 파일 스펙 「되살리기」](../specs/app-update-policy.md) · ADR README 보류 표 「Facebook · Android Apple 로그인 수단 되살리기」 · 기기 확인 GE-E9. 파일이 아직 없으면 먼저 첫 업로드(확인 필요 12). 상수 `productUnavailableLoginMethods`를 비우는 것은 그 뒤 앱 배포에 실을 정리다.
2. **Supabase Apple 제공자에 Services ID가 설정되면** → D1. 같은 파일의 `unavailable_login_methods.android`에서 `apple`을 지운다(앱 배포 없음). ADR-0039의 Android Apple 웹 OAuth 절차(e2e)가 다시 돈다.
3. **수단이 돌아온 뒤 비회원 진입을 유지할지** → D2 ~ D6. 비회원 선택 비율 · 전환율 · 첫 유닛 완료율(D8)로 정한다. 걷으면 `guestSignIn: "hidden"` 한 줄로 버튼이 사라지고, 표식이 남은 설치는 D2 갈래로 계속 맵에 들어간다 — 그 설치의 처리를 그때 정한다.
4. **전화번호 수단을 되살릴 때** → D5. `guest-login`의 `phoneSignIn` 고정 `hidden`과 설정 스택용 코드 검증 route를 함께 본다(대가 3).
5. **「기록 지우기」 · 비회원 계정 삭제 요구가 오면** → D2 · D4. 표식 · `pending.guest` 둘 · 손님 프로필 칸을 지우는 설정 행이 필요하다(ADR-0059 재검토 조건 4와 같은 날).
6. **기기 변경 때 비회원 기록 소실의 불만이 쌓이면** → 버린 대안 9(서버 쪽 비회원 저장)를 다시 본다 — 서버 · 마이그레이션이 필요하다.
7. **로그인 성공 뒤 복귀 자리를 맵으로 바꾸라는 결정이 오면** → D6 ⑤. 한 줄(버린 대안 6).
8. **GE-E1 ~ E8 첫 회차가 돌면** → 「확인 필요」 5 · 6을 닫고, 다르면 해당 D를 정정 기록한다.
9. **되살린 수단의 완료가 쌓이고 자동 플립이 필요해지면** → 버린 대안 12(B). 서버 정기 작업이 그 수단의 완료를 보고 정책 배열에서 지우는 길 — 서버 코드가 생기므로 새 ADR이다.
