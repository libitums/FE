# 수동 e2e — 메신저 법 · 안전 UI (ADR-0125)

가짜 출처의 기본 씨앗에는 고지 · 위기 · 막힘이 없으므로 임시 확인 화면(방 하나를 씨앗 다섯으로 6초마다 바꿔 그림)으로 본다. 확인 뒤 지운다.

| id | 확인 | 기대 |
|---|---|---|
| SU-E1 | 생년 unasked 방 | 방 위 시트 — 제목 · 설명 · 연도 목록 · 안내 · Continue(꺼짐) 위 Skip |
| SU-E2 | 고지 · 위기 방 | 회색 고지 줄(미성년자 · 휴식) · 위기 카드(Call · Website 단추) |
| SU-E3 | 막힌 방 셋 | 일시 차단(풀리는 시각) · 하루 시간 상한 · 연령 제한(Change birth year) |
| SU-E4 | 위기 Call · Website 누르기(실기기) | iOS 전화 확인 창 · Android 다이얼 화면, 웹은 브라우저 |
| SU-E5 | 스크린리더 · 큰 글자 | 시트 연도 「…, selected」, 고지 문장, 단추 이름 「Call {기관}」 |

## 실행 기록

### 2026-11-11 — iOS 시뮬레이터 SU-E1 ~ E3 통과(1회차 결함 하나 고침), Android 미확인

- iPhone 17 Pro 시뮬레이터, 이 브랜치 Host.app.
- **1회차 결함**: 생년 시트 설명이 그려지지 않았다(제목 아래 빈칸). ui-lynx BottomSheet가 description을 시트 안 `scroll-view`에 두어 높이가 서지 않았다 → 설명을 내용 안에 직접 그렸다. 같은 회차에 Skip이 Continue 위에 있어 시안과 달랐다 → Skip을 시트의 둘째 단추로 옮겼다. 2회차에서 둘 다 고쳐진 것을 봤다(제목 아래 작은 빈칸은 ui-lynx 머리 여백으로 남음).
- SU-E2 · E3: 고지 줄 · 위기 카드(Hopeline PH `Call +63 2 8804 4673` · Website, 두 번째 기관은 Website만) · 막힌 줄 셋(「Chat paused until 3:06 PM」, 하루 시간 상한, 연령 제한 + Change birth year)이 시안대로 섰다.
- **Android(1차)**: 디버그 앱 + 원격 번들(`--es bundle-url`)은 실제 앱조차 실행 배경(주황) 위에 그려지지 않았다 — 확인 화면 문제가 아니라 그 경로의 문제다. 아래 2회차는 `assembleBundled`로 갔다.
- SU-E4 · E5: 실기기 · 스크린리더 미실행.

### 2026-11-11 (2회차, 리뷰 반영 뒤) — Android 에뮬레이터 SU-E1 ~ E4 통과, 기기 결함 셋 고침

- Pixel_8 에뮬레이터(읽기 전용), `assembleBundled`(번들을 APK에 넣음), 실제 앱을 손님으로 시작 → 메신저 탭. 가짜 출처의 기본 씨앗을 잠시 바꿔(미나 방에 고지 · 위기, 사장님 방에 연령 제한) 빌드했고, 씨앗은 되돌렸다.
- **결함 1 — 접근성 트리에서 사라짐**: 고지 줄 · 위기 Call · Website · 연도 줄이 화면에는 서는데 Android 접근성 트리에 없었다. Lynx가 요소를 납작하게(flatten) 만들어 지운 것 → 접근성 요소에 `flatten={false}`([ADR-0040](../adr/0040-android-e2e-maestro.md)와 같은 처방). 그 뒤 「2024」 · 「2024, selected」 · 「Call Hopeline PH」 · 「Open Hopeline PH website」가 클릭 가능으로 나왔다. 연도 스크롤 칸의 낭독 이름은 안의 줄을 묶어 숨겨 지웠다.
- **결함 2 — Call이 아무 일도 안 함**: `ExternalLinkPolicy`의 `Pattern.UNICODE_CHARACTER_CLASS`를 Android 런타임(ICU)이 받지 않아 모듈 초기화가 던졌다(JVM 단위 테스트는 통과). → `\p{Z}`를 문자 집합에 직접 넣었다. 그 뒤 Call → 다이얼 화면(「+63 2 8804 4673」 채워짐), Website → Chrome.
- **결함 3 — Skip 뒤 휴대폰 키보드**: Skip(입력 칸 위에 겹친 자리)을 누르면 사라진 단추 다음 초점 후보인 숨은 `<input>`이 초점을 받아 Gboard가 떴다. → 겹침이 닫힌 다음 프레임에 휴대폰 모드가 아니면 그 초점을 내린다. 그 뒤 `mInputShown=false`.
- SU-E3: 사장님 방 연령 제한 줄 · Change birth year → 지금 생년(2024)이 골라진 시트 · 시스템 뒤로 → 막힌 줄.
- 남은 것: 실기기 · TalkBack · VoiceOver 낭독(SU-E5), iOS 실기기 Call.
