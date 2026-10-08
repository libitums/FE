# Android 최소 호스트 계약

## 요구사항

- `apps/mobile`의 ReactLynx 화면 번들을 Android 앱 `Duru`에서 실행한다.
- Debug는 빌드된 번들의 HTTP 미리보기 서버를 쓰며 에뮬레이터 기본 주소는 `10.0.2.2:3000`이다. 실행 인자로 URL을 바꿀 수 있다.
- Release는 APK에 복사된 `main.lynx.bundle`과 `static/` 자산을 쓴다.
- 첫 실행에 필요한 이미지·HTTP 서비스, 입력·SVG·오버레이 XElement, `StorageModule`의 `get/set/remove`를 제공한다.
- iOS 전용 기능은 이 회차에서 이관하지 않는다. 호출부의 기존 미지원 경로가 그대로 작동한다.

## 경계와 데이터 흐름

`apps/mobile` 빌드 → `pnpm bundle:android` → `apps/android/app/src/main/assets/` → `TemplateProvider` → `LynxView`.
Release 이미지의 `/static/` URL은 미디어 fetcher가 APK 자산 URL로 바꾼다. Debug의 같은 경로는 번들 URL의 서버 주소로 바꾸고, 절대 원격 URL은 그대로 둔다.
⟨2026-10-07⟩ 바꾸는 자리가 미디어 fetcher에서 동기 `ImageInterceptor`(`HostImageInterceptor`)로 옮겨졌다 — 바뀐 뒤의 값은 위와 같다([ADR-0051](../adr/0051-android-image-url-redirect.md)).
`StorageModule`은 현재 JS 접점의 동기 API를 같은 이름으로 구현하며, Android `SharedPreferences`에 `libitum.` 접두 키를 저장한다.

## 순수 함수와 테스트 계획

| 계층 | 판정 | 근거 |
|---|---|---|
| unit | 필수 | Debug/Release 번들 선택과 자산 URL 변환의 분기를 순수 Java 함수로 검증 |
| ui | 적용 안 함 | 네이티브 UI를 만들지 않고 `LynxView` 한 개를 호스트가 배치 |
| integration | 필수 | 모바일 빌드 산출물 복사, Gradle 자산 포함과 모듈 등록을 확인 |
| e2e | 필수, 수동 | 에뮬레이터에서 첫 화면·이미지·재시작 후 저장소 유지 확인. 실행 환경이 없으면 미실행으로 기록 |

## 수용 기준

1. Debug에서 URL 인자를 주지 않으면 에뮬레이터의 HTTP 미리보기 번들을 요청한다.
2. Release에서 번들과 `static/` 파일이 APK 자산으로 들어가며 첫 화면과 이미지가 표시된다.
3. `StorageModule`의 같은 키를 저장 후 읽고, 앱 재시작 뒤에도 읽고, 제거 후 `null`을 받는다.
4. 기존 iOS 호스트와 `apps/mobile` 동작을 바꾸지 않는다.

## 문서 영향

필수: `README.md`, `docs/conventions/workflow.md`, `docs/adr/README.md`의 앱 로스터·Android 이관 상태와 빌드 절차를 갱신한다.

## 판정 한계

이 계약은 최소 호스트 범위다. 오디오·음성·소셜 인증·푸시·앱 리뷰 등의 Android 구현과 제품 전체 흐름의 동등성은 후속 변경이다.
