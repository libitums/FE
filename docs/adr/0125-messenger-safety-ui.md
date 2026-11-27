# ADR-0125 — 메신저 법 · 안전 UI: 첫 대화 전 생년 시트 · 로그 안 고지 줄 · 위기 안내 카드 · 막힌 입력 줄 · 호스트 `ExternalLinkModule`

- 상태: **채택 — 1단계(가짜 출처).** 서버 결선 0 · 분석 이벤트 0 · 저장 키 0. 호스트 모듈 하나 추가.
- 날짜: 2026-11-11.
- **사용자 결정**: 결정 문서 7번(2026-11-10, [AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x)) — 생년은 **첫 대화 전 시트 · 연도 목록**, 건너뛰면 18세 미만 기본값(2026-11-27 개정: 건너뛰기를 걷었다 — 아래 적용 기록), 고지 셋은 **로그 안 가운데 회색 줄**, 위기는 로그 안 카드, 거절은 보통 말풍선, 막힘은 입력 줄 자리의 상태 줄. 시안 https://claude.ai/artifact/Fv6j9jxosmZ7VCb2oeL6eo(「괜찮네」). 2026-11-11: 위기 카드 단추는 **호스트 모듈을 새로**, 생년 고치기는 **방 사이드바 줄 + 연령 제한 줄 단추**(설정 탭은 대화 설정 작업 때).
- 이어받는 결정: [ADR-0113](0113-messenger-chat-ui.md)(대화 출처 포트 · 사이드바 · 겹침 — 적용 기록), [ADR-0017](0017-host-native-capabilities-and-audio.md) D1(호스트 모듈 입장 조건).
- 다루지 않는 것: 서버가 notice · crisis를 언제 보내는지(컴패니언 PRD §3.11), 연령 판정 · 미국 판정 · 보호자 동의, 설정 탭의 대화 설정, 거절 표시(보통 말풍선이라 변경 없음).

## 결정

### D1. 대화 출처 포트에 넷을 더한다 (추가만)
- 메시지 `notice { notice: ai-disclosure | minor-notice | break-reminder }` · `crisis { resources: [{ name, phone, url, hours }] }`(없는 칸 null).
- 방 `inputBlock`: `temporarily-blocked { until }` · `usage-time-limit { resetsAt }` · `age-restricted` · null.
- 목록 스냅숏 `birthYear`: `unasked` · `set { year }`, `setBirthYear(year)`. (2026-11-27 개정 — `skipped` · `setBirthYear(null)`을 걷었다.)
- 가짜 출처: 기본 씨앗은 그대로라 **앱을 다시 켜면 생년이 unasked**로 돌아간다(1단계 가짜 데이터와 같은 성질). 테스트 · 확인용 씨앗이 고지 · 위기 · 막힘 · 생년을 줄 수 있다.

### D2. 생년 시트 — 방을 열 때 unasked면
- 연도 목록(올해 → 100년 전, 101개, 새 연도가 먼저). 처음엔 아무것도 안 골라져 **Continue가 꺼져** 있다. 고른 연도가 없으면 목록 **가운데(올해 - 50)가 칸 가운데** 오게 열고, 고른 연도가 있으면 그 연도에서 연다 — 자리만 옮기고 값은 비워 둔다(2026-11-27 개정, 아래 적용 기록). 시트 단추는 Continue 하나다 — 「Skip for now」와 목록 아래 「건너뛰면 18세 미만 설정」 안내는 2026-11-27에 걷었다(아래 적용 기록).
- 방을 열자마자 뜬 시트는 닫기 단추 · 바깥 탭 · 시스템 뒤로가 모두 **답하지 않고 방 나가기**다(다음에 또 묻는다, 2026-11-27 개정 — 그 전에는 닫기 단추 · 바깥 탭이 없었다). 사이드바 · 막힌 줄에서 연 시트는 닫을 수 있고 닫으면 연 자리로(사이드바는 사이드바로) 돌아간다.
- 설명은 시트의 `description` 자리 대신 내용 안에 직접 그린다 — 그 자리는 시트 안 `scroll-view`라 iOS 기기에서 높이가 서지 않아 글이 그려지지 않았다(아래 기기 확인). ui-lynx는 고치지 않았다(예산 여유 약 1.2 kB).

### D3. 고지 줄 · 위기 카드 · 막힌 입력 줄
- 고지 줄: 가운데 12px 회색 글 + 양옆 1px 선, AI 고지는 i · 휴식은 시계 아이콘, 미성년자 고지는 아이콘 없음. 문장 하나로 낭독.
- 위기 카드: 아바타 없는 연회색 카드 — 제목 · 설명 · 기관마다 이름 · 시간 · `Call {번호}`(전화 있을 때) · `Website`(주소 있을 때) · 긴급 번호 안내. 도착하면 「Support resources」를 낭독한다. 목록 미리보기에는 고지 · 위기를 싣지 않는다.
- 막힌 입력 줄: `inputBlock`이 있으면 기능 줄 · 입력 줄 · 토글 · 키보드 자리 대신 아이콘 · 제목 · 설명 줄 하나. 시각은 언어별(en 12시간 「3:40 PM」, es · ja 「15:40」, id 「15.40」, vi 「15:40」 — PrimJS에 `Intl`이 없어 문구가 쓴다). 연령 제한 줄에는 「Change birth year」 → 생년 시트.
- 막힘이 서거나 바뀌면 상태 줄 문장을 한 번 낭독한다(Lynx에는 status 성질이 없어 수용 기준 8의 「status」를 이렇게 풀었다). 방 도중에 막히면 열린 키보드 · 보기 판 · 「…」 메뉴를 접는다. 연령 제한 줄의 「Change birth year」는 지금 생년이 골라진 시트를 연다.
- 전화 번호가 열 수 없는 꼴(괄호 · 점)이면 Call 단추를 그리지 않는다 — 번호 글자만 남는다.
- 새 접근성 요소는 모두 `flatten={false}`(Android가 납작한 요소를 접근성 트리에서 지운다 — ADR-0040), 새 탭 요소(위기 Call · Website · 연도 줄 · Change birth year · 사이드바 생년 줄)는 모두 `accessibility-enable-tap` — Android 접근성 탭 다리(`AccessibilityTapBridge`)가 이것을 볼 때만 클릭을 단다.
- 사이드바: 이야기 시점 다음 다섯째 줄 「Birth year」(값: 연도 · Not set). 자동 보기 · 지우기는 여섯째 · 일곱째가 됐다.

### D4. 호스트 모듈 `ExternalLinkModule.open(url, callback)`
- 위기 카드의 전화 · 웹 주소를 시스템에 넘긴다. **`tel:` 번호(공백은 걷는다) · `https`만**, 그 밖은 `rejected`. 콜백 `{ status: opened | rejected | failed }`.
- iOS `UIApplication.shared.open`, Android 전화는 `ACTION_DIAL`(다이얼 화면 — 전화 권한 없음) · 웹은 `ACTION_VIEW`.
- 같은 규칙을 JS(`isOpenableExternalUrl`) · iOS · Android(`ExternalLinkPolicy`)가 각각 가진다 — 표 EL1 · EL2. 끝 줄바꿈 · 유니코드 공백까지 셋이 같게 거른다(iOS `\z`, Java `UNICODE_CHARACTER_CLASS`).

## 버린 대안
1. **위기 카드 번호 · 주소를 글자로만** — 위기 안내는 누르면 바로 전화가 돼야 의미가 있다(사용자 결정).
2. **설정 탭에 생년** — 설정 화면에 대화 출처를 결선해야 해서 범위가 커진다. 대화 설정(결정 8) 작업 때 옮긴다.
3. **ui-lynx BottomSheet의 description 고치기** — 다른 소비자의 계약이 바뀌고 예산 여유가 없다. 이 시트만 내용 안에 그렸다.

## 대가
- 호스트 모듈이 하나 늘었다([호스트 모듈 표](README.md#호스트-모듈-표)). Android `registerModule` 가드 15 → 16(PR #411 `ChatStreamModule`과 함께 들어가면 17).
- ~~생년은 가짜 출처 안에만 있어 앱을 다시 켜면 다시 묻는다(서버 결선 때 `companion_save_profile`).~~ → 2026-11-17 기기 · 서버 저장으로 해소(아래 적용 기록).
- 연도 목록이 올해부터라 성인은 아래로 스크롤해야 한다. 목록이 처음에 고른 연도로 스크롤하지 않는다(사이드바에서 열 때).
- es · id · ja · vi 문구는 에이전트 번역이다 — 원어민 검토 전.

## 테스트
- unit: `safety-rules.unit.test.ts` SU-U1 ~ U8 · `external-link.unit.test.ts` SU-U9 ~ U11 · `chat-fixture-source.safety.unit.test.ts` SU-U12 ~ U15(red 11 → green) · HostTests `ExternalLinkModuleTests` EL1 · EL2 · JUnit `ExternalLinkPolicyTest`(red → green). 기존 MC-U19(스냅숏 키) · MC-UI22(사이드바 줄 1 ~ 7) 갱신.
- ui: `MessengerChatScreen.safety.ui.test.tsx` SU-UI1 ~ UI10 — 구현 뒤 썼다. 자동 시트 · 막힌 독을 일부러 끄면 다섯이 red가 되는 것을 확인했다.
- integration: `App.messenger-safety.integration.test.tsx` SU-I1 ~ I3(red moot). 기존 메신저 통합 테스트는 생년을 답한 씨앗으로 시작한다(`resetMessengerChatSource`).
- e2e(수동): [messenger-safety-ui.md](../e2e/messenger-safety-ui.md).

## 리뷰 (2026-11-11, review 에이전트)

FAIL → 반영: **C1** 새 탭 요소 네 곳에 `accessibility-enable-tap`이 없어 Android TalkBack으로 누를 수 없었다(위기 Call 포함) — 넣고 SU-UI11로 단언. W1 방 도중 막힘에서 열린 자리 접기(SU-UI13), W2 막힘 낭독, W3 하드코딩 색 → 토큰(`--libitum-color-white` · `--libitum-elevation-surface-floating`), W4 시간 상한 줄 · 언어별 시각 테스트(SU-UI8b · SU-U16 · U17), S1 URL 규칙 셋 맞춤, S2 열 수 없는 번호면 Call 숨김(SU-UI12), S3 문구(es 관사 · 성별 중립, 미성년자 고지 의미 통일, vi 「Để sau」), S4 지금 생년 골라 열기, S5 주석 위치. Android 에뮬레이터 e2e(2회차)에서 기기 결함 셋을 더 찾아 고쳤다 — 접근성 요소의 `flatten={false}`(없으면 Android 접근성 트리에서 사라진다), `UNICODE_CHARACTER_CLASS`(Android ICU가 거부해 Call이 죽었다 → `\p{Z}`), 시트 단추가 사라진 뒤 숨은 입력으로 옮겨 간 초점(겹침이 닫히면 다음 프레임에 내린다). 남은 것: 실기기 · 스크린리더 낭독.

- ⟨2026-11-12, PR #412 리뷰(Gemini)⟩ iOS가 인코딩되지 않은 유니코드 https 주소를 열지 못하던 것 → 퍼센트 인코딩해 다시 읽는다(EL1b). 위기 카드 Website 단추도 열 수 있는 꼴(https)일 때만 그린다(SU-UI12). main의 메신저 1.5(#410)에 맞춰 다시 얹었다 — 고지 · 위기 줄은 `ChatMessageRows`로, 씨앗 메시지 풀이는 `chat-fixture-safety`의 `seedMessageReader`로, 문구 타입은 `safety-copy.contract.ts`로.

## 재검토 조건
1. 서버(컴패니언)가 붙을 때 → notice · crisis 이벤트 · `companion_save_profile` · 연령 제한 판정을 결선하고 가짜 출처의 생년을 걷는다.
2. 대화 설정(결정 8)을 만들 때 → 생년을 설정 탭으로도 옮긴다.
3. ui-lynx BottomSheet description이 고쳐지면 → D2의 우회를 걷는다.

## 적용 기록

- ⟨2026-11-11, [ADR-0126](0126-messenger-chat-settings.md)⟩ 생년 고치기가 설정 탭 Chats 화면에도 생겼다(같은 `BirthYearSheet`, 닫을 수 있음). 시트가 닫힌 뒤 숨은 `<input>` 초점을 내리는 처방(D3 · 결함 3)은 겹침이 **다 닫힐 때만** 돌았다 — 사이드바에서 연 시트를 닫아 사이드바로 돌아오는 경우에도 Gboard가 떠, 「부모로 닫힘」이면 모두 내리도록 넓혔다. 사이드바 Story point · Get coins 줄(ADR-0113)에도 `flatten={false}`를 줬다.
- ⟨2026-11-17, fix/birth-year-server-save⟩ **생년 서버 결선**(재검토 조건 1의 생년 몫). 서버 모드(ADR-0137)가 붙은 뒤에도 생년은 출처 메모리에만 있어 앱을 다시 켤 때마다 시트가 다시 떴고, `companion_save_profile`은 내 모습 저장(ADR-0150)으로만 불려 생년이 늘 null이었다 — 운영의 모든 학습자가 「나이 모름」이라 ADR-0152의 「확인된 성인만」 완화가 아무에게도 걸리지 않았다.
  - 기기: 계정(출처 키)마다 `libitum.messenger.birth-year`에 set · skipped를 적고, 시작할 때 씨앗보다 먼저 읽는다(`chat-fixture-birth-year.ts`, `deviceBirthYearStore`).
  - 서버: 고르면 `companion_save_profile(p_birth_year, p_age_source = "self")`(나머지 칸 null = 그대로). 출처를 만들 때 `companion_load_profile`을 읽어 서버 생년이 있으면 그 값으로(다른 기기 · 재설치), 서버가 비었는데 기기에 생년이 있으면 다시 보낸다. 읽는 동안 고른 값이 이긴다.
  - 건너뜀은 서버에 적을 칸이 없어(생년 · 출처는 함께 null이어야 하고 null은 「그대로」) 기기에만 둔다 — 서버는 생년이 없으면 나이 모름(엄격)이라 뜻이 같다.
  - 턴(`chat-send`) · 사진 · 음성 요청은 진행 중인 생년 저장이 끝난 뒤 보낸다 — 서버가 받는 순간의 나이로 판정한다.
  - 마이그레이션 · 서버 함수 변경 없음. 테스트: BY-U1 ~ U9 · SA-U6 ~ U8 · BY-I1 ~ I2.
- ⟨2026-11-27, fix/age-picker-default⟩ **생년 시트가 처음 보이는 자리**(D2 개정). 사용자: 「연령 설정할 때 00이나 그냥 막 눌러도 문제없는 위치를 초기값으로 잡아야 할 듯」.
  - 문제: 목록이 맨 위(올해)에서 열려 처음 보이는 다섯 줄이 0 ~ 4세(2026 ~ 2022)였다. 대충 한 줄 누르고 Continue를 누르면 0세로 저장되고 연령 제한 줄에 막혔다.
  - 근거(운영 `companion.profiles`, 2026-11-27 SELECT, 개인 정보 없이 연도별 수만): 생년이 있는 2,921명 중 **2026년생 55명** — 바로 아래 2025 ~ 2022는 합쳐 10명, 2021 · 2019는 0명. 첫 줄에만 몰린 것은 실제 나이가 아니라 첫 줄 탭이다. 14세 미만(2013년생 이후) 120명 중 절반 이상(65명)이 처음 보이던 다섯 줄이다. 2013 · 2014(36 · 8명)는 앞뒤 연도와 이어져 실제 10대로 본다.
  - 결정: 고른 연도가 없으면 **목록 가운데 줄이 칸 가운데** 오게 연다(`birthYearScrollIndex` → `scroll-view`의 `initial-scroll-to-index`, 처음 열 때 한 번). 고른 연도가 있으면(사이드바 · 막힌 줄의 Change birth year) 그 연도가 칸 가운데. **어느 줄도 미리 고르지 않고** Continue는 고르기 전까지 꺼져 있다.
  - 법적 제약: COPPA 「중립 연령 확인」(FTC FAQ) — 성인 나이를 미리 채우거나 어리면 막힌다고 미리 알려 거짓 입력을 부추기지 않는다. 그래서 「성인 연도를 기본값으로 골라 둠」은 버렸다. 자리만 옮긴 것이라 값은 여전히 사용자가 직접 고른다. 문구는 바꾸지 않았다(14세 미만이라는 문턱을 시트에 드러내지 않는다).
  - 버린 대안: (1) 성인 연도(예: 2000)를 골라 둔 채 열기 — 위 COPPA 권고에 어긋난다. (2) 14세 미만을 고르면 「Born in 2015? 맞나요」 한 번 더 묻기 — 어린 사용자에게 문턱을 알려 거짓 입력을 부추길 수 있다(사용자 결정으로 남김). (3) 네 자리 숫자 직접 입력 — 「00」 · 한 자리 · 미래 · 100세 초과를 거르는 안내와 8개 언어 문구가 새로 들고, 목록이 이미 그런 값을 낼 수 없어 이득이 작다. (4) 0 ~ 4세 연도를 목록에서 뺌 — 첫 줄이 2021(5세)로 바뀔 뿐 대충 누른 탭이 여전히 어린 나이로 찍히고, 2026처럼 한눈에 가려지는 흔적만 사라진다.
  - 대가: 대충 누르면 이제 1976 근처(50세)가 찍힌다 — 막히지는 않지만 실제 나이도 아니다. 운영에서 1974 ~ 1978 줄이 튀는지 보면 같은 흔적을 다시 셀 수 있다.
  - 이미 찍힌 사용자: 운영 데이터는 바꾸지 않았다. 막힌 줄의 「Change birth year」와 방 사이드바 · 설정의 Birth year 줄로 스스로 고칠 수 있고, 서버(`companion_save_profile`)는 덮어쓰기를 받는다. 다시 묻기(예: 생년이 올해 ~ 4년 전이면 한 번 더 시트를 띄움)는 제안으로만 남겼다.
  - 테스트: unit SU-U9 · U10(`safety-rules.unit.test.ts`), ui SU-UI13 · UI14(`MessengerChatScreen.birth-year.ui.test.tsx`) — red(함수 없음 · 속성 null) → green. 기기: iOS 시뮬레이터(Host Debug + 시트만 그린 임시 번들)와 Android `assembleBundled`(Pixel 8 에뮬레이터)에서 고치기 전 2026 ~ 2022, 고친 뒤 1978 ~ 1974가 보이고 고른 줄 없음 · Continue 꺼짐, 위로 밀면 새 연도로 올라감을 확인했다.
- ⟨2026-11-27, feat/birth-year-no-skip⟩ **「Skip for now」를 걷는다**(D1 · D2 개정). 사용자: 「skip 빼야할거같아」.
  - 문제: 건너뛰면 `birth_year`가 null로 남아 서버는 「나이 모름」을 미성년처럼 다룬다. 반응 · 선톡 허용(`companion_proactive_context.allowed`)이 그때 나라 값까지 요구하는데 나라 값은 모든 사용자에게 비어 있어, 건너뛴 사람에게는 반응 · 선톡이 아예 오지 않았다. 운영(2026-11-27 SELECT, 수만): 나이 모름 4,342명 중 채팅한 사람 154명 — 대부분 건너뜀.
  - 결정: 시트 단추는 Continue 하나. 연도를 골라 Continue해야 대화가 시작된다. `ChatBirthYear`에서 `skipped`를, `setBirthYear`에서 null을, 문구에서 `skip` · `skipNote`(8개 언어)를 걷었다.
  - 닫는 길: 방을 열자마자 뜬 시트는 이제 **닫기 단추 · 바깥 탭도 연다** — 셋 모두 뒤로가기와 같이 답하지 않고 방을 나간다(방 목록으로). iOS에는 시스템 뒤로가 없어, Skip을 걷고 닫기도 없으면 연도를 고르는 것 말고 나갈 길이 없었다. 시트만 닫히고 방에 남아 입력이 열리는 상태는 없다. 사이드바 · 막힌 줄 · 설정 탭에서 연 시트는 그대로 닫으면 연 자리로 돌아간다.
  - 이미 건너뛴 사람: 기기의 옛 `{ kind: "skipped" }` 기록은 「적힌 것 없음」으로 읽는다(`parseBirthYear`) — 서버 생년이 있으면 그 값, 비어 있으면 unasked라 다음에 방에 들어올 때 시트를 다시 띄운다.
  - 옛 앱: Skip이 남아 있다. 서버는 바꾸지 않는다 — 옛 앱의 건너뜀은 그 기기에만 적히고 서버는 null 그대로라, 새 앱으로 업데이트한 뒤 방에 들어오면 다시 묻는다.
  - COPPA 중립 연령 확인은 그대로: 미리 고른 연도 없음 · 가운데 시작(위 11-27 개정) · 고르기 전 「어리면 못 쓴다」 · 나이 문턱 안내 없음. 걷은 skipNote(「under-18 settings」)가 오히려 문턱을 드러내던 문장이었다. 본문의 「you can change it later in chat settings」는 맞다(방 사이드바 · 설정 탭 Chats의 Birth year 줄, 「Not set」이면 누르면 시트).
  - 버린 대안: (1) **Skip 유지** — 건너뛴 사람이 반응 · 선톡을 영영 받지 못하고 본인은 왜인지 모른다. (2) **나중에 묻기**(Skip은 두되 몇 번째 대화 뒤 다시 시트) — 그동안 같은 결손이 이어지고 다시 묻는 시점 · 횟수 규칙과 기기 기록이 새로 든다. (3) 닫기 없이 뒤로가기만 — iOS에서 나갈 길이 없다.
  - 대가: 연도를 주기 싫은 사람은 대화를 시작하지 못한다(방 목록 · 학습은 그대로). 나이 모름 대신 대충 고른 연도가 늘 수 있다 — 가운데 시작이라 1974 ~ 1978 줄로 다시 셀 수 있다.
  - 테스트: unit BY-U1 · U4 · U9 · SU-U14 · GG-U6 갱신(BY-U3 · skipped 단언 삭제), ui SU-UI15 ~ UI19(Skip 없음 · X/바깥 탭/뒤로 = 방 나감 · 옛 skipped 기록이면 다시 뜸 · 사이드바에서 연 시트는 사이드바로) — red 7 → green, SU-UI3 · UI10 삭제. integration BY-I3(옛 기록 + 서버 null/값) · SU-I2(닫으면 목록 → 다시 열면 시트 → 연도 → 입력 줄) 갱신.
