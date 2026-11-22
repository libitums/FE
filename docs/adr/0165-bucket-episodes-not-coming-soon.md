# ADR-0165: 버킷에 있는 편은 「Coming soon」이 아니다 — 본문으로 서고, 차례가 된 편은 받기 상태를 표지에 보인다

- 상태: **채택** (2026-11-19)
- 날짜: 2026-11-19
- **사용자 결정** (2026-11-19): 「지금 버킷에 있는거 까진 커밍 순으로 안뜨게 바꿔줘」. 시안 https://claude.ai/artifact/BNuvEM1ArX3iGwq7EWw5L4 의 A · B · C를 함께 쓴다(보드 A, B, C, A+C).
- 바꾸는 결정: [ADR-0071](0071-episode-background-download.md) D4(원격 편은 자산을 다 갖춘 뒤에 연다) · [ADR-0157](0157-content-prefetch-window.md) D3(창 밖 편은 「준비 중」 카드). D1(창 = 진행 중인 편 + 다음 1편)은 그대로이고 코드를 D1의 글에 맞춘다.

## 맥락

- 2026-11-19 iPhone 13 mini에 새로 설치했더니 여정맵이 Ep10 다음 Ep11 ~ Ep17을 모두 「Coming soon」 카드로 보였다. 버킷 `manifests/level-5.json`에는 u00 ~ u17 18편이 있고 본문 sha가 모두 맞았다.
- 원인: 「준비 중」(`pending`)은 「목록에 없음」이 아니라 「그림 · 음성을 다 받지 못함」이었다(`episode-content-loader` `readSource`의 `keep`, ADR-0071 D4). ADR-0157이 미리 받기를 진행 중인 편 + 다음 1편으로 줄이자 창 밖 편은 자산을 받지 않았다.
  - 내장본이 있는 u01 ~ u10은 내장본으로 물러나 열린 편으로 보였다.
  - 내장본이 없는 u11 ~ u17은 「Coming soon」으로 남았다. 누르면 받아 열렸지만, 누르기 전엔 버킷에 없는 편과 구별되지 않았다.
- 창을 셀 때 「준비 중」 편을 빼고 열린 편만 세서(`use-download-gate` `windowKey`), u10을 끝낸 사용자의 창이 u10에 머물렀다. D1의 글(「준비 중」 편 포함)과 어긋났다.

## 결정

### D1. 내장본이 없는 원격 편은 본문 sha가 맞으면 연다 (A)

- `readSource`의 `keep`은 **내장본이 있는 원격 편만** 자산 완료 표시를 기다린다. 그 전에는 내장본으로 연다(지금 그대로). 내장본이 없는 편은 본문만으로 카탈로그에 든다.
- 그래서 버킷에 있는 편은 진도에 따라 보통 잠긴 편 · 열린 편으로 선다(표지 · 레슨 · 이야기 노드). 「Coming soon」은 목록의 마지막 편 다음의 맨 끝 구획 하나만 남는다.
- 그런 편의 자산을 받기 시작하면 맵을 한 번 다시 읽는다. 받기 차례가 다른 편의 자산을 받는 동안에도 새 편이 맵에 선다.
- 「준비 중」 카드는 본문이 아직 없는 동안(설치 직후 몇 초 · 첫 실행부터 오프라인)에만 선다.

### D2. 창은 맵의 모든 구획 순서로 센다 (C 데이터)

- `catalogPrefetchWindowOf`는 열린 편과 「준비 중」 편을 모두 맵 순서에 넣는다. 첫 미완료 편부터 1 + 1편이다. 마지막으로 끝낸 편 다음 편이 본문 전이어도 창에 든다.

### D3. 사용자 차례인 편의 표지 받기 표시 (B · C)

- 대상: 표지가 열렸고(`catalogCoverStatus` ≠ locked), 편을 끝내지 않았고, 튜토리얼이 아니고, 편 자산이 다 받아지지 않은 편이다. 진도로 잠긴 편에는 **늘 아무것도 보이지 않는다**.
- **C — 받는 중**: 열 때의 판정(`episodeOpenGate`)이 `open`이고, 받기 차례가 도는 중이고, 이 편이 받을 차례이면 C다. 받을 차례는 창 · 이번 실행에 연 편 · 허락한 편이다.
  - 표지 노드 둘레에 진행 고리(지름 128, 장식)를 겹친다.
  - 라벨 「Intro」 자리에 「Getting ready · n%」를 쓴다. n은 그 편의 파일 진행(본문 1 + 자산 경로 수)을 내림한 값이고, 다 받기 전에는 99 이하다.
  - 다 받으면 보통 「Intro」로 돌아온다.
- **B — 받아야 함**: 아래 경우에는 라벨이 「Tap to download · 크기」다(크기는 `assets_bytes`, 없으면 문구만).
  - 판정이 `ask` · `wifi-only` · `offline`인 경우: 요금 연결 · Wi-Fi 전용 · 오프라인.
  - 받기 차례가 끝났는데 다 받지 못한 경우(실패).
  - 받을 차례가 아닌 경우(창 밖).
  - 누르면 지금의 받기 문지기를 지난다(ADR-0095 D6 · D7 시트, `open`이면 창에 더해 받으며 연다).
- 낭독 이름에도 같은 문구를 붙인다(`Episode n. Intro, Getting ready · 42%`).
- 퍼센트가 바뀔 때만 상태를 바꾼다. 파일마다 오는 알림이 맵을 다시 그리지 않는다.
- 파일 모듈이 없는 호스트(Explorer · 옛 호스트)는 표시하지 않는다.
- 문구는 다섯 UI 언어(en · es · id · ja · vi)의 `catalogMap.coverDownload`에 있다.

## 버린 대안

1. **「준비 중」 카드의 문구만 바꾸기(받는 중 · 탭해서 받기)** — 버킷에 있는 편이 여전히 편 모양이 아니고, 진도로 잠긴 편까지 받기 안내가 서 사용자 차례와 섞인다.
2. **창 밖 편도 자산까지 미리 받기** — ADR-0157이 줄인 전송량(설치당 ≈ 61 MB → 5 MB)을 되돌린다.

## 대가

- 자산이 오기 전에 연 창 밖 편은 처음 몇 문항에 그림이 원격에서 늦게 뜨거나 소리가 없을 수 있다. u02 ~ u10을 창 밖에서 열 때와 같은 동작이다(ADR-0157 D3).
- 「준비 중」과 같은 그림의 카드는 본문 전 짧은 동안에만 남는다. 그 카드를 누르는 흐름(ADR-0095 D6 · D7)은 그대로다.
- 진행을 서버에서 불러오기 전에는 창이 새 사용자 창(u00 · u01)이다(ADR-0157 D1 그대로). 그동안 차례가 된 편은 받기 차례가 끝나면 B로 보일 수 있다. 진행을 불러와 창이 바뀌면 받기 차례가 다시 돌아 C로 바뀐다.

## 적용 기록

- ⟨2026-11-19⟩ 코드와 테스트:
  - `app/episode-content-loader.ts`(`keep`), `app/cover-download-state.ts`(`coverDownloadStateOf` · `catalogPrefetchWindowOf` · `catalogCoverDownloadsOf`), `app/use-asset-activity.ts`.
  - `lib/episode-refresh(-entry).ts`(`onAssetProgress`), `app/use-episode-content-refresh.ts`(진행 · 도는 중 · 받을 차례, 새 편 다시 읽기), `app/use-download-gate.tsx`(창 · 표지 표시).
  - `screens/journey-map/cover-download.ts`(라벨 · 고리 SVG), `CatalogCoverMapItem.tsx` · `SpecialUnitMapItem.tsx`(`ring`).
  - 테스트: unit EL9 · EL9b · CD1 ~ CD10 · CDL1 ~ CDL4, ui CCD1 ~ CCD4, integration PW-I1 ~ PW-I3 · I6(새 계약으로 고침).
