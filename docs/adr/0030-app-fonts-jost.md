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
