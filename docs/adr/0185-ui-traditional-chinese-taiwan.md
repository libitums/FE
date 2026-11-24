# ADR-0185 — 대만 중국어(번체, zh-TW)를 여덟째 화면 언어로 연다 · 서비스 기반 언어 검증을 테스트로 남긴다

- 상태: **채택 — 앱 · 서버 파일(초안 PR, 다음 빌드에 합침). 운영 미적용.** 1.6.0 (26) · 1.3.0 (27)에는 넣지 않는다.
- 날짜: 2026-11-24.
- 사용자 결정(2026-11-24): 「대만어 앱에 추가 · 서비스 기반 언어 검증」 — 언어는 **대만 중국어 번체 zh-TW**(민남어 아님), 별도 브랜치(`feat/zh-tw`)에서 하고 다음 빌드에 합친다.
  검증 범위는 앱 전 화면과 서버가 만드는 사용자 글. 스토어 · 랜딩 · 외부 번역 서비스 · 이야기 대사 번역은 범위 밖.
- 이어받는 결정: [ADR-0158](0158-story-translations-thai-burmese.md) 개정(th · my 화면 문구 — 같은 길) · [ADR-0098](0098-japanese-localization.md) D4(한자 글꼴) ·
  [ADR-0149](0149-bundle-size-ceiling-and-report.md)(천장) · [ADR-0059](0059-learner-profile.md)(나라 이름 버킷 파일) · [ADR-0130](0130-push-console-segment-campaigns.md)(나라 → 문구 언어).

## 결정

### D1. 언어 코드는 `zh-TW` — `EntryLanguage`(= `UiLanguage`) 끝에 더한다
- `entryLanguages = [en, vi, id, es, ja, th, my, zh-TW]`. 라벨 `Traditional Chinese · 繁體中文`.
- 코드를 BCP-47 `zh-TW` 그대로 쓴다: 채팅 l1(`companion.profiles.l1` 검사 `^[a-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$`)을 통과하고, 번역 · 교정 프롬프트가
  `BCP 47 tag "zh-TW"`로 받아 **채팅 번역 줄 · 교정 설명이 대만 중국어로 온다** — 서버 코드 변경 없음. 비용은 다른 언어와 같은 호출 하나(출력 토큰은 한자라 영어보다 적거나 같다),
  품질 위험은 모델이 간체로 쓰는 경우 — 프롬프트가 태그만 주므로 운영 표본으로 본다(남은 일).
- 국기 대신 같은 틀(40×28)의 글자 배지 「中」 — 나라 국기 논쟁을 피한다(스스로 정한 기본값, 사용자가 바꿀 수 있다).

### D2. 화면 문구는 완전한 표 — th와 같은 구획
- `ui-copy-zh-tw*.ts`(구획 17 + `ui-copy-more-zh-tw.ts` · `ui-copy-ranking-zh-tw.ts` + 가입 보상 칸). 타입(`UiCopy`)이 키를 강제한다.
- 표기: 번체 + 대만 용어(軟體 · 訊息 · 影片 · 登入 · 設定 · 帳號 · 網路 · 螢幕), 전각 문장부호(，。！？「」), 호칭은 你, 요금제 이름 영어(ADR-0144 · 0160),
  엽전은 `Yeopjeon`, 단위는 「枚錢幣」, 엽전 묶음 기호 `,`. 날짜는 `Intl` 없이 `M月D日`. 낭독되는 진행 숫자는 「N/M」 대신 「第N…，共M…」 — 중국어 TTS가 「2/3」를 분수 · 날짜로 읽는다(접근성 점검 Major, ZT-U8). 낭독 목록 구분자는 「，」(ZT-U9). 모두 **번역 초안 — 원어민 검수 필요**(파일 머리 주석).
- ~~이야기 대사 · 레슨 콘텐츠 번역은 만들지 않는다~~ → **개정(D8)**: 스테이징에 zh-TW 콘텐츠 번역이 있어 th · my와 같은 길로 연다.

### D8. ⟨2026-11-24 개정⟩ 이야기 · 레슨 번역도 zh-TW — th · my와 같은 길(버킷 번역 파일)
- **사용자 결정(2026-11-24 「진행」)**: 「콘텐츠 번역은 범위 밖 → 영어」는 틀렸다 — 스테이징 `episodes/u00~u17.json`(delivery-2)의 `translations`에 zh-TW가 다른 여섯 언어와 같은 수(편마다 51~300)로 있다.
- 앱: `ContentLanguage` · episode-core `translationsOf` · 매니페스트 `translationRefsOf`에 zh-TW, 받기 차례가 zh-TW 파일을 받는다(`translationLanguageForRound`의 예외를 지움).
  모르는 언어 키를 조용히 버리는 규칙(MT2) 그대로라 **옛 앱은 매니페스트의 zh-TW 항목을 무시**한다. 번들에 품은 본문(u00~u10의 `translations` vi · id · es · ja)에는 넣지 않는다 —
  th · my처럼 첫 받기 전 · 오프라인 첫 실행은 영어이고, 번들 크기는 그대로다.
- **수준 5만**: 운영 `translations/level-5/zh-TW/<id>.json` 18개 + `manifests/level-5.json`의 각 편 `translations["zh-TW"]`(version = 그 편의 운영 본문 판 `2026-11-18.1`). 수준 4(`translations/<언어>/`)는
  만들지 않는다 — 수준 4만 읽는 앱(1.3.x 이하)에는 zh-TW 화면 언어가 없다. 스테이징에 수준 구분은 없다(본문 하나가 두 수준의 원본).
- 변환기 `devtools/content/translation-files.mjs` · `translation-files-build.mjs`(TF-U1~U7): 운영 ja · th 파일과 같은 모양(스테이징이 바뀌지 않은 편에서 바이트 일치 확인).
  운영 본문(11-18판)과 스테이징(11-20판)의 영어 키가 어긋난 곳은 **운영 ja 키에 맞춘다** — 자리표시자 이름만 바뀐 3줄(`{수단}` → `{means}` · `{명사}` → `{noun}`)은
  스테이징 번역을 옮겨 채우고, 스테이징에 없는 u15 aside 「Stepping back to fit them both in the frame.」 한 줄은 영어로 남는다(th · my와 같음).
- 점검: 18편 모두 운영 ja 키 대비 빠짐 1(위 aside) · 자리표시자 잃음 0 · 빈 번역 0 · 간체 전용 글자 0 · 가나 0(앱 문구표와 같은 목록). 생성 파일을 앱 디코더(매니페스트 · 번역 파일 · sha256 · bytes)로 읽어 18/18 통과.
- 저장소는 번역 파일을 두지 않는다(본문 · 번역은 버킷이 정본) — 생성물은 커밋하지 않고, 올리는 일은 사람(아래 「적용」).
- 단계별 예고 푸시(`staging/push/*.json`)에는 zh-TW가 없다 → 영어 그대로(D6).

### D3. 기기 언어 판정 — 번체만 받는다
- `uiLanguageFromDeviceTag`: 주 하위 태그 `zh`이면 스크립트 `Hant` 또는 지역 `TW` · `HK` · `MO` → `zh-TW`. `Hans` · `CN` · `SG` · 지역 없는 `zh` → null(영어).
  간체 사용자에게 번체를 내밀지 않는다 — 읽을 수는 있지만 「다른 나라 앱」으로 느끼고, 간체 표는 이번 범위가 아니다.
- **호스트는 여전히 기기 언어를 넘기지 않는다**(`loadReturningUiLanguage`의 기기 입력 null — ADR-0158 개정의 남은 일과 같다). 그래서 앱 언어는 온보딩 언어 단계 ·
  설정 › 언어에서 고른다. 판정 함수만 준비해 두었다.

### D4. 글꼴 — 번체 시스템 글꼴을 Duru Sans 앞에(`.app-lang-zh-tw`)
- Duru Sans는 Pretendard JP 서브셋이라 같은 한자도 일본 자형이고, 서브셋에 없는 한자는 다른 글꼴로 떨어져 한 줄에 두 자형이 섞인다.
  `.app-lang-zh-tw`가 글꼴 토큰마다 `PingFang TC` · `Heiti TC` · `Noto Sans CJK TC` · `Noto Sans TC`를 맨 앞에 두고, 한글은 뒤따르는 Duru Sans가 그린다(라틴도 시스템 글꼴 — 대가).
- **iOS 시뮬레이터: 대만 자형 확인**(문장부호 ，。가 칸 가운데 — PingFang TC). **Android 에뮬레이터: 대만 자형이 아니다**(，。가 왼쪽 아래 — 이름으로 시스템 글꼴을 못 찾아
  Duru Sans 또는 기본 대체 글꼴). 읽기에는 문제가 없고 잘림도 없었다. 고칠 길은 「남은 일」.
- `tooling/fonts/build.sh`는 `ui-copy-*.ts`의 한자를 Duru Sans 서브셋에 넣는다 — zh-TW 표는 빼야 한다(대만 자형을 일본 글꼴로 덮지 않게, 서브셋도 커지지 않게). 스크립트는 **이름에 `zh-tw`가 든 표 파일만** 뺀다 — 공용 파일의 zh-TW 글(`ui-copy-signup-reward.ts`의 zhTw 칸 · `learner-profile.json`의 `zh-TW` 칸)은 글꼴을 다시 만들면 서브셋에 들어간다(수십 자, 남은 일).

### D5. 네이티브 문구
- iOS `zh-Hant.lproj/InfoPlist.strings`(zh-TW · zh-HK · zh-MO 기기): 추적 허용(ATT) · 마이크 · 음성 인식. `knownRegions`에 `zh-Hant`.
- **검증 중 찾은 빠짐(고침)**: 마이크 · 음성 인식 권한 문구는 빌드 설정(`INFOPLIST_KEY_*`) 값이 **한국어**라 영어 · 일본어 등 모든 기기에 한국어가 떴다. 여덟 언어 `InfoPlist.strings`에 두 문구를 더했다(초안).
- `ko.lproj`(마이크 · 음성 인식만, 빌드 설정의 한국어 그대로)를 더해 `knownRegions`에 ko가 생겼다 — 한국어 기기에서 앱의 지역화가 en → ko가 되어 시스템이 그리는 UI(기본 단추 · 공유 시트)도 한국어가 되고, App Store에 한국어 지원으로 보일 수 있다. ATT는 ko.lproj에 키가 없어 지금처럼 영어다.
- Android `values-zh-rTW` · `values-b+zh+Hant`(같은 문구) — 알림 채널 이름 · 설명. 앱 이름은 모든 언어 `Duru`.

### D6. 서버 · 콘솔 — 나라 TW · HK · MO → zh-TW
- `copyLanguageFor` · `storyLanguageFor`(서버 `push-campaign-locale.ts`)와 콘솔 `segments.mjs` · `story.mjs`가 같은 표. 자동 캠페인 문구(`push-campaign-config.ts`),
  친구 스토리 알림 본문(`companion-stories-handler.ts`), 콘솔 기본 문구(`copy.mjs` A · B)에 zh-TW.
- **검증 중 찾은 빠짐(고침)**: 자동 캠페인 `episode-next`에 일본어가 없어 일본 학습자에게 영어가 갔다 — ja를 더했다(초안).
- 단계별 예고(버킷 `content/push/level-5/`)는 콘텐츠라 zh-TW 글이 없다 → 영어로 대체(기존 규칙 `text[lang] ?? en`).

### D7. 서비스 기반 언어 검증을 남는 장치로
- 앱 `ui-copy-all-languages.unit.test.ts`(LV-U1~U3): 여덟 언어 목록 · 라벨 · 국기 · 문구표가 서로 빠짐없고, 영어 밖 표는 영어와 같은 글이 10% 아래, 모든 문구 함수를 표본 인자로 불러
  자리표시자(이름 · 단어)가 남고 빈 글이 없다. 언어를 더하면 `EXPECTED`부터 바뀐다.
- 앱 `ui-copy-zh-tw.unit.test.ts`(ZT-U0~U9): 간체 전용 글자 · 일본 가나 · 대륙 용어 · 한자 뒤 반각 문장부호 없음(점검 도우미 자체도 시험한다).
- 서버 `push-locale-languages.unit.test.ts`(SL-U1~U5) · 콘솔 `locale-parity.unit.test.mjs`(PL-U1~U4): 나라 → 언어 표 · 콘솔과 서버 표 일치 · 영어 밖 언어가 있는 묶음은
  같은 언어 집합(zh-TW 포함)이고 자리표시자가 같다.
- 네이티브 `info-plist-strings.unit.test.mjs`(IL1~IL5) · `android-strings.unit.test.mjs`(AL1 · AL2).

## 대가 · 위험
1. 번들 +66,076 B(`main.lynx.bundle` 5,627,355 → 5,693,431, 천장 5,850,000 그대로 · 여유 156,569). 한자는 UTF-8 3바이트지만 글이 짧아 th · my(언어당 약 175 kB)보다 작다.
2. 번역 품질 — 초안. 대만 원어민 검수 전에 내보내지 않는다.
3. Android 한자 자형(D4) · 화면 낭독기의 영어 접미사(아래 표)는 남는다.

## 적용(버킷, 사람 — 승인 뒤)
- 올릴 파일: `translations/level-5/zh-TW/{u00-tutorial,u01-water,u02-checkin,u03-mina,u04-directions,u05-baekban,u06-cafe,u07-jaemin,u08-umbrella,u09-subway,u10-laundry,u11-bookstore,u12-cafe-missed,u13-pajeon,u14-hanbok,u15-changdeokgung,u16-umbrella-return,u17-samgyeopsal}.json`(새 파일, `x-upsert: false`),
  그다음 `manifests/level-5.json`(덮어쓰기, `x-upsert: true`) — 번역 파일 먼저, 공개 URL의 sha256 · bytes 확인, 매니페스트 마지막. `cache-control: max-age=60`.
- 다시 만들기: 스테이징 `episodes/*.json` · 운영 `manifests/level-5.json` · 운영 `translations/level-5/ja/*.json`을 받아 `translation-files-build.mjs`(사용법은 파일 머리).

## 남은 일(사람 · 다음 결정)
- 원어민 검수. 버킷에 수준 5 zh-TW 번역 18개 · 매니페스트 올리기(위 「적용」), `country-names/zh-TW.json` 올리기(부록 H 절차 — 그 전에는 나라 이름이 영어).
- 서버 파일 운영 적용(`push-campaign-locale.ts` · `push-campaign-config.ts` · `companion-stories-handler.ts` 함수 배포).
- 친구 스토리 묶음(정본 `docs/content/friend-stories.json` · 마이그레이션) 뜻 줄에 zh-TW — 지금은 영어(앱은 zh-TW 칸을 읽을 준비가 되어 있다).
- Android 대만 자형: (가) 그대로 둔다 (나) Noto Sans TC 서브셋을 앱 자산으로 싣고 `@font-face`로 맨 앞에 (다) 호스트가 Lynx 글 그리기에 로캘을 넘기는지 확인.
- 기기 언어를 앱에 넘기는 호스트 경로(D3).
- 스토어 등록정보(App Store · Play 繁體中文).

## 언어 검증 결과 ⟨2026-11-24⟩

| 화면 · 서비스 | zh-TW | 대체 · 이유 |
|---|---|---|
| 앱 화면 문구(`UiCopy` 전부 — 입장 · 맵 · 레슨 · 이야기 · 채팅 · 상점 · 요금제 · 설정 · Letters · 단어장 · 순위 · 알림 · 가입 보상) | 예 | — |
| 이야기 대사 · 레슨 번역(버킷 수준 5 번역 파일) | 예(업로드 뒤) | 운영 업로드 전 · 첫 받기 전 · 오프라인 첫 실행은 영어(th · my와 같음). u15 aside 한 줄은 스테이징에 번역이 없어 영어(D8) |
| 단계별 예고 푸시(버킷 콘텐츠) | 아니오 | 영어 — `staging/push`에 zh-TW 없음(D6) |
| 인물 소개 · 직업 · 나이 · 시트 첫 말(`companion-*roster.ts`) | 예 | — |
| 친구 스토리 뜻 줄(서버 묶음 27줄) | 아니오 | 영어 — 묶음 정본에 zh-TW 칸 없음(남은 일), 앱은 읽을 준비 |
| 학습자 프로필 미리보기 틀 | 예 | — |
| 나라 이름 | 파일만 | 버킷에 올리기 전까지 영어(부록 H) |
| 채팅 번역 줄 · 교정 설명(LLM, l1) | 예 | BCP-47 `zh-TW` 그대로 — 서버 변경 없음 |
| 자동 캠페인 푸시 문구 A(`push-campaign-config.ts`) | 예 | tutorial-cover · tutorial-rest는 원래 영어만(모든 언어) |
| 친구 스토리 알림 본문 | 예 | — |
| 선톡 푸시 미리보기 B(「{이름} sent you a message」) | 아니오 | **모든 언어 영어**(기존) — 실험 중인 문구라 바꾸지 않음, 사용자 결정 필요 |
| 콘솔 기본 문구 A · B(`copy.mjs`) | 예 | all-done은 원래 영어만(모든 언어) |
| 앱 업데이트 안내 · 강제 업데이트(`appUpdate`) | 예 | — |
| 인증 메일 · 서버 오류 글 | 해당 없음 | 메일 템플릿은 저장소 밖(Supabase 대시보드) — 확인 못 함. 서버 오류는 코드로 오고 앱이 문구표로 보인다 |
| iOS 권한 창 — ATT · 마이크 · 음성 인식 | 예 | — |
| Android 알림 채널 | 예 | — |
| 화면 낭독기 접미사(ui-lynx `LearningUnit` locked · current · completed · loading, `StepIndicator`, `EpisodeHeader` 「x of y units completed」, `PageIndicator` 「Scene n of m」, `TextField` 「n of m characters」, 앱 `EntryStepBar` 「Step n of 3」, `BackHeader` 「Back, …」 · 「Screen info」) | 아니오 | **모든 영어 밖 언어 영어**(기존) — ui-lynx 부품 기본값. 부품 계약에 문구를 받는 칸이 필요(따로) |

### 기존 일곱 언어에서 찾은 빠짐

| 빠짐 | 언어 | 처리 |
|---|---|---|
| iOS 마이크 · 음성 인식 권한 문구가 한국어(빌드 설정 값) | en · es · id · ja · vi · th · my | **고침** — 여덟 언어 `InfoPlist.strings`(초안), IL4. 한국어 기기는 en.lproj로 떨어져 영어가 되지 않게 `ko.lproj`에 빌드 설정의 한국어를 그대로 둠(`knownRegions` += ko), IL5 |
| 푸시 문구에서 이름이 비면 `{name}`과 붙은 쉼표를 지우는 규칙이 반각 `,` · `、`만 보았다 — zh-TW 전각 `，`가 첫 글자로 남음 | zh-TW(새 언어에서 드러남) | **고침** — 서버 `push-campaign-text.ts` · 콘솔 `segments.mjs` 정규식에 `，`, SL-U5 · PL-U4(모든 언어 빈 이름) |
| 자동 캠페인 `episode-next` 일본어 없음 | ja | **고침** — ja 문구 더함(초안), SL-U2 |
| 선톡 푸시 B 문구 영어 | 영어 밖 전부 | 안 고침 — 실험 문구, 사용자 결정 |
| 화면 낭독기 영어 접미사(위 표) | 영어 밖 전부 | 안 고침 — ui-lynx 계약 변경 필요 |
| 캠페인 · 콘솔 all-done · tutorial-cover · tutorial-rest 영어만 | 영어 밖 전부 | 안 고침 — 기존 운영 선택 |
