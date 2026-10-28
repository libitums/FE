# 앱 정책 파일 — `app-policy.json` (`app-policy-1`, 2026-10-27)

결정은 [ADR-0086](../adr/0086-app-version-and-forced-update.md)이 진다. 앱 쪽 디코더 · 판정은 `apps/mobile/src/lib/app-policy.ts`, 받기는 `app-policy-refresh.ts`다.

## 자리

콘텐츠 버킷(`content`) **루트**: `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/app-policy.json` — `manifest.json` 옆이다. 앱은 시작마다 분 단위 키(`?m=`)로 한 번 받는다.

## 형식

```jsonc
{
  "schema": "app-policy-1",
  "min_build": {
    "android": 6,   // 선택. 정수 0 이상. Android versionCode — 이보다 낮은 앱은 스플래시 뒤 강제 업데이트 화면
    "ios": 11       // 선택. 정수 0 이상. iOS 빌드 번호(CFBundleVersion). ⚠ Apple App ID를 호스트에 채우기 전에는 두지 않는다
  }
}
```

| 키 | 필수 | 타입 | 뜻 |
|---|---|---|---|
| `schema` | 필수 | `"app-policy-1"` | 다르면 파일 전체를 버린다(저장본 유지) |
| `min_build.android` | 선택 | int ≥ 0 | 이보다 낮은 `versionCode`는 막는다. 키가 없으면 Android는 제한 없음 |
| `min_build.ios` | 선택 | int ≥ 0 | 이보다 낮은 빌드 번호는 막는다. 키가 없으면 iOS는 제한 없음 |

모르는 키는 버린다. 아는 키의 값이 정수가 아니면(소수 · 문자열 · 음수) **파일 전체가 무효**다 — 반쯤 맞는 정책으로 막지 않는다.

## 앱의 동작

- 유효 → 저장소 키 `libitum.app-policy`에 원문 저장. 서버에 없음(400 · 403 · 404 · 410) → 저장본 제거(= 제한 해제). 연결 실패 · 5xx · 형식 틀림 → 저장본 유지.
- 판정은 **스플래시가 나가는 순간** 저장본으로 한다. `build < min_build[platform]`이면 진입 화면 `update-required`(제목 · 본문 · `Update`), 앱에 들어가지 않는다. 버전을 모르는 호스트(이 기능 전 빌드 · Explorer)는 막지 않는다.
- 정책이 스플래시 뒤에 도착하면 이번 실행은 막지 않고 다음 시작부터 적용된다.

## 올리는 규칙

1. **막을 빌드를 정한다** — 스토어에 올라간 최신 빌드 번호 이하여야 한다(`min_build`가 스토어 빌드보다 높으면 모두가 막히고 아무도 못 푼다). 현재: Android versionCode 6 · iOS 빌드 11(`apps/android/app/build.gradle` · `apps/ios/Host.xcodeproj` `CURRENT_PROJECT_VERSION`).
2. 파일을 올린다 — `cacheControl` **60초**(에피소드 JSON과 같다). 대시보드로 올리면 1시간이다([JSON 계약 §13 5](episode-content-json-contract.md)). 엣지 사본은 최대 그만큼 옛 값일 수 있다.
3. 올린 뒤 공개 주소로 받아 **200 · 올린 본문 그대로**인지 본다.
4. 풀 때는 파일을 지우거나(404 → 저장본 제거) `min_build`를 낮춘다.
5. iOS: `apps/ios/Host/AppUpdateModule.swift`의 `AppStoreURL.appleId`가 채워진 빌드가 스토어에 오른 뒤에만 `ios` 키를 둔다.

## 확인

- 자동: `lib/app-policy.unit.test.ts` · `app-policy-refresh.unit.test.ts` · `app/App.app-update.integration.test.tsx`.
- 기기: [e2e](../e2e/app-update.md).
