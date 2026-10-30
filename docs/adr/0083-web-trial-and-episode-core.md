# ADR-0083 — 랜딩 웹 체험판 `/try/`와 공유 패키지 `@libitums/episode-core`: 앱의 순수 규칙을 패키지로 떼어 랜딩이 같은 판정으로 u00을 돌린다

- 상태: **채택 — 클라이언트(랜딩 · 공유 패키지 · 앱 재수출).** 서버 · 버킷 변경 0, 호스트 변경 0, 앱 동작 변경 0.
  ⚠ **실기 확인 전이다** — unit · ui · integration · Playwright(chromium · firefox · webkit · Pixel 7 · analytics 둘)와 번들 · 스크립트 크기만 확인했다. iPhone Safari · Android Chrome의 소리 · 마이크 · 무음 스위치 · 보조 기술은 [웹 체험판 e2e](../e2e/web-trial.md) EU1 ~ EU8(미실행)이다.
- 날짜: 2026-10-22. **r2 갱신 같은 날**(D12 ~ D16 — 표지 제거 · 첫 탭 잠금 해제 · 꿈 전환 · Episode clear · 이메일 사전 등록 · 모바일 전체화면, 사용자 요청).
  **r3 갱신 같은 날**(D17 ~ D19 — 발음 기준 너그러운 말하기 채점 · 말하기 측정 · 인식 글자 수집, D14 정정 — 배너 「What happens next?」 뒤 곧바로 사전 등록, 사용자 요청).
- **사용자 결정**(2026-10-22): 랜딩(Astro)에 **앱 설치 없이** 브라우저에서 튜토리얼 u00을 3 ~ 5분 체험하는 페이지 · 주소 `/try/` · 흐름은 「이야기 + 핵심 다섯」 · 순수 함수는 **공유 패키지로 분리** · 음성은 **버킷** · 기준은 `feat/tutorial-u00` 위.
  같은 날 계약 v1.1의 답: **롤플레이 결과와 무관하게 엔딩 · 완료로 간다**(완료 화면이 결과에 따라 문구만 다름) · 주 버튼 · 놓인 타일 라벨은 **앱처럼 흰 글자** · 체험판은 **색인하지 않는다**(noindex · sitemap 제외) · 아이콘은 `@libitums/icons` 0.5.0을 랜딩 의존성으로.
- 다루는 축: 순수 규칙(디코더 · 판정 · 콘텐츠 주소 · 섞기)의 첫 `packages/` 이관과 그 경계 · 앱이 패키지를 import하는 방식 · 랜딩의 두 번째 페이지(상호작용 방식 · 콘텐츠 · 그림 · 효과음 · 음성의 출처 · 말하기 · 실패 처리 · 측정 · 색인).
  **다루지 않는 것**: 로그인 · 진행 저장 · 티켓 · 서버 호출, u00의 나머지 단원(S2 · S4 ~ S8 · S10 · S11 · S13), 앱 화면 · 흐름, 콘텐츠 · 음성 제작, Lynx for Web.
- 이어받는 결정: [ADR-0004](0004-package-boundaries-and-dependency-direction.md) D2 · D3 · D6(적용 기록) · [ADR-0003](0003-workspace-and-directory-structure.md) D5(적용 기록) · [ADR-0043](0043-landing-static-site.md)(적용 기록) · [ADR-0076](0076-episode-roleplay.md) D3(적용 기록) · [ADR-0081](0081-tutorial-as-catalog-episode.md) D1(적용 기록) · [ADR-0060](0060-episode-voice-remote-audio.md) D2(적용 기록).

근거 표시: **[코드]** 저장소 코드 · **[실측]** 빌드 · 테스트 · 버킷 GET · **[ADR]** 기존 결정 · **[사용자]** · **[추론]** 관찰 없이 이어 붙인 것.
계약의 정본은 저장소 밖 작업 폴더의 spec(v1.2)이고 이 문서는 그중 **결정**만 옮긴다. 시그니처 · test-id는 코드(`*.contract.ts`)가 진다.

**새 ADR인 이유**: 없던 축 둘(첫 앱 → 패키지 이관, 랜딩의 상호작용 페이지)을 처음 정하고, 기존 ADR 여섯의 사례가 한꺼번에 바뀐다 — 새 번호로 묶는다(ADR-0010 D10). 번호 0077은 다른 브랜치가 쓰고 있고, 0079 ~ 0082는 main에 먼저 들어와(0081 튜토리얼 · 0082 학습 문항 음성) 0083이다(처음 0081로 썼다가 옮김).

## 맥락

1. **앱의 디코더 · 판정은 Lynx에 기대지 않는 순수 TS다** [코드]. 디코더(`lib/episode-content*.ts`)는 `zod/mini`와 `background-only` 표식만 import하고, 판정(말하기 · 타일 답 · 선택 · 통과 기준) · 콘텐츠 주소 · 결정적 섞기도 순수 함수다. 그러나 `apps/mobile/src` 안에 있어 다른 앱이 쓸 수 없다(ADR-0004 D4 앱 → 앱 금지).
2. **u00 원문이 체험에 필요한 것을 다 담고 있다** [실측]. 버킷 `episodes/u00-tutorial.json`(37,777 B · sha256 `c9636a3d…377a` = 앱 내장본) — `pre_cuts` 6 · `post_cuts` 4 · S1 `VOCAB_CARD` · S3 `IMG_MATCH` · S9 `REPLY_SELECT` · S12 `CULTURE_CARD` · RP 3턴. 음성 id 31곳.
3. **버킷 음성은 브라우저에서 받을 수 있다** [실측 2026-10-22]. `audio/u00-tutorial/d-01.m4a` 200 · `audio/x-m4a` · **`access-control-allow-origin: *`** · `cache-control: public, max-age=31536000`.
4. **RP 음성은 디코더 확장 없이 나온다** [실측]. `roleplay.lead[0].audio_url` = `dialogue` seq n−1, `player_audio_url` = seq n — 앱의 `catalogRoleplayLinesOf(lineId, dialogue)`가 세 턴 모두 같은 id를 낸다.
5. **디코더가 `VOCAB_CARD`의 `audio_url` · `example_audio_url`을 버렸다** [코드]. 체험판의 단어 카드 음성에 필요하다.
6. **병행 브랜치가 옛 경로를 import한다** [코드]. `feat/audio-slow-playback`(ADR-0082, #297로 먼저 병합)이 `lib/episode-content.model` · `lib/content-audio`를 import하는 새 파일을 더한다.
7. **랜딩은 정적 HTML이고 스크립트가 하나였다** [ADR-0043 D2]. 상호작용 프레임워크 · 수화(hydration)가 없다.

## 결정

### D1. 공유 패키지 `packages/episode-core` = `@libitums/episode-core` — 소스 그대로 export, subpath 다섯

- `"private": true` · `"type": "module"` · `"sideEffects": false`. `exports`는 `./episode` · `./judge` · `./content-url` · `./shuffle` · `./package.json`뿐이다(와일드카드 없음, ADR-0004 D3). 각 subpath는 `src/<이름>/index.ts` 하나를 가리킨다.
- **빌드하지 않는다** — `exports`가 `.ts`를 직접 가리킨다. TS만 있고 CSS · JSX가 없어 산출물이 할 일이 없고, rspeedy(SWC) · Vite · vitest · tsc(`moduleResolution: bundler`)가 모두 그대로 읽는다. ui-lynx 같은 src 별칭 · 선행 빌드가 없다. 앱 빌드 성공으로 확인했다 [실측].
- 이름 근거: 담는 것이 「에피소드 콘텐츠를 읽고(디코더 · 주소) 그 문항을 판정하는(판정 · 섞기) 순수 규칙」이다.
- 의존: `zod` 4.6.5(앱과 같은 정확 판 — 동기 검사 TA4), 개발 `typescript` 6.0.3 · `vitest` 3.2.7(2026-10-23 4.1.12 — ADR-0013 정정 기록) · `@types/node` 22.20.0. 앱 · 랜딩 `dependencies`에 `"@libitums/episode-core": "workspace:*"`(ADR-0004 D5).
- **금지 import**(패키지 `src`): `@lynx-js/*` · `@libitums/ui-lynx*` · `node:*` · 앱 경로, 전역 `NativeModules` · `lynx` 참조. zod를 import하는 비테스트 파일은 와이어 스키마 셋뿐이다. 둘 다 패키지 테스트 EC4가 지킨다.
- ⟨2026-10-22 리뷰 반영⟩ **`background-only` 표식은 디코더 파일(`episode/episode-content.ts`) 첫 줄에만 둔다** — 앱의 메인 스레드(Lynx `lepus` 조건)에서 zod 디코더가 끌려오면 빌드가 던지게 하는 방어 장치다. 표식은 웹 · node(기본 조건)에서 빈 모듈이라 랜딩 클라이언트 JS에 아무것도 싣지 않는다(빌드 산출에 zod · 표식 0 확인). 화면 경로가 쓰는 값(`EPISODE_SELF_SPEAKER` · `roleplayLinesOf`)은 zod 없는 다섯째 진입점 **`./lines`**로 낸다. 요구사항의 「Lynx import 금지」는 런타임 API(`@lynx-js/*` · `NativeModules`)를 뜻하고, 표식은 요구사항이 처음부터 순수 TS 범위로 본 빈 패키지라 위반으로 보지 않았다.
- 루트 결선: `typecheck` · `test:unit` · `test:rest`에 이 패키지, `cycle:check` 범위에 `packages/episode-core/src`.

### D2. 옮기는 범위 — 체험판이 쓰는 것과 그것이 끌고 오는 것까지만

| subpath | 담는 것(원래 자리) |
|---|---|
| `./episode` | `decodeEpisode` · 도메인 타입 전부 · `KNOWN_ITEM_TYPES` · `formatPath` · `isRecord`(`lib/episode-content*.ts` 일곱), `roleplayLinesOf`(`catalogRoleplayLinesOf`), `EPISODE_SELF_SPEAKER`(`CATALOG_SELF_SPEAKER` 값) |
| `./judge` | `AnswerResult` · `NonEmpty`, 말하기 판정(`speakingWords` · `matchedWordCount` · `judgeSpeaking` · `speakingChunks`), `judgeRoleplayReply`, 타자 답(`isTypedAnswerCorrect` · `isTypedAnswerAccepted` · `normalizeAnswerText`), 타일 답(`composeTileReply` · `canCheckTiles` · `judgeTileReply`), `judgeChoice`, 통과 기준(`catalogPassCriterion` · `judgeAssessment`) |
| `./content-url` | `lib/content-audio.ts` 전부, `CONTENT_BUCKET_PATH` · `contentBaseUrl` · `resolveContentUrlSafe` |
| `./shuffle` | `app/catalog-shuffle.ts`(결정적 섞기) |

- 몸은 **글자 그대로** 옮겼다(⟨2026-10-22⟩ 처음엔 디코더 첫 줄 `background-only`를 지웠으나 리뷰 반영으로 되살렸다 — 위 D1). **앱에 남는 것**: 카드 뷰 · 문항 매핑 · 자리표시자 치환 · 리듀서 · `canListen`(말하기 상태 의존) · `isTypeableAnswer` · 요청 쪽(`sendGet`). 「나중에 쓸 것」은 옮기지 않는다(ADR-0004 D2).

### D3. 앱은 옛 경로를 얇은 재수출 모듈로 남긴다 — import 문 변경 0, 패키지를 import하는 앱 파일은 17개로 고정

- 옛 모듈 파일을 지우지 않고 패키지에서 다시 내보낸다(디코더 내부 여섯 파일만 지움). 앱의 다른 import 문은 바뀌지 않는다(테스트 import 셋만).
- 근거: ① 저장소 관례 — 소비자가 아는 모듈은 여전히 하나 ② **병행 브랜치 안전**(맥락 6) — 경로를 옮기면 그 병합이 글자 충돌 없이 타입 오류로 깨진다 ③ `background-only`가 앱 쪽 디코더 진입(`lib/episode-content.ts`)에 남아 메인 스레드 import 방어가 그대로다 ④ 앱 diff가 17파일로 준다.
- 규칙: 앱 `src`에서 `@libitums/episode-core`를 import하는 비테스트 파일은 **17개뿐**이다 — 새 소비처는 재수출 모듈을 거친다. 앱 테스트 EM1이 목록으로 고정한다.

### D4. 디코더 확장은 `VOCAB_CARD`의 음성 두 키뿐이다

- `audio_url` → `audioUrl?` · `example_audio_url` → `exampleAudioUrl?`(빈 값은 키 없음). 앱은 읽지 않는다. 와이어 정본은 [콘텐츠 계약](../specs/episode-content-json-contract.md) §7.2.
- **RP의 `lead` · `reask` · `player_audio_url` · `modes` · `accepted_answers`는 디코드하지 않는다** — 체험판의 상대 · 내 음성은 `roleplayLinesOf`로 나오고(맥락 4), 「네?」 다시 묻기는 요구에 없으며, `modes` · `accepted_answers`는 `answers[].ko`와 같다. 소비자가 없는 필드를 모델에 올리지 않는다(ADR-0004 D2).

### D5. 체험판은 정적 마크업 + 순수 리듀서 + 바닐라 컨트롤러다 — 새 런타임 의존 0

- Astro가 장면 전부(컷 묶음 둘 · 단어 카드 · 고르기 둘 · 문화 · 롤플레이 3턴 · Episode clear · 완료)를 **한 페이지에 굽고** 처음엔 컷 1만 보인다(r2 — 표지 없음, D12). 페이지 JSON(`script#trial-model`)을 읽은 컨트롤러가 행동 → `reduceTrial`(순수) → DOM 반영(`hidden` · 속성 · 글자 · 초점) → 파생(음성 단서 · 효과음 · 이벤트)으로 부작용을 낸다. **판정 · 전이는 리듀서만** 한다.
- 순서(r2): `prologue(pre_cuts 1 ~ 6) → vocab(S1) → image-match(S3) → reply-select(S9) → culture(S12) → roleplay(RP 3턴) → epilogue(post_cuts 1 ~ 4) → clear(배너 → 예고) → complete`. **롤플레이 결과와 무관하게 epilogue로 간다 — 사용자 결정** — 통과 기준(`catalogPassCriterion(3)` = 2)은 완료 문구와 측정에만 쓰인다. 고르기 문항은 통과에 들지 않는다(틀려도 정답을 보이고 넘어간다).
- 페이지 스크립트(같은 출처 `_astro/*.js` 합)는 **≤ 40,000 bytes**이고 zod · 디코더 문자열이 없다(빌드 테스트 IB5). 2026-10-22 실측 34,804 B → r2 **39,813 B**(여유 187 B) [실측].
- 주소 `/try/` · `/ko/try/`(`trialPathFor`). Hero · Download에 체험판 링크(`data-trial-link`). ~~완료 화면의 스토어 링크~~ → r2 이메일 사전 등록(D15).

### D6. 콘텐츠 · 그림 · 효과음은 랜딩의 바이트 같은 사본이고, 음성만 버킷에서 받는다

| 무엇 | 방식 |
|---|---|
| u00 JSON | 앱 내장본의 사본 `apps/landing/src/trial/content/u00-tutorial.json`. **빌드 때** `decodeEpisode` → 화면 모델 → 페이지 JSON. 디코드 · 모델이 실패하면 빌드가 실패한다. 클라이언트에 zod · 디코더가 없다. 포매터에서 뺐다(바이트를 지킨다) |
| 그림 12 | 앱 `src/assets/content/images/…`의 사본을 Astro 자산으로(해시 주소 · 같은 출처). r2에 엔딩 3 · 4(post-3 · post-4)가 더해져 약 1.4 MB |
| 효과음 5 | `apps/ios/Host/sfx/`의 사본 `public/trial/sfx/`(button · correct_answer · wrong_answer · pass_lesson · lesson_complete). 약 212 KB |
| 음성 | 버킷 `<base>audio/<id>.m4a`. 주소는 빌드 때 `contentAudioSourceOf` · `resolveContentUrlSafe`로 모델에 박힌다 |

- **동기 검사** `devtools/trial-assets/sync.unit.test.mjs`(TA1 ~ TA5, `pnpm test:trial-assets` — `pnpm verify`에 들어 있다): JSON · 그림 · 효과음이 원본과 바이트가 같고, 앱 매니페스트의 u00 version · sha256이 체험판 핀(`TRIAL_CONTENT`)과 같다. 루트 도구라 두 앱을 읽어도 패키지 의존이 아니다.
- **빌드 env `PUBLIC_SUPABASE_URL`**(앱과 같은 이름 · 공개 값): `astro.config.ts`가 `resolveTrialContentBase`로 한 번 검사한다. 빈 값 + 비프로덕션 → 소리 없는 체험판, **빈 값 + 프로덕션(`VERCEL_ENV=production`) → 빌드 실패**, `https://<호스트>` 꼴이 아니면 → 빌드 실패.

### D7. 소리는 Web Audio 컨텍스트 하나 — 첫 탭에서 잠금을 푼다

- ~~Start~~ r2: 체험판 안 **첫 버튼 탭**의 처리기 앞에서 **동기로** 잠금 해제(컨텍스트 생성 · `resume()` · 1샘플 무음 · 있으면 `navigator.audioSession.type = "playback"`) 뒤 시작한다(D12). **첫 탭 전에는 음성 · 효과음 요청이 0이다**(e2e TE3).
- 음성은 상태에서 파생된 단서다(앱 `AudioCue`와 같은 꼴) — 컷 · 단어 카드 · 고르기 자극 · 롤플레이 상대 줄(턴이 서면) · 내 줄(맞힌 뒤). 단계에 들어서면 다음 단계의 음성을 받아 둔다. 받기 8초 상한 · 해독 실패 · 404는 무음이고 진행에 닿지 않는다.
- 컷 타자 효과는 해독한 음성의 길이(`voiceLengthMs`)에 맞춘다 — 앱은 음성 정보 파일의 길이를 쓴다(ADR-0074). 계약에 없던 선택 포트다.

### D8. 말하기는 Web Speech — 앱과 같은 판정, 없거나 막히면 같은 턴을 타일로

- `SpeechRecognition ?? webkitSpeechRecognition`, `lang "ko-KR"` · 대안 3 · 8초 뒤 `stop()`. 권한은 첫 Speak가 묻는다(시작 화면에서 묻지 않는다).
- 판정은 패키지의 `judgeRoleplayReply`(대안 셋 중 맞는 첫 것 — 고르는 것은 리듀서) · 타일은 `judgeTileReply`. 앱과 같은 함수이고 **대안 수만 웹이 정한다**.
  **(r3)** 말하기는 그 위에 발음 기준을 더한 `judgeSpokenLenient`로 바꿨다(D17) — 앱 규칙으로 맞으면 strict, 소리가 가까우면 lenient. 타일 판정과 앱 판정은 그대로다.
- 생성자 없음 · `language-not-supported` → 처음부터 타일, 거부(`not-allowed` · `service-not-allowed`) → 그 턴부터 끝까지 타일, `audio-capture` · `network` 등 → 그 턴만 타일, `Can't speak now` → 그 턴 타일. 말하기 오답은 「Try again」 또는 `Can't speak now`만 있다 — 타일은 늘 판정되므로 막히지 않는다.

### D9. 측정 — GA4 이벤트 여섯을 더한다(닫힌 합집합 다섯 → 열하나)

| 이벤트 | 속성(전부 문자열) | 시점 |
|---|---|---|
| `trial_link_click` | `location`: hero · download | 랜딩의 체험판 링크 |
| `trial_start` | `speech`: supported · unsupported | 첫 탭(r2 — ~~Start~~) |
| `trial_step` | `step` · `ordinal` "1" ~ "9"(r2 — clear 8 · complete 9) | 단계에 처음 닿을 때(prologue는 첫 탭) |
| `trial_roleplay_result` | `verdict` · `correct` · `by_speech` · `by_tiles`("0" ~ "3") · `speech`(supported · unsupported · denied) | 마지막 턴 `next` |
| `trial_complete` | `verdict`: passed · failed | 완료에 들어설 때 |
| ~~`trial_store_click`~~ → `trial_preregister` | `status`: submitted · duplicate · failed(r2, D15) | 사전 등록 응답 뒤 |
| `trial_speech_attempt` (r3) | `turn` "1" ~ "3" · `outcome` strict · lenient · incorrect · no-speech · denied · unavailable · aborted · `latency_bucket` "0-2s" · "2-4s" · "4-6s" · "6-8s" · "8s+" | 말하기 시도 하나가 끝날 때(D18) |
| `trial_exit` (r3) | `step`: 나가기를 누른 단계 | 나가기 링크 |

- (r3) 체험판 페이지의 **모든 이벤트에 `browser`**(ios-safari · android-chrome · in-app · desktop · other — UA 순수 분류, D18)를 보낼 때 붙인다. 합집합 열하나 → 열셋.
- 들은 문장 · 대사 · 고른 보기 글 · 이름을 싣지 않는다 — 타입이 막는다. 랜딩과 같은 규칙(프로덕션만 · 동의 지역 기본값)이다. 체험판 페이지는 랜딩 `initAnalytics`를 부르지 않는다.
- 잴 것: 랜딩 → 체험 시작률(`trial_start` ÷ 랜딩 `page_view`) · 단계별 이탈(`trial_step` 유입 경로) · 완료율 · ~~완료 → 설치 클릭률~~ r2 완료 → 사전 등록률(`trial_preregister{submitted|duplicate}` ÷ `trial_complete`).

### D10. 체험판은 색인하지 않는다 — 사용자 결정

- `robots` = `noindex`(배포 환경과 무관), canonical · hreflang · JSON-LD 없음, sitemap에서 `/try/` 경로를 거른다. 검색 대상은 랜딩이고 체험판은 스크립트에 기대는 화면이다.

### D11. 접근성

- 단계마다 `<section aria-labelledby>` + 초점 받는 `h2`, 단계가 바뀌면 그 제목으로 초점. 컷이 바뀌면 초점은 Next에 두고 대사를 live region에 쓴다. 조작은 전부 `<button>`이고 보기 · 타일은 `aria-pressed`, 판정 뒤 보기는 `aria-disabled`(초점 유지).
- **문화 카드 뒤집기 · 마이크는 `aria-pressed`를 쓰지 않고 이름만 동작으로 바꾼다**(접근성 감사 W3 — 계약 v1.2).
- **롤플레이 조작 뒤 초점**(감사 C1 — 계약 v1.2): 힌트 → 힌트 글 · 판정 → Next 또는 Try again · Try again → Speak · 타일 전환 → 첫 타일 · 다음 턴 → 진행 표시.
- 낮은 화면(200% 확대)에서 턴 안쪽이 세로로 스크롤된다(C2). 섞인 언어에 `lang`(live region 조각 · 정답 글, W2). 타일 모드 안내 줄의 대비를 그늘 · 면으로 올렸다(W4 — 고치기 전 en 3.79:1, 지금은 e2e `trial-contrast`가 4.5:1 이상을 단언).
- 움직임 줄이기: 루트 `data-motion="reduced"` — 타자 효과 · 뒤집기 · 장면 전환 · 폭죽 없음. 타자 효과는 장식이고 글은 처음부터 DOM에 온전히 있다.
- **주 버튼 · 놓인 타일의 흰 글자 / 주황(3.02:1)은 앱과 같은 승인 예외다 — 사용자 결정** — axe `color-contrast`에서 그 두 선택자만 뺀다(ADR-0025 「미달로 반영」 사례의 웹 적용).

### D12. (r2) 표지가 없다 — 열자마자 컷 1, 첫 탭이 시작이다

- `start` 단계 · `TrialStart` · 시작 문구를 지웠다. 리듀서 처음 상태 = `prologue` · cut 0 · `begun: false`. 컨트롤러가 체험판 안 첫 버튼 탭의 처리기 **앞에서 동기로** ① 소리 잠금 해제 ② 전체화면 요청(D16) ③ `begin{speech}`(말하기 지원 판정 · `trial_start` · `trial_step prologue`) ④ prologue 음성 받기를 하고, 그다음 버튼 처리기가 돈다(첫 탭이 타자 중이면 글을 끝까지 보이기만).
- 근거: 컷 1 ~ 4는 음성이 없어 첫 탭 전 무음이 잃는 것이 없다 [실측 — u00 pre_cuts]. **버림**: 「탭하여 시작」 막(표지 제거 요청과 어긋난다).

### D13. (r2) 꿈 전환 — 컷 사이는 구름빛, 꿈에서 승무원으로는 깨어남

- 순수 `trialTransitionOf(prev, next, model)` → `"dream"`(prologue · epilogue 컷 사이, roleplay → epilogue, 배너 → 예고 — r3: 배너 → 완료) · `"wake"`(**prologue 마지막 자리로 들어가는 전환** — u00 컷 5 「누군가: 다음에 또…」 → 컷 6 승무원) · null(학습 단계 사이는 r1 페이드). 컨트롤러가 루트 `data-transition`을 `motion.duration.d8`(600ms) · `d9`(1000ms) 동안 붙이고, 장식 베일(`aria-hidden` · `pointer-events:none`)과 그림 흐림이 모양을 진다. 움직임 줄이기면 붙이지 않는다.
- DOM은 즉시 바뀌고 새 장면이 구름빛(최고점)에서 또렷해지는 **한 번의 모션**이다 — 초점 · 낭독이 타이머에 묶이지 않는다.
- **버림**: 꿈 컷을 음성 id 글자(`pre-5-dream`)로 판정(콘텐츠 명명에 기대 조용히 틀린다 — 순번 규칙을 unit이 u00 핀으로 잰다), 흐려짐 → DOM 교체 → 또렷의 두 번 모션(초점 · 테스트가 타이머에 묶인다).

### D14. (r2) Episode clear — 앱 배너 뒤 다음 이야기 예고

- 엔딩(post_cuts **1 ~ 4** — r1은 앞 둘) 뒤 `clear` 단계: 배너(검정 면 · 주황 「Episode clear!」 · 보상 모션, 앱 `EpisodeBannerScreen`과 같은 글 — ko 페이지도 영어) → **1600ms 뒤 또는 탭**에 예고(엔딩 마지막 컷 그림 위 「다음은 어떤 일이 벌어질까?」 · Next) → 완료. `lesson_complete` 효과음은 엔딩 → 배너로 옮겼다. 실패(failed)도 같은 길이다(r1 결정 유지).
- 예고 글은 컷과 같은 불투명 대사 상자 안이다 — 발 그늘만으로는 그림 위 제목이 2.88:1이었다(e2e 화소 표본).
- **(r3 정정 — 사용자 요청 「episode clear를 다음은 어떤일이 벌어질까 이런 형태의 영문구로 바꾸고 그 다음에 있는 해당 내용은 제거하고 바로 사전예약으로」)**: 배너 글을 **「What happens next?」**(en · ko 같은 영어 한 문구)로 바꾸고 **예고 장면을 없앴다**. 배너가 1600ms 뒤(또는 탭) **곧바로 완료(사전 등록)** 로 가고, 그 전환은 꿈 전환(`dream`)이다. 초점은 완료 화면 제목(이메일 칸이 아니다 — 모바일 자판이 저절로 올라와 폼을 가리지 않게, 다른 단계와 같은 단계 제목 규칙). 상태 `clearPhase` · 예고 문구 셋 · test-id 넷을 지웠고, `trial_step` 순번은 그대로다(clear 8 · complete 9 — 예고는 단계가 아니었다).

### D15. (r2) 완료 화면은 이메일 사전 등록 — Supabase 표 하나, PostgREST insert만

- 스토어 링크 대신 폼(레이블 · `type=email` · 개인정보 한 줄 「출시 소식만 보낸다」). 상태: 입력 → 보내는 중 → 완료(201 · 409 중복도 완료 — 등록 여부를 남에게 알리지 않는다) / 실패(네트워크 · 그 밖 · 10초 → 다시 시도). 형식은 클라이언트가 먼저 본다(`x@y.zz` · 254자).
- 요청: `POST <PUBLIC_SUPABASE_URL>/rest/v1/pre_registrations`, 머리 `apikey`(새 publishable 키는 JWT가 아니라 `Authorization: Bearer`로 보내지 않는다) · `Prefer: return=minimal`, 몸 `{email, locale, source:"web-trial"}`. 새 의존 0(`fetch`).
- 표 `public.pre_registrations`(마이그레이션 `20261022120000`): email 소문자 정규화 트리거 · 고유, RLS — anon은 세 열의 insert만, 읽기 · 고치기 · 지우기 불가, authenticated 불가(embedded-postgres MG1 ~ MG8).
- 새 빌드 env **`PUBLIC_SUPABASE_ANON_KEY`** — 프로덕션(`VERCEL_ENV=production`)에 없으면 빌드 실패, 비프로덕션에 없으면 폼이 「지금은 등록할 수 없어요」. 이벤트 `trial_preregister{status}`만 — 이메일은 DB에만 간다.
- **버림**: Edge Function(함수 배포가 하나 늘고 같은 경계가 RLS로 선다), 중복을 오류로 보이기(열거), `trial_store_click` 유지(링크가 없어 영영 0).

### D16. (r2) 모바일은 첫 탭에 전체화면

- `(pointer: coarse) and (hover: none)`이면 첫 탭에 `document.documentElement.requestFullscreen({ navigationUI: "hide" })`(없으면 webkit 접두) 한 번. 거부 · 던짐은 삼키고, 함수가 없으면(iPhone Safari) 아무 일도 없다. 완료에 들어설 때 · 나가기 · 홈 링크에서 푼다. 데스크톱은 부르지 않는다(폰 틀 그대로).

### D17. (r3) 말하기는 발음 기준으로 너그럽게 — 공유 패키지의 새 함수, 앱 채점은 그대로

- 사용자 결정(2026-10-22): 「Web Speech를 유지하고, 채점을 너그럽게」 · 「진짜 너그럽게 띄어쓰기 부호 뿐만아니라 발음」.
- 패키지 `@libitums/episode-core/judge`에 **`judgeSpokenLenient(accepted, alternatives)`**(+ `spokenUnitsOf` · `spokenSimilarity` · 기준 상수)를 더했다. 앱의 `judgeSpeaking` · `judgeRoleplayReply`는 바꾸지 않았고 앱은 새 함수를 import하지 않는다(앱 test:all 6,016 통과) [실측].
- ① 앱 규칙(`judgeRoleplayReply`)으로 맞는 대안이 있으면 **strict**. ② 아니면 발음형 자모 열의 편집 거리로 잰다 — NFC · 부호 · 띄어쓰기 · 군말(어 · 음 · 아 · 그 · 으 · 흠 · 엄) 떼기, 연음 · 받침 7대표음 · 비음화 · 유음화 · ㅎ 탈락/축약 · 된소리 = 예사소리 · 모음 동일시(ㅐ/ㅔ · ㅒ/ㅖ · ㅚ/ㅙ/ㅞ · ㅢ/ㅣ). 정답을 부호로 **마디**로 나눠 마디마다 들은 문장 안의 가장 비슷한 연속 구간과 맞추고(앞뒤 덧붙은 말 · 마디 순서 바뀜 허용), **문장 일치도 ≥ 0.75 그리고 모든 마디 ≥ 0.5**면 **lenient**. ③ 아니면 incorrect. 순수 TS · 새 의존 0.
- 기준은 u00 세 턴 정답으로 만든 사례 표(통과 21 · 오답 20 — 「처음이예요」 · 「처으미에요」 · 「감사함니다 진짜요」 · 「지금 부터요」는 통과, 정답 절반 · 다른 턴 · 다른 문장 · 빈 글은 오답)가 정한다 [실측 — unit]. 마디 하한이 없으면 「감사합니다」만 말해도 0.778로 넘는다.
- 화면에서는 strict · lenient 모두 `Great`다.

### D18. (r3) 말하기 측정 — 시도마다 한 번, 브라우저 분류를 모든 이벤트에

- `trial_speech_attempt{turn, outcome, latency_bucket}` — 듣는 중인 턴이 판정 · 실패 · 중단으로 바뀐 전이 하나에 한 번(늦게 온 결과는 0). 시간은 Speak부터 결과까지. `trial_exit{step}` — 나가기 링크.
- `browser`는 UA 글의 순수 분류이고 원문은 어디에도 싣지 않는다. 인앱(카카오톡 · 인스타그램 · 페이스북 · 네이버 · 라인 · 안드로이드 웹뷰)을 먼저 본다 — 인앱도 Safari · Chrome 글을 품는다. 순수 이벤트 함수는 그대로 두고 **보내는 접점(gtag 호출)이 붙인다**.
- `trial_roleplay_result`는 바꾸지 않았다 — lenient 수는 시도 이벤트에서 센다.

### D19. (r3) 인식 글자 수집 — 판정 뒤 Supabase 표에 한 줄, 녹음 없음 · 90일

- 사용자 결정: 「발음 수집도 되나」 → 「1번 진행」(인식된 **글자만**, 녹음은 하지 않는다).
- 말하기 판정(strict · lenient · incorrect)마다 `POST <PUBLIC_SUPABASE_URL>/rest/v1/trial_speech_samples` 한 번 — 사전 등록과 같은 공개 키 경로(`apikey` 머리만 · `Prefer: return=minimal`), **`keepalive: true`**(떠나는 중에도 끝나게), 기다리지 않음 · 실패는 조용히 버림 · 재시도 없음.
- 본문 열 아홉: `session_id`(체험을 열 때 `crypto.randomUUID()` — 메모리에만) · `episode_version`(`u00-tutorial@<사본 판>`) · `turn_index` · `expected`(가장 가까운 정답) · `alternatives`(최대 3 · 각 200자) · `outcome` · `similarity` · `browser` · `locale`. 사용자 식별 정보 · IP · UA 원문 열은 없다.
- 표(마이그레이션 `20261022130000`): RLS — anon은 아홉 열의 insert만, 읽기 · 고치기 · 지우기 · id · created_at 지정 불가, authenticated 불가. 길이 · 개수 · 값 범위는 check 제약(embedded-postgres SS1 ~ SS8). 보관 90일 — 삭제 함수 `purge_trial_speech_samples()`(anon · authenticated 실행 불가) + 예약 SQL `supabase/cron/trial-speech-samples-retention.sql`(pg_cron, 마이그레이션 아님 — 기존 `reengagement.sql`과 같은 방식).
- 마이크 아래 안내 한 줄 「What you say is saved as text to improve scoring.」 · 「말한 문장은 글자로 저장되어 채점을 개선하는 데 쓰여요.」(수집이 켜진 빌드만, 마이크 `aria-describedby`). 개인정보처리방침(Notion) 갱신은 사용자 몫이다 — 초안 [web-trial-speech-samples-privacy](../specs/web-trial-speech-samples-privacy.md).

## 버린 대안

1. **패키지 이름 `shared` · `core`** — 무엇의 경계인지 말하지 않아 아무거나 들어온다. `content`는 판정이, `learning-logic`은 디코더가 들지 않는다.
2. **패키지를 빌드해 `dist`로 export** — 별칭 셋 · 빌드 순서 · `pack:check`를 사는데 발행하지 않는다(ADR-0004 D7).
3. **앱 import를 전부 패키지 경로로 교체** — 약 100파일 diff에 병행 브랜치 병합이 타입 오류로 깨진다. 얻는 것은 경로 하나다.
4. ~~패키지에 `background-only`를 두지 않기~~ — 처음엔 「Lynx 표식을 웹이 지게 된다」며 버렸으나, 표식이 웹에서 빈 모듈이고 없으면 앱 메인 스레드 방어가 사라져 **채택으로 뒤집었다**(2026-10-22 리뷰 W2, D1).
5. **RP 필드(`lead` · `reask` · `player_audio_url`) 디코드** — 소비자가 없다(D4).
6. **랜딩이 `apps/mobile` 파일을 직접 import** — ADR-0004 D4 앱 → 앱 금지.
7. **런타임 JSON fetch** — 첫 화면 앞에 받기 · 실패 상태 · zod 번들이 든다. **빌드 때 버킷 fetch** — 빌드 · CI가 네트워크에 묶인다.
8. **그림을 버킷 원격으로** — 그림마다 env가 필요하고 버킷 장애에 빈 장면이 선다.
9. **음성 사본** — 저장소 어디에도 원본이 없어(ADR-0060) 사본이 조용히 어긋난다.
10. **Preact · Lit · Svelte 섬** — 런타임 · 렌더러 등록 · JSX 규칙이 랜딩에 새로 든다. **Lynx for Web** — 범위 밖. **장면을 스크립트로 생성** — ui 테스트가 빈 껍데기만 본다.
11. **`HTMLAudioElement` 하나 재사용** — iOS의 첫 재생 제스처 규칙이 요소마다 걸리고, 효과음과 겹치려면 요소가 늘어 같은 문제를 반복한다.
12. **체험판 색인 + 고유 메타** — 사용자 결정(D10).
13. **롤플레이 실패 갈래(다시 하기 화면)** — 사용자 결정(엔딩까지).
14. (r3) **앱 판정을 너그럽게 고치기** — 앱 채점이 바뀐다(사용자 요청은 체험판만). 새 함수만 더했다.
15. (r3) **정답 전체를 한 줄로 이어 편집 거리** — 마디 순서가 바뀌면(「감사함니다 진짜요」) 0.67로 떨어진다. **기준값 하나만** — 긴 마디 하나만 말해도 넘는다(마디 하한을 둔 까닭).
16. (r3) **발음 사전 · 음소 라이브러리** — 새 의존. 유니코드 산술과 규칙 일곱으로 사례 표를 넘는다.
17. (r3) **`navigator.sendBeacon`** — `apikey` 머리를 실을 수 없다. **수집을 Edge Function으로** — 사전 등록(D15)과 같은 이유로 RLS insert만.
18. (r3) **pg_cron 예약을 마이그레이션에** — 확장 설치 · 예약은 프로젝트 설정이라 마이그레이션 밖 SQL로 두고, 마이그레이션은 삭제 함수만 만든다(embedded-postgres로 잴 수 있다).

## 대가

1. **사본 셋(JSON · 그림 10 · 효과음 5)** — 원본이 바뀌면 동기 검사가 `pnpm verify`를 실패시킨다. 손으로 다시 복사하고 핀(`TRIAL_CONTENT`)을 고쳐야 한다 — u00 판이 오를 때마다 랜딩 변경이 따른다.
2. **음성은 원격이다** — 버킷 장애 · 오프라인이면 무음으로 진행한다. Firefox는 AAC(m4a) 해독이 실패할 수 있다(무음 진행). 프로덕션 빌드는 `PUBLIC_SUPABASE_URL`이 없으면 실패한다 — Vercel 랜딩 프로젝트의 Production 환경에 값을 넣는 것은 사용자 몫이다.
3. **iOS Safari를 확인하지 않았다** — 무음 스위치(`audioSession` 대응 [추론]) · 인식 뒤 음성 크기 · 경로 · Siri/받아쓰기가 꺼진 경우의 거부 판정은 실기에서만 보인다(EU1 ~ EU4). 무음 스위치에서 소리가 안 나면 음성만 `HTMLAudioElement`로 바꾼다(포트 `TrialAudio`는 그대로).
4. **웹이 앱과 다르게 선다** — 단어 카드 음성(D4)은 웹만 낸다. 앱의 학습 문항 음성은 [ADR-0082](0082-item-audio-and-slow-playback.md)(#297)의 몫이다. 웹은 대안 셋으로 판정을 고르고(D8), 고르기 문항 자극 음성을 낸다. 힌트에 로마자를 더했다(앱은 영어 뜻만 — 체험판은 S10 · S11을 건너뛰어 3턴째 표현을 배운 적이 없다).
5. **흰 글자 주황 3.02:1** — WCAG 1.4.3 미달을 앱과 같이 받아들인다(D11).
6. **패키지 경계가 테스트로만 지켜진다** — 17개 목록(EM1) · 금지 import(EC4)를 고치려면 테스트를 함께 고친다.
7. **접근성 감사 제안 다섯을 미뤘다** — 진행 막대 `aria-valuetext`(S2) · h1과 장면 제목(S4) · 마이크 권한 안내와 「Listening」 낭독(S6) · 새 탭 알림(S8) · 장면 글 대비 자동 검사(S9). 문구 키 · 계획 몫이다.
8. **프로덕션 HTML에 `data-testid`가 남는다**(ADR-0043 대가와 같다).
9. (r2) **사전 등록에 남용 방지가 없다** — 공개 키로 insert가 열려 있어 요청 빈도 제한 · 봇 막기가 없다. 메일 발송 · 동의 철회 경로도 없다(개인정보처리방침 갱신은 사용자 몫).
10. (r2) **iPhone Safari는 전체화면이 되지 않는다**(플랫폼 한계 — 지금처럼 주소창이 남는다). 배너 1.6초 자동 넘김은 앱과 같게 두었다 — 낭독기 사용자는 제목 낭독 중에 예고로(r3: 곧바로 완료로) 넘어갈 수 있다(접근성 점검 r2 W1).
11. (r2) **스크립트 여유가 187 B다**(39,813 / 40,000) — 다음 기능은 상한을 실측으로 올리거나 덜어 내야 한다. **(r3) 실측으로 올렸다 — 45,888 B, 상한 45,900**(발음 판정 · 시도 측정 · 수집 · 브라우저 분류, 사전 승인된 기능 증가 — IB5).
12. (r2) 새 env 둘째(`PUBLIC_SUPABASE_ANON_KEY`) — Production에 없으면 배포가 멈춘다. 표(마이그레이션)를 먼저 원격에 적용해야 폼이 성공한다.
13. (r3) **발음 기준은 뜻을 보지 않는다** — 「안녕하세요 네 처음이 아니에요」(뜻이 반대인 삽입)도 0.895로 통과한다. 받아쓰기 차이를 너그럽게 보는 대가로 받아들인다(사례 표에 한계로 적었다).
14. (r3) **기준 0.75 · 0.5는 u00 사례 표로만 정했다** — 실기 인식 결과로 다시 맞춰야 한다(수집이 그 자료다, EU12).
15. (r3) **수집 표도 남용 방지가 없다**(대가 9와 같음). 사용자가 말로 개인정보(이름 등)를 말하면 글자로 남는다 — 90일 뒤 지우고 service role만 읽는다. 예약 SQL을 실행하지 않으면 지워지지 않는다.
16. (r3) **`crypto.randomUUID`가 없는 옛 브라우저**(iOS < 15.4)는 안내 줄이 보이지만 보내지 않는다. 일부 엔진은 `keepalive` + CORS 사전 요청을 거부할 수 있다(조용히 버림 — 그만큼 덜 모인다).

## 재검토 조건

1. **`trial_start` ÷ 랜딩 방문이나 완료율이 낮으면** — `trial_step`의 마지막 단계 분포로 막는 장면을 보고 길이 · 순서를 다시 본다.
2. **EU3에서 무음 스위치가 소리를 막으면** — D7의 Web Audio를 음성만 `HTMLAudioElement`로 바꾼다.
3. **u00 판이 바뀌거나 체험판이 다른 에피소드를 쓰면** — 사본 방식(D6)과 빌드 때 버킷 fetch를 다시 견준다.
4. **앱이나 체험판이 「네?」 다시 묻기 · `modes`를 쓰기 시작하면** — D4의 RP 필드 디코드를 연다.
5. **패키지를 import하는 앱 파일이 늘어야 할 때 · 병행 브랜치가 다 병합되면** — 재수출 모듈(D3)을 걷고 직접 import로 바꿀지 본다.
6. **세 번째 소비자가 오면** — subpath 다섯의 경계가 맞는지 다시 본다.
7. **스토어 주소가 열리면** — 완료 화면을 사전 등록에서 설치 안내로 되돌릴지(또는 둘 다) 본다(D15).
8. (r2) **사전 등록에 스팸 · 대량 insert가 보이면** — Edge Function + captcha 또는 DB 빈도 제한으로 옮긴다(D15).
9. (r3) **수집된 lenient · incorrect 분포가 기대와 다르면**(정답인데 incorrect가 많거나, 다른 말이 lenient로 들어오면) — 기준 · 규칙을 사례 표에 실기 사례를 더해 다시 맞춘다(D17).
10. (r3) **수집 표에 이상 insert가 보이면** — 사전 등록과 함께 Edge Function · 빈도 제한으로 옮긴다(D19).

## 후속

- **실기 확인** — [웹 체험판 e2e](../e2e/web-trial.md) EU1 ~ EU8(미실행).
- **Vercel** — 랜딩 프로젝트 Production에 `PUBLIC_SUPABASE_URL` · (r2) `PUBLIC_SUPABASE_ANON_KEY`(사용자 작업, [랜딩 README](../../apps/landing/README.md) 「배포」).
- (r2) **마이그레이션 원격 적용** — `apps/supabase-functions/supabase/migrations/20261022120000_pre_registrations.sql`(사용자 확인 뒤, 랜딩 배포보다 먼저).
- (r3) **마이그레이션 원격 적용** — `apps/supabase-functions/supabase/migrations/20261022130000_trial_speech_samples.sql` → `supabase/cron/trial-speech-samples-retention.sql` 1회 실행(pg_cron, 사용자 확인 뒤). **개인정보처리방침(Notion)** 에 초안 [web-trial-speech-samples-privacy](../specs/web-trial-speech-samples-privacy.md)를 붙인다(사용자). 실기 발음 사례 수집 — [웹 체험판 e2e](../e2e/web-trial.md) EU12.
- 접근성 감사 제안 S2 · S4 · S6 · S8 · S9.
- 성능 보고서: [웹 체험판 — 번들만](../performance/reports/web-trial-iphone-17-pro-simulator-01.md)(앱 번들 +614 B, 상한 그대로) · (r3) [02 — 체험판 스크립트 상한](../performance/reports/web-trial-iphone-17-pro-simulator-02.md).

## 적용 기록 ⟨2026-10-26 — 체험판 u00은 2026-10-23판에 머문다⟩

- 앱 내장 u00이 버킷 최신본 `2026-10-26.3`(4스텝 · 앞 컷 `-v2` 7장)으로 바뀌었다([ADR-0081](0081-tutorial-as-catalog-episode.md) 적용 기록 ⟨2026-10-26⟩). 체험판 모델(`buildTrialModel`)은 옛 14스텝 구조를 짚어(`S3` 그림 고르기 · `S9` · `S12`) 새 판에서 `item-malformed S3.IMG_MATCH · step-missing S9 · step-missing S12`로 멈춘다.
- 그래서 **체험판 사본 · 핀 · 그림은 그대로 둔다**(`2026-10-23.1`). D6의 동기 검사(`devtools/trial-assets/sync.unit.test.mjs`)는 사본 · 핀을 앱 테스트 고정본(`apps/mobile/content/test-fixtures/bundled-2026-10-23`)과 견주고, 그림은 앱에 아직 있는 것만 앱 원본과 견준다. 옛 앞 컷 `pre-1` ~ `pre-6`은 이제 체험판 사본이 유일한 사본이다.
- **재검토 조건**: 체험판을 새 u00으로 옮길 때 — 모델 조립을 새 스텝 구성에 맞추는 별도 작업이다.
