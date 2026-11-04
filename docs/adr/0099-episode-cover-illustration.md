# ADR-0099 — 여정 맵 표지 노드 뒤 에피소드 일러스트

- 상태: **채택.**
- 날짜: 2026-11-04.
- 다루는 축: 여정 맵 표지 노드의 모양, 콘텐츠 매니페스트 키 하나, 내장 자산 규격.
- **사용자 결정**(2026-11-04): 표지 노드 뒤에 에피소드 일러스트를 깔아 어떤 이야기인지 미리 짐작하게 한다. 노드 자리는 최종 테스트 노드와 같아야 하고, 일러스트만 왼쪽 · 오른쪽으로 번갈아 물러난다(짝수 에피소드 왼쪽 · 홀수 오른쪽). 표지 라벨의 「SPECIAL」 윗줄은 빼고 「Intro」만 `brand.primary`로. 레슨 · 문화 라벨은 그대로. 일러스트는 u10까지 내장하고 그 뒤는 버킷에 올린다. 기기 안정성이 최우선. 시안 캔버스 https://claude.ai/artifact/779nSijQNu1j2ayuEcMsYp.

## 맥락

맵의 표지 노드는 별 아이콘이 든 네모라 에피소드끼리 구분이 없었다. 에피소드마다 일러스트(한옥 게스트하우스 · 컵라면 · 장난감 비행기 …)가 있고, 사용자가 이것을 표지 노드 뒤에 두고 싶어 했다. 노드는 맵의 열 가운데 축을 지켜야 하고(스크롤 · 자동 스크롤 · 말풍선 자리가 노드 중심을 재므로), 일러스트는 장식이다.

## 결정

### D1. 데이터 — 매니페스트 항목의 선택 키 `cover`

- `manifest-1` 항목에 `cover: string`(기준 상대 경로, `images/covers/<id>.webp`)을 **선택**으로 더한다. 규칙은 `url`과 같다. 옛 앱은 모르는 키로 버리므로 클라이언트 수준을 올리지 않는다.
- 디코더(`episode-manifest.ts`)는 비어 있지 않은 문자열만 보존하고, 인코더는 있으면 `url` 뒤에 쓴다. 경로 유효성(선두 `/` · `..` · `://`)은 주소를 만드는 `resolveContentUrlSafe`가 거른다 — 잘못된 경로는 일러스트 없음으로 조용히 끝난다.
- 카탈로그(`episode-catalog.ts`)의 ready 항목에 `cover`가 실린다 — **이긴 항목의 값, 없으면 같은 id 내장 항목의 값**(`coverOf`). 원격 매니페스트가 키를 적지 않아도 내장 일러스트가 남고, 원격본이 못 쓰여 내장본으로 폴백해도 같다.
- 구획(`catalogMapSectionsOf`)이 `cover`를 들고, 맵은 `coverImageUrlOf`(= `EpisodeContent.imageUrlOf` — 번들 표 먼저, 없으면 공개 버킷 주소)로 주소를 만든다.

### D2. 기하 — 노드는 그대로, 일러스트만 물러난다

- 순수 함수 `catalog-cover-illustration.ts`: `coverIllustrationSideOf(ordinal)` — 짝수 `left`(노드 면이 일러스트의 4사분면), 홀수 `right`(3사분면). `catalogCoverIllustrationOf(section, imageUrlOf)` → `{ url, side } | null`.
- 표지 노드(`CatalogCoverMapItem`)는 일러스트가 있을 때만 래퍼(`catalog-cover-illustrated`, 364 wide · 위 여백 87)로 감싼다. halo 124는 래퍼 가운데(x 120 ~ 244)에 서서 열 가운데 축이 그대로다. 일러스트 260 × 194(4:3)는 `left: 0` 또는 `right: 0` · `top: 0` · `z-index: 0`, 노드 · 라벨은 `z-index: 1`. 위 여백 87은 일러스트가 노드 위로 나오는 높이라 래퍼 안에 들어 조상 `overflow`(Lynx 기본 hidden)에 잘리지 않는다.
- 일러스트는 장식 — `accessibility-element={false}`, 탭은 노드만 받는다.

### D3. 상태 — 잠김은 불투명도

- 잠긴 표지의 일러스트는 `opacity: 0.45`, 그 밖은 원색. 런타임 `filter: grayscale()` 대신 불투명도를 쓴다 — 플랫폼별 지원 · 성능을 기기에서 보장하지 못하고(사용자 「기기 안정성 최우선」), 자산이 한 벌로 끝난다. 회색판(`u02-unlock.png`)은 쓰지 않는다.

### D4. 라벨 — 제목 한 줄 · `brand.primary`

- `SpecialUnitMapItem`에 `label?: "two-line" | "title-only"`(기본 두 줄). 카탈로그 표지만 `title-only` — 「SPECIAL」 윗줄 없이 제목만. 열림 · 끝 상태의 제목 색은 `brand.primary`(#F46B18), 잠김 · 확인 중은 muted 그대로. 최종 · 막간 노드는 두 줄 그대로.
- 문구 `catalogMap.coverTitle`: `Episode intro` → `Intro`(vi `Giới thiệu` · id `Pengantar`) — 시안의 라벨. [추론 — 사용자 미확인].

### D5. 자산 — u10까지 내장, 780px webp

- 원본(1452 × 1083 PNG, 흰 배경)을 `devtools/content/cover-webp.mjs`로 폭 780 · q80 webp(표시 폭 260 × 3배)로 바꿔 `apps/mobile/src/assets/content/covers/<id>.webp`에 싣고, `bundled-content-images.ts` 표와 내장 매니페스트 항목의 `cover`를 더한다. 이번에 u01 · u02 · u03(19 · 25 · 11 kB). u04 ~ u10은 일러스트가 오는 대로 같은 절차.
- u11부터는 버킷 `images/covers/<id>.webp` + 버킷 매니페스트 항목 `cover`(앱 변경 없음). 흰 배경은 맵 배경(#FFFDFC)과 거의 같아 그대로 둔다 — 투명판이 오면 교체.

## 대가

1. 래퍼가 열 폭(358)보다 6px 넓어 양쪽 3px씩 넘친다(투명 영역). 한 열 맵(큰 글꼴 · 좁은 화면)에서는 일러스트 가장자리가 더 잘릴 수 있다 — 노드 · 라벨은 온전하다.
2. `Intro`(#F46B18)의 맵 배경 대비는 약 3.0:1로 12px 글자의 AA(4.5:1)에 못 미친다 — [ADR README 수용 부채](README.md) 「주황 면 토큰 위 흰 글자」와 같은 결의 사용자 결정. 라벨은 낭독 요소가 아니고 노드 낭독 이름이 「Intro」를 담는다.
3. 흰 배경 PNG를 그대로 썼다 — 투명판이 오기 전까지 배경과 0.5 % 차이의 네모가 이론상 있다(육안 구분 불가).
4. 내장 u04 ~ u10은 일러스트가 올 때마다 PR 하나(자산 + 표 + 매니페스트).

## 재검토 조건

- 한 열 맵에서 잘림이 거슬리면 → 열 폭에 맞춘 축소(일러스트 폭을 `min(260, 열 폭 − 104)`)를 더한다.
- Lynx `filter`가 두 플랫폼에서 안정적으로 확인되면 → 잠김을 회색조로.
- 에피소드가 20을 넘으면 → 버킷 일러스트의 기기 캐시(지금은 `<image>` 자체 캐시에 기댄다)를 본다.
