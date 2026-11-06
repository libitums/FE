# 비회원으로 계속 · Facebook 수단 임시 「사용 불가」 안내 · 설정에서 로그인 시 이어 올리기 — 기기 확인

결정은 [ADR-0111](../adr/0111-guest-entry-without-account.md)(임시 채택)이 지고, 전이 표는 [진입 흐름 계약](../specs/entry-flow.md) §3의 비회원 세 행, 화면은 [화면 명세](../screens.md) 「진입 흐름」 · 「설정 탭」이 진다. 로그인 화면의 소셜 버튼 셋은 **그대로 서고**, **Facebook(두 플랫폼) · Apple(Android)을 누르면 인증 창 대신 「사용 불가 안내」 대화상자**가 뜬다(「Connect with Google」 · 「Close」 — ADR-0111 D1 개정 2. 같은 날 아침의 「버튼 숨김」은 사용자가 되돌렸다). 어느 수단이 사용 불가인지는 기기에 저장된 앱 정책 `app-policy.json`의 `unavailable_login_methods` 칸이 정하고, 정책이나 칸이 없으면 상수(Facebook · Android Apple)다(개정 3 — [정책 파일 스펙](../specs/app-update-policy.md)). 소셜 버튼 아래에 「Continue without an account」가 생겼다. 비회원은 이름 → 나라 → 언어 선택 → 여정 입장 → 맵을 **서버 요청 없이** 지나고, 진행 · 학습일 · 프로필은 기기에만 쌓이며, 설정 › 「Sign in」으로 로그인하면 그 기록이 계정으로 올라간다.

자동 테스트(unit · ui · integration)는 사용 불가 목록(사용 불가 · 복원 두 상태) · 대화상자의 열림 · 두 액션 · 뒤로가기 · 요청 중 무동작 · 표식 · 계정 상태 · 연속 규칙 · 합치기 · 이관 · 저장 객체 · 설정 행 구성 · 비회원 결선 순서 · `App.guest-entry*.integration.test.tsx`의 완주 · 재실행 · 이관 · 사용 불가 탭(가짜 fetch 0 · 가짜 인증 창)을 지킨다. 아래는 **기기에서만** 판정한다.

- 실제 Android 호스트에서 Apple 탭이 대화상자로 가는가(플랫폼 값은 호스트 globalProps `appVersion.platform`이 준다 — 테스트는 값을 넣어 줄 뿐이다). 실기에서 Facebook 탭이 Meta 창을 **열지 않고** 대화상자로 가는가, 「Connect with Google」이 실제 Google 창을 여는가.
- 실제 Google 로그인으로의 이관, 그리고 **Supabase 표에 올라간 행**(가짜 fetch는 서버 행을 보지 못한다).
- 알림 권한 다이얼로그가 **뜨지 않다가 설정 로그인 성공 때 한 번** 뜨는 타이밍(시스템 다이얼로그).
- 비회원 구간의 네트워크가 실제로 0건인가(프록시 관찰) · 재설치 뒤 비회원 기록이 사라지는가(의도).

수용 기준 번호는 이 작업의 요구사항 1 ~ 13을 가리킨다(항목 표 마지막 열 — 10 ~ 13은 개정 3).

## 준비

- **iOS**: Release 호스트 + 내장 번들(`--bundle-url=main.lynx`), 전용 시뮬레이터(iPhone 17 Pro). Debug는 `localhost:3000`의 다른 작업 트리를 읽을 수 있다([README 「자동화」](README.md#ios)). 알림 다이얼로그 타이밍(GE-E3 · GE-E6)은 시뮬레이터로 충분하다.
- **Android**: 에뮬레이터 1대(API 35), release-like `assembleBundled` APK(디버그 빌드는 릴리스에서만 나는 결함을 가린다). API 33+ 에뮬레이터라야 `POST_NOTIFICATIONS` 다이얼로그가 뜬다.
- 번들에 `apps/mobile/.env.local`의 `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`(PostHog 키는 기본으로 넣지 않는다 — `$identify` · `method=guest` 도착을 보는 회차에만 넣는다). 새 워크트리에는 이 파일이 없으니 메인 체크아웃에서 복사한다. 값은 기록에 적지 않는다.
- **Google 계정 둘, 둘 다 Supabase에서 역할이 없는 일반 계정**: ⓐ 서버 기록이 **없는** 새 계정(`learning_progress` · `learning_days` · `learner_profiles` 행 모두 없음) · ⓑ 서버 기록이 **있는** 계정(다른 유닛을 하나 끝낸 진행 + 프로필 행). 회차마다 ⓐ를 새로 쓴다 — 한 번 로그인하면 그 계정은 기록이 생겨 ⓐ가 아니게 된다.
- **기기 저장소 초기화(새 설치로 시작)**: 앱을 지우고 다시 설치한다. 비회원 표식(`libitum.auth.guest`)을 지우는 길은 로그인 성공 · 로그아웃 · 계정 삭제뿐이라, 비회원 상태를 처음부터 다시 보려면 재설치가 필요하다.
  - iOS: `xcrun simctl uninstall <UDID> com.libitum.host` → 설치. 알림 허락을 되돌려야 하면 `xcrun simctl privacy <UDID> reset notifications com.libitum.host`.
  - Android: `adb uninstall libitum.duru.android` → 설치.
- **기기 저장 키 읽는 법**: 값은 앱 저장소(iOS `UserDefaults` · Android 앱 전용 prefs)에 있다. 읽기 전에 앱을 한 번 **완전 종료**해 디스크에 내려가게 한다.
  - iOS 시뮬레이터: `plutil -p "$(xcrun simctl get_app_container <UDID> com.libitum.host data)/Library/Preferences/com.libitum.host.plist" | grep libitum`
  - Android(디버그 빌드에서): `adb shell run-as libitum.duru.android grep -rho 'libitum\.[a-z.-]*[a-z0-9]' shared_prefs` — release-like 빌드는 `run-as`가 막히므로 키 확인만 디버그 빌드로 따로 한다.
  - 비회원 상태의 기대 키: `libitum.auth.guest`(값 `1`) · `libitum.progress.pending.guest`(유닛을 끝낸 뒤) · `libitum.learning-days.pending.guest`(〃) · `libitum.learner-profile.guest`(나라까지 저장한 뒤). **`libitum.auth.session`은 없다.**
- **Supabase 로그 / 표 보는 자리**: 대시보드 › Logs › API Edge Logs와 Auth Logs를 시작 시각 이후로 연다(경로에 `/rest/v1/rpc/` · `/auth/v1/`). 네트워크 0건의 1차 증거는 기기에 건 프록시(Charles 또는 mitmproxy — 호스트 `*.supabase.co` 필터)이고, 대시보드 로그는 보조 증거다(반영이 몇 분 늦을 수 있다). 표 확인은 SQL Editor다.
- **PostHog**: Live events에서 이 기기의 이벤트를 본다. 비회원 구간의 이벤트는 익명 distinct id로 오고 `$identify`가 없다. 키를 넣지 않은 빌드면 이 확인은 `판정 불가 — 키 없음`으로 적는다.
- **앱 정책 파일(GE-E9)**: 콘텐츠 버킷 루트의 `app-policy.json` — 2026-11-06 현재 버킷에 **없다**. 실서버 버킷에 올리면 **모든 사용자**의 로그인 수단이 바뀌므로 [앱 업데이트 e2e](app-update.md)처럼 **테스트 버킷**(`PUBLIC_SUPABASE_URL`을 테스트 프로젝트로)에서 한다. 올리는 법 · 덮어쓰기(`x-upsert`) · cacheControl 60초는 [정책 파일 스펙 「올리는 규칙」](../specs/app-update-policy.md). 올린 뒤 공개 주소로 받아 본문이 그대로인지 먼저 본다.
- **Supabase 표 확인 SQL(GE-E6 · GE-E7)** — `<이메일>`에 확인할 계정을 넣어 한 줄로 돌린다.

```sql
select u.email, (select progress from public.learning_progress p where p.user_id = u.id) as progress, (select array_agg(d.day order by d.day) from public.learning_days d where d.user_id = u.id) as days, (select to_jsonb(f) - 'user_id' from public.learner_profiles f where f.user_id = u.id) as profile from auth.users u where u.email = '<이메일>';
```

## 항목

| id | 기기 | 절차 | 기대 | 수용 기준 |
| --- | --- | --- | --- | --- |
| GE-E1 | iOS | 새 설치. 온보딩을 끝까지 넘겨 로그인 화면을 연다. **Facebook**(`login-screen-method-facebook`)을 누른다 → 「Close」 → 다시 Facebook → 시스템 뒤로가기(iOS는 가장자리 스와이프 — 없으면 생략) → 다시 Facebook → 「Connect with Google」 → Google 창을 닫는다(취소) | 로그인 화면(`login-screen-title`)에 소셜 버튼이 **셋**: Apple(`login-screen-method-apple`) · Google(`login-screen-method-google`) · Facebook. 전화번호 입력은 지금처럼 숨김. 소셜 묶음 바로 아래에 「Continue without an account」(`login-screen-method-guest`) **한 줄** — 「or」 구분 없이, 소셜 버튼과 같은 너비로, 소셜보다 낮은 강조(면이 채워진 소셜 버튼과 구별되는 ghost · subtle). 약관 줄은 그대로 아래. **Facebook 탭 → Meta 인증 창이 열리지 않고 대화상자**(`login-screen-unavailable-dialog`)가 뜬다 — 제목 `Facebook sign-in is temporarily unavailable` · 설명 「We're moving this sign-in to a new setup. For now, continue with Google or without an account.」 · 버튼 둘 「Connect with Google」(brand) · 「Close」(subtle). 대화상자 뒤 화면은 눌리지 않는다. 「Close」 → 대화상자만 닫히고 로그인 화면 그대로(버튼 상태 변화 없음 · 실패 문구 없음). 뒤로가기 → 같다. 「Connect with Google」 → 대화상자가 닫히고 **Google 인증 창이 바로** 선다(Google 버튼을 누른 것과 같다 — 스피너는 Google 버튼에). 창을 닫으면(취소) 아무 일 없이 로그인에 남는다. Apple 탭은 지금처럼 네이티브 시트 | 1, 2 |
| GE-E2 | Android | 새 설치. 온보딩을 넘겨 로그인 화면을 연다. **Apple**을 누른다 → 「Close」. **Facebook**을 누른다 → 「Connect with Google」 → Google 창을 닫는다 | 소셜 버튼이 **셋**: Apple · Google · Facebook. 「Continue without an account」가 소셜 묶음 아래에 있고 GE-E1과 같은 모양(같은 너비 · 낮은 강조). 전화번호 입력 숨김. **Apple 탭 → 웹 OAuth 창이 열리지 않고 대화상자** — 제목 `Apple sign-in is temporarily unavailable`(수단 이름만 다름). 「Close」로 닫힘. **Facebook 탭 → 같은 대화상자**(제목 Facebook) → 「Connect with Google」 → Google 인증 창. 시스템 뒤로가기 버튼은 대화상자만 닫는다(앱 이탈 · 온보딩 복귀 아님). Google 탭은 지금처럼 바로 인증 창 | 1, 2 |
| GE-E3 | iOS · Android | 새 설치. 기기에 프록시를 건다. 로그인 화면에서 「Continue without an account」 → ① 이름(기본 이름 그대로 진행) → ② 나라(아무 나라) → 언어 선택 → 여정 입장 → `Start` | 단계 순서가 로그인 사용자와 같다: ① 이름 → ② 나라 → 언어 선택 → 여정 입장 → 여정 맵(탭 바가 선다). **여정 입장에서 `Start`를 눌러도 알림 권한 다이얼로그가 뜨지 않는다.** 프록시에 `*.supabase.co` 요청이 **0건**(비회원 버튼을 누르는 순간부터 맵이 설 때까지 전 구간). 저장 키: `libitum.auth.guest` = `1`, `libitum.learner-profile.guest` 있음, `libitum.auth.session` 없음. PostHog: `entry_login_method_selected`의 `method=guest`가 1건, 이어서 `entry_screen_viewed`(`learner-name`) — 둘 다 익명 distinct id, `$identify` 없음. Supabase 대시보드 Auth Logs · API Edge Logs에 이 기기 시각대의 요청 0건 | 2, 8 |
| GE-E4 | iOS · Android | GE-E3 뒤 맵에서 첫 유닛(u01 S1)을 끝까지 끝내 결과 화면을 지나 맵으로 나온다 → 앱을 **완전 종료**(스와이프 종료) → 다시 연다 | 결과 화면에서 연속 학습이 **1**로 오른다. 다시 연 앱: 스플래시 뒤 **바로 여정 맵** — 온보딩 · 로그인 · 언어 선택 · 여정 입장이 한 번도 서지 않는다. 방금 끝낸 유닛에 완료 표시, 머리 카드의 연속 학습 **1**. 저장 키: `libitum.progress.pending.guest` · `libitum.learning-days.pending.guest` 있음. 유닛 완료부터 재실행 뒤까지 프록시의 `*.supabase.co` 요청 0건(진행 · 학습일 · 프로필 · 푸시 · 피드백 RPC 모두) — 서버 요청이 전혀 없으므로 비행기 모드에서 다시 열어도 같은 결과다. 에피소드 설문(피드백 창)이 서지 않는다. 구현 전과 다르다: 옛 빌드는 로그인 없이 맵에 닿는 길이 없다 | 3, 4 |
| GE-E5 | iOS · Android | GE-E4 상태에서 설정 탭을 연다 | 계정 묶음이 **여섯 행**: 프로필 · `Name and country in lessons` · 언어 · 다운로드 · 개인정보 처리방침 · 이용약관. **「Notifications」 행 · 「Send feedback」 행이 없다.** 계정 동작은 **「Sign in」 한 행**(`ui-lynx-settings-group-item-sign-in`)뿐이고 **「Sign out」 · 「Delete account」가 없다.** 「Name and country in lessons」 줄에는 이름 · 나라만 보인다 — 「Saved on this device…」 꼴의 동기화 대기 문구가 **없다**(비회원은 `learnerSync`가 `none`이다 · 접근성 점검 #3 정정 2026-11-06). 「Sign in」을 눌러도 확인 대화상자가 뜨지 않고 곧바로 로그인 화면으로 간다. 로그인 사용자의 설정(여덟 행 + 「Sign out」 · 「Delete account」)과 구별되는 구성이다 | 5 |
| GE-E6 | iOS · Android | GE-E5에서 「Sign in」 → 로그인 화면 → **ⓐ(서버 기록 없음) Google로 로그인**. 알림 허락은 미결정 상태여야 한다(재설치 직후면 그렇다). 성공 뒤 Supabase 표 확인 SQL을 ⓐ의 이메일로 돌린다 | 로그인 화면: `login-screen-title`이 서고 **「Continue without an account」(`login-screen-method-guest`)가 없다**, 탭 바가 가려진다. 로그인 성공 → **설정 화면으로 돌아온다**(언어 선택 · 여정 입장 · 기존 회원 로딩이 서지 않는다). 설정 행이 로그인 구성(여덟 + 「Sign out」 · 「Delete account」)으로 바뀐다. **알림 권한 다이얼로그가 이때 한 번 뜬다**(비회원 구간에는 한 번도 뜨지 않았다). 맵으로 가 보면 GE-E4의 완료 표시와 연속 **1**이 그대로다(로그인으로 수가 바뀌지 않는다). 저장 키: `libitum.auth.session` 있음, `libitum.auth.guest` · `libitum.progress.pending.guest` · `libitum.learning-days.pending.guest` **없음**. Supabase 표: `progress`에 GE-E4에서 끝낸 유닛이 든 스냅숏, `days`에 그 날짜 1건, `profile`에 비회원 때 적은 이름 · 나라 코드. PostHog: 로그인 직후 `$identify`가 ⓐ의 사용자 id로 오고 같은 기기의 이전 익명 id를 잇는다. `entry_login_method_selected method=google`. `entry_returning_learner_entered`는 오지 않는다 | 6, 7, 8 |
| GE-E7 | iOS · Android | 새 설치. 비회원으로 GE-E3 → GE-E4를 다시 지난다(**ⓑ가 끝낸 것과 다른 유닛**을 끝낸다). 설정 › 「Sign in」 → **ⓑ(기록 있음) Google로 로그인**. 로그인 전에 ⓑ의 표 확인 SQL을 한 번 돌려 서버 쪽 값을 적어 둔다 | 로그인 뒤 설정으로 돌아오고(언어 선택 · 여정 입장 · `entry_returning_learner_entered` 없음) 맵에는 **서버 진행 + 기기 진행 둘 다** 완료 표시가 선다(합집합). 로그인 후 표 확인 SQL의 `progress`에 둘의 유닛이 모두 든다(로그인 전에 적어 둔 서버 값 ⊂ 로그인 후 값). `days`에 서버의 날짜들과 오늘이 함께 든다. `profile`은 **비회원 때 적은 이름 · 나라로 덮여 있다**(ADR-0059 「손님 값이 미전송으로 이긴다」 — 서버의 옛 값이 이기지 않는다). 저장 키는 GE-E6과 같다(표식 · 비회원 칸 없음) | 6 |
| GE-E8 | iOS · Android | GE-E6 뒤 앱을 **완전 종료** → 다시 연다. 이어서 설정 › 「Sign out」 → 앱을 다시 완전 종료 → 다시 연다 | 첫 재실행: 스플래시가 세션 갱신 왕복 뒤 **바로 맵**(온보딩 · 로그인 없음, 알림 다이얼로그 없음). 저장 키에 `libitum.auth.guest` · `…pending.guest` 칸이 계속 없다. 로그아웃 뒤 재실행: 스플래시 뒤 **온보딩**(비회원 표식이 없으므로 맵으로 가지 않는다). 로그인 화면에 다시 서면 「Continue without an account」가 있다(진입 구간이므로) | 7 |
| GE-E9 | iOS · Android | (테스트 버킷) 정책 `{ "schema": "app-policy-1", "min_build": {}, "unavailable_login_methods": { "all": [], "android": [] } }`를 `app-policy.json`으로 올린다(cacheControl 60초 · 받아서 확인) → 앱을 **완전 종료** → 다시 연다(스플래시가 정책을 받아 저장) → 로그인 화면(새 설치면 온보딩을 넘겨서, 비회원 상태면 설정 › 「Sign in」)에서 **Facebook**을 누른다 → 창을 닫는다. Android는 **Apple**도 누른다. 이어서 `all: ["facebook"]`, `android: ["apple"]`로 되돌려 올리고 → 완전 종료 → 다시 연다 → Facebook을 누른다 | 빈 목록을 올린 뒤의 재실행: **Facebook 탭 → 대화상자 없이 Meta 인증 창(웹)이 바로 선다**(옛 「거절」 페이지가 보여도 창이 열린 것이 판정 — 수단 자체의 복구는 Meta 게시 뒤의 일). Android의 Apple 탭 → 웹 OAuth 창. Google은 그대로. 저장 키 `libitum.app-policy`에 올린 본문이 든다. **되돌려 올린 뒤의 재실행**: Facebook 탭이 다시 대화상자다. 같은 실행 안에서는 바뀌지 않는다 — 올린 직후 종료하지 않고 누르면 이전 저장본대로 동작한다(다음 실행부터 반영이 맞다). 올린 지 60초 안이면 엣지가 옛 본문을 줄 수 있다 — 바뀌지 않으면 1분 뒤 다시 완전 종료 · 재실행. 앱을 다시 설치하거나 빌드를 바꾸지 않았다는 것이 이 행의 요점이다(앱 배포 0) | 10, 11, 13 |

Android 반복: GE-E2를 먼저 본 뒤 **GE-E3 · GE-E4를 에뮬레이터에서 그대로 반복한다**(GE-E5 ~ E8도 같은 절차로 한 번은 돌린다). Apple의 대화상자는 Android에서만 뜬다. GE-E2에서 Apple 탭이 대화상자 없이 **웹 OAuth 창을 열면** 플랫폼 값이 비었다는 뜻이다(`appVersion.platform`이 `null`이면 플랫폼 몫의 사용 불가가 없다). GE-E6 · GE-E7의 `guest-login` 화면에서도 Facebook 탭은 같은 대화상자다(설명은 「… please continue with Google.」 — 이 화면엔 비회원 버튼이 없어 「계정 없이」를 말하지 않는다)(한 번 눌러 본 뒤 「Close」, 그다음 Google로 진행) — 「Connect with Google」을 쓰면 그 화면의 Google 경로(설정 복귀)로 간다.

PostHog 공통 확인(수용 기준 8): `entry_login_method_selected method=guest`가 비회원 선택 때 익명 distinct id로 도착하고(GE-E3), GE-E6 뒤 `$identify`가 같은 기기 id를 잇는다. GE-E1 · E2의 Facebook · Apple 탭은 **이벤트를 내지 않는다**(`method=facebook`이 오면 대화상자 분기가 빠진 빌드다 — 모달 노출 자체는 재지 않는다, ADR-0111 확인 필요 10).

수용 기준 9′(사용 불가 목록 한 곳을 비우면 대화상자 없이 인증 창이 열린다 · 기존 스위트 통과)는 입력으로 두 상태를 보는 unit · ui와 `pnpm verify`가 지고, 이 문서에는 행이 없다. 개정 3의 10 ~ 12(정책 칸이 비면 인증 창 · 칸이 없거나 정책이 없으면 상수 · 칸 모양이 틀리면 칸만 무시 + `min_build` 유지)는 unit AP-U1 ~ U5 · LG-P1 ~ P4 · ui LG-D7 · integration GE14 · GE14b · GE14c가 지고, 기기에서는 **실제 버킷 → 저장 → 다음 실행 반영**의 사슬 하나만 GE-E9로 본다. 13(되살리기 절차가 문서에 있다)은 [정책 파일 스펙](../specs/app-update-policy.md) 「되살리기」다.

## 구현 전과의 차이

옛 빌드(Facebook 탭 → Meta 창 · 비회원 없음)와 이 문서의 새 빌드를 판정자가 구별하는 표지는 다음과 같다. 기대가 이 표지와 맞지 않으면 옛 동작이 남았거나 새 동작이 덜 들어간 것이다. **개정 1 빌드**(같은 날 아침 — Facebook · Android Apple 버튼이 **없는** 빌드)가 기기에 남아 있을 수 있다 — 버튼이 둘(iOS) · 하나(Android)면 그 빌드다.

| 장면 | 구현 전(옛 빌드) | 구현 후(새 빌드) |
| --- | --- | --- |
| iOS 로그인 화면 | Apple · Google · Facebook 소셜 셋, 비회원 줄 없음. Facebook 탭 → Meta 인증 창(거절 페이지) | 소셜 셋 그대로, **Facebook 탭 → 「사용 불가 안내」 대화상자**(Meta 창 없음), 아래에 「Continue without an account」 |
| Android 로그인 화면 | Apple · Google · Facebook 셋(Apple은 웹 OAuth 창) | 소셜 셋 그대로, **Apple · Facebook 탭 → 대화상자**(창 없음), 아래에 「Continue without an account」 |
| 대화상자 「Connect with Google」 | (해당 없음) | 대화상자가 닫히고 Google 인증 창이 바로 선다 |
| 로그인 없이 맵에 닿기 | 불가 — 로그인이 막히면 로그인 화면에서 멈춘다 | 비회원 버튼으로 이름 → 나라 → 언어 → 여정 입장 → 맵 |
| 비회원 구간의 서버 요청 | (해당 없음) | 프록시 · Supabase 로그 0건 |
| 알림 권한 | 여정 입장 `Start`에서 한 번 | 비회원은 묻지 않고, 설정 로그인 성공 때 한 번 |
| 비회원 재실행 | (해당 없음) — 세션이 없으면 온보딩 | 스플래시 뒤 바로 맵 |
| 설정 계정 구성 | 로그인 사용자만: 여덟 행 + 「Sign out」 · 「Delete account」 | 비회원: 여섯 행 + 「Sign in」 한 행. 로그인 사용자는 그대로 |
| 설정에서 로그인 | (해당 없음) | 설정으로 돌아오고 기기 기록이 계정 표에 올라감, 언어 선택 · 여정 입장 없음 |
| `entry_login_method_selected` | `method` 넷(apple · google · facebook · phone) | `guest` 값 +1(이벤트 이름 수 불변) |
| 사용 불가 목록의 출처(개정 3) | (해당 없음 — 개정 2 빌드는 코드 상수만) | 기기에 저장된 `app-policy.json`의 `unavailable_login_methods` 칸, 없으면 상수. 빈 배열 정책을 올리고 재실행하면 Facebook 탭이 인증 창(GE-E9) — 개정 2 빌드는 정책을 올려도 대화상자가 그대로다 |

## 보조기술 관찰 (VoiceOver · TalkBack)

ADR-0016 D6 — 속성이 옳다는 것(ui green: LG-G1 · ST3 · ST4)은 절반이고, 실제로 그렇게 읽히는가 · 순서 · 정지 수는 실기가 진다. 위 항목을 돌릴 때 같은 회차에 본다(접근성 점검 2026-11-06 #4).

| 번호 | 자리 | 보는 것 |
|---|---|---|
| GE-A1 | GE-E1 · E2 로그인 화면 | 쓸기 순서 `Back, button` → `Log in or Sign up, heading` → `Choose how you'd like to continue` → `Sign in with Apple, button` → `Connect with Google, button` → `Connect with Facebook, button` → `Continue without an account, button` → 약관 네 정지(두 플랫폼 같다 — Android도 Apple 정지가 있다). 비회원 버튼은 **정지 하나**다(라벨 `<text>`가 따로 서지 않는다). Google을 탭한 직후(인증 창이 뜨기 전) 비회원 버튼을 더블탭하면 **무응답**이고 보조기술은 상태 변화를 알리지 않는다 — 소셜 버튼과 같은 규칙(접근성 #1 · 후속 기록). **Facebook을 더블탭하면 대화상자**가 서고 쓸기는 대화상자 안에만 머문다 — 제목 `Facebook sign-in is temporarily unavailable` → 설명 → `Connect with Google, button` → `Close, button`, 뒤 화면 요소(소셜 버튼 · 비회원 버튼 · 약관)는 닿지 않는다(설정 로그아웃 대화상자와 같은 격리 — Android TalkBack은 ADR-0016 D9 플랫폼 주의 한계가 있을 수 있다, 보이는 대로 적는다). 시스템 뒤로가기 = 대화상자만 닫힘, 초점이 어디에 서는지 적는다 |
| GE-A2 | GE-E5 설정 | 「Sign in」 행이 `Sign in, button`으로 들리고, `Notifications` · `Send feedback` 정지가 **없다** |
| GE-A3 | GE-E6 설정 복귀 | 로그인 성공 뒤 초점이 어디에 서는지 적는다. 행 구성이 바뀐 것을 알 채널이 알림 권한 다이얼로그뿐인지 — 발화 0이면 그대로 기록(ADR-0016 D8 후속) |
| GE-A4 | GE-E6 Android | TalkBack을 켠 채 `guest-login` 화면에서 시스템 뒤로가기 = 설정 복귀 **1회**(앱 이탈 아님) |
| GE-A5 | GE-E1 · E2 최대 배율 | Dynamic Type 최대 · vi 라벨(`Tiếp tục không cần tài khoản`)에서 비회원 버튼이 두 줄로 내려가고 잘리지 않는다 |
| GE-A6 | GE-E1 · E2 대화상자 | Facebook 더블탭 뒤 **초점이 어디에 서는지**(제목 · 첫 액션 · 아무 데도) 적는다. 「Connect with Google」 더블탭 뒤 초점이 Google 버튼으로 가는지, `Connect with Google, loading`(요청 중)이 들리는지. 「Close」 · 뒤로가기 뒤 초점이 Facebook 버튼으로 돌아오는지 |
| GE-A7 | GE-E1 · E2 최대 배율 | Dynamic Type 최대 · vi/ja에서 대화상자(제목 두 줄 · 설명 세 줄 · 액션 둘)가 화면 세로를 넘지 않는지 — `.ui-lynx-dialog`는 고정 높이 · 스크롤 없음이라 넘치면 아래 액션이 잘린다(그러면 접근성 Major → ui-lynx 후속) |

## 실행 기록

| 날짜 | 기기 | 빌드 | 결과 | 확인자 |
| --- | --- | --- | --- | --- |
