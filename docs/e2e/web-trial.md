# 웹 체험판 `/try/` — 실기 소리 · 무음 스위치 · 마이크 · 인식 · 타일 대체 · 보조 기술 · 움직임 줄이기 · 꿈 전환 · 사전 등록 · 전체화면 · GA4

결정은 [ADR-0083](../adr/0083-web-trial-and-episode-core.md)이 진다. 무엇이 어떻게 생겼는지는 [랜딩 README](../../apps/landing/README.md) 「웹 체험판」.
이 흐름은 [README](README.md)의 공통 전제(자체 호스트 앱 · 로그인)와 **무관하다** — 브라우저에서 도는 정적 페이지다.

브라우저만 있으면 되는 것은 Playwright가 이미 본다(아래 「자동화된 것」). 이 문서는 **대역으로는 볼 수 없는 것**만 진다 —
실제 기기의 소리 출력 · iOS 무음 스위치 · 브라우저 마이크 권한 창 · 실제 음성 인식기(Web Speech) · VoiceOver · TalkBack 낭독 · 배포 뒤 GA4 수신.

⚠ **실기 회차는 아직 없다.** 2026-10-22에 시뮬레이터 · 에뮬레이터 · 데스크톱 Firefox로 1회차를 돌렸다(아래 「결과」) — 소리가 귀에 들리는가 · 실제 받아쓰기 · 무음 스위치 · 스크린리더 낭독 · GA4는 실기 전용으로 남았다.
⟨r2⟩ 1회차는 r1(Start 표지가 있던 판, `201f902d`)에서 돌렸다 — 표지 제거 · 꿈 전환 · Episode clear · 사전 등록 · 전체화면(EU9 ~ EU11)과 EU1 · EU8의 바뀐 관찰은 아직 한 번도 돌지 않았다.
⟨r3⟩ 발음 기준 채점 · 말하기 측정 · 인식 글자 수집(EU12)과 Episode clear 정정(배너 「What happens next?」 뒤 곧바로 완료 — 예고 장면 없음)도 아직 한 번도 돌지 않았다.

## 자동화된 것 (2026-10-22)

`pnpm test:e2e:landing`이 체험판 파일 열을 돈다(가짜 주소 `https://content.example.test` · 가짜 공개 키로 짓고, 음성 요청은 `page.route`가 작은 m4a나 404로, 사전 등록 `POST /rest/v1/pre_registrations`는 가짜 201 · 409 · 500 · 끊김으로 답하며, 말하기는 `addInitScript`의 가짜 `SpeechRecognition`이 정답 · 오답 · `not-allowed`를 준다).
a11y 재순환 뒤 전 프로젝트 272 통과 · 18 skip · 0 실패 → ⟨r2⟩ 315 통과 · 27 skip · 0 실패(실제 Supabase 요청 0).

| 파일 | 보는 것 | 여전히 사람이 하는 것 |
|---|---|---|
| `trial.e2e.ts` | 타일 경로 끝까지 · 가짜 인식 정답 → `Great` · 오답 → `Not quite` · `Try again` · `not-allowed` → 타일 · 랜딩 Hero · Download 링크 → `/try/` | 실제 인식기의 받아쓰기 품질 · 권한 창(EU2 · EU4 · EU5) |
| `trial-sound.e2e.ts` | 표지 없이 연 화면(컷 1)에서 **첫 탭 전** 음성 · 효과음 요청 0 · 첫 탭에 효과음 다섯 · 장면마다 그 주소 요청 · 404여도 다음 단계로 | 실제로 소리가 귀에 들리는가 · 무음 스위치(EU1 · EU3) |
| `trial-speech.e2e.ts` (r3) | 가짜 인식기로 띄어쓰기 · 발음이 다른 대안(lenient)도 · 앱 규칙 정답(strict)도 `Great` · 판정마다 `POST /rest/v1/trial_speech_samples` 1회(본문 열 아홉 · `apikey` · Authorization 없음 · 같은 session_id) · 500 · 끊김에도 진행 · 재전송 0 · 마이크 아래 안내 줄 · 타일 모드에서 숨음 | 실제 인식기의 받아쓰기와 기준(0.75 · 마디 0.5)이 맞는가 · 원격 표에 쌓이는가(EU12) |
| `trial-transition.e2e.ts` | 컷 사이 `data-transition="dream"` · 컷 5 → 6 `wake` · 전환 애니메이션이 실제로 돈다 · `reducedMotion: "reduce"`면 없음 | 구름빛 · 눈 뜨기가 실기 화면에서 어색하지 않은가(EU10) |
| `trial-prereg.e2e.ts` | 형식 오류 요청 0 · 201 / 409 → 완료 · 500 · 끊김 → 다시 시도 → 완료 · 몸(소문자 email · locale · source) · 머리(`apikey`, Authorization 없음) · 스토어 링크 0 | 원격 표에 실제로 쌓이는가(EU9 — 마이그레이션 적용 뒤) |
| `trial-fullscreen.e2e.ts` | 가짜 `requestFullscreen`으로 모바일(Pixel 7) 첫 탭 1회 · 데스크톱 0 · 함수 없음 오류 0 · 완료 · 나가기에서 해제 | 실제 Android Chrome에서 주소창이 숨는가 · iPhone은 그대로인가(EU11) |
| `trial-a11y.e2e.ts` | 키보드만(Tab · Enter · Space)으로 완료 · 사전 등록까지 · 단계 전환마다 초점이 제목 · 롤플레이 조작 뒤 초점 · Episode clear 배너 제목 → (r3) 곧바로 완료 제목 · 폼 오류 → 입력 · 완료 → 상태 글 · axe 위반 0(en · ko, clear · 폼 상태 포함) · `reducedMotion: "reduce"`에서 컷 글이 첫 프레임에 다 보임 | 스크린리더가 실제로 읽는 말 · 순서(EU7) |
| `trial-layout.e2e.ts` · `trial-reflow.e2e.ts` | 390 · 1440 폭 가로 넘침 0 · 버튼이 화면 안 · 낮은 화면(200% 확대)에서 조작이 닿음 | 실기 브라우저 바 · 홈 인디케이터와의 겹침 |
| `trial-contrast.e2e.ts` | 힌트 · 타일 모드 안내 줄 · (r3) 마이크 아래 수집 안내 줄의 그림 위 대비 ≥ 4.5:1(r2의 예고 대비는 장면이 없어져 뺐다) | — |
| `trial-analytics.e2e.ts` | `dataLayer`의 이벤트 이름 · 속성 · 한글 0 · 랜딩 링크 `trial_link_click` · 첫 탭 `trial_start` · `trial_preregister{status}`에 이메일 · `@` 없음 · (r3) 모든 trial 이벤트의 `browser`(desktop · android-chrome) · `trial_speech_attempt{turn,outcome,latency_bucket}` · `trial_exit{step}` | 실제 GA4 수신 · 실기 브라우저 분류(EU8) |

- **webkit은 Safari가 아니다.** 같은 엔진이지만 실기 Safari의 자동 재생 규칙 · `audioSession` · Web Speech 구현 · 무음 스위치와는 다르다. Playwright의 webkit · firefox에는 `SpeechRecognition`이 없어 가짜를 넣는다.
- 주 버튼 `.trial-button`(활성) · 놓인 타일 `.trial-tile[aria-pressed="true"]`의 흰 글자 / 주황 3.02:1은 승인 예외라 axe 대비에서 뺐다(ADR-0083 D11).

## 준비

- **주소는 `https`여야 한다.** 휴대폰에서 개발 서버를 LAN 주소(`http://192.168.…`)로 열면 보안 컨텍스트가 아니어서 마이크 · 음성 인식이 막힌다 — EU2 · EU4 · EU5가 판정되지 않는다. Vercel **프리뷰 배포**(PR마다 생기는 `https` 주소)를 쓴다.
- **프리뷰에 음성이 있어야 한다.** 랜딩 프로젝트의 Preview 환경에 `PUBLIC_SUPABASE_URL`이 없으면 프리뷰 빌드는 성공하되 **소리 없는 체험판**이 된다(프로덕션만 빌드 실패 — ADR-0083 D6). EU1 전에 값이 있는지 확인한다 — 페이지 소스의 `script#trial-model` JSON에 `…/storage/v1/object/public/content/audio/u00-tutorial/…m4a` 주소가 있으면 된다.
- **GA4는 프리뷰에 실리지 않는다**(ADR-0043 D12). EU8만 프로덕션 배포 뒤에 한다.
- 판정 수단: 귀 · 화면 녹화(소리 포함) · iOS는 Mac Safari 웹 속성(개발자용 → 기기 → 페이지)의 네트워크 · 콘솔, Android는 `chrome://inspect`. 선택자는 `data-testid`(아래 `[trial-…]`)다.
- 시작 상태: 새 탭에서 `/try/`(한국어는 `/ko/try/`). 마이크 권한을 다시 묻게 하려면 사이트 설정에서 권한을 지운다(iOS 설정 → Safari → 마이크, 또는 주소창 `가가` → 웹 사이트 설정 · Android Chrome 주소창 자물쇠 → 권한).

## 흐름

| id | 기기 · 조건 | 절차 | 관찰(통과 조건) | 상태 |
|---|---|---|---|---|
| EU1 | iPhone Safari 17+ **실기** · 무음 스위치 **끔** · 소리 크게 | `/try/`(r2: 표지 없이 컷 1 — 첫 `[trial-cuts-next]` 탭이 시작) → 컷 끝까지 `[trial-cuts-next]` → 단어 카드 `[trial-vocab-listen]` · `[trial-vocab-example-listen]` → 그림 고르기 · 대답 고르기에서 보기 하나씩 → 문화 카드 → 롤플레이 → 엔딩 → 완료 | **첫 탭 전에는 소리 · 음성 요청이 없다**(웹 속성 네트워크). ~~Start에 `button` 효과음~~(r2: 첫 탭은 무음 — 컷 넘김은 소리가 없다). 컷 5 · 6에서 음성(`pre-5-dream` · `d-01`), 단어 카드에서 `s1-01-word` · 예문 `d-02`, 고르기 자극 음성, 보기를 누르면 `correct_answer` / `wrong_answer`, 롤플레이 턴이 서면 상대 줄, 맞히면 내 줄, 롤플레이 → 엔딩에 `pass_lesson`(통과일 때), ⟨r2⟩ Episode clear 배너에 `lesson_complete`(r3: 배너 「What happens next?」 1.6초 뒤 곧바로 완료 화면 — 예고 장면 없음). 콘솔 오류 0 | **부분**(1회차 · iOS 26.5 시뮬레이터 Safari) — 흐름 끝까지 · 콘솔은 못 봄(웹 속성 없음). 요청은 서버 로그로 봄: Start 전 음성 · 효과음 요청 0, Start에 효과음 다섯 · `pre-5-dream` · `d-01` · `s1-01-word` · `d-02`를 한꺼번에 받고 이후 단계마다 `d-03` → `d-04~06` → `post-1 · 2`. 효과음은 Start에 미리 받아 두므로 `correct_answer` · `pass_lesson` 같은 장면별 재생은 요청으로 판정되지 않는다. 재생 중 다이내믹 아일랜드에 소리 표시가 선다. 귀로 들리는지는 실기 몫 |
| EU2 | EU1 기기 · **마이크 허용** | 롤플레이 1턴 `[trial-turn-speak]` `Speak` → 권한 창 **허용** → 정답 문장을 말함 → 세 턴 | 첫 Speak에서만 권한 창이 뜬다. 듣는 동안 버튼 이름이 `Stop`. 정답이면 `[trial-turn-verdict]` `Great` · 내 줄 재생 · `[trial-turn-next]`. 일부러 틀리면 `Not quite` · `You said: …` · `[trial-turn-retry]` `Try again`. **인식이 끝난 뒤 음성이 작아지거나 수화기로 바뀌지 않는다**(소리 경로). 8초 말하지 않으면 `We didn't catch that` | **부분**(1회차 · iOS 26.5 시뮬레이터) — 첫 Speak에 OS 「음성 인식」 창 → 사이트 마이크 창이 한 번씩, 다음 턴엔 안 뜬다. 시뮬레이터 인식기는 바로 끝난다: 첫 시도 1초 안에 `We didn't catch that`(8초 안 기다림) → `Try again`, 그다음 시도부터 매번 오류 → 그 턴만 타일 「Speaking didn't work this time…」, 다음 턴은 다시 Speak. `Stop` 상태 · 받아쓰기 · `Great` by speech · 소리 경로는 실기 몫 |
| EU3 | EU1 기기 · 무음 스위치 **켬** | EU1을 다시(새 탭) | 음성 · 효과음이 **나는가**를 적는다. 나면 `navigator.audioSession` 대응이 선 것이다. 안 나면 실패가 아니라 판정 자료다 — ADR-0083 재검토 조건 2(음성만 `HTMLAudioElement`로)로 간다. 어느 쪽이든 진행은 막히지 않는다 | 미룸(실기 전용) |
| EU4 | EU1 기기 · **마이크 거부**, 다음 회차는 설정 → 일반 → 키보드 → **받아쓰기 끔**(Siri 끔) | 1턴 `Speak` → 권한 창 **허용 안 함** → 끝까지 | 같은 턴이 타일로 바뀌고 `[trial-turn-notice]` 「The microphone is off, so you'll build your reply with words.」, 남은 턴도 처음부터 타일. 타일 `[trial-tile]`을 눌러 `[trial-turn-composed]`에 문장 → `[trial-turn-check]` `Check` → 판정 → 엔딩 · 완료까지 간다. 받아쓰기 끔도 같은 안내(`service-not-allowed`)인지 적는다 | **통과**(1회차 · iOS 26.5 시뮬레이터, 거부 부분만) — 「허용 안 함」에 같은 턴이 타일 + 「The microphone is off…」, 2 · 3턴도 처음부터 타일, 타일 → Check → 판정 → 엔딩 → 완료. 받아쓰기 끔(`service-not-allowed`) 회차는 미룸(실기) |
| EU5 | Android Chrome(실기, 없으면 에뮬레이터 — 마이크는 호스트 것) | ① 허용 → 세 턴 말하기 ② 사이트 권한 지우고 거부 → 끝까지 ③ 페이지를 연 뒤 비행기 모드 → Start부터 끝까지 | ① EU2와 같은 판정 ② EU4와 같은 판정 ③ 음성 · 효과음 없이(받기 실패 = 무음) 끝까지, 말하기는 `network` → 그 턴만 타일 · 「Speaking didn't work this time…」, 다음 턴은 다시 Speak | **부분**(1회차 · Android 11 에뮬레이터 Chrome 91 — 최신 이미지는 못 띄움) — 이 Chrome에선 **체험판이 빈 화면**(아래 버그 1) · `Object.hasOwn` 없음(Chrome 93+)이라 CSS · 폴리필을 넣고 봤다. ① 권한 창(사이트 → 앱) 한 번 · 듣는 동안 `Stop` · 말 없으면 `We didn't catch that` — 정답 발화는 못 함 ② 차단 → 타일 + 「The microphone is off…」, 남은 턴도 타일 · 완료 **통과** ③ 비행기 모드 → 버킷 음성 전부 `ERR_INTERNET_DISCONNECTED` · 진행 막힘 없음 · Speak → 「Speaking didn't work this time…」 그 턴만 타일 · 다음 턴 Speak · 완료 **통과**(효과음은 adb reverse 경유라 받아짐) |
| EU6 | 데스크톱 Firefox(최신) | `/try/` Start → 끝까지 | 롤플레이가 **처음부터 타일**(Firefox에 Web Speech 인식 없음) · 안내 「Speaking isn't available in this browser…」. 음성은 m4a(AAC)가 해독되면 나고, 안 되면 무음으로 진행한다 — 어느 쪽인지 적는다 | **통과**(1회차 · Playwright Firefox 155 headless — 배포판 Firefox는 아님) — 처음부터 타일 · 「Speaking isn't available in this browser…」 세 턴 · 완료. m4a `decodeAudioData` 성공(2.20s) — 음성이 해독된다. 콘솔 오류 0. `/ko/try/`도 같음 |
| EU7 | iOS VoiceOver(EU1 기기) · Android TalkBack(EU5 기기), 이어서 **움직임 줄이기**(iOS 설정 → 손쉬운 사용 → 동작 → 동작 줄이기 · Android 설정 → 접근성 → 애니메이션 삭제) | 쓸기로만 Start → 컷 → 단어 → 고르기 → 문화 → 롤플레이(타일 · 말하기 각 한 턴) → 완료. 움직임 줄이기를 켜고 같은 경로를 눈으로 | **낭독**: 단계가 바뀌면 그 단계 제목, 컷이 바뀌면 화자 · 한국어(한국어 음성) · 번역(영어 음성), 보기 「선택됨」 상태 · 판정 「Correct」/「Not quite」, 문화 카드 버튼 이름이 「Flip the card」 ⇄ 「Flip back」(눌림 상태 없이), 마이크 「Speak」 ⇄ 「Stop」, 힌트를 열면 힌트 글로 · 판정 뒤 Next 또는 Try again으로 · 타일 전환 뒤 첫 타일로 초점, 진행 막대 이름 「Lesson progress」. 3턴째 상대 대사가 안내에 덮이지 않고 읽힌다. **움직임 줄이기**: 컷 대사가 타자 효과 없이 처음부터 다 보이고, 카드가 돌지 않고 바로 바뀌며, 장면 전환 · 폭죽이 없다 | **부분**(1회차 · iOS 26.5 시뮬레이터, 움직임 줄이기만) — `defaults write com.apple.Accessibility ReduceMotionEnabled`가 Safari 재실행 뒤 먹는다: 켜면 컷 대사가 첫 화면부터 다 보이고(끄면 같은 시점에 한두 글자), 문화 카드도 바로 뒷면. 장면 전환 · 폭죽은 눈으로 판정 못 함. VoiceOver · TalkBack 낭독은 미룸(실기) |
| EU8 | 프로덕션 배포 뒤 · GA4 실시간 보고서(EU 밖 지역) | 랜딩 `/`에서 Hero 「Try the first scene」(`[hero-trial-link]`) → `/try/` 끝까지 → 완료 화면 → (EU9를 할 때) 사전 등록 | 실시간 보고서에 `trial_link_click{location:hero}` · `trial_start{speech}`(첫 탭) · `trial_step` 아홉(`ordinal` 1 ~ 9, clear 8 · complete 9) · `trial_roleplay_result{verdict,correct,by_speech,by_tiles,speech}` · `trial_complete{verdict}` · `trial_preregister{status}` · ⟨r3⟩ `trial_speech_attempt{turn,outcome,latency_bucket}`(말한 턴마다) · `trial_exit{step}`(나가기 회차)가 이름 · 속성대로 오고, **trial 이벤트마다 `browser`**가 기기와 맞는다(iPhone Safari → `ios-safari`, Android Chrome → `android-chrome`, 카카오톡으로 연 링크 → `in-app`). 속성에 한글 · 들은 문장 · 이메일이 없다. `trial_store_click`은 r2에서 지웠다 | 미룸(프로덕션 배포 뒤) |
| EU9 | **마이그레이션 `20261022120000_pre_registrations.sql`을 원격에 적용한 뒤** · `PUBLIC_SUPABASE_ANON_KEY`가 든 프리뷰 | 완료 화면 `[trial-prereg-email]`에 **테스트 주소**(직접 받는 메일 · 예: `you+duru-test@…`)를 넣고 `[trial-prereg-submit]` → 같은 주소를 대문자로 바꿔 한 번 더(새 탭) → Supabase 대시보드(service role)에서 표를 읽고, 그 행을 지운다 | 첫 번은 「You're on the list…」, 둘째(중복)도 같은 글(409). 표에 소문자 주소 한 행 · `locale` · `source = web-trial`. 브라우저 네트워크의 요청 머리에 `apikey`만 있고 `Authorization`이 없다. 실제 사용자 주소를 쓰지 않는다 | 미룸(원격 적용 뒤) |
| EU12 | **마이그레이션 `20261022130000_trial_speech_samples.sql`을 원격에 적용한 뒤** · `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`가 든 프리뷰 · EU1 기기(iPhone Safari)와 EU5 기기(Android Chrome) | 롤플레이 세 턴을 말하기로 — 턴마다 ① 정답을 또박또박 ② 정답을 빠르게 · 띄어 끊어(「처음 이에요」 식) ③ 일부러 다른 말 · 절반만을 말하고 판정을 적는다. 다 끝나면 Supabase 대시보드(service role)에서 `trial_speech_samples`를 `created_at` 최신순으로 읽어 아래 표에 옮긴다(시험 행은 옮긴 뒤 지운다) | 마이크 아래 안내 한 줄이 보인다(타일 모드에서는 없다). 판정 뒤 브라우저 네트워크에 `trial_speech_samples` POST 한 번(`apikey`만 · 201). 표 행의 `alternatives`에 인식기가 낸 그대로의 글, `outcome` · `similarity`가 화면 판정과 맞는다(Great = strict 또는 lenient). **기록 표**: 기기 · 말한 말 · 인식 후보 · outcome · similarity · 기대한 판정. 기대와 다른 행(정답인데 incorrect · 다른 말인데 lenient)은 사례 표(`spoken-lenient.unit.test.ts`)에 더할 후보로 적는다 — 기준 조정은 ADR-0083 재검토 조건 9 | 미룸(원격 적용 뒤) |
| EU10 | EU1 기기 · 움직임 줄이기 **끔**, 다음 회차 **켬** | 컷 1 → 6을 넘기며 본다 | 끔: 컷 사이 흰 구름빛이 걷히며 그림이 또렷해지고, 컷 5(「다음에 또…」) → 6(승무원)에서 위아래로 눈이 뜨이듯 열린다. 대사 · Next는 움직이지 않고 탭이 막히지 않는다. 켬: 전환 없이 바로 바뀐다 | 미룸(실기) |
| EU11 | Android Chrome 실기 · iPhone Safari 실기 | `/try/` 첫 Next 탭 → 끝까지 → 완료, 다른 회차는 중간에 나가기 `[trial-exit]` | Android: 첫 탭에 주소창 · 탭바가 숨는다(전체화면), 완료 화면 · 나가기에서 풀린다, 뒤로 · 아래 쓸기로도 풀린다. iPhone: 아무 변화 없이 지금처럼(오류 0). 데스크톱: 폰 틀 그대로 | 미룸(실기) |

- EU1 ~ EU7 · EU9 · EU10 · EU12는 한국어 페이지 `/ko/try/`에서 한 번 더 돈다 — UI 문구만 한국어이고 학습 내용(한국어 대사 · 영어 번역)은 같다.
- 결과가 기대와 다르면 행에 그대로 적고 고치지 않는다 — 제품 코드 수정은 판정 뒤 소유 레이어 몫이다.

## 결과

| 회차 | 날짜 | 커밋 · 배포 | 기기 · 브라우저 | 실행한 행 | 결과 |
|---|---|---|---|---|---|
| 1 (시뮬레이터 · 실행: 메인 에이전트의 하위 에이전트, 사용자 지시) | 2026-10-22 | `201f902d` · 로컬 빌드(`PUBLIC_SUPABASE_URL` 있음), 정적 서버 `localhost` | iOS 26.5 시뮬레이터(iPhone, `FE-pencilfish-culture`) Safari · Android 11 에뮬레이터(`R6_API30`) Chrome 91.0.4472.114 · Playwright Firefox 155 headless | EU1 · EU2 · EU4 · EU5 ①②③ · EU6 · EU7(움직임 줄이기) · `/ko/try/` 한 번(iOS · Firefox) | 통과: EU4(거부) · EU5 ②③ · EU6. 부분: EU1 · EU2 · EU5 ① · EU7. 미룸(실기 전용): EU3 · EU4 받아쓰기 끔 · EU7 낭독 · EU8. 버그 둘 — 아래 |

1회차에서 찾은 것 (회차 중에는 고치지 않았고, 판정은 아래 「처리」):

1. **빌드된 CSS에서 `height: 100vh` 대체 선언이 빠진다.** 원본 `trial.css`의 `.trial`은 `100vh` 다음 `100dvh`인데 빌드된 `try/index.html`에는 `height:100dvh` 하나뿐이다. `dvh`를 모르는 브라우저(Chrome 107 이하 등)에서 `.trial` 높이가 0이고 `overflow: hidden`이라 **체험판이 빈 화면**이다 — Android 11 · Chrome 91에서 그렇게 보였다. 랜딩 `/`는 정상.
2. **오답 뒤 정답 줄에 띄어쓰기가 없다** — 그림 고르기 · 대답 고르기의 `Answer:안녕하세요` / `정답:안녕하세요`. HTML에는 `Answer: <span lang="ko">…</span>`로 공백이 있지만 `.trial-reveal`이 `display: flex`라 끝 공백이 사라진다. 롤플레이의 `Answer: …`는 정상.

그 밖에 본 것: Chrome 91에는 `Object.hasOwn`이 없어 문화 카드 → 롤플레이에서 예외가 난다(Chrome 93+ API라 지원 범위 밖일 수 있음 — 기록만). `/ko/try/`에서 고르기 제목 「Which word matches the picture?」는 영어로 남는다 — 내용 JSON에 `en`만 있는 학습 내용이라 위 「학습 내용은 같다」에 맞는다.

처리(2026-10-22):

- 버그 2는 고쳤다. 판정 줄 CSS가 `display: flex`를 배지에만 주고 `.trial-reveal`은 블록으로 보인다. `trial.e2e.ts` TE1에 렌더된 글자(`innerText`) 단정을 넣어 red(`Answer:` / 정답이 따로 줄)를 본 뒤 green이 됐다.
- 버그 1 · `Object.hasOwn`은 지원 범위 밖이라 고치지 않는다. 요구사항 하한이 「최근 2개 메이저」이고 Chrome 107 · 91은 그 밖이다. `100vh` 대체 선언은 빌드(lightningcss) 대상 브라우저가 `dvh`를 아는 것으로 잡혀 빠진다. 하한을 내리면 그때 대상 브라우저 목록부터 바꾼다.
- 「롤플레이 2턴 오답 뒤 상대 대사 카드 윗부분이 상단 막대에 가려진다」는 결함이 아니다. 오답 뒤 초점이 Continue로 가면서 턴 열(`.trial-turn`, 세로 스크롤)이 굴러 간 것이다. 카드는 스크롤 영역 위 가장자리에서 잘렸고 위로 굴리면 보인다. 짧은 화면에서 대사 · 조작만 굴리는 설계(`trial-talk.css`) 그대로다.
