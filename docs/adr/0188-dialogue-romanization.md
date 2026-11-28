# ADR-0188 — 이야기 대화 · 레슨 문장에 로마자 줄을 세우고, 설정의 로마자 스위치 하나로 켜고 끈다

- 상태: **채택 — 클라이언트 쪽, PR(머지 전).** 서버 · 콘텐츠 형식 · 새 분석 이벤트 · 새 토큰 0. 세션 옵션 키 · 저장 키 · 기본값 그대로.
  ui-lynx 변경은 `VisualNovelDialog` 하나(FE 확장 `romanization`)다.
- 날짜: 2026-11-24. 브랜치 `feat/dialogue-romanization`.
- **개정 D7(2026-11-24, 브랜치 `feat/dialog-romanization-switch`)**: 대사 상자 이름 줄 오른쪽에 로마자 스위치 · 줄 순서 「한국어 → 로마자 →
  구분선 → 영어」 · 컷의 숨은 영어 ↔ 로마자 토글 폐지 · 다시 듣기 스피커를 대사 상자 색으로. 아래 「개정 D7」이 D1 표의 「이야기 컷 대사」 행과
  D2의 「대사 → 구분선 → 로마자 → 영어」 · 「끔이면 이 변경 전 그대로(영어, 누르면 로마자)」를 대체한다.
- **개정 D8(2026-11-26, 브랜치 `feat/chat-romanization-group`)**: 메신저 말풍선도 대사 상자(D7)와 같은 줄 순서 — 「[한국어 / 로마자] 묶음 →
  구분선 → 뜻」, 로마자가 없으면 「한국어 → 구분선 → 뜻」. 들어오는 말풍선의 로마자는 주황 글자(`fg.brand`), 구분선은 보이는 회색(`gray.500`).
  아래 「개정 D8」이 D3의 「끔 → 뜻 한 줄」(구분선 없는 번역 줄)과 내 말풍선 해석 펼침의 「구분선 → 로마자 → 뜻」을 대체한다.
- **사용자 결정**(2026-11-24, 「123 진행」 — 피드백 3번): 운영 `public.feedback` 튜토리얼 별점 의견에서 가장 많은 것이 「한글을 못 읽는다 ·
  대화문에 로마자가 없다」였다. 「이야기 대화(말풍선) · 레슨 문장에 로마자 줄을 보이게 하고 **같은 스위치로** 켜고 끈다. 기본값은 합리적으로
  정하고 ADR에 근거. 로마자 원천은 콘텐츠 로마자, 없으면 변환 함수 — 새로 만들면 규칙을 ADR에 적고 unit을 충분히.」
- 부분 대체: [ADR-0108](0108-choice-romanization.md) 「다루지 않는 것 — 제시문 · 카드 · 대화 버블의 로마자」. 스위치 이름 · 설명(D3)도 넓힌다.
- 이어받는 결정: [ADR-0084](0084-lesson-item-redesign.md) D19(로마자는 `Pronunciation: …`로 읽는다) · [ADR-0107](0107-app-body-font-duru-sans.md)
  (로마자 글꼴 Duru Roman) · [ADR-0088](0088-interlude-story-unit.md)(막간 이야기 컷 · 메신저 · 전화).

근거 표시: **[코드]** 저장소 코드(`apps/mobile/src/`) · **[데이터]** 내장 콘텐츠 u00 ~ u09 스캔 · **[실측]** 테스트 · 빌드 · **[사용자]** · **[추론]**.

## 맥락

1. 로마자 스위치는 세션 옵션 `show-choice-romanization` 하나다(ADR-0108, 기본 켬, 기기 저장). 닿는 곳은 보기 · 문장 조립 칩 · 조립 힌트 ·
   글자(Letters) · 기초부터 입장 화면이고, 제시문 · 대화에는 닿지 않았다 [코드].
2. 이야기 대화에는 로마자 줄이 없었다 [코드]:
   - 컷 화면(`CatalogCoverScreen` — 표지 · 막간 · 롤플레이 프롤로그 · 에필로그): 대사 아래 한 줄이 영어이고, 대사를 누르면 영어 ↔ 로마자를
     바꾼다. 누를 수 있다는 표시가 없어 한글을 못 읽는 사람이 찾지 못한다.
   - 막간 메신저: 말풍선 = 한글 + 영어, 답장 보기 = 한글 + 영어. 막간 전화: 대사 = 한글 + 영어.
3. 레슨 단어 선택 카드의 제시문 로마자는 스위치와 상관없이 늘 섰다 — 스위치를 꺼도 레슨 문장의 로마자는 남았다 [코드].
4. 내장 u00 ~ u09의 대사 `line` 332 · `narration` 55 · `context` 642 · 보기 1,555 모두 `roman`이 있다(빈 값 0) [데이터]. 버킷 콘텐츠
   (수준 4 · 5)는 빈 값이 있을 수 있다(ADR-0108 맥락 3의 u03 버킷 빈칸 타일 21개). 앱의 로마자 변환 함수는 테스트 전용(나라 이름 낱말)뿐이었다.

## 결정

### D1. 스위치 하나가 「한국어를 읽는 법」 전부를 맡는다 — 보기 · 레슨 문장 · 이야기 대화

| 자리 | 켬 | 끔 |
|---|---|---|
| 보기 · 칩 · 힌트 · 글자 · 기초부터(ADR-0108) | 그대로 | 그대로 |
| 레슨 단어 선택 제시문(`WordChoicePresentation`) | 한글 → 로마자 → 구분선 → 뜻(지금과 같음) | 로마자 줄만 빠짐 |
| 레슨 문화 확인 장면 말풍선(`CultureCheckScene`) | 로마자 · 구분선 · 뜻 묶음 | 뜻 한 줄 |
| 이야기 컷 대사(표지 · 막간 · 롤플레이 프롤로그 · 에필로그) | 대사 → 구분선 → 로마자 → 영어, 토글 없음 | 이 변경 전 그대로(영어, 누르면 로마자) |
| 막간 메신저 말풍선 | 로마자 · 구분선 · 뜻 묶음(ChatBubble annotation) | 뜻 한 줄(전과 같음) |
| 막간 메신저 답장 보기 | 한글 · 로마자 · 영어 | 한글 · 영어(전과 같음) |
| 막간 전화 대사 · 끝 지문 | 한글 → 로마자(기울임) → 영어 | 전과 같음 |

- 스위치가 하나인 이유: 사용자 결정(「같은 스위치로」). 또 「한글을 읽을 수 있는가」는 학습자 한 사람의 상태라, 보기는 켜고 대화는 끄는 조합을
  고를 이유가 약하다 [추론].
- 정답 공개 · 읽기 도움 자리는 스위치를 따르지 않고 지금처럼 늘 선다 — 듣기 대본(답한 뒤), 소리 내 읽기 · 말하기 힌트, 문장 조립 머리. 끄면
  풀 수 없거나 답을 확인할 수 없는 자리다.
- 범위 밖(후속): 최종 테스트(RP · 이야기 파이널) 상대 대사 · 롤플레이 말하기 화면 상대 대사 — 영어가 없으면 로마자로 떨어지는 줄이 이미 있고,
  답안 판과 높이를 다투는 화면이라 따로 본다. 화면 prop만 넘기면 되도록 `VisualNovelDialog`의 `romanization`을 공용으로 두었다.

### D2. 컷 대사 — 켜면 로마자 · 영어 두 줄이 함께 서고 숨은 토글이 사라진다

- `catalogCutLinesOf(text, script, display)` 한 함수가 정한다: 끔이면 `{ translation: 고른 글, toggle: 둘 다 있으면 }`(이 변경 전), 켬이면
  `{ romanization: 읽기, translation: 영어, toggle: false }`.
- 켬에서는 대사 상자가 버튼이 아니다(`accessibility-traits="text"`, 탭 무반응). 낭독은 `화자: 한글, Pronunciation: 로마자, 영어`.
- ui-lynx `VisualNovelDialog` FE 확장 `romanization?: string` — 번역 묶음 안 구분선 뒤 · 번역 앞 한 줄, 번역과 같은 크기 · 색(`gray-700`)에
  기울임 · medium. 묶음은 번역이나 로마자 중 하나라도 있으면 서고, 대사가 다 드러난 뒤(`ready`)에만 보인다. 빈 문자열 = 없음(번역과 달리
  던지지 않는다). 글꼴은 앱이 `app.css`의 로마자 글꼴 묶음에 클래스를 더해 Duru Roman으로 그린다(ADR-0108 D8과 같은 자리).

### D3. 메신저 · 전화 — 말풍선은 기존 annotation, 전화는 앱 줄 하나

- `bubbleLinesOf(line, display, pronunciation)`이 말풍선 아래 줄을 정한다: 켬 · 읽기 + 뜻 → annotation(로마자 · 구분선 · 뜻, 낭독
  `Pronunciation: …`), 켬 · 읽기만(뜻 없음) → **줄 없음**(번역 자리에 로마자를 두면 기울임 모양 · 낭독 접두가 어긋난다 — 독립 리뷰 W2,
  문화 확인 장면의 옛 원칙 「로마자 혼자는 싣지 않는다」와 같음), 끔 → 뜻 한 줄(없으면 없음). 문화 확인 장면도 같은 함수를 쓴다.
- 내 말풍선(주황 면)의 annotation 색은 `chat.css`가 흰 계열로 다시 칠한다(ui-lynx는 들어오는 말풍선 색만 정함).
- 전화 대사 · 끝 지문은 한글 아래 `story-call-line-roman`(영어 줄과 같은 크기 · 색, 기울임 · Duru Roman), 낭독 `Pronunciation: …`.
- 답장 보기: 공용 `ChatReplyOption`에 선택 prop `romanization?: { text, spoken }` — 첫 줄 아래 기울임 줄(`chat-reply-option-romanization`,
  Duru Roman), 낭독 `한글, Pronunciation: 로마자, 영어`(`storyReplyRomanizationOf`). prop이 없는 호출부(자유 대화 메신저)는 그대로다.
- 표시 모델(`StoryChatText` · `StoryCallText`)에 `roman?`(로마자 스크립트로 채움, 비면 키 없음)을 더했다.

### D4. 로마자 원천 — 콘텐츠 로마자, 없으면 앱의 변환 함수(국어의 로마자 표기법 + 표준 발음 일부)

- `readingOf(ko, roman)`: 콘텐츠 `roman`을 trim해 비어 있지 않으면 그것, 아니면 한글을 변환한 읽기, 한글이 없으면 없음.
- 변환 `romanizeKorean(text)`(`lib/korean-romanize.ts`, 제품 코드) — 한글 음절이 이어진 덩어리(낱말)마다 바꾸고 그 밖의 글자(공백 · 문장부호 ·
  라틴 · 숫자 · 자모)는 그대로 둔다. 소문자. 소리 바뀜은 낱말 안에서만이다(띄어쓰기를 넘지 않음). 규칙:

| 규칙 | 내용 | 예 |
|---|---|---|
| R1 음절표 | 초성 · 중성 · 받침 대표음(k · n · t · l · m · p · ng) | 부엌 bueok · 닭 dak · 의자 uija |
| R2 연음 | 받침 + ㅇ → 받침이 다음 첫소리로(겹받침은 뒤 자음만, ㅎ은 소리 없음 — ㅀ은 ㄹ이 넘어가 r, ㅇ 받침은 그대로) | 한국어 hangugeo · 괜찮아요 gwaenchanayo · 싫어요 sireoyo · 중앙 jungang |
| R3 비음화 | k · t · p + ㄴ · ㅁ → ng · n · m | 먹는 meongneun · 감사합니다 gamsahamnida · 옛말 yenmal |
| R4 유음화 | ㄴ + ㄹ · ㄹ + ㄴ · ㄹ + ㄹ → ll | 신라 silla · 설날 seollal |
| R5 ㄹ의 비음화 | ㄴ · ㄹ 아닌 받침 + ㄹ → n | 종로 jongno · 대학로 daehangno · 음료수 eumnyosu |
| R6 거센소리 | ㅎ · ㄶ · ㅀ + ㄱ ㄷ ㅈ → k t ch, + ㅅ → ss / ㄱ ㄷ ㅂ ㅈ + ㅎ → k t p ch | 좋다 jota · 많다 manta · 좋습니다 josseumnida · 축축하다 chukchukada · 입학 ipak |
| R7 구개음화 | ㄷ · ㅌ + 이 → ji · chi, ㄷ + 히 → chi | 같이 gachi · 해돋이 haedoji · 닫히다 dachida |
| R8 된소리 | 적지 않는다 | 학교 hakgyo · 먹겠습니다 meokgetseumnida |

- 적지 않는 것: ㄴ 첨가(맨입 등), 사이시옷, 한자어 ㄹ 예외(의견란), 띄어쓰기를 넘는 소리 바뀜, 고유명사 대문자 · 붙임표.
- 체언 예외 — 표기법은 체언의 ㄱ · ㄷ · ㅂ + ㅎ을 밝혀 적는다(묵호 Mukho). 문장 모드는 품사를 모르므로 거센소리로 적고(용언이 대화에 훨씬
  많다 — 생각해요 saenggakaeyo), 나라 이름 표가 쓰는 낱말 모드 `romanizeHangul`은 R6 · R7 없이 밝혀 적는다(북한 bukhan). 둘은 한 구현을 공유한다
  (테스트 전용이던 함수를 제품으로 올리고 test-support는 다시 내보내기만 한다).
- **콘텐츠와의 대조 [실측]**: 내장 u00 ~ u09의 (한글, 로마자) 쌍 5,780개 중 낱말 수가 같은 쌍의 낱말 14,467개에서 14,329개 일치(99.0%).
  어긋남은 대개 콘텐츠 쪽이 표기법과 다르게 적은 곳이다(같이 gati · 따뜻한 ttatteuthan). unit KR13의 하한은 95%다.

### D5. 기본값은 지금처럼 「켬」(모든 학습자) — 저장값이 없으면 켬

- 근거:
  1. 피드백에서 가장 많은 의견이 「한글을 못 읽는다」다 [사용자]. 로마자가 없어서 생기는 손해(대화를 못 따라감 · 이탈)가 있어서 생기는 손해(화면이
     조금 길어짐)보다 크다 [추론].
  2. 스위치는 이미 기본 켬이고(ADR-0108 D3) 저장값은 「정확히 off일 때만 끔」이다. 기본을 「기초부터를 고른 사람만 켬」으로 바꾸면 「바로 입장」을
     고른 사람의 **보기 로마자가 말없이 꺼진다** — 한글을 못 읽어도 스토리부터 보고 싶어 「바로 입장」을 고를 수 있다 [추론].
  3. 입장 선택(ADR-0176)은 첫 실행 한 번이고 기기에 남지 않는다(진입 스택 route일 뿐) [코드]. 기존 사용자는 그 선택 기록이 없다.
- 한글을 읽는 사람은 설정 맨 위 Learning 묶음의 토글 하나로 끈다. 끈 값은 기기에 남는다(ADR-0108 D3 그대로).
- 버린 대안: 「기초부터 → 켬 · 바로 입장 → 끔」 — 위 2 · 3. 「기초부터 → 켬, 나머지는 대화만 끔」 — 스위치가 둘이 되어 사용자 결정(하나)과 어긋난다.

### D6. 설정 토글의 제목 · 설명을 넓힌다 — 여덟 화면 언어

| 언어 | 제목 | 설명 |
|---|---|---|
| en | Romanization | Show how Korean is read, in small text, in answers, lessons and stories. |
| vi | Phiên âm | Hiện cách đọc tiếng Hàn bằng chữ nhỏ ở đáp án, bài học và truyện. |
| id | Romanisasi | Tampilkan cara membaca bahasa Korea dalam teks kecil di jawaban, pelajaran, dan cerita. |
| es | Romanización | Muestra cómo se lee el coreano, en letra pequeña, en respuestas, lecciones e historias. |
| ja | ローマ字 | 韓国語の読み方を、選択肢・レッスン・ストーリーに小さく表示します。 |
| th | คำอ่าน | แสดงคำอ่านภาษาเกาหลีเป็นตัวเล็กในคำตอบ บทเรียน และเรื่องราว |
| my | အသံထွက် | ကိုရီးယားစာ ဖတ်ပုံကို အဖြေ၊ သင်ခန်းစာနှင့် ဇာတ်လမ်းများတွင် စာလုံးသေးဖြင့် ပြပါမယ်။ |
| zh-TW | 羅馬拼音 | 在答案、課程和故事中，以小字顯示韓文的讀法。 |

- 세션 옵션 키 · 저장 키(`libitum.session-option.show-choice-romanization`) · 이벤트(`session_option_changed`의 `option` 값)는 그대로다 —
  이름만 「choice」가 남는다(저장값 · 분석 기록을 바꾸지 않기 위해).

### 측정

새 이벤트 0. 스위치를 끄고 켜는 수는 기존 `session_option_changed`로 잰다.

### D7. 개정(2026-11-24) — 대사 상자 안 로마자 스위치 · 줄 순서 「한국어 → 로마자 → 구분선 → 영어」

- **사용자 결정**(2026-11-24 「진행」): 시안 `roman-toggle` 세 안 중 **B — 대사 상자 이름 줄 오른쪽 「Romanization」 스위치**(켬 · 끔 두 장이 정본).
- **자리**: `VisualNovelDialog` 이름 줄 오른쪽 끝. 화자가 없는 지문 · 내레이션 상자도 같은 자리(맨 위 줄 오른쪽 — `header-row`)에 선다. 대사가 타자기로
  쓰이는 중에도 보이고 누를 수 있다.
- **모양**: 글자 「Romanization」(설정 토글 제목 `settings.sessionOption["show-choice-romanization"]` 재사용 — 8개 언어 새 문구 0) + 트랙 40 × 24 ·
  손잡이 16. 켬 = 주황 트랙(brand.primary) · 흰 손잡이 · 글자 gray-600, 끔 = 회색 트랙(gray-800) · 옅은 손잡이(gray-600) · 글자 gray-700(대비 5.0:1).
  누르는 자리 높이 44 이상(스위치 줄이 44가 되는 만큼 상자 위 여백을 20 → 12로 줄임).
- **겹침 규칙**(긴 언어 · 큰 글자): 이름은 줄을 바꿔 들어가고 자르지 않는다. 스위치는 줄지 않되 글자가 상자 폭의 60 %를 넘으면 한 줄 말줄임이다
  (`max-width: 60%` · `text-maxline=1`). 가장 긴 글자는 es 「Romanización」 · id 「Romanisasi」, vi 「Phiên âm」 · my 「အသံထွက်」는 짧다.
- **값**: 설정의 로마자 스위치와 **같은 세션 옵션**(`show-choice-romanization`, 저장 키 그대로). 화면은 값을 들지 않고 누름만 올린다
  (`CatalogCoverScreen.onRomanizationChange` → `ScreenWiring.onDialogRomanizationChange` → `setSessionOption`). 그래서 다음 컷 · 다른 이야기 · 레슨 보기 ·
  설정 셀이 곧바로 같은 값이다.
- **이벤트**: 새 이벤트 0. 같은 `session_option_changed`에 `source: "dialog"`를 붙인다. 설정에서 바꾼 것은 키가 없다(이 개정 전 앱과 같은 모양 —
  없음 = 설정). 이벤트가 상태 · 저장보다 먼저 나간다(설정 토글과 같은 순서).
- **줄 순서**: 「한국어 → 로마자 → 구분선 → 영어」. 로마자는 한국어 바로 아래(간격 4, 로마자가 있으면 대사 칸 최소 높이 48을 푼다)이고, 구분선 아래는
  뜻만이다. 색은 따뜻한 살구색 — 시안 #D9A27E에 가장 가까운 기존 토큰 `brand.reward-disabled-text`(#D89A70, gray-950 위 대비 7.1:1, 새 토큰 0). 기울임 ·
  medium · 대사 본문 크기 그대로. 끄면 로마자 줄만 빠지고 나머지 위치는 그대로다. 영어가 없는 대사는 구분선도 없다(로마자만이면 구분선 없이 로마자 줄).
- **컷의 숨은 토글 폐지**: 끔에서 대사 상자를 누르면 영어 ↔ 로마자를 바꾸던 갈래(D2 「끔」)를 없앴다 — 같은 상자 안에 「Romanization」 스위치가
  서는데 상자 누름이 로마자를 구분선 아래(뜻 자리)로 내리면 스위치 상태와 화면이 어긋나고, 「구분선 아래는 뜻만」 규칙과도 어긋난다. 그 낭독 꼬리
  (`Show romanization` · `Show English`, 8개 언어 `catalogCover.toggleScript`)도 지웠다. 끔에서 영어가 없는 대사는 아래 줄이 없다(전에는 로마자가
  번역 자리로 내려왔다).
- **접근성 구조**: iOS에서 접근성 요소 안의 자손은 닿지 않으므로, 스위치가 있으면 `VisualNovelDialog` 루트는 요소가 아니고 상자 전체를 덮는 빈 낭독
  요소(`-reading`, text, 이름 = 화면이 준 낭독)가 글 층 아래에 깔린다. 화면에 선 글(화자 · 지문 · 대사 · 로마자 · 번역)은 각각 가린다. 스위치는
  `accessibility-role-description="switch"` · 이름 「Romanization, on/off」(설정 셀과 같은 방식). 스위치가 없으면 이 개정 전 구조 그대로다.
  컷 화면의 대사 칸(`catalog-cover-screen-line`)은 이제 접근성 요소가 아니다(배치만).
- **다시 듣기 스피커 색**(ADR-0189 D1 개정): 흰 원 → 대사 상자와 같은 면(gray-950) + 흰 아이콘(RoundButton `overlay`). 소리 없는 회색 단추는 같은 면에
  흐린 아이콘(gray-800, 비활성 불투명도 없이 — 면이 그림에 비치지 않게). 레슨 판정 줄 스피커는 그대로(밝은 면).
- **적용 화면**(로마자 줄을 그리는 `VisualNovelDialog` 전부): 컷 화면 `CatalogCoverScreen` 하나 — 표지 컷(prologue) · 통과 뒤 컷(epilogue) · 막간 이야기
  컷(interlude) · 롤플레이 미리보기 컷. 최종 테스트 · 롤플레이 말하기 화면의 `VisualNovelDialog`는 로마자를 쓰지 않아(D1 범위 밖) 스위치를 달지 않았다.
  문화 확인 장면 · 메신저 · 전화는 `VisualNovelDialog`가 아니라(말풍선 · 앱 줄) 이 개정의 스위치 · 순서와 무관하다 — 설정 스위치만 따른다.
- **버린 대안**:
  - **A — 다시 듣기 스피커 옆 「ga」 칩**(시안 추천안): 엄지 닿는 자리지만 「ga」가 무엇인지 글자로 말하지 않는다. 사용자가 B를 골랐다.
  - **C — 한국어 줄을 누르면 켜고 끔**: 단추가 없어 깔끔하지만 처음엔 모르고, 스크린리더 · 큰 글자에서 누를 곳이 덜 분명하다. 이 개정 전 숨은 토글과
    같은 약점이다.
- 확인: unit `VisualNovelDialog.unit` VND-S1 ~ S5 · VND-R2 · R3, `catalog-cover.romanization.unit` CC-R1 ~ R7, `settings.unit` SN10 / ui
  `VisualNovelDialog.header-switch.ui` HS1 ~ HS6 · `.romanization.ui` VNR-U1 ~ U3, `CatalogCoverScreen.romanization-switch.ui` RS1 ~ RS6 / integration
  `App.dialog-romanization-switch.integration` DS1 ~ DS3 / e2e [DR-E8 ~ DR-E12](../e2e/dialogue-romanization.md).

### D8. 개정(2026-11-26) — 메신저 말풍선: [한국어 / 로마자] 묶음 → 구분선 → 뜻, 로마자는 주황

- **사용자 말**(2026-11-26): 「채팅 내용도 로마니제이션이랑 한글 묶어서, 번역이랑은 구분선으로 나누고, 로마니제이션은 주황색 기반으로」. 바로 앞에
  본 것은 프로필 시트 첫 인사 말풍선이었다 — 로마자(회색 기울임)와 번역 사이 구분선(`gray.300`)이 `gray.100` 면에서 거의 보이지 않아(대비 약 1.1:1)
  한국어 · 로마자 · 번역이 구분 없이 이어져 보였다 [실측 · 코드].
- **줄 순서**(ui-lynx `ChatBubble` annotation): 한국어 → 로마자 → 구분선 → 뜻. 로마자는 한국어 바로 아래(말풍선 간격 2)라 둘이 한 덩어리이고,
  구분선 아래는 뜻만이다(D7 대사 상자와 같은 규칙). `annotation.romanization`을 선택으로 바꿔, 없거나 비면 한국어 → 구분선 → 뜻이다(전에는 던졌다).
  낭독은 `화자: 한국어, (Pronunciation: 로마자,) 뜻` 그대로.
- **로마자 표시 여부는 바꾸지 않았다.** 프로필 시트 · 새 친구 시트 첫 말 · 막간 메신저 · 문화 확인 장면은 지금처럼 설정 스위치(D1)를 따르고, 대화방
  상대 말풍선은 지금처럼 로마자가 없다(서버 메시지에 로마자가 없고 D1 표에 대화방 행이 없다). 내 말풍선의 해석 펼침은 지금처럼 「뜻」 단추를 누르면
  선다(서버 notes).
- **번역 줄 → 구분선 아래 뜻 줄**(앱 `ChatTextBubble`, 메신저 말풍선 공용): 로마자 묶음이 없고 번역이 있으면 `annotation: { meaning }`으로 넘겨
  한국어 → 구분선 → 뜻이다. 번역도 없으면(빈 문자열 포함) 구분선도 없다. 그래서 스위치를 켜든 끄든 구분선 아래 뜻 줄의 모양(body-s semi-bold)이 같다.
  ui-lynx `translation`(구분선 없는 회색 번역 줄)은 그대로 두었다 — 온보딩 카드 · 롤플레이 말하기 · 최종 테스트 · 문화 확인 장면(끔) 말풍선은 이
  개정의 범위 밖이라 전과 같다.
- **색**(새 토큰 0):

| 자리 | 토큰 | 면 | 대비 |
|---|---|---|---|
| 들어오는 말풍선 로마자 | `fg.brand` #B94208(= brand.primary-pressed 값) | `gray.100` #F7F8F9 | **5.14:1** (AA 4.5:1 통과) |
| 버린 후보 — `brand.reward-border` #C94B09 | | `gray.100` | 4.39:1 (미달) |
| 버린 후보 — `brand.primary` #F46B18 | | `gray.100` | 2.84:1 (미달) |
| 구분선(장식) | `gray.500` #D1D3D8(전 `gray.300` #EEEFF1) | `gray.100` | 1.4:1(전 1.1:1) — 글자가 아니라 AA 대상 아님 |
| 내 말풍선 로마자 · 구분선 · 뜻 | `gray.200` · `gray.200` · 흰색(그대로, `chat.css`) | `brand.primary` | 2.7:1 · — · 3.0:1(「대가」 2 그대로) |

  - `fg.brand`를 고른 이유: 주황 글자용 의미 토큰이 이것 하나이고(`fg.*`), 4.5:1을 넘는 주황 토큰이 이것뿐이다. 주황 면(내 말풍선)에서는 주황 글자가
    1.8:1로 사라지므로 흰 계열을 유지한다. 앱에 다크 모드가 없어(토큰 · CSS에 `prefers-color-scheme` 없음) 어두운 면 대비는 해당 없다.
  - 크기 · 기울임 · 굵기(body-m · italic · medium)와 글꼴(Duru Roman, `app.css`)은 그대로다.
- **내 말풍선 해석 펼침**(`MyMessage.MeaningLines` · 스켈레톤): 「구분선 → 로마자 → 뜻」을 「로마자 → 구분선 → 뜻」으로 — 한국어 바로 아래 로마자,
  구분선 아래 뜻. 스켈레톤도 같은 자리(로마자 막대 → 구분선 → 뜻 막대)라 도착할 때 줄이 자리를 바꾸지 않는다. 색은 그대로(흰 계열).
- **적용 자리**: 대화방 상대 텍스트 말풍선(`ChatMessageRows`) · 내 말풍선 해석 펼침(`MyMessage`) · 프로필 시트 첫 인사(`SuggestedFriendSheet`
  `suggested-sheet-opening`) · 새 친구 시트 첫 말(`NewFriendSheet`) · 막간 메신저 말풍선(`StoryMessengerScreen`, 양쪽) — 모두 `ChatTextBubble` 또는
  `MyMessage`. ui-lynx annotation 색 · 순서는 레슨 문화 확인 장면 말풍선(`CultureCheckScene`, 켬)에도 같이 닿는다.
- **대사 상자(D7)는 바꾸지 않았다** — 로마자가 이미 따뜻한 살구색 `brand.reward-disabled-text`(gray-950 면 위 7.1:1)로 주황 계열이고 순서도 같다.
  `fg.brand`는 그 면에서 약 3.1:1이라 그쪽에는 맞지 않는다.
- 확인: unit `ChatBubble.unit` CB3 · CB3b · CB8 / ui `ChatBubble.ui` CB5 ~ CB7 · `ChatMessageRow.lines.ui` CL1 ~ CL4 · `ChatMessageRow.ui` MC-UI3 ·
  `MyMessage.lines.ui` ML1 · ML2 · `SuggestedFriendSheet.voice.ui` PV-UI7 · `StoryMessengerScreen.romanization.ui` SMR-U3 / integration
  `App.dialogue-romanization.integration` DRI2.

### D9. 개정(2026-11-27) — 롤플레이 말하기 화면의 대사 상자도 스위치를 따른다

- 브랜치 `fix/roleplay-language`. D1 「범위 밖」의 롤플레이 말하기 상대 대사를 들였다.
- 상대 줄 · 맞힌 뒤 내 말풍선 · 상대 반응: 켬이면 「한국어 → 로마자 → 구분선 → 뜻」(D7과 같은 순서), 끔이면 로마자 줄이 없다. 전에는 뜻(영어 칸)이
  없으면 그 자리에 로마자가 섰다 — 스위치를 끈 사람에게도 로마자가 보였다. 이제 뜻이 없으면 아래 줄이 없다(`roleplayDialogLinesOf`).
- 「Show Korean」 힌트 · 오답 패널의 정답 문장 로마자는 D1의 「정답 공개 · 읽기 도움 자리는 늘 선다」를 따라 그대로 둔다. 오답 패널에는 정답 문장의
  뜻(앱 언어)을 로마자 아래 한 줄 더 둔다 — 전에는 한국어 · 로마자만 있어 무슨 말인지 알 수 없었다.
- 대사 상자 안 스위치(`headerSwitch`)는 두지 않는다 — 말하기 패널과 높이를 다투는 화면이고, 바로 앞 컷 화면 · 설정에서 바꾼다.
- 확인: unit `roleplay-panel` RP6 / ui `RoleplayTalkScreen.lines.ui` RT-L1 ~ RT-L4.

## 대가

1. **화면이 길어진다** — 컷 대사 · 말풍선 · 전화 대사가 한 줄씩(긴 문장은 두세 줄) 높아진다. 컷 대화 상자는 제 스크롤 안이라 잘리지 않고,
   메신저는 로그 스크롤, 전화는 가운데 무대가 늘어난다. 작은 화면 실측은 e2e [DR-E2](../e2e/dialogue-romanization.md).
2. **주황 면 위 대비가 AA(4.5:1)에 못 미친다** — 내 말풍선 · 답장 보기 면이 정본 brand.strong 대신 brand.primary인 기존 FE override라
   (chat-bubble.css 주석 「약 3:1」), 그 위 로마자(gray-200)는 약 2.7:1, 흰 뜻은 약 3.0:1이다(접근성 감사 Major 1). 원인은 면 색이라 글자 색으로는
   못 고친다 — 면 색 · 토큰 결정은 design 소유로 따로 한다.
3. **변환 읽기는 콘텐츠와 다를 수 있다** — 99.0%(D4). 콘텐츠에 로마자를 채우는 것이 정답이고, 변환은 빈 곳을 메우는 대체다.
4. **ui-lynx `VisualNovelDialog`에 FE 확장 하나** — design-system 보고 대상(ADR-0084 「미확인 · 후속」 5 목록에 더함). 개정 D7에서 둘째 확장
   `headerSwitch`(이름 줄 오른쪽 스위치)가 더해졌고 `romanization`의 자리가 번역 묶음 밖(대사 바로 아래)으로 옮겨졌다.
6. **(개정 D7) 스위치 줄이 44 높이라 상자가 조금 높아진다** — 위 여백을 12로 줄여 이름 한 줄 기준 약 8 늘어난다. 큰 글자에서는 스크롤이 받는다.
7. **(개정 D8) 로마자가 꺼진 메신저 말풍선도 구분선 한 줄(1 + 위아래 6)만큼 높아지고, 뜻 줄이 회색 보통 굵기에서 검정 semi-bold로 바뀐다** — 켬 · 끔의
   뜻 줄 모양을 하나로 맞춘 값이다. 메신저 밖의 `translation` 말풍선(온보딩 · 롤플레이 · 최종 테스트)과는 모양이 갈린다.

5. **컷 대사 스크롤이 버튼을 덮던 결함을 함께 고쳤다** — 대화창이 z-index를 가져 스크롤 경계 밖에 그려졌다. 로마자 줄이 더해진 긴 내레이션이
   iPhone SE에서 `Continue` 단추를 덮는 것을 기기(시뮬레이터)에서 봤고, 최종 테스트 `-line-scroll`과 같은 규칙(`overflow: hidden` +
   `z-index`)을 `.catalog-cover-screen-scroll`에 줬다. 또 SE에서 영어 줄 마지막 줄이 스크롤 아래로 반쯤 잘려 보여 스크롤 최대 높이를 40vh → 55vh로
   올렸다(위 빈 공간을 쓴다). 큰 글자에서 합이 화면을 넘을 때는 대화 열 → 대사 상자 → 스크롤이 줄고 버튼은 줄지 않는다
   (`flex-shrink` · `min-height: 0` 사슬, 재리뷰 W-1) — Android 글꼴 2배에서 버튼이 덮이지 않고 대사가 제 스크롤 안에 드는 것을 봤다.

## 재검토 조건

1. 작은 화면(13 mini · SE) 실측에서 컷 대화 상자가 그림을 거의 가리거나 전화 무대가 버튼을 밀면 — 켬에서 영어 줄을 접는 갈래를 본다.
2. 끈 사용자 비율(`session_option_changed`)이 크게 나오면 — 기본값을 입장 선택과 묶는 안을 다시 본다(D5 버린 대안).
3. 최종 테스트 화면에도 넣게 되면 — D1 범위 밖 항목. `romanization` prop만 넘기면 된다(롤플레이 말하기는 D9로 들였다).

## 미확인 · 후속

1. 기기 확인 — [e2e](../e2e/dialogue-romanization.md) DR-E1 ~ DR-E7. 2026-11-24 iOS 시뮬레이터(iPhone SE 3세대) 프로브로 일부 확인(실행 기록).
2. 최종 테스트 상대 대사(D1 범위 밖). 롤플레이 말하기는 D9.
3. 주황 면 대비(「대가」 2) — design.
4. design-system 보고 — `VisualNovelDialog` `romanization` · `headerSwitch`(개정 D7).
6. (개정 D7) 스토리북에 `headerSwitch` 예시가 없다 — 앱 화면 테스트 · 기기 확인으로만 본다.
5. 접근성 감사 Minor(코드 읽기 기준): 전화 대사 한 줄을 접근성 요소 하나로 묶기 · 전화 화면 큰 글자 스크롤 · 컷 대사 스크롤 표시 ·
   `VisualNovelDialog` 기본 낭독에 `spokenRomanization`(접두)과 쉼표 구분 · translucent 면 위 로마자 · 번역 색.
