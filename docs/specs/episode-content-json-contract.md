# 콘텐츠 계약: delivery-2 에피소드 JSON

상태: **합의 대기** (콘텐츠 생산 쪽과 아래 「합의 항목」을 닫은 뒤 **계약 고정**으로 바꾼다)
작성: 2026-10-12 · 정정 2026-10-12 (파일 하나 = 유닛이 아니라 **에피소드 하나**. 아래 전부 그 기준)
근거 파일: `u01-water.json` · `u02-checkin.json` · `u03-mina.json` (`schema: "delivery-2"`, **각각 에피소드 1 · 2 · 3**)
후속: **2단계(와이어 스키마 + 디코더 + 픽스처)는 2026-10-12에 끝났다** — 산출은 §12. 합의는 여전히 대기이고, 합의로 모양이 바뀌면 이 문서와 §12의 모듈을 같이 고친다. 3단계(앱 구조 연결)는 §12 끝의 표. **3a(콘텐츠 소스 — 매니페스트 · 내장 · 원격 · 캐시)는 2026-10-12에 섰다** — §10이 계약이 됐고 전달 결정은 [ADR-0056](../adr/0056-episode-content-delivery.md)이 진다.

> 이 문서의 「필수 / 선택」은 **세 파일을 전수 측정한 관찰값**이다. `n/N`은 「그 키가 있는 개수 / 전체 개수」.
> 관찰값은 의도와 다를 수 있다. 다르면 합의 항목에서 가른다. 측정은 전 문항 288개 · 컷 25개 · 대화 34줄 · 단어 38개 · 패턴 4개를 대상으로 했다.
>
> ⟨2026-10-16 — 새 형식⟩ **콘텐츠 쪽이 새 형식을 보냈고 내장본이 그것으로 바뀌었다**(같은 `schema: "delivery-2"`, 내장 version `2026-10-15.1`). 위 수치와 아래 본문의 `n/N`은 **옛 세 파일 기준**이고,
>
> ⟨2026-10-16 오후 갱신⟩ 같은 날 11:45 버킷 판으로 내장 셋을 한 번 더 바꿨다 — version `2026-10-16.1`. 바뀐 것: 제목이 짧아짐(`물 사기` · `체크인` · `미나 만나기`) · 최상위 `title_en`(앱은 버림) · 그림 경로가 `content/images/…` 꼴(앱이 선두 `content/`를 뗀다) · 모든 소리 자리에 빈 `audio_url` · u03 통과 뒤 컷 1 문장(`백반집` → `식당`). 음성 id는 같은 문장 자리에 다시 붙여 **13개**다 — u03 통과 뒤 컷 1(`u03-mina/post-1`)은 문장이 바뀌어 녹음과 맞는지 확인 전이라 비웠다.
> 새 세 파일(문항 355 · 컷 25 · 대화 35줄 · 단어 42 · 패턴 5)의 관찰은 각 절의 ⟨2026-10-16⟩ 줄과 §7.2 끝의 「새 형식」 표가 진다. 옛 세 파일은 테스트 픽스처
> `apps/mobile/content/test-fixtures/delivery-2-2026-10-14/`로 바이트 그대로 남았다. 앱이 새 형식을 받는 결정은 [ADR-0065](../adr/0065-episode-format-additions.md)이 진다.
>
> ⟨2026-10-21 — 튜토리얼⟩ **튜토리얼 `u00-tutorial`이 같은 형식의 에피소드로 들어왔다**(내장 · 매니페스트 `order` 0 · version `2026-10-21.3`) — 앱은 그것을 **Episode 0**으로 세운다(구획 번호 = `order`). u01 ~ u03과 구조가 다르다: 단원 `S1` ~ `S13` 각 문항 하나(`S12` `CULTURE_CARD` · `S13` `CULTURE_CHECK`) + `RP` 턴 셋, `completion.requires` 14키, 그림 14경로(`images/u00-tutorial/*` 12 + 공용 `images/items/{hello,thanks}.webp`), 음성 id 12. 이 문서의 `n/N` 관찰은 u00을 세지 않았다. 결정은 [ADR-0080](../adr/0080-tutorial-as-catalog-episode.md).

## 0. 용어 대응 — 파일의 이름과 앱의 이름

파일의 이름과 앱(ADR-0024 D10)의 이름이 다르다. **이 문서는 파일의 이름을 그대로 쓰고**, 앱 쪽 이름은 이 표로만 잇는다.

| 파일 | 앱 (ADR-0024) | 학습 | 비고 |
|---|---|---|---|
| 파일 하나 (`unit_id`) | **에피소드** 하나 | | 키 이름이 `unit_id`지만 에피소드다 → Q1 |
| `title` | 에피소드 제목 | | |
| `pre_cuts` | 첫 자리 **표지**(`episode-intro`) | 없음 | 컷을 차례로 읽는 특별 유닛 |
| `steps[]` 중 `S1` ~ `S9` | 가운데 **일반 학습 유닛** 하나씩 | 있음 | 유닛 하나 = 스텝 하나. `items`가 그 유닛의 문항. ⟨2026-10-16 — 새 형식⟩ `S1` ~ `S8`과 문화 단계 `CULT`. `CULT`도 일반 학습 유닛 하나다(맵의 `Lesson 9`) → §6. ⟨2026-10-16 — PR ②⟩ 맵의 `Culture` 노드다 — 앱이 문항 유형으로 가린다(§6) |
| `completion` ⟨2026-10-16 — 새 형식⟩ | 에피소드 **완료 조건** | | 끝내야 할 스텝 id 목록. 앱은 이것이 모두 끝나야 에피소드를 완료로 본다(없으면 `RP` 하나) → §2 |
| `steps[]` 중 `RP` | 마지막 자리 **최종 테스트**(`episode-final`) | 있음 | **콘텐츠 쪽 수정 중** — 모양 미확정. ⟨2026-10-13⟩ 앱은 지금 모양을 **엄격하게** 읽어 새 화면 `catalog-final`로 그린다 → §7.4 · §12 |
| `post_cuts` | 최종 테스트 **통과 뒤** 진행 화면 | 없음 | ⟨2026-10-13⟩ 최종 테스트를 통과한 결과 화면 뒤에 선다(맵에 노드 없음) → §12 |
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
| `steps` | 필수 | Step[] | 9개 고정 = 학습 유닛 8 + 최종 테스트 1 ⟨2026-10-16 — 새 형식⟩ **10개** = 학습 유닛 8 + 문화 단계 1 + 최종 테스트 1(세 파일 같음 — §6) |
| `words` | 필수 | Word[] | 10 ~ 15개 ⟨새 형식⟩ 13 ~ 15개 |
| `patterns` | 필수 | Pattern[] | 1 ~ 2개 ⟨새 형식⟩ 1 ~ 3개 |
| `completion` ⟨2026-10-16 — 새 형식⟩ | **선택** | `{ requires: string[] }` | 옛 파일 0/3 · 새 파일 3/3. `requires` = `["S1" … "S8", "CULT", "RP"]`(셋 같음). 앱은 **목록의 스텝이 모두 끝나야 에피소드 완료**로 보고(트로피 · 다음 에피소드 표지), 키가 없으면 `["RP"]`로 본다. 목록이 비었거나 `steps[].id`에 없는 값(`"intro"` 포함)을 가리키면 그 에피소드 전체가 디코드 실패(`completion-malformed`)다. 중복은 앞의 것만 남긴다 — [ADR-0065](../adr/0065-episode-format-additions.md) D5 · D6 |

없는 것: 에피소드 **순서**, 버전, 콘텐츠 해시. 식별자는 있지만 이름이 `unit_id`다. → §10, 합의 Q1.
⟨2026-10-16 — 새 형식⟩ 최상위에 `completion` 하나가 더해졌다. 그 밖의 최상위 키는 같다.

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
- ⟨2026-10-16⟩ 경로는 `content` 버킷 기준 상대 경로다. 버킷 이름을 붙인 `content/images/…`도 받는다 — 앱이 선두 `content/` 조각을 한 번 떼고 같은 파일로 푼다(그림 · 음성 · 본문 공통, `resolveContentUrlSafe`). 2026-10-16 버킷 업로드가 이 꼴로 바뀌었다.
- ⟨2026-10-14⟩ **선택 키 `audio_url`**(세 종류 공통 — 대화와 같은 이름, 값은 URL이 아니라 부록 C의 **음성 id**). 없음 · 빈 문자열은 소리 없음이다. 내장본에서 10/25 채움(u01 2 · u02 4 · u03 4 — `image_url` 바로 뒤에 둔다). 앱은 컷이 서면 그 소리를 한 번 재생한다([ADR-0060](../adr/0060-episode-voice-remote-audio.md) D5). 모르는 키를 버리는 옛 앱은 그대로 디코드한다.

## 5. 본 대화 (`dialogue`) — 에피소드 하나의 전체 대화

| 키 | 필수 | 관찰 |
|---|---|---|
| `seq` | 필수 | 1부터 연속 |
| `role` | 필수 | `"counterpart" \| "player"` |
| `text` | 필수 | Text(en 필수) |
| `audio_url` | 필수 키 | **34/34 빈 문자열** ⟨2026-10-14⟩ 내장본 7/34 채움 — u01 seq 1 ~ 5 · u02 seq 1 · u03 seq 1(부록 C id). 최종 테스트가 `line_id`로 찾아 재생한다([ADR-0060](../adr/0060-episode-voice-remote-audio.md) D6) ⟨2026-10-16 — 새 형식⟩ 원본은 35/35 빈 값, 내장본 7/35(같은 줄) |
| `textbook` | 선택 (1/34) | 교과서체 변형(u03 seq 4: 「반가워요」→「반갑습니다」) |

- 엄격히 번갈아 나오지 않는다(u01 seq 6 → 7 둘 다 player). FE는 교대를 가정하지 않는다.
  ⟨2026-10-16 — 새 형식⟩ u01에 seq 7 「감사합니다. 안녕히 가세요.」(counterpart)가 끼어 대화가 9줄이 됐고(옛 seq 7 · 8 → 8 · 9) **세 파일 모두 엄격히 번갈아 나온다.** FE는 여전히 교대를 가정하지 않는다.
  `ko`가 바뀐 줄은 이 하나뿐이고, 그 밖에는 로마자만 고쳐졌다(ㅇ 받침 표기 등). 새 줄은 녹음이 없다(부록 C).
- 세 에피소드 모두 counterpart로 시작한다.
- `{이름}` · `{나라}` 자리표시자가 player 줄에 들어 있다. → 합의 Q14.

## 6. 스텝 (`steps`) = 학습 유닛 8개 + 최종 테스트 1개

| 키 | 필수 | 관찰 |
|---|---|---|
| `id` | 필수 | 세 에피소드 모두 `S1, S3, S4, S5, S6, S7, S8, S9, RP` — **S2 없음** ⟨2026-10-16 — 새 형식⟩ 세 에피소드 모두 **`S1, S2, S3, S4, S5, S6, S7, S8, CULT, RP`** — 이름이 다시 매겨졌다(옛 `S3`과 새 `S3`은 다른 스텝이다) |
| `order` | 필수 | 1 ~ 9 연속 ⟨새 형식⟩ 1 ~ 10 연속(`CULT` 9 · `RP` 10) |
| `items` | 필수 | 3 ~ 19개 ⟨새 형식⟩ 3 ~ 20개(`CULT`는 셋 다 6) |

- `S1` ~ `S9`는 가운데 일반 학습 유닛 하나씩, `RP`는 마지막 자리 최종 테스트다(§0). 맵은 이 순서대로 노드를 그린다.
- 문항 `id`는 항상 `<step.id>-<2자리>`이고 에피소드 안에서 유일하다.
- 스텝별 문항 타입 구성은 세 에피소드가 거의 같다(S1 카드·CLOZE·IMG_MATCH, S3·S5 듣기·역할·순서, S6 받아쓰기, S8 역할·문장 만들기, S9 복습 혼합, RP 롤플레이). 이것이 **규칙인지 우연인지**는 합의 Q5. 규칙이면 에피소드마다 유닛 수가 8 + 1로 고정된다.
- **`RP`는 콘텐츠 쪽이 수정 중**(이미지 등 타입 추가). §7.4와 Q2 · Q15 · Q16은 수정본이 오면 다시 측정한다.
- ⟨2026-10-16 — 새 형식⟩ **스텝 구성이 열 개로 바뀌었다** — `S1` ~ `S8` · 문화 단계 `CULT`(문화 카드 `CULTURE_CARD` · 문화 확인 `CULTURE_CHECK`만) · `RP`. 앱은 `"RP"`만 특별히 보고
  **`CULT`를 이름으로 가르지 않는다** — `order`대로 아홉째 학습 유닛(`Lesson 9`)이다. 지금 `CULT`의 문항은 앱에 화면이 없어 전부 건너뛰므로 `CULT`는 누르면 곧장 끝나는 유닛이다(§12 · ADR-0065 D7 · D10).
  옛 스텝 id로 기기에 남은 진행(`S9` 등)은 옮기지 않는다 — 새 콘텐츠에 없는 id는 세지 않는다. 구성 표는 부록 B.
- ⟨2026-10-16 — PR ②⟩ **문화 단계의 판별 규칙 — 콘텐츠 쪽이 알아야 할 것.** 앱은 **문항이 하나 이상이고 모든 문항이 `CULTURE_CARD` · `CULTURE_CHECK`인 스텝**을 문화 단계로 보고 맵에 `Culture` 노드(전용 아이콘 · 한 줄 전용)로 그린다.
  스텝 id(`CULT`)는 보지 않는다 — 이름을 바꿔도 같고, **다른 유형을 하나라도 섞으면 그 스텝은 `Lesson n` 노드로 돌아간다**(오류가 아니라 조용한 강등이다). 진행 키 · 완료 키는 지금처럼 스텝 id다.
  지금 `CULT`는 문화 카드 3 → 문화 확인 3의 실단계이고(위 「곧장 끝나는 유닛」은 PR ① 빌드의 상태다), 통과는 문화 확인 셋 중 둘이다. 문화 단계가 레슨 사이로 오면 그 뒤 레슨 번호가 하나 건너뛴다.
  결정은 [ADR-0066](../adr/0066-episode-format-screens.md) D7 · D9.

## 7. 문항 (`steps[].items[]`)

### 7.1 공통 필드

| 키 | 필수 | 관찰 |
|---|---|---|
| `id` | 필수 | `S1-01` 꼴 |
| `type` | 필수 | 아래 13종 |
| `mode` | 필수 | `card \| tiles \| choice \| typing \| match \| either`. **타입이 정하면 mode는 1:1로 따라온다**(예외 없음) |
| `event` | 필수 | `"E"`(노출) `\| "R"`(회상). E는 VOCAB_CARD(28/28) · CLOZE(4/41) · LISTEN_SELECT(3/37)에만 |
| `ref` | 필수 키 | `voca:` 190 · `patt:` 72 · `expr:` 13. **ROLEPLAY_TURN 13개는 빈 문자열** ⟨2026-10-16 — 새 형식⟩ **선택**이다 — `ROLEPLAY_TURN` 13 · `CULTURE_CARD` 9 · `CULTURE_CHECK` 9 · `LISTEN_SELECT` 2에 키가 없다. 앱은 지금처럼 선택으로 받는다 |
| `prompt` | VOCAB_CARD 빼고 필수 | `{ko, en}` ⟨새 형식⟩ `CULTURE_CARD`에도 없다 |
| `level` · `skill` · `skill_level` ⟨2026-10-16 — 새 형식⟩ | 선택 | 새 파일 355/355 · 옛 파일 0. `level` · `skill_level`은 정수, `skill`은 문자열 — 지금 값은 `노출` · `듣기` · `말하기` · `쓰기` · `읽기` 다섯이다. **앱은 디코드만 하고 쓰지 않으며 `skill`을 열거하지 않는다**(값이 늘어도 거부하지 않는다 — ADR-0065 D3) |

⟨2026-10-16 — 새 형식⟩ `type`은 **24종**(새 11종 — 아래 §7.2 끝)이고 새 파일에는 그 가운데 22종이 있다(`PAIR_MATCH` · `SENT_BUILD`는 새 파일에 없다). `event`에 **`"D"`**(`MIN_PAIR_AB` 6)가 더해졌다 —
앱의 `event`는 여전히 닫힌 목록이라 모르는 값이 오면 그 에피소드가 `invalid-shape`로 실패한다. `mode`에는 **`speech`**(`SHADOW` · `SPEAK_WORD`)가 더해졌다 — 앱은 `mode`를 문자열로 받고 쓰지 않는다. 「타입이 정하면 mode는 1:1」은 새 파일에서도 성립한다.

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

⟨2026-10-13 — 3d-1⟩ **앱이 세 유형에서 읽는 것**(위 표는 파일의 관찰값이고, 아래는 앱의 처리다 — 결정은 [ADR-0058](../adr/0058-catalog-learning-session.md) 「적용 기록」 A2).

| type | 앱이 읽는 필드 | 읽지 않는 필드 | 건너뛰는 조건 |
|---|---|---|---|
| `VOCAB_CARD` | 표제어 `context.ko` · `context.roman`, 예문 `example`(`ko` · `roman` · `en`), **뜻 = 그 에피소드 `words[]`에서 `ref`와 같은 `id`를 찾은 `gloss_en`**(없으면 `context.en`) | `card_kind` · `prompt` | 뜻이 어디에도 없으면 건너뜀(`no-gloss`). 표제어가 비면 건너뜀. 예문이 비었거나 표제어와 같으면 **예문 없이 선다**(건너뛰지 않는다) |
| `IMG_MATCH` | 그림 `stimulus.image_url`(버킷 기준 상대 경로 — 컷과 같은 규약), 보기 `options[].ko` · `correct`, **정답 보기의 `en`**(그림을 못 보일 때의 대체 글자이자 그림의 낭독 이름, 없으면 `words[]`의 뜻) · 정답 보기의 `roman`(답한 뒤 이름표), 지시문 `prompt.en` | `stimulus.image_brief`(Q23) · `stimulus.audio_url` | **`image_url`이 비었으면 그 문항을 건너뛴다**(`image-missing`). 지금 10문항이 전부 여기에 든다 — 주소가 채워지면 앱 변경 없이 선다 |
| `PAIR_MATCH` | 정답 문자열 `answers[0].ko`(`"a=b \| c=d"`)를 디코더가 푼 짝 — 낱말 = `=` 왼쪽, 뜻 = `=` 오른쪽. `tiles`는 개수 대조에만 | **`tiles_gloss_en`**(Q17) · `tiles[].roman` · `prompt`(지시문은 앱 문구) | 짝이 둘 미만 · 짝 수 ≠ 타일 수 · 빈 낱말이나 뜻 · 같은 낱말 둘 |

- 뜻 조회는 **그 에피소드 파일의 `words[]`만** 본다 — `patterns`는 보지 않고 다른 에피소드의 낱말도 보지 않는다(Q4와 같은 전제). 지금 데이터의 카드 28장은 전부 자기 `words[]`에서 뜻을 찾는다.
- 뜻 열(짝 맞추기)은 앱이 섞는다(Q20과 같은 결정적 섞기). 낱말 열은 파일 순서다.

⟨2026-10-16 — 새 형식⟩ **새 11종**(새 세 파일 전수 관찰 — 앱은 「관찰에서 전부 있으면 필수, 일부면 선택」으로 받는다. 공통 필드는 §7.1, 앱의 처리 결정은 [ADR-0065](../adr/0065-episode-format-additions.md) D8).

| type | n | mode | event | 필수(전부 있음) | 선택(일부만) | 앱 처리 |
|---|---|---|---|---|---|---|
| `CLOZE_CHOICE` | 4 | choice | R | `prompt` · `context`(`ko`에 `___`) · `options` · `answers` · `feedback.correct` | `answers[].en` | 단어 선택 — 보기는 `options` 파일 순서 그대로 |
| `REPLY_SELECT` | 16 | choice | R | `prompt` · `stimulus`(`audio: Text` · `audio_url` · `image_url`) · `options` · `feedback.correct` | — | 단어 선택 — 제시문 = `stimulus.audio`(상대 말). 소리 없이 글로 보인다 |
| `MIN_PAIR_AB` | 6 | choice | **D** | `prompt` · `stimulus`(`audio` …) · `options`(2개) · `feedback.correct` | `stimulus.audio.en`(1/6) | 듣기 모양이지만 문항 음성이 없어 건너뜀(`audio-missing`) |
| `PARTICLE_FILL` | 6 | choice | R | `prompt` · `stimulus`(`text` …) · `options`(2개) · `feedback.correct` | — | 단어 선택 — 제시문 = `stimulus.text`(빈칸 문장) |
| `PARTICLE_SWAP` | 9 | choice | R | `prompt` · `stimulus`(`text` …) · `options`(3개) · `feedback.correct` | — | 단어 선택 — 제시문 = `stimulus.text`(틀린 구) |
| `CULTURE_CHECK` | 9 | choice | R | `prompt` · `context` · `options` · `feedback.correct` | — (`ref` 없음) | ~~건너뜀(`screen-pending`)~~ ⟨PR ②⟩ **단어 선택** — 제시문 `context`(+ `roman` · `en` 줄), 보기 `options[].ko` 파일 순서, **보기마다 번역 줄 `options[].en`**(전부 있을 때만) |
| `CULTURE_CARD` | 9 | card | E | `context` · `stimulus`(`text` …) · `feedback.correct` | — (`prompt` · `ref` 없음) | ~~건너뜀(`screen-pending`)~~ ⟨PR ②⟩ **문화 카드** — 제목 `context.ko` · `roman` · `en`, 본문 `stimulus.text.en`(크게) · `.ko`(작게). ⟨2026-10-19 — G2⟩ 앞면 그림 `stimulus.image_url` |
| `LISTEN_BUILD` | 13 | tiles | R | `prompt` · `stimulus`(`audio` …) · `tiles`(오답 조각 포함) · `answers` | `tiles[].en` | 건너뜀(~~`screen-pending`~~ ⟨PR ②⟩ **`audio-missing`** — 문항 음성이 오면 그때 화면을 만든다. 소리가 와도 저절로 서지 않는다) |
| `SYLLABLE_BUILD` | 7 | tiles | R | `prompt` · `stimulus`(`en` · `audio_url` · `image_url`) · `tiles`(음절, 오답 포함) · `answers` | `tiles[].en` · `answers[].en` | ~~건너뜀(`screen-pending`)~~ ⟨PR ②⟩ **음절 조립** — 뜻 `stimulus.en`, 타일 `tiles[].ko`(섞음), 정답 `answers[].ko`(공백 제거) |
| `SHADOW` | 9 | speech | E | `prompt` · `stimulus`(`text` · `audio` …) · `answers` | — | ~~건너뜀(`screen-pending` — 말하기)~~ ⟨PR ③⟩ **읽기**(채점 없음) — 문장 · 로마자 · 영어를 한 묶음에서(`answers[0]`, 한국어가 비면 `stimulus.text`) |
| `SPEAK_WORD` | 6 | speech | R | `prompt` · `stimulus`(`image_brief` · `image_url` · `audio_url`) · `answers` | — | ~~건너뜀(`screen-pending` — 말하기)~~ ⟨PR ③⟩ **낱말 말하기**(채점) — 그림 `stimulus.image_url`(필수) · 뜻 `answers[0].en` · 정답 `answers[].ko` · 로마자 `answers[0].roman` |

- ⟨2026-10-16 — PR ②⟩ **세 유형에서 앱이 읽는 것과 읽지 않는 것**(결정은 [ADR-0066](../adr/0066-episode-format-screens.md)):
  - `CULTURE_CARD` — 읽음: 제목 `context.ko`(비면 건너뜀 `malformed`) · `context.roman`(제목 아래 로마자) · `context.en`(영어 제목), 본문 `stimulus.text.en`(비면 `no-gloss`) · `stimulus.text.ko`. **읽지 않음**: `stimulus.text.roman`(본문 로마자 — 최대 226자 산문이라 싣지 않는다) · `feedback.correct`(요령) · `stimulus.audio_url`(9/9 빈 값 — 듣기 자리 없음).
    ⟨2026-10-19 — G2, [ADR-0072](../adr/0072-culture-card-flip.md) D4⟩ **`stimulus.image_url`을 읽는다** — 앞면 사진. 다른 그림과 같은 콘텐츠 그림 경로(예: `content/images/u01-water/cult-1.jpg`)로 풀고, 빈 값 · 못 푸는 경로 · 내려받기 실패면 브랜드 면이 대신 선다 — **건너뛰지 않는다**(그림 고르기의 `image-missing`과 다르다). 지금 9/9 빈 값.
  - `CULTURE_CHECK` — 보기 번역 `options[].en`은 27/27 있고 **고르기 전부터 보인다**. 하나라도 비면 그 문항은 번역 줄 없이 선다. `options[].roman` · `why_wrong` · `feedback`은 읽지 않는다. 보기는 섞지 않는다(정답 자리가 이미 흩어져 있다).
  - `SYLLABLE_BUILD` — **타일은 정답 순서로 실려 오고 오답 음절이 뒤에 붙는다**(7/7, 예 `괜 찮 아 요 | 세 원`). 그대로 보이면 앞에서부터 누르는 것이 답이라 **앱이 섞는다**(문항마다 정해진 순서). 같은 음절 타일이 두 장인 문항(u02 `일주일` · `와이파이`)도 받는다 — 판정은 놓은 음절을 이은 **낱말 문자열**이다.
    정답은 앱이 **공백을 모두 지운** 꼴로 비교하고, 칸 수는 첫 정답을 타일로 맞춰 정한다(타일로 만들 수 없는 정답이면 건너뜀 `malformed`). 정답이 둘 이상이면 첫 정답과 길이가 같은 것만 만들 수 있다. 뜻은 `stimulus.en`(7/7) → `answers[].en`(6/7) 순이다. `tiles[].roman` · `stimulus.audio_url`은 읽지 않는다.
- ⟨2026-10-16 — PR ③⟩ **말하기 두 유형에서 앱이 읽는 것과 읽지 않는 것**(결정은 [ADR-0067](../adr/0067-episode-format-speaking.md)). 이 변경 뒤 건너뜀 사유 `screen-pending`은 없다(사유 일곱):
  - `SHADOW` — 읽음: **출처 묶음 하나** — `answers[0]`의 `ko`가 비지 않으면 `answers[0]`의 `ko` · `roman` · `en`, 비면 `stimulus.text`의 세 값(둘 다 비면 `malformed`). `answers[0].ko` = `stimulus.text.ko`는 9/9 같다.
    문장 부호(9/9 — `.` `,` `?`)는 보이는 문장에 그대로 남고 판정에서는 뗀다. **읽지 않음**: `prompt`(「듣고 따라 말하세요 / Listen and repeat.」 — 음성이 없어 앱 지시문 `Read the sentence out loud.`과 맞지 않는다) · `stimulus.audio` · `audio_url`(9/9 빈 값) · `image_url`.
    **채점하지 않는다** — 맞은 낱말 수를 보이기만 한다.
  - ⚠ **콘텐츠 쪽 관찰(정정 대상)**: u03 `S5-10`의 `stimulus.text.en`이 「Hello, I'm **{이름}**.」인데 한국어는 고정 이름 「…저는 **은지**예요.」이고 `audio.en` · `answers[0].en`은 「Hello, I'm Eunji.」다. 앱은 `answers[0]`을 먼저 읽어 이 줄을 피한다.
    `prompt`의 「듣고 따라 말하세요」도 음성이 오기 전까지는 화면과 뜻이 다르다(문항 음성이 오면 화면을 다시 정한다 — ADR-0067 재검토 조건 1).
  - `SPEAK_WORD` — 읽음: 정답 `answers[].ko`(치환 · trim, 빈 값 제외 — 0개면 `malformed`) · **그림 `stimulus.image_url`이 필수**(없거나 주소로 풀리지 않으면 건너뜀 `image-missing` — `IMG_MATCH`와 같다, 지금 6/6 있음) ·
    뜻 `answers[0].en`(없으면 낱말 목록 — 그래도 없으면 `no-gloss`, 지금 6/6 있음) · 로마자 `answers[0].roman`(정답 상자 `Answer: 낱말 · 로마자`) · 지시문 `prompt.en`(「Say the word for the picture.」). **읽지 않음**: `image_brief` · `audio_url`.
    판정은 들은 글자의 앞 낱말이 정답 낱말과 같은가다(띄어쓰기 · 어미는 너그럽지 않다 — 「비밀 번호」 · 「카드요」는 오답).
- `options[].why_wrong`은 새 파일에서도 **오답 보기마다** 있다(355/355). 값은 337개가 `"이 자리에 맞는 말이 아니다"`, 18개가 `"카드에 적힌 사실과 다르다"`(`CULTURE_CHECK`). 앱은 디코드만 하고 보이지 않는다(Q8).
- 새 문항의 `stimulus.audio_url`은 **전부 빈 값**이다. `stimulus.image_url`은 `IMG_MATCH` 7 · `SPEAK_WORD` 6 · `ROLEPLAY_TURN` 13에만 값이 있다(`images/items/*.jpg` 등 버킷 기준 상대 경로).

⟨2026-10-16 — 새 형식⟩ **기존 13종에서 바뀐 것**(나머지 키는 위 표 그대로다):

| 자리 | 새 파일 관찰 | 앱 처리 |
|---|---|---|
| `VOCAB_CARD.example` | 36/37 — u02 `S3-04`에 없다 | **선택**이 됐다. 없으면 예문 없이 선다(옛 디코더는 이 한 장 때문에 u02 전체를 거부했다) |
| `VOCAB_CARD.context.en` | 37/37 | 이미 선택 — 뜻의 대체로 쓴다(위 표) |
| `TRANSLATE_TO_KO.stimulus` · `WORD_ORDER.stimulus` | 새로 `{audio_url, image_url, en}` — 21/21 · 8/8. `en`이 옮길(제시할) 영어 원문 | 단서 · 제시 영어는 **`stimulus.en`을 먼저**, 없으면 정답의 `en` |
| `TURN_ORDER.tiles[].speaker` | 새로 `"counterpart" \| "player"` 29/29. **15문항이 player부터** 시작한다 | 대화 조립 칸의 화자로 쓴다 — 모두 있으면 그대로, 모두 없으면 짝수 칸 상대 · 홀수 칸 나(옛 규칙), 일부만 있으면 그 문항을 건너뛴다 → Q25 |
| `ROLE_LINE.feedback.wrong.en` | 8/25 | 받는다(화면은 쓰지 않는다) |
| `CLOZE.context.en` | 38/38 | 빈칸 문장 아래 **번역 줄**이 선다(옛 데이터에는 없던 줄) |
| `IMG_MATCH.stimulus.image_url` | **7/7 채움** | 그림 문항이 처음으로 선다(부록 D) |
| `LISTEN_SELECT.ref` | 56/58 | 이미 선택 |
| `ROLEPLAY_TURN.stimulus.image_url` | 13/13 장면 그림 | 읽지 않는다 — 최종 테스트 장면은 지금처럼 표지 컷에서 고른다 |

### 7.3 `options[]` 불변식 (IMG_MATCH · LISTEN_SELECT · ROLE_LINE · TRANSLATE_TO_EN, 327개)

- `id`는 `o1` ~ `o4`, 문항 안에서 순서대로.
- `correct: true`는 **정확히 하나**.
- `why_wrong`은 **오답에만** 있고, 값은 327개 중 236개가 전부 같은 문자열 `"이 자리에 맞는 말이 아니다"`. → 합의 Q8.
- ⟨2026-10-16 — 새 형식⟩ **대상이 열 종이 됐다** — 위 넷에 `CLOZE_CHOICE` · `REPLY_SELECT` · `MIN_PAIR_AB` · `PARTICLE_FILL` · `PARTICLE_SWAP` · `CULTURE_CHECK`가 더해져 새 파일에서 150문항 · 보기 505개다.
  「`correct: true`는 정확히 하나」는 앱이 열 종 전부에 같은 검사로 건다 — 어기면 그 에피소드 전체가 `option-correct-count`로 실패한다. 보기 수는 유형마다 다르다(2 ~ 4).

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

⟨2026-10-13 — 3c⟩ **앱은 이 문항을 엄격하게 디코드한다**([ADR-0058](../adr/0058-catalog-learning-session.md) D8). 위 표는 여전히 관찰값이고 합의(Q2)는 열려 있지만,
앱이 최종 테스트를 그리려면 모양이 필요해 **지금 모양을 필수로 읽는다** — 상위의 `prompt` · `context` · `stimulus` · `tiles`(1개 이상) · `answers`(1개 이상) ·
`feedback.correct`와 `roleplay`의 **`line_id` · `tiles_gloss` 둘만**. `roleplay`의 `counterpart_line` · `player_line` · `tiles` · `accepted_answers` · `modes`는 **읽지 않는다**
(Q2 제안대로 정답의 정본은 상위 `answers`). ⚠ **그래서 RP 수정본이 위 필수 키의 모양을 바꾸거나 빼면 그 에피소드 전체가 `decode-failed`로 잠긴다**(맵에 `NOT AVAILABLE`).
키를 **더하는** 것은 무해하다(모르는 키는 버린다). 모양을 바꾸는 수정본은 앱 디코더를 먼저 고쳐야 하므로 **미리 알려 달라.**

⟨2026-10-16 — 새 형식(RP 수정본의 첫 관찰)⟩ 새 파일의 `roleplay`에는 위 일곱 키에 **`lead`**(배열) · **`reask`**가 더해졌고, 스텝 `RP` 자체에 **`scene`**(`background_image_url` · `counterpart` · `closing[]` ·
`closing_image_url` · `retry`)이 생겼다. 턴의 `stimulus.image_url`에는 장면 그림이 13/13 채워졌다. **앱은 이 넷을 모두 읽지 않는다** — 더해진 키라 위 규칙대로 버리고, 최종 테스트 장면은 지금처럼 표지 컷에서 고른다.
필수 키의 모양은 바뀌지 않아 그대로 디코드된다. `line_id` 규칙(`D<n>` = 플레이어 줄 seq n · 상대 줄 seq n−1)은 새 대화에서도 13턴 모두 성립한다. 맺음말 `closing`의 「감사합니다. 안녕히 가세요.」는 u01 대화 seq 7로도 들어 있다.
Q2 · Q15 · Q16은 이 관찰로 닫지 않았다(⏸ 그대로).

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

⟨2026-10-16 — 새 형식⟩ 단어 42개 · 패턴 5개. 새 키 **`use`**가 단어 8 · 패턴 1에 있다(값은 모두 `"counterpart"`). **앱은 읽지 않고 버린다**(모르는 키). ref 무결성은 아래 문단과 같은 모양이다 —
u01 · u02는 전부 해결, u03은 18문항이 같은 세 id(에피소드 2의 낱말)를 가리켜 `unresolved-ref` 경고다(Q4 그대로).

**ref 무결성**: u01 75/75 · u02 118/118 해결. **u03(에피소드 3)은 82개 중 23개가 자기 `words`에 없는 id를 가리킨다** — `voca:ec5d9a98`(일주일) · `voca:e3c30bfa`(이름) · `voca:9710a021`(며칠), 셋 다 **에피소드 2의 words에만** 있다. 앞 에피소드 어휘를 다시 쓰는 것 자체는 자연스럽지만, 에피소드는 **따로 내려받는 단위**라 참조가 파일 밖으로 나가면 그 에피소드만으로 열 수 없다. → 합의 Q4.

## 9. 자산 참조

| 자리 | 키 | 관찰 |
|---|---|---|
| 컷 | `image_url` | 25/25 채움. `images/<unit_id>/<pre\|post>-<n>.jpg` |
| 컷 · IMG_MATCH | `image_brief` | 생성용 지시문. 앱은 아직 렌더하지 않지만 디코더가 `imageBrief`로 **보존**한다(대체 텍스트 후보 → Q23) |
| 컷 | `audio_url` ⟨2026-10-14 — 새 선택 키⟩ | 10/25 채움(내장본) |
| 대화 | `audio_url` | 0/34 채움 ⟨2026-10-14⟩ 7/34(내장본) |
| 문항 `stimulus` | `audio_url` · `image_url` | 0/121 채움. IMG_MATCH조차 `image_url: ""` ⟨2026-10-16 — 새 형식⟩ `audio_url`은 여전히 전부 빈 값, `image_url`은 26문항에 채움(`IMG_MATCH` 7 · `SPEAK_WORD` 6 · `ROLEPLAY_TURN` 13 — §7.2 끝) |
| 음성 정보 파일 ⟨2026-10-19⟩ | `audio/manifest.json`의 `audio.<음성 id>` | 에피소드 JSON 밖의 별도 파일 — 컷 `audio_url`의 id → 길이(`duration_ms` · 선택 `speech_end_ms`). 카탈로그 컷 타자기가 이 길이에 맞춰 쓴다. 2026-10-19 버킷에 올라감. 형식 · 규칙은 부록 E, 결정은 [ADR-0074](../adr/0074-voice-synced-typing.md) |

앱의 현재 자산 경로(참고): 이미지는 번들 import → `/static/…`(Android는 호스트가 재작성, ADR-0051). 오디오는 확장자 없는 **불투명 id**를 호스트 `AudioPlaybackModule`이 번들에서 찾는다(ADR-0017 D3). 원격 fallback은 아직 없다(ADR README 보류 표 「오디오 자산의 출처·형식」). → 합의 Q6 · Q21.
⟨2026-10-14 — 위 문장의 오디오 부분은 그때의 상태다⟩ **에피소드 음성은 버킷에서 재생한다.** 앱(JS 한 자리 `lib/content-audio.ts`)이 id를 규약으로 검사해 `audio/<id>.m4a` → 버킷 절대 URL로 바꾸고, 재생 모듈은 `https` 절대 URL을 받아 스트리밍한다. 튜토리얼의 번들 id는 지금처럼 번들에서 난다. 지금 재생하는 자리는 카탈로그 컷 · 최종 테스트뿐이고 **학습 문항의 `stimulus.audio_url`은 읽지 않는다**(ADR README 보류 표 「학습 문항 오디오의 연결」). 결정은 [ADR-0060](../adr/0060-episode-voice-remote-audio.md).

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
| `episodes[].order` | 필수 | int | 맵 순서. 오름차순, 같으면 `id` 사전순. ⟨2026-10-21⟩ **맵의 구획 번호(`Episode n.`)이기도 하다** — `0`은 튜토리얼(`u00-tutorial` = `Episode 0.`), 본편은 1부터. 건너뛰면 번호도 건너뛴다([ADR-0080](../adr/0080-tutorial-as-catalog-episode.md) D3) |
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
- **원격 경로**: 기준은 `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/content/`(Supabase Storage 공개 버킷 `content`). 그 아래 `manifest.json` · `episodes/<id>.json` · `images/<id>/…`. 에피소드 `url`과 컷 `image_url`은 이 기준의 상대 경로다. 오디오 파일의 출처는 아직 정하지 않았다(ADR README 보류 표 「오디오 자산의 출처·형식」). ⟨2026-10-14⟩ 정했다 — 같은 기준 아래 `audio/<id>.m4a`(정적 파일 · **매니페스트에 등록하지 않는다** · 기기 캐시 없음, [ADR-0060](../adr/0060-episode-voice-remote-audio.md) D1). 음성 id가 바뀐 내장 에피소드 셋의 `version`은 `2026-10-14.1`이다. ⚠ 버킷은 아직 없다 — 생성 · 업로드는 사용자 확인 뒤(ADR README 보류 표). ⟨2026-10-16 — 새 형식⟩ 내장 셋이 새 형식으로 바뀌어 **`version`은 `2026-10-15.1`**이다(`generated_at` `2026-10-15T00:00:00Z`, `sha256` · `bytes`는 새 파일의 값 — u01 125,327 · u02 159,188 · u03 154,196 bytes). 버킷에는 **내장본과 같은 바이트**(음성 id 포함)를 올린다 — 원본(음성 id 없음)을 올리면 원격본이 이길 때 소리가 사라진다. 옛 빌드는 새 본문을 받아도 디코드에 실패해 내장 폴백으로 지금 콘텐츠를 연다 — 그래서 `min_client_level`을 넣지 않는다([ADR-0065](../adr/0065-episode-format-additions.md) D12).
- **내장 매니페스트**: `apps/mobile/content/manifest.json` — 번들에 실은 세 에피소드(`content/episodes/*.json`)의 실제 `sha256` · `bytes`를 적은 같은 형식의 파일이다. 사본을 바꾸면 이 파일도 같이 바꾼다. ⟨2026-10-21⟩ **내장 에피소드는 넷이다** — 첫 항목 `u00-tutorial`(order 0)은 버킷 `manifest.json`의 항목과 **같은 값**이다(같은 version이면 내장이 이겨 받지 않는다). u00이 쓰는 **그림 14장도 번들에 있다**(`apps/mobile/src/assets/content/images/…` = 버킷 상대 경로, [ADR-0080](../adr/0080-tutorial-as-catalog-episode.md) D2).
- `day` · `time_of_day` · `place` · `counterpart`는 에피소드 JSON에 그대로 둔다.

> 2026-10-12 3a 리뷰 반영: 카탈로그 비교는 `compareVersions`(숫자 조각 비교 — `localeCompare` 금지, PrimJS), 원격이 이긴 항목이 준비되지 않으면 같은 id의 내장본으로 폴백, `episode-catalog.ts`가 `compareVersions` · `checkEpisodeText` · `parseCachedManifest`를 공용 검증 자리로 export(결합과 갱신이 같은 검사를 쓴다). 상세는 [ADR-0056](../adr/0056-episode-content-delivery.md) D2 · D3.

⟨2026-10-20⟩ **앱이 바뀐 에피소드를 언제 바꾸는가** — 이미 열리는 에피소드(내장본이 있거나 원격본을 다 받아 둔 것)의 더 높은 `version`이 오면, 앱은 본문 · 그림 · 음성을 **따로 받아 두었다가 다 받은 뒤 다음 앱 시작에** 바꾼다. 스플래시에서 로고가 끝난 뒤 최대 3초 기다려 그 안에 다 받으면 그 실행부터 새 버전이다. 같은 실행 안에서는 바뀌지 않는다(레슨 도중에도). 아직 열리지 않는 새 에피소드는 다 받는 대로 맵에 선다. 결정은 [ADR-0078](../adr/0078-episode-update-on-splash.md), 납품 쪽이 지킬 것은 §13.

## 11. 합의 항목

각 항목은 **관찰 → FE 제안 → 콘텐츠 쪽 답**. 답이 「제안대로」면 그대로 계약이 된다.

| # | 관찰 | FE 제안 | 답 |
|---|---|---|---|
| **Q1** | 식별자 키가 `unit_id`인데 값은 에피소드다. 순서 · 버전 · 해시는 없다 | 순서 · 버전 · 해시는 §10 매니페스트에. 키 이름은 **`episode_id`로 바꾸기**를 제안하되, 바꾸기 어렵다면 `unit_id` 그대로 두고 이 문서 §0이 뜻을 진다 | 순서 · 버전 · 해시: **FE가 `manifest-1`로 고정(2026-10-12)** — §10. 키 이름은 콘텐츠 쪽 답 대기 |
| **Q2** ⏸ | `ROLEPLAY_TURN.roleplay`가 상위 `context` · `stimulus` · `tiles` · `answers` · `mode`를 다른 모양으로 다시 담는다. `accepted_answers`는 한 곳에서 `answers`와 어긋난다 | `roleplay`에서 **`line_id` · `tiles_gloss`만** 남기고 나머지는 지운다. 정답의 정본은 `answers`. **RP 수정본이 오면 다시 본다** | **FE 처리(2026-10-13, 3c)**: 콘텐츠 답은 아직 없다. 앱은 제안대로 읽는다 — `roleplay`에서 `line_id` · `tiles_gloss`만, 정답은 `answers`. 디코드는 엄격하다(§7.4) — RP 모양이 바뀌면 에피소드가 잠기므로 수정본은 미리 알려 달라 |
| **Q3** | `LISTEN_SELECT` E 3개는 `options`가 없고 `context`가 있다. R 34개는 반대 | 모양이 다르면 타입을 나눈다: `LISTEN_EXPOSE`(E, options 없음) · `LISTEN_SELECT`(R, options 필수). `event`로 모양을 갈라 읽지 않는다 | |
| **Q4** | 에피소드 3이 에피소드 2에만 있는 단어 3개를 ref로 가리킨다(23문항) | 각 에피소드는 **자기 `words`로 모든 ref를 해결**한다. 앞 에피소드 단어는 `role: "prereq"`로 다시 싣는다(이미 그 role이 있다). 앱은 에피소드 단위로 받으므로 전역 사전을 가정하지 않는다. 대안은 매니페스트에 공용 사전 파일을 하나 더 두는 것인데, 에피소드 하나만 받아도 열려야 한다는 조건이 깨져 권하지 않는다 | |
| **Q5** | 스텝 id가 S1 · S3 ~ S9 · RP로 S2가 비어 있고, 세 에피소드의 스텝 구성이 같다 | 앱은 `order`만 믿고 `id`는 표시용 불투명 문자열로 본다. S2가 **예약 자리인지 삭제된 자리인지**, 그리고 「학습 유닛 8 + 최종 테스트 1」이 모든 에피소드의 규칙인지 답을 달라. 맵이 에피소드마다 노드 수를 바꿔 그려야 하는지가 여기서 정해진다 | **답(2026-10-15, 새 형식으로)**: 스텝 구성이 `S1` ~ `S8` · `CULT` · `RP`(order 1 ~ 10)로 다시 매겨져 왔다 — S2 빈자리는 없어졌고, 세 에피소드가 같은 구성이며, 끝내야 할 스텝은 새 최상위 키 `completion.requires`가 말한다(§2 · §6). 「모든 에피소드의 규칙인지」는 답이 없다 — **앱은 지금처럼 `order`만 믿고 노드를 스텝 수대로 그리므로**(구획마다 레슨 9 + 최종) 구성이 에피소드마다 달라도 앱 변경이 없다. `id`는 `RP`만 특별하고 나머지(`CULT` 포함)는 불투명 문자열이다([ADR-0065](../adr/0065-episode-format-additions.md) D7) |
| **Q6** | `audio_url` · 문항 `image_url`이 전부 `""`. 컷 `image_url`은 상대 경로 | **빈 문자열 금지**: 없으면 키를 뺀다. 있으면 매니페스트 기준 상대 경로. 오디오는 URL이 아니라 **불투명 id**(예: `u01-water/d-02`)로 주면 호스트 모듈 규약(ADR-0017 D3)에 바로 맞는다. 오디오 id는 항상 같은 객체의 텍스트(`audio: Text` 또는 `text: Text`)와 **쌍으로** 온다 — id만 있고 텍스트가 없는 자리는 계약 위반 | **답(2026-10-12, 부분)**: 오디오는 id 규약으로(부록 C). 이미지는 상대 경로 유지, 수령본은 부록 D. 빈 문자열 금지 여부는 미답 ⟨2026-10-14 — FE 처리⟩ 컷에 **선택** 키 `audio_url`을 더했다(§4). 앱은 없음 · 빈 문자열을 같게 읽는다(키 생략 권장은 그대로). id는 앱이 규약 `^[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*$`로 검사하고 어긋나면 재생하지 않는다 — 대문자 · `.` · 확장자 · 스킴 · 공백을 넣지 않는다. 텍스트와 쌍이라는 원칙도 앱이 지킨다: 소리를 붙인 줄의 `ko`가 `{…}` 자리표시자를 품으면 그 줄은 무음이다 |
| **Q7** | `TRANSLATE_TO_EN.options[]`가 영어를 `ko` · `roman`에 넣는다 | 보기는 `{ id, text: string, correct, why_wrong? }`로 바꾸거나, 최소한 `en`에 넣고 `ko` · `roman`을 뺀다 | |
| **Q8** | `why_wrong` 236개가 전부 같은 자리표시자 문장 | 실제 문구가 올 때까지 **키를 뺀다**. 앱은 자리표시자를 렌더하지 않는다 | |
| **Q9** | `ROLE_LINE.feedback.wrong` · `wrong_option`이 37개 중 1개에만 있다 | 계획된 기능이면 모양을 `wrong: { [optionId]: Text }`로 고정하고 전 문항에 채우거나, 아니면 뺀다 | |
| **Q10** | `dialogue[].textbook`이 34줄 중 1줄 | 「교과서체 변형」으로 선택 필드 유지. 의미를 한 줄로 적어 달라(앱이 어디에 보여줄지 정해야 한다) | |
| **Q11** | `words[].grade` 32/38, `example_ko` · `example_roman` 8/38 | 둘 다 선택으로 고정. 예문은 `example: { ko, roman }` 객체로 바꿔 다른 자리와 맞춘다 | |
| **Q12** | 세 언어 묶음의 키 구성이 자리마다 다르다(§3) | `Text = { ko, roman, en? }` 하나로. `prompt`만 `{ ko, en }` 허용. `en`은 채점에 쓰지 않는다는 전제 확인 | |
| **Q13** | 대화가 엄격히 교대하지 않는다 | 허용. 앱은 `role`만 본다. 확인만 | |
| **Q14** | `{이름}` · `{나라}`(대화 · 롤플레이 정답) · `{명사}` · `{수단}`(패턴) 자리표시자 | 치환 규칙을 정한다. 제안: `{이름}` · `{나라}`는 **앱이 프로필로 치환**하고 채점은 치환 뒤 문자열로. 패턴 슬롯은 표시용이라 치환하지 않는다. 치환 대상 토큰 목록을 계약에 고정 | **답(2026-10-12, 사용자 = 콘텐츠 생산자)**: 제안대로 — 앱이 프로필로 치환, 채점은 치환 뒤 문자열. ⚠ 앱에 이름 · 국가 프로필 필드가 아직 없다(3단계 결정 D-PROFILE). **FE 처리(2026-10-13, 3d-2)**: 프로필이 들어왔다([ADR-0059](../adr/0059-learner-profile.md)). 콘텐츠 쪽이 알아야 하는 치환 결과 — ① `{이름}`은 학습자가 입력한 글자 **그대로** 세 줄(ko · roman · en)에 선다 — 한글 이름이면 로마자 줄에도 한글이다. 조사는 이름 자체의 받침으로 고른다(`Emma로` · `Liam으로` · `민지예요`). ② `{나라}`는 줄마다 다른 표기다 — ko 줄은 한국어 이름(`독일`), roman 줄은 로마자이고 **뒤 조사와 연음**한다(`{나라}eseo` → `dogireseo` · `{나라}(eu)ro` → `dogillo`), en 줄은 영어 이름이고 필요하면 관사가 붙는다(`I'm from the United States.`). 그래서 en 줄의 `{나라}` 앞에 `the`를 쓰지 않는다. ③ 프로필이 없으면 지금처럼 「이름」 「나라」 · `ireum` · `nara`. ④ **타자 문항(`DICTATION` · `TRANSLATE_TO_KO` · `SENT_BUILD`)의 정답에는 자리표시자를 두지 않는다** — 라틴 이름은 한글 자판으로 칠 수 없어 그 문항이 학습자마다 빠진다. ⑤ 치환 대상 토큰은 `{이름}` · `{나라}` 둘뿐이다. 레슨 문항이 토큰 대신 고정 이름 「은지」를 쓰는 것은 Q31 |
| **Q15** ⏸ | `mode`는 `type`에서 1:1로 결정된다. `roleplay.modes`는 `mode: "either"`의 중복(RP 수정본 뒤) | `mode`를 **빼고** 앱이 `type`에서 유도한다. 남기려면 「타입당 하나」를 불변식으로 적는다 | |
| **Q16** ⏸ | `ROLEPLAY_TURN.ref`가 `""`(RP 수정본 뒤). `card_kind`는 `"단어"` 하나 | `ref`는 없으면 키를 뺀다(Q6과 같은 원칙). `card_kind` 가능한 값 목록을 달라 | |
| **Q17** | `TURN_ORDER.answers[0].ko`가 `"문장1 \| 문장2 \| …"`, `PAIR_MATCH.answers[0].ko`가 `"a=b \| c=d"`, `tiles_gloss_en`이 `"x / y / z"` | 문자열 인코딩을 버린다. TURN_ORDER: `answer: number[]`(tiles 인덱스 순서). PAIR_MATCH: `pairs: { left: Text, right: string }[]`. 앱이 구분자를 파싱하지 않는다 | **FE 처리(2026-10-13, 3d-1)**: 콘텐츠 답은 아직 없다. 짝 맞추기 화면은 디코더가 `answers[0].ko`에서 푼 짝만 쓴다 — **`tiles_gloss_en`은 읽지 않는다**(정답 문자열이 같은 정보를 낱말과 묶인 채로 주고, 뜻 안에 쉼표 · 슬래시가 들 수 있어 `" / "` 가르기가 약하다). 정답 문자열을 풀 수 없으면 지금처럼 에피소드가 실패한다(§12 `string-answer-malformed`) |
| **Q18** | 앱이 모르는 `type` · `schema`를 만났을 때의 규칙이 없다 | 매니페스트 `min_app_version`으로 1차 차단. 그래도 모르는 문항 타입이 오면 **그 에피소드를 잠근 채 표시**(숨기지 않음 — 이미 `pending` 구획이 그 모양이다). 어느 쪽이든 서버 쪽 정책 확인 | |
| **Q19** | 컷 `kind`가 담긴 배열과 같은 값 | 중복이지만 무해. 유지 | |
| **Q20** | `tiles` · `options` 순서가 **표시 순서인지 섞어야 하는지** 알 수 없다 | 앱이 섞는다. 단, `WORD_ORDER` · `TURN_ORDER`의 tiles는 이미 정답 순서가 아닌 것으로 보인다 — 확인 | **FE 처리(2026-10-13, 3c)**: 앱이 섞는다 — `tiles`(낱말 순서 · 대화 순서 · 빈칸 채우기 · 최종 테스트)를 에피소드 id + 문항 id를 씨앗으로 **결정적으로**(다시 풀어도 같은 순서, 정답 순서 그대로 나오면 한 칸 돌림). `options`의 순서는 파일 그대로 보인다. 파일의 순서가 표시 순서라는 가정은 하지 않는다. 콘텐츠 쪽 확인은 대기 |
| **Q21** | 오디오가 하나도 없다(§9) | 에피소드 1 ~ 3 출시 범위에 **오디오가 들어가는지** 먼저 답을 달라. 들어가면 Q6의 id 규약 + 파일 형식(m4a) + 매니페스트 등록. 안 들어가면 `LISTEN_SELECT` · `DICTATION`은 `stimulus.audio` 텍스트만으로 성립하지 않으므로 그 문항들의 처리(숨김 / TTS / 텍스트 노출)를 정해야 한다. **들어가든 안 들어가든** `stimulus.audio`(LISTEN_SELECT · DICTATION)와 `dialogue[].text`의 `ko · roman · en`은 오디오의 **텍스트 대체(전사)** 로 계속 필수다 — 오디오가 추가돼도 빼지 않는다(WCAG 1.2.1). 앱은 재생 불가 · 무음 · 스크린리더 환경에서 이 텍스트를 노출할 수 있어야 하며, DICTATION처럼 텍스트 노출이 문항을 무너뜨리는 타입은 **노출 시점(답 제출 뒤)** 을 제품이 정한다 | **답(2026-10-12)**: 오디오 **들어간다** — 파일은 부록 C 목록대로 제작. 파일이 오기 전까지 앱은 텍스트를 보여 주고 재생 버튼을 비활성 ⟨2026-10-13 — 3c 앱 처리, 위 답의 뒷부분을 좁힌다⟩ 파일이 오기 전까지: **오디오 없는 `LISTEN_SELECT`는 레슨에서 건너뛴다**(사용자 결정 — 대본을 보이면 보기와 같은 문장이라 베끼기가 된다. 세 에피소드의 듣기 문항은 지금 전부 서지 않는다). **`DICTATION`은 로마자 + 영어 뜻을 보이고 재생 버튼을 비활성**으로 두며 한글은 답을 낸 뒤 공개한다. 3c 앱은 오디오 id가 와도 아직 재생하지 않는다 — 연결은 별도 작업([ADR-0058](../adr/0058-catalog-learning-session.md) D3) ⟨2026-10-14 — 연결됨, 일부⟩ **카탈로그 컷과 최종 테스트가 소리를 낸다** — 컷은 서면 자동, 최종 테스트는 상대 줄 자동 + 정답 뒤 내 줄, 다시 듣기 조작 없음(사용자 결정, [ADR-0060](../adr/0060-episode-voice-remote-audio.md)). **학습 문항(`LISTEN_SELECT` · `DICTATION`)은 아직이다** — 위 3c 처리(듣기 건너뜀 · 받아쓰기 재생 비활성)가 그대로 산다. 텍스트 대체 원칙은 그대로다 — 소리는 화면 대사의 보조 채널이다 |
| **Q22** | `post_cuts`의 등장 조건이 파일에 없다 | 「RP 통과 시 한 번」으로 앱이 쥔다. 재진입 시 다시 볼 수 있는지(표지는 D12로 건너뛰어도 완료다)와 **RP 불통과 시 재시도 규칙**은 콘텐츠가 아니라 제품 결정이므로 여기서는 묻기만 한다 | **앱 처리(2026-10-13, 3c — 제품 결정)**: `post_cuts`는 최종 테스트를 **통과한** 결과 화면의 나가기 뒤에 선다. 완료는 판정 순간에 적으므로 컷을 중간에 나가도 다음 에피소드가 열린다. 최종 테스트는 다시 풀 수 있고 다시 통과하면 컷도 다시 선다. 불통과는 결과 화면의 `Try again`으로 첫 턴부터 — 횟수 제한 없음. 통과 기준은 턴의 60 % 이상(올림) |
| **Q23** | 컷 · IMG_MATCH 이미지의 **대체 텍스트** 출처가 없다. `image_brief`가 유일한 텍스트인데 컷은 한국어 장면 묘사, IMG_MATCH는 `"<영어 키워드> - 한 컷으로 알아볼 수 있게"`로 생성 지시문이 섞여 있다 | 이미지가 있는 자리(컷 · `stimulus.image_url`)에 `image_alt: { ko, en }`을 **별도 키**로 추가한다. `image_brief`는 생성용으로 남기고 앱은 alt로 쓰지 않는다. IMG_MATCH의 `image_alt`는 **정답 한국어 단어를 담지 않는다**(영어 묘사만, 예: `"a glass of water"`). 컷의 `image_alt`는 장면 묘사이되 대사 · 지문(`line` · `aside` · `narration`)과 중복하지 않는다(그 텍스트는 이미 화면에 읽힌다). 추가가 어렵다면 **IMG_MATCH에 한해** `image_brief`의 `" - "` 앞 영어 키워드를 alt로 쓰는 것을 허용하고 그 형식을 불변식으로 고정한다 | **FE 처리(2026-10-13, 3d-1 — IMG_MATCH만)**: 콘텐츠 답은 아직 없다. 앱은 그림 문항의 대체 텍스트로 **정답 보기의 `en`**을 쓴다(없으면 `words[]`의 `gloss_en`) — 낭독 `Picture: water`, 그림을 못 보일 때 그 자리에 서는 글자도 같은 값이다. **`image_brief`는 쓰지 않는다**(생성 지시문이 섞여 있다). 한글 · 로마자는 넣지 않는다(정답을 흘린다). `image_alt`가 오면 출처만 바꾼다. 컷 그림은 3b-2 그대로 alt를 비운다 |
| **Q25** | **`TURN_ORDER`에 턴별 화자 표기가 없다.** `tiles` · 정답 순서 어디에도 그 턴이 상대 말인지 학습자 말인지 적혀 있지 않다 | 앱은 정답 순서의 **짝수 칸(0, 2, …) = 상대 · 홀수 칸 = 학습자**로 번갈아 가정해 대화 조립(좌 회색 · 우 주황 말풍선)을 그린다(2026-10-13 사용자 결정). 가정이 틀리지 않게 `tiles[]`에 `role: "counterpart" \| "player"`(`dialogue[].role`과 같은 어휘)를 싣거나, 최소한 문항에 첫 화자(`first_speaker`)를 달라. Q13처럼 대화가 엄격히 교대하지 않는 문항이 있으면 가정이 어긋난다 | **답(2026-10-15, 새 형식으로)**: `tiles[]`에 **`speaker: "counterpart" \| "player"`**가 실려 왔다(29/29 — 제안한 `role`이 아니라 `speaker`라는 이름). 29문항 중 15문항이 player부터 시작해 짝 · 홀 가정이 실제로 어긋나 있었다. **FE 처리(2026-10-16)**: 앱은 칸의 화자를 그 값으로 그린다. 화자가 문항의 타일 **전부**에 있어야 하고, 하나도 없으면 옛 짝 · 홀 규칙, **일부에만 있으면 그 문항을 건너뛴다**(뒤바뀐 대화를 그리지 않는다). 같은 화자가 연이어 서는 순서도 그대로 그린다([ADR-0065](../adr/0065-episode-format-additions.md) D9) |
| **Q26** | **`u01-water`의 S3-05 · S3-10 · S5-09 정답 순서 확인.** 세 `TURN_ORDER`의 정답이 `아니요, 괜찮아요. \| 삼천 원입니다. \| 카드로 할게요. \| 영수증 드릴까요?` 순서로 「아니요, 괜찮아요.」로 시작해 대화 흐름과 어긋나 보인다(영수증을 묻기 전에 「괜찮아요」라고 답한다) | 앱은 데이터대로 채점한다 — 이 순서가 맞는지 확인하고, 틀리면 정답 순서(`answers[0].ko`)를 바로잡아 달라 | |
| **Q27** | **「봉투」의 뜻이 두 자리에서 다르다**(`u01-water`). 단어 목록 `words[]`(`voca:c5cd4239`)의 `gloss_en`은 `envelope`인데, 같은 낱말을 묻는 `IMG_MATCH` `S1-08`의 정답 보기 `en`과 `image_brief`는 `bag`이다(카드 `S1-03`의 예문 번역도 `Would you like a bag?`) | 앱은 데이터 그대로 보인다 — 단어 카드의 뜻은 `envelope`, 그림 문항의 대체 글자 · 이름표는 `bag`. 이 장면(편의점)의 뜻은 `bag`으로 보인다. 어느 쪽이 맞는지 정해 **한 값으로 맞춰** 달라. 일반 규칙으로는 「보기의 `en`은 그 낱말 `words[].gloss_en`과 같다」를 불변식으로 두기를 제안한다 | |
| **Q28** | **단어 카드 예문에 고정 이름 「은지」가 박혀 있다.** `u02-checkin` `S1-02`(「은지로 예약했어요.」) · `u03-mina` `S1-02`(「안녕하세요, 저는 은지예요.」) — `{이름}` 자리표시자가 아니다 | 학습자 자신의 말이면 `{이름}`으로 바꿔 달라(Q14 — 앱이 프로필로 치환한다). 예문 속 다른 사람이면 그대로 둔다. 앱은 데이터 그대로 보인다 | |
| **Q29** | **예문이 표제어와 같은 카드가 있다.** `u03-mina` `S4-03`의 `context`와 `example`이 둘 다 「오다」다 | 앱은 그 카드를 **예문 상자 없이** 세운다(같은 글자를 두 번 보이지 않는다). 예문을 채우거나, 예문이 없는 카드는 `example` 키를 빼는 것으로 고정해 달라(Q6과 같은 원칙) | |
| **Q30** | **`IMG_MATCH` 그림의 비율이 정해져 있지 않다**(그림이 아직 없다) | 앱의 그림 틀은 **가로 4 : 세로 3**이고 그림을 틀에 채운다(넘치는 가장자리는 잘린다). 그림을 4:3으로 만들고 대상을 가운데에 두어 달라. 컷 그림(세로 941 × 1672)과 다른 비율이다 | |
| **Q31** | **에피소드 2 · 3 레슨의 역할 대사가 고정 이름 「은지」를 써서 학습자 이름이 최종 테스트에만 나온다.** `u02-checkin` · `u03-mina`의 레슨 문항(대사 고르기 · 영어 뜻 고르기의 보기, 대화 순서 타일, 받아쓰기 · 문장 만들기 정답, 단어 카드 예문 — 예: u02 「은지로 예약했어요.」 · u03 「안녕하세요, 저는 은지예요.」 · 「… 은지는요?」)이 학습자 자신의 대사인데 `{이름}`이 아니라 「은지」다. 같은 대사가 `dialogue`와 최종 테스트(`RP-01` · `RP-04`)에서는 `{이름}`이다. 일부 문항은 `feedback.correct.ko`가 「은지」, `feedback.correct.en`이 `{이름}`이라 한 문항 안에서도 갈린다 | 레슨에서도 `{이름}`을 쓸지 정해 달라. 쓰면 앱이 프로필로 치환해 레슨부터 학습자 이름이 선다(앱 변경 없음). 단 **타자 문항의 정답**에는 쓰지 말아 달라(Q14 ④ — 라틴 이름은 칠 수 없다). 「은지」를 예문 속 다른 사람으로 둘 거면 `feedback.correct.en`의 `{이름}`도 「Eunji」로 맞춰 달라. 앱은 지금 데이터 그대로 보인다. Q28(단어 카드 예문)과 같은 부류다 | |

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

⟨2026-10-16 — 새 형식⟩ 와이어 스키마가 300줄을 넘어 셋으로 나뉘고 새 유형 변환이 따로 섰다 — `episode-content.schema-parts.ts`(공통 조각: 텍스트 · 지시문 · 보기와 정답 하나 검사 · 자극 · 공통 필드) ·
`episode-content.schema-items.ts`(새 11종 `ADDED_ITEM_TYPES` · 갈래), `episode-content.items-added.ts`(새 11종 와이어 → 모델). 셋 다 `background-only`다. `KNOWN_ITEM_TYPES`는 **24종**이다.
그래서 **`src/` 안에서 `zod`를 import하는 파일은 넷**이다(콘텐츠 스키마 셋 + 매니페스트 스키마 — unit 테스트가 목록을 고정한다). 위 표의 「둘뿐」과 「13종」은 그 전의 상태다.

런타임 모듈 넷의 첫 줄은 `import "background-only";`다 — 메인 스레드 번들에 실리면 빌드가 깨진다(`posthog-client.ts` 선례, ADR-0029 D3). `zod` `4.6.5`는 `apps/mobile` `dependencies`에 있다(ADR-0013 D5 「첫 설치 뒤 더해진 `dependencies`」).

**픽스처** — `apps/mobile/content/episodes/u01-water.json` · `u02-checkin.json` · `u03-mina.json`. 원본의 **바이트 사본**(sha256 동일, 포맷터 글롭에서 제외). ⟨2026-10-12⟩ 3a부터 **번들에 들어간다** — `src/lib/episode-bundled.ts`가 내장 에피소드로 import한다(ADR-0056 D1). 그래서 이 사본이 곧 내장본이고, 바꾸면 `content/manifest.json`의 `sha256` · `bytes`도 바꾼다. 콘텐츠의 사본이므로 손으로 고치지 않는다 — 합의로 원본이 바뀌면 통째로 바꾼다(Q4가 「제안대로」면 u03은 고쳐진 파일로).
⟨2026-10-16 — 새 형식⟩ **통째로 바꿨다** — 내장 셋은 새 형식 원본에 음성 id 14개를 문장 대조로 다시 붙인 바이트다(원본과 바이트가 같지 않다 — 부록 C · [ADR-0060](../adr/0060-episode-voice-remote-audio.md) 적용 기록). 손으로 고친 자리는 없다.
옛 셋은 `apps/mobile/content/test-fixtures/delivery-2-2026-10-14/`(매니페스트 포함)에 바이트 그대로 있고 테스트만 읽는다 — 번들에 실리지 않는다.

**디코더 정책**

- 모르는 **키**는 버린다(`.strict()` 아님) — RP 수정본이 키를 **더해도** 에피소드가 죽지 않는다(필수 키의 모양이 바뀌면 죽는다 — 아래 RP 줄).
- 모르는 문항 **`type`**은 에피소드 단위 **실패**(`unknown-item-type`) — 화면이 그릴 수 없으므로 호출자가 「잠근 채 표시」한다(Q18). 부분 성공(일부 유닛만)은 없다.
- ~~RP(최종 테스트) 문항은 **불투명** — `{ id, type: "ROLEPLAY_TURN" }`만 검사하고 원본을 `raw`로 보존한다. 엄격 스키마는 RP 수정본 뒤 별도 작업(Q2 · Q15 · Q16).~~ ⟨2026-10-13 — 3c⟩ **RP 문항은 엄격하다** — 다른 문항과 같은 객체 스키마로 검사하고 `raw`는 걷었다(§7.4). 모양이 어긋나면 `invalid-shape` → 에피소드 잠금. 느슨하게 받으면 망가진 RP가 「턴 0개 = 즉시 통과」로 새기 때문이다([ADR-0058](../adr/0058-catalog-learning-session.md) D8).
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
| `completion-malformed` ⟨2026-10-16⟩ | `completion.requires`가 비었음(경로 `completion.requires`) 또는 원소가 `steps[].id`에 없음(경로 `completion.requires[i]` — `"intro"` 포함)(§2) | 실패 |

⟨2026-10-16⟩ `unknown-item-type`의 「13종 밖」은 이제 **24종 밖**이다. **옛 디코더(이 변경 전 빌드)는 새 파일 셋을 모두 `unknown-item-type`으로 거부한다** — 버킷에 새 본문이 올라가도 옛 빌드는 내장 폴백으로 옛 콘텐츠를 연다(§10).

**테스트** — unit 50(`episode-content.unit.test.ts`: 최소 에피소드 변이 · 정규화 · 거부 · `zod` import 단일성 · `background-only` 첫 줄) · integration 27(`episode-content.integration.test.ts`: 디스크의 실제 세 파일 → `decodeEpisode`, 13종 전부 디코드 · 와이어 키 잔존 0 · u03 경고 23 · 결정성).

**앱 구조에 맞출 때 FE가 따로 정해야 하는 것** (콘텐츠 합의와 무관, ADR-0024 확장 후보)

| 파일 | 지금 앱 | 필요한 일 |
|---|---|---|
| `pre_cuts` | `EpisodePrologue`는 `call \| messenger \| visual-novel` 세그먼트 | ~~컷 세그먼트 종류를 하나 더 두거나, 기존 `EpisodeNarrativeBeat`에 얹는다~~ **결정(2026-10-12, 3b-2)**: 튜토리얼 서사에 얹지 않고 **새 화면** `catalog-cover`(`screens/catalog-cover/`)가 그린다 — 대사 · 내레이션 · 독백(`thought` 패널, 괄호) · 지문(패널 안 ko + en), 화자 `플레이어`는 `Me`. [ADR-0024](../adr/0024-journey-units-and-special-unit-placement.md) D15 · `docs/screens.md` 「카탈로그 표지(컷)」 |
| `S1` ~ `S9` | 유닛 → `JourneyStep`(닫힌 8개 id) → 학습형별 문항표 | ~~유닛 id를 열고(`<episode>/<step.id>`), 유닛 안 문항 목록은 `items`를 그대로 순서대로 낸다. 학습형 7개 테이블은 `type` 판별 하나로 합친다~~ **결정(2026-10-13, 3c)**: 튜토리얼의 스텝 · 문항표는 그대로 두고, 카탈로그 유닛은 **수업 계획**(`app/catalog-lesson-plan.ts`)이 `items`를 순서대로 학습형 문항으로 바꿔 기존 학습 화면에 데이터로 넘긴다. `type` → 학습형 표 · 건너뛰는 종류(`VOCAB_CARD` · `IMG_MATCH` · `PAIR_MATCH`, 오디오 없는 `LISTEN_SELECT`)는 [ADR-0058](../adr/0058-catalog-learning-session.md) D2 · `docs/screens.md` 「카탈로그 레슨」 ⟨2026-10-13 — 3d-1⟩ **`VOCAB_CARD` · `PAIR_MATCH`는 화면을 얻었다**(단어 카드 · 짝 맞추기). `IMG_MATCH`는 단어 선택의 그림 문항으로 서되 **그림 주소가 비어 있어 지금은 전부 건너뛴다.** 그래서 `S1` · `S4`는 단어 카드로 시작하고(u01 `S1` = 카드 셋 + 빈칸 채우기 셋, 그림 문항 둘 건너뜀), u03 `S9`에 짝 맞추기 두 문항이 선다. 앱이 읽는 필드는 §7.2 아래 표, 결정은 ADR-0058 「적용 기록」 |
| `RP` | `EpisodeFinalTest`는 `format: visual-novel \| call` + `speaking \| word-choice \| writing` | ~~RP 수정본을 보고 결정. 지금 모양은 `ROLEPLAY_TURN` 하나뿐이다~~ **결정(2026-10-13, 3c — 사용자: 지금 모양으로)**: 튜토리얼 최종 테스트에 얹지 않고 **새 화면** `catalog-final`이 턴마다 상대 대사 + 타일 순서 맞추기로 그린다. 화자는 에피소드 `counterpart`. ADR-0058 D9 · `docs/screens.md` 「카탈로그 최종 테스트」. RP 수정본이 오면 다시 본다 |
| `post_cuts` | **자리 없음** — D10은 「마지막 자리 = 최종 테스트」 | ~~최종 테스트 결과 화면 뒤에 컷 열람을 붙이거나, 튜플에 네 번째 자리(통과 뒤 화면)를 더한다. 어느 쪽이든 ADR-0024 D10의 확장이라 결정 기록이 필요하다~~ **결정(2026-10-13, 3c)**: **결과 화면 뒤에 붙인다** — 맵에 노드를 더하지 않는다. 표지 컷 화면을 다시 쓴다(route `catalog-epilogue`). ADR-0058 D10 · [ADR-0024](../adr/0024-journey-units-and-special-unit-placement.md) 정정 기록 2026-10-13 |
| 매니페스트의 미수신 에피소드 | `kind: "pending"` 에피소드(D13 · D14) | 그 자리에 그대로 들어간다. 받으면 `filled`로 바뀐다 |

## 13. 납품 — 고칠 때의 규칙 ⟨2026-10-20⟩

앱은 바뀐 에피소드를 **본문 · 그림 · 음성을 다 받은 뒤 다음 앱 시작에** 새 버전으로 바꾼다(스플래시에서 로고가 끝난 뒤 최대 3초 기다려 그 안에 다 받으면 그 실행부터). 그때까지 기기는 옛 버전과 **옛 파일**을 쓴다([ADR-0078](../adr/0078-episode-update-on-splash.md)). 그래서 이미 올라간 에피소드를 고칠 때는 아래를 지킨다. 처음 올리는 에피소드도 3 · 4 · 6은 같다.

1. **그림 · 음성을 고치면 새 이름으로 올린다** — 새 경로(`images/<id>/pre-1-v2.webp` 등) · 새 음성 id(`u04-directions/d-01b` 등). **같은 이름으로 덮어쓰지 않는다**: 앱은 이미 받은 이름의 파일을 다시 받지 않고, 옛 버전을 연 기기는 덮어쓴 파일을 그 자리에서 쓴다(파일의 해시는 어디에도 없어 앱이 바뀐 것을 알 수 없다 — [ADR-0071](../adr/0071-episode-background-download.md) 「대가」 2).
2. **그림은 WebP 품질 75로, 해상도는 원본 그대로** 내보낸다(2026-10-21 사용자 공유 — 줄이지 않는다).
3. **에피소드 JSON을 다시 만든다** — 바뀐 경로 · 음성 id를 넣는다. 그리고 `manifest.json`의 그 항목을 고친다: `sha256` · `bytes`를 **올릴 그 파일**의 값(UTF-8 바이트의 SHA-256 소문자 hex · 바이트 수)으로, `version`을 **더 높게**(`YYYY-MM-DD.n`, §10). JSON만 다시 올리고 매니페스트를 그대로 두면 앱은 sha가 맞지 않아 그 본문을 받지 않는다(`integrity-mismatch` — 아래 사건 기록). 음성 id가 바뀌면 `audio/manifest.json`도 다시 만든다(부록 E).
4. **올리는 순서**: 새 그림 · 음성 파일 → `audio/manifest.json` → 에피소드 JSON → (약 1분 뒤) **`manifest.json` 마지막**. 매니페스트가 먼저 바뀌면 기기가 아직 없는 본문 · 파일을 받으려다 실패하고 다음 기회로 미룬다(옛 버전은 깨지지 않지만 늦어진다). 1분을 두는 것은 에피소드 JSON의 엣지 사본이 바뀔 틈이다(5).
5. **`cacheControl`** — 그림 · 음성은 **1년**(`31536000` — 고치면 새 이름이라 같은 주소의 내용이 바뀌지 않는다), 에피소드 JSON · `manifest.json` · `audio/manifest.json` 셋은 **60초**. **Supabase 대시보드에서 올리면 `cacheControl`이 1시간(`3600`)으로 붙는다** — 지금 버킷의 응답도 `max-age=3600`이다. JSON 셋은 Storage API · CLI로 `cacheControl`을 정해 올린다.
   - **기기는 주소 키로 기기 캐시를 비켜 간다** — 앱이 `manifest.json` · `audio/manifest.json` 주소에 분 단위 키(`?m=`), 에피소드 JSON 주소에 sha 키(`?v=`)를 붙여 기기에 남은 옛 응답을 쓰지 않는다(ADR-0078 D11).
   - **엣지(CDN) 지연의 상한은 `cacheControl`이다** — 엣지는 주소 키를 보지 않는다(2026-10-21 실측 — 쿼리가 달라도 `cf-cache-status: HIT`). 그래서 올린 뒤 최대 60초(대시보드로 올렸으면 1시간)는 옛 목록이 보일 수 있고, 그 사이 낡은 본문이 오면 앱은 sha가 맞지 않아 받지 않았다가 다음 기회에 다시 받는다. 60초는 이 창을 줄이는 유일한 수단이다.
6. **옛 파일은 지우지 않는 것이 기본이다 — 지우는 시점은 아직 정하지 않았다**(§10 고정 문면 그대로, 사용자 확인 2026-10-21). 옛 버전을 연 기기는 다음 시작에 바뀔 때까지 옛 이름의 파일을 쓴다(받아 두지 못한 기기는 버킷에서 읽는다).
7. 올린 뒤 공개 주소로 `manifest.json` · 바뀐 에피소드 JSON을 받아 **200 · 매니페스트의 `sha256` · `bytes`와 같은지** 본다(엣지 사본이 남아 있으면 60초 뒤 다시).
8. ⟨2026-10-21⟩ **앱에 내장된 그림은 같은 이름이면 내장이 이긴다** — 튜토리얼 u00의 그림 14장은 앱 번들에 있고, 앱은 받아 둔 파일 > 내장 > 원격 순으로 고르며 내장 그림은 받지 않는다([ADR-0080](../adr/0080-tutorial-as-catalog-episode.md) D2). 같은 이름으로 내용만 바꾸면 **앱을 새로 내기 전까지 반영되지 않는다** — 규칙 1(새 이름)이 여기서도 유일한 길이다. u00의 JSON · 매니페스트 항목을 바꾸면 내장본과 version이 갈려 원격이 이기고, 새 이름의 그림만 받는다.

### 사건 기록 ⟨2026-10-20 ~ 21⟩ — 같은 이름 재업로드 · 매니페스트 미갱신

- **무엇이 있었나** — 2026-10-20 버킷의 `episodes/u01` ~ `u04` JSON과 그림이 **같은 이름으로 다시 올라갔고 `manifest.json`은 고쳐지지 않았다**(2026-10-19판 그대로). 예: `episodes/u04-directions.json`은 150,222 B · sha `c4780d55…`인데 매니페스트 항목은 141,519 B · `29e72d1e…`였다(규칙 1 · 3 위반).
- **기기에서 무엇이 보였나** — 앱은 u04 새 본문을 `integrity-mismatch`로 받지 않았다. 이미 u04를 열던 기기는 옛 버전을 그대로 썼고(ADR-0078 D3), **새 설치는 u04가 원격 전용이라 잠긴 채 열리지 않았다**. 덮어쓴 그림은 감지할 수 없어, 옛 본문을 연 기기가 새 그림을 받았는지 · 옛 그림을 쓰는지는 기기마다 다르다.
- **어떻게 바로잡았나** — 사용자가 2026-10-21 `manifest.json`을 u01 ~ u04 **`2026-10-21.1`** · 버킷 파일의 실측 sha256 · bytes로 다시 만들어 올렸다(앱 디코더 통과 · 본문이 가리키는 그림이 모두 버킷에 있음을 확인한 판). 그 뒤 기기에서 게이지 → 다음 시작 교체를 확인했다([e2e](../e2e/episode-update-on-splash.md) EU-3 ~ EU-5).
- **남은 것** — u01 ~ u03 새 본문에는 **음성 id가 없다**. 2026-10-21.1판이 내장(2026-10-16.1)을 이겨 그 셋은 원격본이 열린다 — 사용자 결정(2026-10-21)으로 그대로 내보냈다. 음성 id를 다시 붙인 판은 위 규칙으로 새 `version`을 달아 올린다.
- **튜토리얼 `u00-tutorial`** — 2026-10-21 버킷에 JSON · 그림이 더해졌지만 **`manifest.json`에는 없다**(앱은 매니페스트에 없는 파일을 받지 않는다). 내장 튜토리얼을 교체하는 별도 앱 PR에서 다룬다(사용자 결정) — 그 전에 매니페스트에 넣지 않는다.
  ⟨2026-10-21 — 다룸⟩ 같은 날 버킷 `manifest.json`에 u00 항목(order 0)이 들어갔고(사용자가 올림), 앱 PR이 그 판(`2026-10-21.3`)을 바이트 그대로 내장했다([ADR-0080](../adr/0080-tutorial-as-catalog-episode.md)). **옛 앱(이 PR 전 빌드)에서는 u00이 원격 전용 「Episode 1.」로 서고, 옛 튜토리얼을 통과했지만 u01을 아직 열지 않은 사용자의 u01이 u00 뒤로 잠긴다** — 사용자 결정(Q1)으로 항목을 그대로 두었다(수용된 위험).

## 부록 A. 에피소드별 수치

| | u01-water | u02-checkin | u03-mina |
|---|---|---|---|
| 바이트 | 79,346 | 121,744 | 98,347 |
| pre / post 컷 | 6 / 3 | 5 / 4 | 4 / 3 |
| 대화 줄 | 8 | 13 | 13 |
| 유닛(스텝) / 문항 | 8 + RP / 78 | 8 + RP / 123 | 8 + RP / 87 |
| 단어 / 패턴 | 10 / 1 | 13 / 2 | 15 / 1 |
| 미해결 ref | 0 | 0 | 23 (3개 id) |

⟨2026-10-16 — 새 형식⟩ 위 표는 옛 세 파일이다(지금 테스트 픽스처). 새 내장본(음성 id 포함 바이트):

| | u01-water | u02-checkin | u03-mina |
|---|---|---|---|
| 바이트 | 125,327 | 159,188 | 154,196 |
| pre / post 컷 | 6 / 3 | 5 / 4 | 4 / 3 |
| 대화 줄 | 9 | 13 | 13 |
| 스텝 / 문항 | 8 + CULT + RP / 104 | 8 + CULT + RP / 133 | 8 + CULT + RP / 118 |
| 단어 / 패턴 | 13 / 1 | 14 / 3 | 15 / 1 |
| 미해결 ref | 0 | 0 | 18 (3개 id) |

원문 합은 299,890 → 438,711 bytes(+46 %)다.

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

⟨2026-10-16 — 새 형식⟩ 위 표는 옛 세 파일이다. 새 세 파일(합집합 — 스텝 id가 다시 매겨져 위 표와 행끼리 대응하지 않는다):

| 유닛(스텝) | order | 타입 |
|---|---|---|
| S1 | 1 | VOCAB_CARD · CLOZE · IMG_MATCH · LISTEN_SELECT · CLOZE_CHOICE · WORD_ORDER |
| S2 | 2 | LISTEN_SELECT · REPLY_SELECT · ROLE_LINE · TURN_ORDER · LISTEN_BUILD |
| S3 | 3 | VOCAB_CARD · CLOZE · IMG_MATCH · LISTEN_SELECT · SYLLABLE_BUILD |
| S4 | 4 | LISTEN_SELECT · REPLY_SELECT · ROLE_LINE · TURN_ORDER · LISTEN_BUILD |
| S5 | 5 | PARTICLE_FILL · PARTICLE_SWAP · MIN_PAIR_AB · DICTATION · SHADOW · LISTEN_BUILD |
| S6 | 6 | CLOZE · TRANSLATE_TO_KO · WORD_ORDER · LISTEN_SELECT · TRANSLATE_TO_EN · SPEAK_WORD |
| S7 | 7 | REPLY_SELECT · ROLE_LINE · WORD_ORDER |
| S8 | 8 | CLOZE · DICTATION · LISTEN_SELECT · TRANSLATE_TO_EN · TRANSLATE_TO_KO · LISTEN_BUILD · SPEAK_WORD |
| CULT | 9 | CULTURE_CARD · CULTURE_CHECK |
| RP (최종 테스트) | 10 | ROLEPLAY_TURN |

`PAIR_MATCH` · `SENT_BUILD`는 새 파일에 없다. 셀 안의 순서에는 뜻이 없다 — 문항 순서의 정본은 파일이다.

## 부록 C. 오디오 제작 목록 (Q21 — 사용자 「필요한 부분 정리해 주면 만들게」 2026-10-12)

id 규약(Q6 제안): `<episode_id>/<kind>-<n>` — 확장자 없는 불투명 id. ~~호스트 `AudioPlaybackModule`이 번들(`apps/ios/Host/audio/<id>.m4a`, Android `AudioAssetPath`)에서 찾고, 없으면 원격(3단계 소스)에서 받는다.~~ ⟨2026-10-14⟩ 파일은 버킷 `content`의 `audio/<id>.m4a`에 두고, **앱이 id를 그 주소로 바꿔 재생한다**(번들에서 찾지 않는다 — [ADR-0060](../adr/0060-episode-voice-remote-audio.md) D1 · D2). 파일은 **m4a(AAC) · 모노 · 44.1 kHz**, 앞뒤 무음 0.2 s 이내. 같은 문장은 한 에피소드 안에서 **한 번만** 녹음한다 — 문항의 `stimulus.audio`가 대화 줄과 같은 문장이면 대화 줄의 id를 다시 쓴다.

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

### 재사용 · 업로드 현황 ⟨2026-10-14⟩

**같은 문장은 한 번만 녹음한다** — 컷 대사가 대화 줄과 같은 문장이면 위 표의 컷 id 대신 **대화 줄 id를 다시 쓴다.** 그래서 아래 셋은 따로 녹음하지 않는다:

| 위 표의 id | 문장 | 쓰는 id |
|---|---|---|
| `u01-water/pre-6` | 봉투 드릴까요? | `u01-water/d-01` |
| `u02-checkin/pre-5` | 이름이 어떻게 되세요? | `u02-checkin/d-01` |
| `u03-mina/pre-4` | 안녕하세요. 이름이 뭐예요? | `u03-mina/d-01` |

**버킷에 올라간 음성은 14개다**(사용자 업로드, 공개 URL 전부 200 · 바이트 범위 요청 206 · `content-type: audio/x-m4a`):

| 에피소드 | 파일 | 내장 JSON에서 쓰는 자리 |
|---|---|---|
| u01-water | `d-01` ~ `d-05` · `pre-3` (6) | 대화 seq 1 ~ 5 · 컷 pre 3 · pre 6(`d-01`) |
| u02-checkin | `d-01` · `pre-1` · `pre-3` · `post-1` (4) | 대화 seq 1 · 컷 pre 1 · 3 · 5(`d-01`) · post 1 |
| u03-mina | `d-01` · `pre-2` · `post-1` · `post-3` (4) | 대화 seq 1 · 컷 pre 2 · 4(`d-01`) · post 1 · 3 |

⟨2026-10-16 — 새 형식⟩ **새 내장본에도 같은 14개가 같은 자리에 붙었다** — 새 형식 원본에는 음성 id가 없어(컷 키 없음 · 대화 빈 값) 옛 내장본과 문장(`ko`) · 화자가 같은 컷 · 줄에 다시 붙였다.
14 id 모두 쓰였고 사라진 문장은 0이다. **u01 대화는 9줄이다** — 위 u01 표의 `d-06` ~ `d-08`(제작 목록 번호)은 옛 seq 6 ~ 8이고, 새 대화에서는 seq 6 · 8 · 9다.
새로 끼어든 seq 7 「감사합니다. 안녕히 가세요.」(counterpart)는 **녹음이 없다** — 녹음하면 이 목록에 더할 자리다(id를 seq와 맞출지는 정하지 않았다 — 지금 id가 붙은 seq 1 ~ 5는 이름과 seq가 같다).

나머지 id는 아직 녹음이 없다 — 내장 JSON에 키가 없거나 빈 값이다. 플레이어 줄 가운데 녹음이 있는 것은 u01 `d-02` · `d-04`이고, 최종 테스트가 **정답 뒤 내 줄**로 들려준다(아래 Q24의 「정답 들려주기 용도」가 이것이다).

**음성 길이 권장 상한은 3초다(효과음 포함).** 앱은 컷 · 최종 테스트에서 음성을 자동 재생하고 소리만 멈추는 조작이 없어, 3초를 넘으면 WCAG 1.4.2(Audio Control)에 걸린다.
지금 u02 · u03의 컷 음성 여섯이 넘고(3.51 ~ 6.76 s) 앱은 그것을 알고 받아들였다 — 넘는 음성은 [ADR-0060](../adr/0060-episode-voice-remote-audio.md) 재검토 조건 4의 대상이다. 업로드 준비 단계에서 길이를 재 걸러 주기를 권한다.

문항 `stimulus.audio`가 대화 줄과 같은 문장이면 그 줄 id를 쓴다(u01 6/6 · u02 7/8 · u03 4/6). `{이름}` · `{나라}`가 든 줄(u02 d-02 · u03 d-02 · d-08)은 **녹음하지 않는다** — 플레이어 줄이라 앱이 치환해 보여 주기만 한다(Q14 「앱이 프로필로 치환」, 2026-10-12). 플레이어 줄 전체를 녹음할지(정답 들려주기 용도)는 Q24.

## 부록 D. 이미지 제작 목록 (Q6 · Q23 — 2026-10-12 `u01-water` 7장 수령)

수령본: `u01-water-20261012T044938Z-1-001.zip` — `u01-water/{pre-1,pre-3,pre-4,pre-5,pre-6,post-1,post-3}.jpg`, 전부 **941 × 1672 px(세로) · 326 ~ 605 KB**, 합 2.9 MB.

| 에피소드 | 필요(컷 image_url) | 수령 | 빠짐 |
|---|---|---|---|
| u01-water | 9 (고유 7) | 7 | 없음 — 컷 9개가 고유 그림 7장(pre-1 · 3 · 4 · 5 · 6 · post-1 · 3)을 쓴다. ⟨2026-10-12⟩ 버킷 `content`에 올라갔다 |
| u02-checkin | 9 | 0 | u02-checkin/pre-1.jpg, u02-checkin/pre-2.jpg, u02-checkin/pre-3.jpg, u02-checkin/pre-4.jpg, u02-checkin/pre-5.jpg, u02-checkin/post-1.jpg, u02-checkin/post-2.jpg, u02-checkin/post-3.jpg, u02-checkin/post-3.jpg |
| u03-mina | 7 | 0 | u03-mina/pre-1.jpg, u03-mina/pre-2.jpg, u03-mina/pre-3.jpg, u03-mina/pre-4.jpg, u03-mina/post-1.jpg, u03-mina/post-2.jpg, u03-mina/post-3.jpg |

- IMG_MATCH 문항 10개(`stimulus.image_url: ""`)는 아직 어느 에피소드도 이미지가 없다. 경로 규약 제안: `images/<episode_id>/item-<item.id>.jpg`(예: `images/u02-checkin/item-S1-09.jpg`).
  ⟨2026-10-13 — 3d-1⟩ **앱은 그림 주소가 빈 `IMG_MATCH`를 건너뛴다** — 이 10문항은 지금 레슨에 서지 않는다. 그림을 버킷에 올리고 `stimulus.image_url`을 채우면(컷과 같은 상대 경로 규약) **앱 변경 없이** 그 문항이 선다. 비율은 가로 4 : 세로 3(Q30), 대체 텍스트는 정답 보기의 `en`(Q23), 「봉투」 그림은 뜻부터 정한다(Q27).
- **크기**: 941 × 1672 · 평균 440 KB는 번들에 실을 수 없다(현재 `static/image` 8.3 MB / 상한 11.5 MB — 에피소드 셋이면 약 +11 MB). 번들 내장분은 **긴 변 1,200 px · JPEG 품질 80 · 장당 ≤ 180 KB**를 목표로 다시 내보내고, 원본은 서버(3단계 원격 소스)에 둔다. 어느 쪽이든 경로 규약은 같다 → 결정 D-IMG.
- 대체 텍스트(Q23)는 아직 없다. 수령본 7장의 `image_brief`를 alt 초안으로 쓸 수 있는지는 Q23 답에 달렸다.
- ⟨2026-10-12 — 3b-2⟩ 위 표의 u01 행은 처음에 「수령 0」으로 머리 문장(7장 수령)과 어긋나 있었다 — 고쳤다. **D-IMG 결정**: 3b-2는 컷 그림을 번들에 싣지 않고 버킷에서 받는다(`static/image` 변화 0 — [ADR-0056](../adr/0056-episode-content-delivery.md) 「적용 기록」). 컷 화면은 alt를 비우고(장식) 대사 · 지문 텍스트가 장면을 전한다.

## 부록 E. 음성 정보 파일 (`audio/manifest.json`, `audio-manifest-1` — 2026-10-19)

카탈로그 컷의 대사 타자기가 음성 길이에 맞춰 쓰도록, 음성 id마다 길이를 적은 **에피소드 JSON 밖의 파일 하나**다. 결정은 [ADR-0074](../adr/0074-voice-synced-typing.md)가 진다.
**정본은 콘텐츠 납품 쪽에 보낸 요청문**(2026-10-19, 「음성 정보 파일 만들기 · 갱신하기」)이고 아래는 그 요약이다 — 둘이 다르면 요청문을 따르고 이 부록을 고친다.

### 위치 · 형식

| 항목 | 값 |
|---|---|
| 버킷 · 경로 | `content` / `audio/manifest.json` — 음성 파일(`audio/<id>.m4a`)과 같은 폴더의 맨 위 |
| 인코딩 | UTF-8 JSON(BOM 없음), 업로드 Content-Type `application/json`, `cacheControl`은 짧게(예 60초 — 기본 1시간이면 갱신이 그만큼 늦게 닿는다) |
| 없을 때 | 버킷은 **HTTP 400**(본문 `"statusCode":"404"`, `NoSuchKey`)을 낸다. 앱은 400 · 403 · 404 · 410을 「없음」으로 보고 모든 컷을 기본 속도(35ms)로 쓴다 |

```json
{
  "schema": "audio-manifest-1",
  "generated_at": "2026-10-19T08:41:18Z",
  "audio": {
    "u01-water/pre-3": { "duration_ms": 2299, "speech_end_ms": 1763 },
    "u02-checkin/pre-1": { "duration_ms": 2027, "speech_end_ms": 2027 }
  }
}
```

| 키 | 필수 | 규칙 | 앱이 틀린 값을 만나면 |
|---|---|---|---|
| `schema` | 필수 | 정확히 `"audio-manifest-1"` | 파일 전체를 쓰지 않는다(다른 판 이름도) |
| `generated_at` | 필수 | 만든 시각, ISO 8601 UTC | 읽지 않는다 — 사람이 판을 구별하는 값 |
| `audio` | 필수 | 객체. 키 = 음성 id, 값 = 길이 | 객체가 아니면 파일 전체를 쓰지 않는다 |
| `duration_ms` | 필수 | 파일 전체 길이, 1 이상의 정수 ms | 그 항목만 버린다 → 그 컷은 35ms |
| `speech_end_ms` | 선택 | 말소리가 끝나는 때(끝까지 이어지는 무음의 시작), 1 이상의 정수 ms, `duration_ms` 이하. 끝 무음이 없으면 `duration_ms`와 같은 값 | 정수가 아니면 그 항목만 버린다. `duration_ms`보다 크면 `duration_ms`를 쓴다 |

- 앱은 `speech_end_ms`가 있으면 그것에, 없으면 `duration_ms`에 글 끝을 맞춘다. 글자 간격 = 맞출 길이 ÷ 대사(`ko`) 글자 수를 [35, 300] ms로 묶은 값이다. 끝 무음을 어떻게 다룰지는 기기에서 본 뒤 정한다 — 그 전까지 납품 쪽은 **둘 다** 넣는다.
- 모르는 키는 무시한다. 키 이름 · 단위를 바꾸려면 `schema`를 올리고 앱 쪽과 먼저 맞춘다(옛 앱은 새 판을 통째로 쓰지 않는다).

### 키(음성 id) 규칙

- 키는 에피소드 JSON의 `audio_url` 값과 **글자 하나까지 같다**(`audio_url: "u01-water/d-01"` → 파일 `audio/u01-water/d-01.m4a` → 키 `"u01-water/d-01"`). `audio/` 접두사 · `.m4a` · 대문자 · 공백 · `.`을 넣지 않는다 — 콘텐츠 id 규약(§9 · [ADR-0060](../adr/0060-episode-voice-remote-audio.md) D2)과 같고, 어긋나면 앱이 그 항목을 버린다.
- 버킷에 **올라가 있는 음성 파일 하나당 항목 하나**. 파일이 없는 id(녹음하지 않은 줄)는 넣지 않는다. 같은 id가 두 번 나오지 않게 하고, id 오름차순을 권한다.

### 측정 방법

입력은 **버킷에 올리는 바로 그 m4a**다.

1. `duration_ms` — `ffprobe -v error -show_entries format=duration -of csv=p=0 <파일>`의 초를 ms로 반올림.
2. `speech_end_ms` — `ffmpeg -i <파일> -af silencedetect=noise=-40dB:d=0.1 -f null -`에서 **파일 끝까지 이어지는 마지막 무음의 시작**을 ms로 반올림(마지막 `silence_start` 뒤에 `silence_end`가 없거나 그 끝이 파일 길이 ±0.01초). 가운데 쉼은 쓰지 않는다. 그런 무음이 없으면 `duration_ms`와 같다.
3. 요청문에 생성 스크립트 예시가 있다. 결과가 위 정의와 같으면 어떤 도구를 써도 된다(확인 값: `u01-water/pre-3` → 2299 · 1763, `u03-mina/pre-2` → 4894 · 4894).

### 갱신 규칙

| 일 | 정보 파일 |
|---|---|
| 음성을 새로 올림 | 그 id 항목을 더해 다시 만든다 |
| 같은 id의 음성을 다시 녹음 · 교체 | 그 id를 **다시 잰다** — 파일만 바꾸면 글과 소리가 어긋나고 앱은 그것을 알 수 없다. ⟨2026-10-20⟩ 이미 올라간 에피소드의 음성이면 같은 id로 덮어쓰지 말고 **새 id**로 올린다(§13 규칙 1) — 그때는 아래 「`audio_url`만 바뀜」 줄과 같다 |
| 음성을 내림 | 그 id 항목을 뺀다 |
| `audio_url`만 바뀜(같은 파일을 다른 id로) | 새 id로 항목을 옮긴다 |
| 대사(`ko`)만 바뀜 | 다시 만들 필요 없다 — 앱이 글자 수를 센다 |

- **순서**: 올릴 때는 음성 → 정보 파일, 내릴 때는 정보 파일 → 음성. 에피소드를 고칠 때 이 파일이 끼는 자리(파일 → 이 파일 → 에피소드 JSON → `manifest.json` 마지막)와 `cacheControl`은 §13. 매번 **전체를 다시 만들어** 덮어쓰고 `generated_at`도 새로 쓴다.
- 앱은 실행 시작 · 연결 복귀 · 포그라운드 복귀마다 이 파일을 다시 받고 원문이 같으면 아무것도 하지 않는다. **깨진 파일**(JSON 오류 · `schema` 다름)을 올리면 기기는 전에 받아 둔 정보를 계속 쓰고, 파일을 **지우면** 기기도 기본 속도로 돌아간다.
- 올리기 전 검사: JSON 문법 · `schema` · 항목 수 = 버킷 `audio/` 아래 m4a 수 · 모든 키가 어느 에피소드 JSON의 `audio_url`과 같음 · 모든 값이 1 이상의 정수이고 `speech_end_ms ≤ duration_ms` · 단위가 ms · 올린 뒤 공개 주소로 받아 200과 같은 내용.

### 지금의 판 ⟨2026-10-19⟩

- 앱 쪽이 지금 음성 **16개**(u01 6 · u02 4 · u03 6)를 위 방법으로 재 만들어 두었다(`generated_at` 2026-10-19T08:41:18Z). 2026-10-19 사용자가 이 판을 버킷에 올렸다(공개 주소 200).
- 앞 무음은 모두 0, 끝 무음은 u01 · u02 0.16 ~ 0.54초(u01 `pre-3`이 가장 긴 0.54초), u02 `pre-1`과 u03 6개는 0이다.
  컷 대사 글자당 간격은 `speech_end_ms` 기준 110 ~ 274 ms, `duration_ms` 기준 136 ~ 328 ms다(파일 길이만 쓰면 u01 `pre-3` 하나가 상한 300에 걸린다).
- **부록 C 업로드 현황과 다른 점**: 내장 본문이 참조하는 음성 id 13개 가운데 **`u03-mina/d-01`(대화 seq 1 · 표지 컷 pre-4가 다시 씀)은 버킷이 400**이다 — 부록 C의 ⟨2026-10-14⟩ 표는 이 파일을 「올라감」으로 적었지만 지금은 없다(녹음 없음 — [ADR-0071](../adr/0071-episode-background-download.md) D3의 「400」 관찰 · [백그라운드 받기 e2e](../e2e/episode-background-download.md) 실행 기록과 같다).
  그래서 정보 파일에도 그 항목이 없고 그 줄은 소리 없이 35ms다. 정보 파일의 u03 `d-03` · `d-09` · `d-11` · `post-1`은 지금 내장 본문이 쓰지 않는 id다 — 앱은 쓰이지 않는 키를 무시한다.
