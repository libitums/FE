# 개인정보처리방침 추가 문구 초안 — 웹 체험판 말하기 글자 수집

상태: **초안** — 개인정보처리방침은 저장소 밖(Notion)에 있다. 아래 문구를 검토해 그 페이지에 붙이는 것은 사용자 몫이다.
근거: [ADR-0083](../adr/0083-web-trial-and-episode-core.md) D19 · 표 `public.trial_speech_samples`(마이그레이션 `20261022130000`) · [supabase-functions README](../../apps/supabase-functions/README.md) 「웹 체험판 인식 글자 수집 표」.
적용 전 확인: 마이그레이션 원격 적용 · 보관 예약 SQL 실행이 끝났을 때 이 문구가 사실이 된다(그 전에는 수집 요청이 저장되지 않는다).

---

## 한국어

### 웹 체험판에서 말한 문장(글자)의 수집

Duru 웹 체험판(duru 웹사이트의 `/try/`)에서 말하기 연습을 하면, 브라우저의 음성 인식 기능이 알아들은 문장을 **글자로만** 저장합니다. 목소리 녹음은 저장하지 않습니다.

- **수집 항목**: 음성 인식기가 알아들은 문장 후보(최대 3개, 각 200자 이내), 연습한 정답 문장, 채점 결과와 일치도, 몇 번째 대사인지, 체험판 콘텐츠의 판 정보, 브라우저 종류(예: iPhone Safari · Android Chrome · 앱 안 브라우저 · 데스크톱 · 그 밖), 화면 언어(영어 · 한국어), 저장 시각, 체험할 때마다 새로 만드는 무작위 식별값.
- **수집하지 않는 것**: 이름 · 이메일 · 계정 등 사용자를 알아볼 수 있는 정보, IP 주소, 브라우저 정보 원문(User-Agent), 목소리 녹음.
- **이용 목적**: 말하기 채점이 발음 차이를 더 정확히 너그럽게 받아들이도록 채점 기준을 개선하는 데에만 씁니다. 광고 · 마케팅에 쓰지 않습니다.
- **보관 기간**: 저장한 날로부터 **90일** 뒤 자동으로 삭제합니다.
- **제3자 제공**: 제3자에게 제공하거나 판매하지 않습니다. 데이터는 서비스 운영을 위한 데이터베이스(Supabase)에 저장되며, 운영자만 열람합니다.
- **참고**: 말하기 중에 이름 등 개인정보를 직접 말하면 그 내용도 글자로 저장될 수 있습니다. 연습 문장만 말해 주세요. 저장된 글자는 사용자와 연결되지 않아 개별 삭제 요청을 특정하기 어렵지만, 90일 뒤에는 모두 지워집니다.
- 체험판의 마이크 버튼 아래에 「말한 문장은 글자로 저장되어 채점을 개선하는 데 쓰여요.」라는 안내가 표시됩니다.

## English

### Text of what you say in the web trial

When you practice speaking in the Duru web trial (`/try/` on the Duru website), we save **only the text** that your browser's speech recognition heard. We do not save any voice recording.

- **What we collect**: the sentence candidates recognized by the speech recognizer (up to 3, each up to 200 characters), the target sentence you practiced, the scoring result and similarity score, which line it was, the trial content version, the browser type (e.g. iPhone Safari, Android Chrome, in-app browser, desktop, other), the page language (English or Korean), the time it was saved, and a random identifier created fresh for each trial session.
- **What we do not collect**: your name, email, account, or anything else that identifies you; your IP address; the raw browser string (User-Agent); voice recordings.
- **Why**: only to improve how speaking is scored, so pronunciation differences are judged more accurately and fairly. Not for advertising or marketing.
- **How long**: deleted automatically **90 days** after it is saved.
- **Sharing**: not shared with or sold to third parties. The data is stored in the database we use to run the service (Supabase) and is accessible only to the operator.
- **Note**: if you say personal information (such as your name) while speaking, it may be saved as text. Please say only the practice sentence. Because saved text is not linked to you, we cannot easily find an individual's entries, but everything is deleted after 90 days.
- The trial shows the notice "What you say is saved as text to improve scoring." under the microphone button.
