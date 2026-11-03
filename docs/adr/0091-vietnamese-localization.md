# ADR-0091 — 베트남어를 첫 번째 다른 UI 언어로 연다 (문구표 · 콘텐츠 번역표 · 강조 글꼴)

- 상태: **채택 — 클라이언트 + 호스트 글꼴 파일.** 서버 변경 0. 콘텐츠 수준(`CONTENT_CLIENT_LEVEL`)은 올리지 않는다.
- 날짜: 2026-11-02.
- **사용자 결정**(2026-11-02): 첫 언어는 베트남어. 강조 글꼴은 **방안 B** — UI 언어가 `vi`일 때만 League Spartan, 영어는 Jost 그대로. League Spartan으로 고른 이유는 Jost와 같은 Futura 계열이라 언어를 바꿔도 인상이 가장 덜 달라지기 때문(시안 비교 https://claude.ai/artifact/QdYMxHDd7RMFMCYtZtzfkA).
- 다루는 축: [ADR-0031](0031-ui-language-catalog.md)의 언어별 문구표에 `vi`를 채우고 고를 수 있게 여는 것, 콘텐츠의 영어(뜻 풀이 · 안내 · 피드백)를 UI 언어로 바꾸는 자리, 베트남어 강조 글꼴.
  **다루지 않는 것**: 콘텐츠 번역 데이터 작성(콘텐츠 제작 몫 — 버킷), 스토어 등록 정보, 랜딩, iOS 시스템 권한 문구의 베트남어(아래 D6).

## 맥락

- ADR-0031로 문구표 구조는 있고 `vi`는 빈 덮어쓰기(`{}`)였다 — 고르지 못하게 막혀 있었다(`isEntryLanguageAvailable`).
- 콘텐츠는 모든 안내 · 뜻 풀이 · 피드백이 `en` 한 칸이다(`Text.en` · `Option.en` · `Word.glossEn` · `titleEn` …).
- 앱 글꼴 Jost는 베트남어 글자 56자 중 48자가 없다(fontTools로 확인). 다만 **Jost는 강조 토큰(`accent-*`)에만 쓰인다** — 본문 · 버튼 · 라벨은 Pretendard → 시스템 글꼴 순서라 베트남어가 그대로 그려진다. 깨지는 자리는 에피소드 머리 · 표지 · 보상 · 온보딩 제목 같은 강조 글자뿐이다.

## 결정

### D1. 콘텐츠 번역은 에피소드 최상위의 「영어 → 번역」 표다 — 칸마다 `tr`을 두지 않는다

```json
{ "schema": "delivery-2", …, "translations": { "vi": { "Fill in the blank.": "Điền vào chỗ trống.", "water": "nước" } } }
```

- 키는 그 에피소드에 나오는 **영어 원문 그대로**, 값은 번역이다. 같은 영어는 한 번만 번역한다(「Fill in the blank.」 같은 안내가 에피소드마다 수십 번 반복된다).
- 칸마다 `tr`을 두는 안(처음 계획)을 버린 이유: 영어가 실린 모양이 열 가지가 넘고(`Text` · 프롬프트 · 피드백 · 보기 · `gloss_en` · `title_en` · `tiles_gloss_en` …) 문자열 칸(`gloss_en`)은 객체가 아니라 옆에 붙일 자리가 없다. 표 하나면 스키마를 칸마다 넓히지 않고, 콘텐츠 도구는 「이 에피소드의 고유 영어 목록」만 번역하면 된다.
- 대가: 같은 영어가 문맥에 따라 다르게 번역돼야 하면 한 표로는 가를 수 없다. 그런 문장이 생기면 영어 원문을 문맥이 드러나게 고친다.
- **옛 앱 호환**: 옛 디코더(수준 2 · 3)는 최상위의 모르는 키를 버린다(`z.object`). 그래서 번역표를 더해도 수준을 올리지 않는다.
- 디코더는 표가 틀려도 에피소드를 거부하지 않는다 — 문자열이 아닌 값 · 빈 문자열은 그 항목만 빼고 `invalid-translation` 경고 하나를 남긴다. 모르는 언어 키는 조용히 버린다.

### D2. 번역은 화면 매핑 앞에서 에피소드 전체에 한 번 적용한다 — `englishOf` 마흔 자리를 고치지 않는다

- `lib/episode-localize.ts` `localizeEpisode(episode, language)`: 영어 칸(`en` · `glossEn` · `titleEn` · `tilesGlossEn`)의 값이 표에 있으면 번역으로 바꾼 사본, 없으면 영어 그대로. `en`이거나 표가 없으면 **같은 객체**를 돌려준다.
- `localizeEpisodeContent(content, language)`는 카탈로그의 ready 항목마다 위를 적용한다. 같은 (content, language)면 같은 결과 객체(메모) — 계획 메모(`catalogLessonPlanFor`)가 항목 참조를 키로 쓰기 때문이다.
- 적용 자리는 `AppSession` 하나다. 학습 · 파이널 · 롤플레이 · 표지 · 지도가 모두 그 아래에서 같은 `episodeContent`를 받는다.
- 한국어 · 로마자 · 음성 · id · 진행 키는 바꾸지 않는다. `whyWrong`은 한국어 설명이라 대상이 아니다.

### D3. 문구표 `vi`는 영어와 같은 모양의 **완전한 표**다

- `uiCopyVi: UiCopy` — 덮어쓰기(부분)가 아니라 전체 타입으로 적어, 영어에 키가 늘면 `tsc`가 베트남어 빈칸을 잡는다. 구획 파일은 영어와 같이 나눈다(300줄 상한).
- 수 · 이름이 끼는 문구는 함수다(ADR-0031 D1). 베트남어는 복수형이 없어 `ui-copy-en-plural.ts` 같은 도우미가 필요 없다 — 수 뒤에 명사를 그대로 둔다.
- **번역은 초안이다** — 파일 머리에 「원어민 검수 필요」를 적는다. 검수로 바뀌는 것은 값뿐이다.
- 학습 콘텐츠 인용(「」 안 한국어) · 고유 명사(Duru · 이야기 속 이름)는 그대로 둔다(ADR-0031 U2 · U3).

### D4. 베트남어를 고를 수 있게 연다

- `isEntryLanguageAvailable("vi") === true`. 진입 언어 목록 · 재방문자의 기기 언어 판정(`uiLanguageFromDeviceTag`)이 그대로 따른다 — 기기 언어가 `vi-VN`이고 저장값이 없으면 베트남어로 선다.
- 목록 라벨은 지금 이름(`Vietnamese`)을 유지한다.

### D5. 강조 글꼴: UI 언어가 `vi`면 앱 뿌리에서 강조 토큰 다섯을 League Spartan으로 다시 정의한다

- 뿌리 요소(`.app`)에 `app-lang-vi` 클래스를 붙이고, 그 아래에서 `--libitum-font-family-accent`와 `--libitum-typography-accent-{chapter,display,metric,reward}-font-family`를 `"League Spartan", "LeagueSpartan", <토큰의 나머지 목록>`으로 다시 정의한다. 다른 토큰(본문 · 버튼)은 손대지 않는다.
- 파일: google/fonts `ofl/leaguespartan/LeagueSpartan[wght].ttf`, commit `e2332cf862ac3145c0ee5f24f04f4c1819b2410b`(가변 글꼴 하나로 굵기 전부, 95,116 bytes).
  - **한 번 변환했다** — 배포물의 가변 기본값이 Thin(100)이라 변수를 적용하지 않는 길(Android 자산 글꼴)에서 가늘게 그려진다. fontTools `instancer`로 `wght` 축을 400–900 · 기본 400으로 좁히고(Jost와 같은 기본값) 이름 표를 `League Spartan` / `Regular`로 맞췄다. 결과 92,440 bytes, SHA-256 `6cbb11fa55132d68863c5e24443350aad2e505d80f3d1d5f1027e73958489ff7`. 베트남어 글자는 모두 있고 `∞`만 없다(글리프 단위로 대체 글꼴).
  - iOS `apps/ios/Host/fonts/LeagueSpartan.ttf` + `UIAppFonts` 등록, 시스템이 글꼴 이름 `League Spartan`으로 찾는다.
  - Android `apps/android/app/src/main/assets/fonts/LeagueSpartan.ttf` — ⟨2026-11-03 정정⟩ Lynx Android는 자산 글꼴을 이름으로 찾지 않는다([ADR-0092](0092-android-app-fonts.md)). 호스트 `AppFonts`가 `files/fonts/`로 복사하고 `@font-face` `DuruLeagueSpartan`이 가리킨다 — `.app-lang-vi` 목록에서 `League Spartan` 바로 뒤.
  - 라이선스 `LeagueSpartan-OFL.txt`를 각 폴더에. SIL OFL 1.1, **예약 글꼴 이름 없음**.
- 성조 부호는 위아래로 높다 — 강조 글자가 서는 고정 높이 자리는 iOS · Android 실기에서 잘림을 본다.

### D6. 네이티브 문자열

- Android 알림 채널 이름 · 설명에 `values-vi/strings.xml`을 더한다(지금 `values` · `values-ko`와 같은 두 줄).
- iOS의 시스템 문구는 추적 허용 안내(`NSUserTrackingUsageDescription`) 하나다. 베트남어를 더하려면 `vi.lproj/InfoPlist.strings`와 프로젝트의 지역 목록을 고쳐야 하고, 시스템 대화상자 언어는 앱 UI 언어가 아니라 기기 언어를 따른다 — 이번에는 넣지 않는다(재검토 조건).

## 테스트 계획

| 계층 | 무엇 |
|---|---|
| unit (episode-core) | 번역표 정규화: 정상 · 문자열 아닌 값 · 빈 값 · 모르는 언어 · 표 없음 · 최상위가 객체 아님 → 경고 / 에피소드는 디코드됨 |
| unit (app) | `localizeEpisode`: 영어 칸만 바뀜 · 표에 없는 영어 유지 · `en`이면 같은 객체 · 한국어 · 로마자 · id 불변. `localizeEpisodeContent` 메모 · locked/pending 항목 통과 |
| unit (app) | `isEntryLanguageAvailable("vi")` · 기기 태그 `vi-VN` → `vi` · 문구표 `vi`의 모든 잎이 비지 않은 문자열 또는 함수 |
| ui | `vi`로 그린 대표 화면이 베트남어 문구를 쓴다 · `app-lang-vi` 클래스 |
| integration | 저장된 언어 `vi` + 번역표 있는 에피소드 → 레슨 안내가 번역으로, 표에 없는 영어는 영어로 |
| e2e / 실기 | iOS 시뮬레이터 · Android 에뮬레이터에서 진입 → 지도 → 레슨 → 파이널 → 결과를 `vi`로, 강조 글자 글꼴 · 성조 부호 잘림 확인 |

## 대가

- 앱 크기 + 92 KB(League Spartan 한 파일). Lynx 번들 크기는 바뀌지 않는다.
- 번역표가 없는 에피소드는 베트남어 UI 안에 영어 뜻 풀이가 섞여 보인다 — 콘텐츠 번역이 버킷에 오르기 전까지.
- 문구 초안은 기계 번역 수준이다 — 원어민 검수 전에는 어색한 문장이 있다.

## 재검토 조건

- 같은 영어를 문맥마다 다르게 번역해야 하는 일이 잦아지면 → D1을 칸 단위 키로.
- iOS 시스템 대화상자 문구를 베트남어로 낼 필요가 생기면 → D6.
- 다음 언어(스페인어 · 일본어)를 열 때 → D3 · D5의 같은 자리에 표 · 글꼴 판정만 더한다.

## 적용 기록

- ⟨2026-11-03⟩ **내장본에도 번역표** — **사용자 결정**(버킷 업로드 전에도 「What do you say?」 같은 문항 제목이 UI 언어로 보이게): 앱에 내장한 u01 ~ u10(balance 판)에 `translations.vi` · `translations.id`를 붙였다. 표는 수준 3 업로드 묶음(staging 기준)의 번역 초안을 그 편이 쓰는 영어만 골라 담았고 빠진 문장은 없다. 원어민 검수 전 초안이다. 번들이 약 205 kB 늘어 상한을 3,740,000 bytes로 올렸다(`devtools/bundle-size/budget.json`).
