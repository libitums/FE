# ADR-0092 — Android에서 앱 글꼴(Jost)을 그리게 한다

- 상태: **채택 — 호스트 + 앱 CSS.** 서버 변경 0.
- 날짜: 2026-11-02.
- 다루는 축: Android 호스트가 번들 글꼴을 Lynx 텍스트에 내놓는 길. [ADR-0030](0030-app-fonts-jost.md) 재검토 조건 「Android 호스트가 생길 때」의 답.
  **다루지 않는 것**: 베트남어 글꼴(League Spartan)의 Android 결선 — [ADR-0091](0091-vietnamese-localization.md)이 병합된 뒤 같은 자리에 한 줄씩 더한다(재검토 조건).

## 맥락

- `assets/fonts/Jost.ttf`는 Android 호스트를 만들 때부터 있었지만 **한 번도 쓰이지 않았다** — 강조 글자(온보딩 제목 · 에피소드 머리 · 보상 숫자)가 Android에서 Roboto로 그려졌다(2026-11-02 에뮬레이터 캡처).
- Lynx Android(4.0.1)는 `font-family` 목록을 쉼표로 나눠 `TypefaceCache`(등록된 이름)와 `@font-face`만 찾고, 번들 자산을 이름으로 읽지 않는다.
- 시도해 본 것:
  1. `TypefaceCache.addLazyProvider` — 공급자는 `Jost Variable`을 요청받아 글꼴을 돌려줬지만 글자가 바뀌지 않았다(고정폭 글꼴을 돌려줘도 그대로). 새 텍스트 경로가 이 캐시를 그리기에 쓰지 않는다.
  2. `lynx.addFont({ src: local(file://…) / url("file://…") })` — 「불러옴」 콜백까지 왔지만 첫 화면 · 새로 그린 화면 모두 그대로였다.
  3. **CSS `@font-face { src: local(file://절대 경로) }`** — Lynx 문서의 Android 로컬 글꼴 형식. 이것만 그렸다.

## 결정

### D1. 호스트는 첫 화면 전에 자산 글꼴을 `files/fonts/`로 복사한다

- `AppFonts.install(Context)` — `MainActivity`가 템플릿을 그리기 전에 부른다. 표 `AppFonts.FILES`(지금 `Jost.ttf`)의 파일마다, 없거나 크기가 다르면 `.part`로 쓴 뒤 이름을 바꾼다. 없는 자산은 건너뛴다.
- 크기 135 KB 한 번이고, 다음 시작부터는 크기만 견준다.

### D2. 앱 CSS가 그 경로를 `@font-face`로 가리키고, 강조 토큰 목록에 끼운다

- `app.css`: `@font-face { font-family: "DuruJost"; src: local(file:///data/data/libitum.duru.android/files/fonts/Jost.ttf) }`.
  - `/data/data/<패키지>`는 앱 프로세스 안에서 그 사용자의 데이터 폴더다. 패키지는 `build.gradle`의 `applicationId`와 같아야 한다.
- `.app`에서 강조 토큰 다섯(`--libitum-font-family-accent` · `accent-{chapter,display,metric,reward}`)의 목록에 `"DuruJost"`를 `"Jost"` 바로 뒤에 끼운다.
- **이름을 `Jost`로 두지 않는 이유**: iOS는 `UIAppFonts`로 등록한 `Jost`를 먼저 찾는다. 같은 이름의 `@font-face`(iOS에서는 풀리지 않는 경로)가 그 등록을 가리지 않도록 다른 이름을 목록 뒤에 둔다 — iOS 시뮬레이터에서 강조 글자가 그대로 Jost임을 확인했다.

### D3. 경로 · 패키지 · 파일 표가 어긋나면 `pnpm verify`가 실패한다

- `devtools/android-bundle/host-app-fonts.integration.test.mjs`: `app.css`의 `local(file:///data/data/<pkg>/files/fonts/<file>)`마다 `<pkg>` = `applicationId`(AF-W1), `<file>`이 `AppFonts.FILES`와 `assets/fonts/`에 있음(AF-W2).

## 대가

- 패키지 이름이 CSS에 박힌다 — `applicationId`를 바꾸면 이 경로도 바꿔야 한다(AF-W1이 잡는다).
- Android 10 이하에서 기본 사용자가 아닌 프로필(업무 프로필 등)은 `/data/data`가 기본 사용자 폴더를 가리켜 글꼴을 못 찾을 수 있다 — 그때는 지금처럼 Roboto로 그려진다(깨지지 않음).
- 가변 글꼴의 굵기는 Lynx가 정한다(`@font-face`는 굵기를 받지 않는다). 에뮬레이터에서 700 제목이 굵게 그려지는 것을 봤다.

## 재검토 조건

- ADR-0091(베트남어)이 병합되면 → `AppFonts.FILES`에 `LeagueSpartan.ttf`, `app.css`에 `DuruLeagueSpartan` `@font-face`, `.app-lang-vi` 목록에 `"DuruLeagueSpartan"`을 더한다.
- Lynx가 번들 자산 글꼴 등록 API를 고치면(`addFont`가 반영되면) → 고정 경로를 버린다.

### 적용 기록 ⟨2026-11-06⟩ — 배포 빌드에서는 그려지지 않았다

[ADR-0107](0107-app-body-font-duru-sans.md) D4. 이 문서의 확인(「이것만 그렸다」 · 700 제목)은 **Debug 빌드**였다. 배포(`release` · `bundled`) 빌드는 Jost까지 Roboto로 그렸다(에뮬레이터 API 30 · 37).

- 원인: `setEnableGenericResourceFetcher(TRUE)`인데 일반 자원 가져오기를 Debug(`DevResourceFetcher`)만 등록했다. 가져오기가 없으면 Lynx가 `@font-face` 글꼴을 그리지 않는다 — 아무 일도 하지 않는 가져오기를 등록하자 바로 그렸고, 그 가져오기는 한 번도 불리지 않았다. R8은 원인이 아니다(끈 빌드도 같았다).
- 고침: main 소스의 `UnavailableResourceFetcher`를 모든 빌드에서 등록하고 Debug가 덮어쓴다. AF-W3이 지킨다.
- `AppFonts.FILES`에 `DuruSans.ttf` · `DuruRoman.ttf`를 더했다(설치 직후 첫 실행에 약 4.1 MB를 한 번 복사 — 에뮬레이터 첫 화면 중앙 191 → 196 ms).
