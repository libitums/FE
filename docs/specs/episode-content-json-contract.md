# 콘텐츠 계약: delivery-2 에피소드 JSON

상태: **합의 대기** (콘텐츠 생산 쪽과 아래 「합의 항목」을 닫은 뒤 **계약 고정**으로 바꾼다)
작성: 2026-10-12 · 정정 2026-10-12 (파일 하나 = 유닛이 아니라 **에피소드 하나**. 아래 전부 그 기준)
근거 파일: `u01-water.json` · `u02-checkin.json` · `u03-mina.json` (`schema: "delivery-2"`, **각각 에피소드 1 · 2 · 3**)
후속: **2단계(와이어 스키마 + 디코더 + 픽스처)는 2026-10-12에 끝났다** — 산출은 §12. 합의는 여전히 대기이고, 합의로 모양이 바뀌면 이 문서와 §12의 모듈을 같이 고친다. 3단계(앱 구조 연결)는 §12 끝의 표. **3a(콘텐츠 소스 — 매니페스트 · 내장 · 원격 · 캐시)는 2026-10-12에 섰다** — §10이 계약이 됐고 전달 결정은 [ADR-0056](../adr/0056-episode-content-delivery.md)이 진다.

> 이 문서의 「필수 / 선택」은 **세 파일을 전수 측정한 관찰값**이다. `n/N`은 「그 키가 있는 개수 / 전체 개수」.
> 관찰값은 의도와 다를 수 있다. 다르면 합의 항목에서 가른다. 측정은 전 문항 288개 · 컷 25개 · 대화 34줄 · 단어 38개 · 패턴 4개를 대상으로 했다.

## 0. 용어 대응 — 파일의 이름과 앱의 이름

파일의 이름과 앱(ADR-0024 D10)의 이름이 다르다. **이 문서는 파일의 이름을 그대로 쓰고**, 앱 쪽 이름은 이 표로만 잇는다.

| 파일 | 앱 (ADR-0024) | 학습 | 비고 |
|---|---|---|---|
| 파일 하나 (`unit_id`) | **에피소드** 하나 | | 키 이름이 `unit_id`지만 에피소드다 → Q1 |
| `title` | 에피소드 제목 | | |
| `pre_cuts` | 첫 자리 **표지**(`episode-intro`) | 없음 | 컷을 차례로 읽는 특별 유닛 |
| `steps[]` 중 `S1` ~ `S9` | 가운데 **일반 학습 유닛** 하나씩 | 있음 | 유닛 하나 = 스텝 하나. `items`가 그 유닛의 문항 |
| `steps[]` 중 `RP` | 마지막 자리 **최종 테스트**(`episode-final`) | 있음 | **콘텐츠 쪽 수정 중** — 모양 미확정 |
| `post_cuts` | 최종 테스트 **통과 뒤** 진행 화면 | 없음 | 앱에 아직 자리가 없다 → §12 |
| `dialogue` | 에피소드의 본 대화 | | TURN_ORDER · ROLE_LINE · RP가 이 줄을 가리킨다 |
| `words` · `patterns` | 에피소드 어휘 · 패턴 | | 문항 `ref`가 가리키는 정본 |

---

## 1. 목적과 범위

- 서버(또는 번들)가 내려주는 **에피소드 하나의 JSON 모양**을 고정한다. 앱은 이 모양만 믿고 디코드한다.
- 에피소드가 늘어날 때 **앱 코드 변경 없이** 맵에 쌓이려면, 이 계약과 매니페스트(§10)가 먼저 고정돼야 한다.
- 범위 밖: 앱 내부 도메인 모델, 화면 매핑, 다운로드 방식. 그것은 이 계약 위에 따로 선다.

## 2. 에피소드 상위 구조 (파일 최상위)

| 키 | 필수 | 타입 | 관찰값 |
|---|---|---|---|
| `schema` | 필수 | `"delivery-2"` | 세 파일 모두 같은 값. 버전 판별자로 쓴다 |
| `unit_id` | 필수 | string | `u01-water` 꼴. 파일명과 같다. **에피소드 식별자다** → Q1 |
| `title` | 필수 | string | 한국어 |
| `day` | 필수 | int | 세 파일 모두 `1` |
| `time_of_day` | 필수 | string | 세 파일 모두 `"낮"` |
| `place` | 필수 | string | `title`과 같은 값 |
| `counterpart` | 필수 | string | 상대역 이름 |
| `pre_cuts` | 필수 | Cut[] | 4 ~ 6개. 표지 |
| `dialogue` | 필수 | DialogueLine[] | 8 ~ 13줄 |
| `post_cuts` | 필수 | Cut[] | 3 ~ 4개. 최종 테스트 통과 뒤 |
| `steps` | 필수 | Step[] | 9개 고정 = 학습 유닛 8 + 최종 테스트 1 |
| `words` | 필수 | Word[] | 10 ~ 15개 |
| `patterns` | 필수 | Pattern[] | 1 ~ 2개 |

없는 것: 에피소드 **순서**, 버전, 콘텐츠 해시. 식별자는 있지만 이름이 `unit_id`다. → §10, 합의 Q1.

## 3. 공통 텍스트 객체

세 언어 묶음이 곳곳에 나오지만 **키 구성이 자리마다 다르다**.

| 자리 | ko | roman | en |
|---|---|---|---|
| 컷 `line` · `narration` · `aside` | 필수 | 필수 | 필수 (37/37) |
| 대화 `text` · `textbook` | 필수 | 필수 | 필수 (34/34) |
| 문항 `prompt` | 필수 | **없음** | 필수 |
| 문항 `context` | 필수 | 필수 | 타입에 따라 (ROLE_LINE · ROLEPLAY_TURN은 필수, CLOZE · TURN_ORDER · SENT_BUILD · VOCAB_CARD는 없음) |
| `tiles[]` | 필수 | 필수 | TURN_ORDER만 선택 (81/92), 나머지 없음 |
| `answers[]` | 필수 | 필수 | 선택 (타입별 3/8 ~ 38/102) |
| `options[]` | 필수 | 필수 | IMG_MATCH 필수, LISTEN_SELECT · ROLE_LINE 선택, TRANSLATE_TO_EN 없음 |
| `example` (VOCAB_CARD) | 필수 | 필수 | 선택 (16/28) |

FE 제안: 단일 `Text = { ko, roman, en? }`로 통일한다. `en`은 어디서나 선택. `prompt`의 `roman` 부재는 허용(UI 지시문이라 로마자가 필요 없다). → 합의 Q12.

## 4. 컷 (`pre_cuts` = 표지 · `post_cuts` = 통과 뒤 화면)

`cut_kind`로 판별하는 union. 세 종류 모두 `index`(1부터 연속) · `kind`(`"pre" | "post"`, 담긴 배열과 같은 값) · `image_brief` · `image_url` 을 갖는다.

| `cut_kind` | 추가 필드 | 관찰 |
|---|---|---|
| `speech` | `speaker` · `line: Text` · `aside: Text` | 12개. `aside`는 지문(행동 묘사), 전부 있음 |
| `monologue` | `speaker` · `line: Text` | 2개. `speaker`는 `"플레이어"` |
| `narration` | `narration: Text` | 11개 |

- `speaker` 값: `낯선 사람` · `미나` · `사장님` · `앞손님` · `점원` · `플레이어`. 자유 문자열이고 `counterpart`와 일치하지 않는 경우가 있다(u02: `counterpart: 정윤경`, 컷 speaker: `사장님`). `플레이어`는 앱이 `Me`로 그린다(비주얼 노벨 `speakerRole: self`와 같은 자리).
- 두 배열은 모양이 같고 **자리만 다르다**. 표지는 D11에 따라 끝내기 전까지 뒤를 잠그고, 통과 뒤 화면은 RP 통과가 조건이다. 조건은 앱이 쥔다(§12).
- `image_url`은 25/25 채워져 있고 전부 `images/<unit_id>/<pre|post>-<index>.jpg` 상대 경로.

## 5. 본 대화 (`dialogue`) — 에피소드 하나의 전체 대화

| 키 | 필수 | 관찰 |
|---|---|---|
| `seq` | 필수 | 1부터 연속 |
| `role` | 필수 | `"counterpart" \| "player"` |
| `text` | 필수 | Text(en 필수) |
| `audio_url` | 필수 키 | **34/34 빈 문자열** |
| `textbook` | 선택 (1/34) | 교과서체 변형(u03 seq 4: 「반가워요」→「반갑습니다」) |

- 엄격히 번갈아 나오지 않는다(u01 seq 6 → 7 둘 다 player). FE는 교대를 가정하지 않는다.
- 세 에피소드 모두 counterpart로 시작한다.
- `{이름}` · `{나라}` 자리표시자가 player 줄에 들어 있다. → 합의 Q14.

## 6. 스텝 (`steps`) = 학습 유닛 8개 + 최종 테스트 1개

| 키 | 필수 | 관찰 |
|---|---|---|
| `id` | 필수 | 세 에피소드 모두 `S1, S3, S4, S5, S6, S7, S8, S9, RP` — **S2 없음** |
| `order` | 필수 | 1 ~ 9 연속 |
| `items` | 필수 | 3 ~ 19개 |

- `S1` ~ `S9`는 가운데 일반 학습 유닛 하나씩, `RP`는 마지막 자리 최종 테스트다(§0). 맵은 이 순서대로 노드를 그린다.
- 문항 `id`는 항상 `<step.id>-<2자리>`이고 에피소드 안에서 유일하다.
- 스텝별 문항 타입 구성은 세 에피소드가 거의 같다(S1 카드·CLOZE·IMG_MATCH, S3·S5 듣기·역할·순서, S6 받아쓰기, S8 역할·문장 만들기, S9 복습 혼합, RP 롤플레이). 이것이 **규칙인지 우연인지**는 합의 Q5. 규칙이면 에피소드마다 유닛 수가 8 + 1로 고정된다.
- **`RP`는 콘텐츠 쪽이 수정 중**(이미지 등 타입 추가). §7.4와 Q2 · Q15 · Q16은 수정본이 오면 다시 측정한다.

## 7. 문항 (`steps[].items[]`)

### 7.1 공통 필드

| 키 | 필수 | 관찰 |
|---|---|---|
| `id` | 필수 | `S1-01` 꼴 |
| `type` | 필수 | 아래 13종 |
| `mode` | 필수 | `card \| tiles \| choice \| typing \| match \| either`. **타입이 정하면 mode는 1:1로 따라온다**(예외 없음) |
| `event` | 필수 | `"E"`(노출) `\| "R"`(회상). E는 VOCAB_CARD(28/28) · CLOZE(4/41) · LISTEN_SELECT(3/37)에만 |
| `ref` | 필수 키 | `voca:` 190 · `patt:` 72 · `expr:` 13. **ROLEPLAY_TURN 13개는 빈 문자열** |
| `prompt` | VOCAB_CARD 빼고 필수 | `{ko, en}` |

### 7.2 타입별 필드 (13종, 288문항)

`●` 필수 · `○` 선택(n/N) · 빈칸 없음. `Text`는 §3.

| type | n | mode | event | context | stimulus | tiles | answers | options | 고유 |
|---|---|---|---|---|---|---|---|---|---|
| `VOCAB_CARD` | 28 | card | E | ● `{ko,roman}` | | | | | `example: Text`(en 16/28) · `card_kind: "단어"` |
| `CLOZE` | 41 | tiles | E 4 / R 37 | ● `{ko,roman}` ko에 `___` | | ● 3개 | ● 1개 | | |
| `IMG_MATCH` | 10 | choice | R | | ● `{image_brief, image_url:"", audio_url:""}` | | | ● 4개 (en 필수) | |
| `WORD_ORDER` | 3 | tiles | R | | | ● 3개 | ● 1개 (en 2/3) | | |
| `LISTEN_SELECT` | 37 | choice | E 3 / R 34 | ○ 3/37 (E일 때만) | ● `{audio: Text, audio_url:"", image_url:""}` | | | **○ 34/37 (R일 때만)** 4개 | |
| `TURN_ORDER` | 23 | tiles | R | ● `{ko,roman}` (prompt와 같은 문장) | | ● 4개 (en 81/92) | ● 1개 **`" \| "` 연결 문자열** | | |
| `ROLE_LINE` | 37 | choice | R | ● Text | | | | ● 3개 | `feedback: {correct: Text-ish, wrong?, wrong_option?}` (wrong 1/37) |
| `TRANSLATE_TO_KO` | 29 | typing | R | | | | ● 2개 (마침표 유무 변형) | | |
| `TRANSLATE_TO_EN` | 10 | choice | R | | ● `{text: {ko,roman}, audio_url:"", image_url:""}` | | | ● 4개 **ko · roman 자리에 영어** | |
| `DICTATION` | 51 | typing | R | | ● `{audio: Text, audio_url:"", image_url:""}` | | ● 2개 | | |
| `SENT_BUILD` | 4 | typing | R | ● `{ko,roman}` 패턴 안내 | | | ● 2개 | | |
| `PAIR_MATCH` | 2 | match | R | | | ● 4개 | ● 1개 **`"a=b \| c=d"` 문자열** | | `tiles_gloss_en: "x / y / z / w"` 문자열 |
| `ROLEPLAY_TURN` | 13 | either | R | ● Text 상대 대사 | ● `{text: Text, audio_url:"", image_url:""}` | ● 2 ~ 6개 | ● 1 ~ 2개 (en 필수) | | `feedback: {correct}` · `roleplay: {…}` (§7.4) · `ref: ""` |

### 7.3 `options[]` 불변식 (IMG_MATCH · LISTEN_SELECT · ROLE_LINE · TRANSLATE_TO_EN, 327개)

- `id`는 `o1` ~ `o4`, 문항 안에서 순서대로.
- `correct: true`는 **정확히 하나**.
- `why_wrong`은 **오답에만** 있고, 값은 327개 중 236개가 전부 같은 문자열 `"이 자리에 맞는 말이 아니다"`. → 합의 Q8.

### 7.4 `ROLEPLAY_TURN.roleplay` (13개) — ⚠ 최종 테스트. **수정 중이라 관찰값만 적는다**

| 키 | 값 | 상위 필드와의 관계 |
|---|---|---|
| `line_id` | `"D2"` … `"D10"` | `dialogue[seq = n]`의 **player 줄**을 가리킨다. `context`는 그 앞줄(seq n-1, counterpart) |
| `counterpart_line` | string | `context.ko`와 **13/13 동일** |
| `player_line` | string | `stimulus.text.ko`와 **13/13 동일** |
| `tiles` | string[] | `tiles[].ko`와 **13/13 동일** |
| `tiles_gloss` | `{tile, en?}[]` | 타일별 영어 주석. 상위에 없음 |
| `accepted_answers` | `{text}[]` | `answers[].ko`와 **12/13 동일**, u03 RP-02만 1개 vs 2개로 어긋남 |
| `modes` | `["speech","tiles"]` | 13/13 같은 값. 상위 `mode: "either"`와 중복 |

→ 합의 Q2.

## 8. 단어 · 패턴 (`words` · `patterns`)

**Word** (38개)

| 키 | 필수 | 관찰 |
|---|---|---|
| `id` | 필수 | `voca:<8hex>` 36 · `expr:<8hex>` 2. **세 에피소드 사이에 겹치는 id 없음** |
| `ko` · `roman` · `gloss_en` | 필수 | |
| `role` | 필수 | `target` 19 · `exposure` 11 · `contrast` 5 · `prereq` 3 |
| `grade` | 선택 (32/38) | `1급` · `2급` · `3급`. 없는 6개는 표현·숫자·고유명 |
| `example_ko` · `example_roman` | 선택 (8/38) | 둘은 항상 같이 있다 |

**Pattern** (4개): `id`(`patt:`) · `ko` · `roman` · `gloss_en` 전부 필수. `ko`에 `{명사}` · `{수단}` 슬롯.

**ref 무결성**: u01 75/75 · u02 118/118 해결. **u03(에피소드 3)은 82개 중 23개가 자기 `words`에 없는 id를 가리킨다** — `voca:ec5d9a98`(일주일) · `voca:e3c30bfa`(이름) · `voca:9710a021`(며칠), 셋 다 **에피소드 2의 words에만** 있다. 앞 에피소드 어휘를 다시 쓰는 것 자체는 자연스럽지만, 에피소드는 **따로 내려받는 단위**라 참조가 파일 밖으로 나가면 그 에피소드만으로 열 수 없다. → 합의 Q4.

## 9. 자산 참조

| 자리 | 키 | 관찰 |
|---|---|---|
| 컷 | `image_url` | 25/25 채움. `images/<unit_id>/<pre\|post>-<n>.jpg` |
| 컷 · IMG_MATCH | `image_brief` | 생성용 지시문. 앱은 아직 렌더하지 않지만 디코더가 `imageBrief`로 **보존**한다(대체 텍스트 후보 → Q23) |
| 대화 | `audio_url` | 0/34 채움 |
| 문항 `stimulus` | `audio_url` · `image_url` | 0/121 채움. IMG_MATCH조차 `image_url: ""` |

앱의 현재 자산 경로(참고): 이미지는 번들 import → `/static/…`(Android는 호스트가 재작성, ADR-0051). 오디오는 확장자 없는 **불투명 id**를 호스트 `AudioPlaybackModule`이 번들에서 찾는다(ADR-0017 D3). 원격 fallback은 아직 없다(ADR README 보류 표 「오디오 자산의 출처·형식」). → 합의 Q6 · Q21.

## 10. 매니페스트 — 계약 (`manifest-1`, 2026-10-12)

에피소드 JSON만으로는 「몇 번째 에피소드인가」와 「바뀌었는가」를 알 수 없다. 앱 변경 없이 에피소드가 쌓이려면 매니페스트가 필요하다. 유닛 목록은 매니페스트에 두지 않는다 — 에피소드 JSON의 `steps`가 정본이고, 맵은 그것으로 노드를 그린다.

**이 절은 제안이 아니라 계약이다** — FE가 3a(콘텐츠 소스)에서 `manifest-1`로 고정했다(2026-10-12). 앱 쪽 디코더는 `apps/mobile/src/lib/episode-manifest.schema.ts` · `episode-manifest.ts`이고, 전달 · 결합 · 캐시 · 잠금 규칙은 [ADR-0056](../adr/0056-episode-content-delivery.md)이 진다.

```jsonc
{
  "schema": "manifest-1",
  "generated_at": "2026-10-12T00:00:00Z",
  "min_client_level": 1,               // 선택. 정수. 앱의 CONTENT_CLIENT_LEVEL보다 크면 원격 항목을 잠근다
  "episodes": [
    { "id": "u01-water", "order": 1, "title": "익선동 골목 어귀 편의점",
      "schema": "delivery-2", "version": "2026-10-12.1",
      "sha256": "eb7624ae…15d9", "bytes": 79346, "url": "episodes/u01-water.json" },
    { "id": "u02-checkin", "order": 2, "title": "익선 게스트하우스 프런트", "schema": "delivery-2", "…": "…" },
    { "id": "u03-mina",    "order": 3, "title": "익선 게스트하우스 여성 도미토리", "schema": "delivery-2", "…": "…" }
  ]
}
```

| 키 | 필수 | 타입 | 뜻 |
|---|---|---|---|
| `schema` | 필수 | `"manifest-1"` | 다르면 매니페스트 전체를 버린다(`schema-mismatch`) |
| `generated_at` | 필수 | string | 생성 시각. 앱은 비교에 쓰지 않는다 |
| `min_client_level` | 선택 | int | 이보다 낮은 앱은 이 매니페스트에서 온 항목을 `client-too-old`로 잠근다. 앱은 지금 `CONTENT_CLIENT_LEVEL = 1` |
| `episodes[].id` | 필수 | string | 에피소드 id(= 파일의 `unit_id`, §0 · Q1). 매니페스트 안에서 중복이면 전체 거부(`duplicate-episode-id`) |
| `episodes[].order` | 필수 | int | 맵 순서. 오름차순, 같으면 `id` 사전순 |
| `episodes[].title` | 필수 | string | 본문을 받기 전에도 보이는 제목 |
| `episodes[].schema` | 필수 | string | 에피소드 JSON의 `schema`. 앱이 모르면 `unsupported-schema`로 잠근다 |
| `episodes[].version` | 필수 | string | `YYYY-MM-DD.n`. 숫자 인식 비교로 높은 쪽이 이긴다(같으면 내장) |
| `episodes[].sha256` | 필수 | string | 원문 UTF-8 바이트의 SHA-256, 소문자 hex 64자. 다르면 버리고 `integrity-mismatch` |
| `episodes[].bytes` | 필수 | int | 원문 UTF-8 바이트 수. 다르면 위와 같다 |
| `episodes[].url` | 필수 | string | 기준 상대 경로. 빈 값 · 선두 `/` · `..` 조각 · `://`가 든 값은 거부한다 |

모르는 키는 버린다(`.strict()` 아님).

- **`min_app_version` → `min_client_level`(정수)로 정정했다.** 제안본은 semver `min_app_version: "1.3.0"`이었는데, 앱의 JS에는 비교할 앱 버전 상수가 없다(`import.meta.env`는 SUPABASE · POSTHOG · ANALYTICS_ENVIRONMENT뿐). 그래서 콘텐츠가 요구하는 「클라이언트 수준」을 정수로 두고, 앱이 그 수준을 그릴 수 있게 되면 앱의 상수를 올린다. Q18의 「`min_app_version`으로 1차 차단」은 이 키로 읽는다.
- `title`을 매니페스트에도 두는 이유: 아직 내려받지 않은 에피소드도 맵에 **「준비 중」 구획으로 머리만** 보여야 한다(ADR-0024 D13 · D14의 `pending` 에피소드가 바로 이 상태다). 본문은 받은 뒤 채운다.
- `version` · `sha256` · `bytes`: 바뀐 에피소드만 다시 받는다. 받은 파일의 해시나 바이트 수가 다르면 버린다.
- `schema`: 에피소드마다 둔다. 앱이 모르는 스키마의 에피소드는 **잠근 채 목록에 세운다**(숨기지 않는다 — Q18의 FE 제안대로 앱 쪽을 정했다. 서버 쪽 정책 확인은 Q18에 남는다).
- **원격 경로**: 기준은 `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/`(Supabase Storage 공개 버킷 `content`). 그 아래 `manifest.json` · `episodes/<id>.json` · `images/<id>/…`. 에피소드 `url`과 컷 `image_url`은 이 기준의 상대 경로다. 오디오 파일의 출처는 아직 정하지 않았다(ADR README 보류 표 「오디오 자산의 출처·형식」). ⚠ 버킷은 아직 없다 — 생성 · 업로드는 사용자 확인 뒤(ADR README 보류 표).
- **내장 매니페스트**: `apps/mobile/content/manifest.json` — 번들에 실은 세 에피소드(`content/episodes/*.json`)의 실제 `sha256` · `bytes`를 적은 같은 형식의 파일이다. 사본을 바꾸면 이 파일도 같이 바꾼다.
- `day` · `time_of_day` · `place` · `counterpart`는 에피소드 JSON에 그대로 둔다.

> 2026-10-12 3a 리뷰 반영: 카탈로그 비교는 `compareVersions`(숫자 조각 비교 — `localeCompare` 금지, PrimJS), 원격이 이긴 항목이 준비되지 않으면 같은 id의 내장본으로 폴백, `episode-catalog.ts`가 `compareVersions` · `checkEpisodeText` · `parseCachedManifest`를 공용 검증 자리로 export(결합과 갱신이 같은 검사를 쓴다). 상세는 [ADR-0056](../adr/0056-episode-content-delivery.md) D2 · D3.

## 11. 합의 항목

각 항목은 **관찰 → FE 제안 → 콘텐츠 쪽 답**. 답이 「제안대로」면 그대로 계약이 된다.

| # | 관찰 | FE 제안 | 답 |
|---|---|---|---|
| **Q1** | 식별자 키가 `unit_id`인데 값은 에피소드다. 순서 · 버전 · 해시는 없다 | 순서 · 버전 · 해시는 §10 매니페스트에. 키 이름은 **`episode_id`로 바꾸기**를 제안하되, 바꾸기 어렵다면 `unit_id` 그대로 두고 이 문서 §0이 뜻을 진다 | 순서 · 버전 · 해시: **FE가 `manifest-1`로 고정(2026-10-12)** — §10. 키 이름은 콘텐츠 쪽 답 대기 |
| **Q2** ⏸ | `ROLEPLAY_TURN.roleplay`가 상위 `context` · `stimulus` · `tiles` · `answers` · `mode`를 다른 모양으로 다시 담는다. `accepted_answers`는 한 곳에서 `answers`와 어긋난다 | `roleplay`에서 **`line_id` · `tiles_gloss`만** 남기고 나머지는 지운다. 정답의 정본은 `answers`. **RP 수정본이 오면 다시 본다** | |
| **Q3** | `LISTEN_SELECT` E 3개는 `options`가 없고 `context`가 있다. R 34개는 반대 | 모양이 다르면 타입을 나눈다: `LISTEN_EXPOSE`(E, options 없음) · `LISTEN_SELECT`(R, options 필수). `event`로 모양을 갈라 읽지 않는다 | |
| **Q4** | 에피소드 3이 에피소드 2에만 있는 단어 3개를 ref로 가리킨다(23문항) | 각 에피소드는 **자기 `words`로 모든 ref를 해결**한다. 앞 에피소드 단어는 `role: "prereq"`로 다시 싣는다(이미 그 role이 있다). 앱은 에피소드 단위로 받으므로 전역 사전을 가정하지 않는다. 대안은 매니페스트에 공용 사전 파일을 하나 더 두는 것인데, 에피소드 하나만 받아도 열려야 한다는 조건이 깨져 권하지 않는다 | |
| **Q5** | 스텝 id가 S1 · S3 ~ S9 · RP로 S2가 비어 있고, 세 에피소드의 스텝 구성이 같다 | 앱은 `order`만 믿고 `id`는 표시용 불투명 문자열로 본다. S2가 **예약 자리인지 삭제된 자리인지**, 그리고 「학습 유닛 8 + 최종 테스트 1」이 모든 에피소드의 규칙인지 답을 달라. 맵이 에피소드마다 노드 수를 바꿔 그려야 하는지가 여기서 정해진다 | |
| **Q6** | `audio_url` · 문항 `image_url`이 전부 `""`. 컷 `image_url`은 상대 경로 | **빈 문자열 금지**: 없으면 키를 뺀다. 있으면 매니페스트 기준 상대 경로. 오디오는 URL이 아니라 **불투명 id**(예: `u01-water/d-02`)로 주면 호스트 모듈 규약(ADR-0017 D3)에 바로 맞는다. 오디오 id는 항상 같은 객체의 텍스트(`audio: Text` 또는 `text: Text`)와 **쌍으로** 온다 — id만 있고 텍스트가 없는 자리는 계약 위반 | **답(2026-10-12, 부분)**: 오디오는 id 규약으로(부록 C). 이미지는 상대 경로 유지, 수령본은 부록 D. 빈 문자열 금지 여부는 미답 |
| **Q7** | `TRANSLATE_TO_EN.options[]`가 영어를 `ko` · `roman`에 넣는다 | 보기는 `{ id, text: string, correct, why_wrong? }`로 바꾸거나, 최소한 `en`에 넣고 `ko` · `roman`을 뺀다 | |
| **Q8** | `why_wrong` 236개가 전부 같은 자리표시자 문장 | 실제 문구가 올 때까지 **키를 뺀다**. 앱은 자리표시자를 렌더하지 않는다 | |
| **Q9** | `ROLE_LINE.feedback.wrong` · `wrong_option`이 37개 중 1개에만 있다 | 계획된 기능이면 모양을 `wrong: { [optionId]: Text }`로 고정하고 전 문항에 채우거나, 아니면 뺀다 | |
| **Q10** | `dialogue[].textbook`이 34줄 중 1줄 | 「교과서체 변형」으로 선택 필드 유지. 의미를 한 줄로 적어 달라(앱이 어디에 보여줄지 정해야 한다) | |
| **Q11** | `words[].grade` 32/38, `example_ko` · `example_roman` 8/38 | 둘 다 선택으로 고정. 예문은 `example: { ko, roman }` 객체로 바꿔 다른 자리와 맞춘다 | |
| **Q12** | 세 언어 묶음의 키 구성이 자리마다 다르다(§3) | `Text = { ko, roman, en? }` 하나로. `prompt`만 `{ ko, en }` 허용. `en`은 채점에 쓰지 않는다는 전제 확인 | |
| **Q13** | 대화가 엄격히 교대하지 않는다 | 허용. 앱은 `role`만 본다. 확인만 | |
| **Q14** | `{이름}` · `{나라}`(대화 · 롤플레이 정답) · `{명사}` · `{수단}`(패턴) 자리표시자 | 치환 규칙을 정한다. 제안: `{이름}` · `{나라}`는 **앱이 프로필로 치환**하고 채점은 치환 뒤 문자열로. 패턴 슬롯은 표시용이라 치환하지 않는다. 치환 대상 토큰 목록을 계약에 고정 | **답(2026-10-12, 사용자 = 콘텐츠 생산자)**: 제안대로 — 앱이 프로필로 치환, 채점은 치환 뒤 문자열. ⚠ 앱에 이름 · 국가 프로필 필드가 아직 없다(3단계 결정 D-PROFILE) |
| **Q15** ⏸ | `mode`는 `type`에서 1:1로 결정된다. `roleplay.modes`는 `mode: "either"`의 중복(RP 수정본 뒤) | `mode`를 **빼고** 앱이 `type`에서 유도한다. 남기려면 「타입당 하나」를 불변식으로 적는다 | |
| **Q16** ⏸ | `ROLEPLAY_TURN.ref`가 `""`(RP 수정본 뒤). `card_kind`는 `"단어"` 하나 | `ref`는 없으면 키를 뺀다(Q6과 같은 원칙). `card_kind` 가능한 값 목록을 달라 | |
| **Q17** | `TURN_ORDER.answers[0].ko`가 `"문장1 \| 문장2 \| …"`, `PAIR_MATCH.answers[0].ko`가 `"a=b \| c=d"`, `tiles_gloss_en`이 `"x / y / z"` | 문자열 인코딩을 버린다. TURN_ORDER: `answer: number[]`(tiles 인덱스 순서). PAIR_MATCH: `pairs: { left: Text, right: string }[]`. 앱이 구분자를 파싱하지 않는다 | |
| **Q18** | 앱이 모르는 `type` · `schema`를 만났을 때의 규칙이 없다 | 매니페스트 `min_app_version`으로 1차 차단. 그래도 모르는 문항 타입이 오면 **그 에피소드를 잠근 채 표시**(숨기지 않음 — 이미 `pending` 구획이 그 모양이다). 어느 쪽이든 서버 쪽 정책 확인 | |
| **Q19** | 컷 `kind`가 담긴 배열과 같은 값 | 중복이지만 무해. 유지 | |
| **Q20** | `tiles` · `options` 순서가 **표시 순서인지 섞어야 하는지** 알 수 없다 | 앱이 섞는다. 단, `WORD_ORDER` · `TURN_ORDER`의 tiles는 이미 정답 순서가 아닌 것으로 보인다 — 확인 | |
| **Q21** | 오디오가 하나도 없다(§9) | 에피소드 1 ~ 3 출시 범위에 **오디오가 들어가는지** 먼저 답을 달라. 들어가면 Q6의 id 규약 + 파일 형식(m4a) + 매니페스트 등록. 안 들어가면 `LISTEN_SELECT` · `DICTATION`은 `stimulus.audio` 텍스트만으로 성립하지 않으므로 그 문항들의 처리(숨김 / TTS / 텍스트 노출)를 정해야 한다. **들어가든 안 들어가든** `stimulus.audio`(LISTEN_SELECT · DICTATION)와 `dialogue[].text`의 `ko · roman · en`은 오디오의 **텍스트 대체(전사)** 로 계속 필수다 — 오디오가 추가돼도 빼지 않는다(WCAG 1.2.1). 앱은 재생 불가 · 무음 · 스크린리더 환경에서 이 텍스트를 노출할 수 있어야 하며, DICTATION처럼 텍스트 노출이 문항을 무너뜨리는 타입은 **노출 시점(답 제출 뒤)** 을 제품이 정한다 | **답(2026-10-12)**: 오디오 **들어간다** — 파일은 부록 C 목록대로 제작. 파일이 오기 전까지 앱은 텍스트를 보여 주고 재생 버튼을 비활성 |
| **Q22** | `post_cuts`의 등장 조건이 파일에 없다 | 「RP 통과 시 한 번」으로 앱이 쥔다. 재진입 시 다시 볼 수 있는지(표지는 D12로 건너뛰어도 완료다)와 **RP 불통과 시 재시도 규칙**은 콘텐츠가 아니라 제품 결정이므로 여기서는 묻기만 한다 | |
| **Q23** | 컷 · IMG_MATCH 이미지의 **대체 텍스트** 출처가 없다. `image_brief`가 유일한 텍스트인데 컷은 한국어 장면 묘사, IMG_MATCH는 `"<영어 키워드> - 한 컷으로 알아볼 수 있게"`로 생성 지시문이 섞여 있다 | 이미지가 있는 자리(컷 · `stimulus.image_url`)에 `image_alt: { ko, en }`을 **별도 키**로 추가한다. `image_brief`는 생성용으로 남기고 앱은 alt로 쓰지 않는다. IMG_MATCH의 `image_alt`는 **정답 한국어 단어를 담지 않는다**(영어 묘사만, 예: `"a glass of water"`). 컷의 `image_alt`는 장면 묘사이되 대사 · 지문(`line` · `aside` · `narration`)과 중복하지 않는다(그 텍스트는 이미 화면에 읽힌다). 추가가 어렵다면 **IMG_MATCH에 한해** `image_brief`의 `" - "` 앞 영어 키워드를 alt로 쓰는 것을 허용하고 그 형식을 불변식으로 고정한다 | |
| **Q25** | **`TURN_ORDER`에 턴별 화자 표기가 없다.** `tiles` · 정답 순서 어디에도 그 턴이 상대 말인지 학습자 말인지 적혀 있지 않다 | 앱은 정답 순서의 **짝수 칸(0, 2, …) = 상대 · 홀수 칸 = 학습자**로 번갈아 가정해 대화 조립(좌 회색 · 우 주황 말풍선)을 그린다(2026-10-13 사용자 결정). 가정이 틀리지 않게 `tiles[]`에 `role: "counterpart" \| "player"`(`dialogue[].role`과 같은 어휘)를 싣거나, 최소한 문항에 첫 화자(`first_speaker`)를 달라. Q13처럼 대화가 엄격히 교대하지 않는 문항이 있으면 가정이 어긋난다 | |
| **Q26** | **`u01-water`의 S3-05 · S3-10 · S5-09 정답 순서 확인.** 세 `TURN_ORDER`의 정답이 `아니요, 괜찮아요. \| 삼천 원입니다. \| 카드로 할게요. \| 영수증 드릴까요?` 순서로 「아니요, 괜찮아요.」로 시작해 대화 흐름과 어긋나 보인다(영수증을 묻기 전에 「괜찮아요」라고 답한다) | 앱은 데이터대로 채점한다 — 이 순서가 맞는지 확인하고, 틀리면 정답 순서(`answers[0].ko`)를 바로잡아 달라 | |

⏸ 표시는 RP(최종 테스트) 수정본이 오기 전까지 답을 미루는 항목이다.

## 12. 2단계 산출(2026-10-12)

합의와 무관하게 FE가 먼저 할 수 있는 것 — 와이어 스키마 · 디코더 · 도메인 모델 · 픽스처 — 을 넣었다. **이 절은 §2 ~ §8의 관찰값을 코드로 옮긴 것**이고, 합의 Q1 ~ Q23의 어느 답도 선취하지 않는다. 합의로 모양이 바뀌면 와이어 스키마와 디코더의 변환부만 바뀌고 도메인 타입과 그 소비자는 손대지 않는다(와이어/도메인 분리).

**모듈** (`apps/mobile/src/lib/`, 평면 파일 · 접두 `episode-content.`)

| 파일 | 역할 | 스레드 |
|---|---|---|
| `episode-content.schema.ts` | 와이어 스키마 `deliveryEpisodeSchema`(`zod/mini`) · `KNOWN_ITEM_TYPES`(§7.2의 13종) · `z.infer` 타입. **`src/` 안에서 `zod`를 import하는 파일은 이것과 매니페스트 스키마 `episode-manifest.schema.ts` 둘뿐이다**(unit 테스트가 고정, 3a에서 둘로) | `background-only` |
| `episode-content.model.ts` | 도메인 타입만(`Episode` · `LearningItem` · `DecodeResult` …). import 0 | 타입만 |
| `episode-content.normalize.ts` | 공통 헬퍼 · 컷 · 대화 · 단어 변환 | `background-only` |
| `episode-content.items.ts` | 문항 변환 · TURN_ORDER / PAIR_MATCH 문자열 정답 풀이 | `background-only` |
| `episode-content.ts` | `decodeEpisode(input: unknown): DecodeResult` + 도메인 타입 re-export. **소비자는 이 경로 하나만 import한다** | `background-only` |

런타임 모듈 넷의 첫 줄은 `import "background-only";`다 — 메인 스레드 번들에 실리면 빌드가 깨진다(`posthog-client.ts` 선례, ADR-0029 D3). `zod` `4.6.5`는 `apps/mobile` `dependencies`에 있다(ADR-0013 D5 「첫 설치 뒤 더해진 `dependencies`」).

**픽스처** — `apps/mobile/content/episodes/u01-water.json` · `u02-checkin.json` · `u03-mina.json`. 원본의 **바이트 사본**(sha256 동일, 포맷터 글롭에서 제외). ⟨2026-10-12⟩ 3a부터 **번들에 들어간다** — `src/lib/episode-bundled.ts`가 내장 에피소드로 import한다(ADR-0056 D1). 그래서 이 사본이 곧 내장본이고, 바꾸면 `content/manifest.json`의 `sha256` · `bytes`도 바꾼다. 콘텐츠의 사본이므로 손으로 고치지 않는다 — 합의로 원본이 바뀌면 통째로 바꾼다(Q4가 「제안대로」면 u03은 고쳐진 파일로).

**디코더 정책**

- 모르는 **키**는 버린다(`.strict()` 아님) — RP 수정본이 키를 더해도 에피소드가 죽지 않는다.
- 모르는 문항 **`type`**은 에피소드 단위 **실패**(`unknown-item-type`) — 화면이 그릴 수 없으므로 호출자가 「잠근 채 표시」한다(Q18). 부분 성공(일부 유닛만)은 없다.
- RP(최종 테스트) 문항은 **불투명** — `{ id, type: "ROLEPLAY_TURN" }`만 검사하고 원본을 `raw`로 보존한다. 엄격 스키마는 RP 수정본 뒤 별도 작업(Q2 · Q15 · Q16).
- 미해결 `ref`는 실패가 아니라 **경고**(`unresolved-ref`) — Q4 합의 전이고 u03이 실제로 그렇다(23건).
- 정규화는 이 문서가 약속한 것만: 키 camelCase · `unit_id → id` · 빈 문자열 URL/ref → 키 생략(Q6) · TURN_ORDER 정답 → 타일 인덱스 배열 · PAIR_MATCH 정답 → 짝 배열(Q17) · 스텝을 `order`로 정렬해 학습 유닛 / 최종 테스트로 가름. 그 밖의 재해석(타일 섞기 · 자리표시자 치환 · `why_wrong` 제거 등)은 하지 않는다 — 전부 Q 항목이라 합의 뒤.

**`DecodeIssueCode`** — `{ code, path, message }`. `path`는 **와이어 경로**(`steps[0].items[3].options`)라 콘텐츠 쪽에 그대로 돌려줄 수 있다.

| code | 뜻 | 실패 / 경고 |
|---|---|---|
| `schema-mismatch` | `schema !== "delivery-2"`(또는 객체가 아님). 이것만 돌려주고 끝 | 실패 |
| `unknown-item-type` | 문항 `type`이 13종 밖. 구조 검사보다 먼저 보고 이것만 돌려준다 | 실패 |
| `invalid-shape` | zod 구조 실패(그 밖 전부). 전부 모아 돌려준다 | 실패 |
| `option-correct-count` | `options`의 `correct: true`가 정확히 하나가 아님(§7.3) | 실패 |
| `duplicate-item-id` | 에피소드 안 문항 `id` 중복(§6) | 실패 |
| `final-test-missing` | `id === "RP"` 스텝이 0개 또는 2개 이상 | 실패 |
| `final-test-position` | RP의 `order`가 마지막이 아님(다른 스텝이 RP 이상이면 — 동점 포함) | 실패 |
| `string-answer-malformed` | TURN_ORDER / PAIR_MATCH 문자열 정답을 풀 수 없음(§7.2 · Q17) | 실패 |
| `unresolved-ref` | 문항 `ref`가 자기 `words` · `patterns`에 없음(§8 · Q4). 문항마다 하나 | **경고** |

**테스트** — unit 50(`episode-content.unit.test.ts`: 최소 에피소드 변이 · 정규화 · 거부 · `zod` import 단일성 · `background-only` 첫 줄) · integration 27(`episode-content.integration.test.ts`: 디스크의 실제 세 파일 → `decodeEpisode`, 13종 전부 디코드 · 와이어 키 잔존 0 · u03 경고 23 · 결정성).

**앱 구조에 맞출 때 FE가 따로 정해야 하는 것** (콘텐츠 합의와 무관, ADR-0024 확장 후보)

| 파일 | 지금 앱 | 필요한 일 |
|---|---|---|
| `pre_cuts` | `EpisodePrologue`는 `call \| messenger \| visual-novel` 세그먼트 | ~~컷 세그먼트 종류를 하나 더 두거나, 기존 `EpisodeNarrativeBeat`에 얹는다~~ **결정(2026-10-12, 3b-2)**: 튜토리얼 서사에 얹지 않고 **새 화면** `catalog-cover`(`screens/catalog-cover/`)가 그린다 — 대사 · 내레이션 · 독백(`thought` 패널, 괄호) · 지문(패널 안 ko + en), 화자 `플레이어`는 `Me`. [ADR-0024](../adr/0024-journey-units-and-special-unit-placement.md) D15 · `docs/screens.md` 「카탈로그 표지(컷)」 |
| `S1` ~ `S9` | 유닛 → `JourneyStep`(닫힌 8개 id) → 학습형별 문항표 | 유닛 id를 열고(`<episode>/<step.id>`), 유닛 안 문항 목록은 `items`를 그대로 순서대로 낸다. 학습형 7개 테이블은 `type` 판별 하나로 합친다 |
| `RP` | `EpisodeFinalTest`는 `format: visual-novel \| call` + `speaking \| word-choice \| writing` | RP 수정본을 보고 결정. 지금 모양은 `ROLEPLAY_TURN` 하나뿐이다 |
| `post_cuts` | **자리 없음** — D10은 「마지막 자리 = 최종 테스트」 | 최종 테스트 결과 화면 뒤에 컷 열람을 붙이거나, 튜플에 네 번째 자리(통과 뒤 화면)를 더한다. 어느 쪽이든 ADR-0024 D10의 확장이라 결정 기록이 필요하다 |
| 매니페스트의 미수신 에피소드 | `kind: "pending"` 에피소드(D13 · D14) | 그 자리에 그대로 들어간다. 받으면 `filled`로 바뀐다 |

## 부록 A. 에피소드별 수치

| | u01-water | u02-checkin | u03-mina |
|---|---|---|---|
| 바이트 | 79,346 | 121,744 | 98,347 |
| pre / post 컷 | 6 / 3 | 5 / 4 | 4 / 3 |
| 대화 줄 | 8 | 13 | 13 |
| 유닛(스텝) / 문항 | 8 + RP / 78 | 8 + RP / 123 | 8 + RP / 87 |
| 단어 / 패턴 | 10 / 1 | 13 / 2 | 15 / 1 |
| 미해결 ref | 0 | 0 | 23 (3개 id) |

## 부록 B. 유닛(스텝)별 문항 타입 구성 (세 에피소드 합집합)

| 유닛 | order | 타입 |
|---|---|---|
| S1 | 1 | VOCAB_CARD · CLOZE · IMG_MATCH · WORD_ORDER |
| S3 | 2 | LISTEN_SELECT · ROLE_LINE · TURN_ORDER |
| S4 | 3 | VOCAB_CARD · CLOZE · IMG_MATCH · TRANSLATE_TO_KO |
| S5 | 4 | LISTEN_SELECT · ROLE_LINE · TURN_ORDER |
| S6 | 5 | DICTATION |
| S7 | 6 | CLOZE · TRANSLATE_TO_KO · WORD_ORDER · LISTEN_SELECT · TRANSLATE_TO_EN |
| S8 | 7 | ROLE_LINE · SENT_BUILD |
| S9 | 8 | CLOZE · DICTATION · LISTEN_SELECT · TRANSLATE_TO_EN · TRANSLATE_TO_KO · PAIR_MATCH |
| RP (최종 테스트) | 9 | ROLEPLAY_TURN — 수정 중 |

## 부록 C. 오디오 제작 목록 (Q21 — 사용자 「필요한 부분 정리해 주면 만들게」 2026-10-12)

id 규약(Q6 제안): `<episode_id>/<kind>-<n>` — 확장자 없는 불투명 id. 호스트 `AudioPlaybackModule`이 번들(`apps/ios/Host/audio/<id>.m4a`, Android `AudioAssetPath`)에서 찾고, 없으면 원격(3단계 소스)에서 받는다. 파일은 **m4a(AAC) · 모노 · 44.1 kHz**, 앞뒤 무음 0.2 s 이내. 같은 문장은 한 에피소드 안에서 **한 번만** 녹음한다 — 문항의 `stimulus.audio`가 대화 줄과 같은 문장이면 대화 줄의 id를 다시 쓴다.

| 구분 | 줄 수 | 비고 |
|---|---|---|
| u01-water | 17 | 대화 8 · 컷 9 · 문항 전용 0 |
| u02-checkin | 23 | 대화 13 · 컷 9 · 문항 전용 1 |
| u03-mina | 22 | 대화 13 · 컷 7 · 문항 전용 2 |
| 합계 | 62 | |

### u01-water

| id | 자리 | 화자 | 문장 |
|---|---|---|---|
| `u01-water/d-01` | 대화 | counterpart | 봉투 드릴까요? |
| `u01-water/d-02` | 대화 | player | 아니요, 괜찮아요. |
| `u01-water/d-03` | 대화 | counterpart | 삼천 원입니다. |
| `u01-water/d-04` | 대화 | player | 카드로 할게요. |
| `u01-water/d-05` | 대화 | counterpart | 영수증 드릴까요? |
| `u01-water/d-06` | 대화 | player | 아니요, 영수증은 괜찮아요. |
| `u01-water/d-07` | 대화 | player | 따뜻한 물 주세요. |
| `u01-water/d-08` | 대화 | counterpart | 네, 여기 있어요. |
| `u01-water/pre-1` | 컷 monologue | 플레이어 | 비행기를 오래 탔더니 목이 마르다. 편의점이 어디 있지? |
| `u01-water/pre-2` | 컷 narration | (내레이션) | 골목 어귀에 편의점 간판이 보인다. |
| `u01-water/pre-3` | 컷 speech | 점원 | 어서 오세요. |
| `u01-water/pre-4` | 컷 speech | 앞손님 | 앗, 지나갈게요. |
| `u01-water/pre-5` | 컷 narration | (내레이션) | 안쪽으로 들어가 냉장고에서 생수를 하나 꺼내 계산대에 올린다. |
| `u01-water/pre-6` | 컷 speech | 점원 | 봉투 드릴까요? |
| `u01-water/post-1` | 컷 narration | (내레이션) | 생수를 들고 편의점을 나와 게스트하우스로 향한다. |
| `u01-water/post-2` | 컷 narration | (내레이션) | 골목 안쪽에서 게스트하우스 간판이 보인다. |
| `u01-water/post-3` | 컷 speech | 낯선 사람 | 어, 새로 오셨나 봐요? |

### u02-checkin

| id | 자리 | 화자 | 문장 |
|---|---|---|---|
| `u02-checkin/d-01` | 대화 | counterpart | 이름이 어떻게 되세요? |
| `u02-checkin/d-02` | 대화 | player | {이름}(으)로 예약했어요. |
| `u02-checkin/d-03` | 대화 | counterpart | 네, 여권 좀 보여주세요. |
| `u02-checkin/d-04` | 대화 | player | 여권 여기 있어요. |
| `u02-checkin/d-05` | 대화 | counterpart | 며칠 묵으시죠? |
| `u02-checkin/d-06` | 대화 | player | 일주일 묵어요. |
| `u02-checkin/d-07` | 대화 | counterpart | 방은 201호예요. |
| `u02-checkin/d-08` | 대화 | player | 와이파이 비밀번호가 뭐예요? |
| `u02-checkin/d-09` | 대화 | counterpart | duruduru예요. |
| `u02-checkin/d-10` | 대화 | player | 체크아웃은 오전 11시 맞죠? |
| `u02-checkin/d-11` | 대화 | counterpart | 네 맞아요. 잘 쉬어요. |
| `u02-checkin/d-12` | 대화 | player | 방이 몇 층이에요? |
| `u02-checkin/d-13` | 대화 | counterpart | 삼 층이에요. |
| `u02-checkin/pre-1` | 컷 speech | 낯선 사람 | 사장님, 손님 오셨어요! |
| `u02-checkin/pre-2` | 컷 narration | (내레이션) | 마당을 쓸던 사람이 빗자루를 문 옆에 세워 두고 들어온다. |
| `u02-checkin/pre-3` | 컷 speech | 사장님 | 어서 와요. 많이 걸었나 봐요. |
| `u02-checkin/pre-4` | 컷 narration | (내레이션) | 사장님을 따라 현관 옆 프런트 앞에 선다. 데스크 위에 공책과 열쇠 몇 개가 놓여 있다. |
| `u02-checkin/pre-5` | 컷 speech | 사장님 | 이름이 어떻게 되세요? |
| `u02-checkin/post-1` | 컷 speech | 사장님 | 아참, 마루에 올라갈 땐 신발 벗어 주세요. |
| `u02-checkin/post-2` | 컷 narration | (내레이션) | 신발장 빈칸에 운동화를 넣고, 캐리어를 두 손으로 들어 이 층으로 올라간다. |
| `u02-checkin/post-3` | 컷 narration | (내레이션) | 201호 문이 반쯤 열려 있다. 창가 침대 위에 아까 거실에서 본 배낭이 놓여 있다. |
| `u02-checkin/post-4` | 컷 monologue | 플레이어 | 설마 아까 그 사람이랑 같은 방인가? |
| `u02-checkin/stim-01` | 문항 stimulus | (첫 사용 S3-11) | 은지로 예약했어요. |

### u03-mina

| id | 자리 | 화자 | 문장 |
|---|---|---|---|
| `u03-mina/d-01` | 대화 | counterpart | 안녕하세요. 이름이 뭐예요? |
| `u03-mina/d-02` | 대화 | player | 안녕하세요, 저는 {이름}이에요. |
| `u03-mina/d-03` | 대화 | counterpart | 저는 미나예요. 창가 쪽 침대 써요. |
| `u03-mina/d-04` | 대화 | player | 미나 씨, 만나서 반가워요. |
| `u03-mina/d-05` | 대화 | counterpart | 네, 저도 반가워요. |
| `u03-mina/d-06` | 대화 | player | 미나 씨는 어느 나라에서 왔어요? |
| `u03-mina/d-07` | 대화 | counterpart | 저는 스위스에서 한국어 배우러 왔어요. {이름}은/는요? |
| `u03-mina/d-08` | 대화 | player | 저는 {나라}에서 왔어요. 여기서 며칠 묵어요? |
| `u03-mina/d-09` | 대화 | counterpart | 저는 이틀 먼저 왔는데 2주 있을 거예요. |
| `u03-mina/d-10` | 대화 | player | 저는 일주일 묵어요. |
| `u03-mina/d-11` | 대화 | counterpart | 우리 친하게 지내요. |
| `u03-mina/d-12` | 대화 | player | 미나 씨, 반가워요. 저는 학생이에요. |
| `u03-mina/d-13` | 대화 | counterpart | 아, 저도 학생이에요. |
| `u03-mina/pre-1` | 컷 narration | (내레이션) | 방에 들어서니 아무도 없다. 캐리어를 어디에 둬야 할지 두리번거린다. |
| `u03-mina/pre-2` | 컷 speech | 낯선 사람 | 아, 캐리어는 침대 밑에 넣으면 돼요. 저도 거기 넣었어요. |
| `u03-mina/pre-3` | 컷 narration | (내레이션) | 캐리어를 눕혀 침대 밑에 밀어 넣는다. 딱 맞게 들어간다. |
| `u03-mina/pre-4` | 컷 speech | 낯선 사람 | 안녕하세요. 이름이 뭐예요? |
| `u03-mina/post-1` | 컷 speech | 미나 | 여기 백반집 가 봐요. 걸어서 오 분이에요. |
| `u03-mina/post-2` | 컷 narration | (내레이션) | 메모지에는 '유진식당'이라는 이름과 골목 약도가 그려져 있다. |
| `u03-mina/post-3` | 컷 speech | 미나 | 저는 약속이 있어서요. 맛있었는지 내일 얘기해 줘요! |
| `u03-mina/stim-01` | 문항 stimulus | (첫 사용 S5-04) | 안녕하세요, 저는 은지예요. |
| `u03-mina/stim-02` | 문항 stimulus | (첫 사용 S7-05) | 저는 호주에서 왔어요. 여기서 며칠 묵어요? |

문항 `stimulus.audio`가 대화 줄과 같은 문장이면 그 줄 id를 쓴다(u01 6/6 · u02 7/8 · u03 4/6). `{이름}` · `{나라}`가 든 줄(u02 d-02 · u03 d-02 · d-08)은 **녹음하지 않는다** — 플레이어 줄이라 앱이 치환해 보여 주기만 한다(Q14 「앱이 프로필로 치환」, 2026-10-12). 플레이어 줄 전체를 녹음할지(정답 들려주기 용도)는 Q24.

## 부록 D. 이미지 제작 목록 (Q6 · Q23 — 2026-10-12 `u01-water` 7장 수령)

수령본: `u01-water-20261012T044938Z-1-001.zip` — `u01-water/{pre-1,pre-3,pre-4,pre-5,pre-6,post-1,post-3}.jpg`, 전부 **941 × 1672 px(세로) · 326 ~ 605 KB**, 합 2.9 MB.

| 에피소드 | 필요(컷 image_url) | 수령 | 빠짐 |
|---|---|---|---|
| u01-water | 9 (고유 7) | 7 | 없음 — 컷 9개가 고유 그림 7장(pre-1 · 3 · 4 · 5 · 6 · post-1 · 3)을 쓴다. ⟨2026-10-12⟩ 버킷 `content`에 올라갔다 |
| u02-checkin | 9 | 0 | u02-checkin/pre-1.jpg, u02-checkin/pre-2.jpg, u02-checkin/pre-3.jpg, u02-checkin/pre-4.jpg, u02-checkin/pre-5.jpg, u02-checkin/post-1.jpg, u02-checkin/post-2.jpg, u02-checkin/post-3.jpg, u02-checkin/post-3.jpg |
| u03-mina | 7 | 0 | u03-mina/pre-1.jpg, u03-mina/pre-2.jpg, u03-mina/pre-3.jpg, u03-mina/pre-4.jpg, u03-mina/post-1.jpg, u03-mina/post-2.jpg, u03-mina/post-3.jpg |

- IMG_MATCH 문항 10개(`stimulus.image_url: ""`)는 아직 어느 에피소드도 이미지가 없다. 경로 규약 제안: `images/<episode_id>/item-<item.id>.jpg`(예: `images/u02-checkin/item-S1-09.jpg`).
- **크기**: 941 × 1672 · 평균 440 KB는 번들에 실을 수 없다(현재 `static/image` 8.3 MB / 상한 11.5 MB — 에피소드 셋이면 약 +11 MB). 번들 내장분은 **긴 변 1,200 px · JPEG 품질 80 · 장당 ≤ 180 KB**를 목표로 다시 내보내고, 원본은 서버(3단계 원격 소스)에 둔다. 어느 쪽이든 경로 규약은 같다 → 결정 D-IMG.
- 대체 텍스트(Q23)는 아직 없다. 수령본 7장의 `image_brief`를 alt 초안으로 쓸 수 있는지는 Q23 답에 달렸다.
- ⟨2026-10-12 — 3b-2⟩ 위 표의 u01 행은 처음에 「수령 0」으로 머리 문장(7장 수령)과 어긋나 있었다 — 고쳤다. **D-IMG 결정**: 3b-2는 컷 그림을 번들에 싣지 않고 버킷에서 받는다(`static/image` 변화 0 — [ADR-0056](../adr/0056-episode-content-delivery.md) 「적용 기록」). 컷 화면은 alt를 비우고(장식) 대사 · 지문 텍스트가 장면을 전한다.
