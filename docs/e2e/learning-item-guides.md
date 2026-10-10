# 학습 문항 첫 열기 안내 — 처음 열 때 한 번 뜨고, 뒤 화면은 안내가 닫힐 때까지 움직이지 않는가

학습 단원 여섯 종류(문장 만들기 · 메신저 · 전화 · 비주얼 노벨 · 말하기 · 쓰기)를 **이 기기에서 처음 열 때** 뜨는 오버레이 안내(작업 `learning-item-guides`)를
**기기에서 본다.** 판정 규칙(어느 문항이 대상인가 · 저장값 해석)은 unit이, 표시 · 가림 · 정지 · 닫기의 렌더 결과는 ui · integration이 진다.
이 문서는 **테스트 환경에 없는 것**만 진다 — 스크림이 상단 띠 · 하단 띠까지 실제로 덮는가, 스크림 아래의 `×` · 조각 · `Accept` · `Next` · `Speak` · `Skip` · 쓰기 캔버스가 **실제로 눌리거나 그려지지 않는가**
(테스트 환경에는 hit-test가 없다), 전화 벨이 떠 있는 동안 **실제로 안 울리는가**, 시스템 뒤로가기, 앱을 강제 종료한 뒤의 저장, 상태바 아이콘 명암, 0.8 스크림의 **합성색 픽셀**.

항목 정본은 작업 `learning-item-guides`의 test-plan `## e2e`(E1 ~ E13)와 `## r02`(E1 · E9 고침, E14 ~ E16 신규), `## r03`(E10 대체, E10-r · E10-l · E10-i · E17 신규, E13 · E14 · E15 고침), `## r04`(E18 신규 — iOS 시뮬레이터 최소 확인, E10-l 판정 고정)이고,
계약은 `spec.md`(§3.4 표시 중의 동작 · r02.2 확정 문구 · r02.3 스크림 0.8 · **r03 배타 포커스 · 안전 영역 · 바탕 판**), 시각 값은 `design.md`(§1.3 대비 계산표 · §1.4 바탕 화면별 판정)와 `spec.md` r03.5(판 색 · 합성 · 잔상 대비 계산)다.
TalkBack 낭독을 실제로 켜고 발화 글자를 캡처한 방법과 그 관찰은 접근성 단계의 `accessibility.md`가 정본이다. 결정과 받아들인 대가는 `docs/adr/0054-learning-item-guides.md`(documentation 단계가 신설)가 진다. 이 문서는 **절차**다.

## 실행 상태

**r03 판(2026-10-09)**: 접근성 단계가 격리 실패(A1, Critical)를 찾은 뒤 계약이 r03으로 다시 고정되어(안내 내용 상자에 `accessibility-exclusive-focus` · 안쪽 글자 셋 `accessibility-element={false}` · 안전 영역 padding · 글자 뒤 바탕 판), 이 문서의 E10을 발화 글자 캡처 방식으로 다시 쓰고 E10-r · E10-l · E10-i · E17을 더했으며 E13 · E14 · E15를 고쳤다. **r03 케이스는 같은 날 정식 재실행이 기기에서 돌렸다**(아래 「r03 케이스」 — 판정 **passed**, 닿지 못한 것은 통과가 아니다). 아래 첫 실행 표와 「실행 결과」의 2026-10-08 행은 r02 절차의 기록이라 그대로 둔다.

**iOS — E18(2026-10-09)**: iOS에서 처음 돈 케이스다. 시뮬레이터 한 대 · dev playground 번들 · 전화 한 종류의 최소 확인이고, (a) ~ (d) **통과**, (e) 벨 **미실행**이다. 결과와 남은 것은 아래 「E18 — iOS 시뮬레이터 최소 확인 결과」. VoiceOver · 다른 다섯 종류 · 실기는 여전히 미실행이다.

**r03 재실행(2026-10-09)**: 실행 HEAD `54c650f0`(`learning-shell-large-font`가 학습 껍데기를 바꾼 뒤의 번들 — 모의 값으로 일회용 사본에서 빌드, sha256 `0155b68abae550516a552d62dcc19beb4b4ee5ed6f10e86bdb411b82af698e69`, 끝날 때 메인 워크트리 HEAD는 `acc6bbeb`로 움직여 있었다). emulator-5554(Pixel_8, API 37, 1080x2400, 420dpi, 제스처 내비), TalkBack 17. 서버 18790(종료), 3000 포트는 건드리지 않음. 호스트 · 계측 APK는 기기에 있던 것을 썼다(재빌드 없음). 관찰한 범위의 제품 결함 0, 이미 알려진 N1 · N2의 재현만 있다. 기본 글꼴에서 학습 껍데기 변경 뒤에도 동작이 불변인지(E1 ~ E3 · E6 · E7 · E16)도 같이 본 셈이다. 기록: `.agent-harness/work/learning-item-guides/e2e-run-r03.md`, 증거 `.agent-harness/work/learning-item-guides/artifacts/e2e-r03/`. 이 재실행이 절차 결함 여덟 건을 찾아 이 판이 고쳤다(아래 「r03 재실행에서 고친 것」).

**첫 실행: 2026-10-08, Android 에뮬레이터 한 대(emulator-5554, Pixel_8, API 37, 1080x2400, 420dpi, 제스처 내비게이션), 구현 뒤 번들(`5782bacd`).** iOS는 실행하지 않았다.
이 문서의 앞선 판은 기기를 쓰지 않고 쓴 것이었고, 첫 실행이 11건의 결함을 찾아 이 판이 고쳤다(결함별 처리는 아래 「첫 실행에서 고친 것」).
**이 판의 고친 부분(색 중심 Start 탐색 · `Back to map` 경로 · 앵커 기준 노드 좌표 · `mCurrentFocus` 판정 · `static` 링크 · `screenrecord` 프레임 판정)은 기기에서 다시 돌리지 않았다** — 첫 실행의 관찰을 문서에 옮긴 것이다. 다시 돌린 것은 아래 「이 판에서 확인한 것」뿐이다.
값에 붙은 「실측(2026-10-08)」은 그 실행의 관찰이고, 「유도」는 여전히 코드에서 읽은 것이다.

| 항목 | 무엇 | 기기 | 판정 방식 | 결과 (첫 실행, 실행 기록 그대로) |
|---|---|---|---|---|
| E1 | 종류 여섯의 첫 열기에서 안내가 뜬다 · 확정 문구 · 잘림 없음 | Android · iOS | 눈(문구 한 글자씩) + 픽셀(`textbox`) | Android **통과 6/6** · iOS **미실행** |
| E2 | 스크림이 상단 띠 · 하단 띠까지 화면 전체를 덮는다 · 말하기에서 안 잘린다 | Android · iOS | 픽셀(`covered`) + 눈 | Android **통과 6/6** · iOS **미실행** |
| E3 | 스크림 아래 조작부를 눌러도 안내만 닫힌다 (+ 닫은 뒤 효과음 복원) | Android · iOS | 픽셀(닫은 화면과 `diff`) + logcat 호출 수 + 눈 | 필수 자리 **통과 6/6**(Android). 보탤 자리(`×` · `Check` 첫 탭 · `Skip` 첫 탭 · 전화 나가기) **미실행**. E3b **통과 2/2**. iOS **미실행** |
| E4 | 전화: 떠 있는 5초 동안 벨이 없고 닫는 순간부터 울린다 | Android · iOS | logcat + `dumpsys audio` (Android) / 귀 (iOS) | Android 기계 **통과**(`ring_bell` 떠 있는 동안 0 · 닫은 뒤 1). 귀 **미실행**. iOS **미실행** |
| E5 | 메신저: 닫은 뒤에 첫 메시지가 타이핑으로 나타난다 | Android · iOS | 픽셀(`diff` 0) + 눈(`screenrecord` 프레임) | **부분** — 안내 중 정지는 통과, 「타이핑 시작」은 **판정 불가**(0.4초 캡처가 늦었다). iOS **미실행** |
| E6 | 시스템 뒤로가기 한 번은 안내만, 두 번째가 화면의 닫기 | Android (제스처 · 3버튼) | logcat + `dumpsys activity` + 눈 | **통과**(말하기 3버튼 · 말하기 제스처 · 비주얼 노벨 제스처 모드 키). 비주얼 노벨 3버튼 **미실행** |
| E7 | 닫은 뒤 다시 열어도 · 같은 종류의 다른 단원 · 앱을 다시 켜도 안 뜬다 | Android · iOS | 저장 파일 읽기 + 눈 | **부분** — 말하기의 다시 열기 · 강제 종료 뒤 재시작 통과. 「같은 종류의 다른 단원」 **닿지 못함**. iOS **미실행** |
| E8 | 안내가 뜬 채 강제 종료하면 다시 뜬다 | Android · iOS | 저장 파일 읽기 + 눈 | Android **통과**(말하기만). iOS **미실행** |
| E9 | 떠 있는 동안 밝은 아이콘, 닫으면 복귀(비주얼 노벨은 계속 밝음) · 상단 띠 색 | Android | `dumpsys window`의 `apr=` + `sbpng.py` | **통과 6/6**(말하기의 닫은 뒤 `apr`는 따로 재지 않았다) |
| E10 | 낭독기의 첫 포커스 · 뒤쪽 격리 · 닫은 뒤 복원 | Android (TalkBack) · iOS (VoiceOver) | 접근성 트리 덤프(Android) / 사람의 낭독 | Android **판정 불가**(TalkBack을 켜면 덤프가 루트 노드 하나 — 이 절차로는 불가, accessibility 단계로 넘김). iOS **미실행** |
| E11 | 대상이 아닌 문항에서 새 안내가 없다 · 새 사용자의 첫 단원 기존 안내는 그대로 | Android · iOS | 눈 + 저장 파일 읽기 | **부분** — 듣기 · 두 조각 문장 만들기(`Making plans`) 통과, (b)는 E16과 같은 실행으로 통과. 조각 3개 문항 · `directions` · 최종 테스트 · 첫 단원 서사 캡처는 **닿지 못함 / 미실행**(조각 3개 문항은 r03 재실행이 `Ordering`으로 확인). iOS **미실행** |
| E12 | 로그아웃 → 다시 들어와도 닫은 종류는 안 뜬다 | Android | 저장 파일 읽기 + 눈 | **통과**(세션 재심기 대체 — 소셜 로그인 왕복은 보지 않았다) |
| E13 | 글꼴 배율 최대 · 폭 360dp 이하에서 여섯 안내가 안 넘친다 | Android · iOS | 픽셀(`textbox`) + 눈 | **부분**(말하기 1종 — 넘침 없음, 겹침 지적 있음). 다른 다섯 종류 · iOS **미실행** |
| E14 | 스크림 합성색이 계산값(`#48494D` 부근)과 맞는다 | Android (iOS 선택) | 픽셀(`flat` · `expect`) | Android **통과 5/5**(비주얼 노벨은 눈). iOS **미실행** |
| E15 | 안내 글자가 뒤의 카드 글자와 겹쳐 읽기 어렵지 않다 | Android · iOS | 눈 (캡처 첨부) | **지적 첨부**(판정 아님) — 아래 「지적」. iOS **미실행** |
| E16 | 기존 첫 단원 안내는 여전히 0.6(`#767779` 부근) | Android | 픽셀(`flat` · `same`) | **통과** |
| iOS 전체 | 위 모든 항목의 iOS 쪽 | iOS 시뮬레이터 | — | **미실행** — Android를 끝낸 뒤 시뮬레이터 준비 · 빌드에 쓸 시간이 없었다 |
| E1~E3 구현 전 대조 | `WHICH=before`로 같은 절차 | Android | — | **미실행**(E16만 구현 전 번들과 견줬다) |

**미실행 · 미확인 · 도달 실패는 통과가 아니다.** 같은 날 맨 아래 「실행 결과」를 함께 고쳤다. 제품 결함(계약과 다른 동작)은 관찰한 범위에서 없었다.

### r03 케이스 — 재실행 결과 (2026-10-09, `54c650f0` 번들, Android)

| 항목 | 무엇 | 기기 | 판정 방식 | 결과 (r03 재실행) |
|---|---|---|---|---|
| **E10**(대체) | 여섯 종류에서 (a) 첫 발화가 안내 하나 (b) 오른쪽 쓸기 6 · 왼쪽 쓸기 2에 뒤 화면 이름 0건 · 안쪽 글자가 따로 안 읽힘 (c) 뒤 조작부 터치 탐색에도 초점이 안내에 (d) 두 번 탭으로 닫힘 · 기록 (e) 닫은 뒤 쓸기 4에 뒤 화면 이름이 다시 나옴 | Android(TalkBack) | 발화 글자 띠 + 초점 테두리 상자 | **말하기 통과** — 새로 시작, (a)~(c)·(d0) 11걸음 모두 발화가 `Try it, or skip it. Tap Speak and read the sentence out loud, or tap Skip if you're not ready. Tap anywhere to continue. Button` 한 덩어리, 초점 테두리가 판(x 76~1004 y 838~1630)에서 안 움직임(쓸기 8 · 터치 탐색 `×`), 뒤 화면 이름 0건. (d) 두 번 탭 → 닫힘 · `["speaking"]`. (e) `0-day streak` → `0` → `0 trophies` → `0` → `Notifications. Button` 복원. **전화 통과** — 발화 `Reply with a tap. Tap Accept and listen. You don't need to speak, so just tap your reply when it's your turn. Tap anywhere to continue. Button`가 11걸음 불변, 테두리 판(y 808~1660) 안(뒤로가기 버튼 터치 탐색 포함). (d) 닫힘 · `["phone-call"]`. (e) `A Call from Minseo` → `Voice call, Minseo` → `Voice Call` → `Minseo` → `Incoming call…`. **나머지 네 종류 미실행**(접근성 단계 r03의 여섯 종류 실측 인용) |
| **E10-r**(신규) | 말하기에서 (a)→(d)→(e)를 설치 초기화부터 세 번 거듭하고 맵까지 가서 맵이 읽히는가 | Android | 같음 | **통과** — 매회 (a) 안내 한 덩어리 · (d) 닫힘 · (e) 같은 맵 요소 4개 순서대로 복원. 셋째 뒤 `×` → 확인창 `Leave` → 맵: 쓸기 4번이 `Episode intro` → `Your First Hello, completed. Button` → `Your First Hello` → `Asking names, completed. Button` — 맵이 읽힘, 안내 문구 안 읽힘 |
| **E10-l**(신규 · 관찰) | 말하기: TalkBack을 끈 채 안내를 띄운 뒤 켜고 오른쪽 쓸기 6 | Android | 같음 | **지적(기존 동작).** 첫 발화 `TalkBack on`, 쓸기 1 · 2번이 뒤의 머리 묶음 `Detected: Text, "Lesson 1/1`(테두리 y 310~576)과 카드(y 768~1632)로 새고, 3 · 4번이 `Skip` 자리(`Double-tap to activate`, 이름 없음), 5번이 안내로 돌아옴. 접근성 단계 N1과 같은 모습. **계약 r04(S4)가 정했다 — 「앱이 뜬 뒤 TalkBack을 켜도 격리될 것」은 반증됐고(accessibility-r03 N1 · e2e-r03), 원인은 앱 전체의 기존 동작(앱이 뜬 뒤 켜면 Lynx 낭독 트리가 서지 않는다)이며 판정은 「지적(기존 동작)」이다.** FAIL로 닫지 않음 |
| **E10-i**(신규) | VoiceOver로 말하기 · 전화의 (a)~(e) | iOS | 사람의 낭독 / Accessibility Inspector | **미실행 — iOS를 쓰지 않았다.** 통과가 아니다 |
| **E13**(고침) | 글꼴 2.0 여섯 종류의 **판**이 띠 안 · 폭 342dp에서 좌우 16dp 이상 · 글꼴 2.0 + density 540의 메신저 · 전화를 r02 캡처와 견줌 | Android · iOS | 판 상자(`guidepx.py panel`) + 눈 | **(1) 통과(지적 1)** — 글꼴 2.0, 판이 화면 안: 말하기 · 쓰기 · 전화 y 431~2037, 문장 만들기 341~2127, 메신저 278~2186(도구는 아래에 붙은 같은 색 버튼까지 읽어 2273을 냈다 — 눈으로 보정), 비주얼 노벨 글자 상자 y 523~1966(판 윤곽은 눈). 모두 상단 띠 132 아래 · 하단 손잡이 위. 닫는 법 줄이 판 안에 온전. 폭 930px(354dp), 좌우 75px. **(2) 통과** — 900x2000: 판 폭 816, 좌우 42px씩(= 16dp). 글꼴 2.0 + 900x2000 말하기: 판 x 42~857 · y 115~1931, 좌우 42px. 두 경우 모두 `calc(100% − 16 − 16)`이 선다. **(3) 기록(r02보다 낫다)** — 글꼴 2.0 + density 540(폭 320dp). 전화: 판 x 54~1025 · y 132~2318(좌우 54px = 16dp), 제목 · 설명 · 닫는 법 줄 모두 판 안(닫는 법은 두 줄로 접힘). 메신저: 같은 판, 닫는 법 줄 온전하나 **화살표가 설명 마지막 줄 `and send.`의 `s` 위에 겹침**(접근성 N2 재현 · 제품 변경 없이는 안 사라짐). r02는 화면 밖 잘림이었으므로 나빠진 것은 없다. iOS 미실행 |
| **E14**(고침) | 스크림 합성색 — 재는 자리가 **판 밖**인지 먼저 확인 | Android | `panel`의 밖 예시 좌표 + `expect` | **통과 5/5 · 비주얼 노벨 눈** — 판 밖 좌표 (539,727)(전화는 그림 위라 (100,1750)): 문장 만들기 `#48494D`, 말하기 · 쓰기 `#48494C`, 메신저 `#48494D`, 전화 `#47474B`. 기대 ±1 이내(허용 ±6). 같은 좌표의 닫은 캡처는 `#FFFDFC` · `#FFFFFF` · `#FAF7F4`(면 위를 쟀다는 증거) |
| **E15**(대체) | 판 안에서 뒤 화면 글자가 안내 글자와 겹쳐 읽히지 않는다 — 판 안 잔상 대비 1.05:1 부근 | Android · iOS | `ghost` + 눈 | **통과** — 아래 「판 실측」의 잔상. 사람 판정: 전화의 `Minseo` · 말하기의 `안녕하세요` · 쓰기의 `내일 만 _요` · 문장 만들기의 `안녕하세요`가 판 안에서 안내 글자와 겹쳐 읽히지 않음(가까이 보면 윤곽만 남음). r02(`E1-*` 첫 실행)의 겹침은 사라짐. iOS 미실행 |
| **E17**(신규) | 판 색 `#1F2124` ±6 · 둥근 모서리 · **폭 360dp 부근의 좌우 여백** · 글자 대비 15:1 이상 | Android | `panel` · `contrast.py` | **통과** — 아래 「판 실측」 |
| E1 | (안내 구조가 바뀌어 다시 돌림) | Android | 눈 + `textbox` | **통과 6/6** — 여섯 종류 모두 문구가 r02.2 표와 한 글자씩 일치(눈). `textbox` PASS 6/6(글자 x 148~931 안). 닫은 뒤 `seen_read`가 그 종류를 담음. 캡처 `E1-<종류>-guide.png` |
| E2 | 〃 | Android | `covered` + 눈 | **통과 5/5 · 비주얼 노벨 눈** — `covered` 상단(400,70) · 하단(200,2380) PASS: 학습 셸 `#48494C`(최대 채널 76), 전화 `#47474B`, 메신저 `#48494C`. 안전 영역 padding이 생겨도 스크림은 띠까지 덮음. 비주얼 노벨은 번짐(그림 위)으로 도구가 FAIL을 내지만 눈으로 상단 · 하단이 어둡게 덮임(`#1C1C1E`) |
| E3 | 〃 | Android | `diff` + logcat | **통과 4/4** — 말하기 `Speak`(`requestPermissions` 0, 권한 창 없음) · 전화 `Accept`(`accept_call` 0) · 문장 만들기 조각(`SoundEffectsModule` 0) · 말하기 **판 가장자리**(x 87, y 1234 — 판 안): 닫힌 화면과 `barscan diff` 0행, 안내만 닫힘, `seen_read ["speaking"]`. 보탤 자리(`×` · `Check` · `Skip` · 전화 나가기) 미실행 |
| E4 | 〃 | Android | logcat + `dumpsys audio` | **통과(기계)** — `ring_bell` 떠 있는 5초 동안 0, 닫은 뒤 1. 플레이어 줄 수 15 / 15 / 18. 5초 뒤 캡처와 처음 캡처 `diff` 0행. 귀 미실행 |
| E6 | 〃 | Android | logcat + `dumpsys activity` + 눈 | **통과(말하기, 제스처 모드 키)** — 뒤로가기 한 번: 닫은 화면과 `diff` 0행, `respond` 1, 앱 안 나감, `seen ["speaking"]`. 두 번째: 나가기 확인창(`E6-speaking-back2.png`). 3버튼 · 비주얼 노벨 미실행 |
| E7 | 〃 | Android | 저장 파일 읽기 + 눈 | **통과(말하기)** — 나갔다 같은 단원을 다시 열기 · 강제 종료 뒤 재시작: 안내 없음, `StorageModule.set` 0, `seen_read` 전 · 후 동일. 같은 종류 다른 단원 미실행 |
| E11 | 〃 (Ordering 포함) | Android | 눈 + 저장 파일 읽기 | **통과** — 아래 「Ordering 노드의 사실」. 맵 `Ordering` 열기: 안내 없음, `seen_read (none)`. `Making plans`: 안내 없음, `(none)`. 듣기 · `directions` · 최종 테스트 · 첫 단원 서사 미실행 |
| E16 | 〃 | Android | `flat` · `same` | **통과** — M2 `#767678` 평평한 면 1518점, M3 `#767779` 1676점(r02와 같은 점 수), `seen_read (none)`. D7은 도구가 평평한 면을 못 찾음(보탤 항목 — 판정 안 함) |
| E5 · E8 · E9 · E12 · E3b | | | | **미실행** — 이번 요청의 우선순위 밖 |
| iOS 전체(E10-i 포함) | | iOS | | **미실행**(이 재실행에서). 그 뒤 E18만 돌았다 — 아래 |

### E18 — iOS 시뮬레이터 최소 확인 결과 (2026-10-09, `aaa58aad` 번들, iOS)

실행 commit `aaa58aad878382c52b6a5d5d9671b203505008e9`. 기기는 이 작업 전용으로 새로 만든 iPhone 17 Pro 시뮬레이터(iOS 26.5, Xcode 26.6)다. [성능 보고서](../performance/reports/learning-item-guides-iphone-17-pro-simulator-01.md)의 회차 여섯이 끝난 뒤, 같은 시뮬레이터 · 같은 Release Host(`com.libitum.host`) · 같은 dev 서버의 `playground.lynx.bundle`(`current = "tutorial-call"`)로 **`--performance-capture` 없이** 실행했다.
도구는 `simctl io screenshot`과 `idb ui tap` · `idb ui describe-all`이다. 좌표는 포인트(402x874), 캡처는 @3x다. 기록은 `.agent-harness/work/learning-item-guides/artifacts/e2e-ios.md`, 캡처 · 트리는 같은 폴더의 `e2e-ios/`에 있다.

| 항목 | 판정 | 근거 |
|---|---|---|
| (a) 뜬다 | **통과(눈)** | `E18-A.png`에 판 · 제목 `Reply with a tap` · 설명 · 주황 화살표 · `Tap anywhere to continue`가 보이고 잘리지 않는다. B에는 없다. 설명 문구를 계약 r02.2와 **한 글자씩 대조하지는 않았다**(눈으로만) |
| (b) 전체를 덮는다 | **통과** | 표본점 (20,20) · (382,20) · (20,866) · (382,866)이 A에서 네 점 모두 RGB (71,72,74)(채널 합 217, 점끼리 차 0), B에서 모두 (250,247,244)(합 741)다. 상단 상태바 띠와 하단 홈 표시줄 띠까지 어둡다. 성능 회차 A1 ~ A3 · 예비의 스크린샷도 같은 값이다 |
| (c) 탭으로 닫힌다 | **통과** | `Accept` 자리 (201,728) 탭 → 1.5초 뒤 안내가 없고 `Incoming call…` · `Accept`가 그대로다. 통화가 시작되지 않았고, 트리에도 통화 요소가 없다. 앱 컨테이너 plist에 `["phone-call"]`이 생겼고, 다시 실행하면 안내가 뜨지 않는다(`E18-A-relaunch.png`). 기록은 탭 직후 1.5초에는 디스크에 아직 없었고 나중에 보였다(쓰기 지연) — 재실행으로도 확인했다 |
| (d) 접근성 트리 | **통과** | `idb ui describe-all`이 Lynx 요소를 낸다(B 트리: `Back to map` · 제목 · `Voice call, Minseo` · `Incoming call…` · `Accept`). 안내가 뜬 A 트리는 셋이다 — Application · `Back to map` · label이 `Reply with a tap. … Tap anywhere to continue`인 Button 하나. **`Accept`가 없다**(제목 · 통화 정보도 없다). 닫은 뒤 트리에는 `Accept`가 **돌아오고** 안내 label이 없다 |
| (e) 벨 | **미실행** | 에이전트는 시뮬레이터의 소리를 듣지 못한다(기계 판정 없음) |

- **사실 — 안내가 뜬 A 트리에 `Back to map` 버튼(16,74 56x56)이 남아 있다.** 계약의 (d)는 `Accept`만 판정하므로 판정에 쓰지 않았다. iOS 격리의 주 수단인 화면 루트의 `accessibility-elements-hidden`이 그 버튼을 가리지 못하는 것으로 보인다 [추론].
  - 이 트리는 VoiceOver가 꺼진 상태의 idb 트리다. iOS의 배타 포커스는 VoiceOver가 돌 때만 일하므로, VoiceOver에서 쓸기가 그 버튼에 닿는지는 **모른다.**
  - 그래서 **출시 조건 i1의 확인 대상으로 넘겼다**([iOS 출시 확인 목록](ios-release-checks.md) i1).
- **E18이 닫지 않는 것**: VoiceOver 낭독 · 첫 초점 · 두 번 읽힘 · 배타 포커스와 그 복원(시뮬레이터에 VoiceOver가 없다), 전화 밖의 다섯 종류, 제품 `main` 번들 · 로그인 뒤 경로, 실기(노치 · 홈 표시줄 · 터치 지연 · 스피커), (e) 벨, 설명 문구의 글자 단위 대조.
- **절차 결함** — E18 실행 당시의 `ios_seen_read` · `ios_seen_clear`(시뮬레이터 수준 `defaults` 방식)는 **앱이 쓴 기록**에 듣지 않았다. 지금 문서의 두 함수는 컨테이너 plist 방식으로 고쳤다(아래 「저장 기록 읽고 지우고 심기」의 주 — 고친 함수는 기기에서 미실행). E18-A는 다섯 번 돌렸다.
  - 첫 시도에서 안내가 뜨고 닫혔으나 기록을 당시의 `ios_seen_read`로 읽지 못했다.
  - 그 뒤 세 시도는 지운 기록이 cfprefsd 캐시에 남아 안내가 뜨지 않았다. 결과로 쓰지 않았다.
  - **시뮬레이터를 끄고 → 컨테이너 plist의 키를 지우고 → 다시 켠 다섯 번째**가 위 판정의 정본이다. 첫 시도의 캡처는 덮어썼다.
  - 성능 회차와 E18-B의 심기 · 지우기(`simctl spawn … defaults`)는 앱이 아직 기록을 쓴 적 없는 상태에서 했고, 그때는 들었다.

### 판 실측 (r03 재실행)

| 조건 | 판의 폭 | 좌우 여백 | 판의 y | 판 색 mode |
|---|---|---|---|---|
| 1080x2400(411dp) 여섯 종류 | 930px = 354.3dp | 75px | 말하기 838~1630 · 그 밖 807~1661(비주얼 노벨은 눈) | `#1E2025`(기대 `#1F2124` 대비 채널당 1) |
| 945x2100(360.0dp) 말하기 · 전화 · 메신저 | **861px** | **42px씩(16dp)** | 649~1503 | `#1E2025` |
| 900x2000(342.9dp) 말하기 · 전화 · 메신저 | 816px | 42px씩 | 596~1450(메신저 551~1495) | `#1E2025` |

- 모서리: 네 귀 모두 둥글다 — `panel` 위 · 아래 깎임 59px(비주얼 노벨은 도구가 아래를 못 가려 눈으로 확인).
- 글자 대비(`contrast.py`, 판 색 기준): 제목 · 닫는 법 **16.30:1**, 설명 **15.33:1**, 전화 제목 17.02:1(뒤가 어두운 곳), 비주얼 노벨 15.48 ~ 17.06:1. r02의 8.46:1 이상에서 올랐고 15:1 기준 충족.
- 잔상(판 안 · 글자 둘레 4px 밖의 최대 대비): 말하기 1.047, 전화 1.047, 문장 만들기 1.046, 쓰기 1.029, 메신저 1.000, 비주얼 노벨 1.036(판 상자를 수동 지정), 글꼴 2.0 문장 만들기 1.057 · 말하기 1.047 · 전화 1.047 · 쓰기 1.035 · 메신저 1.046(판 상자 수동) · 비주얼 노벨 1.047. 전부 한도 1.08 안, 계산 1.05 부근. 접근성 단계의 실측(`#1E2025` · 1.05 · 15.33 · 16.30)과 같다.
- 이 실행의 `ghost`는 주황 화살표를 글자로 세지 않아 말하기에서 5.40:1 FAIL을 냈고, 글자 판정을 최댓값 채널 100 이상으로 넓힌 보조 `ghost2.py`로 쟀다. 지금 `guidepx.py ghost`는 그 보조와 같은 글자 판정이다(아래 「r03 재실행에서 고친 것」 1).

### r03 재실행에서 고친 것

| # | 결함 | 처리 |
|---|---|---|
| 1 | `guidepx.py ghost`가 주황 화살표(최솟값 채널이 낮다)를 글자로 세지 않아 항상 FAIL(말하기 5.40:1) | 글자 판정을 가장 밝은 채널 100 이상으로 넓혔다. selftest에 주황 화살표가 든 판을 더했다(옛 판정이면 FAIL, 지금은 PASS) |
| 2 | `panel`이 판 아래에 붙은 같은 색의 어두운 면(글꼴 2.0 메신저의 하단 버튼 · 비주얼 노벨의 대사 카드)을 판으로 합쳐 상자를 잘못 냈다 | `GUIDE_BOX='X0,X1,Y0,Y1'`로 손으로 정한다(panel · ghost 공통). selftest에 합치는 사례와 손 상자를 더했다. 자동 판독이 합치는 것은 고치지 않았다 — 한계로 둔다 |
| 3 | `open_available`이 놓치는 경우: 에피소드 카드 글자 · 원 가장자리(표본 수 500 미만)를 집고, 원이 화면 아래쪽(y > 1300)이면 시트 위치가 달라 원 자체나 탭 바 깃발을 집었다 | 실행이 쓴 `open2`의 서술대로 반영 — 원 n ≥ 500 · y ≤ 높이/2 + 100, Start는 x 26~36% 띠에서 원 y + 300 아래. 합친 코드를 기기에서 다시 돌리지는 않았다 |
| 4 | 「Display speech output」 경로가 없었고, 시작 상태가 꺼짐이었다 | `TalkBackPreferencesActivity` 첫 화면의 최상위 스위치(Visual 절). 시작 상태를 읽어 적고 끝에 그 상태로 되돌린다(E10) |
| 5 | `vnanchor`의 1500ms 끌기는 TalkBack을 켠 채로는 맵을 못 움직인다 | 600ms로 여러 번 밀며 앵커 표본 수 800 이상일 때까지 찾는다(최대 6번) |
| 6 | density 540에서는 앵커가 안 잡힌다 | 클래퍼 도구 `clappers.py`(부록) — 아래에서 위로 두 번째 메신저, 첫 번째 전화. 노드를 누르는 x는 660 |
| 7 | `wm density reset` 뒤 빈 `display_density_forced=`가 **secure**에 남는다 | 되돌림 블록이 secure도 지운다 |
| 8 | E13 (1)의 하단 한도 2268은 낡은 값(하단 손잡이 2337). E13 (2)의 y 한도는 화면 크기에 비례(900x2000에서 상단 판 y0 115) | `panel` 기본 y 범위를 2337까지로, E13에 두 값 명시 |
| — | (문서에 해당 없음) zsh에서 배열 첨자는 1부터다 — 이 실행의 보조 코드에서 걸렸고 이 문서의 블록에는 배열 첨자가 없다 | `A="adb …"` 문자열 변수 금지는 그대로 지켰다 |

단원 이름 · 조각 수 표의 Ordering 서술도 이 재실행이 바로잡았다 — 아래 「단원별 도달」과 E11, 「Ordering 노드의 사실」.

### Ordering 노드의 사실 (r03 재실행)

- 데이터(`journey-map-units.ts`): `Your First Hello`=`greeting`, `Asking names`=`introduction`, `Ordering`=`ordering`, `Making plans`=`appointment`. unit TG1 · TG2: `greeting` · `introduction`은 대상, `ordering` · `appointment` · `directions`는 비대상.
- 기기(`audioProgress`로 끝난 단원을 다시 연다): 맵의 `Ordering`은 문항 `Tap 물, then 좀, then 주세요 to say 'Water, please.'` · 조각 **셋**(`주세요` · `물` · `좀`)이고 **안내가 안 뜬다**, `seen_read (none)`(`E11-ordering.png`). `Asking names`는 조각 하나(`이름이 뭐예요?`)이고 안내가 정상으로 뜬다(`E11-asking-names.png`, 판 윤곽 PASS). `Making plans`는 안내 없음.
- **첫 실행의 「`Ordering` 자리에서 조각 하나 문항이 열렸다」는 맵 노드 식별 오류였다** — 그때 연 노드는 `Asking names`(`introduction`)였다. 그 뒤 이 문서가 한 정정(「`ordering` 자리는 조각 하나」)을 이 재실행이 **철회**했다.
- `tutorial-beginner-units.md`의 「Ordering = 물 → 주세요, 두 조각」은 기기와 다르다(조각 셋) — 그 문서에 사실을 달았다.

### 지적 (판정이 아니다)

- **E15** — 안내 글자가 먼저 읽히지만(뒤 글자는 어둡게 눌려 있다) 뒤 글자가 안내 줄에 닿는 곳이 있다. 가장 거슬리는 곳은 전화(`E1-phone-call-guide.png`): 설명 셋째 줄 `it's your turn.` 바로 아래에 뒤 화면의 큰 글자 `Minseo`가 닿는다. 말하기는 큰 `안녕하세요`가 제목과 설명 사이에 끼고, 쓰기는 `내일 만 _요`가 제목과 설명 사이에 있고, 문장 만들기는 `Hello`가 설명 첫 줄 왼쪽에 겹친다. 비주얼 노벨은 인물 그림이 비치지만 읽힌다. 쓰기 설명은 3줄로 접혀 마지막 줄이 한 낱말(`on.`)이다. 비주얼 노벨은 `Tap anywhere to continue`가 아래 대사 카드 윗선에 거의 닿는다.
- **E13의 겹침** — 글꼴 2.0 · 900x2000(말하기 한 종류)에서 글자 상자는 안(x 77~826, y 290~1732)이지만, 제목이 뒤의 `Lesson 1 / 1`과, 설명이 카드 글자와, 닫는 법 줄이 `Skip` / `Speak` 버튼 글자와 겹친다(`E13-speaking-guide.png`). 넘침이 아니라 겹침이다.
- 두 지적은 판정이 아니다 — 증거 폴더의 캡처와 함께 접근성 · 디자인 단계의 입력으로 넘긴다.

### 첫 실행에서 고친 것

| # | 결함 | 처리 |
|---|---|---|
| 1 | `open_available`이 시트의 Start(y≈1504)를 놓치고 탭 바의 주황 깃발을 집었다 | 색 중심(`colorxy.py`)으로 유닛 · Start를 찾는다. 부록에 도구(selftest 포함) |
| 2 | 문장 만들기 도달 경로가 문서에 없었다 | 확인창 `Skip` → 완료 카드 `Back to map` → 맵 → 시트 `Start` |
| 3 | 복습 노드 좌표가 실행마다 ±120px 이상 달랐다 | 비주얼 노벨 노드의 연주황 앵커 기준(전화 = 앵커−378, 메신저 = 앵커−756, `vnanchor`) |
| 4 | `grep -c GrantPermissionsActivity`가 ANR 기록 줄까지 세었다 | `mCurrentFocus`로 판정 |
| 5 | 번들 서버 루트에 `static`이 없어 비주얼 노벨 배경이 흰색이었다 | 서버 루트에 `static` 링크 |
| 6 | 단원 이름 · 조각 수 표가 틀렸다 | 정정(`ordering` 자리는 조각 하나, 조각 둘은 `Making plans`) — **r03 재실행이 이 정정을 철회했다**: 그때 연 노드는 `Asking names`(`introduction`)였다. `ordering`은 조각 셋 · 비대상 |
| 7 | E10: TalkBack을 켜면 알림 권한 창이 가리고 덤프가 루트 하나뿐 | 이 절차로는 판정 불가임을 적고 accessibility 단계로 넘김 |
| 8 | E5: 닫은 뒤 0.4초 캡처로 타이핑 시작을 못 봤다 | `screenrecord` 프레임으로 |
| 9 | `wm size reset` 뒤 빈 `display_size_forced=` 키가 남았다 | 되돌림 블록에서 지우고 확인 |
| 10 | 「Permission controller isn't responding」 창이 캡처를 가렸다 | 사전 점검 항목 |
| 11 | 유도한 값 확인 | 기기에서 맞은 것은 「실측(2026-10-08)」으로 고침 |

### 이 판에서 확인한 것

`sh` 블록은 `bash -n` · `zsh -n`, 도구는 `py_compile` · selftest(`colorxy.py` 포함), 상대 링크는 존재 여부로만 확인했다. **기기는 쓰지 않았다**(다른 에이전트가 쓰는 중).

**r03 판(2026-10-09)도 같다**: `sh` 블록과 `file=tb-idioms.sh`는 `bash -n` · `zsh -n`, 도구(`guidepx.py` · `ring.py` · `montage.py` · `contrast.py` 포함)는 `py_compile` · selftest(합성 PNG), 상대 링크는 존재 여부로만 확인했다. 그 판의 새 도구는 합성 캡처에서만 돌았고, r03 재실행이 실제 기기 캡처에서 돌려 `ghost`(주황 화살표)와 `panel`(판 아래 같은 색 면)의 결함을 찾았다.

**r03 재실행 뒤의 이 판(2026-10-09)**: `sh` 블록과 `file=tb-idioms.sh`는 `bash -n` · `zsh -n`, 도구(`guidepx.py` · `clappers.py` 등)는 `py_compile` · selftest(`guidepx.py` 31건 · `clappers.py` 2건), 상대 링크는 존재 여부로만 확인했다. **기기는 쓰지 않았다.** 고친 `open_available` · `vnanchor`의 합친 코드와 `GUIDE_BOX` 경로는 합성 캡처 · 문법 확인뿐이며 기기에서 다시 돌리지 않았다.

## 이 절차로 확인되지 않는 것

첫 실행 뒤의 목록이다(실행 기록 「확인되지 않은 것」과 같다):

- **iOS 전체** — 미실행이다(Android를 끝낸 뒤 시뮬레이터 준비 · 빌드에 쓸 시간이 없었다). iOS의 어떤 항목도 통과가 아니다. ⟨2026-10-09⟩ 그 뒤 **E18만 돌았다** — 시뮬레이터 한 대 · dev playground · 전화 한 종류에서 (a) ~ (d) 통과, (e) 미실행(「실행 상태」). 그 밖의 iOS 항목은 여전히 미실행이다.
- **E10(r02 방식)은 돌려서 판정이 나온 적이 없다**(첫 실행: TalkBack을 켜면 알림 권한 창이 앱을 가리고 `uiautomator dump`가 루트 노드 하나뿐이었다). **r03이 E10을 발화 글자 캡처 방식으로 대체했고, 그 절차는 r03 재실행에서 말하기 · 전화 둘이 기기에서 돌아 통과했다.** 나머지 네 종류(문장 만들기 · 메신저 · 비주얼 노벨 · 쓰기)는 돌지 않았다 — 접근성 단계의 실측(`accessibility.md`)을 인용할 뿐이다.
- **E5의 「타이핑 시작」** — 첫 실행에서 못 봤다(캡처 지연). `screenrecord` 프레임 방법으로 바꿨으나 돌려 보지 않았다.
- **E4의 귀**, **E7의 같은 종류 다른 단원**, **E11의 조각 3개 문항 · `directions` · 최종 테스트 · 첫 단원 서사 캡처**, **E3의 보탤 자리**, **E13의 말하기 외 다섯 종류**, **E6의 비주얼 노벨 3버튼**, **E1~E3의 구현 전 대조**(E16 제외), **소셜 로그인 왕복**.
- **이 판의 고친 방법은 기기에서 다시 돌리지 않았다**(「실행 상태」). r03 재실행이 확인하지 못한 것: iOS 전체(E10-i 포함) · E10의 말하기 · 전화 외 네 종류 · E5 · E8 · E9 · E12 · E3b · E3의 보탤 자리 · E6의 3버튼 · E7의 같은 종류 다른 단원 · E11의 듣기 · `directions` · 최종 테스트 · 첫 단원 서사 · E16의 D7 · 구현 전 번들(`5782bacd`)과의 대조(접근성 단계의 `compare/`로 대신) · 소리(발화는 글자) · 실기기 · 비주얼 노벨의 판 상자 자동 판독(눈 + 수동 상자).

- **TalkBack의 낭독은 화면에 그려지는 발화 글자로 읽는다**(개발자 설정 「Display speech output」). 소리를 귀로 들은 것이 아니므로 끊김 · 두 번 읽힘의 **체감**은 판정하지 않는다. 글자로 두 번 나오면 두 번 읽힌 것으로 본다.
- **iOS VoiceOver 전부는 미실행이다**(E10-i). 격리(`accessibility-elements-hidden` + `accessibility-exclusive-focus`) · 뜰 때 두 번 읽힘 · 닫은 뒤 복원(`LynxUI dealloc`의 `clearExclusiveAccessibilityElements`에 달린 것)이 iOS에서 서는지는 **출시 조건**이다 — [iOS 출시 확인 목록](ios-release-checks.md) i1 ~ i3(계약 r03.2 위험 1 · 2, r04.5). 시뮬레이터는 낭독이 아니라 접근성 트리만 본다(E18 (d) — `idb ui describe-all`). 그 트리에서 안내가 떠 있는 동안 **`Back to map`이 남았다** — VoiceOver에서 닿는지는 i1에서 본다. 실제 iPhone의 VoiceOver는 [`visual-novel.md`](visual-novel.md)의 같은 한계.
- **실기기**: 에뮬레이터(Pixel_8 · API 37)와 iOS 시뮬레이터(iPhone 17 Pro)뿐이다. 스피커로 실제 들리는 소리 · 터치 지연 · 제조사 상태바는 보지 않는다. 벨은 Android에서 `dumpsys audio`의 플레이어 이력으로, iOS에서는 사람의 귀로만 본다(E18 (e) 미실행). 실기 확인은 **출시 조건**이다 — iOS는 [i4](ios-release-checks.md), Android는 [`android-release-config.md`](android-release-config.md) §6의 l · m.
- **iOS 제품 `main` 번들**: iOS에는 로그인 픽스처가 없다. iOS는 dev 전용 playground 번들(`tutorial-journey` · `tutorial-specials` · `tutorial-practice-modes`)로 **같은 화면 소스**를 본다 —
  제품 `main` 번들 · 로그인 뒤 경로가 아니다(`hide-scrollbars.md` S5 · `android-status-bar-icons.md` S12 (c)와 같은 한계). 그래서 E6 · E9 · E12 · E16은 iOS에 없다.
- **E10 계열의 범위(미확인)**: 뜬 채 화면이 내려가는 경로, 닫은 뒤 `Leave lesson` → 확인창의 낭독, 문장 만들기 · 쓰기 · 메신저 · 비주얼 노벨의 닫은 뒤 초점, `accessibility-element={false}` 단독의 효과(접근성 단계의 스파이크는 두 속성을 함께 넣었다), 실제 외부 키보드(Esc 포함)는 이 절차의 케이스가 아니다. TalkBack은 17.0.0 한 버전 · 에뮬레이터 한 대다.
- **판의 합성색 · 윤곽 · 좌우 여백의 수단(`width: calc(100% - 16 - 16)`)**: r03 재실행이 에뮬레이터 한 대에서 쟀다 — 판 색 mode `#1E2025`(계산 `#1F2124`), 잔상 1.0 ~ 1.057, 폭 360.0dp(945x2100)에서 판 861px · 좌우 42px(`calc`가 선다). 윤곽(흰 면 위 1.79:1)은 따로 재지 않았다. 다른 기기 · 다른 Lynx 렌더에서는 보지 않았다.
- **안전 영역 inset의 실제 값**: 에뮬레이터(제스처 내비게이션, 노치 없음)에서 판이 상단 띠(132; 900x2000에서 115) 아래 · 하단 손잡이(2337) 위에 든 것까지만 봤다. 글꼴 2.0 + density 540에서는 전화는 판 안에 온전했고 메신저는 화살표가 설명 마지막 줄 위에 겹쳤다(E13 (3) — 판정이 아니라 입력, 접근성 N2 재현).
- **본편 콘텐츠**: 대상 문항은 튜토리얼 에피소드의 것뿐이다. 본편에서 같은 모양의 문항이 들어올 때의 모습은 보지 않는다.
- **API 37 밖의 Android** · **API 37의 3버튼 외 내비게이션**: E6만 제스처 · 3버튼 둘을 본다. 나머지는 제스처 한 모드다.
- **문구 자체의 적절성**: E1은 문구가 계약 표와 같은지만 본다. 읽기 쉬운지는 보지 않는다.
- **안내 도중 연타 · 회전 · 앱 전환**: 보지 않는다(회전은 앱이 세로 고정 — [`android-orientation.md`](android-orientation.md)).
- **Android 가로 바 같은 스크롤 바**: 이 작업과 무관하다(`hide-scrollbars.md`).

## 전제

### 기기 · 빌드 · 전역 설정

- Android: **에뮬레이터 한 대**, API 37 Pixel_8(1080x2400, 420dpi, 제스처 내비게이션). 이 절차는 글꼴 배율 · 화면 크기 · 내비게이션 모드를 바꾸고 앱 데이터를 지운다 —
  다른 에이전트나 절차가 같은 기기를 쓰고 있지 않은지 먼저 확인한다. **한 번에 한 기기에서 한 절차만** 돌린다.
- iOS: iPhone 17 Pro 시뮬레이터 한 대, 이 작업 전용으로 새로 만든 것(다른 세션의 시뮬레이터를 쓰지 않는다).
- **3000 포트는 쓰지도 건드리지도 않는다.** 다른 워크트리의 개발 서버일 수 있다. Android 번들 서버는 **18790**, iOS dev 서버는 자동으로 올라간 다른 포트를 로그에서 읽는다.
- 모의 값으로 번들을 만든다 — 실제 서버 주소가 번들에 들어가지 않게. 번들은 **구현 뒤(`after`)와 구현 전(`before`)** 둘이다. 구현 전 = `e8982c5a`(이 작업의 테스트 커밋 — 안내 구현이 없고 스캐폴드의 스텁뿐이다).
- 에뮬레이터는 재부팅하면 스냅숏으로 돌아간다. 「앱을 다시 켜도」는 **재부팅이 아니라 강제 종료 · 재실행**으로 본다(아래 「앱 다시 켜기」).

```sh
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
ID="${ID:?adb devices가 보여 준 에뮬레이터 ID를 ID에 넣는다}"
A() { adb -s "$ID" "$@"; }     # 함수다 — `A shell …`. 문자열 변수(A="adb -s …"; $A)는 zsh에서 깨진다
PKG=libitum.duru.android
: "${OUT:?OUT에 증거 폴더의 절대 경로를 넣는다}"
case "$OUT" in /*) ;; *) echo "OUT은 절대 경로여야 한다: $OUT" ;; esac
TOOLS="$OUT/tools"; mkdir -p "$OUT" "$TOOLS"
DOC="$PWD/docs/e2e/learning-item-guides.md"                       # 저장소 루트에서 연 셸 기준
DOC_SB="$PWD/docs/e2e/android-status-bar-icons.md"
DOC_HS="$PWD/docs/e2e/hide-scrollbars.md"
A shell getprop ro.build.version.sdk        # 37
```

번들 · APK · 서버(구현 뒤는 이 작업의 HEAD, 구현 전은 임시 워크트리):

```sh
git rev-parse --short HEAD                                     # 실행 결과에 적는다
export PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test
pnpm --filter @libitums/ui-lynx build && pnpm --filter @libitums/mobile build
mkdir -p "$OUT/bundles" && rm -rf "$OUT/bundles/after" && cp -R apps/mobile/dist "$OUT/bundles/after"
git worktree add "$OUT/before-src" e8982c5a
( cd "$OUT/before-src" && pnpm install --frozen-lockfile \
  && pnpm --filter @libitums/ui-lynx build && pnpm --filter @libitums/mobile build )
rm -rf "$OUT/bundles/before" && cp -R "$OUT/before-src/apps/mobile/dist" "$OUT/bundles/before"
git worktree remove --force "$OUT/before-src"
shasum -a 256 "$OUT/bundles/before/main.lynx.bundle" "$OUT/bundles/after/main.lynx.bundle"   # 둘이 달라야 한다
( cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest )
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
# 앱이 이미지를 서버 **루트**의 /static/image/…에서 찾는다(번들 폴더 안이 아니다). 루트에 static 링크가 없으면 404라
# 비주얼 노벨의 배경이 흰색이 되고 E2 · E9 · E14의 「그림 위」 판독이 거짓이 된다 [실측(2026-10-08)]
ln -sfn after/static "$OUT/bundles/static"
python3 -m http.server 18790 --bind 0.0.0.0 --directory "$OUT/bundles" >"$OUT/bundle-server.log" 2>&1 &
BSERVER=$!
curl -sI http://localhost:18790/before/main.lynx.bundle | head -1    # 200
curl -sI http://localhost:18790/after/main.lynx.bundle | head -1     # 200
curl -sI http://localhost:18790/static/ | head -1                    # 200이나 목록 — 404면 링크가 틀렸다(after/static의 실제 위치를 ls로 본다)
```

**사전 점검 — 첫 캡처 전에**(첫 실행에서 둘 다 픽스처 캡처를 가렸다 [실측(2026-10-08)]):

```sh
# 에뮬레이터가 「Permission controller isn't responding」(ANR) 창을 띄워 앱을 가릴 수 있다 — 포커스가 앱인지 본다
A shell dumpsys window | tr -d '\r' | grep mCurrentFocus
# 앱이 아니라 ANR 창(Application Not Responding · permissioncontroller)이면 Wait를 눌러 넘기고 다시 본다
tapre '^Wait$'; sleep 1; A shell dumpsys window | tr -d '\r' | grep mCurrentFocus
```

`mCurrentFocus`가 `libitum.duru.android/…MainActivity` 쪽이어야 캡처를 뜬다. 권한 창이 포커스이면 같은 방법(`mCurrentFocus`)으로 알아본다 — `grep -c GrantPermissionsActivity`는 ANR 기록 줄까지 세어 권한 창이 없는데도 큰 수(118)가 나온다.

**`pnpm verify`를 돌린 뒤에는 번들을 다시 만든다**(`apps/mobile/dist`를 모의 값 없는 번들로 덮어써 픽스처가 `signed-in journey screen did not render`로 실패한다). 복사해 둔 `$OUT/bundles/*`는 영향이 없다.

**전역 설정은 기록하고 끝에 되돌린다.** 이 절차가 바꾸는 것은 글꼴 배율(E13) · 화면 크기(E13) · 내비게이션 모드(E6) · TalkBack(E10)이다. 기록 · 되돌림의 `globals` 함수와 기준값 표는
`docs/e2e/hide-scrollbars.md`의 「시작 전 전역 설정」을 그대로 쓴다(그 절의 `globals`에 `wm size`가 이미 들어 있다). 이 절차는 시작 전에 `night: no` · 재정의 없음 · `font_scale 1.0` · TalkBack 꺼짐이어야 한다.

```sh
# hide-scrollbars.md 「시작 전 전역 설정」의 globals 함수 블록을 한 셸에 정의한 뒤(그 문서의 코드를 복사하지 않는다)
globals | tee "$OUT/globals-before.txt"
```

끝에서(`font_scale` · `wm size reset` · `wm density reset` · `navigation_mode`(제스처 = 2, 아래 E6) · TalkBack 끄기를 되돌린 뒤):

```sh
A shell settings put system font_scale "$(grep '^font_scale:' "$OUT/globals-before.txt" | awk '{print $2}')"
A shell wm size reset
# `wm size reset` 뒤에 빈 `display_size_forced=` 행이 settings global에 남는다(`globals`의 diff는 0이라 놓친다) [실측(2026-10-08)]
A shell settings list global | tr -d '\r' | grep '^display_size_forced=' && A shell settings delete global display_size_forced
A shell settings list global | tr -d '\r' | grep -c '^display_size_forced=' | grep -qx 0 && echo "display_size_forced 정리됨"
A shell wm density reset
# `wm density reset` 뒤에는 빈 `display_density_forced=`가 남는다 — 이쪽은 **secure** 표다(위 size 키는 global) [실측(2026-10-09)]
A shell settings list secure | tr -d '\r' | grep '^display_density_forced=' && A shell settings delete secure display_density_forced
A shell settings list secure | tr -d '\r' | grep -c '^display_density_forced=' | grep -qx 0 && echo "display_density_forced 정리됨"
A shell settings delete secure enabled_accessibility_services; A shell settings put secure accessibility_enabled 0
globals > "$OUT/globals-after.txt"; diff "$OUT/globals-before.txt" "$OUT/globals-after.txt" && echo "전역 설정 diff 0"
kill "$BSERVER"
```

### 도구 — 다른 문서의 것은 그 문서에서 꺼내 쓴다

| 무엇 | 어디서 | 이 문서가 쓰는 곳 |
|---|---|---|
| `sbpng.py` (상태바 글리프 묶음별 대비 · 인접 배경 색) · `nodefind.py` | [`android-status-bar-icons.md`](android-status-bar-icons.md) 「도구」의 `file=` 추출 블록 | E9 · E16 |
| 셸 관용구 `shot` · `apr` · `want_light_icons` · `want_dark_icons` · `sbcheck` · `pollbg` · `waitre` · `tapre` · `tapxy` · `fixture_stop` | 같은 문서 「셸 관용구」 | 전부 |
| `barscan.py` (`diff` = 두 캡처의 다른 행 수, 상태바 아래 y 132~2400 · PNG 디코더) | [`hide-scrollbars.md`](hide-scrollbars.md) 부록 | E3 · E5 |
| `colorxy.py` (색 중심 — 맵의 유닛 원 · 시트의 Start · 비주얼 노벨 앵커) | **이 문서 부록** — `file=` 블록(selftest 포함) | 맵 진입 · 복습 노드 |
| 계측 픽스처 `SignedInScreenFixtureTest`의 진행 옵션 | `apps/android/app/src/androidTest/java/com/libitum/host/SignedInScreenFixtureTest.java` | 아래 「단원별 도달」 |
| `dumpsys audio` 플레이어 이력 | [`android-assets.md`](android-assets.md)의 `events` | E4 |
| Lynx 모듈 호출 수 `calls` | [`android-release-config.md`](android-release-config.md)의 `calls`(이 문서는 같은 규칙으로 `lcalls`를 다시 정의한다 — 두 줄) | E3 · E4 · E6 · E7 |
| `guidepx.py` (스크림 합성색 · 글자 상자 · 덮임 · **판 상자 `panel` · 판 안 잔상 `ghost`**) | **이 문서 부록** — `file=` 블록 | E1 · E2 · E10 · E13 ~ E17 |
| `ring.py` (TalkBack 초점 테두리의 경계 상자 · 안에 드는가) · `montage.py` (발화 글자 띠 모음) · `contrast.py` (글자 줄별 실제 대비) | **이 문서 부록** — `file=` 블록(접근성 단계가 쓴 도구를 옮겼다, selftest 포함) | E10 계열 · E17 |
| `clappers.py` (맵의 특별 단원 노드 옆 근검정 덩이의 y 중심 — density 540에서 앵커가 안 잡힐 때) | **이 문서 부록** — `file=` 블록(selftest 포함) | E13 (3) |
| `tb-idioms.sh` (TalkBack 켜기 · 끄기 · 권한 창 치우기 · 에뮬레이터 터치 쓸기 · 터치 탐색 · 두 번 탭 · 걸음 캡처) | **이 문서 부록** — `file=` 블록 | E10 계열 |

한 번만 — 추출 · 컴파일 · selftest:

```sh
python3 - "$DOC" "$DOC_SB" "$DOC_HS" "$TOOLS" <<'PY'
import pathlib, re, sys
doc, doc_sb, doc_hs, out = sys.argv[1], sys.argv[2], sys.argv[3], pathlib.Path(sys.argv[4])
out.mkdir(parents=True, exist_ok=True)
def put(name, text):
    (out / name).write_text(text, encoding='utf-8'); print('wrote', out / name)
# 1) 이 문서와 상태바 문서의 `file=` 블록(sbpng.py · sbjudge.py · nodefind.py · guidepx.py · ring.py · montage.py · contrast.py · clappers.py · tb-idioms.sh …)
for d in (doc, doc_sb):
    for m in re.finditer(r'^```\w+ file=(\S+)\n(.*?)^```$', open(d, encoding='utf-8').read(), re.S | re.M):
        put(m.group(1), m.group(2))
# 2) 상태바 문서의 셸 관용구 블록
m = re.search(r'^### 셸 관용구\n\n```sh\n(.*?)^```$', open(doc_sb, encoding='utf-8').read(), re.S | re.M)
put('sb-idioms.sh', m.group(1))
# 3) 스크롤 바 문서 부록의 barscan.py(제목 아래 첫 python 블록). 맵 진입은 orange.py가 아니라 이 문서의 colorxy.py다
text = open(doc_hs, encoding='utf-8').read()
for name in ('barscan.py',):
    m = re.search(r'^### `' + re.escape(name) + r'`\n.*?^```python\n(.*?)^```$', text, re.S | re.M)
    put(name, m.group(1))
PY
python3 -m py_compile "$TOOLS/sbpng.py" "$TOOLS/nodefind.py" "$TOOLS/barscan.py" "$TOOLS/colorxy.py" "$TOOLS/guidepx.py" "$TOOLS/ring.py" "$TOOLS/montage.py" "$TOOLS/contrast.py" "$TOOLS/clappers.py" && echo tools-ok
bash -n "$TOOLS/tb-idioms.sh" && zsh -n "$TOOLS/tb-idioms.sh" && echo tb-idioms-ok
python3 "$TOOLS/sbpng.py" selftest | tail -1       # selftest OK
python3 "$TOOLS/barscan.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/guidepx.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/colorxy.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/ring.py" selftest | tail -1        # selftest PASS
python3 "$TOOLS/montage.py" selftest | tail -1     # selftest PASS
python3 "$TOOLS/contrast.py" selftest | tail -1    # selftest PASS
python3 "$TOOLS/clappers.py" selftest | tail -1    # selftest PASS
```

### 함수 묶음 — 한 셸에 정의한다 (bash · zsh)

상태바 문서의 `fixture`는 `pm clear`를 하고 번들 주소가 하나다. 이 절차는 **번들 고르기 · 안내 기록 남기기**가 필요해 `gfixture`로 덮어쓴다. 나머지는 그 문서의 것이다.

```sh
. "$TOOLS/sb-idioms.sh"            # shot apr want_* sbcheck pollbg waitre tapre tapxy fixture_stop …
# TalkBack을 켜고 쓰는 케이스(E10 계열)는 이 묶음을 정의한 **뒤에** `. "$TOOLS/tb-idioms.sh"`를 더 읽는다(아래 E10).
# 저장 키 — JS가 호스트에 넘기는 키는 `libitum.learning-item-guides.seen`이고 호스트(StorageModule.java · .swift)가
# 접두 `libitum.`을 한 번 더 붙인다. 그래서 기기 저장소의 실제 이름은 아래다 [실측(2026-10-08) — seen_read가 읽었다]
SEENKEY=libitum.learning-item-guides.seen
PREFKEY="libitum.$SEENKEY"
PREFS=shared_prefs/duru-storage.xml
WHICH=after                         # 번들: after | before

# gfixture [-e 옵션 true …] — 새 상태로 시작한다. KEEP=1이면 pm clear를 건너뛰어 안내 기록을 남긴 채 다시 시작한다
# (픽스처는 세션 · 진행 시드만 다시 쓰고 저장소를 비우지 않는다 — SignedInScreenFixtureTest.java). 약 180초 뒤 끝난다.
gfixture() {
  A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null; sleep 1
  [ "${KEEP:-0}" = 1 ] || A shell pm clear "$PKG" >/dev/null
  A logcat -c
  A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest "$@" \
    -e bundleUrl "http://10.0.2.2:18790/$WHICH/main.lynx.bundle" \
    "$PKG.test/androidx.test.runner.AndroidJUnitRunner" >"$OUT/fixture-$ID.log" 2>&1 &
  date +%s > "$OUT/.fixT0-$ID"
  waitre '^Journey, selected|Tap to start your lesson' 40
}
# gkill — 픽스처를 끝내고 앱 프로세스를 죽인다(강제 종료). 쓰기(apply)가 디스크에 닿도록 먼저 2초 기다린다
gkill() { sleep 2; fixture_stop; sleep 1; A shell am force-stop "$PKG"; sleep 1; }

# seen_read — 기기에 적힌 안내 기록. 앱이 떠 있어도 읽힌다(run-as: debug 빌드 [실측(2026-10-08)]). 없으면 (none)
seen_read() {
  A shell run-as "$PKG" cat "$PREFS" 2>/dev/null | tr -d '\r' \
    | sed -n "s/.*name=\"$PREFKEY\">\(.*\)<\/string>.*/\1/p" | sed 's/&quot;/"/g' | grep . || echo "(none)"
}
# seen_plant '["messenger","writing"]' — 「이미 본 상태」를 심는다. **앱이 죽어 있을 때만**(gkill 뒤): 살아 있으면 프로세스 안 캐시가 파일을 덮는다.
# pm clear 직후에 부르고, 이어서 KEEP=1 gfixture로 시작한다. 심은 뒤 seen_read로 값이 읽히는지 확인한다 — 안 읽히면 「심기 실패」(아래 대안: 앱에서 직접 닫는다)
seen_plant() {
  printf '<?xml version="1.0" encoding="utf-8" standalone="yes" ?>\n<map>\n    <string name="%s">%s</string>\n</map>\n' \
    "$PREFKEY" "$(printf '%s' "$1" | sed 's/"/\&quot;/g')" > "$OUT/seen.xml"
  A shell "run-as $PKG sh -c 'mkdir -p shared_prefs && cat > $PREFS'" < "$OUT/seen.xml"
}

# lcalls 접두 logcat파일 — Lynx 모듈 호출 수(앞선 작업의 `calls`와 같은 규칙: 호출마다 `will fire` · `call platform implementation` 두 줄이라 뒤의 것만 센다)
lcalls() { grep -F "InvokeMethod, method: ($1" "$2" | grep -c "call platform implementation"; }
# logsave 이름 — 지금까지의 logcat을 저장하고 비운다(구간 나누기)
logsave() { A logcat -d > "$OUT/$1.logcat"; A logcat -c; }
# aevents — 오디오 플레이어 이력(소리마다 started 한 줄). 줄 모양은 Android 버전마다 다르다 — android-assets.md의 events 주의를 따른다
aevents() { A shell dumpsys audio | tr -d '\r' | grep -E "player piid:[0-9]+ event:"; }

# color_xy 이름 '#RRGGBB' TOL Y0 Y1 — 캡처를 뜨고 그 색(±TOL)의 중심 "x y n"을 낸다(없으면 none). x 범위는 환경 변수 XMIN · XMAX(기본 300~800)
# 색으로 찾는 이유: 맵의 내용은 uiautomator 트리에 없고 좌표는 스크롤 관성으로 실행마다 달라진다 [실측(2026-10-08)]
color_xy() { shot "$1"; python3 "$TOOLS/colorxy.py" "$OUT/$1.png" "$2" "$3" "$4" "$5"; }
# open_available [화면높이] — 맵을 위로 밀며 주황 유닛 원(#F56C14, x 400~500)을 찾아 누르고, 시트의 주황 Start(같은 색)를 눌러 단원을 연다.
# 특별 단원(메신저 · 전화 · 비주얼 노벨 · 표지)은 시트가 없다 — vnanchor · tapxy로 누른다.
#  - 시트의 Start 탐색 범위는 「누른 유닛 y + 300 ~ 캡처 높이 − 250」, x는 화면 폭의 26~36% 띠다. 이전 판의 y 1800~2400은 시트 Start(y≈1504)를 놓치고
#    탭 바의 주황 깃발(312,2305)을 집었고 [실측(2026-10-08)], 「원 y + 120」은 원이 화면 아래쪽(y > 1300)일 때 시트 위치가 달라 원 자체나 탭 바 깃발을 집었다 [실측(2026-10-09)].
#  - 원은 colorxy의 표본 수 n이 500 이상이고 y가 높이/2 + 100 이하인 것만 쓴다(에피소드 카드의 글자 · 원의 가장자리는 n이 작다). 아래쪽 원은 더 밀어 올린 뒤 잡는다.
#  - 이 판의 값은 r03 재실행이 쓴 보조 함수 `open2`의 서술을 옮긴 것이다 — 합친 코드를 기기에서 다시 돌리지는 않았다.
#  - 3버튼 모드에서도 같은 방법이다(말없이 열지 못하던 것은 좌표 범위 탓이었다).
open_available() {
  local H=${1:-2400} I=0 C=none X Y N W
  W=$(A shell wm size | tr -d '\r' | tail -1 | sed 's/.*: *\([0-9]*\)x.*/\1/')      # 지금 화면 폭(wm size 재정의가 있으면 그 값)
  while [ "$C" = none ] && [ "$I" -lt 8 ]; do
    C=$(XMIN=400 XMAX=500 color_xy "nav-$I" '#F56C14' 8 200 $((H / 2 + 100)))
    read -r X Y N <<<"$C"
    [ "$C" != none ] && [ "${N:-0}" -lt 500 ] && C=none
    [ "$C" = none ] && { A shell input swipe 540 1700 540 700 700; sleep 2.5; }
    I=$((I + 1))
  done
  [ "$C" = none ] && { echo "도달 실패: 맵에서 주황 유닛 원이 없다"; return 1; }
  A shell input tap "$X" "$Y"; sleep 3
  C=$(XMIN=$((W * 26 / 100)) XMAX=$((W * 36 / 100)) color_xy nav-sheet '#F56C14' 8 $((Y + 300)) $((H - 250)))
  [ "$C" = none ] && { echo "도달 실패: 시트의 Start가 없다"; return 1; }
  read -r X Y _ <<<"$C"; A shell input tap "$X" "$Y"; sleep 4
}
# vnanchor — 맵을 600ms로 밀며 비주얼 노벨 노드의 연주황(#FEF0E6) 좌표를 $VNX $VNY 로 낸다(앵커 표본 수 n이 800 이상일 때까지 최대 6번).
# 복습 노드는 고정 좌표를 쓸 수 없다(밀기 관성으로 실행마다 ±120px 이상 달랐다). 앵커 기준: 전화 = VNY−378, 메신저 = VNY−756 [실측(2026-10-08)]
#  - 끌기가 1500ms이면 TalkBack을 켠 채로는 맵이 안 움직인다(접근성 단계 N4 (2)). 600ms로 여러 번 밀면 통한다 — r03 재실행에서는 두 번째 밀기에서 잡혔다 [실측(2026-10-09)].
#  - x는 540으로 누른다(첫 실행의 노드 확인이 x 540이었다). 앵커가 none이면 도달 실패. density 540에서는 앵커가 안 잡힌다 → 아래 「density 540에서의 도달」.
vnanchor() {
  local I=0 C=none N=0
  while [ "$I" -lt 6 ]; do
    A shell input swipe 540 1900 540 900 600; sleep 3
    C=$(color_xy M-anchor '#FEF0E6' 6 250 2200); read -r VNX VNY N <<<"$C"
    [ "$C" != none ] && [ "${N:-0}" -ge 800 ] && break
    C=none; I=$((I + 1))
  done
  echo "VN anchor: $C"
  [ "$C" = none ] && return 1
  echo "phone y=$((VNY - 378)) messenger y=$((VNY - 756))"
}
# review_open 앵커오프셋 — vnanchor 뒤: 앵커에서 오프셋만큼 올린 노드(전화 378 · 메신저 756)를 누른다. 특별 단원은 시트가 없어 바로 열린다 [유도 — 첫 실행은 눈으로 열었다]
review_open() { tapxy 540 $((VNY - $1)); sleep 4; }
# e11 이름 y — 맵의 노드(540,y)를 열고 시트의 Start(주황)를 눌러 문항을 연 뒤 캡처하고 안내 기록을 읽는다
e11() {
  local N=$1 Y=$2 C X YY
  tapxy 540 "$Y"; sleep 3; shot "E11-sheet-$N"; C=$(python3 "$TOOLS/colorxy.py" "$OUT/E11-sheet-$N.png" '#F56C14' 8 $((Y + 120)) 2100); echo "$N start: $C"
  read -r X YY _ <<<"$C"; [ "$C" = none ] && return 1
  tapxy 540 "$YY"; sleep 5; shot "E11-$N"; python3 "$TOOLS/guidepx.py" flat "$OUT/E11-$N.png" '#48494C' 6 | tail -1; echo "seen: $(seen_read)"
}
# e11leave — 열린 문항에서 나간다: 왼쪽 위 ×(115,380) → 확인창의 확정(540,1237) → 맵
e11leave() { tapxy 115 380; sleep 1.5; tapxy 540 1237; sleep 3; waitre '^Journey, selected' 8; }
# probe 종류 — 안내가 떠 있는 화면을 캡처하고(E1-종류-guide), 화면 가운데를 눌러 닫은 뒤 다시 캡처한다(E1-종류-closed).
# 닫은 화면은 E3 · E5의 기준 캡처이고 조작부 좌표를 읽는 캡처다. logcat은 열기부터 닫기 직후까지.
probe() {
  local K=$1
  sleep 1.5; shot "E1-$K-guide"; logsave "E1-$K-open"
  A shell input tap 540 1200; sleep 2; shot "E1-$K-closed"; logsave "E1-$K-closed"
}
```

## 저장 기록 읽고 지우고 심기

안내 기록은 **기기 저장소의 키 하나**다(계약 §3.3). 값은 본 종류의 JSON 배열(`["sentence-order","messenger"]`), 닫을 때 쓰고 뜨기만 해서는 쓰지 않는다.

| 하고 싶은 것 | Android | iOS 시뮬레이터 |
|---|---|---|
| 저장 파일 | SharedPreferences `duru-storage` → `shared_prefs/duru-storage.xml`, 항목 이름 `libitum.libitum.learning-item-guides.seen` (호스트가 접두를 한 번 더 붙인다 — `StorageModule.java`의 `"libitum." + key`) | `UserDefaults.standard`, 키 `libitum.libitum.learning-item-guides.seen` (`StorageModule.swift`의 `prefix + key`), 도메인 `com.libitum.host` |
| 읽기 | `seen_read` (`run-as`) | `ios_seen_read` (아래) |
| **안내 기록 없는 설치** 만들기 | `A shell pm clear "$PKG"` — `gfixture`가 기본으로 한다 | `ios_seen_clear` |
| **이미 본 상태** 심기 | `A shell pm clear "$PKG"` → `seen_plant '["messenger"]'` → `seen_read`로 확인 → `KEEP=1 gfixture …` | `ios_seen_plant '["messenger"]'` (앱을 먼저 종료) |
| 기록을 남긴 채 앱 다시 켜기 | `gkill` → `KEEP=1 gfixture …` | `xcrun simctl terminate` → `launch` |
| 저장 쓰기가 일어났는가(Lynx 호출) | `lcalls StorageModule.set "$OUT/….logcat"` — 키가 줄에 나오면(읽기 쪽은 `StorageModule.get.libitum.learning-item-guides.seen` 꼴이 맞았다 [실측(2026-10-08)]; 쓰기는 같은 꼴 `StorageModule.set.…` [유도 — set 줄의 모양은 확인하지 못했다]) 키 접두로 좁힌다. 나오지 않으면 같은 구간의 `set` 수와 `seen_read`를 함께 본다(진행 저장 같은 다른 `set`도 센다) | `seen_read` 대용 `ios_seen_read`의 전후 비교 |

- **`seen_read`가 `(none)`만 낸다면** `run-as`가 안 되거나 항목 이름이 다른 것이다. 먼저 `A shell run-as "$PKG" cat "$PREFS"`로 파일이 읽히는지, `grep guide` 같은 부분 문자열로 이름을 찾는다. 이름이 이 문서와 다르면 `PREFKEY`를 고치고 이 문서를 고친다.
- `seen_plant`가 안 먹으면 **대안**: 안내를 앱에서 직접 닫아 기록을 만든다(그 종류의 단원을 열고 탭). E7 · E12가 그 경로를 이미 쓴다.
- Android는 쓰기를 `apply()`(비동기)로 한다. **강제 종료 직전에 2초 기다린다**(`gkill`이 한다) — 안 기다리면 닫았는데 기록이 없는 것처럼 읽힌다.

```sh
# iOS — UDID는 hide-scrollbars.md S5의 준비로 만든 시뮬레이터. 앱은 com.libitum.host.
# 앱이 쓴 기록은 앱 컨테이너 plist에 있다(아래 ⚠). 읽기는 그 파일을, 지우기는 shutdown → 파일 수정 → boot를 따른다.
APPID=com.libitum.host
ios_seen_plist() { echo "$(xcrun simctl get_app_container "$UDID" "$APPID" data)/Library/Preferences/$APPID.plist"; }
# 읽기: 컨테이너 plist(앱이 쓴 기록)를 먼저, 없으면 시뮬레이터 수준(심은 값)을 읽는다. 둘 다 없으면 (none)
ios_seen_read() {
  P=$(ios_seen_plist 2>/dev/null)
  V=$(python3 - "$P" "$PREFKEY" <<'PY' 2>/dev/null
import plistlib, sys
try:
    d = plistlib.load(open(sys.argv[1], "rb"))
    print(d[sys.argv[2]])
except Exception:
    pass
PY
)
  [ -n "$V" ] || V=$(xcrun simctl spawn "$UDID" defaults read "$APPID" "$PREFKEY" 2>/dev/null)
  echo "${V:-(none)}"
}
# 지우기: 앱 종료 → 시뮬레이터 수준 값 삭제 → 시뮬레이터 shutdown → 컨테이너 plist의 키 삭제(plutil -remove는 키의 점을 경로로 읽어 실패 — plistlib) → boot
ios_seen_clear() {
  xcrun simctl terminate "$UDID" "$APPID" >/dev/null 2>&1
  xcrun simctl spawn "$UDID" defaults delete "$APPID" "$PREFKEY" >/dev/null 2>&1
  P=$(ios_seen_plist 2>/dev/null)
  xcrun simctl shutdown "$UDID" >/dev/null 2>&1
  python3 - "$P" "$PREFKEY" <<'PY'
import plistlib, sys
try:
    f = open(sys.argv[1], "rb"); d = plistlib.load(f); f.close()
except Exception:
    sys.exit(0)
if d.pop(sys.argv[2], None) is not None:
    plistlib.dump(d, open(sys.argv[1], "wb"))
PY
  xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1
}
# 심기: 앱이 아직 기록을 쓴 적 없는 상태에서만 확인했다(시뮬레이터 수준 값을 앱이 읽는다). 앱이 쓴 뒤라면 먼저 ios_seen_clear
ios_seen_plant() { xcrun simctl terminate "$UDID" "$APPID" >/dev/null 2>&1; xcrun simctl spawn "$UDID" defaults write "$APPID" "$PREFKEY" -string "$1"; }
```

⚠ **`simctl spawn … defaults`는 앱이 쓴 기록에 듣지 않는다** [실측(2026-10-09), E18 — `artifacts/e2e-ios.md`].

- `simctl spawn … defaults`는 시뮬레이터 수준의 plist(`data/Library/Preferences`)에 닿고, 앱은 그 값을 **읽는다**. 그래서 심으면 안내가 안 뜨고 지우면 뜬다 — 성능 회차 A/B 여섯 번에서 그렇게 동작했다. 단 앱이 기록을 쓴 적 없을 때만이다.
- 그러나 **앱이 안내를 닫으며 쓴 기록은 앱 컨테이너의 plist**(`xcrun simctl get_app_container "$UDID" "$APPID" data`가 내는 폴더의 `Library/Preferences/com.libitum.host.plist`)에 들어간다. `defaults read`는 그것을 읽지 못하고 `(none)` / `does not exist`를 내며, `defaults delete`로는 지워지지 않아 앱이 한 번 기록을 쓴 뒤에는 안내가 다시 뜨지 않는다.
- 기록은 쓰기 지연(cfprefsd)이 있어 탭 직후 1.5초에는 디스크에 아직 없고 나중에 보인다. 닫은 직후의 읽기는 몇 초 뒤에 하거나 앱을 종료한 뒤에 한다.
- 컨테이너 plist의 키를 파일로 지워도 cfprefsd 캐시 때문에 앱이 옛 값을 쓴다 — **시뮬레이터를 shutdown → 파일 수정 → boot** 한 뒤에야 안내가 다시 떴다(`simctl spawn … killall`은 없다).
- 위 `ios_seen_read` · `ios_seen_clear`는 E18의 실행 기록이 확인한 사실(위 네 줄과 순서 shutdown → plistlib로 키 삭제 → boot)을 함수로 옮긴 것이다. 실행 기록에는 명령 줄 자체가 남아 있지 않아(`e2e-ios.md`는 방법만, `artifacts/e2e-ios/`는 개수 추적만 담는다) 명령 줄은 그 방법에서 다시 쓴 것이다. **고친 함수는 기기에서 다시 돌리지 않았다** — 다음 실행이 첫 사용에서 `ios_seen_read`의 출력(`["phone-call"]`)과 `ios_seen_clear` 뒤 안내가 다시 뜨는지를 확인한다.

## 단원별 도달 — Android

튜토리얼 에피소드의 순서: 표지 `tutorial-intro` → (문장 만들기 `greeting` · `introduction` · `ordering` · `appointment` — 맵의 이름은 순서대로 `Your First Hello` · `Asking names` · `Ordering` · `Making plans`) → 메신저 → 전화 → 비주얼 노벨 → (`directions` · `tutorial-listening` · `tutorial-speaking` · `tutorial-writing`) → 최종 테스트.
**앞 단원을 통과해야 다음이 열린다**(`mapItemStatus` — 표지를 끝낸 뒤에는 **끝낸 항목을 다시 열 수 있다**). 그래서 픽스처의 진행 시드가 그 자리까지 데려다 준다.
시드 옵션 중 `loadProgress`는 쓰지 않는다 — 첫 단원 안내(기존 안내 넷)가 맵을 덮는다. **E11 · E16만** 쓴다.

| 종류 | 단원 | 픽스처 옵션 | 열리는 상태 | 여는 법 |
|---|---|---|---|---|
| `sentence-order` | `greeting` | (없음 — 진행 0) | 표지를 끝내면 `greeting`이 **가능**(주황) | 맵 `Episode intro` `tapxy 540 442` → `Skip`(`tapre '^Skip$'`) → 확인창의 확정 버튼 **`Skip`**(540 1237; 취소는 `Keep watching`) → **완료 카드의 `Back to map`**(`tapre '^Back to map$'`; 트리에 안 잡히면 캡처에서 좌표를 읽는다) → 맵에서 `open_available`(시트의 `Start`는 540 1504 부근). `Back to map`을 누르지 않으면 맵이 나오지 않는다 [실측(2026-10-08)] |
| `messenger` | `appointment-confirmation` | `-e visualNovelProgress true` | 이미 끝남 — **복습**으로 연다 | `vnanchor` 뒤 `review_open 756`(= `tapxy 540 $((VNY - 756))`). 끝난 항목은 주황이 아니라 `open_available`이 못 찾는다. 항목 `A Message from Minseo` |
| `phone-call` | `appointment-confirmation-phone-call` | `-e visualNovelProgress true` | 이미 끝남 — **복습** | `vnanchor` 뒤 `review_open 378`. 항목 `A Call from Minseo` |
| `visual-novel` | `cafe-arrival-visual-novel` | `-e visualNovelProgress true` | **가능**(다음 항목) | `vnanchor`가 내는 `$VNX $VNY`가 `Our Imagined Café` 노드다 — `tapxy 540 "$VNY"`(고정값 `540 1764`는 쓸 수 없다: 실행마다 ±120px 이상 달랐다) |
| `speaking` | `tutorial-speaking` | `-e speechProgress true` | **가능**(주황) | `open_available` |
| `writing` | `tutorial-writing` | `-e writingProgress true` | **가능**(주황) | `open_available` |

비대상(E11)과 둘째 단원(E7):

| 용도 | 단원 | 픽스처 옵션 | 열리는 상태 |
|---|---|---|---|
| 같은 종류의 둘째 단원(E7) | `introduction`(`sentence-order`) | (없음) | `greeting`을 **풀어서 통과**해야 열린다(조각 하나 → `Check` → `Next` → `See results` → 완료 카드의 나가기). 풀기가 막히면 아래 「닿지 못할 수 있는 것」 |
| 조각이 둘인 문장 만들기(E11) | `appointment` = 맵의 **`Making plans`**(시트 `Lesson 4: "Making plans"`) | `-e audioProgress true` | 앞 단계 모두 **끝남**(복습) — 맵 캡처에서 노드 좌표를 읽는다 |
| 조각이 하나인 `introduction`(맵의 **`Asking names`**) | — | `-e audioProgress true`(끝난 단원을 다시 연다) | **E11의 비대상이 아니다(대상).** 문항은 조각 하나(`이름이 뭐예요?`)이고 안내가 정상으로 뜬다 [실측(2026-10-09), `E11-asking-names.png`]. 첫 실행이 이 문항을 「`Ordering` 자리」로 본 것은 **맵 노드 식별 오류**였다 |
| 조각이 셋인 `ordering`(맵의 **`Ordering`**) | — | `-e audioProgress true` | **비대상**(unit TG2). 문항 `Tap 물, then 좀, then 주세요 to say 'Water, please.'` · 조각 셋(`주세요` · `물` · `좀`), 안내가 안 뜨고 `seen_read (none)` [실측(2026-10-09), `E11-ordering.png`] |
| 조각 수를 확인하지 못한 것 | `directions` (데이터상 비대상 — unit TG2) · 조각 3개 문항은 위 `ordering`으로 확인됨 | `-e audioProgress true` | `directions`는 기기에서 열어 조각 수를 세지 못했다. 열어서 캡처로 센 뒤에만 비대상으로 쓴다 |

**맵 이름 ↔ 단원 id ↔ 대상 여부**(`journey-map-units.ts`, 기기에서 맞춰 봄): `Your First Hello`=`greeting`(대상) · `Asking names`=`introduction`(대상) · `Ordering`=`ordering`(비대상) · `Making plans`=`appointment`(비대상). 맵의 노드 자리는 이름이 같아 보여도 한 칸 어긋나기 쉽다 — **연 뒤 문항의 문장과 조각 수를 캡처로 읽어 어느 단원인지 확인한 다음에 대상 / 비대상으로 쓴다.** 이 표는 첫 실행 뒤 「`ordering` 자리는 조각 하나」로 한 번 고쳤으나, r03 재실행이 **그 정정을 철회했다**(위).
| 듣기(E11) | `tutorial-listening` | `-e audioProgress true` | **가능**(주황) |
| 최종 테스트(E11) | `tutorial-final-test` | `-e finalProgress true` | **가능** — 맵을 밀어 `Final test` 좌표(r02 값 `540 1674`), 도입 서사를 넘기면 시험 |
| 롤플레이 탭(출처 불문 확인) | 메신저 · 전화 · 비주얼 노벨 | `-e completeProgress true` | 롤플레이 탭 `tapxy 540 2304` → 카드. 카드가 없으면 「닿지 못함」 |

**닿지 못할 수 있는 것**(첫 실행이 가른다. 못 닿으면 통과가 아니라 「도달 실패」로 적고 사유와 마지막 캡처를 붙인다):

- 끝난 항목의 노드 좌표(메신저 · 전화 · 문장 만들기 복습) — 맵 내용이 트리에 없다. 메신저 · 전화는 `vnanchor` 오프셋으로 열렸다. 문장 만들기 복습 노드(`Asking names` · `Ordering` · `Making plans`)는 앵커 오프셋을 재지 못해 캡처에서 읽은 좌표에 기댄다(어느 노드인지는 연 뒤 문항으로 확인한다).
- `introduction`을 여는 풀이 — 조각 글자를 캡처에서 읽어 순서대로 눌러야 한다. 픽스처 180초 안에 `greeting` 풀이 + `introduction` 열기까지 들어가는지 확인한다. 안 들어가면 E7의 「같은 종류의 다른 단원」은 「닿지 못함」으로 닫고 「같은 단원 다시 열기」만 남긴다.
- 롤플레이 탭의 메신저 · 전화 카드(`completeProgress`) — 첫 실행에서 `Our Imagined Café`만 확인됐다(`android-status-bar-icons.md` S10). 메신저 · 전화 카드가 있는지는 모른다.
- 말하기는 `Speak`가 마이크 권한을 요구한다. 에뮬레이터에 인식기가 없으면 인식 자체는 못 한다 — 이 절차는 **권한 요청이 안 나가는 것**과 **닫은 뒤에는 나가는 것**까지만 본다.
- E7의 「같은 종류의 다른 단원」(`introduction` 풀어 열기)은 첫 실행에서 **닿지 못했다**(시도하지 않았다).

### density 540에서의 도달 (E13 (3)) — r03 재실행 [실측(2026-10-09)]

`wm density 540`(폭 320dp)에서는 비주얼 노벨의 연주황 앵커(`vnanchor`)가 잡히지 않는다. 맵 특별 단원 노드 옆의 근검정 덩이(클래퍼)를 쓴다: 맵 캡처에서 `python3 "$TOOLS/clappers.py" "$OUT/<캡처>.png"`가 y 중심을 낸다 — **아래에서 위로 두 번째가 메신저, 첫 번째가 전화**였다. 노드를 누르는 x는 **660**으로 한다(왼쪽의 `Episode 0. Tutorial.` 카드가 density 540에서 x 563까지 와서 540을 누르면 카드를 누른다). 이 절차는 한 번 돌았을 뿐이라 다른 조건에서는 캡처와 눈으로 대조한다.

각 실행(180초)의 틀 — 한 종류를 열어 `probe`까지:

```sh
# 예: 말하기 (E1 · 기준 캡처)
gfixture -e speechProgress true || echo "도달 실패: 픽스처가 맵에 못 닿았다"
sleep 2
open_available || echo "도달 실패"
probe speaking
fixture_stop
seen_read          # 닫았으므로 ["speaking"]
```

## iOS 시뮬레이터 — 준비와 도달

준비(시뮬레이터 만들기 · Debug Host 빌드 · dev 서버 포트 읽기 · 끝낸 뒤 정리)는 `docs/e2e/hide-scrollbars.md` S5의 「준비」를 **그대로** 따른다(구현 뒤 서버 하나면 된다). 3000 포트는 쓰지 않고, 끝나면 서버를 `lsof`로 찾아 끈다.
**E18은 이 준비를 쓰지 않았다** — 성능 보고서의 회차를 마친 Release Simulator Host · 같은 시뮬레이터 · 같은 dev 서버를 이어 썼고, `current = "tutorial-call"`(전화 화면이 첫 화면)이다. 성능 회차가 먼저이고 E18이 뒤다(탭 · 트리 읽기가 수집 구간에 섞이지 않게).
iOS에는 로그인 픽스처가 없어 dev playground 번들로 같은 화면 소스를 본다. **어느 화면이 뜨는지는 `apps/mobile/src/playground/current.ts`의 한 줄이 정한다** — 개발 전용 파일이고 이 절차가 임시로 바꾼다. 끝나면 `git checkout -- apps/mobile/src/playground/current.ts`로 되돌린다(워크트리가 더러워지지 않았는지 `git status`로 확인).

| 종류 | `current` 값 | 도달 [유도 — 코드. 첫 실행이 확인] |
|---|---|---|
| `sentence-order` | `tutorial-journey` (실제 `AppSession`, 진행 0, 인증 없음) | 맵의 표지를 건너뛰고 `greeting`. 같은 종류의 둘째 단원 `introduction`도 이어서 |
| `messenger` · `phone-call` · `visual-novel` | `tutorial-specials` | 메신저 → (끝내면) 전화 → 비주얼 노벨이 이어서 선다(`TutorialSpecialsFixture`). 각 화면의 첫 문항에서 안내 |
| `speaking` · `writing` · 듣기 | `tutorial-practice-modes` | 듣기에서 시작해 통과하면 맵으로 돌아오고 말하기 · 쓰기가 열린다 |

```sh
# iOS 공통 — hide-scrollbars.md S5의 UDID · 포트 변수를 가정한다
export PATH="$HOME/.local/bin:$PATH"                      # idb
IOSOUT="$OUT/ios"; mkdir -p "$IOSOUT"
iosshot() { xcrun simctl io "$UDID" screenshot "$IOSOUT/$1.png" >/dev/null 2>&1; }
ioslaunch() {            # 앱을 종료했다가 dev playground 번들로 띄운다. $AFTER_PORT는 S5의 준비가 읽은 포트
  xcrun simctl terminate "$UDID" "$APPID" >/dev/null 2>&1
  xcrun simctl launch "$UDID" "$APPID" --bundle-url="http://localhost:$AFTER_PORT/playground.lynx.bundle" >/dev/null; sleep 8
}
# 좌표는 포인트(402x874)다. 캡처는 @3x(1206x2622)라 캡처의 픽셀 좌표를 3으로 나눈다.
iostap() { idb ui tap --udid "$UDID" "$1" "$2"; }
```

## 케이스

모든 캡처는 **무손실 PNG**(`screencap -p` · `simctl io screenshot`)다. 캡처 이름은 `E<번호>-<종류>-<무엇>.png`. 판독 명령의 임계값(±6 · 100 · 24px)은 이 문서가 정한 값이 아니라 test-plan의 판정문과 design의 계산표에서 온 것이다 — 근거를 케이스마다 적었다.

### E1 — 종류 여섯의 첫 열기에서 안내가 뜬다 · 확정 문구 · 잘리지 않는다

- **기기**: Android 여섯 + iOS 여섯(캡처 6장 × 2기기).
- **전제**: 안내 기록 없는 설치(`gfixture`의 기본 `pm clear` / `ios_seen_clear`).
- **조작**: 「단원별 도달」 표대로 종류마다 연다 → `probe 종류`. 한 픽스처(180초)로 모자라면 `fixture_left`를 보고 새로 시작한다(기록이 비므로 종류마다 처음 열기가 된다).
- **구현 전 관찰**(e2e-red): 같은 절차를 `WHICH=before`로 돌리면 어느 종류에서도 안내가 뜨지 않는다 — 한 화면(`E1-sentence-order-guide`)이 안내 없는 학습 화면이어야 한다. 이게 안 맞으면 구현 전 번들이 아니다.
- **판정**
  1. **눈**: `E1-<종류>-guide.png`에 제목 · 설명 · 화살표 · 「Tap anywhere to continue」가 보이고, 문구가 계약 r02.2의 표와 **한 글자씩** 같다(곧은 `'`, 끝의 마침표, 제목에는 마침표 없음). 낱말이 줄바꿈 때문에 잘리지 않는다.

     | 종류 | 제목 | 설명 |
     |---|---|---|
     | `sentence-order` | Just one piece this time | Usually you put several pieces in order. Here there's only one, so tap it, then tap Check. |
     | `messenger` | Just one reply this time | Usually you choose a reply or type your own. Here there's only one, so tap it and send. |
     | `phone-call` | Reply with a tap | Tap Accept and listen. You don't need to speak, so just tap your reply when it's your turn. |
     | `visual-novel` | Your lines are ready | Tap Next to read each line. Your replies are already written, so there's nothing to choose. |
     | `speaking` | Try it, or skip it | Tap Speak and read the sentence out loud, or tap Skip if you're not ready. |
     | `writing` | Trace it, or skip it | Follow the pale letter with your finger and tap Check, or tap Skip to move on. |

  2. **픽셀**: `python3 "$TOOLS/guidepx.py" textbox "$OUT/E1-<종류>-guide.png"` → **PASS**(글자 상자가 좌우 24px 여백 안, 가로줄 묶음이 제목 · 설명 · 닫는 법으로 3개 이상). 스크림 0.8 아래의 앱 글자는 합성 최대값이 약 72라 이 판독에 안 든다 — 든 것은 안내의 글자뿐이다.
  3. **저장**: `seen_read`(iOS `ios_seen_read`)가 닫은 뒤 그 종류를 담는다. 안내가 뜬 채(닫기 전)에는 담지 않는다.
  4. 닫은 캡처 `E1-<종류>-closed.png`에 안내가 없다(`guidepx.py flat`이 스크림 합성색을 못 찾는다 — E14의 값으로).
  5. (r03) **판도 잘리지 않는다**: 글자 상자뿐 아니라 판의 상자가 화면 안이다 — 판의 판독은 E17의 `panel`, 큰 글꼴에서의 위치는 E13이 진다.
- **iOS**: 같은 판정. 캡처는 `$IOSOUT`에 `iosshot`으로, 닫기는 화면 가운데 `iostap 201 437`. ⟨2026-10-09⟩ 실행된 것은 **E18 — 전화 한 종류(시뮬레이터 · dev playground)** 뿐이다(뜬다 · 잘리지 않는다 통과, 문구의 글자 단위 대조는 하지 않음). 나머지 다섯 종류는 미실행.

### E2 — 스크림이 상단 띠 · 하단 띠까지 화면 전체를 덮는다

- **기기**: Android · iOS. **볼 것**: 안내 루트(`position: fixed`, Fragment 형제)가 상태바 아래만이 아니라 **상단 띠(시계 · 아이콘 뒤)와 하단 띠까지** 덮는가, 말하기에서 카드 스크롤 레이어에 잘리지 않는가.
- **조작**: E1의 `E1-<종류>-guide.png`를 쓴다(새 조작 없음).
- **판정(Android, 제스처 모드)**
  ```sh
  # 상단 띠: 시계(왼쪽)와 펀치홀(가운데 540) 사이의 빈 자리. 하단 띠: 내비게이션 필(가운데) 옆 빈 자리. 좌표가 글자 · 필 위면 번짐으로 FAIL이 나니 캡처를 보고 옮긴다
  for K in sentence-order messenger phone-call visual-novel speaking writing; do
    echo "== $K"
    python3 "$TOOLS/guidepx.py" covered "$OUT/E1-$K-guide.png" 400 70 100
    python3 "$TOOLS/guidepx.py" covered "$OUT/E1-$K-guide.png" 200 2380 100
  done
  ```
  - `covered`가 **PASS**(그 자리가 평평하고 가장 밝은 채널 ≤ 100 — 합성색이 어두운 스크림이다). 비주얼 노벨은 그림 위라 번짐으로 FAIL이 날 수 있다 — 그 한 종류는 **눈**으로 상단 띠가 어둡게 덮였는지 본다.
  - **눈**: 말하기의 `E1-speaking-guide.png`에서 카드 영역 위아래에 **밝은 줄무늬 · 잘린 경계가 없다**.
  - (r03) 안내 루트에 안전 영역 padding이 생겼어도 **스크림은 padding 안쪽으로 줄지 않는다**(스크림은 `position: absolute` 네 변 0). 위 `covered`가 상단 · 하단 띠에서 PASS이면 스크림이 띠까지 덮은 것이다 — 어기면 **FAIL**(스크림이 padding 안쪽으로 줄었다는 뜻).
- **구현 전 기대**: 안내가 없어 `covered`가 FAIL(밝은 면)이다. 이 항목은 구현 전에 실패할 수 있다.
- **iOS**: 눈으로 노치 · 다이내믹 아일랜드 띠와 홈 인디케이터 띠가 어둡게 덮였는지 본다(좌표 판독은 하지 않는다). ⟨2026-10-09⟩ 실행된 것은 **E18 (b) — 전화 한 종류**(네 모서리 표본점, 통과)뿐이다. 나머지 다섯 종류는 미실행.

### E3 — 스크림 아래 조작부를 눌러도 안내만 닫힌다

- **기기**: Android · iOS. **볼 것**: 테스트 환경에는 hit-test가 없어 스크림 아래의 `×`가 핸들러에 닿는 것으로 보인다 — 실제 기기에서만 「안 눌린다」가 판정된다(계약 §3.4 · 위험 3). 쓰기 캔버스에 선이 남지 않는가도 여기서만 본다.
- **비용**: 안내는 종류마다 **기기에서 한 번**만 뜨고, 한 번 누르면 닫힌다. **누르는 자리 하나 = 새 안내 하나 = 기록 초기화 한 번 = 픽스처 한 번**이다. 그래서 종류마다 **필수 자리**를 먼저 보고, 나머지는 시간이 되면 보탠다.

  | 종류 | 필수 자리 | 보탤 자리 | 같이 볼 호출 |
  |---|---|---|---|
  | `sentence-order` | 조각 칩 · `×`(왼쪽 위) | `Check` | `SoundEffectsModule.play`(버튼음 · 정답음) 0회 |
  | `messenger` | 보기 버튼 | 보내기 화살표 | — |
  | `phone-call` | `Accept` | 나가기 버튼(막지 **않는다** — 아래) | `SoundEffectsModule.play.accept_call` 0회 |
  | `visual-novel` | `Next` | — | — |
  | `speaking` | `Speak` | `Skip` | `SpeechRecognitionModule.requestPermissions` 0회 · 권한 창 없음 |
  | `writing` | 캔버스 위 선 긋기 | `Skip` | `HandwritingTraceModule.compare` 0회 |

- **조작(한 자리)**
  1. 기준 캡처가 필요하다: E1의 `E1-<종류>-closed.png`(안내를 탭으로 닫은 화면). 거기서 조작부 좌표를 읽는다 — 좌표는 눈으로 읽는다(Lynx 내용은 트리에 없다).
  2. 같은 단원을 **새 기록**으로 다시 연다(`gfixture` 기본 `pm clear` → 도달). 안내가 뜬 것을 `shot E3-<종류>-<자리>-shown`으로 확인한다.
  3. `A logcat -c` → 읽은 좌표를 누른다(`tapxy X Y`; 선 긋기는 `A shell input swipe X1 Y1 X2 Y2 400`) → `sleep 2` → `shot E3-<종류>-<자리>-after` → `logsave E3-<종류>-<자리>`.
  4. 안내가 아직 남았으면(쓰기 캔버스의 드래그는 안내를 닫지 않는다 [실측(2026-10-08)] — 가운데 탭으로 닫은 뒤 `diff` 0이 「선 없음」이었다) 화면 가운데를 한 번 눌러 닫고 `shot E3-<종류>-<자리>-closed2`를 한 장 더 뜬다. **이때 안내가 안 닫히는 것은 결함이 아니다** — 판정은 닫은 뒤 화면에 선이 있는가다. 닫힘 여부를 기록한다.
- **판정**
  - **픽셀**: `python3 "$TOOLS/barscan.py" diff "$OUT/E1-<종류>-closed.png" "$OUT/E3-<종류>-<자리>-after.png"` 가 **다른 행 0**(조작이 적용됐다면 칩이 옮겨지고 · 선이 남고 · 장면이 넘어가 다른 행이 생긴다). 닫은 화면이 시간으로 움직이는 종류(메신저의 첫 메시지 타이핑 · 전화의 수신 화면)는 0이 안 나올 수 있다 — 그 둘은 **눈**으로 판정하고 「움직여서 diff 못 씀」이라고 적는다. 안내가 닫혔는가는 `guidepx.py flat`이 스크림 합성색을 못 찾는 것으로 본다(E14 값).
  - **눈**: 조각이 답 칸에 놓이지 않았다 · 통화가 시작되지 않았다(`Accept`가 그대로 있다) · 장면이 안 넘어갔다 · 마이크 권한 창이 없다(`A shell dumpsys window | tr -d '\r' | grep mCurrentFocus`가 앱의 `MainActivity`이고 `GrantPermissionsActivity`가 아니다 — `grep -c GrantPermissionsActivity`는 ANR 기록 줄까지 세어 창이 없어도 118이 나온다 [실측(2026-10-08)]) · 캔버스에 선이 없다 · **나가기 확인창이 뜨지 않았다**(`×`).
  - **호출**(Android): `lcalls`로 위 표의 「같이 볼 호출」이 해당 구간 logcat에서 **0**.
  - **(r03) 판 위를 누른 경우를 한 번 더 본다**(`speaking` 하나): 새 기록으로 연 안내에서 `E1-speaking-guide.png`의 판 상자(`guidepx.py panel`의 출력)를 읽고 **판의 안쪽 가장자리 근처의 평평한 자리**(왼쪽 가장자리 x + 12, 세로 가운데)를 눌러 닫는다. 안내만 닫혀야 한다(위와 같은 판정). 기본 `probe`의 닫기 탭(화면 가운데)도 판 위지만 글자 위일 수 있어, 평평한 자리 한 번을 따로 둔다.
  - **나가기는 막지 않는다**(계약 원칙 3): 전화의 나가기 버튼은 스크림에 **가려질 뿐**이라 이 기기에서 누르면 안내만 닫혀야 한다(눌렸다면 화면이 나가진다 — 그것은 FAIL이 아니라 「스크림이 탭을 못 가로챈 것」이므로 E3 FAIL로 적는다).
  - **E3b — 닫은 뒤 복원**: 안내를 닫은 뒤 같은 단원의 버튼(예: `Check`/`Skip`)을 누르면 평소의 효과음이 난다(`lcalls SoundEffectsModule.play … ≥ 1`). 구현 기록의 「계약 밖 한 줄」(안내 중 액션 버튼 효과음 끔)이 닫은 뒤에도 남지 않았는지 본다.
- **구현 전 기대**: 안내가 없어 첫 탭이 조작을 실제로 실행한다(diff > 0). 이 항목은 구현 전에 실패한다.
- **iOS**: ⟨2026-10-09⟩ 실행된 것은 **E18 (c) — 전화의 `Accept` 한 자리**(안내만 닫히고 통화가 시작되지 않음 · 기록이 남음, 통과)뿐이다. 다른 자리 · 다섯 종류는 미실행.

### E4 — 전화: 떠 있는 동안 벨이 없고 닫는 순간부터 울린다

- **기기**: Android(기계) · iOS(귀). **볼 것**: 전화 화면이 서면 벨이 울리는데, 안내가 떠 있는 동안은 울리지 않고 **닫는 순간** 울려야 한다(계약 §3.4).
- **조작(Android)**
  ```sh
  gfixture -e visualNovelProgress true            # 기록 없는 설치. 전화는 복습으로 연다(「단원별 도달」)
  # …맵에서 A Call from Minseo 좌표를 읽어 연다 — 그 직전에 구간을 시작한다:
  aevents > "$OUT/E4-events-before.txt"; A logcat -c
  # tapxy X Y   ← 전화 항목
  shot E4-shown; sleep 5                           # 안내가 떠 있는 5초
  logsave E4-during; aevents > "$OUT/E4-events-during.txt"
  A shell input tap 540 1200; sleep 2              # 닫기
  logsave E4-after; aevents > "$OUT/E4-events-after.txt"
  echo "벨 호출 — 떠 있는 동안: $(lcalls SoundEffectsModule.play.ring_bell "$OUT/E4-during.logcat") / 닫은 뒤: $(lcalls SoundEffectsModule.play.ring_bell "$OUT/E4-after.logcat")"
  wc -l "$OUT"/E4-events-*.txt
  ```
- **판정**
  - `ring_bell` 호출: 떠 있는 동안 **0**, 닫은 뒤 **1 이상**.
  - `dumpsys audio` 플레이어 이력: `E4-events-during.txt`가 `before`와 같은 줄 수(새 `started` 없음), `after`에 새 `started`가 생긴다. 줄 모양이 Android 버전과 달라 비교가 안 되면 `android-assets.md` E5의 주의대로 먼저 플레이어 절을 찾는다 — 이력이 읽히지 않으면 logcat만 판정이고 그렇다고 적는다.
  - **귀**(에뮬레이터 소리는 호스트 스피커로 나온다): 5초 동안 벨이 안 들리고 닫는 순간부터 들린다. 소리가 안 나오는 환경이면 「귀: 불가」로 적는다.
  - `E4-shown.png`에서 `Accept`가 가려져 있고 통화 국면이 수신 그대로다(눈).
- **iOS**: `tutorial-specials`의 둘째 단계(전화)에서 5초 듣고 닫는다. **귀로만** 판정하고 「기계 판정 없음」이라고 적는다. ⟨2026-10-09⟩ E18 (e)로 들으려 했으나 **미실행**(에이전트는 소리를 듣지 못한다) — 실기 출시 조건 i4로 남는다.
- **구현 전 기대**: 안내가 없어 벨이 화면이 서자마자 운다(떠 있는 동안 호출 ≥ 1).

### E5 — 메신저: 닫은 뒤에 첫 메시지가 타이핑으로 나타난다

- **기기**: Android · iOS.
- **조작**: 메신저(복습 — `vnanchor` 뒤 `review_open 756`)를 연다 → 안내가 뜬 상태로 `shot E5-a`, 5초 뒤 `shot E5-b`(여전히 안내).
  **닫은 뒤는 캡처가 아니라 `screenrecord` 프레임으로 본다.** 캡처는 명령이 돌아오기까지 0.5초쯤 늦어 0.4초 캡처(`E5-c1`)에 첫 메시지가 이미 완성돼 있었다 — 「타이핑 시작」을 못 봤다 [실측(2026-10-08)].
  ```sh
  # 녹화를 먼저 시작하고 1.5초 뒤 안내를 닫는 탭을 기기 안에서 보낸다(adb 지연이 끼지 않는다). 12초 녹화 [유도 — 첫 실행은 이 방법을 쓰지 않았다]
  A shell "screenrecord --time-limit 12 /sdcard/E5.mp4 & sleep 1.5; input tap 540 1200; wait" >/dev/null
  A pull /sdcard/E5.mp4 "$OUT/E5.mp4" >/dev/null
  # 프레임 뽑기: android-launch-appearance.md 도구의 `frames`(Swift) — `frames "$OUT/E5.mp4"`가 프레임 표를, `--save 인덱스,… --out 폴더`가 그 프레임의 PNG를 낸다
  ```
- **판정**
  - **픽셀(안내 중)**: `python3 "$TOOLS/barscan.py" diff "$OUT/E5-a.png" "$OUT/E5-b.png"` **다른 행 0** — 안내가 떠 있는 동안 뒤쪽 대화가 움직이지 않는다(스크림 0.8 아래의 타이핑 점이 움직이면 몇 행이 달라진다).
  - **눈(안내 중)**: `E5-a`/`E5-b` 뒤로 메시지 말풍선이 안 보인다.
  - **눈(닫은 뒤, 프레임)**: 탭 뒤 프레임에서 안내가 사라지고, **입력 중 표시(타이핑)가 보이는 프레임이 첫 메시지가 완성된 프레임보다 먼저** 있다. 안내가 사라진 첫 프레임에 이미 완성된 메시지가 있으면 안내 중에 흘러간 것이다 — FAIL(첫 실행에서는 `E5-a`/`E5-b`에 말풍선이 없어 안내 중에 흘러간 것은 아니었다). `screenrecord`는 화면이 바뀔 때만 프레임을 내므로 간격이 불규칙하다 — 안내가 사라진 프레임과 타이핑 프레임 사이가 너무 성기면(0.5초 이상) 「판정 불가」로 적는다.
- **구현 전 기대**: 안내가 없어 `E5-a`부터 메시지가 흐른다.

### E6 — 시스템 뒤로가기 한 번은 안내만 닫는다 (Android: 제스처 · 3버튼)

- **기기**: Android. 내비게이션 모드는 둘 다 본다. **끝에 제스처(2)로 되돌린다.**
  ```sh
  A shell cmd overlay enable com.android.internal.systemui.navbar.threebutton   # 3버튼
  A shell cmd overlay enable com.android.internal.systemui.navbar.gestural      # 제스처
  A shell settings get secure navigation_mode                                   # 0 = 3버튼, 2 = 제스처. cmd overlay list는 모드 확인에 쓰지 않는다
  ```
- **조작**(종류 하나 이상 — 학습 셸 한 종류(`speaking` 권장)와 특별 단원 한 종류(`visual-novel`)):
  1. 안내가 뜬 화면에서 뒤로가기 **한 번**: 3버튼은 `A shell input keyevent KEYCODE_BACK`, 제스처는 가장자리 스와이프 `A shell input swipe 2 1200 400 1200 150`(키 이벤트는 모드와 무관하게 같은 경로이므로 제스처 모드의 **스와이프도 한 번은** 해 본다).
  2. `sleep 1.5` → `shot E6-<종류>-back1` → `logsave`.
  3. 한 번 더 → `sleep 1.5` → `shot E6-<종류>-back2`.
- **판정**
  - **한 번**: 안내만 사라졌다(`barscan.py diff E1-<종류>-closed.png E6-<종류>-back1.png` **0**, 또는 눈), **화면은 그대로**(학습 셸이 서 있다 — `A shell dumpsys activity activities | grep mResumedActivity`가 여전히 `MainActivity`, 앱이 나가지 않았다), 나가기 확인창이 없다. `lcalls SystemBackModule.respond`가 **1 이상**(호스트가 「처리함」으로 응답).
  - **두 번째**: 학습 셸(`speaking`)은 **나가기 확인창**이 뜬다(`E6-speaking-back2.png`, 눈). 특별 단원(`visual-novel`)은 **맵으로** 나간다(`waitre '^Journey, selected' 10`).
  - 둘째 뒤로가기가 앱을 바로 끝내면(`mResumedActivity`가 런처) FAIL.
- **구현 전 기대**: 안내가 없어 첫 뒤로가기가 곧바로 확인창 · 맵이다.

### E7 — 닫은 뒤 다시 열어도 · 같은 종류의 다른 단원 · 앱을 다시 켜도 안 뜬다

- **기기**: Android · iOS.
- **조작(Android)** — 종류 하나(`speaking` 권장; 시간이 되면 여섯 모두)
  1. 기록 없는 설치로 열어 안내를 탭으로 닫는다. `seen_read` → 그 종류. `logsave E7-first` (`lcalls StorageModule.set` ≥ 1).
  2. 나가기(`×` → 확인창 → 나가기, 또는 완료)로 맵에 돌아가 **같은 단원을 다시 연다**. `shot E7-<종류>-reopen`, `logsave E7-reopen`.
  3. **같은 종류의 다른 단원**: 문장 만들기라면 `greeting`을 풀어 통과 → `introduction`을 연다(`shot E7-sentence-order-second`). 다른 종류는 한 단원뿐이라 이 단계가 없다 — 「해당 없음」.
  4. **앱 다시 켜기**: `gkill` → `seen_read`가 그 종류를 **여전히** 담는다 → `KEEP=1 gfixture -e <같은 시드>` → 같은 단원을 열고 `shot E7-<종류>-restart`, `logsave E7-restart`.
- **판정**
  - 2 · 3 · 4의 캡처에 안내가 없다(눈 + `guidepx.py flat`이 스크림 합성색을 못 찾음). 단원은 평소대로 서 있다(문항 화면).
  - 2 · 3 · 4의 구간 logcat에서 **안내 키로의 `StorageModule.set`이 0**(안 뜨니 닫을 일이 없다). 줄에 키가 안 나오면 `seen_read`의 값이 앞과 같은지로 본다.
  - 4의 `seen_read`는 강제 종료 **전 · 후 같다**.
- **iOS**: `ios_seen_read`로 같은 판정. 앱 다시 켜기는 `xcrun simctl terminate` → `ioslaunch` → 같은 화면. 앱이 닫으며 쓴 기록은 앱 컨테이너 plist에 있고, `ios_seen_read`가 그 plist를 먼저 읽는다(「저장 기록 읽고 지우고 심기」의 주, E18; 고친 함수는 기기에서 미실행 — 첫 사용에서 출력을 확인한다).
- **구현 전 기대**: 안내가 없어 이 항목은 구현 전에도 「안 뜬다」로 통과한다 — **가드**다. 저장이 실제로 일어났는지는 1단계의 `seen_read`가 진다.

### E8 — 안내가 뜬 채 강제 종료하면 다시 뜬다

- **기기**: Android · iOS. 계약은 「닫을 때 쓴다 — 뜨기만 하고 닫지 않으면 쓰지 않는다」(§3.3).
- **조작(Android)**: 기록 없는 설치로 종류 하나를 열어 안내를 **닫지 않고** `shot E8-<종류>-shown` → `seen_read` → `gkill` → `seen_read` → `KEEP=1 gfixture …` → 같은 단원 → `shot E8-<종류>-again`.
- **판정**: 두 `seen_read`가 모두 그 종류를 **담지 않는다**(`(none)` 또는 다른 종류만). `E8-<종류>-again.png`에 안내가 다시 선다.
- **iOS**: `xcrun simctl terminate` 뒤 `ios_seen_read`, `ioslaunch`, 같은 화면. (이 케이스는 닫지 않으므로 앱이 쓴 기록이 없어야 한다 — 「없음」의 확인도 컨테이너 plist를 먼저 읽는 `ios_seen_read`가 한다. 「저장 기록 읽고 지우고 심기」의 주)

### E9 — 떠 있는 동안 밝은 상태바 아이콘, 닫으면 복귀 (비주얼 노벨은 계속 밝음) (Android)

- **기기**: Android. 판정 정의(1차 `apr=` · 2차 `sbpng.py check`)는 `android-status-bar-icons.md`의 「판정 정의」를 그대로 쓴다.
- **조작 · 판정**(종류마다, E1의 열기에서 안내가 떠 있는 동안)
  ```sh
  K=speaking                                          # 종류마다 바꾼다. 아래 BG는 표의 「상단 띠 바탕 기대」
  BG='#48494C'
  want_light_icons                                    # 1차: LIGHT_STATUS_BARS 없음 · LIGHT_NAVIGATION_BARS 있음
  sbcheck "E9-$K-shown" light                         # 2차: 시계 ≥ 4.5 · 아이콘 묶음 각각 ≥ 3.0 (design 계산 8.99 ~ 9.16, 비주얼 노벨 17.39)
  # 상단 띠의 바탕이 E14와 같은 어두운 색인가 — 종류별 합성색을 --bg-expect로 건다(아래 표). 비주얼 노벨은 그림 위라 건너뛰고 눈으로 본다
  sbcheck "E9-$K-shown-bg" light --bg-expect "$BG" --bg-tol 8
  A shell input tap 540 1200; sleep 2
  want_dark_icons                                     # 닫은 뒤: 학습 셸 · 메신저 · 전화는 LIGHT_STATUS_BARS 있음(어두운 아이콘 복귀). 비주얼 노벨은 want_light_icons
  ```
  | 종류 | 안내 중 | 닫은 뒤 | 상단 띠 바탕 기대 |
  |---|---|---|---|
  | `sentence-order` · `speaking` · `writing`(학습 셸 면 `#FFFDFC`) | 밝은 아이콘 | **어두운 아이콘** | `#48494C` ±8 |
  | `messenger`(흰 면) | 밝은 아이콘 | **어두운 아이콘** | `#48494D` ±8 |
  | `phone-call`(`#FAF7F4`) | 밝은 아이콘 | **어두운 아이콘** | `#47484A` ±8 |
  | `visual-novel` | 밝은 아이콘 | **계속 밝은 아이콘**(`want_light_icons` 그대로) | 건너뜀 — 그림 위 명암(`#1A1A1B` 부근)을 눈으로 |
- **눈**: `E9-<종류>-shown.png`의 상단 띠에서 시계 · 아이콘이 **밝은 색**이고 띠의 바탕이 같은 어두운 스크림색이다(밝은 띠에 어두운 아이콘이 얹히지 않았다).
- **구현 전 기대**: 안내가 없어 학습 셸 · 메신저 · 전화에서 `LIGHT_STATUS_BARS`가 있다(어두운 아이콘) — `want_light_icons`가 FAIL.

### E10 — 낭독기: 첫 포커스 · 낭독 멈춤 하나 · 뒤쪽 격리 · 닫은 뒤 복원 (TalkBack 발화 글자 캡처)

**r03이 이 항목을 대체했다.** r02의 E10은 `uiautomator dump`로 접근성 트리를 읽는 방법이었고 첫 실행에서 판정이 나온 적이 없었다(덤프가 TalkBack을 풀고 알림 권한 창을 띄운다). 접근성 단계는 TalkBack을 실제로 켜고 **발화 글자를 캡처하는 방법**으로 말하기 한 종류에서 격리 실패(A1, Critical)를 잡았다 — 이 절은 그 방법을 절차로 옮긴 것이다(`accessibility.md` 「방법」 · 「TalkBack 관찰」). **r03 재실행(2026-10-09)이 말하기 · 전화 둘을 이 절차로 기기에서 돌려 통과했다**(나머지 네 종류는 미실행).

- **기기**: Android 에뮬레이터 + TalkBack(접근성 단계는 17.0.0). 여섯 종류 전부. iOS는 E10-i.
- **방법 — 접근성 단계가 쓴 것**
  1. **TalkBack이 켜진 동안 `uiautomator dump`를 쓰지 않는다.** `waitre` · `tapre` · `nodes` · `gfixture`(내부에서 `waitre`)를 부르지 않는다. 덤프가 TalkBack을 풀고 알림 권한 창을 띄운다 [실측(2026-10-09)].
  2. 낭독은 TalkBack의 **「Display speech output」** 을 켜면 화면 아래에 뜨는 발화 글자로 캡처한다(귀로 들은 것이 아니다). 이 설정은 TalkBack 앱 내부 설정이라 `settings list`에 안 잡힌다. **TalkBack 설정 첫 화면의 최상위 스위치**(Visual 절)이고, **시작 상태가 꺼짐일 수 있다** — 접근성 단계는 「켠 채 두었다」고 적었지만 r03 재실행의 에뮬레이터에서는 꺼져 있었다. 켜지 않으면 발화 띠가 비어 판정이 불가하다 [실측(2026-10-09)]. **시작 상태를 먼저 읽어 실행 결과에 적고, 끝에 그 상태로 되돌린다**(꺼짐이었으면 끈다).

     ```sh
     A shell am start -n com.google.android.marvin.talkback/com.android.talkback.TalkBackPreferencesActivity
     shot E10-prefs     # 첫 화면의 「Display speech output」 스위치(Visual 절)가 켜져 있는가 — 꺼져 있으면 눌러 켠다(좌표는 캡처에서 읽는다)
     ```

     접근성 단계는 같은 화면의 「Show instructions for turning off TalkBack」을 실수로 한 번 껐다 켰다 — 건드리지 않는다.
  3. 조작은 `adb emu event send`의 하드웨어 터치(접근성 입력 필터를 지난다): 오른쪽 · 왼쪽 쓸기 · 터치 탐색 · 두 번 탭. 걸음마다 화면을 캡처해 발화 글자 띠(`SY0`~`SY1`, 기본 y 1990~2250)를 모은다.
  4. TalkBack을 켠 직후 뜨는 알림 권한 창은 `am stack remove`로 치운다(권한 상태는 건드리지 않는다). `tb_on` · `tbfx`가 한다.
  5. 초점 위치는 초록 테두리의 경계 상자(`ring.py`).
- **준비**

  ```sh
  . "$TOOLS/tb-idioms.sh"          # 이 문서 부록 — tb_on · tbfx · step · report · swiperight · swipeleft · explore · dtap …
  tb_on; afocus                    # Bound services에 TalkBack이 있고 touchExplorationEnabled=true인지. 아니면 「미실행 — 사유」
  # 「Display speech output」이 켜져 있는지는 걸음 캡처 하나(shot E10-check)의 아래쪽 띠로 본다 — 안 보이면 켜지 않은 것이다(시작 상태는 꺼짐일 수 있다 — 위 2.의 경로로 켠다)
  ```

- **종류마다 여는 법 — `uiautomator` 없이**(위 1). `open_available` · `vnanchor` · `review_open`은 캡처 + 색 검출 + `input tap`뿐이라 TalkBack이 켜져 있어도 쓴다. 문장 만들기는 「단원별 도달」이 `tapre`로 적은 단계를 좌표로 바꾼다(좌표는 `hide-scrollbars.md` S9의 r02 실측: 표지의 `Skip` `156 2200` → 확인창의 `Skip` `540 1237` → 완료 카드의 `Back to map` `540 2043`). **말하기 · 전화의 길은 r03 재실행이 TalkBack을 켠 채로 돌렸다. 나머지 네 종류의 길은 TalkBack을 켠 채로 돌려 보지 않았다.**

  | 종류 | 여는 법 (먼저 `tb_on`) | (c)에서 터치 탐색할 뒤 조작부 `BX BY` |
  |---|---|---|
  | `speaking` | `tbfx -e speechProgress true` → `open_available` | 왼쪽 위 `×` `115 380` |
  | `writing` | `tbfx -e writingProgress true` → `open_available` | `×` `115 380` |
  | `sentence-order` | `tbfx` → `tapxy 540 442`(표지) → `tapxy 156 2200` → `tapxy 540 1237` → `tapxy 540 2043` → `open_available` | `×` `115 380` |
  | `messenger` | `tbfx -e visualNovelProgress true` → `vnanchor` → `review_open 756` | 뒤로가기(`Back to map`) 버튼 — 안내가 뜬 캡처에서 좌표를 읽는다 |
  | `phone-call` | 같은 시드 → `vnanchor` → `review_open 378` | 뒤로가기 버튼 — 같음 |
  | `visual-novel` | 같은 시드 → `vnanchor` → `tapxy 540 "$VNY"` | 뒤로가기 버튼 — 같음 |

  각 실행은 약 180초(픽스처) 안에 끝낸다. 기본은 `pm clear`라 안내 기록이 없는 처음 열기다.
- **조작 — 종류마다**(안내가 뜬 직후부터)

  ```sh
  # e10_steps 종류 BX BY — (a) ~ (e)를 걸음마다 캡처한다. BX BY = 위 표의 뒤 조작부
  e10_steps() {
    local K=$1; STEPS=()
    step "E10-$K-a" sleep 2                                          # (a) 뜬 직후의 첫 발화
    for I in 1 2 3 4 5 6; do step "E10-$K-b-r$I" swiperight 1200; done   # (b) 오른쪽 쓸기 6번
    for I in 1 2; do step "E10-$K-b-l$I" swipeleft 1200; done            #     왼쪽 쓸기 2번
    step "E10-$K-c" explore "$2" "$3"                                # (c) 뒤 조작부 자리를 터치 탐색
    step "E10-$K-d0" explore 540 1200                                # (d) 안내 상자에 초점을 두고
    step "E10-$K-d" dtap 540 1200                                    #     두 번 탭
    for I in 1 2 3 4; do step "E10-$K-e-r$I" swiperight 1200; done  # (e) 닫은 뒤 오른쪽 쓸기 4번
    report "E10-$K"                                                  # → 초점 테두리 상자 목록 + $OUT/E10-<종류>-speech.png
    echo "seen: $(seen_read)"                                        # (d)의 기록
  }
  # 예: 말하기
  tb_on; tbfx -e speechProgress true; open_available && e10_steps speaking 115 380
  ```

  (c)의 `BX BY`가 안내 상자 안이면 터치 탐색이 안내를 가리킬 뿐이라 의미가 없다 — 위 표의 좌표가 안내 상자 **밖**인지 `E10-<종류>-a.png`로 먼저 본다.
- **판정** — 아래 다섯을 **여섯 종류 각각**에서. `E10-<종류>-speech.png`(걸음마다 발화 띠를 위에서 아래로 쌓은 그림)를 열어 걸음별 발화를 읽어 적는다. 글자 인식 도구는 없다.
  - **(a) 첫 발화는 하나다**: 걸음 `a`의 띠가 `제목. 설명 Tap anywhere to continue. Button` **한 덩어리**다(제목 · 설명은 E1의 표). 같은 문장이 두 번 나오거나 제목 · 설명이 따로 나오면 FAIL.
  - **(b) 여덟 걸음의 발화에 뒤 화면의 이름이 0건**이고 제목 · 설명 · 닫는 법이 **따로 읽히지 않는다**(A2). 쓸기는 안내 상자 하나를 맴돌므로 여덟 걸음 모두 `제목. 설명 …` 한 덩어리이거나 같은 요소가 다시 읽힌 것이어야 한다. 뒤 화면의 이름은 r02 구현 위에서 새던 것이다: 말하기 `Leave lesson` · `Lesson 1 / 1` · `Speaking, question 1 of 1` · `Speaking` · `안녕하세요` · `annyeonghaseyo` · `Hello.` · `Speak` · `Skip`, 전화 · 메신저 `Back to map`, 비주얼 노벨 `Back to map` · `Our Imagined Café` · `Scene 1 / 3` · 서술문. 이 목록에 없는 이름도 안내 문구가 아니면 뒤 화면의 것이다.
  - **(c) 초점 테두리가 안내 상자에 머문다**: 뒤 조작부 자리를 터치 탐색해도 초점이 뒤 요소로 가지 않는다(발화가 안내 문구이거나 무발화). 기계 보조 — 판 상자를 읽고(`E10-<종류>-a.png`) 테두리 상자가 그 안(여유 12px)에 드는가:

    ```sh
    K=speaking                                                                  # 종류 이름
    read -r PX0 PX1 PY0 PY1 <<<"$(python3 "$TOOLS/guidepx.py" panel "$OUT/E10-$K-a.png" '#1F2124' 6 | sed -n '1s/.*x \([0-9]*\)~\([0-9]*\) y \([0-9]*\)~\([0-9]*\).*/\1 \2 \3 \4/p')"
    python3 "$TOOLS/ring.py" inside "$OUT/E10-$K-c.png" $((PX0 - 12)) $((PY0 - 12)) $((PX1 + 12)) $((PY1 + 12))    # inside면 0
    ```

    비주얼 노벨은 바탕이 어두워 판 윤곽이 안 읽힌다(`panel`이 판정 불가) — 테두리 상자(`ring.py` 목록)와 캡처를 눈으로 맞춘다.
  - **(d) 두 번 탭으로 안내가 닫힌다**: `E10-<종류>-d.png`에 안내가 없고(눈 + `guidepx.py flat`이 스크림 합성색을 못 찾음) `seen_read`가 그 종류를 담는다.
  - **(e) 닫은 뒤 뒤 화면의 이름이 발화에 다시 나온다**: 걸음 `e-r1~4`의 발화에 (b)의 뒤 화면 이름이 **1건 이상** 있다(복원). 안내 문구는 없다.

  하나라도 어기면 **FAIL** — 접근성 단계의 Critical.
- **구현 전 관찰**(e2e-red를 다시 돌리지 않는다): r02 구현 위의 접근성 단계 실행이 곧 이 항목의 구현 전 red다 — (b) 뒤 화면 발화 다수, 제목 · 설명 · 닫는 법이 따로 읽힘 3건(`tb-*-speech.png`).
- **끝에**: `tb_off`; 「Display speech output」을 **시작 상태로** 되돌린다(꺼짐이었으면 끈다); `afocus`로 서비스가 풀렸는지 본다; `A shell settings get secure enabled_accessibility_services`가 비어 있다(전역 설정 원복).

### E10-r — 복원의 반복: 열고 닫기를 세 번 거듭해도 매번 복원된다

- **기기**: Android + TalkBack. 말하기. **볼 것**: 닫을 때 배타 포커스가 풀리는 일이 한 번이 아니라 거듭해도 서는가, 그리고 마지막에 나가서 **맵이 읽히는가**(맵에서 빠지지 않은 배타 항목이 있으면 맵이 통째로 안 읽힌다 — 계약 r03.2 위험 3).
- **조작**: 설치 초기화부터 세 번(`pm clear`가 `tbfx`의 기본이다).

  ```sh
  tb_on
  for N in 1 2 3; do
    tbfx -e speechProgress true; open_available || { echo "도달 실패 $N"; break; }
    STEPS=()
    step "E10r-$N-a" sleep 2                                       # (a)
    step "E10r-$N-d0" explore 540 1200; step "E10r-$N-d" dtap 540 1200   # (d)
    for I in 1 2 3 4; do step "E10r-$N-e-r$I" swiperight 1200; done     # (e)
    report "E10r-$N"; echo "seen: $(seen_read)"
  done
  # 셋째 뒤: 문항에서 나가 맵까지 간다(왼쪽 위 ×와 확인창의 확정 — uiautomator 없이 좌표로) → 맵에서 쓸기 4번
  STEPS=(); tapxy 115 380; sleep 1.5; tapxy 540 1237; sleep 3
  for I in 1 2 3 4; do step "E10r-map-r$I" swiperight 1200; done
  report "E10r-map"
  ```
- **판정**: 세 번 모두 (a)가 안내 한 덩어리이고 (e)에 뒤 화면 이름이 다시 나온다. 맵의 걸음(`E10r-map-*`)에서 맵의 요소(탭 바의 이름 등)가 **읽힌다** — 아무것도 안 읽히거나 안내 문구가 읽히면 FAIL. 한 번이라도 복원이 안 서면 FAIL.

### E10-l — 관찰: 안내가 뜬 뒤에 TalkBack을 켠다

- **기기**: Android. 말하기 한 번. **볼 것**: 배타 포커스는 요소가 붙는 때 서는 속성이라, 안내가 이미 떠 있는 상태에서 TalkBack을 켜면 격리되는가. **계약 r04(S4)가 정했다 — 「격리될 것」은 반증됐다(accessibility-r03 N1 · e2e-r03). 원인은 이 기능이 아니라 앱 전체의 기존 동작(앱이 뜬 뒤 TalkBack을 켜면 Lynx 낭독 트리가 서지 않는다)이고, 이 케이스의 판정은 「지적(기존 동작)」이다.**
- **조작**: TalkBack을 끈 채로 안내를 띄운다(TalkBack이 꺼져 있으므로 `gfixture`의 `waitre`를 써도 된다). 그 뒤에 켠다.

  ```sh
  tb_off; gfixture -e speechProgress true; open_available; shot E10l-shown
  tb_on                                                               # 안내가 뜬 뒤
  STEPS=(); for I in 1 2 3 4 5 6; do step "E10l-r$I" swiperight 1200; done
  report E10l
  ```
- **판정**: **지적(기존 동작)** — 뒤 화면 발화가 있으면 값(어느 이름이 몇 번째 걸음에서)을 적어 넘긴다. FAIL이 아니다(계약 r04 S4; 원인은 앱 전체의 기존 동작). 0건이어도 통과로 올리지 않고 그대로 기록한다.

### E10-i — iOS VoiceOver: 격리 · 두 번 읽힘 · 닫은 뒤 복원

- **기기**: iOS(실기 권장). 시뮬레이터는 낭독을 하지 않으므로 Accessibility Inspector로 트리만 관찰한다. 도달은 위 「iOS 시뮬레이터 — 준비와 도달」(말하기 · 전화).
- **조작**: E10의 (a) ~ (e)를 말하기 · 전화 둘에서 사람이 한다(VoiceOver를 켜고 안내가 뜬 직후의 낭독, 오른쪽 쓸기, 안내를 두 번 탭해 닫기, 닫은 뒤 쓸기).
- **판정**: E10과 같다. 특히 볼 것 둘: 뜰 때 **두 번 읽히는가**(배타 포커스와 `accessibility-elements-hidden`이 겹친다), 닫은 뒤 **뒤 화면이 읽히는가**(`accessibility-elements-hidden`을 `false`로 쓰고, 배타 포커스는 `LynxUI dealloc`에 기대 복원된다 — 계약 r03.2 위험 1 · 2).
- **돌리지 못하면 「미실행 — 사유」로 적는다.** 통과로 적지 않고 「이 절차로 확인되지 않는 것」에 둔다(출시 전 확인 항목). 이 문서를 고친 단계는 iOS를 쓰지 않아 **미실행**이다.
- ⟨2026-10-09⟩ 여전히 **미실행**이고 출시 조건 [i1 ~ i3](ios-release-checks.md)이다. 시뮬레이터 E18 (d)의 idb 트리(VoiceOver 꺼짐)에서 **안내가 떠 있는 동안 `Back to map` 버튼이 트리에 남았다** — 실기에서 VoiceOver로 쓸 때 그 버튼에 닿는지를 함께 본다(i1).

### E11 — 대상이 아닌 문항에서 새 안내가 없다 · 새 사용자의 첫 단원은 기존 안내 그대로

- **기기**: Android · iOS(a만).
- **(a) 비대상 문항**: **안내 기록이 없는 설치**로(그래야 뜰 수 있는 조건이다) 아래를 차례로 연다.
  - 조각이 둘 이상인 문장 만들기: **`Making plans`**(`appointment`, 조각 둘) — 첫 실행이 통과로 본 것 · **`Ordering`**(`ordering`, 조각 **셋** `주세요` · `물` · `좀`) — r03 재실행이 통과(안내 없음, `seen_read (none)`). 조각 하나인 것은 `Asking names`(`introduction`)로, **대상 문항이다**(안내가 뜨는 것이 맞다 — 비대상 목록에 넣지 않는다. 첫 실행이 이것을 `Ordering`으로 오인했다). `directions`는 기기에서 조각 수를 세지 못했다
  - 듣기 `tutorial-listening`(첫 실행 통과) · 최종 테스트(도입 서사를 넘겨 시험 단계까지) · 첫 단원 서사(표지 → 서사: `tapxy 540 442` 이후 — `loadProgress` 없이)
  - 도달: 「단원별 도달」 표의 비대상 줄. 단원마다 `shot E11-<단원>`.
  - **판정**: 어느 캡처에도 안내(스크림 · 새 제목)가 없고(눈 + `guidepx.py flat`이 합성색을 못 찾음), 각 단원 뒤에도 `seen_read`가 `(none)`이다(**안내 키가 쓰이지 않았다**), `lcalls StorageModule.set`이 안내 키로 0.
  - 한 가지 주의: 같은 설치에서 **대상 단원을 먼저 열면** 그 종류가 기록돼 이 판정이 오염되지 않는다(다른 종류) — 그래도 순서는 비대상이 먼저다.
- **(b) 새 사용자의 첫 단원**: **E16과 같은 실행이다**(아래). 기존 안내 넷(맵 · 서사 · 채팅 · 통화)이 전과 같이 뜨고, 그것들을 닫는 동안 새 키에는 쓰기가 없다(`seen_read` `(none)`), 어느 시점에도 새 안내와 기존 안내가 함께 서지 않는다(눈).

### E12 — 로그아웃 → 다시 들어와도 닫은 종류는 안 뜬다 (Android)

- **기기**: Android. iOS에는 로그인 픽스처가 없어 해당 없음. 계약 §3.3의 **기기 범위 저장**(로그아웃 · 계정 삭제에서 지우지 않는다 — S3 기본값)을 본다.
- **조작**
  1. 기록 없는 설치로 종류 하나(`speaking` 권장)를 열어 닫는다. `seen_read` → `["speaking"]`.
  2. 탭 바의 설정(`tapxy 792 2304`) → `Sign out`(`tapre '^Sign out'`; 확인창이 뜨면 로그아웃을 확정 — 취소 쪽이 `Stay signed in` `540 1342`다) → 온보딩으로 나간다.
  3. **`seen_read`가 같은 값**(로그아웃이 키를 지우지 않았다).
  4. 「다시 들어옴」: 이 에뮬레이터에서 실제 소셜 로그인을 지나는 길은 [`android-social-login.md`](android-social-login.md)(모의 OAuth)다. 이 절차는 그 길을 돌리지 않고 **같은 세션을 다시 심는 `KEEP=1 gfixture -e speechProgress true`**로 대신한다(픽스처가 세션을 다시 쓰고 저장소를 비우지 않는다). 같은 단원을 열어 `shot E12-again`.
- **판정**: 3의 값이 1과 같고, `E12-again.png`에 안내가 없다. 4가 픽스처 대체임을 실행 결과에 적는다(소셜 로그인 왕복은 이 항목이 확인한 것이 아니다).
- **구현 전 기대**: 안내가 없어 통과한다 — 가드. 3의 `seen_read`가 구현 전 번들에서는 `(none)`이라 1단계에서 이미 갈린다.

### E13 — 글꼴 배율 최대 · 폭 360dp 이하에서 여섯 안내(와 판)가 넘치지 않는다

- **기기**: Android · iOS. 판정은 **지적을 남기는 것**이다(접근성 단계의 입력) — 넘치면 FAIL이 아니라 지적이다. 숫자는 보고용이다. r03에서 잴 대상이 글자 상자뿐 아니라 **바탕 판**의 상자가 됐다(글자 상자는 판 안쪽 여백 24dp 안에 있으므로 판이 글자보다 위아래로 24dp 더 크다).
- **조작(Android)**: **픽스처를 시작하기 전에** 설정한다(화면이 켜진 채 바꾸면 Activity가 재생성된다). 종류마다 기록 없는 설치로 열고 `probe`의 guide 캡처를 `E13-…-guide.png`로 복사해 쓴다.
  1. **글꼴 2.0, 여섯 종류**:

     ```sh
     A shell settings put system font_scale 2.0          # Android 설정의 최대 글꼴 크기(200%)
     K=speaking                                           # 종류마다 연다
     cp "$OUT/E1-$K-guide.png" "$OUT/E13-f20-$K-guide.png"
     python3 "$TOOLS/guidepx.py" textbox "$OUT/E13-f20-$K-guide.png" 132 2337 24      # 글자 상자(좌우 24px 여백 안인가, y 132~2337)
     python3 "$TOOLS/guidepx.py" panel   "$OUT/E13-f20-$K-guide.png" '#1F2124' 6 42    # 판 상자 — y0이 132(상단 띠) 아래, y1이 2337(하단 손잡이) 위인가
     # 판 아래에 같은 색 면이 붙는 종류(메신저의 하단 버튼 · 비주얼 노벨의 대사 카드)는 자동 판독이 상자를 합쳐 y1이 크게 나온다 — 눈으로 윤곽을 읽어 손으로 정한다:
     # GUIDE_BOX='X0,X1,Y0,Y1' python3 "$TOOLS/guidepx.py" panel "$OUT/E13-f20-messenger-guide.png" '#1F2124' 6 42
     ```
  2. **폭 342.9dp**(`900x2000` — 420dpi에서 342.9dp, 폭 360dp 이하):

     ```sh
     A shell wm size 900x2000
     # 픽스처를 이 크기에서 시작한다. 해상도가 바뀐 상태의 맵 진입은 `open_available 2000`(캡처 높이를 인자로)
     K=speaking; cp "$OUT/E1-$K-guide.png" "$OUT/E13-w342-$K-guide.png"
     python3 "$TOOLS/guidepx.py" textbox "$OUT/E13-w342-$K-guide.png" 132 1868 24      # 높이 2000이라 y 상한을 1868로
     python3 "$TOOLS/guidepx.py" panel   "$OUT/E13-w342-$K-guide.png" '#1F2124' 6 40   # 판의 좌우 여백이 40px(16dp = 42px, 반올림 −2) 이상인가
     ```
  3. **글꼴 2.0 + density 540의 메신저 · 전화**(화면 크기 확대): `A shell wm density 540`로 다시 캡처해 접근성 단계의 r02 캡처(`artifacts/accessibility/f20d540-messenger-guide.png` · `f20d540-phone-call-guide.png` — 저장소에 없는 하네스 증거 폴더)와 견준다.

  끝에 `wm size reset` · `wm density reset` · `font_scale 1.0`(전역 설정 원복). **`wm size reset` 뒤에 `settings delete global display_size_forced`로, `wm density reset` 뒤에 `settings delete secure display_density_forced`(이쪽은 secure)로 빈 키를 지운다**(위 「전제」의 되돌림 블록) [실측(2026-10-08 · 2026-10-09)].
- **판정**
  - **(1)** 글꼴 2.0에서 여섯 종류 모두: **판의 경계**(글자 상자가 아니라 판)가 상단 띠(132) 아래 · 하단 손잡이(**2337**) 위에 있다(옛 한도 2268은 낡은 값이다 — r03 재실행의 density 540 판 아래 끝이 y 2318이었다). 판의 경계는 `panel`이 읽는다(비주얼 노벨은 윤곽이 안 읽혀 판정 불가 — 글자 상자와 눈). 넘으면 **지적**. 닫는 법 줄이나 화살표가 화면 밖으로 밀리면 지적. **겹침도 지적이다**: 글꼴 최대에서 안내 글자가 뒤 화면 글자와 겹칠 수 있다 — 판이 서면 겹침은 판 뒤로 정리되므로 이 부분은 E15가 진다.
  - **(2)** 폭 342.9dp에서 판의 좌우와 화면 끝 사이가 **16dp(42px) 이상**(`panel`의 좌 · 우 여백, 반올림 허용 −2). 넘으면 **지적**(값과 함께). 판 폭이 `100% − 32dp`(= 816px)로 서는지는 E17 (c)가 세 폭에서 같이 잰다. **y 한도도 화면 크기에 비례한다**: 900x2000에서는 상단 안전 영역이 132 → 115로 비례해 줄어 판 y0이 115다(r03 재실행: 말하기 판 y 115~1931) — 상단 한도를 132로 두면 거짓 지적이 난다.
  - **(3)** 글꼴 2.0 + density 540의 메신저 · 전화는 **판정이 아니라 기록**이다. r02 캡처와 견줘 **r02보다 나빠졌으면**(닫는 법 줄 · 제목이 화면 밖으로 잘림) 지적으로 올린다 — 안전 영역 padding이 안내 가운데를 아래로 옮겨 닫는 법 줄이 더 밀릴 수 있다는 것이 계약 r03.4가 적은 한계다. 여백의 유지는 root가 정한다. **density 540에서의 도달은 아래 「density 540에서의 도달」** — 앵커가 안 잡히므로 클래퍼로 찾는다.
- **iOS**: `xcrun simctl ui "$UDID" content_size accessibility-extra-extra-extra-large`(최대 접근성 글꼴), 시뮬레이터는 폭이 390 ~ 402pt라 360pt 이하 조건은 만들지 못한다((2)는 「해당 없음」으로 적는다). 캡처는 눈으로 판 · 글자의 넘침을 본다. 끝에 `content_size large`로 되돌린다.

### E14 — 스크림 합성색이 계산값과 맞는다 (스크림 0.8)

- **기기**: Android(필수) · iOS(선택, 같은 판독을 `$IOSOUT` 캡처에). 계산값은 design §1.3의 토큰 값 계산이다. 첫 실행(r02 절차)이 기기에서 재 **맞았다**(말하기 `#48494D`, 쓰기 · 문장 만들기 `#48484C`, 메신저 `#48494D`, 전화 `#47474B` — 기대 `#47484A`, 전부 ±1 이내 [실측(2026-10-08)]).
- **r03에서 고친 것 — 재는 자리가 판 밖이어야 한다.** 안내 내용 상자 뒤에 바탕 판(`rgba(26,28,32,0.9)`)이 서서, 판 자리의 색은 스크림만의 색이 아니라 **`#1F2124` 부근**(흰 면 위)이다. 좌표를 직접 찍는 걸음(r02의 `expect … 540 600`)은 판 안일 수 있다 — 먼저 판 상자를 읽고 그 **밖**의 좌표를 찍는다. `flat`이 판 색(`#1F2124`)만 찾고 스크림 색을 못 찾으면 **좌표 문제이지 구현 문제가 아니다** — 판 밖에서 다시 잰다.
- **기대**(스크림 `rgba(26,28,32,0.8)`이 얹힌 뒤, 채널당 **±6** — test-plan E14. r03에서 기대색은 불변):

  | 종류 | 스크림만 있는 자리 | 안내 없을 때의 색 | 기대 합성색 |
  |---|---|---|---|
  | `sentence-order` · `speaking` · `writing` | 학습 셸의 면 · 흰 칩 · 흰 캔버스 | `#FFFDFC`(칩 · 캔버스는 흰색) | `#48494C` (흰 면 위 `#48494D`) |
  | `messenger` | 흰 면 | 흰색 | `#48494D` |
  | `phone-call` | 전화의 면 | `#FAF7F4` | `#47484A` |
  | `visual-novel` | 그림 위 | 장면마다 다름 | 위 명암 `#1A1A1B` 부근 — **평평하지 않아** 판독 대상이 아니다. 눈으로만 |

- **조작 · 판정**(E1의 캡처, 무손실)

  ```sh
  K=sentence-order
  python3 "$TOOLS/guidepx.py" panel "$OUT/E1-$K-guide.png" '#1F2124' 6        # 출력의 「판 밖 예시 좌표 X Y」 — 스크림만 있는 자리를 재는 곳. 판이 위쪽에 붙으면 판 아래쪽 좌표를 낸다
  python3 "$TOOLS/guidepx.py" flat  "$OUT/E1-$K-guide.png" '#48494C' 6        # 평평한 면 덩이를 모아 기대색 ±6 안이 있으면 PASS. 출력의 「예시 좌표」가 판 안(위 상자)이 아닌지 본다
  python3 "$TOOLS/guidepx.py" expect "$OUT/E1-$K-guide.png" X Y '#48494C' 6    # X Y = 판 밖 예시 좌표 (r02의 540 600은 판 안일 수 있다)
  python3 "$TOOLS/guidepx.py" px "$OUT/E1-$K-closed.png" X Y                  # 같은 좌표의 안내 없는 색 — 기대 색(#FFFDFC)인지
  ```

  종류마다 `flat`을 걸고 위 표의 기대색을 쓴다. **PASS** = 평평한 면(번짐 ≤ 3) 중 기대색 ±6 안에 드는 덩이가 있고, 그 덩이의 **좌표가 판 상자 밖**이다. 같은 좌표에서 닫은 캡처의 색이 안내 없는 색(예: `#FFFDFC`)과 같은 것도 확인한다(**글자 · 그림 위가 아니라 면 위**를 재고 있다는 증거).
- **벗어나면**: FAIL로 닫지 않고 **값과 함께 보고하고 판정은 접근성 단계로 넘긴다**(test-plan). 보고에는 종류 · 좌표 · 얻은 색 · 기대색 · 차를 적는다. 0.6 근처(`#767779`)가 나오면 새 CSS가 안 먹은 것(M15/M16)이므로 구현 문제로 별도로 올린다.
- **구현 전 기대**: 안내가 없어 `flat`이 합성색을 못 찾는다(밝은 면 `#FFFDFC`만 있다).

### E15 — 판 안에서 뒤 화면의 글자가 안내 글자와 겹쳐 읽히지 않는다

**r03이 이 항목을 대체했다.** r02의 E15는 겹침을 보고 지적만 남겼다(PASS/FAIL이 아니었다). r03은 안내 글자 묶음 뒤에 바탕 판을 깔아 겹침을 없애려는 것이므로 **판 안에서 뒤 글자가 안 읽히는지**를 판정한다. 판 **밖**에 비치는 뒤 화면은 판정 대상이 아니다(스크림 0.8은 그대로다).

- **기기**: Android · iOS. 계산값(`spec.md` r03.5): 판 안에서 뒤 글자가 남는 정도(뒤 글자 대 그 둘레)는 **최대 1.05:1**이다(`#1A1C20` 대 `#1F2124`). 뒤 화면의 어떤 두 색도 판 안에서는 1.08:1을 넘지 못한다(흰색 대 검정). r02는 1.36 ~ 1.90:1이었다.
- **조작**: 여섯 종류의 안내 캡처(글꼴 1.0, E1의 `E1-<종류>-guide.png`)와 말하기 · 전화 · 메신저의 글꼴 2.0 캡처(E13의 `E13-f20-<종류>-guide.png`). r02의 겹침 자리 — **전화 설명 셋째 줄 ↔ `Minseo`, 말하기 제목과 설명 사이의 `안녕하세요`, 쓰기 · 문장 만들기의 카드 글자** — 를 r02 캡처(`artifacts/accessibility/f10-*.png` · `f20-*.png` — 저장소에 없는 하네스 증거 폴더)와 나란히 놓고 연다.
- **판정**
  - **사람(주 판정)**: 판 안에서 뒤 화면의 글자가 안내 글자와 **겹쳐 읽히지 않는다**(캡처 첨부). 뒤 글자가 읽히면 FAIL.
  - **기계 보조(`guidepx.py ghost`)**: 판 안쪽(가장자리에서 70px 안, 모서리 반경 밖)에서 안내 글자 둘레 4px를 뺀 픽셀이 판 색 mode와 낸 **최대 대비**가 한도(1.08:1) 이하이다. 계약의 계산값 1.05:1 부근이어야 한다 — 크게 벗어나면(1.08 초과) 판이 불투명도 0.9로 서지 않았거나 뒤 글자가 비치는 것이다.

    ```sh
    for K in sentence-order messenger phone-call speaking writing; do
      echo "== $K"; python3 "$TOOLS/guidepx.py" ghost "$OUT/E1-$K-guide.png" '#1F2124' 6 1.08
    done
    for K in speaking phone-call messenger; do python3 "$TOOLS/guidepx.py" ghost "$OUT/E13-f20-$K-guide.png" '#1F2124' 6 1.08; done
    python3 "$TOOLS/contrast.py" "$OUT/E1-phone-call-guide.png"     # 글자 줄마다 behind-ink share · ink vs mode — 잔상이 있는 줄이 있는가
    ```

    출력의 `PASS 판 안 잔상 최대 대비 X:1`을 적는다. **비주얼 노벨은 바탕이 어두워 판의 윤곽이 없다**(`ghost`가 판정 불가) — 그 자리는 겹침도 없다(계약 r03.5); 눈으로 본다. 기계 보조는 눈의 판정을 대신하지 않는다.
- **구현 전 기대**: r02 구현(판 없음)에서 겹침이 있었다(`f10-*.png`: 뒤 글자 1.36 ~ 1.90:1) — 판정이 FAIL이다. 판 CSS가 없으면 `ghost`는 판을 못 찾아 판정 불가다.

### E16 — 기존 첫 단원 안내는 여전히 0.6

- **기기**: Android. **볼 것**: 새 CSS의 0.8이 기존 `FirstUnitGuide`로 새지 않았는가(M15).
- **조작**: 새 사용자(진행 0 + 진행 불러오기 200) — 상태바 문서 S11과 같다.
  ```sh
  gfixture -e loadProgress true                     # 맵의 안내(M2)가 뜬다
  shot E16-m2
  tapxy 540 1200; sleep 1.5
  tapxy 540 442; waitre '^Next$' 15; tapre '^Next$'; sleep 2      # 표지 → 서사 → 서사의 안내(D7)
  shot E16-d7
  tapxy 540 1200; sleep 2                           # 안내를 닫고 서사를 마지막 장면까지 넘기면 채팅이 선다(S11 참조)
  pollbg E16-m3 '#767779' 540 1200 14               # 채팅 위 안내(M3). 시계 인접 배경이 #767779가 될 때까지 한 번씩 누르며 본다
  ```
- **판정**
  ```sh
  python3 "$TOOLS/guidepx.py" flat "$OUT/E16-m3.png" '#767779' 6        # 0.6 합성색 ±6의 평평한 면이 있다 (#48494D 쪽이 아니다)
  # 앞선 작업의 기준 캡처가 있으면 같은 좌표를 직접 견준다(저장소에 없다 — 하네스 증거 폴더의 android-status-bar-appearance 작업):
  # python3 "$TOOLS/guidepx.py" same "$OUT/E16-m3.png" /경로/android-status-bar-appearance/artifacts/e2e-r03/S11-m3.png 540 1200 6
  ```
  - M3의 스크림 합성색이 **`#767779` 부근**(채널당 ±6)이다. 0.8의 합성색 쪽(`#48494D` 부근)이면 FAIL — 0.8이 새어 들어갔다.
  - 맵(M2 `#767678`) · 서사(D7) · 통화(M4 `#747475`) 안내도 같은 방법으로 읽을 수 있으면 보고한다(필수는 M3).
  - **동시에 서지 않는다**(E11 (b)): 위 흐름의 어느 시점에도 새 안내가 함께 서지 않는다(눈). `seen_read`는 `(none)`.
- **이어서(선택)**: 프롤로그(표지 · 서사 · 채팅 · 통화)를 끝낸 뒤 맵에서 `greeting`을 열면 새 안내가 **0.8**(`#48494C`)로 서는 것을 보아, 같은 설치에서 두 스크림의 합성색이 갈리는 것(0.6 vs 0.8)을 한 흐름으로 확인한다. 시간이 안 되면 E14의 캡처를 쓴다.
- **구현 전 기대**: 기존 안내가 이미 0.6이라 통과한다 — 가드.

### E17 — 바탕 판: 색 · 둥근 모서리 · 폭 360dp 부근의 좌우 여백 · 글자 대비 (r03 신규)

- **기기**: Android. 구현은 `components/learning-item-guide.css`의 `.learning-item-guide .first-unit-guide-content` 규칙이다: `background-color: rgba(26, 28, 32, 0.9)` · `border-radius: var(--libitum-radius-xl)`(24dp) · `width: calc(100% - 16 - 16)`(좌우 16dp씩 남기는 수단 — 기존 `max-width: 354dp`는 그대로)이고, 안내 루트에는 안전 영역 inset의 인라인 padding이 있다. **`width: calc(...)`이 Lynx에서 서는지는 기기로 확인된 적이 없다 — (c)가 그것을 가른다.**
- **계산값**(`spec.md` r03.5): 판 자리의 실효 불투명도는 `1 − 0.2 × 0.1 = 0.98`. 판 뒤가 흰 면이면 판은 **`#1F2124`**, 뒤 글자(`#1A1C20`)면 `#1A1C20`, 검정이면 `#181A1D`. 글자 대비는 제목 · 닫는 법(흰색) 16.2 ~ 17.1:1, 설명(`gray-100`) 15.2 ~ 16.0:1(r02는 8.46:1 이상). 흰 면 위에서 판의 윤곽(판 대 둘레 스크림)은 1.79:1.
- **조작**: 여섯 종류의 캡처에서 판의 평평한 자리(글자 사이)의 픽셀과 판의 상자를 읽는다. (c)는 화면 폭을 바꾼 세 조건에서 다시 연다.

  ```sh
  # (a) (b) (d) — E1의 캡처(글꼴 1.0, 1080x2400 = 411dp)
  for K in sentence-order messenger phone-call visual-novel speaking writing; do
    echo "== $K"
    python3 "$TOOLS/guidepx.py" panel "$OUT/E1-$K-guide.png" '#1F2124' 6 42    # 판 색 · 모서리 · 상자 · 좌우 여백
    python3 "$TOOLS/contrast.py" "$OUT/E1-$K-guide.png"                       # 제목 · 설명 · 닫는 법의 실제 대비
  done
  # (c) 폭 360dp 부근 — 좌우 여백을 픽셀로 잰다. 420dpi에서 dp × 2.625 = px
  #   945x2100 = 360.0dp  (기대 판 폭 861px = 100% − 32dp, 좌우 여백 각 42px)
  #   900x2000 = 342.9dp  (E13 (2)와 같은 크기. 기대 판 폭 816px, 여백 42px)
  #   1080x2400 = 411dp   (기대 판 폭 929px = max-width 354dp, 여백 약 75px — calc가 최대 폭을 넘겨 넓히지 않는지)
  w_panel() {   # w_panel 크기 종류 — 화면 크기를 바꾼 뒤 그 종류의 안내가 뜬 채(probe가 guide 캡처를 뜨는 시점) 캡처해 판을 잰다
    shot "E17-w${1%x*}-$2-guide"
    python3 "$TOOLS/guidepx.py" panel "$OUT/E17-w${1%x*}-$2-guide.png" '#1F2124' 6 40
  }
  for SIZE in 945x2100 900x2000; do
    A shell wm size "$SIZE"          # 이 크기에서 픽스처를 새로 시작한다. 말하기 · 전화 · 메신저를 「단원별 도달」대로, `open_available <높이>`로 연다
    # 종류마다: gfixture … → 도달 → sleep 1.5 → w_panel "$SIZE" speaking   (phone-call · messenger도 같게)
  done
  A shell wm size reset; A shell settings list global | tr -d '\r' | grep '^display_size_forced=' && A shell settings delete global display_size_forced
  ```
- **판정**
  - **(a) 판의 색**: 흰 면 위(문장 만들기 · 말하기 · 쓰기 · 메신저 · 전화)에서 `panel`의 판 색 mode가 **`#1F2124`에서 채널당 ±6 안**이다(전화의 면 `#FAF7F4`는 실효 불투명도 0.98에서 `#1F2124`와 1 안팎이다). 벗어나면 **FAIL이 아니라 값과 함께 보고**한다(계산값이 기기와 다르다는 신호 — 종류 · 얻은 색 · 기대색 · 차). 비주얼 노벨은 바탕이 어두워 판 윤곽이 없다 — `panel`이 판정 불가이면 눈으로 판 자리의 색이 주변과 구분되지 않는지만 적는다.
  - **(b) 모서리**: `panel`의 「모서리 깎임」이 위 · 아래 모두 4px 이상이면 **둥글다**. **네 모서리가 둥글다**(눈 — 캡처 첨부).
  - **(c) 좌우 여백 — 폭 360dp 부근**: `panel`의 좌 · 우 여백이 각 **40px 이상**(16dp = 42px, 반올림 −2)이고 좌우가 같다(±2). 945x2100이면 판 폭이 861px(각 42px)로 서야 한다. 1080x2400에서는 판 폭이 929px(354dp)로 그대로이고 여백이 75px 안팎이다. **판 폭이 `max-width` 354dp에 붙어(≈ 929px) 360dp 화면에서 여백이 약 3dp(8px)이면 `calc`가 안 선 것이다** — 값(폭 · 좌우 여백)과 함께 **지적(Warning)** 으로 올린다. 여백의 수단은 구현이 정하는 값이라 계약 FAIL이 아니다(계약 r03.5: 수단은 구현이 정한다 · 판정은 좁은 화면 캡처) — root가 `calc`를 longhand `margin`으로 바꿀지를 정한다.
  - **(d) 글자 대비**: `contrast.py`가 낸 줄마다의 `bg mode`와의 대비(제목 · 설명 · 닫는 법)가 **15:1 이상**이다(계산 15.2 ~ 17.1). `brightest`는 글자 가장자리 픽셀이라 판정에 쓰지 않는다. 설명 줄이 안 잡히면(글자색 `#F7F8F9`의 최솟값 채널은 235를 넘는다) 줄 수가 기대(제목 · 설명 · 닫는 법)보다 적은 것이므로 눈으로 확인한다.
- **구현 전 기대**: 판 CSS가 없으면 `panel`이 판정 불가(판을 못 찾는다)이고 글자 대비는 스크림만의 8.46:1이다.

### E18 — iOS 시뮬레이터 최소 확인: 전화 한 종류가 뜨고 덮고 탭으로 닫히며 기록이 남는가 (r04 신규)

- **기기 · 세션**: [성능 보고서](../performance/reports/learning-item-guides-iphone-17-pro-simulator-01.md)의 회차 여섯이 끝난 **같은** iPhone 17 Pro 시뮬레이터 · 같은 Release Simulator Host · 같은 `playground.lynx.bundle`(`current = "tutorial-call"` — 전화 화면이 첫 화면)이다. **`--performance-capture` 없이** 실행한다(사용자 결정 — ADR-0054 U8). 좌표는 포인트(402x874), 캡처는 @3x(1206x2622).
- **도구**: `xcrun simctl io <UDID> screenshot`, `idb ui tap` · `idb ui describe-all`(위 「iOS 공통」). 기록 읽기 · 지우기는 위 「저장 기록 읽고 지우고 심기」의 주를 따른다. **`ios_seen_read` · `ios_seen_clear`는 컨테이너 plist(앱이 쓴 기록)를 다루도록 고쳤다 — 기기에서는 미실행이다.**
- **대조군 B**: `ios_seen_plant '["phone-call"]'` → 실행 → 8초 → `E18-B.png` → `idb ui describe-all > E18-B-tree.json`. 안내가 없는 같은 화면이다. `Accept`의 자리를 여기서 읽는다.
- **A**: 기록이 없는 상태를 만든다. `ios_seen_clear`가 앱 종료 → 시뮬레이터 shutdown → 컨테이너 plist의 키 삭제 → boot를 한다(기기 미실행 — 첫 사용에서 안내가 다시 뜨는지 확인).
  그다음 실행 → 8초 → `E18-A.png` → `describe-all > E18-A-tree.json` → `Accept` 자리를 `idb ui tap` → 1.5초 → `E18-A-closed.png` → `describe-all > E18-A-closed-tree.json`.
  끝으로 앱 종료 → 컨테이너 plist에서 기록을 읽고(탭 직후에는 쓰기가 늦을 수 있다) → 다시 실행해 안내가 안 뜨는지 본다(`E18-A-relaunch.png`).

| 볼 것 | 판정 |
|---|---|
| (a) 뜬다 | `E18-A.png`에 판 · 제목 `Reply with a tap` · 설명(계약 r02.2의 문구) · 화살표 · `Tap anywhere to continue`가 보이고 잘리지 않는다(눈). B에는 없다. **어기면 FAIL** |
| (b) 전체를 덮는다 | 판 밖 네 표본점 — 상단 띠 (20, 20) · (382, 20), 하단 손잡이 띠 (20, 866) · (382, 866) — 의 색이 A에서 B보다 어둡고(채널 합이 작다), A의 네 점끼리 채널당 ±6 안이다. 상단 띠 · 홈 표시줄 자리가 밝게 남으면 **FAIL**(안전 영역 padding이 스크림까지 줄였다는 뜻 — E2와 같은 판정) |
| (c) 탭으로 닫힌다 | `E18-A-closed.png`에 안내가 없고 **통화가 시작되지 않았다**(`Accept`가 그대로 — E3의 iOS 한 자리). 기록이 `phone-call`을 담는다. **어기면 FAIL** |
| (d) 접근성 트리 — VoiceOver 대용 | `E18-A-tree.json`에 label이 `Reply with a tap.`로 시작하는 요소가 **하나**이고 label `Accept`인 요소가 **없다**(화면 루트의 `accessibility-elements-hidden`). `E18-A-closed-tree.json`에서는 `Accept`가 **있고** 안내 label이 없다. B 트리에 Lynx 요소가 하나도 없으면 「판정 불가 — 도구가 Lynx 요소를 내놓지 않는다」로 적는다. A에서 `Accept`가 보이면 FAIL 후보 — accessibility 단계로 넘긴다. **A 트리에 남은 그 밖의 요소도 적는다**(2026-10-09 실행에서 `Back to map`이 남았다 → 출시 조건 i1) |
| (e) 선택 — 벨 | 사람이 들을 수 있으면: 떠 있는 동안 벨이 없고 닫은 뒤 울린다(귀, 「기계 판정 없음」). 못 하면 「미실행」 |

- **결과**: 위 「실행 상태」의 「E18 — iOS 시뮬레이터 최소 확인 결과」. (a) ~ (d) 통과, (e) 미실행.
- **이 케이스가 닫지 않는 것**: VoiceOver 낭독 · 첫 초점 · 두 번 읽힘 · 배타 포커스와 그 복원(시뮬레이터에는 VoiceOver가 없고, iOS의 배타 포커스 setter는 VoiceOver가 돌 때만 일한다), 전화 밖의 다섯 종류, 제품 `main` 번들 · 로그인 뒤 경로, 실기(노치 · 홈 표시줄 · 터치 지연 · 스피커). 실기는 출시 조건 [i1 ~ i4](ios-release-checks.md)로 남는다.
- **구현 전 관찰**: 없다(구현이 이미 병합됐다). 대조는 같은 번들의 B가 진다.
- **정리**: 끝나면 `current.ts`를 `git checkout --`으로 되돌리고 `git status`가 깨끗한지 본다. 개발 서버는 `lsof`로 찾아 끈다(3000 포트는 건드리지 않는다).

## 기기에서 봐야 할 것 ↔ 케이스 (구현 기록 → 이 문서)

| 구현 기록이 기기에서 보라고 한 것 | 케이스 |
|---|---|
| Fragment 형제 + `fixed`가 상단 띠까지 덮는가 | E2 (+ E9의 상단 띠 색) |
| 스크림 아래 `×`와 쓰기 캔버스가 실제로 눌리거나 그려지지 않는가 | E3 |
| 가림 속성(`accessibility-elements-hidden`) **과 배타 포커스(`accessibility-exclusive-focus`)** 로 뒤가 격리되는가 · 낭독이 한 번인가 · 닫은 뒤 복원되는가 | E10 · E10-r · E10-l (Android 발화 글자) · E10-i (iOS) · E18 (d) (iOS 시뮬레이터의 접근성 트리 — VoiceOver 대용) |
| iOS에서 뜨고 덮고 탭으로 닫히며 기록이 남는가(시뮬레이터 최소 확인) | E18 |
| 안전 영역 padding으로 판이 상단 띠 · 하단 손잡이 안에 드는가 | E13 (1) · E17 |
| 글자 뒤 바탕 판의 색 · 모서리 · 좌우 여백(폭 360dp 부근) · 글자 대비 | E17 |
| 닫는 순간 벨이 울리고 메시지 타이핑이 시작되는가 | E4 · E5 |
| 계약 밖 한 줄: 안내 중 액션 버튼 효과음 끔 | E3 (+ E3b 닫은 뒤 복원) |
| 합성색이 계산값과 같은가 · 기존 안내가 0.6 그대로인가 | E14 · E16 |
| 뒤 글자가 판 안에서 안내 글자와 겹쳐 읽히지 않는가 | E15 (판 안 잔상 대비) |

## 실행 결과

| 날짜 | 실행자 | 커밋 | 기기 · 빌드 | 항목 | 결과 · 캡처 |
|---|---|---|---|---|---|
| 2026-10-08 | e2e 실행 단계 | `5782bacd`(구현 뒤 번들 — 일회용 사본에서 빌드. 구현 전 번들 `e8982c5a`) | emulator-5554 (Pixel_8, API 37, 1080x2400, 420dpi, 제스처 내비게이션) · 모의 번들 `example.invalid` · 서버 18790 | E1 | **통과 6/6** — 여섯 종류 모두 안내가 뜨고 문구가 r02.2 표와 한 글자씩 일치(눈), `textbox` PASS(글자 x 148~930), 닫은 뒤 `seen_read`가 그 종류를 담음 |
| 〃 | 〃 | 〃 | 〃 | E2 | **통과 6/6** — `covered` 상단 · 하단 PASS(학습 셸 `#48494C`, 전화 `#47474B`, 메신저 `#48494C~D`, 비주얼 노벨 상단 `#1F1F23` 눈으로도 덮임) |
| 〃 | 〃 | 〃 | 〃 | E3 · E3b | 필수 자리 **통과 6/6**(닫은 캡처와 `diff` 0행, 권한 요청 0 · `accept_call` 0). 보탤 자리 **미실행**. E3b **통과 2/2**(`button` · `correct_answer`) |
| 〃 | 〃 | 〃 | 〃 | E4 | 기계 **통과**(`ring_bell` 떠 있는 동안 0 · 닫은 뒤 1, 플레이어 줄 수 25 / 25 / 26). 귀 **미실행** |
| 〃 | 〃 | 〃 | 〃 | E5 | **부분** — 정지 통과(a/b `diff` 0행, 말풍선 없음). 타이핑 시작 **판정 불가**(0.4초 캡처 지연 ~0.5초, `screenrecord` 필요) |
| 〃 | 〃 | 〃 | 〃 | E6 | **통과**(말하기 3버튼 · 말하기 제스처 · 비주얼 노벨 제스처 모드 키). 비주얼 노벨 3버튼 **미실행** |
| 〃 | 〃 | 〃 | 〃 | E7 | **부분** — 말하기 다시 열기 · 강제 종료 뒤 재시작 통과(`StorageModule.set` 0, `seen_read` 전 · 후 동일). 같은 종류 다른 단원 **닿지 못함** |
| 〃 | 〃 | 〃 | 〃 | E8 | **통과**(말하기) — 뜬 채 `seen_read` `(none)`, 강제 종료 뒤에도 `(none)`, 재시작 뒤 다시 뜸 |
| 〃 | 〃 | 〃 | 〃 | E9 | **통과 6/6** — 안내 중 `LIGHT_NAVIGATION_BARS`, 대비 9.00:1(학습 셸) · 9.25:1(전화) · 16.06:1(비주얼 노벨). 말하기의 닫은 뒤 `apr`는 따로 재지 않음 |
| 〃 | 〃 | 〃 | 〃 | E10 | **판정 불가** — TalkBack을 켜면 알림 권한 창이 가리고 덤프가 노드 하나뿐. 낭독 관찰 없음 |
| 〃 | 〃 | 〃 | 〃 | E11 | **부분** — 듣기 · `Making plans` 통과(`seen_read` `(none)`), (b)는 E16과 같은 실행으로 통과. 조각 3개 · `directions` · 최종 테스트 · 첫 단원 서사 **닿지 못함 / 미실행** |
| 〃 | 〃 | 〃 | 〃 | E12 | **통과**(픽스처 대체) — 로그아웃 전 · 후 `seen_read` 동일, 세션을 다시 심은 뒤 안내 없음. 소셜 로그인 왕복은 보지 않음 |
| 〃 | 〃 | 〃 | 〃 | E13 | **부분**(말하기 1종) — 글자 상자 x 77~826 · y 290~1732, 넘침 없음. **지적**: 겹침. 다른 다섯 종류 **미실행** |
| 〃 | 〃 | 〃 | 〃 | E14 | **통과 5/5**(비주얼 노벨은 눈) — 전부 기대 ±1 이내(허용 ±6), 0.6 쪽이 아님 |
| 〃 | 〃 | 〃 | 〃 | E15 | **지적 첨부**(판정 아님) — 「실행 상태」의 지적 |
| 〃 | 〃 | 〃 | 〃 | E16 | **통과** — M3 합성색 `#767779` 평평한 면 1676점, 구현 전 번들과 `diff` 0행, `seen_read` `(none)` |
| — | — | — | iOS 시뮬레이터 | iOS 전체 | **미실행** |
| 2026-10-09(r03 판) | — | — | — | E10(대체) · E10-r · E10-l | 이 절차 판의 행 — 절차만 고쳤고 기기에서 돌지 않았다(아래 재실행이 돌렸다). r02 구현 위의 접근성 단계 실행(`f7c25aa6`)이 E10의 구현 전 관찰이다: (b) 뒤 화면 발화 다수 · 제목 / 설명 / 닫는 법이 따로 읽힘 3건 |
| 〃 | — | — | — | E10-i | **미실행 — iOS를 쓰지 않았다** |
| 2026-10-09(r03 재실행) | e2e 실행 단계 | `54c650f0`(일회용 사본에서 모의 값으로 빌드, sha256 `0155b68a…698e69`) | emulator-5554 (Pixel_8, API 37, 1080x2400, 420dpi, 제스처 내비), TalkBack 17 · 서버 18790 | 판정 | **passed** — 관찰한 범위의 제품 결함 0. 지적(결함 아님): N1 재현(E10-l) · N2 재현(E13 (3) 메신저) |
| 〃 | 〃 | 〃 | 〃 | E10 | 말하기 · 전화 **통과**(발화 한 덩어리 11걸음 불변 · 테두리가 판 안 · 뒤 화면 이름 0건 · 닫으면 복원). 나머지 네 종류 **미실행** |
| 〃 | 〃 | 〃 | 〃 | E10-r | **통과** — 3회 복원 · 맵이 읽힘 |
| 〃 | 〃 | 〃 | 〃 | E10-l | **지적(기존 동작)** — TalkBack을 안내가 뜬 뒤 켜면 쓸기 1 · 2번이 뒤 화면으로 샌다(N1과 같음). FAIL 아님 |
| 〃 | 〃 | 〃 | 〃 | E10-i · iOS 전체 | **미실행** |
| 〃 | 〃 | 〃 | 〃 | E13 | (1) **통과(지적 1)** (2) **통과** 판 폭 816 · 좌우 42px (3) **기록** — 전화 판 안 온전, 메신저 화살표가 `and send.` 위에 겹침(N2). r02보다 나빠지지 않음 |
| 〃 | 〃 | 〃 | 〃 | E14 | **통과 5/5 · 비주얼 노벨 눈** — 기대 ±1 이내 |
| 〃 | 〃 | 〃 | 〃 | E15 | **통과** — 잔상 1.000 ~ 1.057:1 (한도 1.08) |
| 〃 | 〃 | 〃 | 〃 | E17 | **통과** — 판 `#1E2025` · 폭 861px(945x2100) · 글자 대비 15.33 ~ 16.30:1 (비주얼 노벨 15.48 ~ 17.06) |
| 〃 | 〃 | 〃 | 〃 | E1 · E2 · E3 · E4 · E6 · E7 · E11 · E16 | **통과** — E1 6/6 · E2 5/5(+눈) · E3 4/4 · E4 기계 · E6 말하기 · E7 말하기 · E11 `Ordering` · `Making plans` 안내 없음 · E16 M2 `#767678` / M3 `#767779`. 미실행 부분은 「r03 케이스」 |
| 〃 | 〃 | 〃 | 〃 | E5 · E8 · E9 · E12 · E3b | **미실행** |
| 2026-10-09(E18) | test-runner(iOS 시뮬레이터 세션) | `aaa58aad`(dev 서버의 `playground.lynx.bundle`, `current = "tutorial-call"`) | iPhone 17 Pro 시뮬레이터(전용, iOS 26.5) · Release Simulator Host · 성능 회차 뒤 · 캡처 플래그 없음 | E18 (a) · (b) · (c) · (d) | **통과** — 뜬다(눈) · 네 모서리 A (71,72,74) 대 B (250,247,244) · `Accept` 탭이 안내만 닫고 기록 `["phone-call"]`(컨테이너 plist) · 재실행에 안 뜸 · A 트리에 `Accept` 없음 → 닫은 뒤 복원. **사실**: A 트리에 `Back to map`이 남음(판정 밖 → 출시 조건 i1) |
| 〃 | 〃 | 〃 | 〃 | E18 (e) | **미실행** — 소리를 듣지 못함 |
| 〃 | 〃 | 〃 | 〃 | E1 ~ E17의 iOS · E10-i | **미실행**(E1 · E2 · E3의 전화 한 종류는 E18이 대신 봤다) |

증거 폴더 `.agent-harness/work/learning-item-guides/artifacts/e2e/`(r03 재실행은 `artifacts/e2e-r03/`), 실행 기록 `.agent-harness/work/learning-item-guides/e2e-run.md`(r03 재실행은 `e2e-run-r03.md`). 전역 설정은 전 · 후 `settings list` system · secure · global diff 0(빈 `display_size_forced=` global · `display_density_forced=` secure 행은 지움). r03 재실행은 TalkBack과 「Display speech output」을 시작 상태(꺼짐)로 되돌렸고, 서버 18790을 종료했으며, 사본을 제거 · prune했다.
**근거 수준**: 2026-10-08 행은 첫 실행(r02 절차)의 기록이고, 2026-10-09(r03 재실행) 행은 r03 절차를 기기에서 돌린 기록이다. 이 문서의 고친 부분(재실행 뒤 `open_available` · `vnanchor` · `GUIDE_BOX` · `clappers.py` · 되돌림 · E13 한도)은 기기에서 다시 돌리지 않았다.

## test-plan과 다른 점

- **E3는 자리 하나마다 새 안내가 필요하다.** 안내는 종류당 기기에서 한 번 뜨고 한 번 누르면 닫히므로 test-plan의 「매번 안내만 닫힌다」를 **필수 자리(종류마다 하나) + 보탤 자리**로 나눴다. 닫은 화면과의 `diff`로 「조작이 적용되지 않았다」를 판정하는 방법은 이 문서가 더했다.
- **E7의 「앱을 다시 켜도」**는 재부팅이 아니라 `gkill` + `KEEP=1 gfixture`(픽스처가 저장소를 비우지 않는다는 코드 근거 — `SignedInScreenFixtureTest.java`가 세션과 진행 시드만 쓴다)다. 픽스처가 세션을 다시 심으므로 실제 로그인 왕복은 아니다.
- **(r02 판의 기록 — r03이 대체했다)** E10은 둘로 나눴다: Android에서 접근성 트리를 덤프해 기계로 볼 수 있는 것과 사람의 낭독 관찰. 덤프 방법이 돌려서 판정이 나온 적이 없어 r03에서 발화 글자 캡처 방식으로 다시 썼다(위 r03 항목).
- **E12의 「다시 로그인」**은 픽스처의 세션 재심기로 대신한다(소셜 로그인 왕복은 `android-social-login.md`의 별도 절차).
- **E14의 기대색은 종류별로 나눴다**(design §1.4의 면 색: 학습 셸 `#48494C` · 전화 `#47484A` · 메신저 `#48494D`). test-plan은 흰 면 위 `#48494D` 하나를 적었다. ±6은 모두에 걸치므로 판정은 같다.
- **iOS의 범위가 좁다**: E6 · E9 · E12 · E16은 Android 전용이고, E10의 VoiceOver는 시뮬레이터에서 판정하지 않으며, E4는 귀로만 본다. iOS 도달은 dev playground 번들이다.
- **저장 키의 실제 이름**: 계약의 `libitum.learning-item-guides.seen`은 JS가 넘기는 키이고 기기 저장소에는 호스트가 접두를 한 번 더 붙인 `libitum.libitum.learning-item-guides.seen`로 적힌다(`StorageModule.java` · `.swift`). 첫 실행이 확인했다(Android — `seen_read`가 이 키로 읽혔다 [실측(2026-10-08)]. iOS는 미실행).
- **첫 실행 뒤 바뀐 것**: 맵 진입은 `orange.py`가 아니라 색 중심 `colorxy.py`, 복습 노드는 고정 좌표가 아니라 비주얼 노벨 앵커 기준, E5의 닫은 뒤는 캡처가 아니라 `screenrecord` 프레임, E10은 이 절차로 판정할 수 없음을 적었다(「실행 상태」의 결함 표).
- **도달**: test-plan이 「진행 12/13의 복습」이라고 적은 것을 시드별로 풀었다. 메신저 · 전화는 어떤 시드로도 「가능」 상태가 되지 않아 복습으로만 열린다. 문장 만들기는 진행 0에서 표지를 건너뛰어 연다.

r03(E10 대체 · E10-r · E10-l · E10-i · E13 ~ E15 · E17)에서 test-plan `## r03`과 다르게 쓴 것:

- **E10의 「발화 글자」 판독은 사람의 눈이다.** test-plan이 「걸음마다 화면을 캡처해 아래쪽 발화 글자 띠를 모은다」고 했고, 이 저장소에는 글자 인식 도구가 없다. 도구는 띠를 모으고(`montage.py`) 초점 테두리의 상자를 재는 것(`ring.py`)까지다. 뒤 화면 이름의 「0건」은 `<이름>-speech.png`를 열어 걸음마다 읽는다.
- **「Display speech output」의 경로는 r03 재실행이 채웠다.** 이 판은 켜는 법을 적지 못했고(TalkBack 앱 내부 설정이라 `settings list`에 안 잡힌다) 「사람이 켠다」로만 적었다. 재실행이 `TalkBackPreferencesActivity` 첫 화면의 최상위 스위치임을 보였고, 시작 상태가 꺼짐이었다(접근성 단계의 「켠 채 두었다」와 달랐다). adb만으로 스위치를 켜는 명령은 아직 없다 — 캡처로 좌표를 읽어 누른다.
- **E10의 여는 길**: 접근성 단계의 `fx`는 고정 sleep 픽스처였고 문장 만들기 · 쓰기 · 메신저 · 비주얼 노벨을 어떻게 열었는지는 기록에 없다(말하기 스파이크 한 종류만 상세). 이 문서는 기존 「단원별 도달」의 길에서 `uiautomator`를 부르는 단계(`tapre`)를 좌표(`tapxy`)로 바꿔 적었다 — **기기에서 돌려 보지 않았다.**
- **E15의 기계 보조를 도구로 만들었다**(`guidepx.py ghost`): test-plan의 「판 안에서 안내 글자가 아닌 픽셀이 판 색 ±6 안에 든다」를 그대로 쓰면 판 뒤가 검정인 자리(판 색 `#181A1D`, 차 7)에서 거짓 FAIL이 난다. 그래서 채널 차 대신 **판 색 mode와의 대비**(계약의 1.05:1, 어떤 두 색도 1.08:1 이하)로 쟀다.
- **E17에 좌우 여백 측정을 더했다.** test-plan은 E13의 폭 342dp 캡처에서 16dp(42px)를 눈으로 본다고 했고 E17은 판의 색 · 모서리 · 대비만 적었다. 구현이 `width: calc(100% - 16 - 16)`을 쓰고 이 `calc`가 Lynx에서 서는지 기기로 확인된 적이 없어, E17이 폭 360dp(945x2100) · 342.9dp(900x2000) · 411dp(1080x2400)에서 판의 좌우 여백을 픽셀로 재도록 했다. 판정은 지적(Warning)으로 값과 함께 올린다 — 여백의 수단은 구현이 정하는 값이라 계약 FAIL이 아니다(계약 r03.5).
- **E14의 「판 밖」은 도구로 확인한다**: `panel`이 판 밖 예시 좌표를 낸다. 판 윤곽이 없는 비주얼 노벨은 원래 E14의 판독 대상이 아니다.

## 부록 — `colorxy.py`

맵의 유닛 원 · 시트의 Start · 비주얼 노벨 앵커를 **색으로** 찾는다(`open_available` · `vnanchor` · `e11`). 맵의 내용은 접근성 트리에 없고 좌표는 스크롤 관성으로 실행마다 달라지므로 색의 중심이 통한 방법이다 [실측(2026-10-08)].
`colorxy.py PNG '#RRGGBB' TOL [Y0 Y1]` → `x y n`(색이 ±TOL 안인 픽셀의 중심과 표본 수, 3px 간격 표본) 또는 `none`. 환경 변수 `XMIN` · `XMAX`(기본 300~800)로 x 범위를 좁힌다.
같은 색이 여러 덩이에 있으면 중심이 둘 사이로 간다 — 범위(`Y0 Y1` · `XMIN` `XMAX`)로 한 덩이만 들게 한다(탭 바의 주황 깃발이 그 예). 디코더는 `barscan.py`의 것을 쓴다(`$TOOLS`에 같이 있어야 한다). `selftest`는 합성 PNG 6건.

```python file=colorxy.py
#!/usr/bin/env python3
"""colorxy.py PNG '#RRGGBB' TOL [Y0 Y1]   그 색(채널당 TOL 안)인 픽셀의 중심 'x y n'(3px 간격 표본). 없으면 none
환경 변수 XMIN XMAX (기본 300 800) 로 x 범위를 좁힌다. colorxy.py selftest — 합성 PNG 검사.
종료 코드: 0 찾음 · 1 없음 · 2 사용법"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png


def parse(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def find(png, want, tol, y0=250, y1=2200, xmin=300, xmax=800):
    w, h, bpp, rows = read_png(png)
    xs = ys = n = 0
    for y in range(y0, min(y1, h), 3):
        r = rows[y]
        for x in range(xmin, min(xmax, w), 3):
            p = r[x * bpp:x * bpp + 3]
            if all(abs(p[k] - want[k]) <= tol for k in range(3)):
                xs += x
                ys += y
                n += 1
    return (xs // n, ys // n, n) if n else None


def selftest():
    fails = []

    def expect(name, ok):
        print(("ok   " if ok else "FAIL ") + name)
        if not ok:
            fails.append(name)
    W, H = 1080, 2400
    ORANGE, CREAM, BG = (245, 108, 20), (254, 240, 230), (255, 253, 252)
    tmp = tempfile.mkdtemp()

    def make(name, paint):
        p = os.path.join(tmp, name + ".png")
        write_png(p, W, H, paint)
        return p
    # 주황 원(x 400~500, y 1000~1100)과 탭 바의 주황 깃발(x 300~330, y 2290~2320)
    both = make("both", lambda x, y: ORANGE if (400 <= x < 500 and 1000 <= y < 1100) or (300 <= x < 330 and 2290 <= y < 2320) else BG)
    r = find(both, ORANGE, 8, 200, 2100, 400, 500)
    expect("유닛 원의 중심(깃발은 범위 밖)", r is not None and abs(r[0] - 450) <= 4 and abs(r[1] - 1050) <= 4)
    r = find(both, ORANGE, 8, 200, 2400, 300, 800)
    expect("범위를 좁히지 않으면 깃발이 끼어 중심이 밀린다", r is not None and r[1] > 1100)
    expect("색이 없으면 none", find(make("none", lambda x, y: BG), ORANGE, 8) is None)
    expect("x 범위 밖이면 none", find(both, ORANGE, 8, 200, 2100, 600, 800) is None)
    near = make("near", lambda x, y: (250, 108, 20) if (400 <= x < 500 and 1000 <= y < 1100) else BG)
    expect("허용 안(차 5, TOL 8)은 찾고 밖(TOL 3)은 못 찾는다", find(near, ORANGE, 8, 200, 2100, 400, 500) is not None and find(near, ORANGE, 3, 200, 2100, 400, 500) is None)
    cream = make("cream", lambda x, y: CREAM if (450 <= x < 600 and 1500 <= y < 1600) else BG)
    r = find(cream, CREAM, 6, 250, 2200)
    expect("연주황 앵커의 중심", r is not None and abs(r[0] - 525) <= 4 and abs(r[1] - 1550) <= 4)
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["selftest"]:
        sys.exit(selftest())
    try:
        if len(a) >= 3:
            r = find(a[0], parse(a[1]), int(a[2]), int(a[3]) if len(a) > 3 else 250, int(a[4]) if len(a) > 4 else 2200,
                     int(os.environ.get("XMIN", 300)), int(os.environ.get("XMAX", 800)))
            print(f"{r[0]} {r[1]} {r[2]}" if r else "none")
            sys.exit(0 if r else 1)
    except (ValueError, IndexError):
        pass
    print(__doc__)
    sys.exit(2)
```

## 부록 — `guidepx.py`

PNG 디코더는 `hide-scrollbars.md`의 `barscan.py`(`read_png` · `write_png`)를 가져다 쓴다 — 같은 폴더(`$TOOLS`)에 있어야 한다. 위 「도구」의 추출 블록이 이 블록을 `$TOOLS/guidepx.py`로 꺼낸다. 표준 라이브러리만 쓴다.

- `px PNG X Y [R]` — 한 자리의 중앙값 색과 번짐. `expect PNG X Y '#RRGGBB' [TOL] [R]` — 평평하고(번짐 ≤ 3) 기대색 ±TOL인가(E14). `flat PNG '#RRGGBB' [TOL]` — 평평한 면을 격자(36px)로 모아 색 덩이를 묶고 기대색 ±TOL 안의 덩이(20점 이상)가 있으면 PASS(E14 · E16).
- `covered PNG X Y [MAXCH]` — 그 자리가 평평하고 가장 밝은 채널 ≤ MAXCH(100)인가(E2). `textbox PNG [Y0 Y1 MARGIN]` — 채널 최솟값 200 이상의 픽셀(안내 글자)의 경계 상자와 가로줄 묶음, 좌우 MARGIN(24px) 안이면 PASS(E1 · E13).
- `same A B X Y [TOL] [R]` — 두 캡처의 같은 자리가 같은 색인가(E16).
- (r03) `panel PNG '#RRGGBB' [TOL] [MINMARGIN]` — 바탕 판의 경계 상자 · 좌우 여백 · 모서리가 둥근가 · 판 색 mode를 읽고 **판 밖 예시 좌표**를 낸다(E13 · E14 · E17). 판은 판 색 ±TOL 픽셀이 한 행에 많은 행의 가장 긴 묶음이고(가장 넓은 행의 35% 이상 — 판 밖에 스크림과 같은 색의 뒤 글자 잔상이 걸려도 묶음이 안 된다), 모서리는 왼쪽 가장자리 창에서 판 색이 이어지는 끝 행의 깎임으로 읽는다. 종료 코드 0 PASS · 1 FAIL(색 · 여백 · 각진 모서리) · **3 판정 불가**(판 윤곽이 없다 — 판 색 면이 화면 폭 전체이거나 없다. 어두운 비주얼 노벨).
- (r03) `ghost PNG '#RRGGBB' [TOL] [LIMIT]` — 판 안쪽(가장자리에서 70px 안, 모서리 반경 밖)에서 안내 글자(채널 최솟값 100 이상) 둘레 4px를 뺀 픽셀이 판 색 mode와 낸 **최대 대비**(E15). LIMIT(기본 1.08) 이하이면 PASS. 계약의 계산값은 1.05:1이다. 세 개 미만인 색은 가장자리 번짐으로 뺀다.
- `selftest` — 합성 PNG 24건(r03에서 판 11건 추가: 둥근 판의 상자 · 여백 · 한도보다 좁은 여백 · 각진 판 · 판 없음 · 화면 전체가 판 색 · 잔상 PASS / FAIL).

**한계**: 평평함은 격자 표본이다(작은 글자 · 얇은 선은 놓칠 수 있다). `textbox`는 「스크림 0.8 아래의 앱 글자는 밝은 픽셀이 되지 못한다」는 계산(합성 최대 약 72)에 기댄다 — 스크림이 옅으면(0.6) 뒤 화면의 흰 면이 통째로 잡혀 FAIL이 난다(그것이 E14의 신호이기도 하다). 순수 Python 디코더라 캡처 한 장에 수 초 걸린다.

```python file=guidepx.py
#!/usr/bin/env python3
"""학습 문항 안내 캡처 판독 도구 (barscan.py와 같은 폴더에 둔다 — PNG 디코더를 거기서 가져온다).
  guidepx.py px PNG X Y [R]                   (X,Y) 둘레 (2R+1)^2 칸의 중앙값 색과 번짐(채널 최대-최소의 최대). 기본 R 3
  guidepx.py expect PNG X Y '#RRGGBB' [TOL] [R]   그 자리가 평평하고(번짐 3 이하) 기대색에서 채널당 TOL(기본 6) 안인가 — E14
  guidepx.py flat PNG '#RRGGBB' [TOL]         캡처 전체에서 평평한 자리(글자 · 그림 없음)를 격자로 모아 색 덩이로 묶고,
                                              기대색 TOL 안의 덩이가 있으면 PASS. 어디를 재야 할지 모를 때(E14의 1단계)
  guidepx.py covered PNG X Y [MAXCH]          (X,Y)가 평평하고 가장 밝은 채널이 MAXCH(기본 100) 이하인가 — E2의 상단 띠 · 하단 띠
  guidepx.py textbox PNG [Y0 Y1 MARGIN]       Y0~Y1(기본 132~2268, 상태바 · 내비게이션 바 제외)에서 채널 최솟값 200 이상인 픽셀
                                              (스크림 0.8 아래의 앱 글자는 합성 최대값이 약 72라 여기 안 든다 = 안내의 글자만 든다)의
                                              경계 상자와 가로줄 묶음을 낸다. 좌우 MARGIN(기본 24px) 안쪽이면 PASS — E1
  guidepx.py same PNG_A PNG_B X Y [TOL] [R]   두 캡처의 같은 자리 색이 TOL 안에서 같은가 — E16
  guidepx.py panel PNG '#RRGGBB' [TOL] [MINMARGIN]   바탕 판(r03)의 경계 상자 · 좌우 여백 · 모서리가 둥근가 · 판 색. 판 밖 예시 좌표도 낸다 — E13 · E14 · E17.
                                              종료 코드 0 PASS · 1 FAIL(색 · 여백 · 모서리) · 3 판정 불가(판 윤곽이 없다 — 비주얼 노벨처럼 바탕이 판 색과 같다)
  guidepx.py ghost PNG '#RRGGBB' [TOL] [LIMIT]       판 안에서 안내 글자 둘레 4px 밖의 픽셀이 판 색 mode와 낸 최대 대비. LIMIT(기본 1.08) 이하면 PASS — E15.
                                              글자는 **가장 밝은 채널 100 이상**인 픽셀이라 주황 화살표(최솟값 채널이 낮다)도 글자로 센다(r03 재실행이 고침)
  환경 변수 GUIDE_BOX='X0,X1,Y0,Y1'           panel · ghost의 판 상자를 손으로 정한다(출력의 「판 상자 x X0~X1 y Y0~Y1」과 같은 순서 · 끝 포함).
                                              판 아래에 같은 색의 어두운 면(글꼴 2.0 메신저의 하단 버튼 · 비주얼 노벨의 대사 카드)이 붙어 자동 판독이 상자를 합칠 때 쓴다
  guidepx.py selftest                         합성 PNG로 도구를 검사한다
종료 코드: 0 PASS · 1 FAIL · 2 사용법. 판정 문구는 첫 줄에 PASS/FAIL로 나온다."""
import os, sys, tempfile
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png


def hexs(c):
    return "#%02X%02X%02X" % tuple(c)


def parse(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def cell(img, x, y, r):
    """(x,y) 둘레의 중앙값 색과 번짐."""
    w, h, bpp, rows = img
    xs = range(max(0, x - r), min(w, x + r + 1))
    ys = range(max(0, y - r), min(h, y + r + 1))
    px = [tuple(rows[j][i * bpp:i * bpp + 3]) for j in ys for i in xs]
    med = tuple(sorted(p[k] for p in px)[len(px) // 2] for k in range(3))
    spread = max(max(p[k] for p in px) - min(p[k] for p in px) for k in range(3))
    return med, spread


def within(a, b, tol):
    return all(abs(a[k] - b[k]) <= tol for k in range(3))


def cmd_px(png, x, y, r=3):
    c, s = cell(read_png(png), x, y, r)
    print(f"{hexs(c)} spread={s}")
    return 0


def cmd_expect(png, x, y, want, tol=6, r=3):
    c, s = cell(read_png(png), x, y, r)
    wc = parse(want)
    d = tuple(c[k] - wc[k] for k in range(3))
    ok = s <= 3 and within(c, wc, tol)
    why = "" if ok else (" — 번짐이 커서 글자 · 그림 위일 수 있다(자리를 옮긴다)" if s > 3 else " — 기대색에서 벗어났다(값과 함께 보고하고 접근성 단계로 넘긴다)")
    print(f"{'PASS' if ok else 'FAIL'} 얻은 {hexs(c)} 기대 {hexs(wc)} 차 {d} 번짐 {s} 허용 ±{tol}{why}")
    return 0 if ok else 1


def flat_clusters(img, step=36, r=4, y0=132, y1=2268):
    """평평한 격자점을 양자화 색(4단위)으로 묶는다. {키: [개수, 평균색 합, 예시 좌표]}."""
    w, h, _, _ = img
    out = {}
    for y in range(max(y0, r), min(y1, h - r), step):
        for x in range(r, w - r, step):
            c, s = cell(img, x, y, r)
            if s > 3:
                continue
            key = tuple(v // 4 for v in c)
            e = out.setdefault(key, [0, [0, 0, 0], (x, y)])
            e[0] += 1
            for k in range(3):
                e[1][k] += c[k]
    return out


def cmd_flat(png, want, tol=6):
    wc = parse(want)
    cl = flat_clusters(read_png(png))
    rows = sorted(((n, tuple(t // n for t in sm), at) for n, sm, at in cl.values()), reverse=True)[:6]
    for n, c, at in rows:
        print(f"  평평한 격자점 {n}개 {hexs(c)} 예시 좌표 {at[0]} {at[1]}")
    hit = [(n, c, at) for n, c, at in rows if n >= 20 and within(c, wc, tol)]
    if hit:
        print(f"PASS 기대 {hexs(wc)} ±{tol} 안의 평평한 면: {hexs(hit[0][1])} ({hit[0][0]}점, 예시 {hit[0][2][0]} {hit[0][2][1]})")
        return 0
    print(f"FAIL 기대 {hexs(wc)} ±{tol} 안에서 20점 이상인 평평한 면이 없다 — 위 덩이 표의 가장 큰 색을 값과 함께 보고한다")
    return 1


def cmd_covered(png, x, y, maxch=100):
    c, s = cell(read_png(png), x, y, 3)
    ok = s <= 3 and max(c) <= maxch
    print(f"{'PASS' if ok else 'FAIL'} ({x},{y}) {hexs(c)} 번짐 {s} 가장 밝은 채널 {max(c)} (한도 {maxch})")
    return 0 if ok else 1


def cmd_textbox(png, y0=132, y1=2268, margin=24):
    w, h, bpp, rows = read_png(png)
    xmin, xmax, ymin, ymax, n, rowhit = w, -1, h, -1, 0, []
    for y in range(y0, min(y1, h)):
        line, hit = rows[y], False
        for x in range(w):
            o = x * bpp
            if min(line[o], line[o + 1], line[o + 2]) >= 200:
                hit = True
                n += 1
                xmin, xmax = min(xmin, x), max(xmax, x)
        if hit:
            ymin, ymax = min(ymin, y), max(ymax, y)
        rowhit.append(hit)
    if n == 0:
        print("FAIL 밝은 글자 픽셀이 없다 — 안내가 안 떴거나 스크림이 0.8보다 옅다")
        return 1
    bands, start = [], None
    for i, hit in enumerate(rowhit + [False]):
        if hit and start is None:
            start = i
        if not hit and start is not None:
            bands.append((y0 + start, y0 + i - 1))
            start = None
    merged = []
    for b in bands:                       # 글자 줄 안의 틈(8px 이하)은 한 묶음으로
        if merged and b[0] - merged[-1][1] <= 8:
            merged[-1] = (merged[-1][0], b[1])
        else:
            merged.append(b)
    ok = xmin >= margin and xmax <= w - 1 - margin
    print(f"{'PASS' if ok else 'FAIL'} 글자 상자 x {xmin}~{xmax} (캡처 폭 {w}, 좌우 여백 한도 {margin}) y {ymin}~{ymax} 픽셀 {n}")
    print("  가로줄 묶음 " + ", ".join(f"{a}~{b}" for a, b in merged))
    return 0 if ok else 1


def cmd_same(a, b, x, y, tol=6, r=3):
    ca, sa = cell(read_png(a), x, y, r)
    cb, sb = cell(read_png(b), x, y, r)
    ok = sa <= 3 and sb <= 3 and within(ca, cb, tol)
    print(f"{'PASS' if ok else 'FAIL'} A {hexs(ca)} 번짐 {sa} / B {hexs(cb)} 번짐 {sb} (±{tol})")
    return 0 if ok else 1


def lum(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def ratio(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def env_box():
    """환경 변수 GUIDE_BOX='X0,X1,Y0,Y1' -> 튜플. 없으면 None. 형식이 틀리면 ValueError(사용법을 낸다)."""
    v = os.environ.get("GUIDE_BOX", "").strip()
    if not v:
        return None
    p = [int(s) for s in v.replace(",", " ").split()]
    if len(p) != 4:
        raise ValueError("GUIDE_BOX")
    return tuple(p)


def box_geometry(img, wc, tol, box):
    """손으로 정한 판 상자(x0, x1, y0, y1 — 끝 포함)의 geometry. 모서리 깎임만 상자 가장자리에서 읽는다."""
    w, h, bpp, rows = img
    bx0, bx1, top, bot = box

    def edge_x(y):
        line = rows[y]
        for x in range(max(0, bx0 - 6), min(w, bx0 + 150)):
            o = x * bpp
            if abs(line[o] - wc[0]) <= tol and abs(line[o + 1] - wc[1]) <= tol and abs(line[o + 2] - wc[2]) <= tol:
                return x
        return None
    it, ib = (edge_x(top) or bx0) - bx0, (edge_x(bot) or bx0) - bx0
    return dict(x0=bx0, x1=bx1, y0=top, y1=bot, left=bx0, right=w - 1 - bx1, inset_top=it, inset_bottom=ib, full=False)


def panel_geometry(img, wc, tol=6, y0=132, y1=2337, box=None):
    """판(색 wc ±tol)의 경계 상자. 없으면 None. 반환 dict(x0, x1, y0, y1, left, right, inset_top, inset_bottom, full).
    행마다 판 색 픽셀 수를 세어 가장 넓은 행(90퍼센타일)의 35% 이상인 행의 가장 긴 연속 묶음을 판으로 본다 — 판 밖의 뒤 글자 잔상(스크림과 같은 색)이 몇 줄 걸려도 묶음이 안 된다.
    좌우는 그 행들의 처음 · 끝 판 색 픽셀 x의 중앙값, 위아래 끝과 모서리는 왼쪽 가장자리 창(x0-6 ~ x0+150)에서 판 색이 이어지는 행까지 넓혀 읽는다.
    y1 기본 2337은 하단 손잡이(r03 재실행: 1080x2400) — 낡은 2268이면 density 540에서 판 아래 끝(y 2318)이 잘렸다.
    판 아래에 같은 색의 면이 붙으면 이 자동 판독은 그 면을 판으로 합친다 — box=(x0, x1, y0, y1)로 손으로 정한다(환경 변수 GUIDE_BOX)."""
    if box is not None:
        return box_geometry(img, wc, tol, box)
    w, h, bpp, rows = img
    cnt, first, last = {}, {}, {}
    for y in range(y0, min(y1, h)):
        line, n, f, l = rows[y], 0, -1, -1
        for x in range(w):
            o = x * bpp
            if abs(line[o] - wc[0]) <= tol and abs(line[o + 1] - wc[1]) <= tol and abs(line[o + 2] - wc[2]) <= tol:
                n += 1
                if f < 0:
                    f = x
                l = x
        cnt[y], first[y], last[y] = n, f, l
    big = sorted(n for n in cnt.values() if n >= 120)
    if not big:
        return None
    thr = max(120, 0.35 * big[int(len(big) * 0.9)])
    runs, cur = [], []
    for y in range(y0, min(y1, h)):
        if cnt[y] >= thr:
            cur.append(y)
        elif cur and y - cur[-1] > 12:         # 글자 줄 사이의 틈(12행 이하)은 이어 본다
            runs.append(cur)
            cur = []
    if cur:
        runs.append(cur)
    if not runs:
        return None
    ys = max(runs, key=len)
    fs, ls = sorted(first[y] for y in ys), sorted(last[y] for y in ys)
    bx0, bx1 = fs[len(fs) // 2], ls[len(ls) // 2]

    def edge_x(y):                              # 왼쪽 가장자리 창에서 처음 판 색 x
        line = rows[y]
        for x in range(max(0, bx0 - 6), min(w, bx0 + 150)):
            o = x * bpp
            if abs(line[o] - wc[0]) <= tol and abs(line[o + 1] - wc[1]) <= tol and abs(line[o + 2] - wc[2]) <= tol:
                return x
        return None
    top, bot = ys[0], ys[-1]
    gap = 0
    while top > 0 and gap <= 3:                 # 위로 — 창에 판 색이 이어지는 만큼
        if edge_x(top - 1) is None:
            gap += 1
            if gap > 3:
                break
        else:
            gap = 0
        top -= 1
    while edge_x(top) is None and top < ys[0]:  # 끝에 붙은 틈을 걷어 낸다
        top += 1
    gap = 0
    while bot < h - 1 and gap <= 3:
        if edge_x(bot + 1) is None:
            gap += 1
            if gap > 3:
                break
        else:
            gap = 0
        bot += 1
    while edge_x(bot) is None and bot > ys[-1]:
        bot -= 1
    it, ib = (edge_x(top) or bx0) - bx0, (edge_x(bot) or bx0) - bx0
    return dict(x0=bx0, x1=bx1, y0=top, y1=bot, left=bx0, right=w - 1 - bx1, inset_top=it, inset_bottom=ib,
                full=bx0 <= 2 and bx1 >= w - 3)


def inner_colors(img, g, inset=70, step=2, halo=2):
    """판 안쪽(가장자리 inset 안쪽)에서 안내 글자(가장 밝은 채널 100 이상 — 주황 화살표 포함) 둘레 halo*step px를 뺀 픽셀의 색 개수. Counter."""
    w, h, bpp, rows = img
    xa, xb, ya, yb = g["x0"] + inset, g["x1"] - inset, g["y0"] + inset, g["y1"] - inset
    if xb <= xa or yb <= ya:
        xa, xb, ya, yb = g["x0"] + 24, g["x1"] - 24, g["y0"] + 24, g["y1"] - 24
    xs, ys = list(range(xa, xb, step)), list(range(ya, yb, step))
    text = []
    for y in ys:
        line, m = rows[y], 0
        for i, x in enumerate(xs):
            o = x * bpp
            if max(line[o], line[o + 1], line[o + 2]) >= 100:
                m |= 1 << i
        text.append(m)
    wide = [m | m << 1 | m << 2 | m >> 1 | m >> 2 for m in text]
    cnt = Counter()
    for j, y in enumerate(ys):
        line, m = rows[y], 0
        for k in range(max(0, j - halo), min(len(wide), j + halo + 1)):
            m |= wide[k]
        for i, x in enumerate(xs):
            if not (m >> i) & 1:
                o = x * bpp
                cnt[(line[o], line[o + 1], line[o + 2])] += 1
    return cnt


def cmd_panel(png, want, tol=6, minmargin=None):
    img = read_png(png)
    wc = parse(want)
    g = panel_geometry(img, wc, tol, box=env_box())
    if g is None or g["full"]:
        print("판정 불가 판 색 ±%d의 넓은 면이 없다%s — 바탕이 판 색과 같으면(비주얼 노벨) 윤곽이 없다. 눈으로 본다" % (tol, "" if g is None else " (면이 화면 폭 전체다)"))
        return 3
    cnt = inner_colors(img, g)
    mode = cnt.most_common(1)[0][0] if cnt else (0, 0, 0)
    rounded = g["inset_top"] >= 4 and g["inset_bottom"] >= 4
    ok_color = within(mode, wc, tol)
    ok_margin = minmargin is None or (g["left"] >= minmargin and g["right"] >= minmargin)
    ok = ok_color and ok_margin and rounded
    cx = (g["x0"] + g["x1"]) // 2
    ey = g["y0"] - 80 if g["y0"] >= 220 else g["y1"] + 80
    print(f"{'PASS' if ok else 'FAIL'} 판 상자 x {g['x0']}~{g['x1']} y {g['y0']}~{g['y1']} (폭 {g['x1'] - g['x0'] + 1} 높이 {g['y1'] - g['y0'] + 1})"
          f" 좌 여백 {g['left']}px 우 여백 {g['right']}px" + (f" (한도 {minmargin})" if minmargin is not None else ""))
    print(f"  모서리 깎임 위 {g['inset_top']}px 아래 {g['inset_bottom']}px -> {'둥글다' if rounded else '각졌다'}")
    print(f"  판 색 mode {hexs(mode)} (기대 {hexs(wc)} ±{tol} -> {'맞음' if ok_color else '벗어남'})")
    print(f"  판 밖 예시 좌표 {cx} {max(ey, 140)} (E14에서 스크림만 있는 자리를 잴 때)")
    return 0 if ok else 1


def cmd_ghost(png, want, tol=6, limit=1.08):
    img = read_png(png)
    wc = parse(want)
    g = panel_geometry(img, wc, tol, box=env_box())
    if g is None or g["full"]:
        print("판정 불가 판의 윤곽이 없다 — 눈으로 본다")
        return 3
    cnt = inner_colors(img, g)
    cnt = Counter({c: n for c, n in cnt.items() if n >= 3})       # 흩어진 한두 픽셀(가장자리 번짐)은 뺀다
    if not cnt:
        print("판정 불가 판 안에 잴 픽셀이 없다")
        return 3
    mode = cnt.most_common(1)[0][0]
    worst = max(cnt, key=lambda c: ratio(c, mode))
    r = ratio(worst, mode)
    tot = sum(cnt.values())
    off = sum(n for c, n in cnt.items() if not within(c, mode, 2))
    ok = r <= limit
    print(f"{'PASS' if ok else 'FAIL'} 판 안 잔상 최대 대비 {r:.3f}:1 (한도 {limit}, 계약 계산 1.05) 판 색 mode {hexs(mode)} 가장 먼 색 {hexs(worst)}"
          f" 표본 {tot}개 중 mode에서 2 넘게 벗어난 것 {off}개")
    return 0 if ok else 1


def selftest():
    fails = []

    def expect(name, got, want):
        ok = got == want
        print(("ok   " if ok else "FAIL ") + f"{name}: {got} (기대 {want})")
        if not ok:
            fails.append(name)
    W, H = 1080, 2400
    SCRIM = (72, 73, 77)
    tmp = tempfile.mkdtemp()

    def make(name, paint):
        p = os.path.join(tmp, name + ".png")
        write_png(p, W, H, paint)
        return p
    text = lambda x, y: (255, 255, 255) if (200 <= x < 880 and 1000 <= y < 1060) or (200 <= x < 700 and 1100 <= y < 1140) else None
    base = lambda x, y: text(x, y) or SCRIM
    ok_png = make("ok", base)
    run = lambda f, *a: _quiet(f, *a)
    expect("expect 평평한 합성색", run(cmd_expect, ok_png, 540, 600, "#48494D", 6), 0)
    expect("expect 기대보다 어두운 합성색(±6 밖)", run(cmd_expect, make("dark", lambda x, y: text(x, y) or (40, 40, 44)), 540, 600, "#48494D", 6), 1)
    expect("expect 글자 위(번짐)", run(cmd_expect, ok_png, 400, 1000, "#48494D", 6), 1)
    expect("flat 합성색 덩이", run(cmd_flat, ok_png, "#48494D", 6), 0)
    expect("flat 기대와 다른 면", run(cmd_flat, make("light", lambda x, y: text(x, y) or (255, 253, 252)), "#48494D", 6), 1)
    expect("covered 어두운 띠", run(cmd_covered, ok_png, 420, 60, 100), 0)
    expect("covered 덮이지 않은 밝은 띠", run(cmd_covered, make("band", lambda x, y: (250, 250, 250) if y < 130 else base(x, y)), 420, 60, 100), 1)
    expect("textbox 안 잘린 글자", run(cmd_textbox, ok_png), 0)
    expect("textbox 왼쪽이 잘린 글자", run(cmd_textbox, make("clip", lambda x, y: (255, 255, 255) if (0 <= x < 500 and 1000 <= y < 1060) else SCRIM)), 1)
    expect("textbox 글자 없음", run(cmd_textbox, make("none", lambda x, y: SCRIM)), 1)
    expect("textbox 뒤 글자(합성 최대 72)는 안 든다", run(cmd_textbox, make("bleed", lambda x, y: (72, 72, 72) if 1000 <= y < 1060 else SCRIM)), 1)
    expect("same 같은 색", run(cmd_same, ok_png, make("ok2", base), 540, 600, 6), 0)
    expect("same 다른 색(0.6과 0.8)", run(cmd_same, ok_png, make("o6", lambda x, y: (118, 119, 121)), 540, 600, 6), 1)
    # 바탕 판(r03) — 스크림 위 둥근 판, 판 밖의 뒤 글자 잔상(스크림과 같은 색), 판 안의 잔상
    PANEL, INK, BIGINK = (31, 33, 36), (26, 28, 32), (60, 60, 64)
    PX0, PX1, PY0, PY1, RAD = 75, 1004, 600, 1800, 63

    def in_panel(x, y, rad=RAD):
        if not (PX0 <= x <= PX1 and PY0 <= y <= PY1):
            return False
        cx = PX0 + rad if x < PX0 + rad else (PX1 - rad if x > PX1 - rad else None)
        cy = PY0 + rad if y < PY0 + rad else (PY1 - rad if y > PY1 - rad else None)
        if cx is None or cy is None:
            return True
        return (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad
    outside_ink = lambda x, y: 300 <= x < 700 and 300 <= y < 380          # 판 밖 위쪽의 뒤 글자(INK)
    title = lambda x, y: 150 <= x < 900 and 700 <= y < 730 or 150 <= x < 800 and 900 <= y < 925

    def panel_img(name, rad=RAD, ghost=None):
        def paint(x, y):
            if in_panel(x, y, rad):
                if title(x, y):
                    return (255, 255, 255)
                if ghost and 300 <= x < 500 and 1200 <= y < 1300:
                    return ghost
                return PANEL
            return INK if outside_ink(x, y) else SCRIM
        return make(name, paint)
    p_ok = panel_img("panel")
    expect("panel 둥근 판 PASS", run(cmd_panel, p_ok, "#1F2124", 6, 42), 0)
    g = panel_geometry(read_png(p_ok), PANEL, 6)
    expect("panel 경계 상자(좌우 · 위아래 ±2)", (abs(g["x0"] - PX0) <= 2, abs(g["x1"] - PX1) <= 2, abs(g["y0"] - PY0) <= 2, abs(g["y1"] - PY1) <= 2), (True, True, True, True))
    expect("panel 좌우 여백", (g["left"], g["right"]), (PX0, 1079 - PX1))
    expect("panel 한도보다 좁은 여백은 FAIL", run(cmd_panel, p_ok, "#1F2124", 6, 100), 1)
    expect("panel 각진 판은 FAIL", run(cmd_panel, panel_img("square", 0), "#1F2124", 6, 42), 1)
    expect("panel 스크림 색을 판 색으로 기대하면 판정 불가(스크림이 화면 폭 전체다)",run(cmd_panel, p_ok, "#48494D", 6, 42), 3)
    expect("panel 판이 없으면 판정 불가", run(cmd_panel, make("noplate", lambda x, y: SCRIM), "#1F2124", 6), 3)
    expect("panel 화면 전체가 판 색이면 판정 불가", run(cmd_panel, make("allplate", lambda x, y: PANEL), "#1F2124", 6), 3)
    expect("ghost 계약 잔상(INK) PASS", run(cmd_ghost, panel_img("ghost-ok", ghost=INK), "#1F2124", 6, 1.08), 0)
    expect("ghost 진한 잔상 FAIL", run(cmd_ghost, panel_img("ghost-bad", ghost=BIGINK), "#1F2124", 6, 1.08), 1)
    expect("ghost 판이 없으면 판정 불가", run(cmd_ghost, make("noplate2", lambda x, y: SCRIM), "#1F2124", 6), 3)
    # r03 재실행이 찾은 결함 둘 — 주황 화살표를 글자로 세지 않던 ghost · 판 아래 같은 색 면을 합치던 panel
    ARROW = (245, 108, 20)

    def panel_img2(name, button=False, arrow=False):
        def paint(x, y):
            if button and 200 <= x < 880 and PY1 < y <= PY1 + 100:        # 판 아래에 붙은 같은 색의 면(하단 버튼 · 대사 카드)
                return PANEL
            if in_panel(x, y):
                if title(x, y):
                    return (255, 255, 255)
                if arrow and 600 <= x < 640 and 1200 <= y < 1240:           # 판 안의 주황 화살표(최솟값 채널이 낮다)
                    return ARROW
                return PANEL
            return INK if outside_ink(x, y) else SCRIM
        return make(name, paint)
    expect("ghost 주황 화살표는 글자다(잔상이 아니다) PASS", run(cmd_ghost, panel_img2("arrow", arrow=True), "#1F2124", 6, 1.08), 0)
    p_btn = panel_img2("button", button=True)
    gb = panel_geometry(read_png(p_btn), PANEL, 6)
    expect("panel 자동 판독은 판 아래 같은 색 면을 합친다(알려진 한계 — 손 상자가 필요하다)", gb["y1"] > PY1 + 50, True)
    gm = panel_geometry(read_png(p_btn), PANEL, 6, box=(PX0, PX1, PY0, PY1))
    expect("panel 손 상자는 합치지 않는다", (gm["x0"], gm["x1"], gm["y0"], gm["y1"]), (PX0, PX1, PY0, PY1))
    expect("panel 손 상자의 모서리 깎임(둥글다)", (gm["inset_top"] >= 4, gm["inset_bottom"] >= 4), (True, True))
    os.environ["GUIDE_BOX"] = "%d,%d,%d,%d" % (PX0, PX1, PY0, PY1)
    try:
        expect("panel GUIDE_BOX 환경 변수로 PASS(상자 · 여백 · 모서리)", run(cmd_panel, p_btn, "#1F2124", 6, 42), 0)
        expect("ghost GUIDE_BOX 환경 변수로 PASS", run(cmd_ghost, p_btn, "#1F2124", 6, 1.08), 0)
        os.environ["GUIDE_BOX"] = "1,2,3"
        expect("GUIDE_BOX 형식이 틀리면 ValueError", _raises(env_box), True)
    finally:
        del os.environ["GUIDE_BOX"]
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1


def _raises(f):
    try:
        f()
    except ValueError:
        return True
    return False


def _quiet(f, *a):
    real, sys.stdout = sys.stdout, open(os.devnull, "w")
    try:
        return f(*a)
    finally:
        sys.stdout.close()
        sys.stdout = real


if __name__ == "__main__":
    a = sys.argv[1:]
    n = lambda i, d: int(a[i]) if len(a) > i else d
    try:
        if a[:1] == ["selftest"]:
            sys.exit(selftest())
        elif a[:1] == ["px"] and len(a) >= 4:
            sys.exit(cmd_px(a[1], int(a[2]), int(a[3]), n(4, 3)))
        elif a[:1] == ["expect"] and len(a) >= 5:
            sys.exit(cmd_expect(a[1], int(a[2]), int(a[3]), a[4], n(5, 6), n(6, 3)))
        elif a[:1] == ["flat"] and len(a) >= 3:
            sys.exit(cmd_flat(a[1], a[2], n(3, 6)))
        elif a[:1] == ["covered"] and len(a) >= 4:
            sys.exit(cmd_covered(a[1], int(a[2]), int(a[3]), n(4, 100)))
        elif a[:1] == ["textbox"] and len(a) >= 2:
            sys.exit(cmd_textbox(a[1], n(2, 132), n(3, 2268), n(4, 24)))
        elif a[:1] == ["panel"] and len(a) >= 3:
            sys.exit(cmd_panel(a[1], a[2], n(3, 6), n(4, None)))
        elif a[:1] == ["ghost"] and len(a) >= 3:
            sys.exit(cmd_ghost(a[1], a[2], n(3, 6), float(a[4]) if len(a) > 4 else 1.08))
        elif a[:1] == ["same"] and len(a) >= 5:
            sys.exit(cmd_same(a[1], a[2], int(a[3]), int(a[4]), n(5, 6), n(6, 3)))
    except (ValueError, IndexError):
        pass
    print(__doc__)
    sys.exit(2)
```

## 부록 — `clappers.py` (r03 재실행, density 540의 메신저 · 전화 찾기)

density 540(E13 (3))에서는 비주얼 노벨의 연주황 앵커(`vnanchor`)가 잡히지 않는다 [실측(2026-10-09)]. 맵의 특별 단원 노드 옆에는 **근검정 덩이(클래퍼)** 가 있어 그 y 중심을 낸다 — 아래에서 위로 **두 번째가 메신저, 첫 번째가 전화**로 찾았다(r03 재실행의 방법. 다른 조건에서는 눈으로 대조한다). 디코더는 `barscan.py`의 것을 쓴다. `selftest`는 합성 PNG 2건.

```python file=clappers.py
#!/usr/bin/env python3
"""clappers.py PNG [XMIN XMAX]   맵의 특별 단원 노드 옆 클래퍼(근검정 — 가장 밝은 채널 45 미만) 덩이의 y 중심 목록(기본 x 600~720)
clappers.py selftest              합성 PNG 검사. 종료 코드: 0 · 2 사용법 / selftest 실패는 1"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png


def centers(png, xmin=600, xmax=720):
    w, h, bpp, rows = read_png(png)
    ys = []
    for y in range(300, min(2200, h), 2):
        r = rows[y]
        n = sum(1 for x in range(xmin, min(xmax, w), 3) if max(r[x * bpp:x * bpp + 3]) < 45)
        if n >= 4:
            ys.append(y)
    cl = []
    for y in ys:
        if cl and y - cl[-1][-1] <= 40:
            cl[-1].append(y)
        else:
            cl.append([y])
    return [(c[0] + c[-1]) // 2 for c in cl]


def selftest():
    fails = []
    tmp = tempfile.mkdtemp()

    def make(name, paint):
        p = os.path.join(tmp, name + ".png")
        write_png(p, 1080, 2400, paint)
        return p
    black = lambda x, y: (10, 10, 12) if (620 <= x < 700 and (800 <= y < 860 or 1500 <= y < 1560)) else (255, 253, 252)
    got = centers(make("two", black))
    ok = len(got) == 2 and abs(got[0] - 830) <= 4 and abs(got[1] - 1530) <= 4
    print(("ok   " if ok else "FAIL ") + f"클래퍼 둘의 y 중심: {got} (기대 약 830 1530)")
    if not ok:
        fails.append("two")
    got = centers(make("none", lambda x, y: (255, 253, 252)))
    print(("ok   " if got == [] else "FAIL ") + f"클래퍼 없음: {got} (기대 [])")
    if got != []:
        fails.append("none")
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["selftest"]:
        sys.exit(selftest())
    if len(a) in (1, 3):
        try:
            print(" ".join(str(c) for c in (centers(a[0], int(a[1]), int(a[2])) if len(a) == 3 else centers(a[0]))))
            sys.exit(0)
        except ValueError:
            pass
    print(__doc__)
    sys.exit(2)
```

## 부록 — `ring.py` · `montage.py` · `contrast.py` · `tb-idioms.sh` (r03, 접근성 단계의 도구)

접근성 단계가 TalkBack 낭독을 캡처할 때 쓴 도구를 옮겼다(`artifacts/accessibility/tools/`). 작업 디렉터리 경로 · 세션 임시 경로는 지웠고, `ring.py` · `montage.py` · `contrast.py`는 `selftest`를 더했다. 모두 위 「도구」의 추출 블록이 `$TOOLS`로 꺼낸다. 세 파이썬 도구는 `barscan.py`(`hide-scrollbars.md` 부록)의 `read_png` · `write_png`를 가져다 쓰므로 같은 폴더여야 한다. 표준 라이브러리만 쓴다.

### `ring.py`

TalkBack 초점 테두리(채도 높은 초록 픽셀)의 경계 상자. `ring.py PNG...`는 캡처마다 상자를 내고, `ring.py inside PNG X0 Y0 X1 Y1`은 그 상자가 사각형 안에 드는가(드는 것 0 · 아닌 것 1 · 테두리 없음 3)를 낸다(E10 (c)).

```python file=ring.py
#!/usr/bin/env python3
"""TalkBack 초점 테두리 판독 도구 (barscan.py와 같은 폴더에 둔다 — PNG 디코더를 거기서 가져온다).
  ring.py PNG...        캡처마다 TalkBack 초점 테두리(채도 높은 초록 픽셀, 2px 간격 표본)의 경계 상자를 낸다
                        — 표본이 150개 이하면 `no ring`(초점 테두리가 없다). 종료 코드 0
  ring.py inside PNG X0 Y0 X1 Y1   테두리 경계 상자가 (X0,Y0)~(X1,Y1) 안에 드는가 — E10 (b) (c) 에서 안내 상자 안인지. 들면 0, 아니면 1, 테두리가 없으면 3
  ring.py selftest      합성 PNG로 도구를 검사한다"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png

GREEN = (0, 200, 60)


def ring_box(png):
    """(x0, y0, x1, y1, n) 또는 None."""
    w, h, bpp, rows = read_png(png)
    x0 = y0 = 10 ** 9
    x1 = y1 = -1
    n = 0
    for y in range(0, h, 2):
        r = rows[y]
        for x in range(0, w, 2):
            R, G, B = r[x * bpp], r[x * bpp + 1], r[x * bpp + 2]
            if G > 120 and G - R > 50 and G - B > 70:
                n += 1
                x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
    return (x0, y0, x1, y1, n) if n > 150 else None


def selftest():
    fails = []

    def expect(name, got, want):
        ok = got == want
        print(("ok   " if ok else "FAIL ") + f"{name}: {got} (기대 {want})")
        if not ok:
            fails.append(name)
    tmp = tempfile.mkdtemp()
    with_ring = os.path.join(tmp, "ring.png")
    # 폭 4px의 초록 테두리 상자 x 100~500, y 300~700
    edge = lambda x, y: 100 <= x <= 500 and 300 <= y <= 700 and not (104 <= x <= 496 and 304 <= y <= 696)
    write_png(with_ring, 600, 900, lambda x, y: GREEN if edge(x, y) else (72, 73, 77))
    none_png = os.path.join(tmp, "none.png")
    write_png(none_png, 600, 900, lambda x, y: (72, 73, 77))
    b = ring_box(with_ring)
    expect("테두리 경계 상자", b[:4] if b else None, (100, 300, 500, 700))
    expect("테두리 없음", ring_box(none_png), None)
    expect("inside 안", _code(["inside", with_ring, "90", "290", "510", "710"]), 0)
    expect("inside 밖(상자가 더 작다)", _code(["inside", with_ring, "150", "290", "510", "710"]), 1)
    expect("inside 테두리 없음", _code(["inside", none_png, "0", "0", "600", "900"]), 3)
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1


def _code(args):
    real, sys.stdout = sys.stdout, open(os.devnull, "w")
    try:
        return main(args)
    finally:
        sys.stdout.close()
        sys.stdout = real


def main(a):
    if a[:1] == ["selftest"]:
        return selftest()
    if a[:1] == ["inside"] and len(a) == 6:
        b = ring_box(a[1])
        if b is None:
            print(f"{os.path.basename(a[1])} no ring")
            return 3
        X0, Y0, X1, Y1 = (int(v) for v in a[2:6])
        ok = b[0] >= X0 and b[1] >= Y0 and b[2] <= X1 and b[3] <= Y1
        print(f"{os.path.basename(a[1])} ring x {b[0]}-{b[2]} y {b[1]}-{b[3]} n={b[4]} {'inside' if ok else 'OUTSIDE'} {X0},{Y0}-{X1},{Y1}")
        return 0 if ok else 1
    if a:
        for png in a:
            b = ring_box(png)
            name = os.path.basename(png)
            print(f"{name:40s} " + (f"ring x {b[0]}-{b[2]} y {b[1]}-{b[3]} n={b[4]}" if b else "no ring"))
        return 0
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

### `montage.py`

걸음마다 캡처한 화면 아래쪽의 발화 글자 띠를 세로로 쌓은 그림 하나를 만든다(E10 `report`).

```python file=montage.py
#!/usr/bin/env python3
"""발화 글자 띠 모음 (barscan.py와 같은 폴더에 둔다).
  montage.py OUT.png Y0 Y1 PNG...   캡처마다 Y0~Y1 띠를 잘라 세로로 쌓는다(캡처 사이에 6px 빨간 줄). 결과는 가로 세로 절반으로 줄인다.
                                    TalkBack 「Display speech output」의 발화 글자는 화면 아래에 뜬다 — 걸음마다 한 줄씩 읽는다
  montage.py selftest               합성 PNG로 도구를 검사한다"""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png


def montage(out, y0, y1, pngs):
    rows_out, W = [], None
    for p in pngs:
        w, h, bpp, rows = read_png(p)
        W = W or w
        for y in range(y0, min(y1, h)):
            r = rows[y]
            rows_out.append(bytes(b for x in range(w) for b in r[x * bpp:x * bpp + 3]) if bpp != 3 else bytes(r))
        for _ in range(6):
            rows_out.append(bytes([255, 0, 0]) * W)
    write_png(out, W // 2, len(rows_out) // 2, lambda x, y: tuple(rows_out[y * 2][x * 6:x * 6 + 3]))
    return W // 2, len(rows_out) // 2


def selftest():
    tmp = tempfile.mkdtemp()
    a, b, out = (os.path.join(tmp, n) for n in ("a.png", "b.png", "out.png"))
    write_png(a, 100, 200, lambda x, y: (10, 20, 30))
    write_png(b, 100, 200, lambda x, y: (200, 210, 220))
    size = montage(out, 50, 80, [a, b])          # (30행 + 6행) x 2 = 72행 → 절반 36행
    w, h, bpp, rows = read_png(out)
    ok = size == (50, 36) and (w, h) == (50, 36) and tuple(rows[0][0:3]) == (10, 20, 30) and tuple(rows[18][0:3]) == (200, 210, 220)
    print(("ok   " if ok else "FAIL ") + f"montage 크기 {size} 첫 줄 {tuple(rows[0][0:3])} 둘째 캡처 첫 줄 {tuple(rows[18][0:3])}")
    print("selftest " + ("PASS" if ok else "FAIL"))
    return 0 if ok else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["selftest"]:
        sys.exit(selftest())
    if len(a) >= 4:
        print("wrote", a[0], "%dx%d" % montage(a[0], int(a[1]), int(a[2]), a[3:]))
        sys.exit(0)
    print(__doc__)
    sys.exit(2)
```

### `contrast.py`

안내 글자와 그 뒤 바탕의 대비를 실제 픽셀에서 잰다(E17 (d), E15 보조). 판정에 쓰는 값은 `bg mode`의 대비다.

```python file=contrast.py
#!/usr/bin/env python3
"""안내 글자와 그 뒤 바탕의 대비를 실제 픽셀에서 잰다 (barscan.py와 같은 폴더에 둔다).
  contrast.py PNG [X0 X1 Y0 Y1]   글자 줄마다 글자색 · 가장 흔한 바탕(mode) · 가장 밝은 / 어두운 바탕과의 대비. 기본 범위 x 60~폭-60, y 400~높이-300
  contrast.py selftest            합성 PNG로 도구를 검사한다
글자 심 = 채널 최솟값 235 이상인 픽셀(안내의 흰색 · gray-100). 바탕 = 가장 큰 채널 130 미만인 픽셀. 줄 = 심 픽셀이 8개 이상인 행의 묶음(6px 이하 틈은 같은 줄).
**판정에 쓰는 값은 `bg mode`의 대비다.** `brightest`는 글자 자신의 가장자리(안티앨리어싱) 픽셀이 섞여 4~5:1로 나온다 — 바탕이 아니다.
`ink share`는 바탕 mode보다 1.3:1 이상 어두운 픽셀의 비율 — 뒤 화면 글자의 잔상이 있다는 신호(판 안에서는 0에 가까워야 한다)."""
import os, sys, tempfile
from collections import Counter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png


def lum(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def ratio(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


hx = lambda c: "#%02X%02X%02X" % tuple(c)


def measure(png, box=None):
    """줄마다 dict(y0, y1, x0, x1, text, mode, r_mode, r_bright, r_dark, ink)."""
    w, h, bpp, rows = read_png(png)
    x0, x1, y0, y1 = box if box else (60, w - 60, 400, h - 300)
    core_rows = []
    for y in range(y0, y1):
        r = rows[y]
        n = 0
        for x in range(x0, x1):
            if min(r[x * bpp:x * bpp + 3]) >= 235:
                n += 1
        core_rows.append(n >= 8)
    bands, s = [], None
    for i, v in enumerate(core_rows + [False]):
        if v and s is None:
            s = i
        if not v and s is not None:
            if bands and (y0 + s) - bands[-1][1] <= 6:
                bands[-1][1] = y0 + i
            else:
                bands.append([y0 + s, y0 + i])
            s = None
    out = []
    for b0, b1 in bands:
        xs = [x for y in range(b0, b1) for x in range(x0, x1) if min(rows[y][x * bpp:x * bpp + 3]) >= 235]
        bx0, bx1 = min(xs), max(xs)
        core, bg = Counter(), Counter()
        for y in range(max(0, b0 - 6), min(h, b1 + 6)):
            r = rows[y]
            for x in range(max(0, bx0 - 6), min(w, bx1 + 7)):
                p = tuple(r[x * bpp:x * bpp + 3])
                if min(p) >= 235:
                    core[p] += 1
                elif max(p) < 130:
                    bg[p] += 1
        if not bg:
            continue
        t = core.most_common(1)[0][0]
        cols = sorted(bg, key=lum)
        tot = sum(bg.values())
        acc, lo = 0, cols[0]
        for c in cols:                      # 가장 드문 0.5%는 흩어진 픽셀이라 뺀다
            acc += bg[c]
            if acc >= tot * 0.005:
                lo = c
                break
        acc, hi = 0, cols[-1]
        for c in reversed(cols):
            acc += bg[c]
            if acc >= tot * 0.005:
                hi = c
                break
        mode = bg.most_common(1)[0][0]
        ink = sum(n for c, n in bg.items() if ratio(c, mode) >= 1.3 and lum(c) < lum(mode)) / tot
        out.append(dict(y0=b0, y1=b1, x0=bx0, x1=bx1, text=t, mode=mode, r_mode=ratio(t, mode),
                        r_bright=ratio(t, hi), r_dark=ratio(t, lo), hi=hi, lo=lo, ink=ink, r_ink=ratio(lo, mode)))
    return out


def show(png, box=None):
    print(os.path.basename(png))
    for d in measure(png, box):
        print(f"  line y {d['y0']}-{d['y1']} x {d['x0']}-{d['x1']} h={d['y1'] - d['y0']}: text {hx(d['text'])} | bg mode {hx(d['mode'])} {d['r_mode']:.2f}:1"
              f" | brightest {hx(d['hi'])} {d['r_bright']:.2f}:1 | darkest {hx(d['lo'])} {d['r_dark']:.2f}:1"
              f" | behind-ink share {d['ink'] * 100:.0f}% (ink vs mode {d['r_ink']:.2f}:1)")


def selftest():
    fails = []

    def expect(name, ok, got):
        print(("ok   " if ok else "FAIL ") + f"{name}: {got}")
        if not ok:
            fails.append(name)
    tmp = tempfile.mkdtemp()
    PANEL, INK = (31, 33, 36), (26, 28, 32)
    p = os.path.join(tmp, "c.png")
    # 판 색 면 위에 흰 글자 줄 둘(y 1000~1030, 1100~1125)과, 둘째 줄 옆에 뒤 글자 잔상(INK) 블록
    def paint(x, y):
        if (200 <= x < 800 and 1000 <= y < 1030) or (200 <= x < 700 and 1100 <= y < 1125):
            return (255, 255, 255)
        if 600 <= x < 720 and 1090 <= y < 1135:
            return INK
        return PANEL
    write_png(p, 1080, 2400, paint)
    ls = measure(p)
    expect("글자 줄 두 개", len(ls) == 2, len(ls))
    expect("글자색 흰색", ls[0]["text"] == (255, 255, 255), hx(ls[0]["text"]))
    expect("가장 흔한 바탕 = 판 색", ls[0]["mode"] == PANEL, hx(ls[0]["mode"]))
    expect("흰색 대 판 색 대비 15:1 이상(계산 약 16)", 15.0 <= ls[0]["r_mode"] <= 17.5, "%.2f" % ls[0]["r_mode"])
    expect("잔상(INK) 대 판 색 1.02 ~ 1.08:1(계산 1.05)", 1.02 <= ls[1]["r_ink"] <= 1.08, "%.3f" % ls[1]["r_ink"])
    expect("잔상은 1.3:1 미만이라 ink 점유율로는 안 센다", ls[1]["ink"] == 0.0, "%.2f" % ls[1]["ink"])
    q = os.path.join(tmp, "empty.png")
    write_png(q, 1080, 2400, lambda x, y: PANEL)
    expect("글자 없음", measure(q) == [], measure(q))
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["selftest"]:
        sys.exit(selftest())
    if a:
        show(a[0], tuple(int(v) for v in a[1:5]) if len(a) >= 5 else None)
        sys.exit(0)
    print(__doc__)
    sys.exit(2)
```

### `tb-idioms.sh`

TalkBack 켜기 · 끄기 · 권한 창 치우기 · 에뮬레이터 하드웨어 터치(쓸기 · 터치 탐색 · 두 번 탭) · 걸음 캡처. **TalkBack이 켜진 동안 `uiautomator`를 부르는 함수(`waitre` · `tapre` · `nodes` · `gfixture`)를 쓰지 않는다.**

```sh file=tb-idioms.sh
# tb-idioms.sh — TalkBack을 켜고 낭독을 캡처하는 셸 관용구 (E10 · E10-r · E10-l). bash · zsh.
# 먼저 이 문서의 「함수 묶음」과 sb-idioms.sh를 한 셸에 정의해 둔다: A · ID · PKG · OUT · TOOLS · WHICH · shot · tapxy · fixture_stop.
# **TalkBack이 켜진 동안에는 uiautomator(dump)를 쓰지 않는다** — waitre · tapre · nodes · gfixture(내부에서 waitre)를 부르지 않는다.
# 덤프가 TalkBack을 풀고 알림 권한 창을 띄운다 [실측(2026-10-09, accessibility 단계)]. 화면을 여는 탭은 `tapxy`(`input tap`)와 색 검출 도달 함수이고, 낭독 조작은 아래 emu event다.

# 지금 포커스인 창(앱이면 MainActivity). 권한 창이 포커스인지 알아볼 때 쓴다
curfocus() { A shell dumpsys window | tr -d '\r' | grep mCurrentFocus; }

# TalkBack을 켜면 접근성 서비스(Accessibility Suite)의 알림 권한 창이 앱을 가린다. 권한 상태는 건드리지 않고 그 작업만 치운다
killperm() {
  local T
  T=$(A shell dumpsys activity activities | tr -d '\r' | grep -o "GrantPermissionsActivity t[0-9]*" | head -1 | grep -o "[0-9]*$")
  [ -n "$T" ] && { A shell am stack remove "$T"; echo "removed perm task $T"; sleep 1; }
  return 0
}

# tbfx [-e 옵션 true …] — TalkBack을 켠 채 새 상태로 시작하는 픽스처. 고정 sleep만 쓴다(uiautomator 없음). 약 180초 뒤 끝난다.
# KEEP=1이면 pm clear를 건너뛰고(안내 기록을 남긴다), WHICH로 번들(after | before)을, FXWAIT로 기다림(기본 14초)을 바꾼다
tbfx() {
  fixture_stop; sleep 1
  [ "${KEEP:-0}" = 1 ] || A shell pm clear "$PKG" >/dev/null
  A logcat -c
  A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest "$@" \
    -e bundleUrl "http://10.0.2.2:18790/${WHICH:-after}/main.lynx.bundle" \
    "$PKG.test/androidx.test.runner.AndroidJUnitRunner" >"$OUT/fixture-$ID.log" 2>&1 &
  sleep "${FXWAIT:-14}"
  killperm
  curfocus
}

# TalkBack 켜기 · 끄기. 켠 뒤 6초 기다리고 권한 창을 치운다. afocus: 접근성 서비스가 실제로 붙었는지(Bound services · touchExplorationEnabled)
tb_on() {
  A shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService
  A shell settings put secure accessibility_enabled 1
  sleep 6; killperm
}
tb_off() {
  A shell settings delete secure enabled_accessibility_services >/dev/null
  A shell settings put secure accessibility_enabled 0
  A shell settings put secure touch_exploration_enabled 0
  sleep 2
}
afocus() { A shell dumpsys accessibility | tr -d '\r' | grep -E "Accessibility Focused Window Id|touchExplorationEnabled|Bound services" | head -5; }

# 에뮬레이터의 하드웨어 수준 터치. 접근성 입력 필터를 지나므로 TalkBack이 쓸기 · 터치 탐색 · 두 번 탭으로 읽는다(접근성 단계는 `adb shell input` 대신 이것을 썼다).
# 좌표는 화면 픽셀(SW x SH, 기본 1080x2400)이고 에뮬레이터 입력 범위(0~32767)로 바꾼다. 화면 크기를 바꿨으면 SW · SH를 준다
ex() { echo $(( $1 * 32767 / ${SW:-1080} )); }
ey() { echo $(( $1 * 32767 / ${SH:-2400} )); }
tdown() { A emu event send EV_ABS:ABS_MT_SLOT:0 EV_ABS:ABS_MT_TRACKING_ID:7 EV_ABS:ABS_MT_PRESSURE:512 EV_ABS:ABS_MT_TOUCH_MAJOR:5 EV_ABS:ABS_MT_POSITION_X:$(ex $1) EV_ABS:ABS_MT_POSITION_Y:$(ey $2) EV_SYN:0:0 >/dev/null; }
tmove() { A emu event send EV_ABS:ABS_MT_POSITION_X:$(ex $1) EV_ABS:ABS_MT_POSITION_Y:$(ey $2) EV_SYN:0:0 >/dev/null; }
tup() { A emu event send EV_ABS:ABS_MT_PRESSURE:0 EV_ABS:ABS_MT_TRACKING_ID:-1 EV_SYN:0:0 >/dev/null; }
explore() { tdown $1 $2; sleep 0.6; tup; sleep 1.2; }                                   # 터치 탐색: 그 점에 초점
swiperight() { tdown 300 ${1:-1200}; tmove 450 ${1:-1200}; tmove 600 ${1:-1200}; tmove 780 ${1:-1200}; tup; sleep 1.8; }   # 다음 요소
swipeleft() { tdown 780 ${1:-1200}; tmove 600 ${1:-1200}; tmove 450 ${1:-1200}; tmove 300 ${1:-1200}; tup; sleep 1.8; }    # 이전 요소
dtap() { tdown $1 $2; tup; sleep 0.12; tdown $1 $2; tup; sleep 1.8; }                  # 두 번 탭: 초점 요소를 활성화
hwtap() { tdown $1 $2; tup; sleep 1.2; }

# step 이름 명령… — 명령을 실행하고 화면을 캡처해 걸음 목록에 쌓는다. report 이름 — 초점 테두리 상자와 발화 글자 띠 모음(<이름>-speech.png)을 낸다.
# 발화 글자는 TalkBack 개발자 설정 「Display speech output」이 화면 아래에 그린다. 띠의 y 범위는 SY0~SY1(기본 1990~2250, Pixel_8 1080x2400 · 글꼴 1.0 — 다른 조건은 캡처로 읽는다)
STEPS=()
step() { local N=$1; shift; "$@"; shot "$N"; STEPS+=("$OUT/$N.png"); }
report() {
  python3 "$TOOLS/ring.py" "${STEPS[@]}"
  python3 "$TOOLS/montage.py" "$OUT/$1-speech.png" "${SY0:-1990}" "${SY1:-2250}" "${STEPS[@]}"
}
```
