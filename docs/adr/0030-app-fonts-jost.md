# ADR-0030 — 앱 폰트 제공: Accent의 Jost

- 상태: 채택
- 날짜: 2026-09-29
- 다루는 축: 디자인 토큰이 정한 폰트를 앱 번들에서 제공하는 방법, 폰트 파일의 출처 고정

## 맥락

`@libitums/design-tokens` 0.3.0이 Accent family(`font.family.accent`)의 첫 항목을 `Futura`에서
`Jost Variable` · `Jost`로 바꿨다. Futura는 Web · 앱 라이선스가 없어 플랫폼마다 Accent가 달라 보였기
때문이다(design-system CHANGELOG 0.3.0).

이 앱은 지금까지 **폰트 파일을 하나도 번들에 넣지 않았다.** Accent가 Futura로 보인 것은 iOS에
Futura가 기본 설치돼 있어서였고, Default의 Pretendard도 제공하지 않아 시스템 서체로 그려진다.
0.3.0을 올리기만 하면 Accent는 Jost를 찾지 못하고 Default stack으로 떨어진다 — 에피소드 헤더 ·
롤플레이 카드 제목 · 온보딩 제목의 모양이 바뀐다.

design-system `foundations/font-delivery.md`는 앱이 Jost를 **앱 번들에 포함하고 시작 시 등록**하며,
런타임에 내려받지 않고, 고정된 배포물을 변환 없이 쓰도록 정한다.

## 결정

### D1. Jost는 호스트 앱 번들에 넣고 `UIAppFonts`로 등록한다

- 파일: `apps/ios/Host/fonts/Jost.ttf`(폴더 참조로 번들의 `fonts/`에 복사), 라이선스 `Jost-OFL.txt`를 같은 폴더에.
- 등록: `Host/Info.plist`의 `UIAppFonts`에 `fonts/Jost.ttf`. 시스템이 앱 시작 때 등록하고, Lynx는
  토큰의 `font-family` 목록에서 이름(`Jost`)으로 찾는다. 등록 코드 · 네이티브 모듈을 더하지 않는다.
- Variable font 하나로 토큰이 쓰는 weight 500 · 700을 모두 그린다.

### D2. 파일은 design-system이 고정한 배포물 그대로다

| 항목 | 값 |
|---|---|
| 버전 | Jost `3.710` |
| 출처 | google/fonts `ofl/jost/Jost[wght].ttf`, commit `91b26e2e0231f5aa85f5470a7b23d6d732ab15fc` |
| SHA-256 | `6343b70971000b04c5d401c96ae08ce371086135e999d5e1e1413039c0213076`(내려받은 파일과 일치 확인) |
| 변경 | 파일명만 `Jost.ttf`로 — 글리프 · 메트릭 변환 없음 |
| 라이선스 | SIL Open Font License 1.1 — `Jost-OFL.txt` |

버전을 바꿀 때는 design-system의 Font Delivery 표가 먼저 바뀌고, 이 앱은 그 값을 따른다.

### D3. Pretendard는 이번에 넣지 않는다

Default의 Pretendard도 같은 문서가 앱 포함을 요구하지만, 이번 변경의 원인은 0.3.0의 Accent 전환이다.
Pretendard를 넣으면 앱 전체 본문의 줄바꿈 · 너비가 바뀌어 화면마다 다시 확인해야 한다 — 별도 결정으로 둔다.

## 대가

- 앱 크기 +135 KB(`Jost.ttf` 134,996 bytes). Lynx 번들 크기는 바뀌지 않는다.
- 한글에는 Jost 글리프가 없어 글리프 단위로 Default로 떨어진다 — 토큰의 fallback 순서 그대로다.
- Lynx Explorer(호스트 없음)에서는 Jost가 없어 Accent가 Default로 그려진다. 판정은 호스트 앱에서 한다.
- third-party notice 화면이 아직 없다 — 라이선스 파일은 번들에 함께 들어가지만 사용자에게 보여 주는 자리는 없다.

## 재검토 조건

- Pretendard를 넣을 때 → D3. 같은 방식(폴더 · `UIAppFonts`)으로 더한다.
- Android 호스트가 생길 때 → `res/font/`에 같은 파일.
- 약관 · 오픈소스 고지 화면이 생길 때 → OFL 고지를 싣는다.

## 적용 기록

### ⟨2026-10-22⟩ 학습 문항 리디자인 — 로마자 기울임이 시스템 서체에 기댄다

결정은 [ADR-0084](0084-lesson-item-redesign.md) D3. 이 문서의 결정은 바뀌지 않는다.

- 학습 문항의 로마자 줄이 **기울임(`font-style: italic`) · medium · muted**로 한글 · 뜻과 구별된다. 본문이 시스템 서체(SF Pro · Roboto)라 진짜 기울임이다 — D3(Pretendard를 넣지 않음)이 이 규칙의 전제다.
- **재검토 조건 「Pretendard를 넣을 때」에 하나가 더해진다** — 그때 로마자 기울임은 합성이 되고 iOS가 똑바로 그릴 수 있다. 로마자만 `font-family-accent`(Jost) · medium · muted로 옮긴다(ADR-0084 재검토 조건 1, ADR README 보류 표 「로마자 기울임의 대안」). 로마자는 라틴 글자뿐이라 Jost가 모두 그린다.

### 적용 기록 ⟨2026-11-02⟩ — 둘째 글꼴 League Spartan

결정은 [ADR-0091](0091-vietnamese-localization.md) D5. 이 문서의 결정은 바뀌지 않는다.

- Jost에 베트남어 글자가 없어(56자 중 48자 없음) UI 언어가 `vi`일 때만 강조 토큰 다섯을 League Spartan으로 다시 정의한다. 같은 방식(폴더 `fonts/` · `UIAppFonts`)으로 더했고 Android는 `assets/fonts/`에 같은 파일.
- D2(「변환 없음」)와 다르게 **한 번 변환했다** — 배포물의 가변 기본값이 Thin(100)이라, 변수를 적용하지 않는 길에서 가늘게 그려진다. `wght` 축을 400–900, 기본 400으로 좁히고 이름 표를 Regular로 맞췄다. OFL에 예약 글꼴 이름이 없어 허용된다.
### 적용 기록 ⟨2026-11-02⟩ — Android에서 Jost를 그린다

결정은 [ADR-0092](0092-android-app-fonts.md). 재검토 조건 「Android 호스트가 생길 때 → `res/font/`」는 그대로 따를 수 없었다 — Lynx Android는 자산 · 리소스 글꼴을 이름으로 찾지 않는다. 호스트가 `files/fonts/`로 복사하고 CSS `@font-face`(`DuruJost`)가 그 경로를 가리킨다. iOS의 D1(`UIAppFonts`)은 바뀌지 않는다.

### 적용 기록 ⟨2026-11-06⟩ — D3을 닫는다: 본문 글꼴 Duru Sans

결정은 [ADR-0107](0107-app-body-font-duru-sans.md). **D3(「Pretendard는 이번에 넣지 않는다」)을 대체한다.**

- 본문 · 버튼 토큰 목록 맨 앞에 Duru Sans(Pretendard JP 1.3.9의 서브셋 — OFL 예약 이름 때문에 새 이름)를 끼운다. 같은 방식(폴더 `fonts/` · `UIAppFonts`, Android `assets/fonts/`)으로 더했다.
- 로마자 기울임은 합성이 되지 않도록 로마자만 Duru Roman(Inter 4.1 Italic 500)으로 그린다 — 위 적용 기록이 말한 「로마자만 Jost」 대안은 쓰지 않았다(본문과 결이 다르다).
