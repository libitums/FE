# 앱 정책 파일 — `app-policy.json` (`app-policy-1`, 2026-10-27 · 로그인 칸 2026-11-06)

결정은 [ADR-0086](../adr/0086-app-version-and-forced-update.md)(최소 빌드)과 [ADR-0111](../adr/0111-guest-entry-without-account.md) D1 개정 3(사용 불가 로그인 수단)이 진다. 앱 쪽 디코더 · 판정은 `apps/mobile/src/lib/app-policy.ts`, 받기는 `app-policy-refresh.ts`, 로그인 수단 판정은 `screens/login/login.ts`(`unavailableLoginMethodsFor`)다.

## 자리

콘텐츠 버킷(`content`) **루트**: `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/app-policy.json` — `manifest.json` 옆이다. 앱은 시작마다 분 단위 키(`?m=`)로 한 번 받는다.

⚠ **2026-11-06 현재 버킷에 이 파일이 없다**(`storage.objects` 조회 — 첫 업로드 전). 파일이 없으면(404) 앱은 저장본을 지우고 **정책 없음**으로 돈다 — 최소 빌드 제한 없음 · 사용 불가 로그인 수단은 앱 상수 기본값(Facebook 두 플랫폼 · Android의 Apple). 아래 「되살리기」는 첫 업로드부터 시작한다.

## 형식

```jsonc
{
  "schema": "app-policy-1",
  "min_build": {
    "android": 6,   // 선택. 정수 0 이상. Android versionCode — 이보다 낮은 앱은 스플래시 뒤 강제 업데이트 화면
    "ios": 11       // 선택. 정수 0 이상. iOS 빌드 번호(CFBundleVersion). ⚠ Apple App ID를 호스트에 채우기 전에는 두지 않는다
  },
  "unavailable_login_methods": {   // 선택(2026-11-06). 누르면 인증 창 대신 「사용 불가 안내」가 뜨는 로그인 수단
    "all": ["facebook"],           // 두 플랫폼 공통
    "android": ["apple"]           // Android에만 더해지는 것
  }
}
```

| 키 | 필수 | 타입 | 뜻 |
|---|---|---|---|
| `schema` | 필수 | `"app-policy-1"` | 다르면 파일 전체를 버린다(저장본 유지). 로그인 칸 추가는 호환 변경이라 값이 그대로다 |
| `min_build.android` | 선택 | int ≥ 0 | 이보다 낮은 `versionCode`는 막는다. 키가 없으면 Android는 제한 없음 |
| `min_build.ios` | 선택 | int ≥ 0 | 이보다 낮은 빌드 번호는 막는다. 키가 없으면 iOS는 제한 없음 |
| `unavailable_login_methods` | 선택 | object | **사용 불가로 안내하는 로그인 수단**(ADR-0111 D1). 칸이 있으면 이 칸이 정본이고 앱 상수는 쓰지 않는다 — 빈 배열 둘이면 아무 수단도 막지 않는다. 칸이 없으면 앱 상수 기본값(`all = ["facebook"]` · `android = ["apple"]`) |
| `unavailable_login_methods.all` | 선택 | string[] | 두 플랫폼에서 사용 불가인 수단. 값은 `apple` · `google` · `facebook` · `phone` 가운데서 |
| `unavailable_login_methods.android` | 선택 | string[] | Android에서만 더해지는 수단(iOS · 플랫폼 모름(`null`)에서는 무시). 값 어휘는 같다 |

규칙:

- 모르는 키는 버린다. `min_build`의 아는 키 값이 정수가 아니면(소수 · 문자열 · 음수) **파일 전체가 무효**다 — 반쯤 맞는 정책으로 막지 않는다.
- `unavailable_login_methods`는 **칸 단위로만 무시한다** — 값이 object가 아니면(배열 · 문자열 · `null`) 그 칸만 없는 것으로 보고 `min_build` 판정은 그대로 산다(강제 업데이트와 결합하지 않는다). `all` · `android` 가운데 없는 키는 `[]`, 배열이 아닌 키는 그 키만 `[]`다. 모르는 수단 이름 · 문자열 아닌 원소는 버리고, 중복을 없애고, 앱 어휘 순서(`apple` → `google` → `facebook` → `phone`)로 읽는다.
- 로그인 칸은 **다음 실행부터** 반영된다 — 앱 시작마다 받아 저장하고, 로그인 화면은 저장본을 읽는다(즉시 재조회 없음). 켜 둔 앱의 로그인 화면은 바뀌지 않는다.

## 앱의 동작

- 유효 → 저장소 키 `libitum.app-policy`에 원문 저장. 서버에 없음(400 · 403 · 404 · 410) → 저장본 제거(= 제한 해제 · 로그인 수단은 상수 기본값). 연결 실패 · 5xx · 형식 틀림 → 저장본 유지.
- 최소 빌드 판정은 **스플래시가 나가는 순간** 저장본으로 한다. `build < min_build[platform]`이면 진입 화면 `update-required`(제목 · 본문 · `Update`), 앱에 들어가지 않는다. 버전을 모르는 호스트(이 기능 전 빌드 · Explorer)는 막지 않는다.
- 로그인 수단 판정은 로그인 화면(진입 · 설정의 `guest-login`)이 렌더될 때 저장본으로 한다 — `unavailableLoginMethodsFor(platform, policy)` = 칸이 있으면 `all ∪ (Android면 android)`, 없으면 상수. 목록에 든 수단을 누르면 인증 창 대신 「사용 불가 안내」 대화상자다([화면 명세](../screens.md) 「로그인 / 회원가입」).
- 정책이 스플래시 뒤에 도착하면 이번 실행은 막지 않고 다음 시작부터 적용된다. 로그인 칸도 같다.

## 올리는 규칙

1. **막을 빌드를 정한다** — 스토어에 올라간 최신 빌드 번호 이하여야 한다(`min_build`가 스토어 빌드보다 높으면 모두가 막히고 아무도 못 푼다). 현재: Android versionCode 6 · iOS 빌드 11(`apps/android/app/build.gradle` · `apps/ios/Host.xcodeproj` `CURRENT_PROJECT_VERSION`).
2. **로그인 칸은 막을 수단만 적는다** — `all`에 `google`을 넣으면 두 플랫폼의 Google이 막히고, Android에서는 `apple` · `facebook`까지 들어 있으면 **소셜 셋 전부가 대화상자**가 된다(전화번호는 지금 숨김이라 로그인 길이 없어진다). 올리기 전에 배열을 눈으로 한 번 더 본다. 칸을 뺀 채 올리면 상수 기본값이다.
3. 파일을 올린다 — `cacheControl` **60초**(에피소드 JSON과 같다). 대시보드로 올리면 1시간이다([JSON 계약 §13 5](episode-content-json-contract.md)). 엣지 사본은 최대 그만큼 옛 값일 수 있다. 같은 이름을 덮어쓰려면 Storage API에 `x-upsert: true`를 붙인다 — `curl -X POST "$PUBLIC_SUPABASE_URL/storage/v1/object/content/app-policy.json" -H "Authorization: Bearer <service_role>" -H "Content-Type: application/json" -H "cache-control: 60" -H "x-upsert: true" --data-binary @app-policy.json`(CLI `storage cp`는 덮어쓰기가 안 된다).
4. 올린 뒤 공개 주소로 받아 **200 · 올린 본문 그대로**인지 본다.
5. 풀 때는 파일을 지우거나(404 → 저장본 제거 → 최소 빌드 · 로그인 수단 모두 기본값) `min_build`를 낮춘다 · 로그인 칸에서 수단을 지운다.
6. iOS: `apps/ios/Host/AppUpdateModule.swift`의 `AppStoreURL.appleId`가 채워진 빌드가 스토어에 오른 뒤에만 `ios` 키를 둔다.

## 되살리기 — 로그인 수단을 앱 배포 없이 돌려놓기 (ADR-0111 재검토 조건 1 · 2)

지금 기본값(파일이 없을 때와 같다)을 그대로 적은 첫 파일은 다음과 같다.

```json
{ "schema": "app-policy-1", "min_build": {}, "unavailable_login_methods": { "all": ["facebook"], "android": ["apple"] } }
```

| 때 | 고치는 것 | 결과 |
|---|---|---|
| Meta 앱 게시가 끝나고 실기에서 Facebook 완료 1건을 봤다 | `all`에서 `"facebook"`을 지운다(`"all": []`) → 위 규칙 3으로 올린다 | 다음 실행부터 두 플랫폼의 Facebook 탭이 인증 창을 연다. **앱 배포 0** |
| Supabase Apple 제공자에 Services ID가 설정됐다([ADR-0039](../adr/0039-android-social-oauth.md)) | `android`에서 `"apple"`을 지운다(`"android": []`) | 다음 실행부터 Android의 Apple 탭이 웹 OAuth 창을 연다 |
| 되살린 수단이 다시 죽었다 | 그 이름을 다시 넣어 올린다 | 다음 실행부터 다시 대화상자 |

- 둘은 서로 독립이다 — 한쪽만 지워도 된다. 칸을 통째로 빼면 상수 기본값(둘 다 막힘)으로 돌아간다는 점에 주의 — 되살릴 때는 **빈 배열**을 둔다.
- 코드의 상수(`productUnavailableLoginMethods` · `androidUnavailableLoginMethods`)는 정책이 없을 때의 기본값이라 그대로 둬도 된다. 되살리기가 자리를 잡으면 상수를 비우는 것은 다음 앱 배포에 함께 실을 정리다.
- 확인: 올린 뒤 기기에서 앱을 **완전 종료 · 재실행**하고 그 수단을 누른다 — [비회원 진입 e2e](../e2e/guest-entry.md) GE-E9. 자동 플립(서버가 성공을 보고 스스로 지우기)은 하지 않는다 — ADR-0111 버린 대안 12.

## 확인

- 자동: `lib/app-policy.unit.test.ts`(AP-U1 ~ U5 — 로그인 칸 디코드) · `app-policy-refresh.unit.test.ts` · `screens/login/login.unit.test.ts`(LG-P1 ~ P4 — 정책 · 상수 판정) · `app/App.app-update.integration.test.tsx` · `app/App.guest-entry.unavailable.integration.test.tsx`(GE14 · GE14b · GE14c — 저장된 정책이 목록을 정한다).
- 기기: [앱 업데이트 e2e](../e2e/app-update.md) · [비회원 진입 e2e](../e2e/guest-entry.md) GE-E9.
