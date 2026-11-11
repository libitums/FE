# ADR-0125 — 메신저 법 · 안전 UI: 첫 대화 전 생년 시트 · 로그 안 고지 줄 · 위기 안내 카드 · 막힌 입력 줄 · 호스트 `ExternalLinkModule`

- 상태: **채택 — 1단계(가짜 출처).** 서버 결선 0 · 분석 이벤트 0 · 저장 키 0. 호스트 모듈 하나 추가.
- 날짜: 2026-11-11.
- **사용자 결정**: 결정 문서 7번(2026-11-10, [AI 컴패니언 ↔ 메신저 UI 통합 결정](https://claude.ai/artifact/9BTvrL4GfTxvMrAUzwJr1x)) — 생년은 **첫 대화 전 시트 · 연도 목록**, 건너뛰면 18세 미만 기본값, 고지 셋은 **로그 안 가운데 회색 줄**, 위기는 로그 안 카드, 거절은 보통 말풍선, 막힘은 입력 줄 자리의 상태 줄. 시안 https://claude.ai/artifact/Fv6j9jxosmZ7VCb2oeL6eo(「괜찮네」). 2026-11-11: 위기 카드 단추는 **호스트 모듈을 새로**, 생년 고치기는 **방 사이드바 줄 + 연령 제한 줄 단추**(설정 탭은 대화 설정 작업 때).
- 이어받는 결정: [ADR-0113](0113-messenger-chat-ui.md)(대화 출처 포트 · 사이드바 · 겹침 — 적용 기록), [ADR-0017](0017-host-native-capabilities-and-audio.md) D1(호스트 모듈 입장 조건).
- 다루지 않는 것: 서버가 notice · crisis를 언제 보내는지(컴패니언 PRD §3.11), 연령 판정 · 미국 판정 · 보호자 동의, 설정 탭의 대화 설정, 거절 표시(보통 말풍선이라 변경 없음).

## 결정

### D1. 대화 출처 포트에 넷을 더한다 (추가만)
- 메시지 `notice { notice: ai-disclosure | minor-notice | break-reminder }` · `crisis { resources: [{ name, phone, url, hours }] }`(없는 칸 null).
- 방 `inputBlock`: `temporarily-blocked { until }` · `usage-time-limit { resetsAt }` · `age-restricted` · null.
- 목록 스냅숏 `birthYear`: `unasked` · `skipped` · `set { year }`, `setBirthYear(year | null)`(null = 건너뜀).
- 가짜 출처: 기본 씨앗은 그대로라 **앱을 다시 켜면 생년이 unasked**로 돌아간다(1단계 가짜 데이터와 같은 성질). 테스트 · 확인용 씨앗이 고지 · 위기 · 막힘 · 생년을 줄 수 있다.

### D2. 생년 시트 — 방을 열 때 unasked면
- 연도 목록(올해 → 100년 전, 101개, 새 연도가 먼저). 처음엔 아무것도 안 골라져 **Continue가 꺼져** 있다. 시트 단추 둘: Continue(주) · Skip for now(보조), 목록 아래 「건너뛰면 18세 미만 설정」 안내.
- 방을 열자마자 뜬 시트는 닫기 단추 · 바깥 탭이 없고, **시스템 뒤로 = 답하지 않고 방 나가기**(다음에 또 묻는다). 사이드바 · 막힌 줄에서 연 시트는 닫을 수 있고 닫으면 연 자리로(사이드바는 사이드바로) 돌아간다.
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
- 생년은 가짜 출처 안에만 있어 앱을 다시 켜면 다시 묻는다(서버 결선 때 `companion_save_profile`).
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
