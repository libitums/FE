# 스크롤 바 끄기 — 스크롤하는 동안 바가 보이지 않는가

모든 `<scroll-view>`가 `scroll-bar-enable={false}`를 갖게 한 변경(작업 `hide-scrollbars`)을 **기기에서 본다.** 손가락으로 끄는 **도중의 프레임**에서 시스템이 그린 스크롤 바가 없는지,
그러면서 스크롤이 그대로 되고 멈춘 화면의 레이아웃이 한 행도 달라지지 않았는지를 확인한다. 속성 값이 렌더되는지는 ui 테스트가, 소스의 모든 스크롤 요소가 그 값을 갖는지는
`pnpm lint:scroll-bars`가 진다. 이 문서는 **시스템이 실제로 그린 픽셀**만 진다 — Android는 세로 바만 이 프롭을 듣고 iOS는 소스로만 읽었기 때문에(계약 §2.3) 속성 단언으로는 증명되지 않는다.

항목 정본은 작업 `hide-scrollbars`의 test-plan `## e2e`(S1 ~ S5) · `## r02`(S3 수정, S6 ~ S9) · `## r03`(S7(f), S8(a)의 잡음 기준)이고, 근거 · 수치는 계약(`spec.md` §2.2 · §2.3 · §10, `## r02`, `## r03`)이다. 케이스의 최종 이름은 이 문서가 정본이다(계약 r03.4). 결정과 대가는 ADR-0055(documentation 단계가 신설)이 진다.
이 문서는 **절차**다.

**r02(2026-10-08)가 더한 것**: 피드백 화면과 학습 화면(답하기 전)의 스크롤 영역 **아랫변 위 40dp에 서는 흐림(fog)**, 그리고 학습 화면에서 스크롤 내용 끝에 서는 40dp 끝 상자. S1 ~ S5는 바가 안 그려지는지를 보는 r01의 케이스이고, S6 ~ S9와 S3의 수정은 이 fog를 본다 — 아래 「r02 — 아래 fog와 진입 직후의 바 (S6 ~ S9)」 절. **S6 ~ S9는 2026-10-09에 한 번 돌았고(아래 「실행 상태」), 그 실행이 제품 결함 하나(fog 상자가 터치를 삼킴)와 이 절차의 결함 7건을 찾았다. 결함은 `f7c25aa6`에서 고쳤고 이 문서의 절차도 고쳤다. 같은 날 재실행(r02b, `c1a1138c`)이 수정을 독립으로 확인했다(PASS) — 그 실행이 이 절차의 결함 5건을 더 찾아 고쳤다.**

## 실행 상태

**2026-10-08에 한 번 돌렸다.** 실행자 test-runner, 구현 뒤 = HEAD `723e3c99`(구현 `6992df0f` 포함 — 이후 커밋은 learning-item-guides의 무동작 스캐폴드와 이 문서뿐), 구현 전 = main `296e2eac`. 번들(모의 값) sha256: 구현 전 `0a1c34fb…8ce`, 구현 뒤 `46bc6dd0…989`(서로 다르다). Android는 emulator-5554(Pixel_8 API 37, 1080x2400) debug + androidTest(HEAD에서 gradle로 빌드 · 설치), iOS는 이 작업 전용 시뮬레이터(iPhone 17 Pro, iOS 26.5) · Debug Host · dev playground 번들(구현 뒤 3001 · 구현 전 3002)이다. 제품 결함은 0건이었고, 이 문서 · 도구의 결함 7건은 이 개정에서 고쳤다.

판정은 모두 「구현 전 번들에서 스크롤 중 `BAR` ↔ 같은 조건의 구현 뒤 번들에서 `none`」의 **대조**로만 섰다(아래 「바 판독 규칙」). 대조가 안 서는 화면은 `none`이어도 통과가 아니다.

| 항목 | 무엇 | 결과 |
|---|---|---|
| S1 | 스크롤 중 캡처에 스크롤 바가 없다 | **Android 통과 3곳** — 여정 맵(글꼴 1.0): 구현 전 `-a` **BAR 672px**(x1027, `#B0AFAE`; 재실행 619px) → HEAD `-a` `-b` none. 학습 화면(듣기 유닛, 글꼴 2.0): 구현 전 `-a` **BAR 137px**(x1027 y2043~2179) · 아래로 끌 때 214px → HEAD 6장 전부 none(스크롤은 됨). 피드백(설정 → Send feedback, 글꼴 2.0): 구현 전 `-a` **BAR 1637px**(x1035) → HEAD none(144px는 카드 테두리). **판정 불가 3곳** — 설정 · 프로필(글꼴 2.0에서도 안 넘침: rest 대비 0행), 롤플레이 목록 세로(안 넘침). **닿지 못함** — 알림(권한 대화상자 뒤는 앱 밖 시스템 설정 화면) |
| S2 | 스크롤이 그대로 된다 | **통과**(맵 · 학습 · 피드백 일부) — 맵: 구현 전 rest→위로 끌기 2035행 · HEAD 1974행 다름, 아래로 두 번 끌면 rest와 0행 차(양 번들). 학습: 위로 끌기 233행 다름, 아래로 끌면 rest와 0행(양 번들). 맵 유닛 탭 → 학습 화면이 섬(색 검출 탭). 피드백: 위로 끌기 1815행(양 번들) |
| S3 | 멈춘 화면의 레이아웃이 구현 전과 같다 | **r01 HEAD `723e3c99`에서 통과** — 맵(글꼴 1.0) · 학습 · 설정 · 피드백(글꼴 2.0)의 스크롤 전 멈춘 캡처, 구현 전 ↔ HEAD 다른 행 **0 / 2268** 넷. **r02에서 판정이 바뀌었다**: 맵 · 설정 같은 fog 없는 화면은 그대로 0이지만, 피드백 · 학습(답하기 전)은 아래 fog 때문에 **띠 구간이 달라지는 것이 정상**이다 — 이 둘은 「띠 밖 0」으로 다시 판정한다(아래 S3). **r02 첫 실행(`d3baf2c7`)에서 재판정 통과** — 피드백(2.0) 띠 밖 0행 · 띠 안 96행, 학습(2.0 듣기) 띠 밖 0행 · 띠 안 92행. 위 r01의 통과 넷 가운데 학습 · 피드백 둘은 r01 HEAD에 대한 결과다 |
| S6 | 진입 직후 연속 캡처 — 구현 전 `BAR`, 뒤 `none` | **r02b 재실행에서 after 다시 확인**(피드백 2.0, 8장 모두 none · settled none, 캡처 시각 ms 37 · 515 · 839 · 1192 · 1546 · 1980 · 2316 · 2701; before는 재실행하지 않았다). **r02 첫 실행 통과** — before: 탭 후 607 · 1006 · 1397ms 프레임에 `BAR`(x1034, y353~2060, 1708px, `#B0AFAE`), 1.97초 이후 none. after(`d3baf2c7`): 8장 + settled 전부 none. 이 케이스는 fog와 무관하다 |
| S7 | 피드백(글꼴 3.0)의 아래 fog — 케이스 **(a)** 멈춘 화면의 띠 안 · **(b)** 끝까지 내린 화면 · **(c)** 띠 안 탭 · **(d)** 띠 안에서 시작한 끌기 · **(f)** 자판이 올라온 상태(글꼴 1.0 · 2.0, 계약 r03이 더함). (e)는 없다 — (f)는 계약 r03의 이름 그대로다 | **(f)는 미실행이다**(아래 S7(f)). **(a)~(d)는 재실행 r02b(`c1a1138c`) PASS** — (c) 띠 안 탭 y2195 nofog 233행 · after 233행(눈으로 5 · Love it 선택), (d) 띠 안(y2200) 시작 끌기 nofog 1766행 · after 1816행, (a) 53행 전부 띠 안 · 띠 밖 0 · `FADE`, (b) 끝 화면 nofog↔after 0행. 아래 「r02b 재실행」. 이전 첫 실행: **FAIL(제품 결함)** — (a) 통과: 다른 행 2169~2221(53행)이 전부 띠 안, 띠 밖 0, `FADE`(`band`는 CHECK 짧다 — 내용이 y2221에서 끝나 그 아래가 빈 배경). (b) 통과: `Send`가 띠 위, 띠 `FLAT`, nofog↔after 끝 화면 0행. **(c) FAIL**: 다섯째 보기 y2175 · 2195 탭이 nofog는 선택(233행), after는 0행(2회 재현; 띠 위 y2100은 after도 선택). **(d) 띠 안 시작 끌기 FAIL**: y2200 시작 끌기가 nofog는 1821행 스크롤, after는 0행. 원인과 수정: 아래 「r02 첫 실행에서 찾은 결함」 |
| S8 | 학습 듣기(글꼴 2.2, 답하기 전)의 아래 fog — 케이스 **(a)** 멈춘 화면의 띠 안 · **(b)** 끝까지 내린 화면 · **(c)** 띠 안 탭(답 처리) · **(d)-1** 고른 직후(띠 밖 0) · **(d)-2** 액션 행 화면(전체 0) · **(e)** 띠 안에서 시작한 끌기 | **재실행 r02b(`c1a1138c`) PASS(주석 있음)** — (c) 띠 안 탭 y2200 nofog 996 / 1489행 · after 996 / 1489행, (e) 띠 안 시작 끌기 nofog 150행 · after 183행, (a) 같은 실행 쌍 띠 밖 0 · `FADE`(첫 drag 쌍의 32행 일탈은 일회성 캡처 잡음으로 읽음 — 원인 미확인), (d)-1 띠 밖 0, **(d)-2 액션 행 화면 nofog↔after 전체 0행(닿았다)**. 이전 첫 실행: **FAIL(제품 결함)** — (a) 통과: band 2169~2273(105px) OK, 띠 밖 0, `FADE`. (b) 통과(소견 있음): 마지막 보기 아랫 테두리 y2166, 띠 `FLAT`. **(c) FAIL**: Hello y2200 탭이 nofog는 답이 받아들여짐(996 · 1489행), after는 0 · 0행. **(e) 띠 안 시작 끌기 FAIL**: nofog 150행, after 0행. **(d) 판정 불가**: nofog는 답이 서고 after는 탭이 막혀 같은 지점이 안 나왔고, 액션 행 화면에는 닿지 못했다 |
| S9 | 기본 글꼴(1.0)에서 fog 전후 — 띠 밖 0, 띠 안 기록, **새로 생긴 스크롤** 여부 | **재실행 r02b에서 듣기 · 피드백 재측정 통과**(띠 밖 0 · 띠 안 0 · 끌림 0 · 이동 0px · back 0, 첫 실행 after rest와 0행). 문장 만들기 · 말하기 · 쓰기 · 단어 선택은 재실행 범위 밖. **r02 첫 실행에서 닿는 학습형 전부 통과** — 듣기 · 문장 만들기(조각 1 · 2) · 말하기 · 쓰기 · 피드백이 띠 밖 0 · 띠 안 0 · 새 스크롤 없음(이동 0px). 단 닿는 학습형은 내용이 y 1900 이하에서 끝나 띠에 닿지 않았다 — **단어 선택(보기 4) 등 내용이 띠에 닿는 문항은 못 봤다(미확인)**. 표: 아래 「실행 결과」. 정지 화면 비교라 터치 수정과 무관할 것으로 추론하나 재실행 때 다시 뜬다 |
| S4 | 가로 카드 줄에 가로 바가 없다 | **통과(바 없음)** — 롤플레이 가로 카드 줄 한 곳(글꼴 1.0), 2.5초 · 6초 끌기 중 구현 전 · HEAD 모두 가로 바가 눈으로 안 보임(가로 스크롤은 됨, 499행). 「계약 밖」 보고 해당 없음. 카드 줄은 하나만 화면에 있었다(둘 중 하나) |
| S5 | iOS 인디케이터 · 화면이 뜰 때 깜빡임 | **iOS 통과(playground 번들 · 시뮬레이터 한정)** — 4초 끌기 중 연속 24프레임: 구현 전 22프레임(f03~f24)에서 인디케이터(x≈1142~1147, 559~637px, `#C0C0C0`~`#D0CFCE`), HEAD **0프레임**, 스크롤은 됨(rest 대비 1824~2178행). 화면이 뜰 때의 깜빡임은 0.3초 간격 12장(구현 전 · 뒤)에서 안 찍힘 — **없다는 증거는 아니다**(간격이 깜빡임보다 길 수 있다) |

**미실행 · 미확인 · 도달 실패는 통과가 아니다.** 이 문서를 고칠 때는 이 표와 아래 「실행 결과」를 같은 날 함께 고친다.

**r02 첫 실행(2026-10-08 ~ 09)**: 실행자 test-runner, 절차 문서 HEAD `d3baf2c7`(실행 중 HEAD가 `d9add36f`로 움직였으나 learning-item-guides 문서 한 파일뿐 — 앱 소스 무관). 기기 emulator-5554 Pixel_8 API 37, 1080x2400, 420dpi. 번들(모의 값, 일회용 사본에서 빌드 · 서버 18790): before `296e2eac` `0a1c34fb…8ce` / nofog `5782bacd` `8ac1c4d2…492` / after `d3baf2c7` `2841a648…985`. 호스트 · 계측 APK는 기기에 이미 깔린 것(재빌드 안 함). 안내(learning-item-guides)는 저장 키 `libitum.libitum.learning-item-guides.seen`을 `pm clear` 직후 `run-as`로 심어 닫았다.

**첫 실행의 판정은 FAIL(제품 결함 1건)이다.** S3 · S6 · S7(a)(b) · S8(a)(b) · S9는 통과했고 S7(c)(d) · S8(c)(e)가 실패했다. 결함은 `f7c25aa6`(fog 상자 둘에서 `event-through`를 빼고 `user-interaction-enabled={false}`)로 고쳤으나 **이 수정의 근거는 처음에는 구현자의 기기 실측뿐이었고, 같은 날 이 절차를 따른 독립 재실행(r02b, 아래)이 같은 값으로 확인했다.** 띠 위치 y 2167~2272는 실측으로 맞았다(±2): 피드백 3.0 다른 행 2169~2221(내용 끝까지), 학습 2.2 2169~2273, 피드백 2.0 2178~2273, 학습 2.0 2182~2273. 아랫변 2273 = `bottom`이 맞다(16px 겹침 · 두 구간 없음). 「짧다」 75%는 내용이 띠 안에서 끝나는 화면에서 CHECK를 낸다(아래 「`band`가 CHECK(짧다)를 내는 정상 경우」).

**재실행 r02b(2026-10-09, `c1a1138c`) — PASS(수정 확인).** 실행자 test-runner. 터치 수정 `f7c25aa6`을 이 절차로 독립 확인했다: 띠 안 탭 · 끌기가 `nofog`와 같은 행 수로 먹는다(S7 · S8 표). 번들 `after`는 `c1a1138c`(sha `fb395062…c904`, 첫 실행 `2841a648…`와 다름), `nofog`는 `5782bacd`(sha `8ac1c4d2…492`, 첫 실행과 같음). 상세는 아래 「r02b 재실행」.

**TalkBack은 이 절차가 아니라 accessibility 단계가 봤다** — 작업 폴더(저장소 밖)의 `.agent-harness/work/hide-scrollbars/accessibility-r02.md` 「재실행 2」(2026-10-09, 번들 `fa3b261e`, emulator-5554, 학습 듣기 글꼴 2.2 · 피드백 글꼴 3.0, TalkBack 켬) [실측]. 네 물음이 닫혔다: fog 상자는 쓸기의 멈춤이 아니다 · `user-interaction-enabled={false}`는 터치 탐색과 두 번 탭을 막지 않는다(띠 안 y 2180 ~ 2250에서 보기에 초점 → 두 번 탭 → 답 처리 · 선택) · 쓸기로 화면 밖 보기에 가면 스크롤이 따라오고 초점 테두리는 fog 위에 온전하다 · 끝 상자는 낭독 순서에 끼지 않는다. **낭독 문구는 받지 못했다** — 초점 테두리의 자리와 캡처로 판정했다. 남은 것: TalkBack이 올린 초점 요소가 띠에 걸친다(N2), 쓸기 순서가 보이는 순서와 다르다(N1 — 이 작업이 만든 것인지 미확인). 결정 쪽 기록은 [ADR-0055](../adr/0055-scroll-bars-off.md)의 「확인한 것과 확인하지 못한 것」이다.

### 닿지 못했거나 안 돌린 것

- **판정 불가(안 넘침)**: 설정 · 프로필 · 롤플레이 목록 세로.
- **닿지 못함**: 알림(앱 밖 화면). 평가 · 젬 구매(제품에서 mount되지 않음) · 로그인 · 코드 검증은 이 픽스처로 안 닿아 보지 않았다.
- **r02에서 판정 불가 · 도달 실패**: S8(d) — 고른 직후의 띠 밖 비교는 nofog의 답이 서고 after의 탭이 막혀 같은 지점이 안 나왔고, 액션 행이 선 화면에는 닿지 못했다 — **r02b에서 닿았다**(듣기 유닛이 1문항이라 답한 뒤 4초에 「All questions done / See results」가 선다. nofog↔after 0행). iOS의 fog는 **미확인**이다 — 제품 경로(`main` 번들)로는 닿는 수단이 없고, dev playground 번들로는 학습 듣기에 닿지만 이 절차가 그 번들로 fog를 본 적은 없다(아래 「이 절차로 확인되지 않는 것」).
- **미실행**: S7(f)(피드백에서 자판이 올라온 상태 — 계약 r03이 더한 케이스), 피드백 화면에서 아래로 끌어 복귀하는 S2, 맵 · 학습 껍데기의 `enable-scroll` 잠금 상태(만들 수단이 없다), API 37 밖의 Android, iOS 실기, 제품 `main` 번들의 iOS 화면.

### 큰 글꼴 관찰 — 판정 아님(accessibility 단계의 입력)

글꼴을 키운 것은 내용을 넘치게 하려는 수단이었다. 그 상태의 레이아웃은 이 절차가 판정하지 않는다. 눈에 띈 것만 적는다.

- 학습 화면(듣기 유닛, 이 시드는 보기가 둘뿐이라 「넷째 보기」 상태는 못 만들었다): 1.3은 안 넘친다. **2.0**은 고정 카드 아래 보기 영역이 넘쳐 「Hello」가 위에서 잘리고 「Thank you」가 아래에서 잘린 채 보인다(rest 상태는 구현 전 · 뒤 같음). 보기 칸이 통째로 화면 밖인 경우는 못 봤다. 구현 뒤 스크롤은 되고 바는 없다.
- 설정 · 프로필: 2.0에서도 안 넘친다. 피드백: 2.0에서 5점 척도 보기 + 입력 + Send가 한 화면에 안 들어가 위가 잘린다(제목 아래 「1 · Not good」이 잘린 채 시작) — HEAD에서 바 없이 스크롤된다.


### 계약 단계의 관찰 — e2e 판정 아님

계약 단계(`spec.md` §2.2)가 같은 도구 · 같은 조작으로 **한 화면 · 한 기기**에서 잰 값이다. 이 문서의 절차를 따라 돌린 결과가 아니고 판정도 아니다. 이 문서의 도구가 이 캡처를 같은 값으로 읽는지는 부록의 selftest가 확인한다.

기기 `emulator-5554`(Pixel_8, API 37, 1080x2400, 420dpi, 글꼴 1.0, 야간 끔) · 기준 번들(`scroll-bar-enable={true}` 23곳, main `296e2eac`) · 변이 번들(23곳을 `{false}`로 — 작업의 구현과 같은 값) · 여정 맵 · `input swipe 540 1700 540 900 2500` 도중.

| 캡처 | 기준 번들 | 변이 번들 |
|---|---|---|
| 멈춤(스크롤 전) | none | none |
| 스크롤 중 1(끌기 시작 1.3초 뒤) | **BAR** — x 1027, y 285~956(672px), `#B0AFAE` | none |
| 스크롤 중 2(1.9초 뒤) | **BAR** — x 1027, y 361~1032(672px) | none |
| 멈춘 뒤(3초) | none | none |
| 반대 방향 스크롤 중 | — | none |

멈춤 캡처끼리 상태바 아래 2270행을 행 단위로 비교해 다른 행 0. 설정 탭 스크롤 중 한 장(변이)도 none이었으나 설정이 그 기기 · 글꼴에서 안 넘쳐 **기준 쪽 짝이 없다**(판정에 쓰지 않았다).

## 이 절차로 확인되지 않는 것

- **판정이 선 화면은 Android 세 곳(여정 맵 · 학습 화면 · 피드백)과 iOS playground 한 곳뿐이다.** 구현 전 `BAR`가 보인 화면만 구현 뒤 `none`을 읽을 수 있었다. 나머지 스크롤 영역(설정 · 프로필 · 롤플레이 세로는 안 넘쳐 판정 불가, 알림은 앱 밖 화면)은 **같은 요소 · 같은 속성**이라는 소스 근거와 정적 검사(`pnpm lint:scroll-bars`)에 기댄다. 제품에서 mount되지 않는 평가 · 젬 구매, 사용자가 닿지 않는 개발용 · 탐침 화면은 보지 않는다.
- **iOS 실기기**: 시뮬레이터까지다. iOS 인디케이터의 모양 · 굵기 · 지연은 실기에서 다를 수 있다. 시뮬레이터에서는 구현 전에 인디케이터가 보였으므로(24프레임 중 22) S5는 「미확인」이 아니지만, 위 한계 안의 PASS다.
- **제품 `main` 번들의 iOS 화면**: iOS에는 Android 같은 로그인 픽스처가 없다. S5는 dev 전용 playground 번들(`tutorial-journey`)로 같은 소스의 여정 맵을 본다 — 제품 `main` 번들 · 로그인 뒤 경로가 아니다(`android-status-bar-icons.md` S12 (c)와 같은 한계).
- **iOS에서 화면이 뜰 때의 깜빡임**: 0.3초 간격 12장에서 안 찍혔을 뿐이다. 깜빡임이 수백 ms면 간격 사이로 빠진다 — 없다는 증거가 아니다.
- **r02의 fog(S6 ~ S9)는 Android 에뮬레이터 한 대에서 두 번(첫 실행, 터치 수정 뒤 r02b) 돌았다.** 띠의 자리는 실측으로 맞았다. **단어 선택(보기 4) · 메신저 · 전화 · 비주얼 노벨 · 최종 테스트의 기본 글꼴 모습, S6 학습 진입 직후, 글꼴 2.35(O1), 추가 관찰 4(기본 글꼴에서 띠 좌표 y≈2200의 조작부를 탭)는 확인되지 않았다 — 닿은 1.0 화면(듣기 · 피드백)은 내용이 y~1820 이하에서 끝난다.** 기본 글꼴에서 새 스크롤은 닿은 학습형(듣기 · 문장 만들기 · 말하기 · 쓰기 · 피드백)에서 생기지 않았으나 **내용이 띠에 닿는 문항(보기 4 · 작은 화면)은 미확인**이다 — ADR-0022의 위험이 이 기기의 기본 글꼴에서 나타나지 않았다는 것까지다.
- **fog가 터치를 통과시키는지는 Android 에뮬레이터 한 대에서만 확인됐다.** ui 테스트는 속성의 존재만 본다 — 실제 통과는 S7(c)(d) · S8(c)(e)의 몫이고, 첫 실행 FAIL → 수정 뒤 r02b에서 nofog와 같은 행 수로 PASS. iOS는 같은 속성을 읽는 코드(`LynxUI.m shouldHitTest`)를 구현자가 읽었을 뿐 기기에서 못 봤다.
- **피드백에서 자판이 올라올 때의 fog는 미확인이다.** 자판이 화면 높이를 줄여 띠가 자판 바로 위로 올라오는지 자판 뒤에 남는지, 입력 중인 줄이 띠에 머물러 흐려지는지 보지 않았다. 케이스는 S7(f)로 정의돼 있고 **아직 돌리지 않았다.**
- **답한 뒤의 기존 `.learning-shell-fog`(`event-through={true}` 그대로)의 띠 안 탭은 재지 않았다.** 그 띠 안에서 시작한 끌기가 정상이었다는 것은 구현자의 관찰뿐이다. 같은 속성을 쓰는 다른 자리의 띠 안 탭도 이 절차가 보지 않는다.
- **iOS에서 fog는 미확인이다** — iOS에서 fog의 모습 · 띠 안 터치를 눈으로 본 적이 없다. 로그인 뒤 화면(피드백 · 학습 껍데기)에 닿는 수단은 **제품 경로(`main` 번들)로는** iOS에 없다(계약 r02.6-5). ⟨2026-10-09⟩ 계약 r03.10.1이 이 범위를 고쳤다 — dev playground 번들로는 학습 듣기(답하기 전, fog가 서는 화면)에 닿고, [성능 보고서](../performance/reports/hide-scrollbars-learning-listening-iphone-17-pro-simulator-01.md)가 그렇게 fog 상자 · 끝 상자가 서는 것을 요소 수로 쟀다. 측정이지 모습 확인이 아니다. 피드백은 playground 픽스처가 없어 그 번들로도 닿지 않는다. playground 번들의 여정 맵(S5)은 이 두 화면이 아니다. `Fog`가 iOS에서 그려진다는 근거는 출시된 다른 화면의 기존 fog뿐이다.
- **E1 상태에서 fog는 넘침 단서가 못 된다**(글꼴 2.35 이상, 2.0 + 밀도 540 — 보기 영역 높이 0). 그 상태에서 fog가 서 있거나 무대 카드 아래에 겹쳐 그려져도 「아래에 더 있다」는 단서가 아니다. S7 · S8의 통과를 「큰 글꼴에서 넘침이 알려진다」로 읽지 않는다 — 통과는 2.2(학습) · 3.0(피드백)이라는 **그 조건에서 띠에 걸리는 내용이 흐려졌다**까지이고, 띠에 내용이 안 걸리는 조합(계약 r02.6-2)과 진입 때의 바보다 단서가 약하다는 것(r02.6-1)은 그대로다. ⟨2026-10-09⟩ **그 상태는 작업 `learning-shell-large-font` 뒤의 번들에서는 없다** — 작업 영역이 96dp 미만이면 지시문 · 무대 · 작업 영역이 한 스크롤로 합쳐진다([ADR-0022](../adr/0022-scroll-regions-and-fixed-affordances.md) D1-2의 갈래). 이 절차의 기록은 그 전 번들의 것이다. 합친 흐름의 띠는 [학습 껍데기 큰 글꼴 절차](learning-shell-large-font.md)가 본다.
- **API 37 밖의 Android**: 한 기기 · 한 API만 본다. `setVerticalScrollBarEnabled(false)`는 플랫폼 수준과 무관한 뷰 속성이라는 소스 근거(계약 M5)뿐이다.
- **스크린 리더의 스크롤**(계약 I4): 이 절차는 TalkBack을 끄고 돈다. fog 상자 · 끝 상자와 TalkBack의 관계는 accessibility 재실행 2가 봤다(위 「실행 상태」) — 낭독 문구 자체, iOS VoiceOver는 거기서도 보지 않았다.
- **넘침 단서가 충분한가**: 큰 글꼴에서 넷째 보기가 화면 밖에 있는 학습 화면, 코드 검증 · 로그인 · 피드백의 약한 단서는 이 절차의 판정이 아니다. design.md §2.6 · §4와 accessibility 단계가 본다. 이 문서가 글꼴을 키우는 것은 **내용을 넘치게 하려는 수단**일 뿐이고, 그 상태의 레이아웃을 판정하지 않는다.
- **끄는 동안의 위치 · 길이 표시가 사라지는 것 자체**: 의도한 변경이다. 이 절차는 사라졌다는 것만 본다.
- **Android의 가로 바**: 프롭이 안쪽 가로 뷰에 닿지 않는다(계약 §2.3). 롤플레이 카드 줄 한 곳에서 구현 전 · 뒤 모두 안 보였다(S4). 카드 줄 둘 가운데 하나만 화면에 있어 그것만 봤고, `barscan`은 가로 바를 못 읽어 눈으로만 봤다.
- **스크롤 도중 프레임의 우연**: 바는 스크롤을 멈추면 사라지므로 캡처 시각이 어긋나면 `none`이 나올 수 있다(실제로 맵 구현 전 `-b`는 끌기 끝 근처라 none이었다). 그래서 **구현 전 번들에서 `BAR`가 나오는 같은 절차**를 먼저 보이고, 그 절차로만 구현 뒤의 `none`을 읽는다. 구현 전에 `BAR`가 안 나오는 환경의 `none`은 통과가 아니라 **판정 불가**다.
- **`barscan.py`의 한계**: 절대 기준이 아니다. 길이 기준(200 · 100px)과 x 범위는 이 기기 · 이 화면에서 잰 값이고 「바 판독 규칙」의 표에 화면별로 적혀 있다. 짧은 바(학습 화면 137px)를 잡으려고 기준을 낮추면 카드 테두리(144px) · 어두운 오버레이 · iOS 검은 시작 화면이 거짓 `BAR`가 된다 — 그래서 **구현 전 `BAR` ↔ 같은 조건 HEAD `none`의 대조로만** 쓰고, `BAR`가 나온 캡처는 눈으로 확인한다. 옅은 바(밝은 배경에 매우 연한 회색)는 `none`으로 읽힌다 — 어두운 화면에서는 쓰지 않는다. y 범위가 260~2180이라 그 아래로 이어지는 바는 잘린 길이가 나온다(학습 화면의 137px는 y2179에서 끊긴 하한이다). 가로 바는 읽지 못한다(S4는 눈으로).

## 전제

### 기기 · 빌드

- Android: **에뮬레이터 한 대**. API 37 Pixel_8(1080x2400, 420dpi). 다른 작업이 같은 에뮬레이터를 쓰고 있지 않은지 먼저 확인한다 — 이 절차는 글꼴 배율을 바꾸고 앱 데이터를 지운다.
- iOS: iPhone 17 Pro 시뮬레이터 한 대, 이 작업 전용으로 새로 만든 것(다른 세션의 시뮬레이터를 쓰지 않는다).
- **3000 포트는 쓰지도 건드리지도 않는다.** 다른 워크트리의 개발 서버일 수 있다. 번들 서버는 Android가 **18790**, iOS dev 서버는 3000이 점유돼 있어 자동으로 올라간 포트(2026-10-08에는 3001 · 3002)다 — S5에서 로그로 읽는다.
- 모의 값으로 번들을 만든다 — 실제 서버 주소가 번들에 들어가지 않게.

```sh
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
ID="<adb devices 가 보여 준 에뮬레이터 ID>"
A() { adb -s "$ID" "$@"; }     # 함수다 — `A shell …`. 문자열 변수(A="adb -s …"; $A)는 zsh에서 깨진다
A shell getprop ro.build.version.sdk      # 37
PKG=libitum.duru.android
```

**구현 전 · 구현 뒤 번들을 둘 다 만든다.** 구현 뒤는 이 작업의 HEAD, 구현 전은 main `296e2eac`(또는 `7c5a79da` — 둘 다 소스에 `scroll-bar-enable={true}` 22곳이 그대로다). 구현 전은 임시 워크트리에서 짓는다.

```sh
WORK="<절대 경로 — 증거 폴더>"; mkdir -p "$WORK/bundles"
export PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test

# 구현 뒤(지금 워크트리의 HEAD)
git rev-parse --short HEAD
pnpm --filter @libitums/ui-lynx build && pnpm --filter @libitums/mobile build
rm -rf "$WORK/bundles/after" && cp -R apps/mobile/dist "$WORK/bundles/after"

# 구현 전(main 296e2eac) — 임시 워크트리. 의존성이 없으면 pnpm install 먼저
git worktree add "$WORK/before-src" 296e2eac
( cd "$WORK/before-src" && pnpm install --frozen-lockfile \
  && pnpm --filter @libitums/ui-lynx build && pnpm --filter @libitums/mobile build )
rm -rf "$WORK/bundles/before" && cp -R "$WORK/before-src/apps/mobile/dist" "$WORK/bundles/before"
git worktree remove --force "$WORK/before-src"

shasum -a 256 "$WORK/bundles/before/main.lynx.bundle" "$WORK/bundles/after/main.lynx.bundle"   # 둘이 달라야 한다
```

**r02(S3 · S6 ~ S9)는 번들이 셋이다.** 위의 `before`(구현 전, `296e2eac` — 스크롤 바 켜짐)와 `after`(구현 뒤, **r02의 fog가 들어간 HEAD** — r01 실행의 `after`는 `723e3c99`였으므로 **다시 만든다**)에, 가운데 **`nofog`**(바는 꺼졌고 fog는 없는 마지막 커밋)를 더한다. `nofog`는 `5782bacd`(r02 스캐폴드 바로 앞 — `38fddfc1`에 학습 안내 절차 문서 한 파일만 더한 커밋이라 앱 소스는 `38fddfc1`과 같다)로 짓는다. test-plan은 `38fddfc1`이라 적었고 소스가 같아 어느 쪽이든 된다.

```sh
git worktree add "$WORK/nofog-src" 5782bacd
( cd "$WORK/nofog-src" && pnpm install --frozen-lockfile \
  && pnpm --filter @libitums/ui-lynx build && pnpm --filter @libitums/mobile build )
rm -rf "$WORK/bundles/nofog" && cp -R "$WORK/nofog-src/apps/mobile/dist" "$WORK/bundles/nofog"
git worktree remove --force "$WORK/nofog-src"
shasum -a 256 "$WORK/bundles"/{before,nofog,after}/main.lynx.bundle      # 셋이 모두 달라야 한다
curl -sI http://localhost:18790/nofog/main.lynx.bundle | head -1
```

케이스마다 무엇과 비교하는지:

| 케이스 | 비교 | 왜 이 둘인가 |
|---|---|---|
| S3 (학습 · 피드백) | `before`(`296e2eac`) ↔ `after` | r01의 S3와 같은 기준. 차이가 **띠 안에만** 있어야 한다 |
| S6 | `before` ↔ `after` | 진입 직후의 바는 `before`에만 있다(`nofog`는 바가 꺼져 있어 `none`) |
| S7 · S8 · S9 | `nofog` ↔ `after` | 둘의 차이가 **fog 하나**(학습은 끝 상자 포함)다. `before`와 비교하면 바 · 학습 안내(`learning-item-guides`)가 섞인다 |
| S9의 안내 없는 종류(듣기 · 피드백) 보조 | `before` | `nofog`가 구현 전과 레이아웃이 같다는 가정을 한 번 점검 |

**`pnpm verify`를 돌린 뒤에는 위 번들을 다시 만든다** — `pnpm verify`가 `apps/mobile/dist`를 모의 값 없는 번들로 덮어쓴다(그 번들로 픽스처가 `signed-in journey screen did not render`로 실패한 적이 있다 — `android-orientation.md`). 복사해 둔 `$WORK/bundles/*`는 영향이 없다.

debug APK + 계측 APK(호스트 · 번들 둘 다 같은 커밋 — 이번 변경은 번들뿐이라 기존에 깔린 같은 커밋의 APK를 재사용해도 된다. **설치한 APK의 커밋을 실행 결과에 적는다**):

```sh
( cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest )
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

번들 서버 — 구현 전 · 뒤 폴더를 한 서버가 준다. 호스트 쪽에서 둘 다 200이어야 한다.

```sh
python3 -m http.server 18790 --bind 0.0.0.0 --directory "$WORK/bundles" >"$WORK/bundle-server.log" 2>&1 &
BSERVER=$!
curl -sI http://localhost:18790/before/main.lynx.bundle | head -1
curl -sI http://localhost:18790/after/main.lynx.bundle | head -1
```

**서버 루트의 `static` 링크**(r02b): 번들이 자산 폴더(`static/`)를 참조하면 서버 루트에 `static` 링크가 필요하다. 링크는 **지금 쓰는 번들의 `static`** 을 가리킨다 — `nofog`와 `after`는 자산 해시 파일 이름이 같아 어느 쪽을 가리켜도 영향이 없어 보이나 확인한 것은 아니다. 링크가 어느 번들을 가리키는지 실행 결과에 적고, 번들마다 자산이 다르면(해시가 다르면) 번들 폴더 안에 자기 `static`을 두거나 번들마다 서버를 따로 띄운다.

```sh
ln -sfn "$WORK/bundles/after/static" "$WORK/bundles/static"          # 어느 번들의 static인지 기록한다
ls "$WORK/bundles/after/static" | diff - <(ls "$WORK/bundles/nofog/static") && echo "자산 이름 같음"
```

**스크립트 경로는 절대 경로에 묶지 않는다**(r02b): 이 문서의 함수 묶음은 `OUT`(캡처 폴더)과 도구 위치(`$OUT/barscan.py` 등)를 변수로만 쓴다. 이 함수들을 파일(`lib.sh`)로 저장해 `run_*.sh`에서 부를 때는 `. "$(dirname "$0")/lib.sh"`처럼 **스크립트 자신의 위치 기준**으로 읽고, `OUT`은 `export OUT=…`로 호출 전에 준다. 실행 폴더의 절대 경로를 스크립트 안에 쓰면 폴더를 옮긴 재실행마다 `sed`가 필요하다(r02b가 겪었다).

에뮬레이터 안에서 호스트 PC는 `10.0.2.2`다. 번들 주소는 `http://10.0.2.2:18790/before/main.lynx.bundle` · `…/after/main.lynx.bundle`.

### 시작 전 전역 설정 — 기록하고, 끝에 되돌린다

이 절차가 바꾸는 전역 설정은 **글꼴 배율 하나**다 — S1 · S2의 학습 · 피드백은 2.0, r02는 S6 2.0 · S7 **3.0** · S8 **2.2** · S9 1.0, 관찰 한 장은 2.35. 화면 크기(`wm size` · `wm density`)는 바꾸지 않는다. 시작 전 값을 파일에 남기고 **마지막 케이스 뒤에 반드시 원래 값으로 되돌린다.** 케이스 사이에 배율을 바꾸다 중간에 멈추면 3.0이 남아 다른 작업의 캡처를 망친다 — 그래서 아래 `fontscale_restore`를 케이스마다 쓰고 끝에 `diff`가 0이어야 한다.

```sh
OUT="$WORK/e2e"; mkdir -p "$OUT"
globals() {
  echo "sdk: $(A shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "night: $(A shell cmd uimode night | tr -d '\r')"
  echo "size: $(A shell wm size | tr -d '\r' | tr '\n' ' ')"
  echo "density: $(A shell wm density | tr -d '\r' | tr '\n' ' ')"
  for K in font_scale accelerometer_rotation user_rotation; do echo "$K: $(A shell settings get system $K | tr -d '\r')"; done
  echo "navigation_mode: $(A shell settings get secure navigation_mode | tr -d '\r')"
  echo "talkback: $(A shell settings get secure enabled_accessibility_services | tr -d '\r')"
}
globals | tee "$OUT/globals-before.txt"
```

| 설정 | 시작 전에 이 값이어야 한다 | 아니면 |
|---|---|---|
| `night` | `Night mode: no` | `A shell cmd uimode night no` — 야간 모드는 배경을 어둡게 해 `barscan`이 못 읽는다 |
| `size` · `density` | 재정의 없음(`Physical …` 한 줄) | `A shell wm size reset` · `A shell wm density reset` |
| `font_scale` | `1.0` — 기록해 둔다 | `A shell settings put system font_scale 1.0` |
| `talkback` | 비어 있음(`null`) | 끈다 — TalkBack이 켜져 있으면 끌기가 접근성 제스처로 가로채인다 |

끝에서:

```sh
# 글꼴 배율만 원래 값으로 — 케이스가 끝나거나 중간에 멈출 때마다 부른다
fontscale_restore() { A shell settings put system font_scale "$(grep '^font_scale:' "$OUT/globals-before.txt" | awk '{print $2}')"; sleep 2; }
fontscale_restore
globals > "$OUT/globals-after.txt"; diff "$OUT/globals-before.txt" "$OUT/globals-after.txt" && echo "전역 설정 diff 0"
kill "$BSERVER"
```

### 도구 — 캡처 · 픽스처 · 끌기

`barscan.py` · `orange.py` · (r02) `fogband.py`는 부록의 코드 블록을 `$OUT/barscan.py` · `$OUT/orange.py` · `$OUT/fogband.py`로 저장해 쓴다(`fogband.py`는 `barscan.py`와 같은 폴더여야 한다). 아래 함수는 한 셸에 정의한다(zsh에서도 돈다).

```sh
shot() { A exec-out screencap -p > "$OUT/$1.png"; }
# 노드 이름이 나올 때까지 기다린다: waitre '정규식' [초]. 못 찾으면 1
# 네이티브 요소(탭 바 · 시스템 화면)만 uiautomator 트리에 있다. Lynx가 그린 내용(맵 · 학습 · 설정 목록)은 트리에 없어 못 기다린다 — 아래 「Lynx 화면은 색으로 찾는다」.
waitre() {
  local N=${2:-20} I=0
  while [ "$I" -lt "$N" ]; do
    A shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
    A shell cat /sdcard/ui.xml | tr -d '\r' | grep -qE "(content-desc|text)=\"($1)" && return 0
    sleep 1; I=$((I + 1))
  done
  echo "기다린 노드가 안 나왔다: $1"; return 1
}
# 계측 픽스처(로그인 뒤 화면) — 새 상태로 시작해 6초 뒤부터 탭 바가 보일 때까지 기다린다(스플래시 대기). **약 180초 뒤 끝난다.**
# fixture before|after [-e 옵션 true …]
fixture() {
  local WHICH=$1; shift
  A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null; sleep 1
  A shell pm clear "$PKG" >/dev/null
  A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest "$@" \
    -e bundleUrl "http://10.0.2.2:18790/$WHICH/main.lynx.bundle" \
    "$PKG.test/androidx.test.runner.AndroidJUnitRunner" >"$OUT/fixture-$WHICH.log" 2>&1 &
  # 계측이 앱을 띄울 때까지 먼저 기다린다 — 바로 waitre하면 이전 화면(스플래시 · 맵)에 맞아 앱이 서기 전에 진행된다(r02 첫 실행)
  sleep 6
  waitre 'Journey, selected|Tap to start your lesson' 40 || return 1
  sleep 3                      # 스플래시가 끝나고 탭 바가 자리 잡을 때까지
}
fixture_stop() { A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null; }
```

**스크롤 중 캡처를 뜨는 방법**: 끌기를 **2.5초에 걸쳐** 걸고(`input swipe … 2500`), 그것을 백그라운드에 둔 채 **끌기 시작 1.3초 · 1.9초 뒤**에 `screencap`을 한다. 바는 손가락이 움직이는 동안만 떠 있다가 멈추면 사라지므로, 끌기가 짧으면(수백 ms) 캡처가 끝난 뒤를 찍는다. 2026-10-08 실행에서 이 규칙으로 Android 세 화면의 구현 전 `BAR`가 잡혔다(`-a`에서 잡히고 `-b`는 끌기 끝 근처라 놓칠 수 있다 — 둘 다 뜬다).

```sh
# swipecap 이름 x1 y1 x2 y2 [끌기 ms]  -> $OUT/<이름>-a.png (1.3초 뒤) · <이름>-b.png (1.9초 뒤) · <이름>-after.png (멈춘 뒤)
swipecap() {
  A shell input swipe "$2" "$3" "$4" "$5" "${6:-2500}" &
  local SW=$!
  sleep 1.3; shot "$1-a"
  sleep 0.6; shot "$1-b"
  wait "$SW"
  sleep 3                      # 끌기가 끝난 뒤 멈추게 둔다(바가 사라진다)
  shot "$1-after"
}
# 끌기 좌표. 스크롤 영역이 화면 전체인 화면(여정 맵 · 피드백)은 UP · DOWN.
# **학습 화면은 스크롤 영역이 고정 카드 아래(보기 칸, y≈2000부터)뿐이다.** 시작점이 y=1700이면 고정 카드 위라 스크롤이 안 돼 「안 넘친다」로 잘못 읽는다 — LUP · LDOWN을 쓴다.
# ⟨2026-10-09⟩ learning-shell-large-font 뒤의 번들에서 작업 영역이 96dp 미만인 상태(Pixel_8 글꼴 2.2 이상)는 합친 흐름이라
# 카드 위를 포함해 화면 어디서 끌어도 스크롤한다. 위 서술과 LUP · LDOWN은 그 전 번들(이 절차를 닫은 번들)의 것이다.
UP="540 1700 540 900"; DOWN="540 900 540 1700"
LUP="540 2000 540 600"; LDOWN="540 2000 540 2270"
```

### Lynx 화면은 색으로 찾는다 — 학습 화면 · 설정 목록에 들어가는 법

Lynx가 그린 내용(맵의 유닛 · 학습 화면 · 설정 목록)은 uiautomator 트리에 없어 `waitre`로 기다리거나 노드를 찾을 수 없다. 하드코딩한 좌표(옛 `540 1858` · `540 1934`)도 맵의 스크롤 위치(관성)가 실행마다 달라 틀린다. 대신 **캡처에서 주황색(`#F46B18`, 유닛 원 · Start 버튼)의 중심을 읽어 탭**한다(`orange.py`, 부록). 또 **픽스처가 약 180초 뒤 끝나므로 진입 · 캡처를 한 호출 안에서 끝낸다** — 끝난 뒤의 캡처는 런처 · 알림창이라 폐기한다(실제로 한 번 겪었다).

```sh
# learning before|after — 글꼴 2.0으로 **시작하기 전에**(font_scale 2.0) 부른다. 듣기 유닛의 학습 화면으로 들어가
# 멈춘 캡처 · 위로 끌기 · 아래로 끌기를 한 호출에서 뜨고 S1 · S2 · S3 판독까지 건다.
learning() {
  local W=$1 C=none K=0 S
  fixture_stop; sleep 1; fixture "$W" -e audioProgress true || return 1
  sleep 3
  while [ "$C" = none ] && [ "$K" -lt 5 ]; do          # 맵을 위로 밀며 주황 유닛 원이 보일 때까지
    A shell input swipe 540 1700 540 700 600; sleep 3; shot "nav-$W-1"
    C=$(python3 "$OUT/orange.py" "$OUT/nav-$W-1.png" 440 640 300 2200); K=$((K + 1))
  done
  echo "circle: $C (swipes $K)"; [ "$C" = none ] && return 1
  A shell input tap $(echo $C | cut -d' ' -f1,2); sleep 3; shot "nav-$W-2"
  S=$(python3 "$OUT/orange.py" "$OUT/nav-$W-2.png" 260 820 1800 2400); echo "start: $S"; [ "$S" = none ] && return 1
  A shell input tap $(echo $S | cut -d' ' -f1,2); sleep 5
  shot "S3-learning-$W-rest"
  swipecap "S1-learning-$W" $LUP 2500
  python3 "$OUT/barscan.py" diff "$OUT/S3-learning-$W-rest.png" "$OUT/S1-learning-$W-after.png"          # 다르면(1) 넘친다 · 스크롤됐다
  swipecap "S1-learning-$W-down" $LDOWN 2500
  python3 "$OUT/barscan.py" diff "$OUT/S3-learning-$W-rest.png" "$OUT/S1-learning-$W-down-after.png"     # 0이면 원위치로 돌아왔다
  BARSCAN_X1=1033 BARSCAN_MIN=100 python3 "$OUT/barscan.py" scan "$OUT"/S3-learning-$W-rest.png "$OUT"/S1-learning-$W-*.png
}
# screen before|after 이름 탭x 탭y — 설정 탭 → 항목. 피드백: screen before feedback 360 1012 (Send feedback),
# 프로필 576 628 · 알림 576 820 · 설정 목록 자체는 항목 탭 없이 설정 탭만(좌표는 1080x2400 · 설정 탭 792 2306).
screen() {
  local W=$1 L=$2
  fixture_stop; sleep 1; fixture "$W" || return 1
  sleep 3; A shell input tap 792 2306; sleep 3; A shell input tap "$3" "$4"; sleep 4
  shot "S3-$L-$W-rest"
  swipecap "S1-$L-$W" $UP 2500
  echo -n "rest vs after-drag: "; python3 "$OUT/barscan.py" diff "$OUT/S3-$L-$W-rest.png" "$OUT/S1-$L-$W-after.png"
  python3 "$OUT/barscan.py" scan "$OUT/S1-$L-$W-a.png" "$OUT/S1-$L-$W-b.png"
}
```

> 위 함수 묶음은 2026-10-08에 에뮬레이터에서 돌린 것(실행 쪽이 고쳐 쓴 `lib.sh`)을 옮긴 것이다. 이 문서를 고친 단계는 기기를 쓰지 않았고 `bash -n` · `zsh -n`으로만 확인했다. 좌표는 Pixel_8 1080x2400 · 글꼴 2.0 기준이다 — 다른 해상도 · 시드는 캡처로 다시 읽는다. `screencap` 대신 `screenrecord`로 프레임을 뽑는 길은 쓰지 않았다.

### 바 판독 규칙 — 화면별 설정과, 대조로만 판정한다는 것

`barscan.py scan`은 환경변수 세 개로 읽는 방식을 바꾼다: `BARSCAN_X0`(기본 1000 — 검사할 첫 열) · `BARSCAN_X1`(기본 캡처 폭 — 이 열부터는 **제외**) · `BARSCAN_MIN`(기본 200 — `BAR`로 읽는 최소 길이 px). y 범위는 260~2180으로 고정이다. **아래 표가 2026-10-08 실행이 쓴 값이다.** 같은 화면 · 같은 조건이면 이 값으로 같은 판독이 나온다(저장 캡처로 확인 — 부록 selftest).

| 화면 · 캡처 크기 | `BARSCAN_X0` | `BARSCAN_X1` | `BARSCAN_MIN` | 진짜 바(구현 전) | 이 값을 쓰는 이유 |
|---|---|---|---|---|---|
| Android 여정 맵 · 1080x2400 | 1000 | 비움(폭 끝) | 200 | 672px(재실행 619px) x1027 `#B0AFAE` | 바가 길다. 기본값 |
| Android 학습 화면(글꼴 2.0) | 1000 | **1033** | **100** | 137px(하향 끌기 214px) x1027 y2043~2179 | 스크롤 영역이 아래 보기 칸뿐이라 바가 짧다. 200이면 놓친다. X1 1033은 오른쪽 가장자리 카드 테두리(x1035)를 뺀다 |
| Android 피드백(글꼴 2.0) | 1000 | 비움 | 200 | 1637px x1035 `#B0AFAE` | 카드 테두리가 같은 열(x1035)에 144px로 있다. x 범위로 못 가르니 길이로 거른다 — 100으로 낮추면 거짓 `BAR` |
| iOS 시뮬레이터 · 1206x2622 | 1000 | 비움 | 200 | 559~637px x≈1142~1147 `#C0C0C0`~`#D0CFCE` | 기본값으로 읽혔다 |

```sh
BARSCAN_X1=1033 BARSCAN_MIN=100 python3 "$OUT/barscan.py" scan "$OUT"/S1-learning-before-a.png     # 학습 화면
python3 "$OUT/barscan.py" scan "$OUT"/S1-map-before-a.png "$OUT"/S1-feedback-before-a.png         # 맵 · 피드백 · iOS는 기본값
```

**판정 규칙 — 절대 기준이 아니다.**

1. **대조로만 판정한다.** 같은 화면 · 같은 조작 · 같은 설정값(위 표)으로 ① 구현 전 번들의 스크롤 중 캡처에 `BAR`가 나오고(그리고 **눈으로도 바가 보이고**) ② 같은 조건의 HEAD 캡처가 **전부** `none`이면 그 화면은 통과다. ①이 안 서면 ②는 판정 불가다. 200px · 100px라는 숫자는 이 화면 · 이 기기에서 구현 전 바를 잡은 값일 뿐이고, 다른 화면에 옮기지 않는다.
2. **새 화면은 먼저 구현 전 캡처에서 바를 눈으로 찾아 길이 · x · 색을 잰 뒤**(기본값으로 한 번 scan해 보고, 눈에 보이는 바보다 짧게 읽히면 `BARSCAN_MIN`을 그 길이 아래로) 표에 한 줄을 더하고 같은 값으로 HEAD를 읽는다. 값을 HEAD 캡처를 보고 맞추지 않는다.
3. **거짓 `BAR`의 알려진 원인** — `BAR`가 나온 캡처는 전부 열어 아래 중 하나인지 본다. 해당하면 `none`으로 센다(사유를 적는다).
   - **전체 높이(1920px) 면**: 권한 대화상자의 어두운 오버레이(Android 알림 화면 뒤, x1010 `#666565`, 1920px), iOS 앱이 뜰 때의 검은 시작 화면(`#000000`, 1920px; 첫 프레임은 1007px · 211px의 부분 어두운 면). `scan` 출력이 「전체 높이」를 표시한다.
   - **카드 테두리**: 피드백 화면의 오른쪽 가장자리 144px, x1035 `#CBC9C9`. 진짜 바(`#B0AFAE`, 1637px)와 같은 열이라 색 · 길이로만 구분된다. `BARSCAN_MIN`을 100으로 내렸을 때만 걸린다.
   - 그 밖에 오른쪽 가장자리까지 닿는 어두운 세로 면(어두운 카드 · 어두운 모드).
4. **눈으로 확인하는 단계**: `BAR`가 나온 캡처 전부(구현 전 · 뒤)와, 구현 전인데 `none`이 나온 스크롤 중 캡처 한 장 이상을 연다. 진짜 바는 오른쪽 가장자리의 가늘고 긴 막대이고 프레임마다 위치가 움직인다. 눈에는 바가 보이는데 `none`이면(기준이 높아 놓친 것 — 학습 화면에서 200px 기준이 그랬다) 눈의 판독을 적고 길이를 재서 표를 고친다.
5. 구현 뒤는 스크롤 중 캡처 **전부** `none`이고, 그 화면이 **넘치는 것**(`rest`와 끌기 뒤 캡처의 다른 행 > 0)이 확인돼야 한다. 멈춘 캡처(`-rest` · `-after`)는 구현 전 · 뒤 모두 `none`이다(바는 멈추면 사라진다).

2026-10-08 실행의 화면별 판독(저장 캡처를 이 규칙으로 다시 읽은 값 — selftest가 같은 값을 확인한다):

| 화면 | 구현 전 | HEAD | 거른 거짓 `BAR` · 놓친 것 |
|---|---|---|---|
| 여정 맵 | `-a` BAR 672px · 재실행 `-a` 619px, `-b` none(끌기 끝 근처) | `-a` `-b` none | — |
| 학습 화면 | `-a` BAR 137px · 하향 `-a` 214px(`-b` · 하향 `-b` none) | 6장 전부 none | 200px 기준은 137 · 214px를 놓친다(D1) |
| 피드백 | `-a` BAR 1637px, `-b` none | `-a` `-b` none | 144px = 카드 테두리(기준 100에서만 BAR로 읽힘, 거짓) |
| iOS 연속 24프레임 | f03~f24 22장 BAR(559~637px), f01 · f02 none | 24프레임 none | 시작 화면 f02~f05 1920px(전체 높이) 거짓 BAR — 연속 캡처는 앱을 띄운 뒤 시작 지연 뒤라 해당 없음 |
| 알림(앞 대화상자) | 판정 대상 아님 | — | 1920px 오버레이 거짓 BAR |

### 넘치는지 먼저 확인한다

스크롤 바 판정은 **내용이 실제로 넘치는 화면**에서만 의미가 있다(안 넘치면 끌어도 바가 안 뜬다 — `none`이 공허하다). 화면마다 판정 전에:

```sh
overflow_check() {      # 이름 [x1 y1 x2 y2] — 멈춘 캡처 → 끌기 → 멈춘 캡처, 다르면 넘친다. 좌표를 안 주면 $UP. 학습 화면은 $LUP(시작점이 스크롤 영역 안이어야 한다)
  local NAME=$1; shift
  [ $# -eq 4 ] || set -- 540 1700 540 900
  shot "$NAME-rest"; A shell input swipe "$1" "$2" "$3" "$4" 600; sleep 3; shot "$NAME-settled"
  python3 "$OUT/barscan.py" diff "$OUT/$NAME-rest.png" "$OUT/$NAME-settled.png" && echo "$NAME: 안 넘친다 → 판정에서 뺀다(글꼴을 키운다)" || echo "$NAME: 넘친다"
}
```

안 넘치면 그 화면은 판정에서 빼거나 글꼴 배율을 올려 다시 시작한다(`A shell settings put system font_scale 2.0` — **픽스처를 시작하기 전에** 바꾼다. 화면이 켜진 채 바꾸면 Activity가 재생성된다). 2026-10-08 Pixel_8에서: **여정 맵(유닛 13개)은 글꼴 1.0에서 넘친다. 학습 화면은 2.0에서 넘친다**(1.3은 안 넘침 — 기본 배율에서 안 넘치게 짠 것이 설계다, ADR-0022 D1-2). **피드백은 2.0에서 넘친다. 설정 · 프로필은 2.0에서도 안 넘친다**(rest 대비 0행) — 판정 화면으로 쓸 수 없다. 알림은 앱 안 화면이 아니라 시스템 설정으로 나간다. 롤플레이 목록은 세로로 안 넘친다.

## 항목

### S1 — 스크롤 중 캡처에 스크롤 바가 없다 (AC4)

- **기기 · 빌드**: Android 에뮬레이터 API 37 · debug + 픽스처. 번들 `before`(구현 전)와 `after`(구현 뒤).
- **판정 화면**(2026-10-08 정정): 글꼴을 올려도 **설정 · 프로필은 안 넘친다.** 판정 화면은 **여정 맵(글꼴 1.0) · 학습 화면(글꼴 2.0) · 피드백(글꼴 2.0)** 이다. 알림은 앱 안 화면이 아니라 시스템 설정으로 나가 닿지 못한다. 판독 설정은 「바 판독 규칙」의 화면별 표를 따른다.
- **조작 · 캡처**
  1. **구현 전(red) 먼저**: `fixture before` → 여정 맵(글꼴 1.0)에서 `overflow_check map` → `swipecap S1-map-before $UP`. 구현 전 번들에서 **`BAR`**가 나오는지 본다 — 2026-10-08에는 672px(재실행 619px), x1027, `#B0AFAE`.
  2. **구현 뒤**: `fixture_stop` → `fixture after` → `swipecap S1-map-after $UP`.
  3. **화면 둘을 더**(구현 전 · 뒤 각각, 매번 새로 시작한다). 둘 다 **글꼴 2.0으로 픽스처를 시작하기 전에** 올린다(`A shell settings put system font_scale 2.0`):
     - **학습 화면**: `learning before` · `learning after` — 한 호출이 진입(색 검출 탭) · 멈춘 캡처 · 끌기 · 판독을 끝낸다(픽스처 180초 제한). 끌기 시작점은 스크롤 영역 안(`$LUP` — y=2000, 고정 카드 아래)이어야 한다. 학습 화면 판독은 `BARSCAN_X1=1033 BARSCAN_MIN=100`이다.
     - **피드백**: `screen before feedback 360 1012` · `screen after feedback 360 1012`(설정 탭 → Send feedback). 판독은 기본값(최소 200).
     - (설정 · 프로필 · 알림은 위 정정대로 판정 화면이 아니다. 닿는 다른 화면을 쓰면 먼저 구현 전 `BAR`가 나오는지로 확인하고 어느 화면인지 적는다.)
  4. 각 `*-a.png` · `*-b.png`(스크롤 중)와 `*-rest.png` · `*-after.png`(멈춤)에 화면별 설정으로 `barscan.py scan`을 건다(위 「바 판독 규칙」).
  `BAR`가 나오면 그 캡처를 열어 눈으로도 본다(거짓 `BAR` 목록은 규칙 3).
- **판정**
  - **구현 뒤 번들**: 스크롤 중 캡처(`-a` · `-b`, 학습은 하향 포함) **전부** `none`, 그리고 `overflow_check`/`diff`가 「넘친다」였던 화면에 한해서다. 한 장이라도 `BAR`(그 캡처가 눈으로도 바)면 **FAIL**.
  - **구현 전 번들(red)**: 같은 화면의 스크롤 중 캡처에 `BAR`(눈으로도 바). 이게 안 나오면 구현 뒤의 `none`은 **판정 불가**다 — 통과로 적지 않고 캡처 시각(끌기 길이 · 대기)을 고쳐 다시 한다. 안 넘치는 화면(설정 · 프로필 · 롤플레이 세로)은 구현 전에도 `BAR`가 안 나오므로 판정에서 뺀다. 판정된 화면을 적는다.
  - 멈춤 캡처(`-rest` · `-after`)는 구현 전 · 뒤 모두 `none`이다. `BAR`면 환경 문제(스크롤이 안 끝났다)다.

### S2 — 스크롤 동작이 그대로다 (AC6 · I1)

- **기기 · 빌드**: 같음. 구현 뒤 번들(구현 전도 같아야 한다 — 회귀 가드).
- **조작**: S1의 각 화면에서
  1. `rest` → 위로 끌기(`$UP`, 600ms) → 3초 → `settled` 캡처. **`barscan.py diff rest settled`가 다른 행 N > 0** (스크롤됐다).
  2. 아래로 끌기(`$DOWN`) 두 번(앞 끌기보다 길게 — 위쪽 끝에 닿게) → 3초 → `back` 캡처. `diff settled back`가 N > 0(반대로 움직였다). 처음 `rest`가 맨 위였다면 `diff rest back`이 0(**맨 위에 닿았을 때만** 성립 — 처음 위치가 끝이 아니면 같아지지 않으니 이 값은 보조다).
  3. **여정 맵에서는 유닛을 눌러 열리는 것까지**: `audioProgress true` 픽스처 맵에서 주황 유닛 원 → Start를 색 검출로 눌러(`learning`, 「Lynx 화면은 색으로 찾는다」) 학습 화면이 서는 것까지(캡처로). 학습 화면의 끌기는 `$LUP` · `$LDOWN`이다.
  4. `enable-scroll`로 잠그는 화면(여정 맵 · 학습 껍데기 가지 2, 계약 I1)은 평소 상태에서만 본다 — 잠금 상태를 만들 수단은 이 절차에 없다(미확인).
- **판정**: ① 1의 diff > 0 ② 2의 diff > 0 ③ 유닛 탭이 먹는다(학습 화면이 선다). 하나라도 어긋나면 **FAIL**(스크롤이 막혔거나 탭이 안 먹는다).
- **구현 전의 기대**: 같은 결과(통과) — 이 항목은 회귀 가드다.

### S3 — 멈춘 화면의 레이아웃이 그대로다 (AC6 · I3)

- **기기 · 빌드**: 같음. 구현 전 번들 · 구현 뒤 번들.
- **조작**: 같은 화면 · 같은 시작 상태(새 픽스처)에서 **스크롤하기 전 멈춘 캡처**를 두 번들에서 각각 뜬다(`S3-map-before-rest` · `S3-map-after-rest`, 설정 · 학습도 같게). 비교한다:
  ```sh
  python3 "$OUT/barscan.py" diff "$OUT/S3-map-before-rest.png" "$OUT/S3-map-after-rest.png"    # 상태바 아래 y 132~2400
  ```
- **판정(r02에서 고쳤다)**: 화면에 따라 갈린다. 시계 · 알림 아이콘이 있는 상태바(y < 132)는 어느 쪽에서도 뺀다.
  - **fog가 서지 않는 화면**(여정 맵 · 설정 · 프로필 · 롤플레이 …): **다른 행 0**. 한 행이라도 다르면 **FAIL** — 두 캡처를 열어 어디가 다른지 적는다(상태바 밖에 시계 · 애니메이션이 걸려 있지 않은지 먼저 본다).
  - **fog가 서는 두 화면 — 피드백, 학습(답하기 전)**: 구현 전 ↔ 뒤의 멈춘 캡처에서 **두 화면의 띠 구간(스크롤 영역 아랫변 위 40dp)은 달라질 수 있다.** 이것은 변경이 의도한 것이고 FAIL이 아니다. 판정은 **띠 밖 다른 행 0**이다. 띠 밖에서 한 행이라도 다르면 FAIL(fog 상자의 `bottom`이 틀렸거나 스크롤 영역 레이아웃이 바뀐 것). 띠 안의 차이는 S7 · S8이 판정한다.
    ```sh
    python3 "$OUT/fogband.py" split "$OUT/S3-feedback-before-rest.png" "$OUT/S3-feedback-after-rest.png"     # 띠 밖이 0이면 종료 코드 0
    python3 "$OUT/fogband.py" split "$OUT/S3-learning-before-rest.png" "$OUT/S3-learning-after-rest.png"
    ```
    비교 대상은 `before`(`296e2eac`) ↔ `after`다(학습의 듣기 유닛은 `learning-item-guides`의 안내 대상이 아니라 `before`와 안내가 섞이지 않는다). 글꼴 2.0, 피드백은 `screen`, 학습은 `learning`이 `S3-<화면>-<번들>-rest`를 이미 뜬다.
  - 띠의 위치는 기본값(2167~2272)이 **예상**이다. 다른 행이 이 범위 바로 밖(±6px)에서 나오면 FAIL로 적기 전에 S7(a)의 `band` 출력으로 띠의 실제 자리를 먼저 읽는다.
- **비교하는 것은 스크롤 전 멈춘 캡처뿐이다.** 끌고 난 뒤의 멈춘 캡처끼리는 스크롤 위치가 실행마다 달라 같지 않다 — 계약 단계의 저장 캡처로 확인했다: 스크롤 전 `base-00` ↔ `false-00` 다른 행 **0**, 스크롤 뒤 `base-03` ↔ `false-03`은 **1684 / 2268**(위치가 다르다). 후자를 이 항목에 쓰지 않는다.
- **구현 전의 기대**: 해당 없음(구현 전 · 뒤 두 번들의 비교다). 계약 단계는 맵 한 화면에서 0을 얻었다.

### S4 — 가로 카드 줄에 가로 바가 없다 (M2)

- **기기 · 빌드**: Android 에뮬레이터 API 37 · debug + 픽스처 `completeProgress true` · 구현 전 · 뒤 번들.
- **왜 보는가**: 롤플레이 목록의 카드 줄 둘(`roleplay-list-section-scroll`)은 **구현 전에도 이미 `{false}`**다. 그런데 Android는 이 프롭이 세로 바만 끈다(계약 §2.3) — 가로 바가 지금 보이는지는 재지 않았다. 구현 전후가 같아야 한다.
- **조작**: `fixture <before|after> -e completeProgress true` → 롤플레이 탭(`540 2304`)을 누른다 → 카드 줄이 보이는 화면을 `shot`으로 열어 카드 줄의 `y`를 읽는다 → 그 줄을 **가로로** 2.5초에 걸쳐 끌고(`swipecap S4-<before|after> 900 <y> 200 <y> 2500` — x 방향), 끌기 중 캡처에서 **카드 줄의 아래쪽 띠**를 본다.
- **판정**: 눈으로 + 캡처 첨부 — 카드 줄 아래쪽에 **가로로 긴 회색 막대가 없다**. 구현 전 · 뒤 캡처가 같은 모양이다.
  - 바가 **없다**: PASS.
  - 바가 **보인다**: **FAIL이 아니라 「계약 밖 — Android 가로 바는 프롭이 닿지 않는다」로 보고**하고 계약으로 되돌린다(구현 전에도 보이면 이 변경이 만든 것이 아니다). 통과로 적지 않는다.
  - `completeProgress`로 롤플레이 탭에 카드 줄이 서지 않거나 카드 수가 화면 폭 안이라 안 넘치면 **도달 실패**로 적는다(통과가 아니다).
- **구현 전의 기대**: 구현 전후 같음(속성이 이미 `{false}`).

### S5 — iOS 시뮬레이터: 스크롤 중 인디케이터 · 화면이 뜰 때의 깜빡임 (AC5 · M1)

- **기기 · 빌드**: iPhone 17 Pro 시뮬레이터(이 작업 전용) · **Debug Host**(`--bundle-url`을 `#if DEBUG` 밖에서 읽는다 — `apps/ios/Host/ViewController.swift`의 `templateURL`) · dev 전용 playground 번들(`apps/mobile`의 `playground.lynx.bundle`, 기본 화면 `tutorial-journey` — 인증 없이 실제 `AppSession`의 여정 맵을 띄운다). 번들은 모의 값으로 짓는다.
- **조건부 항목이다.** 시뮬레이터에서 스크롤 **중** 캡처가 되는지, 그리고 구현 전에 인디케이터가 **보이는지**가 확인돼야 한다(계약 M1). 못 하면 **미확인**으로 닫고 통과로 적지 않는다.
- **준비**
  ```sh
  UDID=$(xcrun simctl create "hide-scrollbars" "iPhone 17 Pro" | tail -1)
  xcrun simctl boot "$UDID"; open -a Simulator
  # Pods가 이미 있으면 pod install은 생략한다(pbxproj도 안 바뀐다). 없을 때만: ( cd apps/ios && pod install --deployment )
  xcodebuild -workspace apps/ios/Host.xcworkspace -scheme Host -configuration Debug -sdk iphonesimulator \
    -destination "platform=iOS Simulator,id=$UDID" CODE_SIGNING_ALLOWED=NO -derivedDataPath "$WORK/ios-dd" build
  xcrun simctl install "$UDID" "$WORK/ios-dd/Build/Products/Debug-iphonesimulator/Host.app"
  git checkout apps/ios/Host.xcodeproj/project.pbxproj      # pod install 가 바꾼 파일을 되돌린다
  ```
  dev 서버 둘 — 3000은 쓰지 않는다. dev 명령에서만 `playground.lynx.bundle`이 만들어진다. **`rspeedy dev`에는 `--port` 옵션이 없다.** 3000이 이미 점유돼 있으면 서버가 스스로 다음 빈 포트(3001, 3002)로 올라가고, 어느 서버가 어느 포트를 받는지는 **시작 순서**가 정한다(2026-10-08에는 구현 뒤가 3001, 구현 전이 3002였다). 그래서 구현 뒤 서버를 먼저 띄우고 각 서버의 로그에서 포트를 **읽어** 쓴다.
  ```sh
  lsof -nP -iTCP:3001 -sTCP:LISTEN; lsof -nP -iTCP:3002 -sTCP:LISTEN      # 비어 있어야 한다(3000은 다른 워크트리 것일 수 있다 — 건드리지 않는다)
  ( cd apps/mobile && pnpm exec rspeedy dev >"$WORK/dev-after.log" 2>&1 ) &                      # 구현 뒤 — 먼저
  until grep -q 'playground.lynx.bundle' "$WORK/dev-after.log"; do sleep 2; done
  git worktree add "$WORK/before-src" 296e2eac                                                  # 의존성이 없으면 먼저 pnpm install
  ( cd "$WORK/before-src/apps/mobile" && pnpm exec rspeedy dev >"$WORK/dev-before.log" 2>&1 ) &   # 구현 전
  until grep -q 'playground.lynx.bundle' "$WORK/dev-before.log"; do sleep 2; done
  # 로그의 'port 3000 is in use, using port 3001.'과 'http://…:3001/playground.lynx.bundle' 줄에서 포트를 읽는다
  AFTER_PORT=$(grep -m1 -oE ':[0-9]+/playground\.lynx\.bundle' "$WORK/dev-after.log" | grep -oE '[0-9]+')
  BEFORE_PORT=$(grep -m1 -oE ':[0-9]+/playground\.lynx\.bundle' "$WORK/dev-before.log" | grep -oE '[0-9]+')
  echo "after=$AFTER_PORT before=$BEFORE_PORT"                                                    # 둘이 달라야 한다
  curl -sI "http://localhost:$AFTER_PORT/playground.lynx.bundle" | head -1
  curl -sI "http://localhost:$BEFORE_PORT/playground.lynx.bundle" | head -1
  ```
  끝나면 dev 서버를 **잡은 프로세스를 `lsof`로 찾아**(`kill $(lsof -tiTCP:$AFTER_PORT -sTCP:LISTEN)`) 끈다(`pkill 'rspeedy dev'`는 놓친다) · 임시 워크트리를 지운다 · `simctl delete`로 시뮬레이터를 지운다.
- **스크롤 중 캡처**(좌표는 포인트, iPhone 17 Pro 402x874 · 캡처는 @3x 1206x2622). **`idb ui swipe`는 끌기가 실제로 시작되기까지 약 2초 걸린다** — 「끌기 시작 1.3초 · 1.9초 뒤」 같은 고정 시점 캡처는 2026-10-08에 전부 스크롤 전 프레임이었다(rest와 다른 행 0). 그래서 **끌기를 4초로 걸고 그 동안 연속으로 24장**을 뜬다.
  ```sh
  export PATH="$HOME/.local/bin:$PATH"          # idb가 있는 곳
  IOSOUT="$OUT/ios"; mkdir -p "$IOSOUT"
  iosshot() { xcrun simctl io "$UDID" screenshot "$IOSOUT/$1.png" >/dev/null 2>&1; }
  # iosswipe 이름 번들포트 — 앱을 띄우고 8초 뒤 rest, 4초 끌기 동안 연속 24장(f01~f24), 멈춘 뒤 after
  iosswipe() {
    xcrun simctl terminate "$UDID" com.libitum.host >/dev/null 2>&1
    xcrun simctl launch "$UDID" com.libitum.host --bundle-url="http://localhost:$2/playground.lynx.bundle" >/dev/null; sleep 8
    iosshot "$1-rest"
    idb ui swipe --udid "$UDID" 201 700 201 300 --duration 4 >"$IOSOUT/$1-idb.log" 2>&1 &
    local SW=$!
    for N in $(seq -w 1 24); do iosshot "$1-f$N"; done
    wait "$SW"; sleep 3; iosshot "$1-after"
  }
  iosswipe S5b-before "$BEFORE_PORT"
  iosswipe S5b-after "$AFTER_PORT"
  # 기본값(x 1000~폭 끝, 최소 200)으로 읽는다. 구현 전은 인디케이터가 있는 프레임 수, HEAD는 0이어야 한다
  python3 "$OUT/barscan.py" scan "$IOSOUT"/S5b-before-f*.png | grep -c ' -> BAR'     # 2026-10-08: 22 (f03~f24)
  python3 "$OUT/barscan.py" scan "$IOSOUT"/S5b-after-f*.png | grep -c ' -> BAR'      # 2026-10-08: 0
  python3 "$OUT/barscan.py" diff "$IOSOUT/S5b-after-rest.png" "$IOSOUT/S5b-after-f24.png"   # > 0 — 스크롤이 됐다
  ```
  앞쪽 프레임(f01 · f02)은 끌기가 시작되기 전이라 `none`이다. **`BAR`가 나온 프레임은 열어 눈으로도 본다**(구현 전 인디케이터는 x≈1142~1147의 가는 반투명 막대, 프레임마다 위치가 움직인다). 앱을 띄운 직후 프레임의 거짓 `BAR`(검은 시작 화면)는 「바 판독 규칙」 3을 본다 — 이 연속 캡처는 8초 기다린 뒤라 해당하지 않는다. `idb ui swipe`의 옵션은 설치한 `idb`의 `--help`로 확인한다. `simctl io recordVideo`로 영상을 떠 프레임을 보는 길도 있으나 쓰지 않았다.
- **화면이 뜰 때 깜빡이는지**(design이 미확인으로 남긴 것 — iOS는 스크롤 시작 시 인디케이터가 잠깐 깜빡일 수 있다): 앱을 띄운 **직후** 0.3초 간격으로 캡처 열두 장을 뜬다.
  ```sh
  flash() {     # flash 이름 번들포트
    xcrun simctl terminate "$UDID" com.libitum.host >/dev/null 2>&1
    xcrun simctl launch "$UDID" com.libitum.host --bundle-url="http://localhost:$2/playground.lynx.bundle" >/dev/null
    for N in $(seq -w 1 12); do iosshot "$1-$N"; sleep 0.3; done
  }
  flash S5-flash-before "$BEFORE_PORT"; flash S5-flash-after "$AFTER_PORT"
  python3 "$OUT/barscan.py" scan "$IOSOUT"/S5-flash-before-*.png "$IOSOUT"/S5-flash-after-*.png
  ```
  2026-10-08: f01(부분 어두운 면) · f02~f05(전체 높이 1920px)는 검은 시작 화면이라 거짓 `BAR`이고, f06부터는 구현 전 · 뒤 모두 `none`이었다. 이 관찰은 **판정이 아니라 기록**이다 — 구현 전에 깜빡임이 찍히면 「iOS에서는 발견 단서의 몫이 조금 있었다」는 design.md §1의 가설이 확인된 것이고, 구현 뒤에는 그 깜빡임이 없어야 한다. 캡처 간격이 깜빡임(수백 ms)을 놓칠 수 있고 이 실행은 안 찍혔으므로, **안 찍혔다는 것이 없다는 증거는 아니다**.
- **판정**
  1. **먼저 구현 전**: `S5b-before-f*` 프레임 중 인디케이터가 **보이는 것**(`BAR` + 눈으로 확인)이 있는지. 있으면 다음으로(2026-10-08: 24프레임 중 22). 하나도 없으면 이 항목 전체를 **「미확인」**으로 닫는다(통과가 아니다).
  2. **구현 뒤**: `S5b-after-f*` 24프레임 어디에도 인디케이터가 없으면 **PASS**(2026-10-08: 0프레임). 하나라도 있으면 **FAIL**(iOS의 `{false}`가 인디케이터를 끄지 못한 것 — 계약 M1이 틀렸다).
  3. 구현 뒤 번들에서 스크롤이 되는지(`rest`와 프레임이 다르다)를 같이 본다(2026-10-08: 1824~2178행 다름). 안 되면 FAIL.
- **구현 전의 기대**: 인디케이터가 보인다(2026-09-04 실기 기록 — `listening.md` S8). 이 기대가 시뮬레이터에서 안 맞으면 **미확인**이다.

## r02 — 아래 fog와 진입 직후의 바 (S6 ~ S9)

r02(계약 `spec.md`의 `## r02`)가 더한 것을 **기기에서 본다.** 피드백 화면의 루트와 학습 껍데기의 작업 영역(답하기 전)에, **스크롤 영역 아랫변 위 40dp**를 `Fog direction="bottom"`이 덮는다(`feedback-screen.css`의 `.feedback-screen-fog`, `learning-shell.css`의 `.learning-shell-rest-fog` — `bottom: layout-screen-padding-bottom`, `height: spacing-40`, `user-interaction-enabled={false}` — Lynx가 이 상자를 터치 대상에서 건너뛴다. 처음에는 `event-through={true}`였으나 그것은 LynxView 밖의 네이티브 뷰로 터치를 보내는 용도이고 Lynx 안의 형제 요소로는 내려보내지 않아 띠 안의 탭 · 끌기를 삼켰다 — r02 첫 실행이 찾았고 `f7c25aa6`이 고쳤다). 학습 화면은 스크롤 내용 끝에 같은 높이의 끝 상자(`.learning-shell-scroll-end`)도 서서, 끝까지 내리면 마지막 항목이 띠 위로 올라온다. ui 테스트는 요소가 서 있는지까지만 안다 — **띠의 실제 자리, 흐려 보이는지, 터치가 통과하는지, 기본 글꼴에서 화면이 달라지는지**는 CSS가 계산되는 기기에서만 알 수 있다(test-plan r02-4의 「ui가 못 보는 것」).

**이 절은 2026-10-09에 한 번 돌았다**(위 「실행 상태」). 띠의 위치는 실측으로 확인했고, 터치 결함은 `f7c25aa6`에서 고쳤으며, 아래 절차는 첫 실행에서 찾은 절차 결함 7건과, 터치 수정 뒤 재실행(r02b)이 찾은 5건을 고친 것이다. r02b는 PASS(수정 확인)였다.

### 띠의 자리 — 예상과 먼저 잴 것

40dp는 Pixel_8(밀도 420 → 2.625배)에서 **105px**이다. 스크롤 영역의 아랫변은 accessibility 캡처에서 학습 화면의 보기가 잘리는 선(y ≈ 2272)과 같은 여백 구조라, 띠는 **y ≈ 2167 ~ 2272**로 예상한다. 이 숫자를 믿지 않는다 — S7(a)의 `fogband.py band` 출력(「fog 전 ↔ 뒤」에서 다른 행의 범위)이 정본이다. 첫 실행의 실측은 아래 목록에 있다.

- 다른 행이 **연속 105px 안팎의 한 구간**이면 정상이다.
- **두 구간으로 갈라지거나**, **화면 바닥에 붙거나**(끝 행이 띠 아래로 벗어남), **16px쯤만 겹치면**(스크롤 영역과 fog 상자의 겹침이 `bottom: 0`일 때의 모양) fog 상자의 `bottom`이 틀린 것이다 — **FAIL**.
- **실측(r02 첫 실행)**: 학습 2.2 2169~2273(105px), 피드백 3.0 2169~2221(내용이 y2221에서 끝나 그 아래는 빈 배경), 피드백 2.0 2178~2273, 학습 2.0 2182~2273(내용이 시작되는 줄부터). 예상(2167~2272)과 ±2 안에서 같다.
- 맨 위 몇 행은 fog가 거의 투명이라 같은 값일 수 있다. 그래서 `band`의 「짧다」 기준은 띠 길이의 75%다(정한 값 — 첫 실행의 3.0 피드백이 여기에 걸렸고 그것은 정상이다. 아래 「`band`가 CHECK(짧다)를 내는 정상 경우」).
- 띠 안에 **내용이 없으면**(배경뿐) fog가 배경 위에 배경색을 얹어 다른 행이 0이다. 그것은 fog가 안 그려진 것과 구분되지 않는다(계약 r02.6-2) — `split`이 `a의 띠 안 내용 행`을 같이 찍는다. 0이면 판정 불가로 적고 글꼴 배율 · 시드를 바꿔 내용이 띠에 걸리게 한다.

```sh
export STRIP_Y0=2167 STRIP_Y1=2272        # r02 첫 실행 실측(±2)으로 확인됨 — 학습 2.2는 2169~2273
setfont() { A shell settings put system font_scale "$1"; sleep 2; }      # 픽스처를 시작하기 **전에** 부른다(화면이 켜진 채 바꾸면 Activity가 다시 만들어진다)
```

### 도구 — `fogband.py`(부록)

`barscan.py`와 같은 폴더에 저장한다. 전부 파일 둘(또는 하나)의 픽셀만 읽고 기기를 쓰지 않는다.

| 명령 | 읽는 것 | 종료 코드 |
|---|---|---|
| `band a b [Y0 Y1]` | 두 캡처의 다른 행(상태바 아래)이 띠 안의 한 구간인가. 구간 목록 · 범위 · `OK`/`CHECK`/`NONE`(`CHECK`가 「짧다」뿐이면 정상일 수 있다 — 아래) | `OK`면 0 |
| `split a b [Y0 Y1]` | 다른 행을 **띠 안 · 띠 밖**(위 · 아래)으로 센다. a의 띠 안 내용 행 수도 | 띠 밖 0이면 0 |
| `fade a b [Y0 Y1] [#색]` | 띠 안에서 바뀐 픽셀이 **배경색 쪽으로 옅어졌는가**(배경 쪽 · 반대쪽 · 원래 배경인데 바뀜) | `FADE`면 0 |
| `flat a Y0 Y1 [#색]` | 그 행들이 배경색뿐인가(끝 상자 아래가 비었는가) | `FLAT`이면 0 |
| `px a x y …` | 그 점들의 색 — 테두리 색 비교용 | — |
| `shift a b [Y0 Y1]` | b가 a보다 세로로 몇 픽셀 움직였나 — 스크롤 양 | — |

배경색은 `[#색]`을 안 주면 **a에서 띠 바로 아래 여백(x=8)의 색**을 읽는다. 학습 화면의 fog 색(`surface-default`)이 배경(`background-primary`)과 같은지는 이 문서가 모른다 — `fade`가 「원래 배경인데 바뀜」을 따로 세므로, 그 수가 크면 두 색이 다른 것이다(그래도 FAIL이 아니다 — 눈으로 보고 적는다).

#### `band`가 CHECK(짧다)를 내는 정상 경우

`band`의 종료 코드는 `OK`일 때만 0이지만, **내용이 띠 안에서 끝나는 화면**(예: 글꼴 3.0 피드백 — 다섯째 보기가 y2221에서 끝나고 그 아래는 빈 배경)에서는 다른 행이 띠 전체(105px)보다 짧아(53행) `CHECK(짧다…)`가 나온다. 빈 배경 위의 fog는 배경색 위에 배경색이라 다른 행이 0이기 때문이다. 이 출력은 **이유를 갈라서** 판정한다: ① 이유가 「짧다」 하나이고 ② 구간이 하나이며 ③ 범위가 모두 띠 안(`STRIP_Y0 ~ STRIP_Y1`)이고 바닥에 안 붙었으며 ④ `split`의 띠 밖이 0이면 **통과**다(내용이 띠를 다 채우지 않았을 뿐이다). 두 구간으로 갈라졌거나 끝 행이 띠 아래로 벗어났거나 띠 밖이 0이 아니면 FAIL이다. `CHECK(짧다)`만으로 FAIL로 적지 않는다.

**판정은 숫자와 눈의 둘이다.** 띠가 흐려 보이는지는 숫자(`fade`)로 재고, 「잘린 보기가 이어지는 것으로 읽히는가」는 캡처를 열어 눈으로 본다. 숫자만 `FADE`이고 눈에 안 보이면 적는다.

### 공통 함수 — 한 셸에 정의한다

기존 `shot` · `waitre` · `fixture` · `fixture_stop`이 있어야 한다. 픽스처는 약 180초 뒤 끝나므로 **진입 · 캡처를 한 호출 안에서 끝낸다.**

```sh
# burst 이름 x y — 탭 직후 기기 안에서 screencap을 8장 잇달아 뜬다(PC를 거치지 않아 간격이 짧다).
# 파일 $OUT/<이름>-1..8.png, 각 캡처가 시작한 시각(탭 명령 직전 기준 ms)은 $OUT/<이름>-times.txt
burst() {
  A shell "rm -rf /sdcard/bst; mkdir /sdcard/bst; date +%s%N > /sdcard/bst/t.txt; input tap $2 $3; for i in 1 2 3 4 5 6 7 8; do date +%s%N >> /sdcard/bst/t.txt; screencap -p /sdcard/bst/\$i.png; done"
  for I in 1 2 3 4 5 6 7 8; do A pull /sdcard/bst/$I.png "$OUT/$1-$I.png" >/dev/null; done
  A shell cat /sdcard/bst/t.txt | python3 -c "import sys; t=[int(x) for x in sys.stdin.read().split()]; print('캡처 시작(탭 명령 전 기준 ms):',[ (x-t[0])//1000000 for x in t[1:]])" | tee "$OUT/$1-times.txt"
  A shell rm -rf /sdcard/bst
}

# lenter before|nofog|after [Y0 Y1] — 현재 글꼴 배율에서 듣기 유닛으로 들어간다(맵을 밀어 주황 유닛 원 → Start, 색 검출 탭). 끝나면 학습 화면(답하기 전)이 서 있다.
# Start 버튼을 찾는 y 범위(Y0 Y1)는 시트 위치가 글꼴마다 달라 **글꼴별로 준다**(r02 실측): 글꼴 1.0 `1300 2150` · 글꼴 2.0 `1800 2400` · 글꼴 2.2 `2150 2350`(Start가 y2243 — `1750 2150`은 놓친다).
# 기존 learning()의 진입 부분과 같다 — 진입만 하고 캡처 · 끌기는 하지 않는다. 시드 audioProgress
lenter() {
  local W=$1 C=none K=0 S Y0=${2:-1800} Y1=${3:-2400}
  fixture_stop; sleep 1; fixture "$W" -e audioProgress true || return 1
  sleep 3
  while [ "$C" = none ] && [ "$K" -lt 5 ]; do
    A shell input swipe 540 1700 540 700 600; sleep 3; shot "nav-$W-1"
    C=$(python3 "$OUT/orange.py" "$OUT/nav-$W-1.png" 440 640 300 2200); K=$((K + 1))
  done
  echo "circle: $C (swipes $K)"; [ "$C" = none ] && return 1
  A shell input tap $(echo $C | cut -d' ' -f1,2); sleep 3; shot "nav-$W-2"
  S=$(python3 "$OUT/orange.py" "$OUT/nav-$W-2.png" 260 820 "$Y0" "$Y1"); echo "start: $S"; [ "$S" = none ] && return 1
  A shell input tap $(echo $S | cut -d' ' -f1,2); sleep 5
}

# fbenter before|nofog|after X Y — 피드백을 연다: 설정 탭 → (X,Y) 항목. Send feedback 항목의 좌표는 글꼴마다 다르다:
#   글꼴 2.0 `360 1012` · 글꼴 1.0 `540 948` · 글꼴 3.0 `540 1206`  (r02 첫 실행의 실측 — 다른 기기는 설정 탭 캡처에서 읽는다)
fbenter() {
  fixture_stop; sleep 1; fixture "$1" || return 1
  sleep 3; A shell input tap 792 2306; sleep 3; A shell input tap "${2:-360}" "${3:-1012}"; sleep 5
}
```

위 함수의 설정 탭 좌표(`792 2306`)는 r01 실행의 값이고, Send feedback 항목은 **글꼴마다 다르다**(2.0 `360 1012`, 1.0 `540 948`, 3.0 `540 1206` — r02 첫 실행 실측, Pixel_8 1080x2400). 글꼴 1.0 · 3.0에서 `360 1012`는 틀리다. 다른 기기는 설정 탭 캡처에서 읽는다.

### S6 — 화면에 들어온 직후에도 바가 없다 (R1 · R2)

- **왜 보는가**: accessibility 단계가 Android에서 **쌓이는 화면(피드백 · 학습)에 들어온 직후 약 1.5초 바가 떠 있었다**고 기록했다(피드백 글꼴 2.0, 구현 전: 탭 후 593 · 1103 · 1418 ms의 캡처에서 x1034, y353~2060, 1708px, `#B0AFAE`, 1878 ms부터 없음). 멈춘 지 몇 초 뒤의 캡처(S1)로는 이것이 잡히지 않는다. S1은 끌기 중 바를, S6은 **진입 직후의 바**를 본다. 설정 탭처럼 탭 루트 화면은 구현 전에도 안 떴다.
- **기기 · 빌드**: Android 에뮬레이터 · 글꼴 **2.0**(`setfont 2.0` 후 픽스처) · 번들 `before`(구현 전)와 `after`. 비교는 `before` ↔ `after`다(`nofog`는 바가 꺼진 번들이라 대조가 안 선다).
- **조작 · 캡처**
  ```sh
  # s6 before|after — 설정 탭 → Send feedback을 누른 직후 연속 8장(S6-<번들>-1..8), 그리고 4초 뒤 한 장(-settled)
  s6() {
    local W=$1
    fixture_stop; sleep 1; fixture "$W" || return 1
    sleep 3; A shell input tap 792 2306; sleep 3
    burst "S6-$W" 360 1012
    sleep 4; shot "S6-$W-settled"
    python3 "$OUT/barscan.py" scan "$OUT"/S6-$W-[1-8].png "$OUT/S6-$W-settled.png"
  }
  setfont 2.0; s6 before; s6 after; fontscale_restore
  ```
  판독은 기본값(`BARSCAN_X0` 1000, 최소 200px)이다. 피드백 화면의 「바 판독 규칙」 표와 같다(카드 테두리 144px `#CBC9C9`는 최소 200에 안 걸린다). `BAR`가 나온 캡처는 열어 눈으로 본다.
- **판정**
  1. **구현 전(`before`)**: 탭 후 **0.5 ~ 1.5초 구간에 시작한 캡처**(`-times.txt`의 값으로 고른다) 가운데 하나 이상이 `BAR`(눈으로도 오른쪽 가장자리의 가늘고 긴 막대, `#B0AFAE`)이고, 1.9초 이후의 캡처는 `none`이다. **하나도 `BAR`가 안 나오면 이 케이스 전체가 판정 불가다** — 절차가 틀린 것이다(캡처 시각이 어긋났거나 환경이 다르다). 통과로 적지 않고 **두 번 더** 같은 절차를 해 보고, 그래도 `none`이면 사유와 캡처를 붙여 보고한다.
  2. **구현 뒤(`after`)**: 8장 **모두 `none`**. 한 장이라도 `BAR`(눈으로도 바)면 **FAIL**. 144px 카드 테두리는 바가 아니다.
  3. `-settled`는 두 번들 모두 `none`이다(바는 멈추면 사라진다). `BAR`면 환경 문제다.
  4. 캡처 시작 시각(`-times.txt`)을 결과에 같이 적는다. 에뮬레이터 부하에 따라 간격이 달라지므로 같은 번들을 두 번 돌려도 `BAR`가 나오는 프레임 번호는 다를 수 있다 — 기준은 **시각 구간**이지 프레임 번호가 아니다.
- **학습 화면의 진입 직후**(accessibility: 글꼴 2.2에서 구현 전 3장, x1027 y2069~2164 96px)는 test-plan의 S6에 없다 — 이 문서는 절차를 두지 않았다. 96px는 `barscan.py` 기본 최소 200을 못 넘으므로 하려면 학습의 판독 설정(`BARSCAN_X1=1033 BARSCAN_MIN=100`)이 필요하다. **미확인**으로 둔다.

### S7 — 피드백, 글꼴 3.0: 다섯째 보기가 띠에서 흐려진다

- **왜 보는가**: accessibility는 글꼴 3.0의 피드백 멈춘 화면에서 **5점 보기는 온전히 보이고 `Send`는 통째로 화면 밖, 잘린 것이 없다**고 기록했다(`feedback30-rest`) — 아래에 더 있다는 단서가 구현 전에는 진입 때의 바뿐이었다. r02는 아래 40dp를 흐려 「마지막 보기의 아랫변이 닫히지 않는다」를 단서로 만든다(진입 때의 바보다 **약한** 단서다 — 계약 r02.6-1).
- **기기 · 빌드**: Android 에뮬레이터 · 글꼴 **3.0** · 번들 `nofog` ↔ `after`(차이가 fog 하나)). `after`는 **`f7c25aa6` 이후 소스**로 새로 짓는다(`d3baf2c7`의 `event-through` 번들은 (c)(d)가 FAIL한다).
- **준비 — 3.0의 좌표**: 3.0에서는 설정 목록이 길어져 `360 1012`가 틀리고, r02 첫 실행에서 Send feedback 항목은 **`540 1206`**이었다. 다른 기기라면 한 번 들어가서 설정 탭 캡처를 떠 좌표를 **눈으로** 읽는다(두 번들의 설정 화면은 같다).
  ```sh
  setfont 3.0
  fixture_stop; sleep 1; fixture after || echo "픽스처 실패"; sleep 3; A shell input tap 792 2306; sleep 3; shot "S7-settings-3.0"; fixture_stop
  FBX=540; FBY=1206         # r02 첫 실행 값(Pixel_8). 다르면 S7-settings-3.0.png에서 Send feedback 항목 중심의 좌표를 읽어 넣는다
  ```
- **조작 · 캡처**
  ```sh
  # fb3 nofog|after — 글꼴 3.0(미리 setfont 3.0). 피드백을 열고 멈춘 캡처(rest) → TAPX/TAPY가 있으면 그 점을 눌러 캡처(tapped)
  #   → DRAGY가 있으면 (540, DRAGY)에서 시작해 400px 위로 끌고 캡처(dragged) → 끝까지 내린 캡처(end)
  # TAG를 주면 파일 이름에 붙는다(두 번째 실행이 첫 번째를 덮지 않게)
  fb3() {
    local W=$1
    fbenter "$W" "$FBX" "$FBY" || return 1
    shot "S7${TAG}-$W-rest"
    if [ -n "$TAPX" ]; then A shell input tap "$TAPX" "$TAPY"; sleep 1.5; shot "S7${TAG}-$W-tapped"; fi
    if [ -n "$DRAGY" ]; then A shell input swipe 540 "$DRAGY" 540 $((DRAGY - 400)) 500; sleep 3; shot "S7${TAG}-$W-dragged"; fi
    for K in 1 2 3; do A shell input swipe 540 1900 540 600 500; sleep 1; done; sleep 3
    shot "S7${TAG}-$W-end"
  }
  fb3 nofog; fb3 after                                     # (a) (b) — TAPX를 비운 채
  # (c) 띠 안(y STRIP_Y0~STRIP_Y1)에 걸린 다섯째 보기의 한 점을 누른다. r02 첫 실행의 값(Pixel_8, 3.0): 보기 아랫 반 y2175 · y2195(띠 2169~2221 안).
  #     다르면 S7-nofog-rest.png에서 읽는다. 띠 위의 점(y2100)은 fog와 무관한 대조다
  TAPX=540; TAPY=2195; TAG=-tap fb3 nofog; TAG=-tap fb3 after; unset TAPX TAPY
  # (d) 띠 안에서 **시작하는** 끌기: 시작점을 띠 안(y2200)에 둔다
  DRAGY=2200; TAG=-drag fb3 nofog; TAG=-drag fb3 after; unset DRAGY
  fontscale_restore
  ```
  `fb3`의 끌기는 화면 전체가 스크롤 영역이라(r01의 피드백 `UP`과 같다) 시작점을 `540 1900`으로 잡았다. `end`가 끝에 닿았는지는 캡처로 본다(세 번이면 모자란 배율이면 늘린다).
- **판정**
  - **(a) 멈춘 화면, 띠 안**: 
    ```sh
    python3 "$OUT/fogband.py" band  "$OUT/S7-nofog-rest.png" "$OUT/S7-after-rest.png"    # 띠의 실제 자리. OK여야 한다
    python3 "$OUT/fogband.py" split "$OUT/S7-nofog-rest.png" "$OUT/S7-after-rest.png"    # 띠 안 > 0 · 띠 밖 0
    python3 "$OUT/fogband.py" fade  "$OUT/S7-nofog-rest.png" "$OUT/S7-after-rest.png"    # FADE
    ```
    통과: ① 다른 행이 **띠 안에만**(`> 0`) 있고 띠 밖은 0 ② `band`가 `OK`(한 구간, 105px 안팎 — 실제 범위를 적는다. 내용이 띠 안에서 끝나는 화면이면 `CHECK(짧다)`도 정상이다) ③ `fade`가 `FADE`(바뀐 픽셀이 배경 쪽) ④ **눈**: 다섯째 보기의 아래 테두리가 `nofog`보다 옅고 아래로 이어지는 것으로 읽힌다(`fogband.py px`로 테두리 위 같은 열의 색을 `nofog` ↔ `after`에서 찍어 `after`가 배경색에 더 가까운지 적는다). `띠 안`이 0이거나 `a의 띠 안 내용 행`이 0이면 **판정 불가**(위 「띠의 자리」) — fog 전 번들에서 「띠 안 > 0」이 성립하지 않는 것이 이 케이스의 red다. `band`가 `CHECK`이면 이유가 FAIL 조건인지(두 구간 · 바닥 붙음) 짧음인지 가르고 적는다 — 짧음뿐이면 위 「`band`가 CHECK(짧다)를 내는 정상 경우」의 네 조건으로 판정한다(글꼴 3.0 피드백은 내용이 y2221에서 끝나 `CHECK(짧다)`가 정상이다).
  - **(b) 끝까지 내린 화면**: `Send`가 fog에 가려지지 않았고 그 아래 띠는 빈 배경이다.
    ```sh
    BX=...; BY1=...; BY2=...        # S7-after-end.png에서 Send 테두리의 x, 위 테두리 y, 아래 테두리 y를 눈으로 읽는다
    python3 "$OUT/fogband.py" px "$OUT/S7-after-end.png" "$BX" "$BY1" "$BX" "$BY2"                          # 두 색이 같아야 한다
    python3 "$OUT/fogband.py" flat "$OUT/S7-after-end.png" $((BY2 + 4)) "$STRIP_Y1"                         # FLAT
    python3 "$OUT/barscan.py" diff "$OUT/S7-nofog-end.png" "$OUT/S7-after-end.png"                          # 보조: 0이면 가장 좋다
    ```
    통과: `Send`의 아래 테두리 색 = 위 테두리 색, `Send` 아래로 띠가 빈 배경(`FLAT`). 계약상 피드백에는 끝 상자가 없고(FG4) 본문 아래 여백이 40dp 이상이라는 가정이다 — 보조 `diff`가 0이 아니면 `Send`가 띠에 걸렸는지 먼저 본다(걸렸으면 FAIL, accessibility E3의 「Send가 fog에 덮이지 않게」).
  - **(c) 띠 안을 누른다**: 띠에 걸린 다섯째 보기를 **띠 안의 좌표로** 누르면 선택된다(fog 상자가 `user-interaction-enabled={false}`라 Lynx가 그 상자를 건너뛰고 아래 보기로 터치를 준다 — `event-through`가 아니다. `event-through`는 LynxView 밖의 네이티브 뷰로 터치를 보내는 용도라 Lynx 안의 형제 요소로는 내려가지 않는다). `barscan.py diff S7-tap-after-rest S7-tap-after-tapped`가 `> 0`이고 눈으로 그 보기가 선택 표시이면 통과. `nofog`의 같은 탭이 선택되는데 `after`에서 안 되면 **FAIL**(fog가 터치를 가로챘다). 둘 다 안 되면 좌표가 틀린 것이다. **r02 첫 실행(`d3baf2c7`, `event-through`)**: nofog 233행 · after 0행(y2175 · y2195, 2회 재현) — FAIL. 띠 위 y2100은 after도 233행. **r02b(`c1a1138c`, y2195)**: nofog 233행 · after 233행(눈으로 5 · Love it 선택 + 체크) — 통과.
  - **(d) 띠 안에서 시작한 끌기가 스크롤한다**: 시작점이 띠 안(y2200)인 끌기가 `nofog`와 같이 스크롤한다. `barscan.py diff S7-drag-nofog-rest S7-drag-nofog-dragged`(기준, `> 0`)와 `... S7-drag-after-rest S7-drag-after-dragged`(`> 0`)를 비교한다. nofog가 스크롤하는데 after가 0행이면 **FAIL**(fog가 끌기를 삼켰다 — 이 조합은 FAIL로 읽는다). 둘 다 0이면 시작점이 스크롤 영역 밖이거나 끝에 닿은 것이다(다시). **r02 첫 실행**: nofog 1821행 · after 0행 — FAIL. **r02b**: nofog 1766행 · after 1816행 — 통과.
- **구현 전의 기대**: `nofog`에는 fog가 없으므로 (a)의 「띠 안 > 0」이 성립하지 않는다 — `nofog` 같은 번들을 두 번 떠서 서로 비교하면 0이어야 한다(입력란 커서가 깜박이는 화면이면 이 대조로 잡음을 가른다).

#### S7(f) — 자판이 올라온 상태 (AC19, 계약 r03 · 리뷰 W5) — **미실행**

- **왜 보는가**: 피드백의 fog는 **늘** 선다(ADR-0055 D4). 입력란을 누르면 자판이 올라오는데, 그때 화면 높이가 줄어 띠가 자판 바로 위로 올라오는지, 자판 뒤에 남는지를 계약 r02.4가 모른다고 적었다. 띠가 자판 위로 올라오면 **입력 중인 줄이 띠에 머물러 흐려질** 수 있다.
- **기기 · 빌드**: Android 에뮬레이터 · 글꼴 **1.0과 2.0** · 번들 `nofog` ↔ `after`(S7과 같다). 피드백 항목의 좌표: 글꼴 1.0 `540 948` · 2.0 `360 1012`(r02 실측 — `fbenter` 주석).
- **조작 · 캡처** — 좌표 셋은 **실측 값이 없다.** 첫 실행은 `STARX` · `INX`만 주고 돌려 `-rest` · `-keyboard` 캡처에서 별점 · 입력란 · (끝 화면에서) `Send`의 자리를 눈으로 읽은 뒤, `SENDX`를 채워 다시 돈다.
  ```sh
  # fbkey nofog|after X Y — 피드백을 열고(X Y = Send feedback 항목) 별점 하나 → 입력란 → 글자 → 멈춘 캡처 → 끝까지 → (SENDX가 있으면) Send
  #   STARX STARY: 고를 보기의 한 점 · INX INY: 입력란의 한 점 · SENDX SENDY: 끝 화면의 Send — 같은 글꼴의 캡처에서 눈으로 읽는다
  #   TAG를 주면 파일 이름에 붙는다(글꼴별로 -f10 · -f20)
  fbkey() {
    local W=$1
    fbenter "$W" "$2" "$3" || return 1
    shot "S7f${TAG}-$W-rest"
    A shell input tap "$STARX" "$STARY"; sleep 1.5
    A shell input tap "$INX" "$INY"; sleep 2; shot "S7f${TAG}-$W-keyboard"
    A shell input text "hello"; sleep 1.5; shot "S7f${TAG}-$W-typed"
    for K in 1 2 3; do A shell input swipe 540 1000 540 400 500; sleep 1; done; sleep 2
    shot "S7f${TAG}-$W-end"
    if [ -n "$SENDX" ]; then A shell input tap "$SENDX" "$SENDY"; sleep 2; shot "S7f${TAG}-$W-sent"; fi
  }
  setfont 1.0; TAG=-f10; for W in nofog after; do fbkey "$W" 540 948; done
  setfont 2.0; TAG=-f20; for W in nofog after; do fbkey "$W" 360 1012; done
  unset TAG STARX STARY INX INY SENDX SENDY; fontscale_restore
  ```
  자판이 올라온 동안의 끌기는 자판 위의 스크롤 영역 안에서 시작해야 한다 — `540 1000`이 자판에 덮이면 `-keyboard` 캡처에서 자판 윗변을 읽어 그 위로 옮긴다. `input text`가 입력란에 안 들어가면(Lynx 입력란이 adb 입력을 받지 않으면) 그 사실을 적고 판정 ①을 「판정 불가」로 둔다.
- **먼저 적는 것 — 판정 아님**: `-keyboard` 캡처에서 자판 윗변의 y와, 띠가 어디에 섰는지(`python3 "$OUT/fogband.py" band "$OUT/S7f-f10-nofog-typed.png" "$OUT/S7f-f10-after-typed.png" Y0 Y1` — `Y0 Y1`은 자판 윗변 위 105px 구간을 준다. `STRIP_Y0 ~ STRIP_Y1`은 자판이 없을 때의 값이라 여기서 쓰지 않는다). 띠가 자판 위로 올라왔는가 · 자판 뒤에 남았는가를 적는다.
- **판정**
  1. **입력 중인 줄이 띠 안에 있지 않다**: `-typed` 캡처에서 입력한 글자의 줄이 띠 구간 밖이다. 띠 안에서 그 줄의 글자가 `nofog`보다 옅으면(`fogband.py px`로 같은 점의 색) **FAIL** — 제품 결함으로 보고한다. 계약은 그 경우의 조치를 정하지 않았다.
  2. **`Send`에 닿는다**: `-end`에서 `Send`가 자판 위에 온전히 보이고(위 · 아래 테두리 색이 같다 — S7(b)의 `px`), `-sent`에서 전송 상태로 바뀐다(모의 서버면 실패 문구가 서는 것까지가 「눌렸다」다).
  3. **띠 밖이 같다**: 두 번들의 `-typed`를 위의 `Y0 Y1`로 `fogband.py split` — 띠 밖 0(자판의 커서 · 추천 줄 행은 빼고 센다. 뺀 범위를 적는다).
- **구현 전의 기대**: 해당 없음(`nofog` ↔ `after` 비교다).

### S8 — 학습 듣기(답하기 전), 글꼴 2.2: 첫 보기가 띠에서 흐려진다

- ⟨2026-10-09⟩ **이 케이스는 r02의 커밋 번들로 닫는다.** 작업 `learning-shell-large-font` 뒤의 번들에서 글꼴 2.2(작업 영역 78dp)는 **합친 흐름**이다 — 「스크롤 영역은 고정 카드 아래뿐」과 끝까지 내린 화면의 모습(무대가 함께 올라간다)이 달라진다. `nofog` ↔ `after` 비교를 그 뒤 번들로 돌리면 두 변경이 섞인다. 그 작업의 재실행은 합친 흐름의 2.2 멈춘 화면이 흐림이 들어간 `split` 번들(`fa3b261e` — 이 케이스의 `after`와 같은 구조)과 다른 행 0임을 봤다 — 띠의 모양은 그대로다 [실측 — Android 에뮬레이터 Pixel_8].
- **왜 보는가**: 글꼴 2.2에서 보기 둘 가운데 「Hello」만 보이고 아래 테두리가 잘리며, **「Thank you」는 통째로 화면 밖**이다(`learning-f22-rest`). 계약은 첫 보기의 아래쪽과 글자 아랫부분이 흐려져 「잘렸다」가 「아래로 이어진다」로 읽힐 것이라 예상한다 — 멈춘 상태에서 첫 보기 글자가 조금 흐려지는 것이 대가다.
- **기기 · 빌드**: Android 에뮬레이터 · 글꼴 **2.2** · 시드 `audioProgress`(`tutorial-listening`, 보기 둘) · 번들 `nofog` ↔ `after`. `after`는 `f7c25aa6` 이후 소스로 새로 짓는다.
- **조작 · 캡처**: 두 모드를 **따로** 돌린다 — (d)는 「답하기 전에 끌지 않은 실행」이어야 스크롤 위치가 같다.
  ```sh
  # s8 nofog|after drag|bandrag|answer     (케이스 이름은 이 셋뿐이다. 첫 실행 스크립트의 `stripdrag`는 `bandrag`와 같은 케이스다 — 파일 이름은 `S8-bandrag-…`로 통일)
  #   drag:    멈춘 캡처(rest) → 두 번 끌어 끝까지 → 캡처(end)
  #   bandrag: 멈춘 캡처(rest) → 띠 안(y2200)에서 시작해 400px 위로 끌기 → 캡처(dragged)
  #   answer:  멈춘 캡처(rest) → TAPX/TAPY를 눌러 답한다 → 1초 · 4초 뒤 캡처(answered-1 · answered-2)
  # 글꼴 2.2의 Start는 y2243이라 lenter의 범위를 2150 2350으로 준다. 끌기 시작점은 y2120 — y2000은 2.2에서 고정 카드 위라 스크롤이 안 된다
  s8() {
    local W=$1 M=$2
    lenter "$W" 2150 2350 || return 1
    shot "S8-$M-$W-rest"
    if [ "$M" = drag ]; then
      for K in 1 2; do A shell input swipe 540 2120 540 600 600; sleep 1; done; sleep 3
      shot "S8-drag-$W-end"
    elif [ "$M" = bandrag ]; then
      A shell input swipe 540 2200 540 1800 500; sleep 3
      shot "S8-bandrag-$W-dragged"
    else
      A shell input tap "$TAPX" "$TAPY"; sleep 1; shot "S8-answer-$W-answered-1"
      sleep 3; shot "S8-answer-$W-answered-2"
    fi
  }
  setfont 2.2
  s8 nofog drag; s8 after drag
  # 띠 안에 걸린 「Hello」 보기의 한 점 — r02 첫 실행의 값(Pixel_8, 2.2): y2200. 다르면 S8-drag-nofog-rest.png에서 읽는다(y가 STRIP_Y0~STRIP_Y1)
  TAPX=540; TAPY=2200; s8 nofog answer; s8 after answer; unset TAPX TAPY
  s8 nofog bandrag; s8 after bandrag
  fontscale_restore
  ```
  학습 화면의 스크롤 영역은 고정 카드 아래(보기 칸)뿐이다(⟨2026-10-09⟩ 이 케이스를 닫은 번들에서 — 뒤 작업 뒤에는 2.2가 합친 흐름이라 화면 어디서나 끌린다). 끌기 시작점은 글꼴 2.0이 `y=2000`(r01의 `LUP`), **글꼴 2.2는 `y=2120`** — 2.2에서 y2000은 고정 카드 위라 스크롤이 안 된다(r02 첫 실행). 시작점이 카드 위면 스크롤이 안 돼 「안 넘친다」로 잘못 읽는다.
- **판정**
  - **(a) 멈춘 화면, 띠 안**: S7(a)와 같은 세 명령(`band` · `split` · `fade`)을 건다. 다른 행이 띠 안에만 있고(`> 0`) 띠 밖 0, `band` `OK`, `fade` `FADE`. 눈: 「Hello」의 아래쪽이 `nofog`보다 옅다.
    - **판정 쌍은 같은 실행에서 뜬 rest를 쓴다.** `s8`은 모드(`drag` · `bandrag` · `answer`)마다 번들을 새로 띄우고 `rest`를 새로 뜬다. 쌍은 `S8-answer-nofog-rest` ↔ `S8-answer-after-rest`, `S8-bandrag-nofog-rest` ↔ `S8-bandrag-after-rest`, `S8-drag-nofog-rest` ↔ `S8-drag-after-rest`처럼 **같은 모드끼리**(어느 한 모드의 `nofog` rest를 다른 모드의 `after` rest와 짝짓지 않는다)이고, 쌍마다 `band` · `split` · `fade`를 건다.
    - **잡음을 가르는 규칙 — 기준은 6행이다**(계약 r03): 같은 번들의 멈춘 캡처끼리 실행마다 달라지는 양으로 **관찰된 것은 6행**이다(r02b: nofog끼리 6행). 띠 밖 차이가 **6행 이하**면 잡음으로 본다. **넘으면** 바로 FAIL로 적지 않고 **같은 모드를 한 번 더** 돌려 새 쌍으로 다시 판정한다 — 다시 넘으면 **FAIL**이다. 한 번 넘고 다시 돌린 쌍에서 사라진 것은 **통과로 적되, 넘었던 사실(행 수 · 범위)과 그 캡처를 결과에 남긴다.**
      r02b의 **32행**(첫 `s8 after drag` 실행의 rest만 다른 after rest와 32행 — x153~692, y36~1621의 카드 영역, 눈으로는 같아 보임, `S8-drag-after-rest-run1.png`)은 **설명되지 않은 관찰 한 건**이다. 원인을 모른다. 잡음의 범위나 상한으로 읽지 않는다 — 「6 ~ 32행은 잡음」이 아니다.
  - **(b) 끝까지 내린 화면**: 마지막 보기(「Thank you」)의 **아래 테두리 색 = 위 테두리 색**(fog에 가려지지 않았다)이고 그 아래 띠가 빈 배경이다 — 끝 상자(40dp) 덕에 마지막 보기가 띠 위로 올라온다.
    ```sh
    BX=...; BY1=...; BY2=...        # S8-drag-after-end.png에서 마지막 보기의 x, 위 테두리 y, 아래 테두리 y를 눈으로 읽는다
    python3 "$OUT/fogband.py" px   "$OUT/S8-drag-after-end.png" "$BX" "$BY1" "$BX" "$BY2"                    # 같아야 한다
    python3 "$OUT/fogband.py" flat "$OUT/S8-drag-after-end.png" $((BY2 + 4)) "$STRIP_Y1"                     # FLAT
    ```
    `nofog`에는 끝 상자가 없어 끝 위치가 105px 낮다 — `nofog-end`와 `after-end`를 행 단위로 비교하지 않는다(다를 수밖에 없다). `nofog-end`는 「끝 상자가 없을 때 마지막 보기가 띠 안에 들어가 흐려졌을 모습」의 참고다.
    ⟨2026-10-09⟩ 이 판정이 남긴 **끝 상자의 대가**(마지막 보기 라벨 윗부분이 고정 카드에 가려진다 — 아래 r02 · r02b 결과)는 글꼴 2.2가 뒤 작업에서 합쳐져 **이 모습이 사라졌다** — 끝까지 내려도 보기 둘이 온전하고 라벨 위로 무대가 이어진다([학습 껍데기 큰 글꼴 절차](learning-shell-large-font.md) L5(c), 사용자 결정 U5의 확인 — [ADR-0055](../adr/0055-scroll-bars-off.md)). 문턱 위의 좁은 `split`(Pixel_8 글꼴 2.05 · 2.1)에는 위 여백이 가려지는 모습으로 남는다.
  - **(c) 띠 안을 누른다**: 띠에 걸린 보기를 띠 안 좌표(y2200)로 누르면 **판정이 난다**(답이 받아들여진다 — 정오 표시가 선다. fog 상자가 `user-interaction-enabled={false}`라 터치가 아래 보기로 간다). `barscan.py diff S8-answer-after-rest S8-answer-after-answered-1`이 `> 0`이고 눈으로 정오 표시이면 통과. `nofog`의 같은 탭은 같은 결과여야 한다. **r02 첫 실행(`d3baf2c7`, `event-through`)**: nofog 996 · 1489행, after 0 · 0행 — FAIL. **r02b**: nofog 996 / 1489행 · after 996 / 1489행(탭 1초 / 4초 뒤) — 통과.
  - **(e) 띠 안에서 시작한 끌기가 스크롤한다**: `s8 <번들> bandrag`의 `S8-bandrag-<번들>-rest` ↔ `-dragged`를 `barscan.py diff`로 비교한다. `nofog`가 `> 0`인데 `after`가 0이면 **FAIL**(fog가 끌기를 삼켰다). **r02 첫 실행**: nofog 150행 · after 0행 — FAIL. **r02b**: nofog 150행 · after 183행 — 통과.
  - **(d) 답한 뒤**(r02 첫 실행은 **판정 불가** — nofog는 답이 서고 after는 탭이 막혀 같은 지점이 안 나왔고 액션 행 화면에 닿지 못했다. r02b에서 둘 다 판정이 섰다): test-plan은 「액션 행이 선 뒤의 화면이 `nofog`와 다른 행 0」이라 적었다. **듣기는 보기를 고르면 액션 행이 서지 않고 버튼 없이 스스로 넘어가는 구간(`advance`)에 든다**(계약 r02.5, `LearningShell`은 액션 행이 있을 때만 기존 fog) — 그 구간에도 새 fog가 **남는다**. 그래서 두 단계로 나눈다.
    1. **고른 직후(`answered-1` · `answered-2`)**: `nofog`와 `after`의 같은 캡처를 비교해 **띠 밖 0**(`fogband.py split`). 띠 안의 차이는 기대된 것이다(fog가 남는다) — `fade`로 재고 기록만 한다. 화면이 시간으로 움직이면(자동 넘김 · 정오 표시의 전환) 띠 밖이 달라질 수 있다 — 같은 번들을 두 번 떠서 잡음을 가른다.
    2. **액션 행이 선 화면(세션을 마친 뒤의 마치기)**: `nofog`와 **전체 0**(기존 fog는 불변이므로, 새 fog · 끝 상자가 없어야 한다). **닿는 길(r02b 실측)**: 시드 `audioProgress`의 듣기 유닛은 **1문항**이다. `s8 <번들> answer`로 보기를 고르면(`TAPX=540 TAPY=2200`) 탭 **4초 뒤**(`S8-answer-<번들>-answered-2`)에 「All questions done / See results」 화면이 선다 — 이 화면이 액션 행 화면이다. 두 번들의 `answered-2`를 `python3 "$OUT/barscan.py" diff`로 비교해 **0**을 판정한다(r02b: 전체 0행). 문항이 더 있는 유닛에서는 화면이 다르다 — 그때는 닿은 화면을 적는다. 못 닿으면 **「도달 실패」**로 적는다(통과가 아니다). 이 단계의 ui 쪽 근거는 LF2 · LF6 · LS1이다.
- **구현 전의 기대**: `nofog`에는 fog가 없으므로 (a)의 「띠 안 > 0」이 성립하지 않는다.

### S9 — 글꼴 1.0(기본): 띠 밖은 그대로이고, 새 스크롤이 생기는가

- **왜 보는가 — ADR-0022의 미결 위험**: ADR-0022는 「작업 영역 아래를 비우면 항목이 다 보이는 문항에서도 스크롤이 생긴다 — 실기에서 그렇게 보였다」고 적었다. r02의 학습 화면은 답하기 전에 스크롤 내용 끝에 **40dp 끝 상자**를 더한다 — 내용이 스크롤 영역 아랫변 40dp 안쪽까지 차 있는 문항은 **구현 전에는 스크롤되지 않던 것이 최대 40dp(105px) 스크롤된다.** 계약은 이것을 대가로 받았지만 기본 글꼴에서 실제로 일어나는지는 **기기에서 본 적이 없다**(계약 r02.5의 「기본 글꼴에서 달라지는가」는 추론이다). S9가 이것을 **명시적으로 판정**한다.
- **기기 · 빌드**: Android 에뮬레이터 · 글꼴 **1.0** · 번들 `nofog` ↔ `after`. 안내 대상이 아닌 종류(피드백 · 듣기)는 `before`(`296e2eac`)에서도 한 번씩 같은 측정을 해 `nofog`와 같은지 본다.
- **대상**: 기본 글꼴에서 닿는 학습형마다 + 피드백. 닿는 길은 [`learning-item-guides.md`](learning-item-guides.md)의 「단원별 도달 — Android」 표를 따른다.

  | 대상 | 시드 / 길 | 비고 |
  |---|---|---|
  | 피드백 | 로그인 픽스처 → 설정 탭 → Send feedback(글꼴 1.0 `540 948`) | 아래 `s9fb` |
  | 듣기 | `-e audioProgress true` → `lenter`(글꼴 1.0 Start 범위 `1300 2150`) | 아래 `s9ls`. 보기 2개(보기가 더 많은 문항은 배정표가 듣기로 열지 않는다) |
  | 문장 순서 | 시드 없음 — 표지를 건너뛰어 `greeting` (그 문서의 `sentence-order` 줄). **닿는 길(r02 실측)**: 표지의 `Skip`(`156 2200`) → 확인창의 `Skip`(`540 1237`) → 완료 카드의 `Back to map`(`540 2043`) → 맵에서 `greeting`을 연다. `Back to map`을 누르지 않으면 맵이 안 나온다. 조각 2는 `Making plans`(`appointment`) | **첫 열기에는 안내 오버레이가 뜬다 — 화면 가운데를 눌러 닫은 뒤** 캡처한다. 두 번들 모두 안내가 있다(`nofog`는 `38fddfc1` 소스) |
  | 단어 선택 | 제품에서 닿지 않는다(배정표가 `introduction`을 문장 순서로만 보낸다) | 닿으면 그것도. 보기 4개짜리라 이 케이스가 가장 걸릴 만하다 — 못 닿았다고 적는다 |
  | 말하기 | `-e speechProgress true` | **대조군**(달라지지 않아야 한다) — 안내를 닫은 뒤 한 장 |
  | 쓰기 | `-e writingProgress true` | **대조군** — 안내를 닫은 뒤 한 장. 그리기 표면이라 **끌지 않는다**(끌면 획이 그려져 diff가 거짓이 된다) |

  **듣기 말고 보기가 많은 학습형도 닿는 대로 본다** — 이 시드로 닿는 학습형이 보기 둘의 듣기뿐이면 「보기가 많은 문항은 못 봤다」를 결과에 적는다.
- **조작 · 캡처**
  ```sh
  # s9m 번들 이름 [nodrag] — 학습/피드백 화면이 서 있는 상태에서: 멈춘 캡처 → 띠 바로 위에서 위로 끌기 → 멈춘 캡처 → 되돌리기 → 멈춘 캡처
  # 끌기 시작점은 STRIP_Y0 - 30(스크롤 영역 안, 띠 바로 위). 시작점 아래에 눌리는 칩 · 입력란이 있으면 DRAGX를 바꾼다(빈 배경 위)
  s9m() {
    local W=$1 N=$2 Y=$((STRIP_Y0 - 30)) X=${DRAGX:-540}
    shot "S9-$N-$W-rest"
    [ "$3" = nodrag ] && return 0
    A shell input swipe "$X" "$Y" "$X" $((Y - 400)) 1200; sleep 3; shot "S9-$N-$W-dragged"
    A shell input swipe "$X" $((Y - 400)) "$X" "$Y" 1200; sleep 3; shot "S9-$N-$W-back"
    echo -n "$N $W 끌린다(rest↔dragged): "; python3 "$OUT/barscan.py" diff "$OUT/S9-$N-$W-rest.png" "$OUT/S9-$N-$W-dragged.png"
    echo -n "$N $W 되돌아왔다(rest↔back): "; python3 "$OUT/barscan.py" diff "$OUT/S9-$N-$W-rest.png" "$OUT/S9-$N-$W-back.png"
    echo -n "$N $W 이동량: "; python3 "$OUT/fogband.py" shift "$OUT/S9-$N-$W-rest.png" "$OUT/S9-$N-$W-dragged.png"
  }
  s9fb() { fbenter "$1" 540 948 || return 1; s9m "$1" feedback; }        # 글꼴 1.0의 Send feedback 좌표(r02 실측). 다른 기기는 캡처로 읽는다
  s9ls() { lenter "$1" 1300 2150 || return 1; s9m "$1" listening; }      # 글꼴 1.0의 Start 범위(r02 실측)
  setfont 1.0                              # 이미 1.0이면 생략
  for W in nofog after; do s9fb $W; s9ls $W; done
  s9fb before; s9ls before                 # 보조: 안내 없는 두 종류만
  # 문장 순서 · 말하기 · 쓰기: 그 문서의 길로 화면에 들어가 안내를 닫은 뒤 같은 함수를 부른다
  #   s9m nofog sentence-order; s9m after sentence-order;  s9m nofog speaking nodrag; s9m after speaking nodrag;  s9m nofog writing nodrag; ...
  ```
  말하기는 카드가 스크롤하는 가지라(`scrollCard`) 끌어도 되지만 대조군이므로 `nodrag`로 멈춘 캡처만 비교한다.
- **판정** — 종류마다 아래 넷을 적는다.
  1. **띠 밖 다른 행 0**(**FAIL 조건**): `python3 "$OUT/fogband.py" split "$OUT/S9-<종류>-nofog-rest.png" "$OUT/S9-<종류>-after-rest.png"`가 종료 코드 0. 띠 밖이 한 행이라도 다르면 FAIL — fog가 띠 밖을 건드렸거나 스크롤 영역의 레이아웃이 바뀐 것이다. **말하기 · 쓰기(대조군)는 화면 전체 0**(`barscan.py diff`).
  2. **띠 안의 차이**: 기대값은 0(`split`의 띠 안 행 수). 0이 아니면 **FAIL이 아니라 기록 + root 보고**한다 — 어느 학습형 · 어느 요소가 걸렸는지(캡처를 열어 띠에 걸린 보기 · 문구를 적는다)와 `fade` 출력을 적는다. 계약 r02.8의 design 되돌림 조건 ①이다(「기본 글꼴에서 학습 화면의 모습이 달라진다」). 기본 글꼴 학습 화면의 사용자 결정 알림(r02.8)이 이 보고에 달려 있다.
  3. **새로 생긴 스크롤 — 명시적으로 판정한다.** `rest↔dragged`의 다른 행 수를 `nofog`와 `after`에서 비교한다.

     | `nofog` 끌림 | `after` 끌림 | 판정 |
     |---|---|---|
     | 안 끌림(0) | **끌림(> 0)** | **새로 생긴 스크롤.** FAIL이 아니라 **기록 + root 보고**(ADR-0022의 미결 위험이 실제로 일어났다 — 끝 상자 40dp를 design이 다시 판단한다). 이동량(`shift`)이 105px 이하이면 끝 상자가 만든 스크롤로 읽는다. 이동량 · 종류 · 보기 개수를 적는다 |
     | 끌림 | 끌림 | 원래 스크롤되던 문항. 새 스크롤이 아니다. 이동량이 `nofog`보다 큰지(끝 상자만큼 105px) 적는다 |
     | 안 끌림 | 안 끌림 | 스크롤 없음 — 정상. 내용이 띠 위에서 끝났다 |
     | 끌림 | **안 끌림** | **FAIL** — 스크롤이 막혔다(fog가 터치를 삼켰거나 `enable-scroll`이 바뀐 회귀) |

     `rest↔back`이 0이 아니면 끌기를 되돌리지 못한 것이다(위쪽 끝에 못 닿았거나 끌기 길이가 모자라다) — 이동량 판정에 쓰지 않고 다시 한다. 시작점이 스크롤 영역 밖이면 「안 끌림」으로 잘못 읽는다 — 캡처로 시작점이 영역 안인지 본다.
  4. **보조 — 구현 전과의 대조**(피드백 · 듣기): `before`의 같은 측정이 `nofog`와 같은가(끌림 여부 · `rest` 캡처의 띠 밖). 다르면 `nofog` 이후의 다른 커밋(학습 안내 · 스캐폴드의 순수 이동)이 모습을 바꾼 것이다 — 적고, S9의 기준은 `nofog`로 둔다.
- **구현 전의 기대**: 해당 없음(전후 비교다).
- ⟨2026-10-09⟩ **닫힘 — 이 관찰의 대상 상태가 없어졌다.** 작업 `learning-shell-large-font` 뒤의 번들에서 글꼴 2.35는 합친 흐름이라 보기 영역 높이 0이 아니다. 아래는 그 전 번들(이 절차의 번들)에서만 뜻이 있다 — 돌린 기록은 없다.
- **관찰만 하는 것 — 판정 없음**: 글꼴 **2.35**에서 학습 화면(보기 영역 높이 0 — E1 상태)을 `nofog`와 `after`로 한 장씩 뜬다. fog 상자는 루트 바닥 기준이라 보기 영역 대신 **무대 카드 · 지시문의 아래 40에 겹쳐 그려질** 수 있다(계약 r02.6-3, E1의 입력). 이 문서는 판정하지 않는다 — 한 장씩 열어 카드 아랫부분이 흐려졌는지만 적는다.
  ```sh
  setfont 2.35
  for W in nofog after; do lenter $W && shot "O1-learning-f235-$W"; done      # Start 범위가 모자라면 캡처에서 읽어 lenter $W Y0 Y1로 준다
  fontscale_restore
  ```

### r02에서 기기에 닿지 않는 것

- **iOS의 fog는 보지 않는다.** iOS 시뮬레이터에는 **제품 경로(`main` 번들)로** 로그인 뒤 화면(피드백 · 학습 껍데기)에 닿는 수단이 없다(계약 r02.6-5). dev playground 번들로는 학습 듣기에 닿는다(계약 r03.10.1 · [성능 보고서](../performance/reports/hide-scrollbars-learning-listening-iphone-17-pro-simulator-01.md)) — 그 실행은 성능만 쟀고, 이 절차는 그 번들로 fog의 모습 · 터치를 보는 케이스를 정의하지 않았다. `Fog`가 iOS에서 그려진다는 것은 출시된 화면(여정 입장 · 학습 껍데기의 기존 fog)이 근거일 뿐 **이 두 화면에서는 미확인**이다. S5(playground 번들의 여정 맵)는 r02와 무관하게 그대로다.
- **TalkBack**(fog가 낭독 · 초점에 끼지 않는가)은 accessibility 재실행의 몫이다 — 재실행 2에서 닫혔다(위 「실행 상태」).
- **E1 상태(글꼴 2.35 이상, 2.0 + 밀도 540)에서 fog는 단서가 못 된다.** 그 상태는 보기 영역 높이가 0이라 띠 밑에 스크롤 내용이 없고, 위 관찰 한 장은 모습만 본다. fog가 서 있다는 사실은 「넘침 단서가 있다」의 증거가 못 된다. ⟨2026-10-09⟩ 그 상태는 `learning-shell-large-font` 뒤 합친 흐름이 된다 — 이 절차의 기록은 그 전 번들의 것이다(위 「이 절차로 확인되지 않는 것」의 같은 주).
- **로그인 · 코드 검증**에는 fog가 없다(사용자 결정의 범위가 두 화면). 이 절은 그 둘을 보지 않는다.

## 구현 전후 비교 — 요약

| 항목 | 구현 전(red) | 구현 뒤 | 판정 규칙 |
|---|---|---|---|
| S1 | 맵 672px · 학습 137px · 피드백 1637px 스크롤 중 `BAR` — 먼저 확인 | 같은 화면 스크롤 중 전부 `none` | 구현 전 `BAR` ↔ 같은 조건 HEAD `none`의 대조로만. 구현 전 `BAR` 없으면 판정 불가 |
| S2 | 통과(가드) | 통과 | 스크롤 · 탭이 막히면 FAIL |
| S3 | — | 멈춘 캡처의 다른 행 0 | 구현 전 · 뒤 두 번들 비교 |
| S4 | 구현 뒤와 같음 | 같음 | 바가 보이면 계약 밖 보고 |
| S5 | 인디케이터가 **보여야** 한다 | 안 보임 | 구현 전에 안 보이면 미확인 |
| S3(r02) | — | fog 없는 화면 0행 · 피드백 / 학습은 **띠 밖 0행** | `before` ↔ `after`. 띠 안 차이는 FAIL이 아니다 |
| S6 | 진입 후 0.5~1.5초 구간 캡처에 `BAR`(`before`) | 8장 모두 `none` | `before`에서 `BAR`가 없으면 판정 불가 |
| S7 | `nofog`는 띠 안 차이의 기준 | 띠 안만 다름 · `FADE` · 끝에서 `Send` 안 가려짐 · 띠 안 탭이 먹음 · 띠 안에서 시작한 끌기가 스크롤 · (f) 자판이 올라와도 입력 중인 줄이 띠에 머물지 않고 `Send`가 눌림(미실행) | 띠 안 내용이 없으면 판정 불가. `nofog`는 되는데 `after`가 안 되면 FAIL |
| S8 | 같음(글꼴 2.2 듣기) | 같음 + 띠 안 탭 · 띠 안 시작 끌기가 먹음 + 답한 뒤 띠 밖 0 | 액션 행 화면에 못 닿으면 도달 실패 |
| S9 | `nofog` ↔ `after`(글꼴 1.0) | 띠 밖 0(FAIL 조건) · 띠 안은 기록 · **새 스크롤은 기록 + root 보고** | 표대로 4가지 |

## 실행 결과

| 날짜 | 실행자 | 커밋(구현 뒤) | 기기 · 빌드 | 항목 | 결과 · 캡처 |
|---|---|---|---|---|---|
| 2026-10-08 | test-runner | `723e3c99`(구현 `6992df0f`) · 구현 전 `296e2eac` | emulator-5554 Pixel_8 API 37 · debug + androidTest · 번들 `before` `0a1c34fb…8ce` / `after` `46bc6dd0…989`(서버 18790) | S1 여정 맵 | 구현 전 BAR 672px(재실행 619px) → HEAD none. `S1-map-before-a` `S1-map-before-2-a` / `S1-map-after-a` `-b` |
| 같음 | 같음 | 같음 | 같음 · 글꼴 2.0 | S1 학습 화면 | 구현 전 BAR 137px · 하향 214px → HEAD 6장 none(스크롤됨, rest와 233행 다름). `S1-learning-before-a` `S1-learning-before-down-a` / `S1-learning-after-*` |
| 같음 | 같음 | 같음 | 같음 · 글꼴 2.0 | S1 피드백 | 구현 전 BAR 1637px → HEAD none(144px는 카드 테두리, 규칙 3). 1815행 다름. `S1-feedback-before-a` / `S1-feedback-after-a` `-b` |
| 같음 | 같음 | 같음 | 같음 · 글꼴 2.0 | S1 설정 · 프로필 · 롤플레이 세로 | **판정 불가** — 안 넘침(rest 대비 0행). `S1-settings-*` `S1-profile-after-*` `S4-*-rest` |
| 같음 | 같음 | 같음 | 같음 | S1 알림 | **닿지 못함** — 권한 대화상자 뒤 앱 밖 시스템 설정 화면. 대화상자 위 1920px는 오버레이 거짓 BAR. `S1-notif-after-a` `notif2-b` |
| 같음 | 같음 | 같음 | 같음 | S2 | **통과** — 맵 · 학습 두 방향, 맵 유닛 탭 → 학습 화면, 피드백 위로 끌기(1815행). 피드백 아래로 복귀 · `enable-scroll` 잠금은 **미실행**. `map-*-back` `S1-learning-*-down-after` |
| 같음 | 같음 | 같음 | 같음 | S3 | **통과** — 맵 · 학습 · 설정 · 피드백 스크롤 전 멈춘 캡처 구현 전 ↔ 뒤 0 / 2268 ×4. `S3-*-rest` |
| 같음 | 같음 | 같음 | 같음 · 글꼴 1.0 | S4 | **통과(바 없음)** — 가로 카드 줄 한 곳, 구현 전 · 뒤 모두 가로 바 안 보임(눈). `S4-before-a` `S4-before-slow-1` / `S4-after-a` `S4-after-slow-1` |
| 같음 | 같음 | 같음 | iPhone 17 Pro 시뮬레이터(iOS 26.5) · Debug Host · dev playground(구현 뒤 3001 · 구현 전 3002) | S5 | **통과(한정)** — 4초 끌기 24프레임: 구현 전 22프레임 인디케이터, HEAD 0, 스크롤됨. 깜빡임 12장 0.3초 간격 안 찍힘(부재 증거 아님). `ios/S5b-*-f01..24` `ios/S5-flash-*` |

위 표는 **r01 실행**(HEAD `723e3c99`)이다. r02 첫 실행은 아래 표다. 돌리면 같은 날 줄을 더한다(날짜 · 실행자 · 구현 뒤 커밋 · `nofog` 커밋 · 번들 sha256 셋 · 띠의 실측 범위 · 케이스별 판정).

### r02 첫 실행 (2026-10-08 ~ 09) — FAIL (제품 결함 1건, `f7c25aa6`에서 수정, 재실행 r02b에서 PASS)

실행자 test-runner. 구현 뒤 = `d3baf2c7`(`event-through` 시절), `nofog` = `5782bacd`, 구현 전 = `296e2eac`. 번들 sha256: before `0a1c34fb…8ce` / nofog `8ac1c4d2…492` / after `2841a648…985`(셋 다 다름). 기기 emulator-5554 Pixel_8 API 37, 1080x2400, 420dpi, 내비 모드 2, TalkBack 없음. 캡처 · 도구 · 로그는 `.agent-harness/work/hide-scrollbars/artifacts/e2e-r02/`(저장소 밖). 근거 수준: [실측] 기기 관찰, [추론].

| 케이스 | 결과 | 근거 |
|---|---|---|
| S3 피드백(2.0) | 통과 [실측] | before↔after 멈춘 화면 띠 밖 0행, 띠 안 96행 |
| S3 학습(2.0 듣기) | 통과 [실측] | 띠 밖 0행, 띠 안 92행 |
| S6 진입 직후 연속 8장(피드백 2.0) | 통과 [실측] | before: 탭 후 607 · 1006 · 1397ms 프레임에 BAR(x1034, y353~2060, 1708px, `#B0AFAE`, 눈으로도 확인), 1.97초 이후 none(144px 카드 테두리). after: 8장 + settled 전부 none |
| S7(a) 피드백 3.0 띠 안 | 통과 [실측] | 다른 행 2169~2221(53행)이 전부 띠 안, 띠 밖 0, `FADE`. `band`는 CHECK(짧다) — 내용이 y2221에서 끝나 그 아래가 빈 배경이라서(두 구간 · 바닥 붙음 아님) |
| S7(b) 끝까지 내림 | 통과 [실측] | `Send` 박스 y~1830~2094로 띠 위, 띠 FLAT, nofog↔after 끝 화면 0행 |
| S7(c) 띠 안 탭 | **FAIL [실측]** | 다섯째 보기 y2175 · y2195 탭: nofog 선택됨(233행), after 0행(2회 재현). 띠 위 y2100은 after도 선택됨(233행) |
| S7(d) 띠 안에서 시작한 끌기 | **FAIL [실측]** | y2200 시작: nofog 1821행 스크롤, after 0행 |
| S8(a) 학습 2.2 띠 안 | 통과 [실측] | band 2169~2273(105px) OK, 띠 밖 0, `FADE`. 「Hello」 아랫부분이 옅어짐 |
| S8(b) 끝까지 내림 | 통과, 소견 있음 [실측] | 마지막 보기(Thank you) 아랫 테두리 y2166, 띠 FLAT. 단 끝 상자 때문에 보기 위쪽이 고정 카드 아래로 말려 들어가 라벨 윗부분이 잘려 보임(`S8-drag2-after-end`). nofog는 테두리 y2272, 라벨 온전 |
| S8(c) 띠 안 탭(답하기) | **FAIL [실측]** | Hello y2200 탭: nofog 답이 받아들여짐(996 · 1489행), after 0 · 0행 |
| S8(e) 띠 안 시작 끌기 | **FAIL [실측]** | nofog 150행, after 0행 |
| S8(d) 답한 뒤 띠 밖 0 | **판정 불가** | nofog는 답이 서고 after는 탭이 막혀 같은 지점이 안 나옴. 액션 행 화면은 닿지 못함(도달 실패) |
| S9 | 아래 표 | 닿는 학습형 전부 통과 |

**S9 — 기본 글꼴 1.0, nofog ↔ after** (끌기 시작 y2137, 400px 위로):

| 학습형 | ① 띠 밖 차이 | ② 띠 안 차이 | ③ 새 스크롤 | 이동량 | ④ 밀림 · 잘림 |
|---|---|---|---|---|---|
| 듣기(보기 2) | 0 | 0 (띠 안 내용 행 0 — 내용이 y~1820에서 끝남) | 없음(nofog 0 · after 0 · before 0) | 0px | 없음 |
| 문장 만들기 조각 1 `greeting` | 0 | 0 (내용 행 0) | 없음 | 0px | 없음 |
| 문장 만들기 조각 2 `Making plans` | 0 | 0 (내용 행 0) | 없음 | 0px | 없음 |
| 말하기(대조군, nodrag) | 전체 0 | 0 (액션 행 있음: 기존 fog, 같음) | 끌지 않음 | — | 없음 |
| 쓰기(대조군, nodrag) | 전체 0 | 0 | 끌지 않음 | — | 없음 |
| 피드백 | 전체 0 | 0 (내용 행 0, 폼이 y~1740에서 끝남) | 없음(nofog 0 · after 0 · before 0) | 0px | 없음 |

- 새 스크롤은 **닿은 어느 학습형에서도 안 생겼다** [실측]. 닿은 학습형은 모두 내용이 y 1900 이하에서 끝나 띠(2167~2273)에 못 닿는다. before=nofog(듣기 · 피드백 rest 0행).
- 보기가 많은 문항(단어 선택, 보기 4)은 제품에서 닿지 않아 **못 봤다.** 이 기기의 기본 글꼴에서는 ADR-0022 위험이 나타나지 않았지만, 내용이 띠에 닿는 문항(보기 4 · 작은 화면)은 **미확인**이다. 글꼴 2.2에서는 끝 상자가 마지막 보기를 105px 올려 `nofog`는 150행 · `after`는 183행 스크롤(둘 다 원래 스크롤되는 문항).
- 전후 캡처: `S9-listening-nofog-rest` / `S9-listening-after-rest`, `S9-feedback-*`, `S9-sentence-order-*`, `S9-makingplans-*`, `S9-speaking-*`, `S9-writing-*`, 각 `-dragged` `-back`.

**소견(눈) — 판정 아님**:
- 피드백 3.0(`S7-nofog-rest` ↔ `S7-after-rest`): 다섯째 보기의 아랫 테두리가 검정에서 회색으로 옅어지나(y2220: `#141115` → `#878586`) 변화가 12~50px 구간뿐이라 「아래에 더 있다」는 단서로는 **약하다.** 보기가 온전히 보이고 그 아래가 비어 있어 「잘림」이 아니라 「끝」으로도 읽힌다.
- 학습 2.2(`S8-drag-nofog-rest` ↔ `S8-drag-after-rest`): Hello 글자 아랫부분과 박스 아래가 눈에 띄게 옅어져 「아래로 이어진다」로 읽힌다. 2.0(`S3-learning-after-rest`)에서는 둘째 보기 「Thank you」 윗부분이 옅게 보여 단서가 더 뚜렷하다.
- 대가: 끝까지 내리면 끝 상자가 마지막 보기를 올려 라벨 윗부분이 고정 카드에 가려진다(2.2). ⟨2026-10-09⟩ 뒤 작업(`learning-shell-large-font`)에서 2.2는 합쳐져 이 모습이 사라졌다 — S8(b)의 ⟨2026-10-09⟩ 주.

기기 상태는 끝에 원복했다(글꼴 1.0, 전역 설정 diff 0, 서버 18790 종료, 계측 프로세스 없음, 앱 데이터는 `pm clear`로 초기 상태).

### r02 첫 실행에서 찾은 결함

**제품(1건, 높음) — 고침, 재실행 r02b에서 확인.** `event-through={true}`를 단 fog 상자(`.feedback-screen-fog`, `.learning-shell-rest-fog`; `Fog` 안쪽에도)가 Android에서 띠 안의 탭과 끌기를 삼켰다(피드백 3.0 · 학습 2.2, 재현 2회 이상, nofog 대조). 띠에 걸린 보기는 아랫 반을 누를 수 없고, 띠 안에서 시작한 끌기는 스크롤하지 않았다. 원인: `event-through`는 LynxView 밖의 네이티브 뷰로 터치를 보내는 용도이고 Lynx 안의 형제 요소로는 내려보내지 않는다(저장소에 같은 관찰의 선례: `EpisodeNarrativeScreen.tsx`의 주석). 수정 `f7c25aa6`: 두 상자에서 `event-through`를 빼고 `user-interaction-enabled={false}`(Lynx 4.0.1 `LynxBaseUI.hitTest`가 `isUserInteractionEnabled`가 false인 자식을 건너뜀 [코드 확인]; iOS `LynxUI.m shouldHitTest`도 같음 [코드 확인 · 기기 미확인]). 구현자의 기기 실측은 위 「실행 상태」에 있다. 이 절차를 따른 독립 재실행(r02b)이 같은 값으로 확인했다.

**절차(이 문서) 결함 7건 — 이 개정에서 고침.**

| # | 결함 | 고친 곳 |
|---|---|---|
| 1 | `fixture`의 `waitre`가 이전 앱 화면(스플래시 · 맵)에 맞아 앱이 서기 전에 진행됨 | `fixture`: `sleep 6` 후 waitre, 뒤에 `sleep 3` |
| 2 | 피드백 좌표가 글꼴마다 다름: 1.0 `540 948`, 3.0 `540 1206` (문서의 `360 1012`는 2.0 값) | `fbenter` 주석 · S7 준비 · `s9fb` |
| 3 | S7(c) · S8(c)의 「띠 안 좌표」 예시가 없음 | 보기 위치에서 y2195 ~ 2200 (S7: 2175 · 2195, S8: 2200) |
| 4 | S8의 끌기 시작점 y2000은 2.2에서 고정 카드 위라 스크롤이 안 됨 | S8 `s8`: y2120 |
| 5 | 학습 `lenter`의 Start 탐색 범위가 글꼴마다 다름(2.2의 Start는 y2243; `1750~2150`이 놓침) | `lenter` 인자 `Y0 Y1`: 1.0 `1300 2150` · 2.0 `1800 2400` · 2.2 `2150 2350` |
| 6 | S9(c) 등의 「band OK」는 내용이 띠 아래까지 안 닿으면 CHECK(짧다)로 나옴 | 「`band`가 CHECK(짧다)를 내는 정상 경우」 + 도구 출력 문구 |
| 7 | 문장 만들기 `greeting`에 닿는 길 | S9 표: 표지 Skip(`156 2200`) → 확인 Skip(`540 1237`) → 완료 카드 Back to map(`540 2043`) → open |

실행 쪽이 추가 조사로 찾은 「띠 안에서 시작한 끌기」는 이 개정에서 정식 케이스(S7(d) · S8(e))가 되었다 — nofog와의 대조로 판정한다.

캡처는 저장소에 없다(실행 증거 폴더 `.agent-harness/work/hide-scrollbars/artifacts/e2e/{android,ios}`). 기기 상태는 끝에 원복했다(글꼴 1.0, 전역 설정 diff 0, 번들 서버 종료).

### r02b 재실행 (2026-10-09) — PASS (수정 확인: 띠 안 탭 · 끌기가 nofog와 같은 행 수로 먹는다)

실행자 test-runner. 시작 시 HEAD = `c1a1138c`(기대와 같음). 번들(모의 값, 서버 18790, 루트 `static` 링크): `nofog` `5782bacd` sha `8ac1c4d2…492`(첫 실행과 같음) / `after` `c1a1138c` sha `fb395062…c904`(첫 실행 `2841a648…`와 다름 = 수정 반영). 호스트 · 계측 APK는 기기에 있던 것. 기기 emulator-5554 Pixel_8 API 37, 1080x2400, 420dpi, 내비 모드 2, 시작 시 TalkBack 꺼짐. 판정 근거는 전부 [실측] 기기 관찰이고 숫자는 `barscan.py diff`(다른 행 수 / 2268)와 `fogband.py`다.

| 케이스 | nofog | after (`c1a1138c`) | 결과 |
|---|---|---|---|
| S7(a) 피드백 3.0 띠 안 | — | 다른 행 2169~2221(53행) 전부 띠 안, 띠 밖 0, `FADE`(배경 쪽 35574 · 반대쪽 0), `band`는 CHECK(짧다 — 정상 경우의 네 조건 충족) | 통과 |
| S7(a) 첫 실행 after와 | — | 멈춘 화면 0행 | 수정 전 after와 동일 |
| S7(b) 끝까지 | — | nofog↔after 끝 화면 0행, 첫 실행 after 끝과도 0행 | 통과 |
| S7(c) 띠 안 탭 y2195 | 233행 | **233행**(눈으로 5 · Love it 선택 + 체크) | 통과(첫 실행 after 0행 → 233) |
| S7(d) 띠 안(y2200) 시작 끌기 | 1766행 | **1816행** | 통과(첫 실행 after 0 → 1816) |
| S8(a) 학습 2.2 띠 안 | — | 같은 실행 쌍(answer · bandrag): band 2169~2273 OK(105px) · 안 105 · 밖 0 · `FADE`. drag 쌍은 아래 주석 | 통과(주석) |
| S8(b) 끝까지 | — | 재측정 end가 첫 실행 after end와 0행. 마지막 보기 아래 2170~2272 FLAT | 통과(끝 상자의 대가는 같다: 「Thank you」 윗부분이 고정 카드에 가려짐) |
| S8(c) 띠 안 탭 y2200(답 처리) | 996 / 1489행(1초 / 4초 뒤) | **996 / 1489행** | 통과(첫 실행 after 0 / 0) |
| S8(e) 띠 안(y2200) 시작 끌기 | 150행 | **183행** | 통과(첫 실행 after 0) |
| S8(d)-1 고른 직후 띠 밖 | — | answered-1 nofog↔after: 띠 밖 0 · 띠 안 105(`FADE`, 기대: fog가 남는다) | 통과 |
| S8(d)-2 액션 행 화면 | 「All questions done / See results」 | **nofog↔after 전체 0행**(answered-2, 탭 4초 뒤) | 통과 — 이 화면이 액션 행 화면이다. 닿았다 |
| S9 듣기 1.0(끌기 y2137, 400px) | 끌림 0, 이동 0px | 띠 밖 0 · 띠 안 0(내용 행 0) · 끌림 0 · 이동 0px · back 0 | 새 스크롤 0 |
| S9 피드백 1.0 | 끌림 0, 이동 0px | 띠 밖 0 · 띠 안 0 · 끌림 0 · 이동 0px · back 0 | 새 스크롤 0 |
| S9 둘 다 첫 실행 after rest와 | — | 0행 · 0행 | 동일 |
| S6 after 1회(피드백 2.0, 8장 + settled) | — | 8장 모두 none(2~8번 144px 카드 테두리뿐, 1번 0px), settled none. 캡처 시각 ms [37, 515, 839, 1192, 1546, 1980, 2316, 2701] | 바 없음 |

주석 — S8(a) drag 쌍: 첫 `s8 after drag` 실행의 rest만 같은 번들의 다른 after rest(answer · bandrag · 재실행)와 32행 다르고(x153~692, y36~1621, 카드 영역; 눈으로 같아 보임) nofog와의 split이 띠 밖 38행(1455~1621)으로 나왔다. 같은 `after`를 다시 돌린 `S8-drag-after-rest`는 answer-after-rest와 0행, nofog와의 띠 밖 6행(nofog끼리도 6행 달라지는 잡음과 같은 양), 끝 화면은 첫 실행 after end와 0행. 첫 시도의 32행은 일회성 캡처 잡음으로 읽는다(**원인 미확인** — 캡처 `S8-drag-after-rest-run1.png` · `-end-run1.png`를 남겼다). 판정은 재측정과 answer · bandrag 쌍(띠 밖 0)에 둔다.

**r02b에서 확인되지 않은 것**
- 추가 관찰 4(기본 글꼴에서 띠 좌표 y≈2200의 조작부를 탭): 그런 화면에 닿지 않았다. 닿은 1.0 화면(듣기 · 피드백)은 내용이 y~1820 이하에서 끝난다. 관찰 없음.
- S3(2.0 멈춘 화면) · 문장 만들기 · 말하기 · 쓰기 · 단어 선택(보기 4) S9 재측정은 범위 밖이라 안 돌렸다. 내용이 띠에 닿는 기본 글꼴 문항은 여전히 미확인.
- 학습 2.2 S6 · 글꼴 2.35 · iOS · TalkBack · 다른 API.
- S8(a) drag 쌍 첫 시도 32행 일탈의 원인.

**r02b가 찾은 절차 결함 5건 — 이 개정에서 고침.**

| # | 결함 | 고친 곳 |
|---|---|---|
| 1 | 문서 S8 (c)(e)는 `bandrag`/`answer`인데 첫 실행 스크립트는 `stripdrag` 이름이었다 | S8 `s8` 주석: 케이스 이름은 `drag` · `bandrag` · `answer`뿐, `stripdrag`는 `bandrag`로 통일 |
| 2 | S8(a)의 `band`/`split` 판정 쌍이 어느 실행의 rest인지 없었다 — 같은 번들도 실행마다 rest가 흔들린다(관찰 기준 6행 — 32행은 설명되지 않은 한 건, 계약 r03) | S8(a): 같은 모드(같은 실행) 쌍 + 잡음을 가르는 규칙(다시 돌리기 · 같은 번들 rest끼리 비교) |
| 3 | S8(d)-2의 액션 행 화면 경로가 「닿은 적 없다」로 남아 있었다 | S8(d)-2: 듣기 유닛 1문항, 답한 뒤 4초에 「All questions done / See results」, nofog↔after 0행 |
| 4 | `lib.sh`의 `OUT`/`SP` 경로와 `run_*.sh`의 `. …/lib.sh` 절대 경로가 실행 폴더에 묶여 재실행마다 `sed`가 필요했다 | 「기기 · 빌드」: 스크립트 자신의 위치 기준으로 읽고 `OUT`은 호출 전에 `export` |
| 5 | 서버 루트 `static` 링크가 `nofog` 자산이 아닌 `after/static`을 가리켰다(자산 해시 파일은 같은 이름이라 영향 없어 보이나 확인한 것은 아님) | 「기기 · 빌드」: 링크 명령 · 어느 번들의 `static`인지 기록 · 이름 비교 |

기기 상태는 끝에 원복했다(글꼴 1.0, `globals` · `settings list` system · secure · global 전후 diff 0, 서버 18790 종료, 픽스처 중지 · 앱 force-stop · 런처, 일회용 사본 제거 · prune, 번들 스크래치 삭제, 추적 파일 수정 없음, 에뮬레이터 켜 둠).

## test-plan과 다른 점

- **S2의 「반대로 끌면 처음 캡처와 같다」**: 처음 캡처가 스크롤의 맨 위일 때만 성립하므로 **보조 판정**으로 낮췄다. 주 판정은 「반대로 끌면 내용이 다시 움직인다」다. 계약 단계의 저장 캡처가 스크롤 중 프레임이라 같음을 확인하지 못했다.
- **S3는 스크롤 전 멈춘 캡처끼리만 비교한다.** 스크롤 뒤 멈춘 캡처는 위치가 실행마다 달라 같지 않다(저장 캡처 측정: 1684 / 2268행) — test-plan이 「멈춘 캡처」라고만 적어 모호했던 것을 좁혔다.
- **S5는 playground 번들로 본다.** iOS에는 Android 같은 로그인 픽스처가 없고(토큰 심기는 PR #150 이후 통하지 않는다), 성능 보고서의 시뮬레이터 실행과 합치는 길은 이 문서가 확인하지 않았다. test-plan의 「성능 보고서와 같은 실행」과 같은 실행으로 묶이면 거기서 이 절차의 캡처를 함께 뜬다. ⟨2026-10-09⟩ **묶이지 않았다.** 성능 보고서([hide-scrollbars-learning-listening-iphone-17-pro-simulator-01](../performance/reports/hide-scrollbars-learning-listening-iphone-17-pro-simulator-01.md))는 계약 r03.10에 따라 playground 번들의 학습 듣기를 따로 쟀고, 그 실행이 이 절차의 캡처를 떴다는 기록은 없다. 로그인 픽스처가 없는 것은 제품 경로(`main` 번들)에 한한 이야기다(계약 r03.10.1).
- **`barscan.py`에 `diff` · `selftest`를 더했다.** 계약 단계의 판독 함수(`read_png` · `scan`)는 한 글자도 바꾸지 않았고, S2 · S3의 「다른 행」 비교와 도구 검사를 같은 파일에 넣었다.
- **구현 전 번들**은 main `296e2eac`로 고정했다(`7c5a79da`도 소스가 같다 — 계약 단계의 저장 캡처와 같은 기준이다).

r02(S3 수정 · S6 ~ S9)에서 test-plan `## r02`와 다르게 쓴 것:

- **「fog 전」 번들 커밋**: test-plan은 `38fddfc1`이다. 이 문서는 `5782bacd`로 적었다 — `38fddfc1`에 문서 한 파일(`docs/e2e/learning-item-guides.md`)만 더한 r02 스캐폴드 바로 앞 커밋이라 앱 소스가 같다. 어느 쪽으로 지어도 되고, 실행 결과에는 지은 커밋을 적는다.
- **S6의 연속 캡처 시각**: test-plan은 「0.4 ~ 0.5초 간격 8장」이다. 이 문서는 accessibility가 실제로 쓴 `burst`(기기 안 `screencap` 연속)를 그대로 옮겼고 간격을 고정하지 않는다 — 간격은 에뮬레이터 부하가 정하고 `-times.txt`로 기록한다. 판정은 프레임 번호가 아니라 **탭 후 0.5 ~ 1.5초 구간**이다.
- **S8(d) 「답한 뒤(액션 행이 선 뒤)」를 둘로 나눴다.** 듣기는 보기를 고르면 액션 행이 서지 않고 넘김 구간에 들며, 그 구간에도 새 fog가 남는다(계약 r02.5, ui의 LS1 · test-design이 코드로 확인). 그래서 고른 직후는 「띠 밖 0」, 액션 행이 선 화면은 「전체 0」이다. 후자는 r02 첫 실행에서 닿지 못했고, **r02b에서 닿았다** — 시드 `audioProgress`의 듣기 유닛은 1문항이라 답한 뒤 4초에 「All questions done / See results」가 서고, 두 번들이 전체 0행이었다(S8(d)-2의 「닿는 길」). 문항이 더 있는 유닛에서 못 닿으면 여전히 도달 실패다.
- **S9의 새 스크롤 판정을 표로 못박았다.** test-plan은 「그 화면이 끌리는지(새로 생긴 스크롤)도 함께 적는다」만 적었다. 이 문서는 `nofog` ↔ `after`의 끌림 여부 네 조합과 이동량(`shift`, 끝 상자 105px와의 대조)으로 판정하게 했다 — root가 `evidence.yaml`의 미결 위험(ADR-0022 「작업 영역 아래를 비우면 …」)을 닫을 수 있게 하려는 것이다. 「끌림 → 안 끌림」의 조합은 test-plan에 없는 FAIL이다.
- **띠 판독을 도구로 만들었다**: `fogband.py`(`band` · `split` · `fade` · `flat` · `px` · `shift`). test-plan은 `barscan.py diff`만 적었는데 그것은 띠 안 · 밖을 가르지 못한다. 구간 병합(48px) · 「짧다」(띠의 75%) · 띠 여유(±6px)는 내가 정한 값이고 실측 전이다.
- **S7의 좌표**: 글꼴 3.0의 Send feedback은 `540 1206`, 5점 보기 띠 안 탭은 y2175 · 2195(r02 첫 실행 실측; r01의 `360 1012`는 2.0 값). 다른 기기는 캡처에서 읽는다.
- **「띠 안에서 시작한 끌기」(S7(d) · S8(e))를 정식 케이스로 더했다.** test-plan은 띠 안 탭만 적었다. r02 첫 실행에서 실행 쪽이 추가 조사로 찾은 것이고(fog가 끌기도 삼켰다), 스크롤 영역 일부가 터치를 못 받는 결함은 탭만으로는 놓칠 수 있어 같은 nofog 대조로 판정하게 했다.
- **터치 통과의 근거를 바로잡았다.** 이 문서의 첫 개정은 fog 상자가 `event-through`라 터치가 통과한다고 적었으나, 그 속성은 Lynx 안의 형제로 터치를 내려보내지 않는다(r02 첫 실행). 수정 뒤의 상자는 `user-interaction-enabled={false}`이고, ui 테스트는 그 속성의 존재만 본다 — 실제 통과는 S7(c)(d) · S8(c)(e)의 몫이다.
- **S7(b)에 `barscan.py diff` 보조를 더했다**: 끝까지 내린 `nofog` ↔ `after`가 0이면 `Send`가 띠에 걸리지 않았다는 가장 센 증거다.

## 부록 — 도구

### `barscan.py`

아래 블록을 `$OUT/barscan.py`로 저장한다(Python 3 표준 라이브러리만 쓴다). 사용:

- `python3 barscan.py scan <png>...` — 파일마다 가장 긴 세로 연속 구간(열 x, y 시작~끝, 색)과 `BAR`(최소 길이 이상) · `none`. 전체 높이(1920px) 구간에는 거짓 `BAR` 표시가 붙는다. 환경변수 `BARSCAN_X0`(기본 1000) · `BARSCAN_X1`(기본 폭 끝, 제외) · `BARSCAN_MIN`(기본 200)을 화면별로 바꾼다 — 값은 「바 판독 규칙」 표.
- `python3 barscan.py diff <a.png> <b.png> [y0 y1]` — y 132~2400(상태바 아래)에서 다른 행의 수. 같으면 종료 코드 0.
- `python3 barscan.py selftest [계약 캡처 폴더 [e2e 캡처 폴더]]` — 합성 PNG로 도구를 검사한다. 폴더를 주면 저장 캡처도 같이 본다. 저장 캡처는 **저장소에 없으므로 경로 인자로** 받는다.

```python
#!/usr/bin/env python3
"""스크롤 바 판독 도구.
  barscan.py scan <png>...                  오른쪽 띠에서 세로로 길게 이어지는 좁은 회색 띠를 찾는다. 최소 길이 이상이면 BAR
  barscan.py diff <a.png> <b.png> [y0 y1]   두 캡처에서 y0~y1(기본 132~2400) 사이에 다른 행의 수 (S2 · S3)
  barscan.py selftest [계약 캡처 폴더 [e2e 캡처 폴더]]   합성 PNG로 도구를 검사한다. 폴더를 주면 저장 캡처도 검사한다
환경변수(scan): BARSCAN_X0(기본 1000) · BARSCAN_X1(기본 캡처 폭, 이 열은 제외) · BARSCAN_MIN(기본 200, px).
Pixel_8(1080x2400) 기준 좌표다. 어떤 값을 쓸지는 문서의 「판독 규칙」 표가 정한다."""
import os, sys, zlib, struct, tempfile

def read_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    p, idat, w, h, ct = 8, b"", 0, 0, 0
    while p < len(d):
        n, t = struct.unpack(">I4s", d[p:p + 8]); body = d[p + 8:p + 8 + n]; p += 12 + n
        if t == b"IHDR": w, h, bd, ct = struct.unpack(">IIBB", body[:10]); assert bd == 8
        elif t == b"IDAT": idat += body
    bpp = {2: 3, 6: 4}[ct]; raw = zlib.decompress(idat); stride = w * bpp
    rows, prev, q = [], bytearray(stride), 0
    for _ in range(h):
        f = raw[q]; line = bytearray(raw[q + 1:q + 1 + stride]); q += 1 + stride
        if f == 1:
            for i in range(bpp, stride): line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride): line[i] = (line[i] + (((line[i - bpp] if i >= bpp else 0) + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i - bpp] if i >= bpp else 0; b = prev[i]; c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, bpp, rows

def scan(path, x0=None, y0=260, y1=2180, x1=None):
    """가장 긴 세로 연속 구간 (길이, (x, 시작 y, 끝 y, 색)). x0 · x1을 안 주면 환경변수, 그것도 없으면 1000 · 폭 끝."""
    w, h, bpp, rows = read_png(path)
    x0 = int(os.environ.get("BARSCAN_X0", 1000)) if x0 is None else x0
    x1 = int(os.environ.get("BARSCAN_X1", w)) if x1 is None else x1
    px = lambda x, y: tuple(rows[y][x * bpp:x * bpp + 3])
    best = (0, None)
    for x in range(x0, min(w, x1)):
        run, start = 0, 0
        for y in range(y0, min(y1, h)):
            r, g, b = px(x, y)
            # 배경(밝은 면)보다 뚜렷하게 어두운 무채색 = 스크롤 바 후보
            if max(r, g, b) - min(r, g, b) <= 12 and r < 215:
                if run == 0: start = y
                run += 1
                if run > best[0]: best = (run, (x, start, y, (r, g, b)))
            else:
                run = 0
    return best

def full_height(n, y0=260, y1=2180):
    """구간이 스캔 높이 전체면 바가 아니라 오버레이 · 시작 화면이다."""
    return n >= y1 - y0

def verdict(n, minbar=None):
    minbar = int(os.environ.get("BARSCAN_MIN", 200)) if minbar is None else minbar
    return "BAR" if n >= minbar else "none"

def diff_rows(a, b, y0=132, y1=2400):
    wa, ha, _, ra = read_png(a); wb, hb, _, rb = read_png(b)
    if (wa, ha) != (wb, hb): return None
    y1 = min(y1, ha)
    return sum(1 for y in range(y0, y1) if ra[y] != rb[y]), y1 - y0

def write_png(path, w, h, paint):
    """paint(x, y) -> (r, g, b). 합성 캡처를 쓴다(필터 0)."""
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w): raw.extend(paint(x, y))
    def chunk(t, body):
        c = struct.pack(">I", len(body)) + t + body
        return c + struct.pack(">I", zlib.crc32(t + body) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(bytes(raw))) + chunk(b"IEND", b""))

# 저장된 e2e 캡처 판독표 — (폴더, 파일 이름, x0, x1, 최소 길이, 기대 판독, 기대 길이 또는 None)
# 값은 문서의 「판독 규칙」 표와 같다. MAP / LEARN / FEED는 Android, IOS는 iOS 시뮬레이터(1206x2622).
MAP, LEARN, FEED, DEF, IOS = (1000, None, 200), (1000, 1033, 100), (1000, None, 200), (1000, None, 200), (1000, None, 200)
E2E_CASES = (
    [("android", n, *MAP, v, k) for n, v, k in [
        ("S1-map-before-a", "BAR", 672), ("S1-map-before-2-a", "BAR", 619), ("S1-map-before-b", "none", None),
        ("S1-map-after-a", "none", None), ("S1-map-after-b", "none", None), ("S1-map-after-after", "none", None),
        ("S3-map-before-rest", "none", None), ("S3-map-after-rest", "none", None)]] +
    [("android", n, *LEARN, v, k) for n, v, k in [
        ("S1-learning-before-a", "BAR", 137), ("S1-learning-before-down-a", "BAR", 214),
        ("S1-learning-before-b", "none", None), ("S1-learning-before-down-b", "none", None),
        ("S1-learning-after-a", "none", None), ("S1-learning-after-b", "none", None),
        ("S1-learning-after-down-a", "none", None), ("S1-learning-after-down-b", "none", None),
        ("S3-learning-before-rest", "none", None), ("S3-learning-after-rest", "none", None)]] +
    [("android", n, *FEED, v, k) for n, v, k in [
        ("S1-feedback-before-a", "BAR", 1637), ("S1-feedback-before-b", "none", None),
        ("S1-feedback-after-a", "none", None), ("S1-feedback-after-b", "none", None)]] +
    # 거짓 BAR — 규칙을 어기면 이렇게 읽힌다(그래서 규칙이 있다)
    [("android", "S1-learning-before-a", 1000, None, 200, "none", None),     # D1: 200px 기준은 학습 화면의 진짜 바(137px)를 놓친다
     ("android", "S1-feedback-before-b", 1000, None, 100, "BAR", 144),        # D2: 100px로 낮추면 카드 테두리(x1035, #CBC9C9)가 BAR
     ("android", "S1-notif-after-a", 1000, None, 200, "BAR", 1920)] +         # D2: 권한 대화상자의 어두운 오버레이 — 전체 높이
    [("ios", "S5-flash-before-02", *IOS, "BAR", 1920)]                        # D2: iOS 검은 시작 화면 — 전체 높이
)

def selftest(stored=None, e2e=None):
    fails = []
    def expect(name, got, want):
        ok = got == want
        print(("ok   " if ok else "FAIL ") + f"{name}: {got} (기대 {want})")
        if not ok: fails.append(name)
    W, H, WHITE = 1080, 2400, (255, 255, 255)
    tmp = tempfile.mkdtemp()
    def make(name, paint):
        p = os.path.join(tmp, name + ".png"); write_png(p, W, H, paint); return p
    bar = lambda x, y: (176, 175, 174) if 1022 <= x < 1032 and 285 <= y < 957 else WHITE
    short = lambda x, y: (176, 175, 174) if 1022 <= x < 1032 and 285 <= y < 435 else WHITE
    light = lambda x, y: (238, 238, 238) if 1022 <= x < 1032 and 285 <= y < 957 else WHITE
    orange = lambda x, y: (244, 107, 24) if 1022 <= x < 1032 and 285 <= y < 957 else WHITE
    sc = lambda p, *a, **k: scan(p, *a, **k)[0]
    expect("합성 · 672px 회색 띠", verdict(sc(make("bar", bar), 1000, x1=W), 200), "BAR")
    expect("합성 · 빈 화면", verdict(sc(make("blank", lambda x, y: WHITE), 1000, x1=W), 200), "none")
    expect("합성 · 150px 짧은 띠(기준 200)", verdict(sc(make("short", short), 1000, x1=W), 200), "none")
    expect("합성 · 150px 짧은 띠(기준 100)", verdict(sc(make("short", short), 1000, x1=W), 100), "BAR")
    expect("합성 · x 범위 밖의 띠", verdict(sc(make("bar", bar), 1000, x1=1020), 200), "none")
    expect("합성 · 배경과 비슷한 옅은 띠", verdict(sc(make("light", light), 1000, x1=W), 200), "none")
    expect("합성 · 무채색이 아닌 띠", verdict(sc(make("orange", orange), 1000, x1=W), 200), "none")
    expect("합성 · 같은 캡처의 diff", diff_rows(make("a", bar), make("a2", bar)), (0, 2268))
    expect("합성 · 다른 캡처의 diff", diff_rows(make("b", bar), make("b2", short))[0] > 0, True)
    expect("합성 · 전체 높이 면", full_height(sc(make("dark", lambda x, y: (0, 0, 0)), 1000, x1=W)), True)
    if stored:
        want = {"base-00-map-rest": "none", "base-01-map-scrolling": "BAR", "base-02-map-scrolling": "BAR",
                "base-03-map-after": "none", "false-00-map-rest": "none", "false-01-map-scrolling": "none",
                "false-02-map-scrolling": "none", "false-03-map-after": "none",
                "false-04-map-scrolling-back": "none", "false-05-settings-scrolling": "none"}
        for name, v in want.items():
            expect("저장 캡처 " + name, verdict(sc(os.path.join(stored, name + ".png"), 1000, x1=1080), 200), v)
        n, info = scan(os.path.join(stored, "base-01-map-scrolling.png"), 1000, x1=1080)
        expect("저장 캡처 base-01 띠 크기", (n, info[0]), (672, 1027))
    if e2e:
        for sub, name, x0, x1, m, v, k in E2E_CASES:
            n, info = scan(os.path.join(e2e, sub, name + ".png"), x0, x1=x1)
            expect(f"e2e {sub}/{name} (x {x0}~{x1 or '끝'}, 최소 {m})", (verdict(n, m), n if k else None), (v, k))
        ios = lambda pre, rng: [sc(os.path.join(e2e, "ios", f"{pre}{i:02d}.png"), 1000, x1=None) for i in rng]
        before, after = ios("S5b-before-f", range(1, 25)), ios("S5b-after-f", range(1, 25))
        expect("e2e iOS 구현 전 24프레임 중 BAR(200px)", sum(1 for n in before if n >= 200), 22)
        expect("e2e iOS 구현 전 BAR 프레임 번호", [i + 1 for i, n in enumerate(before) if n >= 200], list(range(3, 25)))
        expect("e2e iOS HEAD 24프레임 중 BAR(200px)", sum(1 for n in after if n >= 200), 0)
        fl = lambda w, i: sc(os.path.join(e2e, "ios", f"S5-flash-{w}-{i:02d}.png"), 1000, x1=None)
        expect("e2e iOS 시작 화면(f02~f05, 구현 전 · 뒤) 전체 높이 거짓 BAR", all(full_height(fl(w, i)) for w in ("before", "after") for i in range(2, 6)), True)
        expect("e2e iOS 화면이 뜬 뒤(f06~f12, 구현 전 · 뒤) BAR 없음", [fl(w, i) >= 200 for w in ("before", "after") for i in range(6, 13)].count(True), 0)
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1

if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["selftest"]:
        sys.exit(selftest(a[1] if len(a) > 1 else None, a[2] if len(a) > 2 else None))
    elif a[:1] == ["diff"] and len(a) >= 3:
        r = diff_rows(a[1], a[2], *[int(v) for v in a[3:5]])
        if r is None:
            print("크기가 다르다 -> 비교 불가"); sys.exit(2)
        print(f"다른 행 {r[0]} / {r[1]}"); sys.exit(0 if r[0] == 0 else 1)
    elif a[:1] == ["scan"] and len(a) >= 2:
        for f in a[1:]:
            n, info = scan(f)
            note = " — 전체 높이: 오버레이 · 시작 화면(거짓 BAR)" if full_height(n) else ""
            print(f"{f.split('/')[-1]}: longest={n}px {info} -> {verdict(n)}{note}")
    else:
        print(__doc__); sys.exit(64)
```

### `orange.py`

캡처에서 주황색(`#F46B18` 근처 — 유닛 원 · Start 버튼) 픽셀의 중심을 읽는다. `$OUT/orange.py`로 저장한다(`barscan.py`와 같은 폴더).

```python
import sys
from barscan import read_png
# orange.py png x0 x1 y0 y1  -> 영역 안 주황 픽셀의 중심 x y n, 500픽셀 이하면 none
p,x0,x1,y0,y1=sys.argv[1],*map(int,sys.argv[2:6])
w,h,bpp,rows=read_png(p); sx=sy=n=0
for y in range(y0,min(y1,h)):
    r=rows[y]
    for x in range(x0,x1):
        R,G,B=r[x*bpp],r[x*bpp+1],r[x*bpp+2]
        if R>225 and 90<G<125 and B<50: sx+=x; sy+=y; n+=1
print(f"{sx//n} {sy//n} {n}" if n>500 else "none")
```

### `fogband.py` (r02)

아래 블록을 `$OUT/fogband.py`로 저장한다(Python 3 표준 라이브러리 + 같은 폴더의 `barscan.py`). 사용법은 파일 머리의 docstring과 「r02 — 도구」 표를 따른다. 합성 캡처 selftest가 기기 없이 돈다.

```python
#!/usr/bin/env python3
"""fog 띠 판독 도구 (S3 · S6~S9). barscan.py와 같은 폴더에 저장한다(barscan의 PNG 디코더를 쓴다).
  fogband.py band  <a.png> <b.png> [Y0 Y1]   두 캡처의 다른 행이 띠 안의 한 구간인지 — 띠의 실제 자리를 읽는다
  fogband.py split <a.png> <b.png> [Y0 Y1]   다른 행을 띠 안 · 띠 밖으로 센다. 띠 밖이 0이면 종료 코드 0
  fogband.py fade  <a.png> <b.png> [Y0 Y1] [#RRGGBB]  띠 안에서 바뀐 픽셀이 배경색 쪽으로 옅어졌는가
  fogband.py flat  <a.png> Y0 Y1 [#RRGGBB]   Y0~Y1 행이 배경색 한 가지뿐인가 (끝 상자 아래가 비었는가)
  fogband.py px    <a.png> x y [x y ...]      그 점들의 색
  fogband.py shift <a.png> <b.png> [Y0 Y1]   b가 a보다 세로로 몇 픽셀 움직였는가(스크롤 양)
  fogband.py selftest                         합성 PNG로 도구를 검사한다. 기기 없이 돈다
Y0 Y1을 안 주면 환경변수 STRIP_Y0 STRIP_Y1, 그것도 없으면 2167 2272(Pixel_8 1080x2400: 40dp x 2.625 = 105px,
스크롤 영역 아랫변 y 2272 위). 이 값은 accessibility 캡처에서 읽은 **예상**이고 정본은 band의 출력이다.
상태바(y < 132)는 비교에서 뺀다. 띠 양쪽 PAD(기본 6px)는 띠 안으로 센다."""
import os, sys, tempfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from barscan import read_png, write_png

TOP, PAD, GAP = 132, 6, 48          # 상태바 아래부터 · 띠 양쪽 여유 · 한 구간으로 묶는 빈 틈(px)

def strip(argv):
    if len(argv) >= 2: return int(argv[0]), int(argv[1])
    return int(os.environ.get("STRIP_Y0", 2167)), int(os.environ.get("STRIP_Y1", 2272))

def color(rows, bpp, x, y):
    i = x * bpp; return (rows[y][i], rows[y][i + 1], rows[y][i + 2])

def hexc(c): return "#%02X%02X%02X" % tuple(c)
def parse(s): s = s.lstrip("#"); return tuple(int(s[i:i + 2], 16) for i in (0, 2, 4))

def load2(a, b):
    wa, ha, bppa, ra = read_png(a); wb, hb, bppb, rb = read_png(b)
    if (wa, ha, bppa) != (wb, hb, bppb): raise SystemExit("크기가 다르다 -> 비교 불가")
    return wa, ha, bppa, ra, rb

def diff_ys(ra, rb, top, h): return [y for y in range(top, h) if ra[y] != rb[y]]

def segments(ys, gap=GAP):
    segs = []
    for y in ys:
        if segs and y - segs[-1][1] <= gap: segs[-1][1] = y
        else: segs.append([y, y])
    return segs

def default_bg(rows, bpp, w, y1):
    """띠 바로 아래 여백의 색(왼쪽 가장자리). 카드 · 글자가 없는 자리다."""
    return color(rows, bpp, 8, min(len(rows) - 1, y1 + PAD + 8))

def band(ra, rb, h, y0, y1, top=TOP, pad=PAD, gap=GAP):
    ys = diff_ys(ra, rb, top, h)
    if not ys: return "NONE", [], None, "다른 행 0"
    segs = segments(ys, gap); first, last = ys[0], ys[-1]
    why = []
    if len(segs) > 1: why.append(f"두 구간 이상({len(segs)})")
    if first < y0 - pad: why.append(f"띠 위로 벗어남(첫 행 {first} < {y0 - pad})")
    if last > y1 + pad: why.append(f"띠 아래로 벗어남(끝 행 {last} > {y1 + pad}) — 화면 바닥에 붙었는가")
    if last - first + 1 < 0.75 * (y1 - y0): why.append(f"짧다({last - first + 1}px < {0.75 * (y1 - y0):.0f}px) — 구간이 하나이고 띠 안이며 띠 밖이 0이면 정상(내용이 띠 안에서 끝남), 아니면 눈으로")
    return ("OK" if not why else "CHECK"), segs, (first, last), "; ".join(why)

def split(ra, rb, h, y0, y1, top=TOP, pad=PAD):
    ys = diff_ys(ra, rb, top, h)
    inside = [y for y in ys if y0 - pad <= y <= y1 + pad]
    above = [y for y in ys if y < y0 - pad]; below = [y for y in ys if y > y1 + pad]
    return len(inside), len(above), len(below)

def content_rows(rows, bpp, w, y0, y1, bg, tol=24):
    n = 0
    for y in range(y0, y1 + 1):
        r = rows[y]
        if any(max(abs(r[x * bpp + k] - bg[k]) for k in range(3)) > tol for x in range(8, w - 8)): n += 1
    return n

def fade(ra, rb, bpp, w, y0, y1, bg, pad=PAD):
    """바뀐 픽셀의 배경색과의 거리가 줄었는가(toward) · 늘었는가(away) · 원래 배경이었는데 바뀌었는가(bgmoved)."""
    toward = away = bgmoved = same = 0
    dist = lambda c: sum(abs(c[k] - bg[k]) for k in range(3))
    for y in range(y0 - pad, y1 + pad + 1):
        for x in range(w):
            ca, cb = color(ra, bpp, x, y), color(rb, bpp, x, y)
            if ca == cb: same += 1; continue
            if dist(ca) == 0: bgmoved += 1
            elif dist(cb) < dist(ca): toward += 1
            else: away += 1
    return toward, away, bgmoved, same

def flat(rows, bpp, w, y0, y1, bg, tol=3):
    bad = 0
    for y in range(y0, y1 + 1):
        r = rows[y]
        bad += sum(1 for x in range(8, w - 8) if max(abs(r[x * bpp + k] - bg[k]) for k in range(3)) > tol)
    return bad

def shift(ra, rb, h, y0, y1, span=240):
    """a의 행 y가 b의 행 y-dy에 나타나는 dy(위로 끌면 양수). 한 가지 색뿐인 행은 세지 않는다."""
    def key(r): return bytes(r)
    nonuni = lambda r: any(r[i] != r[i % 3] for i in range(3, len(r)))
    cand = [y for y in range(y0, y1) if nonuni(ra[y])]
    if not cand: return None
    index = {}
    for y in range(y0, y1): index.setdefault(key(rb[y]), []).append(y)
    score = {}
    for y in cand:
        for yb in index.get(key(ra[y]), ()):
            d = y - yb
            if abs(d) <= span: score[d] = score.get(d, 0) + 1
    if not score: return 0, 0, len(cand)
    best = max(score.items(), key=lambda kv: (kv[1], -abs(kv[0])))
    return best[0], best[1], len(cand)

def selftest():
    fails = []
    def expect(name, got, want):
        ok = got == want
        print(("ok   " if ok else "FAIL ") + f"{name}: {got} (기대 {want})")
        if not ok: fails.append(name)
    W, H, Y0, Y1, T = 200, 600, 400, 460, 20      # 합성 캡처: 띠 400~460(60행), 상태바 아래 20
    WHITE, GRAY = (255, 255, 255), (200, 200, 200)
    tmp = tempfile.mkdtemp()
    def make(name, paint):
        p = os.path.join(tmp, name + ".png"); write_png(p, W, H, paint); return read_png(p)
    card = lambda x, y: GRAY if 20 <= x < 180 and 380 <= y < 480 else WHITE
    def blend(a, bg, t): return tuple(int(round(a[k] + (bg[k] - a[k]) * t)) for k in range(3))
    def fogged(target, rows=None):             # 띠 안에서 위 0 → 아래 1로 target 쪽으로 섞는다
        def p(x, y):
            c = card(x, y)
            if Y0 <= y <= Y1 and (rows is None or rows(y)):
                return blend(c, target, (y - Y0) / (Y1 - Y0))
            return c
        return p
    A = make("a", card); Bf = make("fog", fogged(WHITE)); Bd = make("dark", fogged((0, 0, 0)))
    Bz = make("same", card)
    Btwo = make("two", fogged(WHITE, lambda y: y <= 405 or y >= 455))
    Blow = make("low", lambda x, y: blend(card(x, y), WHITE, 0.5) if 440 <= y < 500 else card(x, y))
    ra, rf = A[3], Bf[3]
    h = H
    st, segs, env, why = band(ra, rf, h, Y0, Y1, T, 2)
    expect("band · 띠 안의 한 구간", (st, len(segs)), ("OK", 1))
    expect("band · 첫 행 · 끝 행이 띠 안", env[0] >= Y0 - 2 and env[1] <= Y1 + 2, True)
    expect("band · 같은 캡처", band(ra, Bz[3], h, Y0, Y1, T, 2)[0], "NONE")
    st2, segs2, _, _ = band(ra, Btwo[3], h, Y0, Y1, T, 2, gap=40)
    expect("band · 두 구간으로 나뉨", (st2, len(segs2)), ("CHECK", 2))
    expect("band · 띠 아래(화면 바닥)로 벗어남", band(ra, Blow[3], h, Y0, Y1, T, 2)[0], "CHECK")
    expect("split · 띠 밖 0 · 띠 안 > 0", (split(ra, rf, h, Y0, Y1, T, 2)[0] > 0, split(ra, rf, h, Y0, Y1, T, 2)[1:]), (True, (0, 0)))
    expect("split · 띠 밖에 다른 행이 있으면 센다", split(ra, Blow[3], h, Y0, Y1, T, 2)[2] > 0, True)
    bg = WHITE
    tw, aw, bm, sm = fade(ra, rf, 3, W, Y0, Y1, bg, 2)
    expect("fade · 배경색 쪽(toward > 0, away 0)", (tw > 0, aw), (True, 0))
    tw2, aw2, _, _ = fade(ra, Bd[3], 3, W, Y0, Y1, bg, 2)
    expect("fade · 어두워지면 away > 0", (tw2 == 0, aw2 > 0), (True, True))
    expect("flat · 빈 배경 행", flat(ra, 3, W, 500, 560, bg), 0)
    expect("flat · 카드가 걸린 행", flat(ra, 3, W, 420, 440, bg) > 0, True)
    expect("px", color(ra, 3, 100, 400), GRAY)
    expect("content_rows · 띠 안에 카드", content_rows(ra, 3, W, Y0, Y1, bg), Y1 - Y0 + 1)
    up = make("up", lambda x, y: card(x, y + 30))            # 30행 위로 끌었다
    expect("shift · 30행", shift(ra, up[3], h, 40, 560)[0], 30)
    expect("shift · 같은 캡처", shift(ra, Bz[3], h, 40, 560)[0], 0)
    print("selftest " + ("PASS" if not fails else "FAIL " + ", ".join(fails)))
    return 0 if not fails else 1

if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["selftest"]: sys.exit(selftest())
    if a[:1] == ["px"] and len(a) >= 4:
        w, h, bpp, rows = read_png(a[1]); v = [int(t) for t in a[2:]]
        for x, y in zip(v[0::2], v[1::2]): print(f"({x},{y}) {hexc(color(rows, bpp, x, y))}")
        sys.exit(0)
    if a[:1] == ["flat"] and len(a) >= 4:
        w, h, bpp, rows = read_png(a[1]); y0, y1 = int(a[2]), int(a[3])
        bg = parse(a[4]) if len(a) > 4 else default_bg(rows, bpp, w, y1)
        bad = flat(rows, bpp, w, y0, y1, bg)
        print(f"배경 {hexc(bg)} 아닌 픽셀 {bad} -> {'FLAT' if bad == 0 else 'NOT-FLAT'}"); sys.exit(0 if bad == 0 else 1)
    if a[:1] in (["band"], ["split"], ["fade"], ["shift"]) and len(a) >= 3:
        w, h, bpp, ra, rb = load2(a[1], a[2]); rest = a[3:]
        if a[0] == "shift":
            y0, y1 = (int(rest[0]), int(rest[1])) if len(rest) >= 2 else (TOP, h)
            r = shift(ra, rb, h, y0, y1)
            print("움직임을 못 찾았다(내용 행 없음)" if r is None else f"세로 이동 {r[0]}px (일치 행 {r[1]} / 내용 행 {r[2]})"); sys.exit(0)
        y0, y1 = strip(rest[:2])
        if a[0] == "band":
            st, segs, env, why = band(ra, rb, h, y0, y1)
            print(f"띠 예상 {y0}~{y1} ({y1 - y0}px) 다른 행 구간: {[tuple(s) for s in segs] or '없음'} 범위 {env} -> {st}" + (f" — {why}" if why else ""))
            sys.exit(0 if st == "OK" else 1)
        if a[0] == "split":
            bg = default_bg(ra, bpp, w, y1)
            inn, up, down = split(ra, rb, h, y0, y1)
            print(f"띠 {y0}~{y1}(±{PAD}): 안 {inn}행 · 밖 {up + down}행(위 {up} · 아래 {down}) · a의 띠 안 내용 행 {content_rows(ra, bpp, w, y0, y1, bg)} / {y1 - y0 + 1}")
            sys.exit(0 if up + down == 0 else 1)
        bg = parse(rest[2]) if len(rest) > 2 else default_bg(ra, bpp, w, y1)
        tw, aw, bm, sm = fade(ra, rb, bpp, w, y0, y1, bg)
        v = "FADE" if tw > 0 and aw <= 0.02 * (tw + aw) else ("SAME" if tw + aw + bm == 0 else "NOT-FADE")
        print(f"배경 {hexc(bg)} · 바뀐 픽셀 {tw + aw + bm}: 배경 쪽 {tw} · 반대쪽 {aw} · 원래 배경인데 바뀜 {bm} (안 바뀜 {sm}) -> {v}")
        sys.exit(0 if v == "FADE" else 1)
    print(__doc__); sys.exit(64)
```

### 도구 검사(selftest) — 기기 없이

도구를 바꾸거나 처음 쓸 때마다 먼저 돌린다. 합성 캡처(672px 회색 띠 → `BAR` · 빈 화면 · 짧은 띠(기준 200 `none` · 기준 100 `BAR`) · x 범위 밖의 띠 · 옅은 띠 · 무채색이 아닌 띠 → `none`, 같은 캡처의 diff 0 · 다른 캡처의 diff > 0 · 전체 높이 면)과, 저장 캡처가 있으면 다음을 확인한다.

- **계약 단계 캡처**(열 건): `base-01` · `base-02`에서 `BAR`(672px, x 1027), 나머지 여덟 장에서 `none`.
- **e2e 캡처**(2026-10-08 실행의 Android · iOS): 위 「바 판독 규칙」 표의 화면별 설정으로 — 구현 전 `BAR`(맵 672 · 619px, 학습 137 · 214px, 피드백 1637px) · 같은 조건 HEAD `none` · 거짓 `BAR` 사례(학습 `-a`가 기준 200에서 `none`(D1), 피드백 `-b` 144px 테두리가 기준 100에서 `BAR`, 알림 대화상자 1920px 오버레이, iOS 검은 시작 화면 1920px) · iOS 구현 전 24프레임 중 22프레임 `BAR`(f03~f24) · HEAD 0프레임 · 화면이 뜬 뒤 프레임(f06~) `none`.
- 저장 캡처는 git에 없다 — 계약 단계는 `.agent-harness/work/hide-scrollbars/artifacts/spec/`, e2e는 같은 폴더의 `artifacts/e2e/`(안에 `android/` · `ios/`)에 있다. 순수 Python 디코더라 e2e 캡처까지 돌리면 **몇 분** 걸린다.

```sh
python3 -m py_compile "$OUT/barscan.py" "$OUT/orange.py" "$OUT/fogband.py"
python3 "$OUT/fogband.py" selftest                                    # r02: 합성 캡처 15건 — band · split · fade · flat · px · shift
python3 "$OUT/barscan.py" selftest                                    # 합성 캡처만
python3 "$OUT/barscan.py" selftest "$SPEC_CAPTURES"                   # + 계약 단계 저장 캡처(artifacts/spec)
python3 "$OUT/barscan.py" selftest "$SPEC_CAPTURES" "$E2E_CAPTURES"   # + e2e 저장 캡처(artifacts/e2e)
```

`fogband.py selftest`는 저장 캡처가 필요 없다. 합성 캡처(200x600, 띠 400~460)로 ① 한 구간 `OK` ② 같은 캡처 `NONE` ③ 두 구간으로 갈라지면 `CHECK` ④ 띠 아래로 벗어나면 `CHECK` ⑤ `split`의 띠 안 > 0 · 밖 0과 밖이 있을 때 ⑥ 배경 쪽이면 `FADE`(반대로 어두워지면 `away`) ⑦ `flat` ⑧ `px` ⑨ 내용 행 수 ⑩ `shift` 30행과 0행을 확인한다. **r02의 임계값(구간 병합 48px · 「짧다」 75% · 띠 여유 6px)은 합성 캡처로만 확인했고 실제 캡처로 확인한 적이 없다.**

**기대**: 마지막 줄이 `selftest PASS`, 종료 코드 0. 이 문서를 고친 단계(2026-10-08)에서 돌린 결과: 합성 열 건 + 계약 캡처 열한 건 + e2e 캡처 서른한 건 모두 `ok`, `selftest PASS`. (r01의 `barscan.py` 결과다. `fogband.py`는 r02를 쓴 단계에서 합성 열다섯 건 모두 `ok`, `selftest PASS`.)
