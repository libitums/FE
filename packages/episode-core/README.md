# @libitums/episode-core

에피소드 콘텐츠를 **읽고**(delivery-2 디코더 · 콘텐츠 주소) 그 문항을 **판정하는**(말하기 · 타일 · 보기 · 통과 기준 · 결정적 섞기)
순수 규칙의 패키지다. 앱(`apps/mobile`)과 랜딩 웹 체험판(`apps/landing`의 `/try/`)이 같은 함수를 쓴다.
결정은 [ADR-0081](../../docs/adr/0081-web-trial-and-episode-core.md), 경계 규칙은 [ADR-0004](../../docs/adr/0004-package-boundaries-and-dependency-direction.md)다.

`private: true` — 발행하지 않는다. **빌드하지 않는다** — `exports`가 `src`의 `.ts`를 그대로 가리키고, 소비자의 번들러
(rspeedy · Vite)와 vitest · tsc(`moduleResolution: bundler`)가 직접 읽는다. `dist` · 별칭 · 선행 빌드가 없다.

## subpath

진입점은 다섯뿐이고 와일드카드가 없다. `@libitums/episode-core/src/...`처럼 안쪽 파일을 import하지 않는다(`exports`가 막는다).

| import | 담는 것 |
|---|---|
| `@libitums/episode-core/episode` | `decodeEpisode` · 도메인 타입 전부(`Episode` · `LearningItem` · `DecodeResult` …) · `KNOWN_ITEM_TYPES` · `formatPath` · `isRecord` · `roleplayLinesOf`(최종 테스트 턴의 상대 · 내 줄 찾기) · `EPISODE_SELF_SPEAKER` |
| `@libitums/episode-core/lines` | `roleplayLinesOf` · `RoleplayLines` · `EPISODE_SELF_SPEAKER` — zod · `background-only`를 끌고 오지 않는 입구(앱 화면 경로 · 메인 스레드용). `./episode`도 같은 값을 내보낸다 |
| `@libitums/episode-core/judge` | `AnswerResult` · `NonEmpty` · 말하기(`judgeSpeaking` · `speakingWords` · `matchedWordCount` · `speakingChunks`) · `judgeRoleplayReply` · 타자 답(`isTypedAnswerCorrect` · `isTypedAnswerAccepted` · `normalizeAnswerText`) · 타일 답(`composeTileReply` · `canCheckTiles` · `judgeTileReply`) · `judgeChoice` · 통과 기준(`catalogPassCriterion` · `judgeAssessment`) |
| `@libitums/episode-core/content-url` | 버킷 주소(`CONTENT_BUCKET_PATH` · `contentBaseUrl` · `resolveContentUrlSafe`) · 음성 id → 경로(`contentAudioPathOf` · `contentAudioSourceOf` · `hasContentPlaceholder`) |
| `@libitums/episode-core/shuffle` | `shuffledOrder` — 씨앗 문자열로 정하는 섞기(같은 씨앗 = 같은 순서) |

와이어 형식(파일의 키 · 값)의 정본은 [콘텐츠 계약](../../docs/specs/episode-content-json-contract.md)이다.

## 넣지 않는 것

- **import 금지**: `@lynx-js/*` · `@libitums/ui-lynx*` · `node:*` · 앱 경로. 전역 `NativeModules` · `lynx`를 참조하지 않는다.
  `zod`를 import하는 비테스트 파일은 와이어 스키마 셋(`episode/episode-content.schema*.ts`)뿐이다. `background-only`는 디코더 `episode/episode-content.ts`의 첫 줄 하나뿐이다(Lynx lepus 조건에서는 던지는 메인 스레드 방어 표식, 웹 · node에서는 빈 모듈) — `./lines`의 import 그래프에는 zod도 이 표식도 없다. 모두 `src/package-boundary.unit.test.ts`(EC4 · EC5)가 지킨다.
- **화면 · 상태 · 문구**: 카드 뷰 · 문항 매핑 · 자리표시자 치환 · 리듀서는 각 앱에 남는다. 두 번째 소비자가 실제로 쓰기 전에는 옮기지 않는다(ADR-0004 D2).
- `zod`(`4.6.5`) · `background-only`(`0.0.1`)는 앱과 **같은 정확 버전**이다 — 루트 `pnpm test:trial-assets`의 TA4가 어긋남을 잡는다.

## 쓰는 쪽

- 의존 선언: `"@libitums/episode-core": "workspace:*"`(ADR-0004 D5).
- **앱**은 옛 모듈 경로(`lib/episode-content.ts` · `lib/content-audio.ts` · `screens/roleplay-story/roleplay-story.ts` 등)를 **얇은 재수출 모듈**로 남겼다.
  앱 안의 소비자는 그 옛 경로를 그대로 import하고, 패키지를 직접 import하는 앱 파일은 그 **17개뿐**이다(`apps/mobile/src/lib/episode-core-imports.unit.test.ts` EM1이 목록을 고정한다).
  메인 스레드 방어 표식 `background-only`는 앱의 `lib/episode-content.ts`와 패키지 디코더 양쪽에 있다. 화면 경로 파일(`app/catalog-final-model.ts` · `screens/catalog-cover/catalog-cover.ts`)은 값을 `./lines`에서 가져오고, `./episode`에서 런타임 값을 가져오는 앱 파일은 `background-only`로 시작하는 입구 둘뿐이다(EM3).
- **랜딩**은 디코더를 **빌드 때만** 부른다(`src/trial/trial-content.ts`) — 클라이언트 스크립트에는 판정 · 주소 · 섞기만 들고 zod · 디코더가 없다.

## 명령

```sh
pnpm --filter @libitums/episode-core typecheck   # tsc --noEmit
pnpm --filter @libitums/episode-core test:unit   # vitest run unit.test (환경 node)
```

루트 `pnpm typecheck` · `pnpm test:unit` · `pnpm test`(따라서 `pnpm verify`)가 이 패키지를 함께 돌고, `pnpm cycle:check`의 범위에 `packages/episode-core/src`가 있다.
2026-10-22 기준 unit 82건이다. 이 패키지에는 ui · integration 계층이 없다.
