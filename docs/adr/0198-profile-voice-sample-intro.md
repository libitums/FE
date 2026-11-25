# ADR-0198 — 프로필 시트에 인물 목소리 견본을 넣고, 첫 말 칸을 견본 대본으로 바꾼다

- 상태: **채택 — 사용자 지시 2026-11-25**(「아바타 클릭할 때 바텀시트 뜨는 화면에 음성 프로필도 추가했는데 반영해줘」). 아래 「앱으로 만들 때의
  범위」 그대로 앱에 만들었다(브랜치 `feat/profile-voice-sample`, 아래 「적용 기록」). 음성 파일 아홉 개는 운영 `content` 버킷. 정본 데이터는
  [`docs/content/companion-voice-intros.json`](../content/companion-voice-intros.json).
- 날짜: 2026-11-25. 브랜치 `hyesungKomet/profile-voice-proposal`.
- **사용자 결정**(2026-11-20 ~ 25, 대화로): 프로필에 인물 목소리 견본을 넣는다 · 견본은 짧게(한 줄 30자 이내) · ㅋㅋ · ㅎㅎ 같은 웃음을 섞는다 ·
  인물마다 대본과 음성 판을 직접 듣고 골랐다 · 「아래의 녹음 없을 때도 있던 소개글을 빼고 그 자리를 우리 소개글로 대체」 · 뜻은 여덟 화면
  언어 모두 · 로마자도 넣는다. 앱 화면은 Android 에뮬레이터에서 시제품으로 만들어 봤으나 **되돌리고 이 제안서로 올린다**(main의 로마자
  스위치 · 화면 언어 변경과 맞춰 다시 만들기 위해).
- 이어받는 결정: [ADR-0162](0162-suggested-friends.md)(추천 친구 · 프로필 시트) · [ADR-0164](0164-companion-friends-pooled-trial-open-tier.md)
  (추천 친구 넷 · 인물 칸) · [ADR-0188](0188-dialogue-romanization.md)(로마자 스위치 하나 · 대화 말풍선 로마자) · [ADR-0185](0185-ui-traditional-chinese-taiwan.md)
  (화면 언어 여덟) · [ADR-0158](0158-story-translations-thai-burmese.md)(th · my) · [ADR-0152](0152-companion-romance-refusal-charge-unlock-message.md)(첫 말 저장) ·
  [ADR-0017](0017-host-native-capabilities-and-audio.md)(호스트 오디오 재생) · [ADR-0029](0029-product-analytics-posthog.md)(이벤트).

## 왜

프로필 시트는 인물을 글과 그림으로만 보여 준다. 대화를 시작하기 전에 그 인물이 **어떤 목소리 · 어떤 말투인지** 들을 수 없다. 인물마다
목소리를 이미 골라 두었고(추천 친구 넷은 인물 스튜디오 2026-11-19, 이야기 다섯은 에피소드 목소리), 대화방 음성 메시지도 그 목소리로
나온다. 시트에서 짧게 들려주면 「누구와 이야기할지」 고르는 순간에 인물이 살아난다.

지금 시트의 첫 말 칸(주황 면)은 대화방 첫 메시지를 미리 보여 준다. 견본을 넣으면서 대본 말풍선을 따로 세웠더니 인사가 두 번 서고
시트가 길어졌다(시제품에서 확인). 그래서 **첫 말 칸을 견본 대본으로 바꾸는** 쪽을 제안한다.

## 지금(main, 5ca9241a)

`SuggestedFriendSheet` 순서: 아바타 · 이름 → 소개 → 태그(직업 · 나이 · MBTI) → **첫 말 칸**(`sheetOpening` — 한글 + 화면 언어 뜻 한 줄,
로마자 없음) → AI 고지 → 단추. 목소리는 없다. 인물 칸(`FriendProfile`)에 음성 경로가 없다.

## 제안

### D1. 파일과 정본 — 인물마다 음성 한 개 + 대본 한 개

| 무엇 | 어디 |
|---|---|
| 음성 | 운영 `content` 버킷 `audio/companion/<id>-intro.mp3` — 앱 경로 `content/audio/companion/<id>-intro.mp3`(아바타 `content/images/profiles/…`와 같은 해석기) |
| 대본 · 로마자 · 뜻 · 음성 제작 기록 | [`docs/content/companion-voice-intros.json`](../content/companion-voice-intros.json) — 이 파일이 정본. 앱 표는 여기서 옮긴다(추천 친구 정본 `companion-friends.json`과 같은 방식) |

| 인물 | 대본(화면) | 길이 | 모델 |
|---|---|---|---|
| 차서연 | 차서연이에요. 제 그림 보고 싶어요? 비싸요 ㅋㅋ | 5.3초 | eleven_v4 |
| 권해준 | 권해준이에요. 마, 밥 묵었나? ㅎㅎ 부산말이에요 | 5.1초 | eleven_v4 |
| 송다은 | 송다은이에요! 외국인 친구 처음이에요 ㅎㅎ 대박! | 5.1초 | eleven_v4 |
| 임건우 | 임건우예요! 오늘 10킬로 뛰었어요 ㅋㅋ 힘들다~ | 4.8초 | eleven_v4 |
| 덕수쌤 | 덕수쌤이에요! 제 머리요? 공부를 너무 해서요 하하하 | 5.3초 | eleven_v4 |
| 정윤경 | 어서 와요, 정윤경이에요 호호. 밥은 먹었어요? | 4.6초 | eleven_v4 |
| 미나 | 안녕! 아니, 안녕하세요! 미나예요 ㅎㅎ | 5.9초 | eleven_v3 |
| 한도윤 | 도윤이에요! 사실 저 연습생이에요. 쉿! ㅎㅎ | 4.1초 | eleven_v3 |
| 서재민 | 서재민입니다. 오늘 저녁… 시간 있어요? 흠흠 | 6.0초 | eleven_v3 |

- 목소리: 추천 친구 넷은 운영 인물 설정의 `media.voiceId`(인물 스튜디오에서 고른 판), 이야기 다섯은 `duru-curation/audio/story/characters.yaml`의
  `voice_id`. 둘 다 대화방 음성과 같은 목소리다.
- 웃음: 화면 대본은 ㅋㅋ · ㅎㅎ · 하하하 · 호호 · 흠흠 그대로, 음성은 연기 지시(`[chuckles]` · `[giggles]` · `[laughs]` · `[warm chuckle]` ·
  `[clears throat]`)로 바꿔 만들었다 — TTS가 「ㅋㅋ」를 글자 이름으로 읽기 때문이다. 해준은 `[strong Busan dialect]`로 사투리 억양을 준다.
  실제 TTS 입력 · 설정은 정본 파일의 `audio.ttsText` · `voiceSettings`.
- 모델이 둘인 까닭: 인물마다 v3 · v4 판을 들어 보고 사용자가 골랐다. 대화방 음성 메시지는 eleven_v3라 v4 견본과 결이 조금 다를 수 있다.

### D2. 시트 배치 — 단추는 본문 첫 줄, 첫 말 칸은 견본 대본

```
아바타 · 이름 → 소개
[▶ Hear voice]                       ← 새 단추(본문 첫 줄)
태그
┌ 첫 말 칸(주황 면) ───────────────┐
│ 차서연이에요. 제 그림 보고 싶어요? 비싸요 ㅋㅋ │  ← 견본 대본(첫 말 대신)
│ chaseoyeonieyo. je geurim bogo …      │  ← 로마자(스위치 켬일 때)
│ ─────────────                          │
│ I'm Cha Seoyeon. Want to see …        │  ← 화면 언어 뜻
└────────────────────────────────┘
AI 고지 → 단추
```

- **단추**: `Hear voice` ↔ `Pause` · `Resume`. 저절로 틀지 않는다. 시트가 닫히면 멈추고, 다른 소리가 시작되면 처음으로 돌아간다. 못 읽으면
  단추 아래 조용한 한 줄(「Voice sample unavailable」). 서버 호출 · 엽전 없음. 재생은 대화방 음성과 같은 호스트 오디오 모듈(ADR-0017).
- **첫 말 칸**: 견본 대본이 있으면 첫 말 대신 대본이 선다 — 들리는 말과 보이는 말이 하나다. 대본이 없는 인물만 지금처럼 첫 말.
  잃는 것은 「대화가 이 말로 시작한다」는 미리보기뿐이고, 첫 말은 방을 열면 첫 메시지로 그대로 온다(ADR-0152).
- **로마자는 스위치를 따른다**(ADR-0188 D1의 막간 메신저 말풍선과 같은 갈래): 켬이면 ChatBubble `annotation`(로마자 · 구분선 · 뜻), 끔이면
  뜻 한 줄(`translation`). 로마자 원천은 정본의 `roman`(손으로 적은 콘텐츠 로마자) — 변환 함수(`romanizeKorean`)는 쓰지 않는다.
- **새 친구 시트(`NewFriendSheet`)는 그대로** 첫 말이다(해금 직후 「방금 이런 말을 보냈다」가 그 시트의 뜻이다).
- 잠긴 인물(만날 회차 안내 시트)에는 단추 · 대본 모두 없다(새로 드러나는 것 없음).

### D3. 뜻은 여덟 화면 언어

정본에 en · es · id · ja · vi · th · my · zh-TW가 모두 있다. th · my · zh-TW의 인물 이름은 기존 인물 표처럼 로마자(예: 「我是 Cha Seoyeon。」),
ja는 가타카나. 인물 칸 `LocalizedLine`(main은 th · my · zh-TW 칸이 있다)에 그대로 들어간다. **원어민 검수 전**이다.

### D4. 이벤트 — `friend_voice_sample_played { characterId }`

새로 틀 때만(이어 듣기 · 다시 듣기 제외) PostHog로 한 번. Airbridge에는 보내지 않는다. 받아들이면 ADR-0029에 적는다.

## 시제품에서 확인한 것 · 못 한 것

- **확인**(Android 에뮬레이터, 이전 브랜치 `hyesungKomet/profile-voice`의 되돌린 시제품): 첫 말 칸을 대본으로 바꾼 시트가 스크롤 없이 한 화면에
  선다(Medium Phone, 영어 · 태국어). 단추를 누르면 버킷 파일이 재생되고 4 ~ 6초 뒤 `Hear voice`로 돌아온다. 이야기 인물(덕수쌤)도 대화방 머리에서
  연 시트에서 같다. 아홉 파일 모두 공개 주소 200.
- **못 함**: iOS 호스트에서의 재생 · 배치, 로마자 스위치 끔, ja · zh-TW 등 다른 화면 언어, 큰 글자. 시제품에서 첫 탭이 바로 일시정지로 바뀐 일이
  두 번 있었다(자동 탭 탓인지 이중 탭인지 못 가림) — 앱으로 만들 때 확인한다.

## 앱으로 만들 때의 범위(받아들이면)

- 인물 칸에 `voiceSamplePath` · `voiceSampleScript`(정본에서 옮김) — 추천 친구 넷 · 이야기 다섯 모두.
- `SuggestedFriendSheet`: 단추 컴포넌트 · 첫 말 칸 분기 · 스위치 값(`choiceRomanizationOf`)을 결선에서 받기.
- ui-copy 여덟 언어: 단추 셋(Hear voice · Pause · Resume) · 낭독 이름 · unavailable 한 줄.
- 테스트(unit: 정본과 앱 표 일치 · 여덟 언어 비지 않음 / ui: 단추 상태 · 첫 말 칸 분기 · 스위치 / integration: 시트 열기) · e2e 문서
  (`docs/e2e/suggested-friends.md`) · 성능 보고서 · ADR-0029.
- 대화방 머리 이름을 눌러 같은 시트를 읽기 전용으로 여는 것(이전 시도 5ec1a57d에 있었다)은 **이 제안에 넣지 않는다** — 따로 정한다.

## 적용 기록 ⟨2026-11-25, `feat/profile-voice-sample`⟩

결정을 바꾸지 않는다. 만든 모양과 스스로 정한 기본값:

- **D1 인물 칸** — `FriendProfile.voiceSamplePath` · `voiceSampleScript`(선택 칸). 표는 `companion-voice-samples.ts`(정본에서 옮김, 단위 테스트 VS1이
  id · 경로 · 한글 · 로마자 · 여덟 언어 뜻을 맞춤)이고 추천 친구 넷 · 이야기 다섯 칸에 얹는다. 한글 대본은 학습 내용 허용 선언에 더했다.
- **D2 단추** — `ProfileVoiceButton`: 본문 첫 줄(태그 위) 가운데 outline 단추, 재생 중 일시정지 아이콘. 재생은 `lib/audio.ts`(호스트
  `AudioPlaybackModule`, 1.0배 — 대화방 음성의 0.85배는 쓰지 않음: 견본은 고른 그대로 들려 준다). 주소는 목록 결선이 아바타와 같은 해석기
  (`episodeContent.imageUrlOf` — 받아 둔 파일 → 원격 버킷)로 풀어 시트에 넘긴다. 못 틀면(주소 없음 · 모듈 없음) 단추는 Hear voice로 남고 아래
  「Voice sample unavailable」. 시트가 닫히면(언마운트) 재생 중 · 멈춰 둠일 때만 `stopAudio`.
- **연타 막기** — 받아들인 누름 뒤 400 ms 안의 누름은 버린다(`VOICE_TAP_GUARD_MS`). 시제품의 「첫 탭이 바로 일시정지」는 한 번 누름이 두 번
  들어온 것으로 보고 막았다 — 단추는 바깥 view 하나만 `bindtap`을 가진다(안쪽 Button은 탭 처리 없음).
- **「다른 소리가 시작되면 처음으로」** — 시트가 화면을 덮어 시트 밖에서 소리가 시작될 길이 없다. 재생 모듈에 상태 조회가 없어(ADR-0017 D3) 더
  넓히지 않았다. 대신 다시 틀면 늘 처음부터(`play`)다.
- **첫 말 칸** — 대본이 있으면 대본 + (스위치 켬) 정본 로마자 · 구분선 · 뜻 / (끔) 뜻 한 줄(`bubbleLinesOf`에 정본 `roman`을 줘 변환 함수를 타지
  않음). 대본이 없는 인물은 지금처럼 첫 말 + 뜻 한 줄(스위치와 무관). 스위치 값은 목록 결선이 `more.romanization`으로 넘긴다.
- **시트 props** — `SuggestedFriendSheetProps`에 선택 칸 `voiceSampleUrl` · `romanization`(생략하면 null · hidden)이 더해졌다. `model` 모양은 그대로.
  `SuggestedFriendsPort`에 선택 칸 `voiceSampleUrl(path)` · `romanization()`.
- **D4 이벤트** — `friend_voice_sample_played { characterId }`: 시트가 설 때마다 처음 재생이 시작된 한 번(이어 듣기 · 끝난 뒤 다시 듣기 · 못 틈은
  내지 않음). PostHog만. ADR-0029에 적었다.
- 문구(여덟 언어): `Hear voice` · `Pause` · `Resume` · 낭독 이름(`Hear <이름>'s voice` 등 자리마다) · `Voice sample unavailable`. 원어민 검수 전.

## 버린 대안

- **단추 아래 대본 말풍선을 따로**: 시제품 첫 판. 첫 말과 인사가 겹치고(서연 「안녕하세요, 차서연이에요…」가 두 번), 긴 대본이면 시트의 40%를 차지해
  첫 말 칸이 단추 뒤로 밀렸다.
- **대본을 접어 두기(Show script 토글)**: 높이는 줄지만 한 번 더 눌러야 읽힌다. 대본이 30자로 짧아져 필요가 줄었다.
- **긴 견본(16 ~ 19초)**: 인물 스튜디오에서 목소리를 고를 때 쓴 시험 문장 그대로였다. 「너무 길다」(사용자)로 30자 한 줄로 다시 만들었다.

## 열린 질문

1. 견본 v4 · 대화 음성 v3의 결 차이를 둘지, 대화 음성도 v4로 옮길지.
2. 첫 말 미리보기를 잃는 것이 괜찮은지(제안은 「괜찮다」).
3. 대본 · 음성을 바꾸는 절차를 어디에 둘지(지금은 TTS 입력 · 설정을 정본 파일에 적고 사람이 다시 만들어 버킷에 덮어쓴다).
