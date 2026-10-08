# Android 상태바 아이콘 명암 — 표면에 따라 바뀌는가

Android 앱의 상단 띠를 칠하는 표면(밝은 화면 · 어두운 화면 · 레이어 · 스크림)이 바뀔 때, **시스템이 그린 상태바의 시계 · 아이콘 색**이 그 표면 위에서 읽히는지를
에뮬레이터의 `dumpsys` · 무손실 캡처 · 화면 녹화로 확인한다. 어두운 표면(`episode-intro` · 서사 · 최종 테스트 · 비주얼 노벨 · 지표 모달 · 첫 단원 안내)에서는 **밝은 아이콘**,
밝은 표면(여정 맵 · 설정 · 학습 · 채팅 · 통화 · 스플래시 · 스크림 0.45)에서는 **어두운 아이콘**이 서야 한다. 호스트의 판정(`StatusBarIcons` 단위 테스트)과 표지의 위치(vitest ui · integration · 정적 결선) ·
호스트가 트리를 읽어 창에 적용하는지(계측 `StatusBarIconsHostTest`)는 다른 계층이 진다. 이 문서는 **시스템이 실제로 그린 픽셀**만 진다.

항목 정본은 작업 `android-status-bar-appearance`의 계약(`spec.md` r02 — 표면별 기준 · §8 측정 방법)과 test-plan의 `## e2e`(S1 ~ S13, r02 · r03이 우선 — 번호는 r03을 따른다)이고, 표면 목록 · 합성색 · 대비 수치의 정본은 `design.md`다.
이 문서는 거기에 S14(앞선 작업 회귀 스모크 — r03 이전에는 S12였다)와 S1의 세부(스크림 0.45가 뒤집히지 않음)를 더했다 — 「test-plan과 다른 점」은 맨 아래에 적었다.

이 문서는 **절차**다. 결정과 받아들인 대가는 [ADR-0050](../adr/0050-android-status-bar-icons.md)이 진다(계약 §10).
**첫 실행(2026-10-06 · HEAD `f6aae70e`) · 두 번째 실행 r02(같은 날 · HEAD `6b3110c3`) · 세 번째 실행 r03(같은 날 · HEAD `008cec79` — 제품 · 도구는 `dbdf9e05`와 같다)을 했다.** 첫 실행이 되돌린 절차 · 도구 결함 11건 · r02가 되돌린 결함 10건 · r03이 되돌린 결함 7건은 이 문서에서 고쳤다(「실행 결과」의 결함 표). **r02 뒤에 고친 것 — 전환 지연의 판정(환경 조건 · 시작 / 끝) · `SBCLOCK` 자동화 · 렌더러 기록 · 좌표 · 분할 화면 · 스플래시 지연 · S4 기대 범위 — 은 r03이 기기에서 돌렸고 동작했다**(「실행 결과」 r03의 5절). **r03 뒤에 고친 것 — 지연의 환경 조건을 영상 전체가 아니라 「전환 직후」의 프레임 간격으로 · 같은 프레임 변화의 기록 불가 표시 · 서사 → 채팅의 `apr` 폴링 · API 30 좌표 · 픽스처 시작 시각 파일 — 은 기기에서 다시 돌리지 않았고**, 고친 `sbjudge.py`를 저장된 영상에만 돌렸다(맨 아래 「도구를 돌려 본 기록」의 「r03 뒤」). 아래 「실행 상태」는 r03의 결과다.
**r03(2026-10-06)이 판정 정의를 고쳤다** — 첫 실행의 2차 판정은 배경을 「빈 구역의 가장 밝은 픽셀」로 잡아 가장 나쁜 자리(연속 학습 모달의 아이콘 뒤 주황 운석)를 재지 않았고, 그래서 **첫 실행의 S5 PASS는 틀렸다**. 지금의 도구(`sbpng.py`)는 **글리프 묶음마다 그 묶음에 인접한 배경의 최악 픽셀**로 잰다. r02가 이 도구를 기기에서 돌렸고 S5 · S12가 인접 배경 정의로 PASS했다(운석을 내린 구현 뒤 — 「실행 결과」의 r02). 정정은 「실행 결과」의 「첫 실행」 절에 그대로 남겼다.

## 실행 상태

**r03(2026-10-06 · HEAD `008cec79`, 제품 · 빌드 입력 · 도구는 `dbdf9e05`와 같다)의 결과다.** r03은 항목 일부만 다시 돌렸다 — 다시 돌리지 않은 항목은 **「미실행」**으로 적고, 그 항목의 r02 결과는 참고로만 남겼다(r03의 통과가 아니다). 첫 실행(HEAD `f6aae70e`)의 결과 · 정정은 맨 아래 「실행 결과」의 「첫 실행」 절에 있다. 렌더러: Pixel_8(API 37) **SwiftShader**(`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …`) · R6_API30(API 30) **호스트 GPU** `Android Emulator OpenGL ES Translator (Apple M5 Pro)`. 호스트 load average(1분) 2.7 ~ 11.9(영상 구간은 대체로 3 ~ 8). 판정은 **인접 배경 정의의 도구**로 냈다.
**r03 전체 판정: e2e passed(제한적)** — 기준 A(앱 안) PASS(HI8이 두 기기에서 `calls=10 toneChanges=4 mismatched=0 unobservable=0 offMain=0` · HS1 · SM15) · 기준 B(화면 지연)는 **API 30에서만 판정된다**(S6 행 — 수치의 출처는 세 층이다: test-runner의 r03 판정과, 고친 도구로 **test-runner가** 저장 영상을 재판정한 값) · 제품 결함 0.

⟨2026-10-08⟩ **이 문서의 지난 결과는 전부 축소 전 바이너리의 것이다.** `release`와 `bundled`가 R8로 축소 · 난독화되도록 바뀌었다([ADR-0052](../adr/0052-android-release-shrinking.md)). debug + 픽스처 항목은 영향이 없다(debug APK · 계측 APK가 바이트 단위로 같다).
`bundled`를 픽스처 없이 까는 항목(S1 (d) 스플래시 · S14의 실행 화면)은 **절차가 그대로 돌고, 보는 대상이 축소된 코드로 바뀐다.** **S7 (d)의 `bundled` + 픽스처 경로는 더는 성립하지 않는다** — 축소한 `bundled`에는 계측 픽스처가 붙지 않는다(아래 S7). 축소 뒤 빌드로 이 문서의 항목을 다시 돌린 적은 없다.

| 항목 | 무엇 | 기기 | 빌드 | 어느 실행 | 결과 |
|---|---|---|---|---|---|
| S1 | 밝은 표면 가드(맵 · 설정 · 학습 화면 · 스플래시) + 스크림 0.45(`Dialog`)가 뒤집히지 않음 | Pixel_8 (API 37) | debug + 픽스처 · 스플래시는 bundled | r03 | (a) (b) (e): **r03 PASS** — 맵 · 설정 · 롤플레이 20.71 · 스크림 위 7.37(기대 7.37) · 영상 D 하나 · **(c) 학습 화면 r03 PASS 20.71**(r02 미실행이던 것 — `audioProgress` · 맵을 두 번 스와이프 · `Listen to a Hello` `540 1858` → `Start` `540 1934`, Pixel_8 1080x2400) · (d) 스플래시: **r03 미실행**(r02 참고 — JS 스플래시는 **3초**에 선다: `apr` 어두움 · `#F46B18` 위 `#000000` 6.96:1 ×5묶음, 5초 뒤 맵 20.71. 0.8 · 1.2 · 1.6 · 2.0초는 시스템 스플래시 — G6 수용 구간, 판정 대상 아님) · (f) BottomSheet **도달 실패 유지**(r03 재시도 안 함 — r02: `completeProgress` 맵 13/13 · 10초 뒤에도 시트 없음) |
| S2 | D1 `episode-intro` 표지 | Pixel_8 · R6_API30 | debug + 픽스처 | r03 | **PASS** 17.94 / 17.94 (API 37 · API 30 모두) · `apr=LIGHT_NAVIGATION_BARS` |
| S3 | D1′ 표지 위 건너뛰기 확인창 | Pixel_8 · R6_API30 | debug + 픽스처 | r03 | **PASS** — 확인창 17.50:1 · 닫은 뒤 17.94 · 영상 L 하나(API 37 1개 · API 30 2개). 첫 실행의 PASS는 인접 배경 재측정을 안 한 값이었다 — 이번이 재측정이다 |
| S4 | D2 서사(첫 장면 · 둘째 장면) | Pixel_8 | debug + 픽스처 | r02 — **r03 미실행** | r02 참고: **PASS** 첫 장면 시계 12.29 · 아이콘 13.44 / 다음 12.29 · 13.82 (기대는 범위 — 「S4」) |
| S5 | D6 지표 모달 — 트로피 · 연속 학습(1차 + 2차 + 인접 배경이 스크림 합성색) | Pixel_8 | debug + 픽스처 | r02 · r03(API 30 모달만) | **API 37: r03 미실행 — r02 참고 PASS**(정정 확인) — 트로피: 시계 · 알림 · 아이콘 14.36, 모든 묶음 인접 배경 `#2C292D`, 닫으면 어두움 · 연속 학습: 5묶음 모두 인접 배경 `#2C292D` · 14.36:1 ×5(`--bg-expect '#2C292D'` 통과), 닫으면 `apr=LIGHT_STATUS_BARS`(어두움). 글리프 분포(기록): 시계 4.5 이상 74.5% · icon3 98.7%. **첫 실행의 연속 학습 PASS(14.36 — 빈 구역)는 틀렸고**(구현 전 인접 배경 `#F46B18` · 3.02) 이 PASS는 **인접 배경 정의 · 운석을 내린 뒤의 값**이다 · **API 30 r03 PASS** — 연속 학습 모달 `--bg-expect '#2C292D'` 통과(14.36), 닫으면 어두움 |
| S6 | 전환 영상 (a) 맵 → 표지 (b) 표지 → 서사 (c) 서사 → 채팅 → 서사 → 통화 (d) 모달 열기 · 닫기 (e) 표지 → 뒤로 | Pixel_8 · R6_API30(S9) | debug + 픽스처 | r03 | **순서 · 깜빡임: API 30 · API 37 모두 PASS**(순서 FAIL 0 — API 37의 순서 FAIL 2건은 내 절차의 타이밍 오류이고 기대를 맞춰 다시 판정하면 PASS, 「실행 결과」 r03의 3절). 표지 → 서사 변화 0회 · 다이얼로그 D 하나 · D7 닫기 L 하나 PASS. **지연(기준 B)은 API 30(호스트 GPU)에서만 판정된다**, 수치의 출처는 세 층이다 — (a) **test-runner의 r03 판정**(당시 도구 — 환경 조건이 영상 전체 간격 기준): 18개 PASS, 전환 직후 간격을 엄격히 보면 16개. (b) **환경 조건을 「전환 직후 0.5초」로 고친 도구로 test-runner가 저장 영상을 재판정**(기기 없음 — `review-p1.md`): 지연이 판정된 영상 17개 · 전환 10가지가 시작 +19 ~ +60 ms(한계 100) · 끝 +99 ~ +142 ms(한계 300) 모두 PASS, FAIL 0. 판정 불가(환경) 2개 — `a30-n2chat-1`(직후 32 ms) · `a30-n2call-2`(직후 33 ms)는 (a)가 PASS(시작 +32 · +66)로 냈던 것이고 통과로 세지 않는다. `a30-m2close-2`(전체 27 ms · 직후 22 ms)는 (a)에서 판정 불가였으나 직후 조건이 서서 PASS(시작 +60 · 끝 +142). (c) test-design이 이 문서를 고칠 때 돌린 값은 (b)와 같았다 — 도구 검증이지 판정이 아니다. 「확정」은 (b)의 출처를 붙여서만 쓴다. **API 37(SwiftShader)은 판정된 지연이 0개**: 전환 영상 16개 전부 판정 불가(환경 — 직후 간격 91 ~ 295 ms · 렌더러), 판독 값 +0 ~ +555 ms는 기록값(+0 세 건 · +103 한 건은 판정되지 않는 값 — 「실행 결과」 r03). **r02의 FAIL 4건은 판정 불가(환경)로 재분류**한다 — FAIL이 아니고, **통과도 아니다**(조건을 끈 값은 여전히 한계(시작 100 · 끝 300 ms) 초과 FAIL이고 API 37을 호스트 GPU로 띄워 잰 값은 없다) |
| S7 | 구성 변경 (a) 야간 모드 (b) HOME · 최근 앱 복귀 (c) 분할 화면 (d) 글꼴 배율 1.3(재생성) | Pixel_8 | debug + 픽스처 · (d)는 bundled | r02 · r03((c)만) | (a) **r02 참고 PASS(r03 미실행)** — 표지 밝은 아이콘 유지, create 0 destroy 0 relaunch 0(켬 · 끔) · (b) **r02 참고 PASS(r03 미실행)** — HOME · 최근 앱 모두 `apr` 밝음 · 17.94 · 재생성 0 · `am start` 미사용(최근 앱 카드 탭) · (c) **r03 PASS(1차) · 기록** — API 37: APP_SWITCH → 앱 칩 `408 372` → `Split screen`(노드 `422 651`) → 카드 `540 1200` → 위쪽 앱 `apr` 밝은 아이콘(`LIGHT_NAVIGATION_BARS`) · 재생성 `create 0 destroy 0 relaunch 0` · 위쪽 창 상태바 17.94(기록) · 구분선 `540 1200 → 540 2350` 스와이프로 해제(Task 목록에서 SplitRoot 숨김 · 앱 전체 화면) 뒤 `apr` 밝음 유지 · **(d) r02 참고 PASS(bundled, r03 미실행)** — 표지(밝음) → 1.3: create 1 destroy 1 relaunch 1 · 직후 `apr` 어두움(기본값) · 맵 도착 → 표지로 다시 가면 밝음 17.94 → 뒤로 가면 어두움 → 1.0: 재생성(누적 2/2/2) → 표지 밝음. **「재생성 뒤 표지에서 다시 밝아짐」이 기기에서 확인됐다**(계측 픽스처가 bundled에서도 동작 — S7 (d)). ⟨2026-10-08⟩ **이 기록은 축소 전 `bundled`의 것이고 그 경로는 지금 없다** — minify 뒤에는 계측 픽스처가 `bundled`에 붙지 않는다. 같은 성질은 계측 HI6(debug)이 진다(S7 본문) |
| S8 | 3버튼 모드의 내비게이션 바(전환 없음)와 상태바 | Pixel_8 | debug + 픽스처 | r03 | **PASS** — 표지 17.94 · 서사 13.13 / 12.50, 1차 `LIGHT_NAVIGATION_BARS`, 내비게이션 띠 `#E9E8E8` / `#ECEBEC` · 버튼 `#666666`. 끝에 오버레이를 gestural로 되돌렸다(`navigation_mode 2`) |
| S9 | API 30 — S1(맵) · S2 · S6(a) · 스크림 위 수치 기록 | R6_API30 (API 30) | debug + 픽스처 | r03 | **PASS + 기록** — 맵 5.73 · 표지 17.94 · M2 4.53 · 스크림 위 `#999999` / `#3D3D3D` 계열 **3.81**(기록 — 아이콘 3.0 통과, Dialog 영상 D 하나 PASS). **전환 지연은 S6 행**(r03이 API 30 영상 26개를 새로 찍어 판정). r02의 S9 영상 8개(r02 5 · 첫 실행 2 + Dialog)는 고친 도구로 저장 영상을 다시 돌려 지연이 있는 7개 PASS(시작 +50 ~ +54 · 끝 +115 ~ +138) · Dialog는 D 하나 PASS |
| S10 | D3 최종 테스트 시험 단계 · D4 `visual-novel`(· `roleplay-visual-novel`) | Pixel_8 | debug + 픽스처(진행 옵션) | r02 — **r03 미실행** | r02 참고: D3 **PASS** 시계 13.48 · 아이콘 최악 **7.32**(`#5F5544`) · D4 **PASS** 시계 12.76 · 아이콘 13.68(3.5초 — 0.5초 12.09) · `roleplay-visual-novel` **미실행**(시간 — 첫 실행 12.68 유지, 인접 배경 재측정 안 함) |
| S11 | 첫 단원 안내 M2 · M3 · M4 · D7과 닫은 뒤 | Pixel_8 (API 30은 기록) | debug + 픽스처(`loadProgress`) | r03 | **PASS** — API 37: M2 4.53 · D7 15.45 / 15.26(기대 15.11 / 15.70 — 그림 타이밍 차 0.3 ~ 0.4, 1 미만) · **M3 4.48**(하한 4.4 통과 · 4.5 기준 미달 — 알고 받아들인 값) · M4 4.67 · 닫으면 모두 기대 명암. **`pollbg` M3 `#767779`(3번째 탭) · M4 `#747475`(4번째 탭)가 기기에서 동작**했다. API 30: M2 4.53 · **M2 닫기 전환 PASS**(`a30-m2close-1` · `-3` 시작 +54 · +51 · 끝 +132 · +140 — `-2`는 직후 22 ms로 서서 시작 +60 · 끝 +142) · D7 닫기 L 하나 |
| S12 | 연속 학습 모달의 운석 c의 자리 — (a) API 37 제스처 (b) API 30 (c) iOS 시뮬레이터 | Pixel_8 · R6_API30 · iOS | debug + 픽스처 | r02 · r03((b)만) · 리뷰 뒤 확인((c)만) | **(a) r02 참고 PASS(r03 미실행)** — `count '#F46B18' --above 132` = **0**(트로피 모달도 0). **(b) r03 PASS** — inset 145px(`dumpsys`의 InsetsSource) `--above 145` = **0** · check `--bg-expect` 14.36 ×5. **(c) iOS 관찰(2026-10-06, test-runner)** — iPhone 17 Pro 시뮬레이터, dev 전용 playground 번들(`tutorial-journey` — **제품 `main` 번들이 아니다**, 스트릭 0 한 장면): 변경 뒤 운석 c의 주황 맨 위 약 79pt · inset 62pt 위 주황 픽셀 **0** · 모달의 다른 요소와 겹침 없음, 변경 전(`dca104d8`) inset 위 주황 픽셀 **10185**(iOS에서도 Wi-Fi · 배터리를 덮었다). 절차 · 한계는 「S12」 (c). 운석 전후 수치는 「실행 결과」의 r02 |
| S13 | API 33 또는 34 AVD에서 어두운 아이콘의 실측 색 기록 | API 33 또는 34 AVD | debug + 픽스처 | — | **미실행 — AVD 없음**(system-images는 API 30 · 37.2뿐, 이미지를 내려받지 않았다). 통과로 세지 않는다 |
| S14 | 앞선 작업 회귀 스모크(실행 화면 · 구성 변경 · 뒤로가기) | Pixel_8 | bundled · debug + 픽스처 | r02 — **r03 미실행** | **r02 참고 부분** — L2 시스템 스플래시 여섯 점 `#F46B18`(0.8 · 1.2 · 1.6초 — `px.py` 없이 직접 픽셀 샘플, 가운데에 아이콘 없음) · 구성 변경 재생성 0(S7 (a)) · 표지 → 뒤로가기 → 맵 어두운 아이콘(S7 (d) · S6 (e) 안). **L1 · B2 · B4 · 회전(O1)은 미실행** |
| 기록 | 판정 아님: 100 ms 시작 한계(환경 조건이 선 영상만) · 대비 분포 · 스크림 0.45 수치 · 프레임 간격 | 위와 같음 | — | r03 | 스크림 0.45 위 어두운 아이콘의 시계: **API 30 실측 3.81 · API 37 실측 7.37 · API 31 ~ 36 미실측**(수용 기록 — U2) · 나머지는 「실행 결과」 |

**판정 불가 · 도달 실패 · 미실행은 통과가 아니다**(r03): **판정 불가(환경)** — API 37의 S6 지연 전부(전환 영상 16개 + r02 저장 영상 재판정 4건) · API 30 `a30-n2chat-1` · `a30-n2call-2`(전환 직후 간격 > 25 ms — 고친 도구 기준. r03 당시 도구는 PASS로 냈다). **도달 실패** — S1 (f) BottomSheet(r03 재시도 안 함 · r02 유지) · D5 `journey-entry`(vitest만). **미실행** — S13(AVD 없음 — `emulator -list-avds`는 Pixel_8 · R6_API30뿐, 이미지를 내려받지 않았다) · S14의 L1 · B2 · B4 · 회전(O1) · S10(`roleplay-visual-novel` · D3 · D4 재측정) · S1 (d) 스플래시 · S4 · S5(API 37) · S7 (a) (b) (d) · S12 (a)(API 37) · **API 37 호스트 GPU의 지연**(5554를 재시작하지 않았다) · **실기의 지연**. **r03에서 새로 실행해 PASS한 것**: S1 (c) · S3 · S8 · S7 (c) · `pollbg` M3 · M4.
**실행하면 이 표와 맨 아래 「실행 결과」를 같은 날 함께 고친다.** 건너뛴 항목(분할 화면이 안 섬 등)도 통과로 적지 않고 사유를 적는다.

## 이 절차로 확인되지 않는 것

- **실기기 · 제조사 상태바**: 두 AVD의 기본 상태바만 본다. 아이콘 굵기 · 색 보정 · 제조사 상태바(One UI 등)는 모른다. 구역 좌표(시계 2 ~ 14% · 아이콘 72 ~ 95% · 빈 구역 30 ~ 60%)는 Pixel_8(API 37)의 배치다. **R6_API30은 시계가 14.8 ~ 21.3%에 있어** 기본 구역으론 영상이 전부 `N`이다 — `sbzones`가 기기에 맞춘다(아래).
- **API 26 ~ 29 · 31 ~ 36**: API 37 · API 30 두 기기만 쓴다. API 31 ~ 36에서 어두운 아이콘이 60% 검정인지 100% 검정인지(design.md 7절)는 **재지 않았다** — S13이 그 가운데 한 수준(33 또는 34)을 재는 항목이고, AVD가 없으면 미실행 · 후속이다. 호스트가 API 26 ~ 29(`SYSTEM_UI_FLAG_LIGHT_STATUS_BAR`) 경로로 적용하는 모양도 보지 못한다.
- **iOS**: 이 변경은 iOS 파일을 바꾸지 않는다. 증거는 `git diff --stat`의 `apps/ios/` 0줄이다(test-plan 회귀 절). iOS에서 보이는 유일한 변경인 운석 c의 자리는 S12 (c)의 관찰 한 번이 있다 — **dev 전용 playground 번들 · 스트릭 0 한 장면**이고 제품 `main` 번들이나 로그인 뒤 경로로 본 것이 아니다.
- **렌더러 줄 조건이 판정 가능한 환경을 배제할 수 있다**: 같은 `emulator-5554`가 첫 실행에서는 프레임 간격 17 ~ 21 ms였는데 그때 렌더러 기록(`envrec`)이 없다. 5554가 SwiftShader로 뜬 원인이 SwiftShader인지 호스트 부하인지는 가려지지 않았다 — 「렌더러에 `SwiftShader`가 없다」는 조건은 간격이 판정 가능했던 환경도 판정 불가로 돌릴 수 있다.
- **`tapuntil_dark` · 새 `fixture` 함수 묶음은 기기에서 돈 적 없다**: `bash -n` · `zsh -n`과 `A` 스텁(시작 시각 파일 · 남은 시간 · 재시작 · 폴링 종료 코드)으로만 확인했다. 기기에서 처음 돌릴 때 고칠 것이 나올 수 있다(r03 결함 2 · 6).
- **API 31+ 시스템 스플래시 구간의 상태바 아이콘**: 플랫폼이 정한다(계약 G6, ADR-0049 — 흰 아이콘 3.02:1을 받아들였다). 이 문서의 S1은 **JS 스플래시**만 본다.
- **분할 화면 · 최근 앱 화면 · 다른 앱 위의 시스템 대화상자**의 시스템 상태바는 앱이 정하지 않는다(design.md 1.4). S7은 앱 창의 `apr=`만 판정하고, 시스템이 그린 그림은 기록한다.
- **에러 경계의 대체 화면**의 띠: 에러를 낼 수단이 없다(계약 2.2).
- **`journey-entry`(D5)**: 닿지 못한다 — 아래 「표면에 닿는 방법」. 증거는 vitest(ui UT6 · integration IS8)뿐이고 **호스트가 이 표면에서 실제로 뒤집는지는 기기에서 확인되지 않는다**(같은 경로를 타는 D1 · D6의 S2 · S5에 기댄 추론).
- **`BottomSheet`(스크림 0.45) 위의 아이콘 명암**: **도달 실패 — vitest IS9가 증거다.** 첫 실행에서 `completeProgress`로 맵이 13/13까지 갔지만 설문 시트가 5초 뒤에도 뜨지 않았다(배경 `#FFFDFC` 그대로). 호스트가 이 표면에서 실제로 뒤집지 않는지는 기기에서 확인되지 않았다.
- **젬 구매 화면**: 제품에서 열리지 않는다(계약 U3). 등록부의 `unreachable`이 정적 검사로 지킨다.
- **스크림 0.45 위 어두운 아이콘의 시계 4.5**: **API 30 실측 3.81(아이콘 3.0은 충족) · API 37 실측 7.37 · API 31 ~ 36 미실측**이다 — 「API 30 계열」이라고 쓰지 않는다(어두운 아이콘이 API 30과 같은 60% 검정이라면 다수 기기에 해당한다 — S13이 재는 이유). 결정(어두운 아이콘 유지 — 흰색은 2.85로 더 나쁘다)은 **받아들인 값**이다(U2 · ADR-0050). 이 절차는 판정하지 않고 기록한다.
- **M3(서사 채팅 위 첫 단원 안내)의 4.5 충족**: 하지 않는다. 계산값 4.48을 지키는 하한(4.4)만 판정한다 — 「4.5를 충족한다」고 적지 않는다(r02.4).
- **화면의 전환 지연은 API 37 에뮬레이터에서 이 절차가 판정하지 못한다 — 늘 「판정 불가(환경)」다.** 이 에뮬레이터는 SwiftShader(CPU 렌더링)로 떠 있어(`GLES: … ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …`) 상태바의 프레임 간격이 71 ~ 223 ms로 벌어지고(API 30은 호스트 GPU `Android Emulator OpenGL ES Translator (Apple M5 Pro)`로 16 ~ 18 ms), SystemUI가 120 ms 애니메이션으로 바꾸는 아이콘 색이 r02에서 300 ms를 넘겨 끝났다. 앱 안은 5 ms 이하 + 한 프레임이었다(`latency-diagnosis`). **그래서 지연은 환경 조건 — 렌더러에 `SwiftShader`가 없고 전환 직후(표면 변화 뒤 0.5초 안)의 프레임 간격 중앙이 25 ms 이하 — 이 설 때만 판정하고, 안 서면 FAIL이 아니라 「판정 불가(환경)」(`sbjudge.py` 종료 4)로 적고 값만 기록한다.** 순서 · 「한 전환에 명암 변화 1회 이하」는 프레임 간격과 무관하게 판정한다.
- **화면 지연을 실제로 판정하는 곳은 호스트 GPU로 뜬 에뮬레이터(API 30)다.** 이 절차로 확인되지 않는 것: **API 37을 호스트 GPU로 띄워 잰 지연**(떠 있는 에뮬레이터를 재시작해 재지 않았다 — 첫 실행의 저장된 영상(프레임 간격 17 ~ 24 ms · +52 ~ +85 ms)이 간접 근거일 뿐이다) · **실기의 지연**(하드웨어 가속의 값은 API 30 에뮬레이터 하나뿐 — 저장된 영상에서 시작 +50 ~ +54 ms · 끝 +115 ~ +138 ms) · 5554가 왜 SwiftShader로 떴는지(`hw.gpu.mode=auto` — 같은 맥에서 API 30은 호스트 GPU로 떴다).
- **앱 안의 「같은 콜에서 적용」은 이 절차가 아니라 정적 결선(HS1의 `host-wiring` — `MainActivity`가 `onFirstScreen` · `onPageUpdate`에서 `post` 밖으로 `sync`를 부른다)과 계측(`StatusBarIconsHostTest`)이 지킨다.** 진단의 탐침 실측: `apply − update` 0.04 ~ 5.15 ms(탐침 부담 포함). 이 절차는 표면 프레임과 아이콘 색 프레임의 차만 본다.
- **전환의 프레임 단위 정밀도**: `screenrecord`는 화면이 바뀔 때만 프레임을 내고 그 간격이 불규칙하다(앞선 작업의 실측 64 ~ 212 ms). 지연은 **프레임 간격이 허락하는 만큼만** 판정한다 — 구간이 한계에 걸치면 「판정 불가」(종료 3).
  이 도구가 영상으로 잡지 못하는 것: 한 프레임 안의 왕복(영상이 그 프레임을 내지 않음), 명암이 바뀌었으나 아직 그려지지 않은 프레임. 호스트가 같은 명암끼리의 교체에서 적용 호출을 하지 않는지는 계측 HI5(`applyCount`)가 센다.
- **영상의 지연은 「녹화에 보인 표면 변화와 아이콘 색 변화의 차」다 — 입력(탭)에서 화면까지가 아니다.** 첫 실행에서 정지 화면에서 시작하는 전환(모달 · 뒤로가기 · 닫기)은 직전 프레임이 몇 초 전이라 상한이 정지 구간만큼 벌어져 **전부 판정 불가**였다(결함 4).
  탭을 보낸 시각을 영상 시간축에 맞출 방법을 찾지 못했다 — 저장된 로그에 입력 시각이 없고, `screenrecord`의 시작 시각과 첫 프레임의 시각 차(수백 ms)를 잴 수단도 없다. 대신 `sbjudge.py`는 **정지 화면 뒤의 표면 변화는 그 프레임의 시각에 일어났다**(±`--emit-lag` 0.05초)고 보고 한계를 판정한다.
  이것은 **가정이다**(화면이 바뀌면 `screenrecord`가 한 합성 주기 안에 프레임을 낸다) — 이 도구로 검증되지 않았고, `--emit-lag inf`로 이전의 보수적 정의(항상 판정 불가)로 돌릴 수 있다. 표면 변화 뒤 프레임이 성긴 구간이 있으면 여전히 판정 불가다.
  입력 시각을 기준으로 한 「탭 → 아이콘」의 지연 상한은 **이 도구로 가둘 수 없다** — 판정하는 것은 표면 변화 프레임과 아이콘 색 변화(시작 · 끝)의 차뿐이다.
- **픽스처의 가짜 서버**: 진행 불러오기 외 모든 요청은 404다. 서버가 필요한 화면은 이 절차의 대상이 아니다.
- **도달 방법**: 첫 실행에서 D3 · D4 · M2 ~ M4 · D7 · `roleplay-visual-novel`은 닿았다(아래 「표면에 닿는 방법」). **설문 시트는 닿지 못했다**(위). D5는 닿지 못한다.
- **노드 이름 · 좌표**: 첫 실행에서 uiautomator에 **실제로 노출된 이름**은 맵의 탭 바 셋(`Journey, selected` · `Roleplay` · `Settings`)과 안내 `Tap to start your lesson!`, 설정의 `Sign out`, 그리고 `Next` · `Skip` · `Back to map` · `Keep watching`뿐이다.
  **맵의 항목(표지 · 트로피 · 연속 학습)과 서사 · 채팅 · 통화의 본문, 확인창 `Stay signed in`, 안내문(`Learn Korean through stories` · `Be part of the conversation` · `Listen to a Korean call`)은 노드로 보이지 않는다** — 문서가 이전에 적은 `^Episode intro` · `troph` · `-day streak` · `Next line`은 없는 이름이었다.
  노드가 없는 것은 **스크린샷에서 좌표를 읽어** 누른다(아래 「좌표」). 이름을 새로 쓸 때는 `names`로 실제로 보이는지 먼저 확인한다.

## 전제

### 기기 · 빌드

| 기기 | AVD | API | 쓰는 항목 |
|---|---|---|---|
| 주 기기 | `Pixel_8` | 37 (1080x2400 · 420 dpi · 제스처 내비게이션) | S1 ~ S8 · S10 ~ S12 · S14 |
| 구 버전 기기 | `R6_API30` | 30 (1080x2340 · 3버튼) | S9 · S11 기록 · S12 (b) · S14 일부 |
| API 33 또는 34 AVD | (없으면 만든다) | 33 또는 34 | S13 — 이 문서를 쓴 시점에는 없다 |

- JDK 17 이상, Android SDK, `ANDROID_HOME`, `python3`, Node 22, `pnpm` 의존 설치 완료, macOS의 `swiftc`.
  **이 맥에는 ImageMagick · ffmpeg · Pillow가 없다.** 판독은 아래 「도구」의 Swift · Python 표준 라이브러리 코드만 쓴다.
- **전용 에뮬레이터를 쓴다.** 야간 모드 · 글꼴 배율 · 오버레이 같은 전역 설정을 바꾸고 영상을 찍는 동안 다른 실행이 같은 기기를 쓰면 오염된다. Maestro · 계측 · 다른 e2e와 한 기기에서 동시에 돌리지 않는다.
- **16 KB 호환성 대화상자는 뜨지 않아야 한다**([Android 시스템 뒤로가기](android-system-back.md)의 「준비」). 뜨면 그 시도를 버린다.
- 디스플레이 기본값(`wm size` · `wm density` 재정의 없음), 글꼴 배율 1.0, 야간 모드 꺼짐, 애니메이션 배율 1.0에서 시작한다(아래 「시작 전 전역 설정」).
- **빌드**: 표면에 닿으려면 로그인 뒤 화면이 필요하므로 **debug + 계측 픽스처**가 기본이다. 스플래시(S1)와 S14의 실행 화면 항목만 `bundled`다
  (같은 패키지 · 같은 서명이라 `install -r`로 서로 덮어쓴다 — [Android 실행 시 색과 적응형 아이콘](android-launch-appearance.md)의 「기기 · 빌드」).

```sh
# 두 기기 공통 — 한 번만
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
ID="<adb devices 가 보여 준 에뮬레이터 ID>"     # 기기를 바꿀 때 ID만 다시 정한다
A() { adb -s "$ID" "$@"; }    # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; $A shell …`)는 zsh에서 command not found가 난다
PKG=libitum.duru.android
ACT=$PKG/com.libitum.host.MainActivity
# 증거 폴더는 절대 경로로 받는다(격리 워크트리 · 다른 작업 폴더에서 상대 경로는 없는 폴더를 가리킨다)
: "${OUT:?OUT 에 증거 폴더의 절대 경로를 넣는다(export OUT=/…/artifacts/e2e)}"
case "$OUT" in /*) ;; *) echo "OUT 은 절대 경로여야 한다: $OUT" ;; esac
TOOLS="$OUT/tools"; mkdir -p "$OUT" "$TOOLS"
DOC="$PWD/docs/e2e/android-status-bar-icons.md"    # 저장소 루트에서 연 셸 기준
BUNDLE=http://10.0.2.2:18790/main.lynx.bundle       # 에뮬레이터 안에서 호스트 PC는 10.0.2.2
A shell getprop ro.build.version.sdk        # 37 또는 30
```

빌드 · 설치(저장소 루트에서, **검증할 커밋의 SHA를 실행 결과에 적는다**):

```sh
git rev-parse --short HEAD
# 1) 번들 — 실제 서버 주소가 번들에 들어가지 않게 모의 값으로 만든다
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) debug APK + 계측 APK (gitignore 된 apps/android/app/google-services.json 이 있어야 한다)
( cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest )
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
# 3) 번들 제공 — 18790 포트. 3000 포트는 다른 worktree 의 개발 서버일 수 있어 쓰지 않는다
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist >/tmp/libitum-sbi-preview.log 2>&1 &
curl -sI http://localhost:18790/main.lynx.bundle | head -1      # 200
# 4) 스플래시 · S14 의 실행 화면 항목에만: bundled APK
# ( cd apps/android && ./gradlew :app:assembleBundled ) && A install -r apps/android/app/build/outputs/apk/bundled/app-bundled.apk
```

**`pnpm verify`를 돌린 뒤에는 1)을 반드시 다시 돌린다.** `pnpm verify`가 `apps/mobile/dist`를 모의 값 없는 번들로 덮어써서 픽스처가 실패한 적이 있다.

### 시작 전 전역 설정 — 기록하고 확인한다

```sh
globals() {
  echo "sdk: $(A shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "night: $(A shell cmd uimode night | tr -d '\r')"
  echo "size: $(A shell wm size | tr -d '\r' | tr '\n' ' ')"
  echo "density: $(A shell wm density | tr -d '\r' | tr '\n' ' ')"
  echo "font_scale: $(A shell settings get system font_scale | tr -d '\r')"
  for K in window_animation_scale transition_animation_scale animator_duration_scale; do echo "$K: $(A shell settings get global $K | tr -d '\r')"; done
  echo "navigation_mode: $(A shell settings get secure navigation_mode | tr -d '\r')"
}
globals | tee "$OUT/globals-before-$ID.txt"
```

**렌더러와 호스트 부하를 기록한다**(`envrec`). 전환 지연(S6)을 판정할 수 있는 기기인지가 여기서 갈린다 — API 37 에뮬레이터가 SwiftShader(CPU 렌더링)로 뜨면 지연은 늘 「판정 불가(환경)」다(「이 절차로 확인되지 않는 것」).

```sh
# envrec — `GLES:` 줄(렌더러) · 호스트 uptime(load average) · 게스트 loadavg. 기기마다 시작 전 한 번, S6은 묶음 전후로도 부른다.
# 마지막 값은 $OUT/env-$ID.txt 에, 모든 호출은 $OUT/env-log-$ID.txt 에 쌓인다. sbvid 가 env-$ID.txt 의 GLES 줄을 sbjudge 에 넘긴다.
envrec() {
  {
    echo "sdk: $(A shell getprop ro.build.version.sdk | tr -d '\r')"
    A shell dumpsys SurfaceFlinger | tr -d '\r' | grep -m1 '^GLES'
    echo "uptime: $(uptime)"
    echo "guest loadavg: $(A shell cat /proc/loadavg | tr -d '\r')"
  } | tee "$OUT/env-$ID.txt" | tee -a "$OUT/env-log-$ID.txt"
}
envrec
```

| 설정 | 시작 전에 이 값이어야 한다 | 아니면 |
|---|---|---|
| `night` | `Night mode: no` | `A shell cmd uimode night no` |
| `size` · `density` | `Physical …` 한 줄만(재정의 없음) | `A shell wm size reset` · `A shell wm density reset` |
| `font_scale` | `1.0` | `A shell settings put system font_scale 1.0` |
| 애니메이션 배율 셋 | `1.0` 또는 `null`(기본) | `A shell settings put global window_animation_scale 1.0` 등 |
| `navigation_mode` | **시작 값을 기록한다.** Pixel_8 `2`(제스처) · R6_API30 `0`(3버튼) | S8 끝에서 되돌린다 |
| 렌더러 · 호스트 부하(`envrec`) | **기록한다**(판정 아님). `GLES:` 줄에 `SwiftShader`가 있으면 그 기기에서 S6의 지연은 판정되지 않는다 | 기기마다 다르다 — 기기를 바꾸면 다시 |

### 픽스처 옵션 — 어떤 표면까지 닿는가

`SignedInScreenFixtureTest`(`apps/android/app/src/androidTest/java/com/libitum/host/`)가 테스트 세션을 심고 갱신 요청만 모의한 채 Activity를 **180초** 띄워 둔다(그 뒤 스스로 끝난다 — 항목 묶음마다 다시 시작한다).
**180초는 빠듯하다**(첫 실행에서 S4 · S6 · S11을 한 픽스처로 하다 모자랐고, 없는 이름을 기다리다 시작에서 만료시켜 캡처를 버렸다). 줄이는 순서: ① 도착은 이름이 보이는 즉시(`waitre`가 0.5초 간격으로 본다 — 고정 `sleep`을 늘리지 않는다) ② 한 묶음에서 **남은 시간(`fixture_left`)이 60초 미만이면 새 항목을 시작하지 않고** ③ 만료됐으면(`fixture_left`가 0 · `fixture_alive` 실패) **`fixture`를 다시** 부른다(`pm clear`로 처음 상태가 된다 — 표지 · 서사의 진행도 처음부터다). 만료 뒤의 캡처는 런처 화면일 수 있으니 `sbcheck` 앞에 `waitre`로 도착을 확인한다.
**옵션이 없으면 앞선 절차들이 기대는 동작 그대로다**(갱신만 200, 나머지 404). 옵션은 `-e 이름 true`로 준다.

| 옵션 | 하는 일 | 닿는 표면 |
|---|---|---|
| (없음) | 여정 맵. 진행 0. 진행 불러오기는 404 | S1 · S2 · S3 · S4 · S5 · S6 · S7 · S8 · S9 |
| `noSession` | 세션 없음 — 온보딩 | (로그인 앞 화면. 이 문서는 쓰지 않는다) |
| `audioProgress` · `speechProgress` · `writingProgress` · `reviewProgress` | 기기 쪽 진행 시드(학습 유닛이 열리게) | S1의 학습 화면 |
| **`visualNovelProgress`** | 시드: 표지 · 스텝 4 · 채팅 · 통화를 끝냄 → `visual-novel` 항목이 「다음 항목」 | S10 D4 |
| **`finalProgress`** | 시드: 최종 테스트만 남음(스텝 8 · 비주얼 노벨까지 끝) → 최종 테스트가 「다음 항목」 | S10 D3 |
| **`completeProgress`** | 시드: 튜토리얼 에피소드 전부 끝(롤플레이 탭이 열린다). **에피소드 설문 시트(BottomSheet)가 맵 위에 뜰 수 있다** | S10 `roleplay-visual-novel` · S1의 BottomSheet |
| **`loadProgress`** | 진행 불러오기(`/rest/v1/rpc/load_learning_progress`)에 **200**으로 답한다. 시드가 있으면 그 스냅숏을, 없으면 JSON `null`(저장된 적 없는 신규 사용자)을 돌려준다 → `hasLoadedProgress`가 서고, **진행이 0이면 첫 단원 안내가 뜬다** | S11 (M2 · M3 · M4 · D7) |

- 시드 옵션과 `loadProgress`는 함께 쓸 수 있다(시드를 서버가 가진 것으로 돌려준다). 시드 옵션 둘 이상이면 `completeProgress` > `reviewProgress` > `finalProgress` > `writingProgress` > `speechProgress` > `visualNovelProgress` > `audioProgress` 순으로 하나만 쓴다.
- 시드나 `loadProgress`가 있으면 액세스 토큰이 JWT 모양(`sub` 클레임)이 된다 — 진행 동기화가 토큰의 사용자 id로 열쇠를 만들기 때문이다.
- 로그에는 요청 **경로**만 남는다(`PushRefreshProbe` 태그의 `http /…`). 토큰 · 본문은 남지 않는다.
- **첫 실행에서 기기로 확인된 도달**: `finalProgress`(Final test 열림 → 시험 단계) · `visualNovelProgress` · `loadProgress`(안내 M2 · M3 · M4 · D7) · `completeProgress`(롤플레이 탭의 `Our Imagined Café`) — 가짜 서버가 받은 경로는 `/auth/v1/token` · `learning_streak` · `load_learning_progress`뿐이었다. **`completeProgress`의 설문 시트는 닿지 않았다**(S1 (f)).
- 도달의 코드 근거(`apps/mobile/src/app/journey-progress-sync.ts` — 불러오기 응답 `null`이면 빈 진행으로 합치고 `onLoaded`로 `hasLoadedProgress`를 세운다 · `AppSession.tsx` — 안내는 `hasLoadedProgress`와 빈 진행이 모두 참일 때 켜진다 · `journey-map-progress.ts` — 맵 항목은 앞 항목을 모두 끝내야 열린다).

### 표면에 닿는 방법

| 표면 | 도달 | 옵션 | 상태 |
|---|---|---|---|
| D1 · D1′ · D2 · D6 | 맵 → 표지 항목(좌표) / 표지의 `Skip` / `Next` / 상단 칩(좌표) | (없음) | **기기에서 닿음**(첫 실행) — 계측 `StatusBarIconsHostTest`도 같은 길 |
| **D3** 최종 테스트 시험 단계 | 맵을 밀어 `Final test` 항목(좌표) → 도입 서사(D2)를 끝까지 넘김 → 시험 | `finalProgress` | **기기에서 닿음**(맵 12/13 → Final test → 서사 → 시험 단계) |
| **D4** `visual-novel` | 맵 → `Our Imagined Café`(좌표) | `visualNovelProgress` | **기기에서 닿음** |
| `roleplay-visual-novel` | 롤플레이 탭 → `Our Imagined Café` | `completeProgress` | **기기에서 닿음**(`Back to list`가 보임) |
| **M2 · M3 · M4 · D7** 첫 단원 안내 | 맵의 안내 → 표지 → 서사의 안내 → 채팅의 안내 → … → 통화의 안내 | `loadProgress` | **기기에서 닿음** — 안내 넷, 각 안내는 화면 탭으로 닫힌다 |
| 설문 시트(`BottomSheet`) | `completeProgress`로 뜰 수 있다 | `completeProgress` | **도달 실패** — 맵 13/13까지 갔으나 5초 뒤에도 시트 · 스크림이 없다(`S1-sheet-try.png`). vitest IS9가 증거 |
| **D5** `journey-entry` | **닿지 못함** — 로그인 → 언어 선택을 지나야 한다(`app/entry-wiring.ts`). 제품의 로그인은 소셜(앱 위 브라우저를 여는 웹 인증)뿐이고 전화 로그인은 숨겨져 있다(`productPhoneSignIn = "hidden"`). 가짜 HTTP가 브라우저 흐름을 대신할 수 없다 | — | **닿지 못함 — vitest만**(UT6 · IS8) |
| 젬 구매 | 제품에서 열리지 않는다 | — | 닿지 못함(계약 U3) |

## 도구 — 이 문서의 코드 블록을 파일로 저장해 쓴다

맨 아래 「부록 — 도구 코드」에 파일 넷이 있다. 저장소 밖 경로에 기대지 않으려고 **문서 안에 실행 가능한 형태로** 실었고, 아래 명령이 코드 블록을 파일로 꺼낸다
(` ```python file=sbpng.py ` 처럼 여는 줄에 `file=`이 있는 블록만). 코드를 손으로 옮겨 적지 않는다 — 문서의 블록이 정본이다. 표준 라이브러리만 쓴다.

```sh
python3 - "$DOC" "$TOOLS" <<'PY'
import pathlib, re, sys
doc, out = sys.argv[1], pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for m in re.finditer(r'^```\w+ file=(\S+)\n(.*?)^```$', open(doc, encoding='utf-8').read(), re.S | re.M):
    (out / m.group(1)).write_text(m.group(2), encoding='utf-8')
    print('wrote', out / m.group(1))
PY
swiftc -O "$TOOLS/sbframes.swift" -o "$TOOLS/sbframes" 2>&1 | grep -E 'error' ; ls -l "$TOOLS/sbframes"   # warning(tracks(withMediaType:) 폐기 예고)은 무시한다
python3 -m py_compile "$TOOLS/sbpng.py" "$TOOLS/sbjudge.py" "$TOOLS/nodefind.py" && echo tools-ok
python3 "$TOOLS/sbpng.py" selftest | tail -1     # selftest OK
python3 "$TOOLS/sbjudge.py" selftest | tail -1   # selftest OK
```

| 도구 | 하는 일 |
|---|---|
| `sbpng.py` (Python) | 무손실 PNG 한 장의 상태바 띠에서 **글리프 묶음(시계 · 알림 · 셀룰러 · Wi-Fi · 배터리)을 직접 찾고, 묶음마다 그 묶음에 인접한 배경의 최악 픽셀**로 색 쌍을 낸다. `check PNG light\|dark [--bg-expect #RRGGBB]` — 묶음별 PASS/FAIL(시계 4.5 · 아이콘 묶음 **각각** 3.0 · 선택으로 인접 배경 색). `dist PNG light\|dark` — 묶음별 픽셀 대비 분포(기록). `layout` · `zones` — 영상(`sbframes`)의 시계 구역을 기기에 맞출 때(기본 구역에 들면 기본값 — API 30은 `12.8,23.2`, 캡처에 따라 `12.8,23.3`이 나오기도 한다 — 0.1 차는 영상 판정을 바꾸지 않는다. 아래 `sbzones`). `navband` — 3버튼 내비게이션 바(S8). `selftest` — 합성 이미지로 PASS · FAIL 경로 확인 |
| `sbframes` (Swift) | 영상(`screenrecord`의 mp4)의 프레임마다 빈 구역의 가장 밝은 휘도(`bg`)와 시계 구역의 최대 · 최소 휘도를 한 줄로 낸다 |
| `sbjudge.py` (Python) | `sbframes`의 출력에서 프레임별 명암(L 밝은 아이콘 · D 어두운 아이콘 · N 구별 안 됨)을 읽어 **순서 · 깜빡임**(프레임 간격과 무관)과 **지연**을 판정한다. 지연은 **환경 조건**(렌더러에 `SwiftShader` 없음 · **전환 직후**(표면 변화 뒤 0.5초 안) 프레임 간격 중앙 25 ms 이하)이 설 때만 판정한다 — 아이콘 색 전환의 **시작 ≤ 100 ms · 끝 ≤ 300 ms**(중간색 프레임으로 구분해 낼 수 있으면 둘, 못 하면 끝만 판정하고 시작은 기록). 조건이 안 서면 **「판정 불가(환경)」(종료 4)**. 정지 화면 뒤의 표면 변화는 그 프레임의 시각(±`--emit-lag`)으로 본다(「판정 정의」). 표면 변화 뒤 프레임이 성기면 · 표면 변화와 아이콘 변화가 정지 구간 뒤 같은 프레임이면(「지연 값 없음」) 「판정 불가」(종료 3) |
| `nodefind.py` (Python) | `uiautomator dump`에서 이름(content-desc · text)이 정규식과 맞는 노드의 가운데 좌표를 낸다 — 탭 · 존재 확인 |

앞선 작업의 `px.py strip`을 쓰지 않는 이유: 그것은 띠 **전체**에서 「배경과 가장 먼 색」을 아이콘으로 읽어 띠 안의 앱 그림(지표 모달의 주황 운석 `#F46B18`)을 아이콘으로 읽는다(계약 2.2의 실측).
`sbpng.py`는 **글리프를 먼저 찾고(밝은 아이콘은 세 채널 250 이상) 그 글리프 옆의 배경을 잰다.** 첫 실행의 정의는 구역(시계 2 ~ 14% · 아이콘 72 ~ 95%)을 가르고 배경을 「빈 구역(30 ~ 60%)의 가장 밝은 픽셀」로 잡았다 — 글리프 뒤의 배경이 빈 구역과 다른 표면(연속 학습 모달의 운석 · D3의 명암)을 틀리게 쟀다(r03.2). 구역 옵션은 영상 도구의 시계 구역(`SBCLOCK`)에만 남았다.

### 판정 정의

**1차 — 창의 플래그**(내용에 흔들리지 않는다, 계약 8.1). `dumpsys window windows`에서 `MainActivity` 창의 `apr=` 줄.

| 표면 | `LIGHT_STATUS_BARS` | `LIGHT_NAVIGATION_BARS` |
|---|---|---|
| 밝은 아이콘이어야 하는 표면(D1 · D1′ · D2 · D3 · D4 · D6 · D7 · M2 ~ M4) | **없다** | 있다 |
| 어두운 아이콘이어야 하는 표면(맵 · 설정 · 학습 · 채팅 · 통화 · 스플래시 · 스크림 0.45) | **있다** | 있다 |

구현 전에는 모든 표면에서 `LIGHT_STATUS_BARS LIGHT_NAVIGATION_BARS`다(계약 2.2의 실측) — 밝은 아이콘 표면은 FAIL이다. **내비게이션 바 플래그는 어느 표면에서나 있어야 한다**(이 작업은 건드리지 않는다).

**2차 — 무손실 캡처의 색 쌍**(`sbpng.py check`, 계약 r03.2 — §8.2를 대체. 방법의 정본은 접근성 점검의 `sb.py`다). **대비는 글리프 묶음별로, 그 묶음에 인접한 배경의 최악 픽셀로 잰다.**
띠 = 높이의 0.5 ~ 4.2%. 글리프의 속 = 밝은 아이콘은 세 채널 250 이상(어두운 아이콘은 띠에서 가장 어두운 색에서 채널 차 6 이내). 속 픽셀의 열을 12px 간격으로 묶어 시계 · 알림 · 셀룰러 · Wi-Fi · 배터리로 가르고(왼쪽 첫 묶음 = 시계),
묶음 주위 12px 여백 영역의 **테두리에서 이웃과의 채널 차 5 이하로 번져 나간 픽셀을 2px 깎은 것**이 그 묶음의 배경이다. 그 가운데 **최악 픽셀**(밝은 아이콘이면 가장 밝은, 어두운 아이콘이면 가장 어두운 픽셀)과 글리프 속 색의 대비가 그 묶음의 색 쌍이다.
**「빈 구역의 가장 밝은 픽셀」은 쓰지 않는다 · 「그림이 겹치는 표면은 트로피 모달로 판정한다」도 쓰지 않는다** — 연속 학습 모달도 2차 판정에 든다.

| 표면 | 모드 | 시계 묶음 하한 | 아이콘 묶음 하한(각각) | 기대 수치(저장된 캡처의 재측정 · 시계 / 아이콘 최악 묶음) |
|---|---|---|---|---|
| D1 표지 | `light` | 4.5 | 3.0 | 17.94 / 17.94 |
| D1′ 확인창 | `light` | 4.5 | 3.0 | 17.50 / 17.50 |
| D2 서사(첫 장면 · 둘째 · 최종 테스트 도입) | `light` | 4.5 | 3.0 | 12.29 · 13.13 · 13.28 / 13.82 · 12.64 · 12.43 |
| D3 시험 단계 | `light` | 4.5 | 3.0 | 13.48 / **7.32**(배터리 뒤 — 첫 실행의 빈 구역 값 7.72와 다르다) |
| D4 `visual-novel` · `roleplay-visual-novel` | `light` | 4.5 | 3.0 | 12.76 / 13.68 |
| D6 트로피 | `light` | 4.5 | 3.0 | 14.36 / 14.36 |
| **D6 연속 학습** | `light` | 4.5 | 3.0 **+ 모든 묶음의 인접 배경이 `#2C292D`에서 채널 차 8 이내**(S5) | 구현 전(지금) 14.36 / **3.02**(셀룰러 · Wi-Fi · 배터리의 인접 배경 `#F46B18`) → 구현 뒤 기대 14.36 / 14.36 |
| D7 서사 위 안내 | `light` | 4.5 | 3.0 | 15.11 / 15.70 |
| M2 맵 위 안내 · M4 통화 위 안내 | `light` | 4.5 | 3.0 | 4.53 / 4.53 · 4.67 / 4.67 |
| **M3 채팅 위 안내** | `light` | **4.4**(`--clock-min 4.4`) | 3.0 | 4.48 / 4.48 — **알고 받아들인 근소한 미달**(r02.4). 스크림 값 · 바탕색이 바뀌면 실패하는 회귀 가드 |
| 맵 · 설정 · 학습 · 채팅 · 통화 · 스플래시 | `dark` | 4.5 | 3.0 | API 37 20.71 · API 30 5.73(60% 검정) · **스플래시 3.74(받아들인 값 — 시계는 기록)** |
| 스크림 0.45(`Dialog` · `BottomSheet`)가 밝은 면 위 | `dark` | 4.5(API 37) · **기록(API 30)** | 3.0 | **API 30 실측 3.81 · API 37 실측 7.37 · API 31 ~ 36 미실측** — API 30은 받아들인 값(U2)이라 `--clock-min 0` |

- 그림이 깔린 표면(D2 · D3 · D4 · D7)의 수치는 캡처 한 장의 것이다 — 장면 · 시계 숫자에 따라 달라지므로 **기준은 4.5 · 3.0이고 표의 수치는 기대의 크기**다. 다시 잰 값이 표와 **1 이상** 다르면 판정과 별도로 보고한다.
- 판정에는 묶음이 모두 있어야 한다: 시계 묶음과 아이콘 묶음이 없으면(밝은 아이콘이 서야 하는데 검정 아이콘이라 속 픽셀이 없는 구현 전의 모양 · 밝은 아이콘이 밝은 면에 새어 한 덩이로 읽히는 모양 포함) FAIL이다. `light`는 글리프 속 색의 휘도 ≥ 0.9, `dark`는 **< 0.4**(API 30의 어두운 아이콘은 60% 검정이라 순검정이 아니다).
- 알림 묶음(`notifN`)은 시계가 아니라 아이콘 묶음으로 3.0을 적용한다. 출력의 「아이콘 최악」은 셀룰러 · Wi-Fi · 배터리(`iconN`)의 최악이고 알림은 따로 적는다(위 표의 아이콘 수치는 `iconN`).
- **S5 · 연속 학습 모달의 인접 배경 조건**: 대비 하한만으로는 구현 전에도 통과한다(주황 위 흰 아이콘 3.02:1이 3.0을 넘는다). 그래서 `--bg-expect '#2C292D'`(스크림 합성색 · `--bg-tol 8`)를 **함께** 건다 — 묶음 하나라도 인접 배경이 다른 색이면 FAIL이다. 트로피 모달에도 같은 옵션을 건다.
- 구현 전에 실패하는 것은 **명암**이다. M2 ~ M4에서는 API 37의 검정 아이콘이 이미 4.47 ~ 4.67:1이라 **대비 기준만으로는 구현 전에도 통과한다** — 이 표면의 FAIL은 1차(`apr=`)와 휘도 0.9가 만든다. 대비 하한은 스크림 값 · 바탕색이 바뀌는 회귀를 잡는 **가드**다.
- 기록(판정 아님): `sbpng.py dist`의 묶음별 4.5 이상 · 3.0 이상 비율 · 평균.

**전환 — 영상**(`sbframes` + `sbjudge.py`, 계약 8.3 · design T1 ~ T5 · 전환 지연 진단 `latency-diagnosis`). 세 가지를 따로 판정한다.
1. **순서 · 깜빡임 — 항상 판정한다(프레임 간격과 무관).** 명암의 순서가 기대 그대로(왕복 · 떨림 없음 — **한 전환에 아이콘 색 변화는 한 번**), 같은 명암 사이에 시계가 보이지 않는 프레임이 없다, 같은 명암끼리의 전환에서는 변화 0회. 하나라도 어긋나면 환경과 무관하게 FAIL(종료 1).
2. **환경 조건 — 지연을 판정해도 되는 전환인가.** ① 그 전환의 **전환 직후 프레임 간격 중앙이 25 ms 이하**이고 ② 렌더러 줄(`envrec`의 `GLES:` — `sbvid`가 `--gles`로 넘긴다)에 **`SwiftShader`가 없다**. 하나라도 안 서면 지연은 **판정하지 않고 「판정 불가(환경)」(종료 4)**로 낸다 — 통과도 FAIL도 아니다. 값(시작 · 끝의 점 추정 · 프레임 간격 중앙)은 출력에 그대로 적힌다.
   **「전환 직후」의 정의(r03 뒤)**: 그 전환의 **표면 변화 프레임**(빈 구역 휘도가 0.15 이상 뛴 첫 프레임) **뒤 0.5초 안**에 도착한 프레임들의 간격 — 각각 직전 프레임과의 차 — 의 중앙값이다. 표면 변화마다 따로 재서 **그 표면 변화에 짝지은 아이콘 전환에만** 건다(전환이 둘인 영상에서 둘째가 느려도 첫째는 판정된다). 계약 r04.3의 「영상에서 전환 직후 프레임 간격의 중앙이 25ms 이하」에 맞춘 것이다.
   **왜 0.5초인가**: (1) 이 문서와 도구 출력이 r03까지 「표면 변화 뒤 0.5초 안」을 기록값으로 적어 와서 저장된 수치와 그대로 견줄 수 있다. (2) 아이콘 전환의 끝 한계 300 ms와 SystemUI의 120 ms 애니메이션을 덮고 여유가 있다. (3) 「아이콘 전환이 끝난 프레임까지」로 잡으면 창의 끝이 판정 대상인 전환에 달려, 전환이 늦을수록 창이 길어지고 끝을 못 찾으면 창이 없어진다 — 고정 창은 그 순환을 피한다. 직후에 프레임이 없으면(잴 간격이 없다) 조건을 걸지 않고, 지연 구간이 한계에 걸려 판정 불가(종료 3)가 된다.
   **영상 전체의 중앙은 출력의 첫 줄에 기록으로만 남는다** — 정지 구간(영상 앞뒤의 긴 간격)에 흔들려서다. r03에서 영상 전체 중앙은 18 · 19 ms인데 전환 직후가 32 · 33 ms인 두 영상이 PASS로 났고(`a30-n2chat-1` · `a30-n2call-2`), 전체 27 ms인데 직후가 22 ms인 영상(`a30-m2close-2`)이 판정 불가가 됐다.
   이유: API 37 에뮬레이터는 SwiftShader(CPU 렌더링)라 SystemUI의 상태바 프레임 간격이 71 ~ 223 ms로 벌어지고, 120 ms짜리 아이콘 색 애니메이션이 300 ms를 넘겨 끝난다. 앱 안은 5 ms 이하 + 한 프레임이라(진단) 이것은 앱의 지연이 아니다. API 30(호스트 GPU)은 간격 16 ~ 18 ms · 시작 +50 ms 안팎이다. **API 37(SwiftShader)에서는 화면 지연이 늘 판정 불가(환경)다.** 영상은 **짧게** 찍는다(`rec 이름 12` 정도) — 판정은 전환 직후의 간격만 보므로 정지 구간 때문에 판정 불가가 되지는 않지만, 영상이 길수록 호스트 부하 · 파일만 는다(출력의 첫 줄에 영상 전체의 간격도 기록으로 적힌다).
3. **지연 — 조건이 설 때만.** 표면이 바뀐 첫 프레임(빈 구역 휘도가 0.15 이상 뛴 프레임)을 기준으로 **아이콘 색 전환의 시작 ≤ 100 ms · 끝 ≤ 300 ms**. **시작**은 시계 색이 새 명암 쪽으로 처음 10% 움직인 프레임, **끝**은 90%에 닿은 첫 프레임이다(그 명암의 최종 값 기준). 중간색 프레임(10% ~ 90%)이 있으면 시작 · 끝을 구분해 둘 다 판정하고, 없으면(한 프레임에 다 바뀜) **끝만 판정하고 시작은 기록**한다. 출력의 「판독」은 시계가 처음 L · D로 읽힌 프레임(대비 0.2 — 이전 도구가 재던 값)의 점 추정이고 기록이다.
   - **기록값으로 쓸 수 없는 경우(r03 결함 5)**: 아이콘 변화가 표면 변화와 **같은 프레임**이고 그 프레임 직전의 간격이 `--emit-lag`보다 길면(영상이 정지 구간으로 시작했거나 정지 구간 뒤에 둘이 한꺼번에 나온 모양 — `a37-n2chat-3 · -4`, `a37-m2c-1`) 점 추정은 +0이 되고 구간은 정지 구간만큼 음수(−799 ~ +50 같은 값)로 벌어진다. 같은 프레임 안의 차는 영상으로 가려낼 수 없다. 이때 출력은 수치 대신 **「지연 값 없음 — 기록값으로 쓰지 않는다」**이고 지연은 판정 불가(종료 3, 환경 조건이 안 서면 4)다.
   - **끝**: 실제 지연의 구간을 가둔다 — 아래끝이 300 ms보다 크면 FAIL, 구간이 한계 안에 다 들어오면 PASS, 걸치면 판정 불가(종료 3).
   - **시작**: 구간의 위끝이 아래 `--emit-lag`로 50 ms 부풀어 한계 100 ms에서는 거의 늘 걸친다 — **점 추정이 100 ms 이하면 PASS, 구간의 아래끝이 100 ms를 넘으면 FAIL, 그 사이는 판정 불가**로 본다(한계가 가정의 크기와 같아서 둔 규칙이다).
   - 이전 도구는 「명암이 맞는 첫 프레임」을 300 ms로 판정하고 100 ms는 값만 적었다. 시작 · 끝으로 가른 것은 진단의 권고(6.1)다 — 하드웨어 가속에서 실측 시작 +50 ~ +54 ms · 끝 +115 ~ +138 ms.
**구간의 정의(첫 실행 결함 4의 수정)**: 이전 정의는 표면 변화 프레임의 실제 시각을 「직전 프레임 ~ 그 프레임」으로 잡아, 직전이 정지 화면이면(맵에서 탭하기 전 · 모달이 떠 있는 동안) 구간이 정지 구간 전체라 상한이 1초 이상으로 벌어졌고 모든 전환이 판정 불가였다(S6d · S6e · S9 · S11 닫기).
지금은 표면 변화를 「그 프레임의 시각 − `--emit-lag`(0.05초) ~ 그 프레임」으로 본다 — 정지 화면에서는 프레임이 나오지 않으므로 직전 프레임과의 간격은 변화 시각의 불확실이 아니다. 아이콘 색 변화는 표면이 움직이는 중이라 이전처럼 (직전 프레임 ~ 그 프레임)을 그대로 쓴다(그 사이의 성긴 간격은 누락일 수 있다).
**`--emit-lag` 가정(화면이 바뀌면 한 합성 주기 안에 프레임이 난다)은 그대로이고 입력 시각 없이는 검증되지 않는다** — 도구가 재는 것은 입력에서 화면까지가 아니라 녹화에 보인 두 변화의 차다. 출력의 「보수 상한」은 이전 정의의 값이고, `--emit-lag inf`로 이전 정의대로 돌린다.
**종료 코드**: 0 PASS · 1 FAIL · 2 사용법 · 3 판정 불가(구간이 한계에 걸침) · **4 판정 불가(환경 — 프레임 간격 · 렌더러)**. 옵션: `--env-gap 25`(ms — 전환 직후 간격 중앙의 한계 · `inf`면 환경 조건 끔) · `--gles "GLES: …"` · `--max-lag 0.3` · `--max-start 0.1` · `--emit-lag 0.05|inf` · `--allow-n`.

### 셸 관용구

```sh
# ── 판정 1차: 창의 apr= ──────────────────────────────────────────────
apr() {
  A shell dumpsys window windows | tr -d '\r' | awk '
    /^ *Window #[0-9]+ Window\{/ { f = ($0 ~ /libitum\.duru\.android\/com\.libitum\.host\.MainActivity\}/) }
    f && /apr=/ { sub(/^ +/, ""); print; exit }'
}
want_light_icons() {      # 밝은 아이콘 표면: LIGHT_STATUS_BARS 없음 · LIGHT_NAVIGATION_BARS 있음
  local P; P=$(apr)
  case "$P" in
    *LIGHT_STATUS_BARS*) echo "FAIL 어두운 아이콘이 서 있다 — $P"; return 1 ;;
    *LIGHT_NAVIGATION_BARS*) echo "PASS 1차(밝은 아이콘) — $P" ;;
    *) echo "FAIL 내비게이션 바 플래그가 없거나 창을 못 찾았다 — [$P]"; return 1 ;;
  esac
}
want_dark_icons() {       # 어두운 아이콘 표면: 둘 다 있음
  local P; P=$(apr)
  case "$P" in
    *LIGHT_STATUS_BARS*LIGHT_NAVIGATION_BARS*) echo "PASS 1차(어두운 아이콘) — $P" ;;
    *) echo "FAIL 밝은 아이콘이 샜거나 플래그를 못 찾았다 — [$P]"; return 1 ;;
  esac
}
# ── 캡처 · 2차 ───────────────────────────────────────────────────────
shot() { A exec-out screencap -p > "$OUT/$1.png"; }
SBOPT=()    # 기기에 맞춘 구역(sbpng check 에 붙는다)
# sbzones PNG — 기기마다(ID 를 정한 뒤) 맵 캡처로 한 번: 영상의 시계 구역을 잡아 **$OUT/zones-$ID.txt 에 쓴다**. sbvid 는 셸 변수가 아니라 이 파일을 읽으므로 새 셸에서도 같은 값이고,
# 파일이 없으면 sbvid 가 실패한다(기본 구역으로 조용히 넘어가지 않는다). Pixel_8 도 한 번 한다(기본 구역에 들면 기본값 2,14 가 나온다). API 30 은 시계가 14.8 ~ 21.3% 라 12.8,23.2(r03 맵 캡처 — 캡처에 따라 12.8,23.3 이 나오기도 한다. 0.1 차는 API 30 영상 26개의 프레임 표를 바꾸지 않았다)이다.
# SBOPT 도 채우지만 sbpng check 는 글리프를 직접 찾아 구역 옵션을 쓰지 않는다
sbzones() {
  local Z; Z=$(python3 "$TOOLS/sbpng.py" zones "$1") || return 1
  read -r _ CK _ IC <<<"$Z"          # "--clock a,b --icon c,d"
  SBOPT=(--clock "$CK" --icon "$IC"); echo "$CK" > "$OUT/zones-$ID.txt"; echo "zones: $Z → $OUT/zones-$ID.txt"
}
# sbcheck 이름 light|dark [sbpng 옵션…] — 1차 + 캡처 + 2차. 둘 다 통과해야 0
sbcheck() {
  local N=$1 M=$2 RC=0; shift 2
  if [ "$M" = light ]; then want_light_icons || RC=1; else want_dark_icons || RC=1; fi
  shot "$N"
  python3 "$TOOLS/sbpng.py" check "$OUT/$N.png" "$M" "$@" "${SBOPT[@]}" || RC=1
  return $RC
}
# pollbg 이름 '#RRGGBB' x y [최대] — (x,y)를 누르고 캡처해 **시계 묶음의 인접 배경**이 그 색이 될 때까지 되풀이한다. 노드가 없는 안내(S11 M3 `#767779` · M4 `#747475`)를 색으로 알아본다.
# 찾는 즉시 멈춘다 — 다음 탭이 안내를 소비하지 않게(r02: 채팅의 M3는 tapmid 3 으로 안 잡혔다. r03: 기기에서 동작 — M3 3번째 탭 · M4 4번째 탭). sbpng 가 내는 「요약 시계 #RRGGBB」 줄을 읽는다
pollbg() {
  local N=$1 C=$2 X=$3 Y=$4 MAX=${5:-14} I=0
  while [ "$I" -lt "$MAX" ]; do
    A shell input tap "$X" "$Y"; sleep 1.5; shot "$N"
    if python3 "$TOOLS/sbpng.py" check "$OUT/$N.png" light --clock-min 0 --icon-min 0 2>/dev/null | grep -q "^요약 시계 $C"; then echo "FOUND $C ($((I + 1))번째 탭)"; return 0; fi
    I=$((I + 1))
  done
  echo "not found: $C"; return 1
}
# ── 화면 조작: 노드로 보이는 것은 이름으로, 안 보이는 것은 좌표로(「좌표」) ───────
nodes() { A shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; A exec-out cat /sdcard/ui.xml; }
names() { nodes | python3 "$TOOLS/nodefind.py" --list; }                  # 지금 보이는 이름 전부 — 이름을 확인할 때
hasre() { nodes | python3 "$TOOLS/nodefind.py" "$1" >/dev/null; }          # 정규식과 맞는 노드가 있나
tapre() {                                                                  # 정규식과 맞는 첫 노드의 가운데를 누른다
  local XY X Y; XY=$(nodes | python3 "$TOOLS/nodefind.py" "$1") || { echo "no node: $1"; return 1; }
  read -r X Y <<<"$XY"; A shell input tap "$X" "$Y"
}
tapxy() { A shell input tap "$1" "$2"; }                                   # 좌표로 누른다 — 노드로 안 보이는 것(「좌표」)
# waitre 정규식 [초] — 0.5초 간격으로 본다(덤프 한 번이 ~0.5초라 실제 간격은 1초 안팎). 초 기본 20
waitre() { local N=$(( ${2:-20} * 2 )); while [ "$N" -gt 0 ]; do hasre "$1" && return 0; sleep 0.5; N=$((N - 1)); done; echo "timeout: $1"; return 1; }
waitgone() { local N=$(( ${2:-20} * 2 )); while [ "$N" -gt 0 ]; do hasre "$1" || return 0; sleep 0.5; N=$((N - 1)); done; echo "still there: $1"; return 1; }
scrollto() {                                                               # 맵을 아래로 밀며 이름을 찾는다
  local I=0; while [ "$I" -lt 14 ]; do hasre "$1" && return 0; A shell input swipe 540 1800 540 800 400; sleep 0.8; I=$((I + 1)); done
  echo "not found: $1"; return 1
}
tapmid() { local I; for I in $(seq 1 "$1"); do A shell input tap 540 1200; sleep 0.9; done; }   # 서사 · 안내는 화면 어디를 눌러도 넘어간다(서사에는 `Next line` 노드가 없다 — 이 탭으로 넘긴다)
# tapuntil_dark [최대] — 서사에서 화면 가운데를 한 번 누르고 1.5초 뒤 `apr` 을 보는 것을 `LIGHT_STATUS_BARS`(어두운 아이콘 = 채팅이 섰다)가 생길 때까지 되풀이한다.
# 서사 → 채팅 전환을 영상에 담을 때 `tapmid 3` + 고정 대기 대신 쓴다 — API 37(SwiftShader)에서는 채팅이 그보다 늦게 서 영상이 전환을 놓친다(r03 순서 FAIL 2건의 원인).
tapuntil_dark() {
  local I=0 MAX=${1:-12}
  while [ "$I" -lt "$MAX" ]; do
    A shell input tap 540 1200; sleep 1.5
    case "$(apr)" in *LIGHT_STATUS_BARS*) echo "어두운 아이콘 — 탭 $((I + 1))번"; return 0 ;; esac
    I=$((I + 1))
  done
  echo "어두운 아이콘이 서지 않았다(탭 ${MAX}번)"; return 1
}
# ── 픽스처(180초) ────────────────────────────────────────────────────
#   fixture [-e 옵션 true …]  — 새 상태에서 시작해 맵이 보일 때까지 기다린다.   fixture_stop — 끝낸다
#   fixture_left — 남은 초(만료되면 0).   fixture_alive — 아직 살아 있나(만료 뒤엔 실패 → fixture 를 다시)
#   fixture_ensure [초] [옵션…] — 남은 시간이 그 초(기본 45) 이하면 fixture 를 다시 시작한다
# 시작 시각은 셸 변수가 아니라 파일($OUT/.fixT0-$ID)에 적는다 — 명령마다 새 셸이어도 남고 기기마다 따로다(r03 결함 6: 옛 FIX_PID · FIX_T0 셸 변수는 새 셸에서 사라져 fixture_left 가 틀렸고
# fixture_stop 의 wait 도 먹지 않았다). 이 함수들은 r03 실행이 쓴 대체 함수(fx · left · ensure)를 이 문서의 이름으로 옮긴 것이다.
fixture() {
  A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null; sleep 1      # 남은 인스턴스가 있으면 끝낸다
  A shell pm clear "$PKG" >/dev/null
  A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest "$@" -e bundleUrl "$BUNDLE" \
    "$PKG.test/androidx.test.runner.AndroidJUnitRunner" >"$OUT/fixture-$ID.log" 2>&1 &
  date +%s > "$OUT/.fixT0-$ID"
  # 맵의 탭 바 `Journey, selected` 로 도착을 본다(첫 실행에서 확인된 이름). 첫 단원 안내가 맵을 덮는 `loadProgress` 는 안내 문구도 같이 받는다
  waitre '^Journey, selected|Tap to start your lesson' 25
}
fixture_left() {
  local T0 L; T0=$(cat "$OUT/.fixT0-$ID" 2>/dev/null) || { echo 0; return; }
  L=$(( 180 - ($(date +%s) - T0) )); [ "$L" -lt 0 ] && L=0; echo "$L"
}
fixture_alive() { [ "$(fixture_left)" -gt 0 ]; }
fixture_stop() { A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE >/dev/null; rm -f "$OUT/.fixT0-$ID"; }
fixture_ensure() {
  local N=${1:-45}; [ "$#" -gt 0 ] && shift
  [ "$(fixture_left)" -gt "$N" ] || { echo "픽스처를 다시 시작한다"; fixture "$@"; sleep 1; }
}
# ── 영상 ─────────────────────────────────────────────────────────────
#   rec 이름 [초]  — 녹화를 시작한다(기본 40초).   recstop 이름  — 끝내고 $OUT/<이름>.mp4 로 받는다
rec() { A shell "screenrecord --time-limit ${2:-40} /sdcard/$1.mp4" >/dev/null 2>&1 & REC_PID=$!; sleep 1; }
recstop() { A shell pkill -2 screenrecord >/dev/null 2>&1; wait "$REC_PID" 2>/dev/null; sleep 1; A pull "/sdcard/$1.mp4" "$OUT/$1.mp4" >/dev/null && echo "$OUT/$1.mp4"; }
#   sbvid 이름 기대순서 — 영상 → 프레임 표 → 판정.   예: sbvid S6a D,L        종료: 0 PASS · 1 FAIL · 3 판정 불가 · 4 판정 불가(환경)
#   시계 구역은 $OUT/zones-$ID.txt(sbzones 가 쓴다)에서 읽는다 — 없으면 실패한다. 렌더러 줄은 $OUT/env-$ID.txt(envrec)에서 읽어 --gles 로 넘긴다
sbvid() {
  local C G X=()
  C=$(cat "$OUT/zones-$ID.txt" 2>/dev/null)
  if [ -z "$C" ]; then echo "FAIL 이 기기($ID)의 시계 구역이 없다 — 맵 캡처로 sbzones 를 먼저(기기마다 한 번. API 30 은 기본 구역이면 영상이 전부 N 이다)"; return 1; fi
  G=$(grep -m1 '^GLES' "$OUT/env-$ID.txt" 2>/dev/null)
  if [ -n "$G" ]; then X=(--gles "$G"); else echo "경고: envrec 를 하지 않았다 — 렌더러를 모른 채 프레임 간격 조건만으로 판정한다"; fi
  "$TOOLS/sbframes" "$OUT/$1.mp4" --clock "$C" > "$OUT/$1.txt" && python3 "$TOOLS/sbjudge.py" "$OUT/$1.txt" --expect "$2" "${X[@]}"
}
# ── 구성 변경의 재생성 판정(Activity 수명 이벤트) ─────────────────────────
mark() { A logcat -b events -c; }
lc() {
  local EV; EV=$(A logcat -b events -d | tr -d '\r' | grep 'com.libitum.host.MainActivity')
  echo "create: $(echo "$EV" | grep -c wm_on_create_called) destroy: $(echo "$EV" | grep -c wm_on_destroy_called) relaunch_resume: $(echo "$EV" | grep -c wm_relaunch_resume_activity)"
}
```

- 모든 `adb`에 `-s "$ID"`가 붙는다(`A`). 두 기기가 떠 있으면 빠뜨린 `adb`는 틀린 기기를 건드린다.
- `sbvid`가 종료 3(판정 불가 — 구간이 한계에 걸침)이면 **같은 전환을 두 번 더** 찍어 본다. 셋 다 3이면 그 전환은 「잴 수 없음」으로 적는다(통과로 세지 않는다). **종료 4(판정 불가(환경))는 다시 찍어도 같다** — 렌더러가 SwiftShader면 찍지 않고(API 37 에뮬레이터), 호스트 GPU 기기인데 4가 나오면 프레임 간격 중앙을 보고(호스트 부하 · 녹화 길이) 짧게 다시 찍는다. 값은 기록하고 통과로 세지 않는다.
- **기기를 바꾸면**(`ID`를 바꾼 뒤) 맵이 선 상태에서 `shot dev-map; sbzones "$OUT/dev-map.png"`와 `envrec`을 한 번씩 한다(Pixel_8 · API 30 모두). **`sbvid`는 시계 구역을 기기별 파일(`zones-$ID.txt`)에서 읽고 없으면 실패한다** — r02 결함 1: 새 셸에서 `sbzones` 없이 `sbvid`를 불러 기본 구역(2,14)이 쓰여 API 30 영상이 전부 `N` → FAIL이 됐다(S9 M2 닫기 · Dialog).
- 이름은 `names`로 먼저 확인한다. 노드로 보이는 이름은 위 「노드 이름 · 좌표」의 목록뿐이다.
- **HOME 복귀에 `am start -n "$ACT"`를 쓰지 않는다** — extra 없이 debug 빌드를 시작하는 명령이라 번들 URL을 잃는다(결함 6). 복귀는 최근 앱 카드(S7 (b)) 또는 extra를 실은 `am start`다.

### 좌표 (Pixel_8 1080x2400 · R6_API30 1080x2340 — 노드로 보이지 않는 것)

노드로 보이지 않는 항목은 **스크린샷에서 좌표를 읽어** 누른다. 얻는 방법: 그 화면에서 `shot 이름`으로 PNG를 받아 열어 본다 — 이미지 뷰어가 900x2000으로 줄여 보이면 **1.2를 곱한다**(캡처는 1080x2400이고 `input tap`도 같은 픽셀이다). 다른 기기는 다시 읽는다(API 30은 아래 표).
첫 실행에서 쓴 좌표(Pixel_8)와 저장된 캡처(`S0-map.png` · `S1-dialog.png`)로 대조한 값:

| 무엇 | 좌표 | 화면 |
|---|---|---|
| 맵의 `Episode intro` 항목(표지) | `540 442` | 맵(진행 0). 진행이 있으면 항목 위치가 바뀐다 — 캡처로 다시 읽는다 |
| 트로피 칩 | `288 216` | 맵 상단 |
| 연속 학습(불꽃) 칩 | `120 216` | 맵 상단 |
| 학습 화면의 `Listen to a Hello` · `Start`(S1 (c)) | `540 1858` · `540 1934` | `audioProgress` 시드 + 맵을 아래로 **두 번** 민 뒤 — **Pixel_8(API 37, 1080x2400)에서 r03이 스크린샷에서 읽은 값**이다. B3의 좌표는 390x844 기준이라 이 해상도에서는 그대로 쓸 수 없다. 시드 · 스크롤이 다르면 캡처로 다시 읽는다 |
| 서사 · 첫 단원 안내를 넘김 | `540 1200` (`tapmid`) | 서사 · 안내 — 화면 어디나 된다 |
| 탭 바의 설정 · 롤플레이 · 맵 아이콘 | `792 2304` · `540 2304` · `288 2304` | 탭 바. `^Settings`는 머리글 텍스트(`540 342`)를 먼저 맞추므로 좌표로 누른다(저장된 `S1-dialog.png`에서 읽음) |
| 로그아웃 확인창의 `Stay signed in` | `540 1342` | 설정의 `Sign out` 확인창(노드로 안 보인다 — `S1-dialog.png`에서 읽음) |
| 채팅의 전송 화살표 | `943 2242` | 채팅 — 한 번이 아니라 **여러 턴** 눌러야 서사로 돌아온다(S6 (c)) |
| `Our Imagined Café` 항목(맵) | `540 1764` | `visualNovelProgress` 시드 + 맵을 아래로 **3회** 민 뒤(r02 값). 시드 · 스크롤에 따라 바뀐다 — `S10-vn-map` 캡처로 다시 읽는다 |
| `Final test` 항목(맵) | `540 1674` | `finalProgress` 시드 + 맵을 아래로 **3회** 민 뒤(r02 값) — `S10-final-map` 캡처로 다시 읽는다 |
| 분할 화면(Pixel_8, API 37) | 앱 칩 `408 372` · `Split screen` `420 654`(r03: 노드 `422 651`) · 고를 카드 `540 1200` · 해제 구분선 `540 1200` → `540 2350` | 최근 앱 화면 — S7 (c). r03이 이 순서가 기기에서 동작함을 확인했다 |

**R6_API30(1080x2340) 좌표** — r03 실행이 쓴 값이다(Pixel_8과 높이가 달라 y가 다르다. 맵 · 탭 바 · 칩 위치는 캡처로 다시 읽는다):

| 무엇 | 좌표 | 비고 |
|---|---|---|
| 맵의 `Episode intro` 항목(표지) | `540 468` | 맵(진행 0) |
| 트로피 칩 | `322 234` | 맵 상단 |
| 연속 학습(불꽃) 칩 | `129 234` | 맵 상단 |
| 채팅의 전송 화살표 | `936 2109` | 채팅 — 여러 턴 눌러야 서사로 돌아온다(S6 (c)) |
| 탭 바의 설정 · 맵 아이콘 | `803 2108` · `313 2108` | 탭 바 |
| 로그아웃 확인창의 `Stay signed in` | `540 1342` | Pixel_8과 같다 |
| `Back to map` | 노드 이름 | 두 기기 같다 |

### 시작과 끝 — 공통

시작 전: `globals`를 기록하고 위 표대로 맞춘다. 항목 묶음마다 `fixture …`로 시작해 끝에서 `fixture_stop`. 끝난 뒤 되돌리기는 맨 아래 「끝난 뒤 되돌리기」다.

## 항목

기대 red는 **구현 전**(HEAD `84759d5c` — 표지 · 호스트 동기화 없음) 기준이다. **구현 전의 FAIL은 계약 단계의 실측 캡처(`artifacts/spec/pre-*.png`)와 통합 설계 단계의 캡처(`artifacts/integration-design/sbi-*.png`)에 도구를 돌려 확인한 것이고(맨 아래 「도구를 돌려 본 기록」), 이 절차를 구현 전 빌드로 기기에서 돌린 것은 아니다.**
**가드**는 구현 전에도 통과하지만 표지가 엉뚱한 곳에 새거나 기본값이 지워지면 실패하는 기준이다.

### S1 — 밝은 표면은 어두운 아이콘 그대로 · 스크림 0.45는 뒤집지 않는다 (AC2 · G7) — 가드

- **기기 · 빌드**: Pixel_8 · debug + 픽스처(스플래시만 bundled). 옵션 없음(학습 화면은 `audioProgress`).
- **조작 · 캡처**
  ```sh
  fixture
  sbcheck S1-map dark                                  # (a) 여정 맵
  tapxy 792 2304; waitre '^Sign out$' 10; sbcheck S1-settings dark      # (b) 설정 탭(좌표 — 「좌표」) · 도착은 `Sign out` 노드
  tapxy 540 2304; sleep 1; sbcheck S1-roleplay dark                     #     롤플레이 탭도 같은 기준
  ```
  (c) **학습 화면 하나**: `fixture_stop; fixture -e audioProgress true` 뒤 맵을 아래로 **두 번** 밀고 `Listen to a Hello`(`tapxy 540 1858`) → `Start`(`tapxy 540 1934`)로 학습 유닛(듣기)을 열어 `sbcheck S1-learning dark`. 좌표는 **Pixel_8(API 37, 1080x2400)에서 r03이 스크린샷에서 읽은 값**이다 — [Android 시스템 뒤로가기](android-system-back.md) B3의 좌표는 390x844 기준이라 이 해상도에서 그대로 쓸 수 없다(r03 결함 4). 시드 · 스크롤이 다르면 캡처로 다시 읽는다. r03: **PASS** 20.71:1.
  (d) **스플래시**(JS 스플래시 — 시스템 스플래시가 아니다): `bundled` APK에서 [Android 실행 시 색과 적응형 아이콘](android-launch-appearance.md)의 `early`로 **3초** 뒤 무손실 한 장(`early S1-splash 3`)을 찍고
  `python3 "$TOOLS/sbpng.py" check "$OUT/S1-splash.png" dark` — 그 PNG를 열어 **가운데에 시스템 스플래시 아이콘이 없고 JS 스플래시(워드마크)인지** 눈으로 확인한다. **JS 스플래시는 3초에 선다**(r02: Pixel_8에서 `early … 1.6`은 **시스템 스플래시** — 무늬 없는 주황 위 흰 아이콘 — 였고 0.8 · 1.2 · 1.6 · 2.0초 모두 그랬다. 3초는 JS 스플래시 · 5초는 맵). 시스템 스플래시면 흰 아이콘(API 31+ 플랫폼 결정, L7-a의 받아들인 값)이라 이 항목의 대상이 아니다 — 시간을 늘려 다시 찍는다. `bundled` 빌드는 번들 URL extra가 필요 없어 `am start`에 붙일 것이 없다.
  (e) **스크림 0.45**(`Dialog`): 설정의 로그아웃 확인을 연다 — 그 동안 영상으로 뒤집힘이 없는지도 본다.
  ```sh
  tapxy 792 2304; waitre '^Sign out$' 10                                 # 설정 탭으로 돌아와 있다(이미 있으면 생략)
  rec S1-dialog 30
  tapre '^Sign out$'; sleep 1.5                                          # 설정의 `Sign out` 행(노드 이름 확인됨) → 확인창(스크림 페이드 250 ms)
  sbcheck S1-dialog dark --clock-min 4.5 --icon-min 3.0                  # API 37. API 30 은 S9 의 기록 규칙(--clock-min 0)
  tapxy 540 1342; sleep 1.5                                              # 확인창의 `Stay signed in` — 노드로 안 보여 좌표로 닫는다
  recstop S1-dialog; sbvid S1-dialog D                                   # 열림 · 닫힘 내내 D 하나 — 뒤집히면 FAIL
  ```
  확인창이 떠 있는 동안 `Sign out`이 확인창 버튼과 행 두 곳에 있다 — 확인창을 열기 전에 한 번만 `tapre`한다.
  (f) **`BottomSheet`**(스크림 0.45): **도달 실패 — vitest IS9가 증거다.** `completeProgress`로 맵이 13/13까지 갔지만 설문 시트가 5초 뒤에도 없었다(`S1-sheet-try.png` — 배경 `#FFFDFC` 그대로). 다시 시도하려면 `fixture -e completeProgress true`로 시작해 맵에서 10초 기다려 본다 — 안 뜨면 같은 결론이다. 통과로 세지 않는다.
- **판정** (구현 전에도 통과 — 가드)
  - (a) ~ (d): 1차 `LIGHT_STATUS_BARS` **있음** · `LIGHT_NAVIGATION_BARS` 있음, 2차 `sbpng.py check … dark` PASS(시계 4.5 · 아이콘 3.0, 스플래시는 API 37에서 6.96:1).
  - (e): 스크림이 떠 있는 동안 1차 **있음**, 2차 아이콘 3.0 · API 37 시계 4.5(계산 7.27 — 첫 실행 7.37:1), 영상 `sbjudge.py … --expect D`가 **PASS(순서가 D 하나)**. 표지가 `Dialog`에 새거나 스크림에서 뒤집으면 FAIL이다. (f)는 도달 실패 — 판정하지 않는다.
- **구현 전 관찰**: 맵 PASS 20.71:1 [실측 `pre-map-gesture.png` — 도구를 다시 돌려 PASS 확인]. 나머지는 [추론 — 같은 창 · 같은 플래그].

### S2 — D1 표지(`episode-intro`)는 밝은 아이콘 (AC1)

- **기기 · 빌드**: Pixel_8 · debug + 픽스처, 옵션 없음.
- **조작 · 캡처**
  ```sh
  fixture
  tapxy 540 442; waitre '^Next$' 15; sleep 1                 # 맵의 `Episode intro` 항목은 노드가 아니라 좌표(「좌표」)
  sbcheck S2-intro light
  python3 "$TOOLS/sbpng.py" dist "$OUT/S2-intro.png"        # 기록
  ```
- **판정**: 1차 `LIGHT_STATUS_BARS` **없음** · `LIGHT_NAVIGATION_BARS` 있음. 2차 `light` — 시계 · 아이콘 휘도 ≥ 0.9, 시계 ≥ 4.5, 아이콘 ≥ 3.0(띠 `#1B1613` 위 흰색이면 17.9:1).
- **구현 전 관찰**: **FAIL** — `apr=LIGHT_STATUS_BARS LIGHT_NAVIGATION_BARS`, 띠 `#1B1613` 위 `#000000`. 도구를 구현 전 캡처에 돌린 결과: 고친 도구는 흰 글리프 묶음을 찾지 못해 FAIL이다(검정 아이콘이라 속 픽셀이 없다 — 고치기 전 도구는 휘도 0.009 · 대비 1.00:1로 FAIL이었다. → 「도구를 돌려 본 기록」).

### S3 — D1′ 표지 위 건너뛰기 확인창도 밝은 아이콘 · 닫아도 유지 (T5)

- **조작 · 캡처**: S2의 표지에서
  ```sh
  rec S3-dialog 30
  tapre '^Skip$'; waitre 'Keep watching' 10; sleep 1
  sbcheck S3-dialog light                                    # 확인창(스크림 0.45)이 표지 위 — 띠 #1B1919
  tapre 'Keep watching'; sleep 1.5
  sbcheck S3-after light                                     # 닫은 뒤에도 표지의 명암 그대로
  recstop S3-dialog; sbvid S3-dialog L                       # 열림 · 닫힘 내내 L 하나
  ```
- **판정**: 확인창이 떠 있는 동안과 닫은 뒤 모두 S2와 같은 기준(1차 없음 · 2차 light), 영상은 `L` 하나(뒤집히면 FAIL — 스크림이 명암을 가져가면 안 된다).
- **구현 전 관찰**: **FAIL** [추론 — 같은 창 · 같은 플래그, 통합 설계 단계의 `sbi-2-intro.png`와 같은 띠. 확인창 캡처는 이 단계에 없다].

### S4 — D2 서사는 밝은 아이콘 (AC1)

- **조작 · 캡처**: S2의 표지에서 `Next`.
  ```sh
  tapre '^Next$'; sleep 2                                    # 서사에는 `Next line` 같은 노드가 없다(탭 바 잔상만 보인다) — 고정 대기 후 스크린샷으로 서사가 섰는지 본다
  sbcheck S4-b1 light                                        # 첫 장면(기내 창 그림 — 배경이 지정된 장면, 256 px 명암)
  tapxy 540 1200; sleep 1.2                                  # 서사는 화면 어디를 눌러도 넘어간다(첫 탭은 타자 효과를 끝낸다 — 장면이 바뀌었는지 `shot`으로 본다)
  sbcheck S4-b2 light                                        # 둘째 장면
  ```
  **서사는 2장면 뒤 채팅으로 넘어간다** — 셋째 서사 장면은 없다. `tapmid 3`은 서사를 끝내고 채팅으로 간다(첫 실행에서 확인 — 채팅이 서는 순간을 영상에 담아야 하면 `tapmid 3` 대신 `tapuntil_dark`, S6 (c)). 「상상」 전환의 3000 ms 베일은 **관찰되지 않았다** — 이 항목은 장면 둘만 판정한다.
- **판정**: S2와 같다. 서사는 그림 위라 배경은 **글리프 묶음마다 인접한 배경의 최악 픽셀**로 잰다(design 2.4 — 계산상 흰 아이콘 9.67:1 이상). 두 캡처 모두 PASS여야 한다. 기대 수치는 **범위**다(고친 정의로 잰 저장된 캡처 · r02의 실측): 시계 12.29 ~ 13.28 · 아이콘 최악 12.43 ~ 13.82 — 12.29 / 13.82 · 13.13 / 12.64 · (r02) 12.29 / 13.44 · 12.29 / 13.82. 어느 쌍이 나오는지는 장면 번호가 아니라 **캡처 순간의 그림**이 정한다(r02: 두 번째 캡처가 첫 실행의 둘째 장면 값이 아니었다). 판정은 4.5 · 3.0이고 수치는 기대의 크기다(첫 실행의 빈 구역 값 14.00 · 12.85는 고치기 전 정의의 값이다).
- **구현 전 관찰**: **FAIL** — 띠 `#1D1815`(최빈), 가장 밝은 지점 `#302B27`, 시계 구역 가장 밝은 픽셀 `#36322E`(휘도 0.033) [실측 `pre-02-prologue-narrative.png`]. 통합 설계 `sbi-3-narrative.png`도 FAIL.

### S5 — D6 지표 모달은 밝은 아이콘 · 인접 배경은 스크림 합성색 · 닫으면 아래 표면으로 (AC1 · G3 · B1)

- **조작 · 캡처**: 맵(옵션 없음)에서
  ```sh
  tapxy 288 216; waitre '^Back to map$' 10; sleep 1         # 트로피 칩(좌표 — 맵 항목 이름은 노드로 안 보인다)
  sbcheck S5-trophy light --bg-expect '#2C292D'              # 트로피 모달 — 1차 + 2차 + 인접 배경이 스크림 합성색
  tapre '^Back to map$'; sleep 1; want_dark_icons            # 닫으면 맵의 어두운 아이콘
  tapxy 120 216; waitre '^Back to map$' 10; sleep 1          # 연속 학습 칩(좌표)
  sbcheck S5-streak light --bg-expect '#2C292D'              # 연속 학습 — 1차 + 2차 + 인접 배경이 스크림 합성색(운석 c 가 띠 아래로 내려가 있어야 통과)
  tapre '^Back to map$'; sleep 1; want_dark_icons
  python3 "$TOOLS/sbpng.py" dist "$OUT/S5-streak.png" light  # 기록
  ```
- **판정**: **트로피 · 연속 학습 둘 다 2차까지** 본다(「그림이 겹치는 표면은 트로피 모달로 판정한다」는 문장을 지웠다 — r03.2).
  1차: 둘 다 `LIGHT_STATUS_BARS` **없음**, 닫으면 **있음**(어두운 아이콘).
  2차: 모든 글리프 묶음(시계 · 알림 · 셀룰러 · Wi-Fi · 배터리)의 **인접 배경 최악 픽셀이 스크림 합성색 `#2C292D`에서 채널 차 8 이내 그리고** 시계 ≥ 4.5 · 아이콘 묶음 각각 ≥ 3.0(기대 14.36 · 14.36).
  대비 하한만으로는 구현 전에도 통과한다(주황 위 흰 아이콘 3.02:1) — 그래서 **「인접 배경이 스크림 색」이 판정의 일부다.**
- **구현 전(HEAD `db44f884`, 운석 c가 `top: -17px`)의 기대**: 트로피 **PASS**(14.36 · 14.36). **연속 학습 FAIL** — 셀룰러 · Wi-Fi · 배터리의 인접 배경이 `#F46B18`(색 쌍 3.02 — 대비 하한은 넘지만 배경 색 조건이 실패한다) [저장된 `S5-streak.png`를 고친 도구로 재측정 — 「도구를 돌려 본 기록」의 r03].
  이 캡처가 구현 전의 FAIL을 보이는 **구현 전 캡처**다. 구현 뒤 기대는 인접 배경 `#2C292D` · 14.36 · 14.36 [추론 — 구현 뒤 캡처로 확인].
- **실행 결과**: **r02 PASS**(HEAD `6b3110c3` · API 37) — 트로피 시계 · 알림 · 아이콘 14.36 · 모든 묶음 인접 배경 `#2C292D` · 닫으면 어두움. 연속 학습 5묶음 모두 인접 배경 `#2C292D` · 14.36:1 ×5 · `--bg-expect '#2C292D'` 통과 · 닫으면 `apr=LIGHT_STATUS_BARS`. 첫 실행의 연속 학습 PASS(빈 구역 14.36)는 틀렸고(구현 전 인접 배경 `#F46B18` · 3.02) 이번 PASS는 **인접 배경 정의 · 운석을 내린 뒤의 값**이다. 운석 전후 수치는 「실행 결과」의 r02.
- **구현 전 관찰(원래 구현 전 — 표지 없음)**: **FAIL** — 1차 [실측: 같은 `apr=`]. 구현 전 연속 학습 캡처(`pre-07-stat-modal-gesture.png`)는 검정 아이콘이라 흰 글리프 묶음이 없고 고친 도구가 FAIL을 낸다.

### S12 — 연속 학습 모달의 운석 c는 상태바 아래에 있다 (B1)

- **기기 · 빌드**: (a) Pixel_8(API 37 · 제스처 · 위쪽 inset 132px = 50.3dp) (b) R6_API30 (c) iOS 시뮬레이터 · debug + 픽스처(옵션 없음) · 연속 학습 칩 `120 216`(API 30은 y를 캡처에서 다시 읽는다).
- **조작 · 캡처**: S5의 연속 학습 모달에서 무손실 캡처 한 장. 위쪽 inset 높이는 같은 기기의 상태바 높이다 — API 37은 132px(50.3dp), API 30은 **145px** — `dumpsys window`의 `InsetsSource … STATUS_BAR frame=[0,0][1080,145]` 줄에서 읽는다(캡처에서 읽는 것보다 쉽다. 그 줄 모양은 r02가 읽었고 r03이 API 30에서 `InsetsSource type=ITYPE_STATUS_BAR frame=[0,0][1080,145]`를 읽었다 — API 37의 줄은 r03에서 읽지 않았다(132px는 r02 값)).
  ```sh
  tapxy 120 216; waitre '^Back to map$' 10; sleep 1
  shot S12-streak
  python3 "$TOOLS/sbpng.py" count "$OUT/S12-streak.png" '#F46B18' --above 132     # 띠(y < 132) 안의 운석 주황 픽셀 수 — 0이어야 PASS(API 30 은 그 기기의 inset)
  python3 "$TOOLS/sbpng.py" check "$OUT/S12-streak.png" light --bg-expect '#2C292D'   # 같은 캡처의 S5 판정
  ```
  (c) iOS 시뮬레이터: 로그인 없이 닿는 길이 있다 — dev 전용 playground 번들(`apps/mobile`의 `src/playground/TutorialJourneyFixture.tsx`, 기본 화면 `tutorial-journey`)이 인증 없이 실제 `AppSession`(맵)을 띄운다. 번들은 모의 값(`PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test`)으로 만든다. 절차(test-runner가 `review-p1.md`에 적은 그대로):
  1. `rspeedy dev`를 **3001 포트**로 띄운다(dev 명령에서만 `playground.lynx.bundle`이 만들어진다). 3000 포트는 다른 워크트리의 개발 서버일 수 있어 쓰지도 건드리지도 않는다.
  2. Debug Host를 시뮬레이터(iPhone 17 Pro)에 깔고 `--bundle-url=http://localhost:3001/playground.lynx.bundle`로 띄운다(`simctl launch … --bundle-url=…`).
  3. 맵에서 연속 학습 칩을 탭한다(포인트 `46 94`, `idb ui tap 46 94`) — 같은 화면의 모달이 뜬다. 한 장 캡처.
  4. 판정이 아니라 관찰이다: 무손실 캡처에서 `sbpng.py count '#F46B18' --above <inset 위 높이 px>`(inset 62pt = 186px @3x)가 0이고 운석 c의 위치 · 모달의 다른 요소와 겹침이 없는지 눈으로 본다. 변경 전(`dca104d8`)은 임시 git worktree에서 3002 포트로 같은 절차를 되풀이해 비교했다.
  한계: playground 번들은 dev 전용이라 **제품 `main` 번들이 아니다**(모달 컴포넌트 · CSS는 같은 소스이고 `AppSession` 실제 경로다). 로그인 뒤 `insets` 전달은 같은 호스트 globalProps(`safeAreaInsets`)이나 제품 번들로는 보지 않았다. 스트릭 0 한 장면만 찍었다. 이 절차는 iOS 파일을 바꾸지 않는다.
- **판정**: 무손실 캡처에서 **운석의 주황(`#F46B18`) 픽셀이 위쪽 inset 높이 위에 0개**((a) y < 132px, (b) 그 기기의 inset). 운석 a · b의 자리는 구현 전 캡처와 같다(구현 전 `S5-streak.png`와 같은 자리에 같은 모양).
- **구현 전(HEAD `db44f884`)의 기대**: (a) **FAIL** — 띠 안에 주황 픽셀이 있다(운석 c가 y −17 ~ 69px에 놓인다). (b) 미관찰. (c) iOS: 운석 c가 inset 위에 주황 픽셀 10185개(Wi-Fi · 배터리를 덮음 — 실제 관찰, 아래).
- **실행 결과**: **r02**(HEAD `6b3110c3`) — (a) API 37 **PASS**: `count '#F46B18' --above 132` = **0**(트로피 모달도 0). (b) API 30 **PASS**: inset 145px(`dumpsys`의 InsetsSource) `--above 145` = **0** · check `--bg-expect` PASS 14.36 ×5. (c) iOS 시뮬레이터 **r02에서는 미실행**(닿지 못함) — 리뷰 뒤(2026-10-06) test-runner가 관찰했다(아래 「리뷰 뒤 iOS 관찰」). 운석 전후: 주황 글리프 y 0..135 → 177..312 · 띠 안 주황 픽셀 6951 → 0 · 인접 배경 `#2C292D` · 14.36(「실행 결과」의 r02).

### S13 — API 33 또는 34에서 어두운 아이콘의 실측 색을 적는다 (B7 · 기록)

- **기기 · 빌드**: API 33 또는 34 AVD(`Pixel_8` 계열을 새로 만들거나 있는 것을 쓴다) · debug + 픽스처 · 위 「시작 전 전역 설정」과 같이 되돌릴 수 있는 상태에서.
- **조작 · 캡처**: 두 장 — 여정 맵(밝은 면)과 설정의 로그아웃 확인창(스크림 0.45).
  ```sh
  fixture; shot S13-map; python3 "$TOOLS/sbpng.py" dist "$OUT/S13-map.png" dark                  # 맵
  tapxy 792 2304; waitre '^Sign out$' 10; tapre '^Sign out$'; sleep 1.5
  shot S13-dialog; python3 "$TOOLS/sbpng.py" check "$OUT/S13-dialog.png" dark --clock-min 0 --icon-min 0   # 확인창(스크림 0.45) — 출력만 읽는다
  ```
- **판정하지 않는다 — 기록한다**: 어두운 아이콘의 실측 색(60% 검정인지 100% 검정인지)과 시계 색 쌍. 결과를 `design.md` 2.2의 표와 ADR-0050에 넣는다. 기록할 때 `adb shell getprop ro.build.version.sdk`를 함께 적는다.
- **실행 결과**: **미실행 · 후속 항목** — 그 수준의 AVD가 없다(r02도 같다 — system-images는 API 30 · 37.2뿐이고 이미지를 내려받지 않았다). 통과로 세지 않는다. 이 항목이 끝나기 전까지 「스크림 0.45 위 어두운 아이콘의 시계」의 근거는 **API 30 실측 3.81 · API 37 실측 7.37이고 API 31 ~ 36은 미실측**이다.

### S6 — 전환(영상): 표면이 바뀌는 순간 명암이 같이 바뀐다 (AC3 · T1 · T2 · T4)

- **기기 · 빌드**: Pixel_8 · debug + 픽스처, 옵션 없음. 각 전환을 `rec` → 조작 → `recstop` → `sbvid`로 한다(영상 한 개에 전환 하나). **영상은 짧게 찍는다**(`rec 이름 12` 정도) — 환경 조건은 전환 직후의 프레임 간격만 본다(「판정 정의」).
- **시작 전 — 렌더러와 호스트 부하를 기록한다**: `envrec`(「시작 전 전역 설정」). `GLES:` 줄에 `SwiftShader`가 있으면 이 기기에서 S6의 지연은 **판정 불가(환경)**다 — 순서 · 깜빡임은 그대로 판정한다. 호스트 부하가 바뀌면 묶음 전후로 `envrec`을 다시 한다(r02: load average 3.4 ~ 11). 기기마다 `sbzones`도 먼저 한다(`sbvid`가 시계 구역 파일을 요구한다).
- **조작 · 캡처**
  ```sh
  envrec; shot dev-map; sbzones "$OUT/dev-map.png"                                   # 기기마다 한 번(맵이 선 뒤)
  fixture
  [ "$(fixture_left)" -gt 60 ] || echo "픽스처 남은 시간이 모자란다 — fixture 를 다시"
  rec S6a;  tapxy 540 442; sleep 2.5; recstop S6a;  sbvid S6a D,L                  # (a) 맵 → 표지
  rec S6b;  tapre '^Next$'; sleep 2.5; recstop S6b;  sbvid S6b L                   # (b) 표지 → 서사 (같은 명암끼리 — 변화 0회)
  ```
  (c) 서사 → 채팅 → 서사 → 통화: **서사에서 `rec S6c1; tapuntil_dark; sleep 1.5; recstop S6c1`, `sbvid S6c1 L,D`** — 서사는 2장면 뒤 채팅으로 넘어간다. **`tapmid 3` + 고정 대기로 찍지 않는다**: API 37(SwiftShader)에서는 채팅이 그보다 늦게 서 영상이 L만 담았다(r03 `a37-n2chat-1 · -2`가 기대 `L,D`에 순서 FAIL — 제품 결함이 아니라 이 조작 타이밍이다). `tapuntil_dark`는 r03이 실제로 쓴 방법 — 탭 → 1.5초 → `apr`에 `LIGHT_STATUS_BARS`가 생기면 중단 — 이고 `apr`로 채팅이 서는 순간까지 폴링해 다시 찍은 `a37-n2chat-3 · -4`는 순서 PASS였다.
  채팅에서 서사로 돌아오는 전환은 `rec S6c2` 뒤 **전송 화살표(Pixel_8 `943 2242` · API 30 `936 2109`, 「좌표」)를 여러 턴 연달아 누른다**(`tapxy 943 2242; sleep 1.5`를 서사가 설 때까지 — 한 번으로는 안 끝난다). 서사가 서면 한 장면 넘겨 통화까지 가서 `recstop S6c2`, `sbvid S6c2 D,L,D`(영상에 채팅 → 서사 → 통화가 있다). **서사 → 채팅 직후에 이어 찍으면 영상 앞에 서사 → 채팅(L→D)이 같이 담긴다 — 그때 기대는 `L,D,L`이다**(r03 `a37-chat2n-1 · -2`; 앞의 전환을 따로 찍은 영상은 `D,L`). 채팅 앞 서사 → 채팅은 안내 없는 준비(`fixture` 옵션 없음)라 표지 수가 1 → 0이다.
  ```sh
  # (d) 모달 열기 · 닫기 (맵에서)
  rec S6d;  tapxy 288 216; sleep 2; tapre '^Back to map$'; sleep 2; recstop S6d;  sbvid S6d D,L,D
  # (e) 표지 → 뒤로 (표지에서)
  rec S6e;  tapre '^Back to map$'; sleep 2.5; recstop S6e;  sbvid S6e L,D
  ```
- **판정**: `sbvid`(= `sbjudge.py`)의 종료 코드. 「판정 정의」의 세 가지를 따로 본다.
  1. **순서 · 깜빡임**(항상): 순서가 기대와 같고(왕복 · 떨림 없음 — 한 전환에 아이콘 색 변화는 한 번), 같은 명암 사이에 시계가 보이지 않는 프레임이 없다. (b)는 명암 변화 0회가 핵심이다 — 표지 → 서사에서 기본값(어두운 아이콘)으로 갔다 오면 `L,N,L`로 깜빡임 FAIL이다.
  2. **환경 조건**: 렌더러에 `SwiftShader`가 없고 그 전환의 **전환 직후(표면 변화 뒤 0.5초 안) 프레임 간격 중앙이 25 ms 이하**. 안 서면 지연은 **판정하지 않고 「판정 불가(환경)」(종료 4)** — 통과가 아니다. **API 37(SwiftShader) 에뮬레이터에서는 화면 지연이 늘 이 상태다.** 화면 지연을 실제로 판정하는 곳은 호스트 GPU로 뜬 에뮬레이터(API 30 — S9)다.
  3. **지연**(조건이 설 때): 표면 변화 프레임 → 아이콘 색 전환의 **시작 ≤ 100 ms · 끝 ≤ 300 ms**(중간색 프레임이 없으면 끝만 판정하고 시작은 기록). 구간 · 판독 지연 · 보수 상한 · 프레임 간격(영상 전체의 최소 · 중앙 · 최대 · **전환마다 전환 직후 0.5초 안의 중앙**)은 모두 적는다. 「지연 값 없음」(같은 프레임 변화)은 값으로 적지 않는다. `--emit-lag` 가정은 그대로다(「판정 정의」).
  종료 3(구간이 한계에 걸침) · 종료 4는 통과가 아니다 — 「셸 관용구」의 규칙대로 다룬다.
- **첫 실행의 결과(고치기 전 도구)**: (a) PASS +52 ms(+34 ~ +102) · (b) L 하나 · 변화 0회 · 서사 → 채팅 PASS +148 ms(+42 ~ +198) · 서사 → 통화 PASS +101 ms(0 ~ 185). 채팅 → 서사(+83 ms) · (d) 둘(+69 · +85 ms) · (e) 셋(+65 · +71 · +70 ms)은 순서만 맞고 지연은 **판정 불가**였다.
- **r02의 결과(고치기 전 정의, API 37)**: 순서 · 깜빡임 FAIL 없음. 지연은 점 추정이 +85 ~ +433 ms로 흩어져 PASS · 판정 불가 · **FAIL 4건**(맵 → 표지 +421 · 모달 열기 +433 · 채팅 → 서사 +413 · +373)이었다 — 표는 「실행 결과」의 r02. **진단은 이것을 환경(SwiftShader)으로 본다**: 앱 안은 5 ms 이하 + 한 프레임이고 SystemUI의 120 ms 색 애니메이션이 CPU 렌더링의 71 ~ 223 ms 프레임 간격에 늘어났다. **r03 재판정: API 37은 종료 4(판정 불가(환경))였다**(r02 FAIL 4건 영상도 같다 — 「실행 결과」 r03의 4절). 지연의 판정은 API 30(호스트 GPU)이 진다 — r03 결과는 「실행 결과」 r03.
- **구현 전 관찰**: **FAIL** — 어두운 표면에서 아이콘이 끝까지 어둡다. 합성 프레임 표로 같은 모양(`D` 뒤 `N`만)이 `sbjudge.py`에서 FAIL로 나오는 것을 확인했다(「도구를 돌려 본 기록」). 구현 전 영상은 이 단계에 없다.
- **기록(판정 아님)**: 각 전환의 시작 · 끝(점 추정 · 구간), 프레임 간격(최소 · 중앙 · 최대), 렌더러 · 호스트 부하(`envrec`).

### S7 — 구성 변경 · 복귀에서 표지의 명암이 남는다 (AC4 · G4 · G5 · T8)

- **기기 · 빌드**: Pixel_8 · debug + 픽스처. 표지가 떠 있는 채 시작한다(`fixture` → `tapxy 540 442` → `waitre '^Next$'`). **전역 설정은 항목마다 되돌린다.**
- **조작 · 캡처 · 판정**
  ```sh
  mark
  A shell cmd uimode night yes; sleep 2; want_light_icons; shot S7a-night-on; lc          # (a) 야간 켬 — 재생성 없음 · 밝은 아이콘 유지
  A shell cmd uimode night no;  sleep 2; want_light_icons; shot S7a-night-off; lc         #     야간 끔
  A shell input keyevent KEYCODE_HOME; sleep 2; shot S7b-launcher                         # (b) HOME → 복귀: 런처 화면
  # 복귀는 `am start -n "$ACT"` 로 하지 않는다 — extra 없이 debug 빌드를 시작하는 명령이다(결함 6). 런처의 앱 아이콘을 눌러 돌아오거나 아래 최근 앱 카드로 돌아온다.
  # A shell input tap X Y            ← 런처의 앱 아이콘 좌표를 S7b-launcher.png 에서 읽는다(「좌표」의 방법). 아이콘이 없으면(계측 설치만) 최근 앱으로
  sleep 2; want_light_icons; sbcheck S7b-home light
  A shell input keyevent KEYCODE_APP_SWITCH; sleep 2; shot S7b-recents                    #     최근 앱 → 앱 카드를 눌러 돌아온다(좌표는 이 캡처로 확인 — 앞선 L6 (c)와 같다)
  # A shell input tap 540 1100       ← 카드 위치를 S7b-recents.png 로 보고 누른다
  sleep 2; want_light_icons; sbcheck S7b-recents-back light
  ```
  (c) **분할 화면**: 앱을 **위쪽**에 둔다. 이 기기(Pixel_8 API 37)에서 r02가 한 순서: 최근 앱(`KEYCODE_APP_SWITCH`) → 앱 칩 `408 372` → `Split screen` `420 654` → 아래쪽에 고를 카드(설정) `540 1200`. 해제는 구분선을 `540 1200`에서 `540 2350`으로 스와이프한다(좌표는 캡처에서 다시 읽는다 — 「좌표」). 일반 조작은 [Android 화면 방향과 구성 변경](android-orientation.md) O6의 조작 1 · 2다. 앱 창의 `apr=`가 **밝은 아이콘**(`want_light_icons`)이고 `sbpng.py check`는 시스템 상태바가 그 위에 그려지므로 PASS · FAIL이 아닌 **기록**으로 적는다. 해제 뒤에도 같은 표지에서 `want_light_icons`. 분할 화면이 서지 않으면 사유를 적고 통과로 세지 않는다.
  ```sh
  # (d) 글꼴 배율 1.3 — 재생성. 스플래시부터 다시 그린다
  A shell settings put system font_scale 1.3; sleep 6
  want_dark_icons                                          # 재생성 직후: 기본값 = 어두운 아이콘 (G5) — debug 빌드에서는 여기까지가 판정이다(아래)
  A shell settings put system font_scale 1.0; sleep 6      # 되돌린다(이것도 재생성이다)
  # 1.3으로 새로 시작한 픽스처의 맵 · 표지(재생성이 아니다 — 시작부터 1.3)
  fixture_stop; A shell settings put system font_scale 1.3; fixture
  want_dark_icons; sbcheck S7d-map-1.3 dark
  tapxy 540 442; waitre '^Next$' 15; sleep 1; sbcheck S7d-intro-1.3 light
  fixture_stop; A shell settings put system font_scale 1.0
  ```
  **debug 빌드의 한계(첫 실행 결함 7)**: 재생성된 창이 **번들 URL을 잃고 JS 스플래시(주황 `#F46B18`)에 머문다**(15초 이상 · `apr=` 어두움 · 검정 아이콘 6.96:1). 기존 debug 한정 결함이다 — `onNewIntent`가 `setIntent`로 extra를 잃는 것과 같은 계열로 **추정**한다(확인하지 않았다). 그래서 debug에서는:
  - **판정은 「재생성 직후의 기본값(어두운 아이콘)」까지다.** 스플래시에 머문 화면에서 표지로 다시 갈 수 없다.
  - **「재생성 뒤 표지에서 다시 밝아짐」은 이 절차로 판정하지 않는다 — 계측 HI6(`StatusBarIconsHostTest.hi6_recreateStartsFromDefaultAndFollowsTheCoverAgain`)이 덮는다.** HI6의 단언: 표지에서 플래그 꺼짐 → `recreate()` → 새 인스턴스는 표지가 아니며 **기본값(켜짐 · 어두운 아이콘)** → 맵에 닿아 **켜짐** → 표지로 다시 가면 새 인스턴스의 플래그가 **다시 꺼짐**.
  - **bundled 빌드(내장 번들)로는 기기에서 확인된다 — r02 PASS.** 계측 픽스처가 bundled APK에서도 동작해(번들 URL extra 불필요) 재생성 전후를 볼 수 있다. 순서: bundled 설치(`:app:assembleBundled`) → `fixture` → 표지(밝음) → `font_scale` 1.3: `lc`가 create 1 destroy 1 relaunch 1, 직후 `apr` 어두움(기본값) → 맵 도착 → 표지로 다시 들어가면 `apr` 밝음(17.94) → 뒤로 가면 어두움 → `font_scale` 1.0: 재생성(누적 2 / 2 / 2) → 표지 밝음. 끝에 debug로 복귀한다(`install -r`). 이 순서의 셸 문장은 r02의 서술을 옮긴 것이고 기기에서 다시 돌리지 않았다.
    ⟨2026-10-08⟩ **minify 뒤에는 이 길이 없다.** `bundled`가 `initWith release`로 R8 축소를 물려받으면서([ADR-0052](../adr/0052-android-release-shrinking.md) D3) 축소한 `bundled` APK에 `SignedInScreenFixtureTest`를 붙이면 러너가 `NoClassDefFoundError`(`kotlin.jvm.internal.Intrinsics` · `androidx.tracing.Trace`)로 죽는다(`Process crashed` — 그 작업의 계약 단계 실측).
    **같은 성질은 계측 HI6(debug)이 진다**(바로 위 항목의 단언). 위의 r02 PASS는 **축소 전 빌드의 기록**으로 남긴다 — 지금 빌드의 통과가 아니다. 축소한 내장 빌드의 기기 화면에서 「재생성 뒤 표지에서 다시 밝아짐」을 보는 수단은 이 문서에 없다.
  재생성 중 픽스처의 Activity 참조가 끊길 수 있다 — 표지에 다시 가려면 `fixture_stop; fixture`로 다시 시작한다.
- **판정**: (a) ~ (c): 1차 `LIGHT_STATUS_BARS` **없음** 유지, (a)는 `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(재생성 없음). (b)는 2차 PASS. (d): 재생성 직후 **있음**(어두운 아이콘), 1.3으로 새로 시작한 맵에서 **있음** · 표지에서 **없음** · 표지 2차 PASS. 「재생성 뒤 표지에서 다시 밝아짐」은 HI6(debug)이 진다 — ⟨2026-10-08⟩ bundled(r02 PASS)는 축소 전 빌드의 기록이고 minify 뒤에는 그 경로가 없다. **전역 설정(night · font_scale)은 항목 끝에서 되돌린다.**
- **구현 전 관찰**: **FAIL**((a) ~ (c)의 「없음」 — 표지에서도 `LIGHT_STATUS_BARS`가 있다). (d)의 스플래시 · 맵 쪽은 가드.

### S8 — 3버튼 모드: 내비게이션 바는 전환이 없다 (계약 2.6)

- **기기 · 빌드**: Pixel_8 · debug + 픽스처. 시작 값 `navigation_mode`가 `2`(제스처)다.
- **조작 · 캡처**
  ```sh
  A shell cmd overlay enable com.android.internal.systemui.navbar.threebutton; sleep 3
  A shell settings get secure navigation_mode                    # 0 = 3버튼 (cmd overlay list 는 모드 확인에 쓰지 않는다 — 둘 다 [x]로 나올 수 있다)
  fixture
  tapxy 540 442; waitre '^Next$' 15; sleep 1
  sbcheck S8-intro light; python3 "$TOOLS/sbpng.py" navband "$OUT/S8-intro.png"        # 표지(D1)
  tapre '^Next$'; sleep 2                                                              # 서사에는 `Next line` 노드가 없다
  sbcheck S8-narrative light; python3 "$TOOLS/sbpng.py" navband "$OUT/S8-narrative.png"  # 서사(D2)
  fixture_stop
  A shell cmd overlay enable com.android.internal.systemui.navbar.gestural; sleep 3       # 되돌린다
  A shell settings get secure navigation_mode                                             # 2
  ```
- **판정**: 상태바: S2 · S4와 같다(구현 전 FAIL). 내비게이션 바(**가드**): 1차 `LIGHT_NAVIGATION_BARS` 있음, `navband` PASS — 띠 휘도 ≥ 0.6(`#E9E8E8` 안팎) · 버튼 휘도 < 0.4(`#666666` 안팎). 전환이 없다는 뜻이다. 끝에 오버레이를 되돌리고 `navigation_mode`를 적는다.
- **구현 전 관찰**: 내비게이션 쪽 가드 PASS [실측 `pre-01-episode-intro-3button.png` 띠 `#E9E8E8` · 버튼 `#666666`; 도구도 같은 값 — 「도구를 돌려 본 기록」]. 상태바 쪽 FAIL.

### S9 — API 30에서의 반복 (P6 · 접근성 7절의 7)

- **기기 · 빌드**: R6_API30(3버튼 · 1080x2340) · debug + 픽스처. `ID`를 이 기기로 바꾼다. 끝나면 `emu kill`.
- **준비**: **시계 구역을 이 기기에 맞춘다** — API 30(1080x2340)은 시계가 **14.8 ~ 21.3%**에 있어(Pixel_8은 4.0 ~ 10.3%) 기본 구역 2 ~ 14%로는 영상이 전부 시계를 못 찾는다(캡처의 `check`는 글리프를 직접 찾아 구역이 필요 없다)(첫 실행에서 영상이 전부 `N` → FAIL이었다). 맵이 선 뒤 한 번:
  ```sh
  shot S9-map; sbzones "$OUT/S9-map.png"      # → zones: --clock 12.8,23.3 --icon 72,95  (SBOPT · `zones-$ID.txt` 가 잡힌다)
  ```
  `sbzones`는 시계 구역을 `$OUT/zones-$ID.txt`에 쓰고 `sbvid`가 그 파일을 읽는다 — **파일이 없으면 `sbvid`는 실패한다**(r02: 새 셸에서 `sbzones` 없이 `sbvid`를 불러 API 30 영상이 전부 `N` → FAIL이 됐다). 이 기기의 `envrec`도 한다.
  저장된 API 30 캡처(`S9-map` · `S9-intro` · `S9-dialog` · `S9-guide-map`)로 확인했다: 기본 구역은 시계 `#FFFDFC` 1.00:1로 FAIL, 맞춘 구역은 맵 5.73 · 표지 17.94 · 스크림 위 3.81 · 안내 4.53:1로 읽힌다. 아이콘 구역(82.2 ~ 93.2%)은 기본(72 ~ 95%)에 든다.
- **조작 · 캡처 · 판정** (맵의 `Episode intro` 항목은 이 기기에서 **`540 468`**이다 — `S9-map.png`에서 읽음. Pixel_8과 높이가 달라 y가 다르다)
  - S1(맵): `fixture; shot S9-map; sbzones "$OUT/S9-map.png"; sbcheck S9-map dark` — API 30의 어두운 아이콘은 **60% 검정**(`#666565`)이라 휘도 < 0.4 · 대비 5.7:1이 기대값이다(design 2.2의 실측).
  - S2: `tapxy 540 468; waitre '^Next$' 15; sleep 1; sbcheck S9-intro light` — 구현 전 FAIL · 구현 뒤 PASS. 밝은 아이콘은 두 기기 모두 `#FFFFFF`다.
  - S6(a): `rec S9a; tapxy 540 468; sleep 2.5; recstop S9a; sbvid S9a D,L`(`sbvid`가 `zones-$ID.txt`를 읽는다). 표지 → 뒤로(`L,D`)도 같다. 첫 실행: 순서 맞음, 지연은 판정 불가였음. r02: 맵 → 표지 +52 · +50 ms · 표지 → 뒤로 +53 · +54 ms · M2 닫기 +52 ms(고치기 전 정의에서 PASS — 점 추정) → 고친 정의(시작 · 끝, 환경 조건)로 저장 영상을 다시 돌려 **PASS**(시작 +50 ~ +54 · 끝 +115 ~ +138, 「도구를 돌려 본 기록」의 r03 뒤). r03은 API 30에서 전환 영상을 새로 찍어 판정했다(S6). API 30은 호스트 GPU로 떠 있어 **화면 지연을 실제로 판정하는 기기**다(「이 절차로 확인되지 않는 것」).
  - **기록**(판정 아님 — 받아들인 값 U2): 스크림 0.45 위 어두운 아이콘의 실측 색과 대비. 설정의 로그아웃 확인창을 열어 `sbcheck S9-dialog dark --clock-min 0 --icon-min 3.0` — **아이콘 3.0만 판정**하고 시계 대비(3.69 ~ 3.80:1 예상)는 출력 그대로 적는다. 첫 실행 실측: 배경 `#999999` · 시계 · 아이콘 `#3D3D3D` **3.81:1(수용 기록 — 시계 4.5 미달 · 아이콘 3.0은 충족)**. **API 30 실측 3.81 · API 37 실측 7.37 · API 31 ~ 36 미실측**(S13).
  - S11(기록): `loadProgress`로 맵의 안내 위에서 `sbcheck S9-guide-map light`(아래 S11) — 어두운 아이콘이 60% 검정이었을 때 2.88 ~ 2.96:1이던 자리가 밝은 아이콘으로 4.48 이상이 되는지 실측으로 적는다.
- **구현 전 관찰**: 미관찰(구현 전 빌드로 API 30을 돌리지 않았다). 앞선 캡처로 맵 · 스크림 수치는 design 2.2에 있다(검60 5.72 · 3.77).

### S10 — D3 최종 테스트 시험 · D4 비주얼 노벨 (픽스처 진행 옵션)

- **기기 · 빌드**: Pixel_8 · debug + 픽스처. **도달은 첫 실행에서 기기로 확인됐다**(D3 · D4 · `roleplay-visual-novel`). 맵의 항목 이름은 노드로 보이지 않으므로 항목은 **스크린샷에서 좌표를 읽어** 누른다(「좌표」의 방법).
- **맵 항목 좌표**: 시드 옵션과 맵 스크롤에 따라 바뀐다. r02 값(시드 + 맵을 아래로 3회 민 뒤) — `Our Imagined Café` `540 1764` · `Final test` `540 1674`(「좌표」). 항상 캡처(`S10-final-map` · `S10-vn-map`)에서 다시 읽는다.
- **D3** (`finalProgress`)
  ```sh
  fixture -e finalProgress true
  A shell input swipe 540 1800 540 800 400; sleep 1; shot S10-final-map     # 맵을 밀어 Final test 가 보이게 — 항목 좌표(`Final test`의 원)를 S10-final-map.png 에서 읽는다(맵 12/13)
  # tapxy X Y                                                               ← 읽은 좌표. 잠금(자물쇠)이면 시드가 안 먹은 것 — 「도달 실패」
  sleep 2; sbcheck S10-final-intro light                                    # 도입 서사(D2) — `Next line` 노드가 없다
  for I in $(seq 1 12); do tapxy 540 1200; sleep 0.9; shot S10-f$I; done   # 시험 단계(문제 · 보기 카드)가 서면 멈춘다 — 프레임을 눈으로 본다
  sleep 1; sbcheck S10-final-exam light                                     # 시험 단계(D3)
  ```
  D3은 가장 빠듯하다(design 계산 4.75:1, 여유 0.25 — design U5). **실측 시계 · 아이콘 대비를 적는다.** 4.5 아래면 FAIL이고 그림이 바뀐 것이다. 시험 단계는 프레임마다 그림이 달라 **최악 프레임**을 적는다.
  **첫 실행 실측(고치기 전 정의 — 빈 구역)**: 시험 단계 최악 프레임 `#595246` **7.72:1**(다른 프레임 13.18:1 · 서사 13.03:1). **고친 정의(글리프 인접 배경)로 같은 캡처를 재측정하면 시계 13.48 · 아이콘 최악 7.32**(배터리 뒤 `#5F5544`)다 — 이 항목의 기대 수치는 7.32다. design의 4.75와는 여전히 다르다 — **기록 항목**: 이 도구는 상단 띠(0.5 ~ 4.2%)의 글리프 옆 배경만 본다. design의 최악점(`#79744F`)은 116 px 명암의 **아래 끝**이라 이 도구가 보지 않는 위치다 — 그것이 4.75와의 차이라는 것은 **추정**이다(확인하지 않았다). 그래서 이 항목의 PASS는 「도구가 보는 띠 안에서」이고, design의 최악점에서의 흰 아이콘 대비를 확인한 것이 아니다.
- **D4** (`visualNovelProgress`)
  ```sh
  fixture_stop; fixture -e visualNovelProgress true
  A shell input swipe 540 1800 540 800 400; sleep 1; shot S10-vn-map        # `Our Imagined Café` 항목 좌표를 이 캡처에서 읽는다
  # tapxy X Y; sleep 0.5; shot S10-vn-early; sleep 3
  sbcheck S10-vn light
  ```
  `S10-vn-early.png`는 그림이 뜨기 전(밝은 면 `#FFFDFC` 위 명암 — 계산상 흰 아이콘 9.71:1)이다. 눈으로 한 번 보고, `python3 "$TOOLS/sbpng.py" check … light`를 같은 기준으로 돌려 값을 적는다.
- **`roleplay-visual-novel`** (`completeProgress`): `fixture_stop; fixture -e completeProgress true`. 설문 시트는 뜨지 않았다(S1 (f)). 롤플레이 탭(`tapxy 540 2304`) → `Our Imagined Café`를 열어(항목 좌표는 캡처에서 읽는다 — 열리면 `Back to list`가 보인다) `sbcheck S10-roleplay-vn light`. 항목이 잠겨 있거나 없으면 「도달 실패」다. 첫 실행: 12.68:1 · 돌아오면 맵 어두움 20.71.
- **판정**: 각 캡처 S2와 같은 기준(1차 없음 · 2차 light). 도달하지 못한 표면은 통과가 아니라 「도달 실패 — IS6 · IS7 · UT4 · UT5가 증거」로 적는다.
- **구현 전 관찰**: D3 · D4 **FAIL** [추론 — 같은 창 · 같은 플래그. 이 표면의 Android 캡처는 이 단계까지 없다 — 이전에는 진행 시드로 닿지 못했다].
- **첫 실행 결과(고치기 전 정의)**: D3 시험 단계 7.72:1(최악 프레임) · D4 0.4초 12.51 · 3초 12.68:1 · `roleplay-visual-novel` 12.68:1 — 모두 PASS, `apr=` 밝은 아이콘. 고친 정의의 재측정(저장된 캡처): D3 13.48 · 7.32 · D4 12.76 · 13.68 — 판정은 같다.

### S11 — 첫 단원 안내: M2 · M3 · M4 · D7과 닫은 뒤 (r02.6)

- **기기 · 빌드**: Pixel_8 · debug + 픽스처 `-e loadProgress true`(진행 0). 안내는 **네 번**(맵 · 서사 · 채팅 · 통화 각 한 번 — `dismissed`가 라우트를 넘어 유지된다) 뜨고, 각 안내는 **화면 탭으로 닫힌다**. **도달은 첫 실행에서 기기로 확인됐다.** 안내문(`Learn Korean through stories` · `Be part of the conversation` · `Listen to a Korean call`)은 노드로 보이지 않는다 — 스크린샷으로 도착을 본다.
- **조작 · 캡처 · 판정**
  ```sh
  fixture -e loadProgress true                                      # fixture 가 `Tap to start your lesson` 까지 기다린다(M2 — 맵의 안내. 끝내 안 뜨면 「도달 실패 — hasLoadedProgress」)
  sbcheck S11-m2 light                                              # M2: 시계 4.5 · 아이콘 3.0
  tapxy 540 1200; sleep 1.5; want_dark_icons                        # 안내를 닫으면 맵의 어두운 아이콘 (T5 · G3)
  tapxy 540 442; waitre '^Next$' 15; tapre '^Next$'; sleep 2        # 표지 → 서사 → 서사의 안내(D7) — 안내문은 노드가 아니라 `shot` 으로 본다
  sbcheck S11-d7 light                                              # D7 — 서사 위 안내. S4와 같은 기준
  rec S11-d7 15; tapxy 540 1200; sleep 2; recstop S11-d7; sbvid S11-d7 L     # 닫혀도 명암 변화 0회
  want_light_icons                                                  # 서사로 남는다
  ```
  그 다음 서사를 마지막 장면까지 넘기면 채팅이 서고 채팅의 안내(M3)가 뜬다. **`tapmid 3`으로는 안 잡힌다**(r02: 서사의 둘째 장면에 머물렀고 탭이 안내를 소비했다) — 서사의 안내를 `tapxy 540 1200`으로 닫은 뒤 **한 번씩 누르며 배경색을 폴링**한다: `pollbg S11-m3 '#767779' 540 1200 14`(M3의 시계 인접 배경 `#767779` — 찾으면 멈춘다) → `shot`으로 확인 → `sbcheck S11-m3 light --clock-min 4.4`(**M3 — 하한 4.4**, 출력의 시계 대비를 그대로 적는다 · 4.5 충족이라 적지 않는다) → 안내를 `tapxy 540 1200`으로 닫고 `want_dark_icons`(채팅 = 밝은 표면).
  채팅을 끝내려면 **전송 화살표(`943 2242`)를 여러 턴** 누른다(한 번으로 끝나지 않는다). 서사가 서면 한 장면 넘겨 통화가 서고 통화의 안내(M4)가 뜬다 — 같은 식으로 `pollbg S11-m4 '#747475' 943 2242 14`(M4 `#747475`)로 잡아 `shot`으로 확인 → `sbcheck S11-m4 light`(M4 — 시계 4.5) → `tapxy 540 1200`으로 닫고 `want_dark_icons`. **폴링은 안내가 선 순간 멈춘다 — 그 뒤 탭은 안내를 닫는 탭이다.** `fixture_left`가 60초 미만이면 새 구간을 시작하지 않는다(만료 → `fixture -e loadProgress true`를 다시 — 안내는 처음부터 다시 선다).
- **판정**
  - 떠 있는 동안: 1차 `LIGHT_STATUS_BARS` **없음**, 2차 시계 · 아이콘 휘도 ≥ 0.9, 아이콘 ≥ 3.0, 시계 M2 · M4 ≥ 4.5 · **M3 ≥ 4.4** · D7은 S4와 같다.
  - 닫은 뒤: 맵 · 채팅 · 통화는 1차 **있음**, 서사는 **없음**.
  - 전환(영상): D7이 뜨고 닫힐 때 명암 변화 0회(`sbjudge … --expect L`). M2를 닫는 영상(`L,D`)은 첫 실행에서 지연이 판정 불가였다(+69 ms 점 추정, API 37) → **API 37은 판정 불가(환경)**(SwiftShader — 값 기록), **API 30은 r03 PASS**(`a30-m2close-1 · -2 · -3` 시작 +54 · +60 · +51 · 끝 +132 · +142 · +140).
- **첫 실행 결과**: M2 4.53:1(`#767678`) · D7 15.85 · M3 **4.48:1(`#767779`) — 하한 4.4 통과 · 기본 4.5로는 FAIL(알고 받아들인 값 — 4.5 충족이 아니다)** · M4 4.67:1(`#747475`), 닫은 뒤 채팅 · 통화 어두움 PASS.
- **구현 전 관찰**: **닿지 못했다 — 픽스처가 진행 불러오기를 404로 답해 안내가 서지 않았다**(spec r02.6의 실측: 맵에 스크림 없음). 이 항목의 FAIL은 **명암**이다 — API 37의 검정 아이콘은 이 스크림 위에서 4.47 ~ 4.67:1이라 대비만으로는 구현 전에도 통과한다(실패할 수 없는 기준이라 판정으로 쓰지 않는다). 구현 전 빌드에서 `apr=`은 `LIGHT_STATUS_BARS`가 있어 밝은 아이콘 기준 FAIL일 것이다 [추론].
- **한계**(첫 실행에서는 안내가 섰다 — 아래는 안 설 때): 안내가 서지 않으면 M2 ~ M4 · D7의 증거는 ui · integration(UT9 · UT11 ~ UT13 · IS10 · IS11)뿐이고 호스트가 이 표면에서 뒤집는지는 기기에서 확인되지 않은 채 남는다.

### S14 — 앞선 작업 회귀 스모크 (AC5) — r03 이전에는 S12였다

앞선 작업의 절차를 **문면 그대로** 돌린다(이 문서는 그 명령을 복제하지 않는다).

- **실행 화면**: [Android 실행 시 색과 적응형 아이콘](android-launch-appearance.md)의 L1(콜드 스타트 영상 — 시작 구간 내내 주황) · L2(시스템 스플래시 여섯 점) — `bundled`, Pixel_8. 이 변경은 `layoutEdgeToEdge`의 기본값을 건드리지 않으므로 **통과 그대로**여야 한다. **L2의 판정 도구 `px.py`(`samples` · `expect` · `center`)는 이 문서의 도구에 없다** — [Android 실행 시 색과 적응형 아이콘](android-launch-appearance.md)의 「도구」 절 명령으로 꺼내 쓴다. r02는 꺼내지 않고 **직접 픽셀 샘플로 대체**했다(여섯 점 `#F46B18` — 0.8 · 1.2 · 1.6초, 가운데에 아이콘 없음) — 대체한 사실을 결과에 적는다.
- **구성 변경**: 같은 문서 L10 R1(구성 변경 뒤 재생성 없음) · [Android 화면 방향과 구성 변경](android-orientation.md)의 O1 또는 회전 항목 하나.
- **뒤로가기**: [Android 시스템 뒤로가기](android-system-back.md)의 B2 · B4. **이 변경의 새 확인**: 표지에서 시스템 뒤로가기 → 맵으로 돌아오며 `want_dark_icons`(G3).
- **판정**: 위 항목들의 기존 판정 그대로. 하나라도 어긋나면 이 변경의 회귀로 적는다.

## 기록 항목 (판정에 넣지 않는다)

| 기록 | 어디서 | 왜 판정이 아닌가 |
|---|---|---|
| 아이콘 색 전환의 시작 100 ms · 끝 300 ms | S6의 `sbjudge` 출력(시작 · 끝 · 구간) | **환경 조건이 선 전환(전환 직후 프레임 간격 중앙 25 ms 이하 · SwiftShader 아님)에서만 판정한다.** 안 서면(API 37 에뮬레이터) 값만 기록한다 — 판정 불가(환경) |
| 「탭 → 아이콘」의 지연 | (측정 불가) | 입력 시각을 영상 시간축에 맞출 수단이 없다 — 도구는 녹화에 보인 두 변화의 차만 잰다 |
| D3의 실측(7.72 빈 구역 → 고친 정의 7.32)과 design 4.75의 차이 | S10 | 도구는 띠 0.5 ~ 4.2%의 글리프 옆 배경만 본다. design의 최악점은 116 px 명암의 아래 끝이라 보지 않는 위치다 — **추정** |
| 묶음별 4.5 · 3.0 이상 픽셀 비율 · 평균 | `sbpng.py dist` (S2 · S4 · S5 · S10) | 안티에일리어싱 때문에 어느 색 쌍에서도 100%가 아니다 |
| API 30 스크림 0.45 위 시계 · 아이콘 대비 | S9 (e) | 받아들인 값(U2 · ADR-0050) — API 30 실측 3.81 · API 37 실측 7.37 · API 31 ~ 36 미실측 |
| M3 시계 대비의 실측값 | S11 (M3) | 하한 4.4만 판정한다 — 4.5 충족이 아니다 |
| D3 시계 · 아이콘 대비의 실측값(여유 0.25) | S10 | 판정은 4.5 · 3.0이고, 값은 그림이 바뀌었는지 보는 용도다 |
| 프레임 간격(영상 전체의 최소 · 중앙 · 최대) · 렌더러 · 호스트 부하 | `sbjudge` 첫 줄 · `envrec` | 영상 전체 간격은 기록이다. 환경 조건에 쓰는 값은 전환 직후(표면 변화 뒤 0.5초 안)의 간격 중앙이다 — 조건을 넘으면 지연이 판정 불가(환경) |
| API 31 ~ 36의 어두운 아이콘 색 | S13 | 그 수준의 AVD가 없으면 미실행 · 후속 — 이 절차에 그 기기가 없다 |

## 끝난 뒤 되돌리기

```sh
A shell cmd uimode night no
A shell settings put system font_scale 1.0
A shell cmd overlay enable com.android.internal.systemui.navbar.gestural     # R6_API30 은 3버튼이 시작 값이다 — 시작 값으로
A shell settings get secure navigation_mode                                  # globals-before 와 같은가
A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE
A shell pm clear "$PKG"
pkill -f 'http.server 18790' ; true                                          # 번들 서버
globals | diff "$OUT/globals-before-$ID.txt" - && echo restored
```

R6_API30은 다 쓰고 `emu kill`. 워크트리의 `apps/mobile/dist`는 모의 값 번들이다 — 그대로 두지 않고 `pnpm verify` 뒤처럼 필요할 때 다시 만든다.

## 실행 결과

### r03 — 2026-10-06 · HEAD `008cec79` (제품 · 빌드 입력 · 도구는 `dbdf9e05`와 같다)

시작 HEAD `dbdf9e05`, 끝 `008cec79` — 그 사이의 `008cec79`는 docs · ADR · `apps/android/README.md` 커밋이고 `git diff dbdf9e05 HEAD -- apps devtools docs/e2e/android-status-bar-icons.md`는 비어 있었다(빌드 입력 · 절차 문서 · 도구 불변). 추적 파일은 건드리지 않았다. Pixel_8(API 37 · 1080x2400 · 제스처 · **SwiftShader**) + R6_API30(API 30 · 1080x2340 · 3버튼 · **호스트 GPU**, `-no-snapshot-save -no-boot-anim -no-audio`) · 모의 값 번들(`example.invalid`, 18790 서빙 · 종료). 도구는 이 문서의 코드 블록에서 꺼냈다(py_compile · selftest OK ×2 · swiftc OK). 호스트 load average(1분) 2.7 ~ 11.9(gradle · 계측 직후가 높고 영상 구간은 대체로 3 ~ 8) · 게스트 loadavg 0.2 ~ 2.4. 원본: `artifacts/e2e-r03/`(영상 · 프레임 표 · `.judge` · `table.md` · 환경 기록), 전체 서술은 `e2e-run-r03.md`.
**지연 수치의 출처는 세 층이다.** (a) **r03 실행 당시 test-runner의 판정**(당시 도구 — 환경 조건 = 영상 전체의 프레임 간격 중앙): 18개 PASS, 전환 직후 간격을 엄격히 보면 16개. (b) **환경 조건을 「전환 직후 0.5초」로 고친 HEAD 도구로 test-runner가 저장 영상을 재판정**(기기 없음, `review-p1.md`) — 아래 「고친 도구로 다시 돌린 결과」의 값: 17개 · 전환 10가지 · 시작 +19 ~ +60 · 끝 +99 ~ +142 ms · FAIL 0. (c) test-design이 문서를 고칠 때 돌린 값은 (b)와 같았다 — 도구 검증이지 판정이 아니다. 「확정」은 (b)의 출처를 붙여서만 쓴다.

**전체 판정: e2e passed(제한적)** — 아래 「화면 지연이 판정된 전환」을 반드시 같이 읽을 것.
- **기준 A(앱 안)**: PASS — 정적 SM15 · HS1(86/86) + 계측 HI8이 두 기기에서 `calls=10 toneChanges=4 mismatched=0 unobservable=0 offMain=0`.
- **기준 B(화면 지연), 판정된 것**: **API 30에서만** — 전환 종류 10가지(맵 → 표지 · 표지 → 뒤로 · 모달 열기 · 모달 닫기 · 연속 학습 모달 열기 · 닫기 · 서사 → 채팅 · 채팅 → 서사 · 서사 → 통화 · M2 닫기). **고친 도구를 test-runner가 저장 영상에 돌린 재판정(기기 없음, `review-p1.md`): 영상 17개 PASS(시작 +19 ~ +60 ms · 끝 +99 ~ +142 ms)**, 판정 불가(환경) 2개(`a30-n2chat-1` · `a30-n2call-2`), FAIL 0. r03 당시 도구의 판정은 18개 PASS · 1개 판정 불가(엄격히 16개)였다. test-design이 문서를 고칠 때 돌린 값은 재판정과 같았다(도구 검증).
- **API 37(SwiftShader)은 판정된 지연이 0개** — 전환 영상 16개 전부 판정 불가(환경 — 종료 4), 판독 값 +0 ~ +555 ms는 기록값(+0이 3건 · +103이 1건은 판정되지 않는 값 — 아래 API 37 표의 주석).
- **S6-순서**: 조건 없이 판정 — API 30 · API 37 모두 순서 · 깜빡임 FAIL 0. 표지 → 서사(변화 0회) · 다이얼로그(D 하나) · D7 닫기(L 하나) PASS.
- 제품 결함 **0**. 통과로 세지 않는 것: 미실행 · 도달 실패 · API 37 지연(전부 판정 불가(환경)) · API 31 ~ 36 · 실기 · API 37 호스트 GPU.

**green(HEAD)**

| 층 | 결과 |
|---|---|
| unit | 377 + 1425 + 124 = **1926 passed** |
| ui | 169 + 1235 = **1404 passed** |
| integration | 462 + 118 + 89 = **669 passed** |
| android-bundle | **86/86**(HS1 · SM15 2건 포함) |
| Gradle | `testDebugUnitTest --rerun-tasks` JVM **60/60** · `:app:assembleDebug :app:assembleDebugAndroidTest` BUILD SUCCESSFUL |
| 계측 `StatusBarIconsHostTest` API 37 · API 30 | 각각 **OK (8 tests)** · 테스트별 `STATUS_CODE: 0` 8개 · HI8 `calls=10 toneChanges=4 mismatched=0 unobservable=0 offMain=0`(두 기기가 같다) |

**환경 기록**(`envrec`)

| 기기 | GLES | 지연 판정 |
|---|---|---|
| emulator-5554 Pixel_8 API 37 | `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)…` — **SwiftShader** | 늘 판정 불가(환경) |
| emulator-5556 R6_API30 API 30 | `Android Emulator OpenGL ES Translator (Apple M5 Pro)` — **호스트 GPU** | 판정 가능 |

**전환별 표 — API 30(판정 환경)**. 열: 간격 중앙 = 영상 전체 / 전환 직후(표면 변화 뒤 0.5초), 점추정 · 시작 · 끝(ms, 표면 변화 프레임 기준), 종료 = **고친 도구의 종료 코드**(`r03 당시 → 고친` — 같으면 하나만). 0 PASS · 1 FAIL · 3 판정 불가 · 4 판정 불가(환경).

| 영상 | 순서 | 간격 중앙(전체 / 직후) | 점추정 | 시작 | 끝 | 종료 |
|---|---|---|---|---|---|---|
| a30-c2m-1 | L,D | 18 / 18 | +57 | +57 | +132 | 0 |
| a30-c2m-2 | L,D | 18 / 19 | +50 | +50 | +135 | 0 |
| a30-c2n-1 | L | 19 / - | 변화 0회 | | | 0 |
| a30-c2n-2 | L | 18 / - | 변화 0회 | | | 0 |
| a30-chat2n-1 | D,L | 19 / 23 | +58 | +58 | +134 | 0 |
| a30-chat2n-2 | D,L | 19 / 18 | +48 | +48 | +135 | 0 |
| a30-d7close-1 | L | 33 / - | 변화 0회 | | | 0 |
| a30-dlg-1 | D | 19 / 17 | D 하나 | | | 0 |
| a30-dlg-2 | D | 19 / 18 | D 하나 | | | 0 |
| a30-m2c-1 | D,L | 17 / 17 | +19 | +19 | +99 | 0 |
| a30-m2c-2 | D,L | 18 / 18 | +52 | +52 | +118 | 0 |
| a30-m2close-1 | L,D | 19 / 18 | +54 | +54 | +132 | 0 |
| a30-m2close-2 | L,D | 27 / 22 | +60 | +60 | +142 | 4 → **0** |
| a30-m2close-3 | L,D | 19 / 18 | +51 | +51 | +140 | 0 |
| a30-mc-1 | L,D | 17 / 17 | +41 | +41 | +125 | 0 |
| a30-mc-2 | L,D | 18 / 17 | +38 | +38 | +118 | 0 |
| a30-mo-1 | D,L | 17 / 17 | +47 | +47 | +118 | 0 |
| a30-mo-2 | D,L | 17 / 17 | +54 | +54 | +115 | 0 |
| a30-n2call-1 | L,D | 18 / 18 | +48 | +48 | +135 | 0 |
| a30-n2call-2 | L,D | 19 / 33 | +66 | +66 | +166 | 0 → **4** |
| a30-n2chat-1 | L,D | 18 / 32 | +32 | +32 | +132 | 0 → **4** |
| a30-n2chat-2 | L,D | 19 / 17 | +50 | +50 | +134 | 0 |
| a30-s3-1 | L | 448 / - | L 하나 | | | 0 |
| a30-s3-2 | L | 534 / - | L 하나 | | | 0 |
| a30-sm-1 | D,L | 17 / 17 | +50 | +50 | +120 | 0 |
| a30-smc-1 | L,D | 19 / 17 | +47 | +47 | +134 | 0 |

- 전환 이름: m2c 맵 → 표지 · c2m 표지 → 뒤로 · mo / mc 트로피 모달 열기 / 닫기 · sm / smc 연속 학습 모달 열기 / 닫기 · c2n 표지 → 서사(변화 0회) · n2chat 서사 → 채팅 · chat2n 채팅 → 서사 · n2call 서사 → 통화 · m2close 첫 단원 안내 M2 닫기 · d7close 서사 위 안내 닫기 · dlg 설정의 로그아웃 확인창(D 하나) · s3 표지 위 건너뛰기 확인창(L 하나).
- **고친 도구에서 판정된(종료 0) 전환 영상 17개** — 시작 +19 ~ +60 ms(한계 100) · 끝 +99 ~ +142 ms(한계 300), 전환 종류 10가지 모두 하나 이상(서사 → 채팅 · 서사 → 통화는 각 1개 — `n2chat-2` · `n2call-1`).
- 판정 불가(환경) 2개: `a30-n2chat-1`(직후 32 ms) · `a30-n2call-2`(직후 33 ms) — 전체 중앙은 18 · 19 ms라 r03 당시 도구가 PASS(시작 +32 · +66)로 낸 것. 반대로 `a30-m2close-2`는 전체 27 ms로 r03 당시 판정 불가(환경)였으나 직후 22 ms로 서서 PASS(시작 +60 · 끝 +142). r03 보고의 「엄격히 16개」(`m2close-2`를 판정 불가로 둔 어림)는 test-runner의 재판정(`review-p1.md`, 기기 없음)에서 17개로 나왔다. 18 − 2 + 1 = 17.
- 첫 두 영상(`a30-m2c-1` · `a30-c2m-1`)의 `.judge`는 r03 실행자의 도구 호출 방식(함수 안 종료 코드 수집 오류)으로 출력만 남았고 같은 `.mp4`로 종료 0을 확인했다. `m2c-1`의 시작 +19 ms는 구간(+0 ~ +52)이 넓은 점추정이다.

**전환별 표 — API 37(SwiftShader — 지연 판정 안 됨)**

| 영상 | 순서 | 간격 중앙(전체 / 직후) | 점추정(기록) | 시작 | 끝 | 종료 |
|---|---|---|---|---|---|---|
| a37-c2m-1 | L,D | 115 / 97 | +401 |  |  | 4 |
| a37-c2m-2 | L,D | 134 / 115 | +334 |  |  | 4 |
| a37-c2n-1 | L | 156 / - | 변화 0회 | | | 0 |
| a37-c2n-2 | L | 163 / - | 변화 0회 | | | 0 |
| a37-chat2n-1 | L,D,L | 113 / 103/115 | +325/+555 |  |  | 4 |
| a37-chat2n-2 | L,D,L | 116 / 100/108 | +419/+327 |  | +419/+435 | 4 |
| a37-chat2n-3 | D,L | 121 / 97 | +373 |  | +603 | 4 |
| a37-chat2n-4 | D,L | 126 / 93 | +415 |  |  | 4 |
| a37-m2c-1 | D,L | 109 / 91 | 지연 값 없음(같은 프레임 · 정지 구간 뒤 — 기록값 아님) | | | 4 |
| a37-m2c-2 | D,L | 103 / 94 | +393 |  |  | 4 |
| a37-mc-1 | L,D | 103 / 102 | +103 |  | +206 | 4 |
| a37-mc-2 | L,D | 98 / 97 | +281 |  | +380 | 4 |
| a37-mo-1 | D,L | 97 / 93 | +522 |  |  | 4 |
| a37-mo-2 | D,L | 102 / 104 | +346 |  |  | 4 |
| a37-n2call-1 | L,D | 99 / 93 | +362 |  | +455 | 4 |
| a37-n2call-2 | L,D | 107 / 99 | +300 |  | +399 | 4 |
| a37-n2chat-1 | L(기대 L,D) | 148 / - | 채팅이 서기 전에 영상이 끝났다 | | | **1**(순서 FAIL — 절차 타이밍 오류) |
| a37-n2chat-2 | L(기대 L,D) | 144 / - | 채팅이 서기 전에 영상이 끝났다 | | | **1**(순서 FAIL — 절차 타이밍 오류) |
| a37-n2chat-3 | L,D | 154 / 134 | 지연 값 없음(같은 프레임 · 정지 구간 뒤 — 기록값 아님) | | | 4 |
| a37-n2chat-4 | L,D | 150 / 295 | 지연 값 없음(같은 프레임 · 정지 구간 뒤 — 기록값 아님) | | | 4 |
| a37-s3-1 | L | 192 / - | L 하나 | | | 0 |
| r03-s1dlg | D | 236 / 236/154/84 | D 하나(스크림 7.37:1) | | | 0 |

- **`a37-n2chat-1` · `-2`의 종료 1은 제품 결함이 아니라 r03 실행자의 조작 타이밍이다**: `tapmid 3` + 2.5초로 찍었는데 SwiftShader 위 서사 → 채팅이 그보다 늦게 섰다(영상은 L만 담았고, 이어 찍은 `chat2n-1 · -2` 영상 앞에 L→D가 들어 있다 — 그래서 `chat2n`의 첫 판정(기대 D,L)도 FAIL이었고 기대를 L,D,L로 맞춘 재판정은 순서 PASS · 종료 4). `apr`로 채팅이 서는 순간까지 폴링해 다시 찍은 `n2chat-3 · -4`는 순서 PASS · 종료 4. 순서 FAIL 사실은 지우지 않고 원인을 적는다 → 절차는 `tapuntil_dark`(S6 (c)).
- `a37-m2c-1` · `a37-n2chat-3 · -4`의 점추정 +0 · 구간 −799 ~ +50 ms는 **기록값이 아니다**(영상이 정지 구간으로 시작하고 표면 변화와 아이콘 변화가 같은 프레임) — 고친 도구는 「지연 값 없음」으로 낸다(r03 결함 5).
- API 37의 모든 지연 영상은 종료 4 — **판정된 지연 0개 · 통과로 세지 않음.** 판독 지연은 **+0 ~ +555 ms**다: +0이 3건(`a37-m2c-1` · `a37-n2chat-3` · `a37-n2chat-4` — 위의 「지연 값 없음」으로 나오는 같은 프레임 변화), +103이 1건(`a37-mc-1`), 나머지는 +281 ~ +555. +0 · +103은 판정되지 않는 값이다. 나머지는 r02 · 진단의 범위(+327 ~ +433, 아이콘 끝 389 ~ 1124)와 비슷한 모양이다(`review-p1.md`의 재판정 표와 대조).

**r02 FAIL 4건의 재판정**(저장 영상 `artifacts/e2e-r02/*.mp4`, 시계 구역 2,14, `--gles` = 5554의 `envrec`. 5554가 r02 때도 같은 SwiftShader였다는 것은 진단 문서가 확인한 5554와 같은 인스턴스라는 점에 기댄 **추론**이다 — r02 당시 `envrec`은 없었다)

| r02 FAIL | 전환 | 순서 | 간격 중앙(전체 / 직후) | 기록 점추정 | 고친 도구 종료 |
|---|---|---|---|---|---|
| S6a-3 | 맵 → 표지 | D,L | 88 / 87 | +421 | 4 |
| S6d-close | 모달 열기 → 닫기 | D,L,D | 117 / 119/114 | +433/+343 | 4 |
| S6c2 | 채팅 → 서사 → 통화 | D,L,D | 171 / 97/75 | +413/지연 값 없음 | 4 |
| S11-chat2narr | 서사 → 채팅 → 서사 → 통화 | L,D,L,D | 121 / 93/102/106 | +306/+373/+281 | 4 |

→ 네 건 모두 **FAIL이 아니라 판정 불가(환경)**로 바뀐다. 「통과」가 아니다: 환경 조건을 끈 값(`--env-gap inf`)은 같은 값이 한계(시작 100 · 끝 300 ms)를 넘어 FAIL이고, API 37을 호스트 GPU로 띄워 잰 값은 없다(미확인). 새 영상(r03 API 37 판독 +0 ~ +555 ms)도 같은 모양이라 환경 분류와 모순되지 않는다. 앱 안의 값은 HI8(mismatched 0)과 진단(≤ 5.15 ms)이 진다. `S11-chat2narr`는 영상 구성(서사 → 채팅 → 서사 → 통화)에 맞춰 기대를 `L,D,L,D`로 주면 종료 4이고, r02 원문 기대(`D,L`)로는 순서 FAIL(종료 1)이다(`review-p1.md` 그대로) — 이 영상은 FAIL로도 통과로도 세지 않는다.

**r02 뒤 고친 절차가 기기에서 도는가**(r03 확인)

| 절차 | 결과 |
|---|---|
| `envrec` · `sbzones` 파일 방식(`zones-$ID.txt`) · `sbvid`의 `--gles` | 두 기기에서 동작. 5554 `2,14`, 5556 `12.8,23.2`(문서의 12.8,23.3과 0.1 차 — 영상 판정을 바꾸지 않는다) |
| `sbjudge.py` 종료 4 | API 37 전부 · API 30의 `m2close-2`(r03 당시 도구)에서 동작 |
| `pollbg` M3 · M4 (API 37) | **동작**: M3 `#767779` 3번째 탭에서 FOUND → `sbcheck --clock-min 4.4` 4.48:1 PASS · 닫으면 어두움 · M4 `#747475` 4번째 탭 FOUND → 4.67:1 PASS · 닫으면 어두움 |
| S7 (c) 분할 화면 (API 37) | **동작**: APP_SWITCH → 앱 칩 `408 372` → `Split screen`(노드 `422 651` ≈ 문서 `420 654`) → 카드 `540 1200` → 앱 위쪽 · `apr` 밝은 아이콘 · 재생성 `create 0 destroy 0 relaunch 0` · 위쪽 창 상태바 17.94:1(기록) · 구분선 `540 1200 → 540 2350` 해제 → 밝은 아이콘 유지 |
| `dumpsys` InsetsSource (API 30) | **동작**: `InsetsSource type=ITYPE_STATUS_BAR frame=[0,0][1080,145]` → S12 (b) `count '#F46B18' --above 145` = **0**, `--bg-expect` 14.36 ×5 PASS. API 37의 inset 줄은 r03에서 읽지 않았다(132px는 r02 값) |

**항목별(r03)**

| 항목 | 기기 | 결과 |
|---|---|---|
| S1 (a)(b)(e) | API 37 | PASS — 맵 · 설정 · 롤플레이 20.71:1 · 스크림 7.37:1 · 영상 D 하나 |
| **S1 (c) 학습 화면** | API 37 | **PASS** 20.71:1 — r02 미실행이던 것 |
| S1 (d) 스플래시 · (f) BottomSheet | | 미실행 / (f) 도달 실패 유지(재시도 안 함) |
| S2 | API 37 · 30 | PASS 17.94 / 17.94 |
| **S3** | API 37 · 30 | PASS — 확인창 17.50:1 · 닫은 뒤 17.94 · 영상 L 하나 |
| **S8** 3버튼(API 37) | | PASS — 표지 17.94 · 서사 13.13 / 12.50, 내비 띠 `#E9E8E8` / `#ECEBEC` 버튼 `#666666` |
| S5 | API 30 | 연속 학습 모달 PASS(`--bg-expect` 14.36), 닫으면 어두움 · S12 (b) 위 |
| S9 | API 30 | 맵 5.73 · 표지 17.94 · 스크림 위 #999999 / #3D3D3D **3.81**(기록) · M2 4.53 |
| S11 | API 37 | M2 4.53 · D7 15.45 / 15.26 · M3 4.48(하한 4.4) · M4 4.67 · 닫으면 모두 기대 명암 |
| S11 | API 30 | M2 4.53 · M2 닫기 전환 · D7 닫기 L 하나 |
| S10 · S4 · S5(API 37) · S7 (a)(b)(d) · S12 (a) · S1 (d) | | **r03 미실행** |

**r03이 되돌린 문서 · 도구 · 픽스처 결함 7건과 처리** — 처리한 것은 기기에서 다시 돌리지 않았다.

| # | r03이 본 것 | 처리 |
|---|---|---|
| 1 | `sbjudge.py`의 환경 조건이 영상 **전체**의 프레임 간격 중앙이다 — 계약 r04.3 · 문서의 「전환 직후」와 다르다(전체 18 · 19 ms인데 직후 32 · 33 ms인 영상 둘이 PASS, 전체 27 ms인데 직후 22 ms인 영상이 판정 불가) | **전환 직후 = 표면 변화 프레임 뒤 0.5초 안의 간격 중앙, 표면 변화마다**로 고쳤다(「판정 정의」 · `sbjudge.py`). 영상 전체의 중앙은 기록. selftest 5개 추가 · 저장 영상 재판정은 「도구를 돌려 본 기록」의 r03 뒤 |
| 2 | S6 (c) · S11의 서사 → 채팅을 `tapmid 3` + 고정 대기로 찍으면 API 37에서 채팅이 늦게 서 전환을 놓친다 | `tapuntil_dark`(탭 → 1.5초 → `apr`에 `LIGHT_STATUS_BARS`가 생기면 중단) · S6 (c) · S4 |
| 3 | API 30(1080x2340) 좌표 표가 없다 | 「좌표」에 R6_API30 표를 더했다(표지 `540 468` · 트로피 `322 234` · 연속 학습 `129 234` · 전송 `936 2109` · 설정 탭 `803 2108` · 맵 `313 2108` · `Stay signed in` `540 1342`) |
| 4 | S1 (c)의 B3 좌표는 390x844 기준이라 1080x2400에서 못 쓴다 | S1 (c)와 좌표 표에 `Listen to a Hello` `540 1858` · `Start` `540 1934`(Pixel_8, API 37 — r03이 읽은 값) |
| 5 | 영상이 정지 구간으로 시작하고 표면 변화 = 아이콘 변화 프레임이면 +0 · 구간 −799 ~ +50이 나온다 | 「지연 값 없음 — 기록값으로 쓰지 않는다」로 내고 지연은 판정 불가(종료 3 · 환경이면 4). selftest 2개 |
| 6 | 문서의 `fixture`가 `FIX_PID` · `FIX_T0`을 셸 변수로 쓴다 — 명령마다 새 셸이면 `fixture_left`가 틀리고 `fixture_stop`의 `wait`가 안 먹는다 | 시작 시각을 `$OUT/.fixT0-$ID` 파일에 적는 함수로(r03 실행이 쓴 `fx` · `left` · `ensure`를 이 문서의 이름으로 옮김 — 옮긴 함수는 기기에서 다시 돌리지 않았다) |
| 7 | `sbzones`가 API 30에서 `12.8,23.2`를 내는데 문서는 `12.8,23.3` | `12.8,23.2`로 정정하고 캡처에 따라 0.1 차가 날 수 있음을 적었다. API 30 영상 26개를 두 값으로 `sbframes`에 돌려 프레임 표가 같음을 확인했다 |

**판정 불가 · 도달 실패 · 미실행(통과로 세지 않음)**
- **판정 불가(환경)**: API 37의 S6 지연 전부(전환 영상 16개 + r02 저장 영상 재판정 4) · API 30 `a30-n2chat-1` · `a30-n2call-2`(고친 도구 기준).
- **도달 실패**: S1 (f) BottomSheet(재시도 안 함 · r02 유지) · D5 `journey-entry`(vitest만).
- **미실행**: S13(AVD 없음) · S14의 L1 · B2 · B4 · 회전(O1) · S10 `roleplay-visual-novel`(및 D3 · D4 재측정) · S1 (d) 스플래시 · S4 · S5(API 37) · S7 (a)(b)(d) · 실기의 지연 · **API 37 호스트 GPU의 지연**(5554를 재시작하지 않았다).

**환경 정리**: API 30은 `emu kill`, 종료 전 `globals` · `settings list global/system/secure` · `cmd overlay list` diff 0(부팅 카운터 포함 같았다), HEAD debug + androidTest 재설치 + `pm clear`. emulator-5554는 night no · font_scale 1.0 · overlay gestural(`navigation_mode 2`) 복귀, 전체 settings 3종 · overlay · `wm size` diff 0, HEAD debug + androidTest 재설치 + `pm clear`. 18790 서버 종료, 3000 포트 서버는 건드리지 않음.

**리뷰 뒤 iOS 관찰 — S12 (c)** (2026-10-06, test-runner, `review-p1.md` · 캡처 `artifacts/review-p1/ios-*.png`) — 기기: iPhone 17 Pro 시뮬레이터(iOS 26.5). 번들: **dev 전용 playground**(`tutorial-journey`, 인증 없음 · 실서버 요청 없음) — **제품 `main` 번들이 아니다.** 한 장면(스트릭 0 · 7칸 모두 비어 있음). 절차는 「S12」 (c).
- **변경 뒤**: 운석 c의 주황 맨 위가 약 79 ~ 80pt(1206×2622 이미지에서 y ≈ 236 ~ 240px). `insets.top` 62pt(186px) 위 주황 픽셀 **0**(`sbpng.py count '#F46B18' --above 186`). 시계 · 셀룰러 · Wi-Fi · 배터리를 가리지 않고, 뒤로 버튼 · 불꽃 · 큰 숫자 · 제목 · 운석 a · b와 겹치지 않는다(운석 c 오른쪽 아래의 흐린 것은 스크림 뒤 맵의 알림 벨 — 모달 요소끼리의 겹침이 아니다).
- **변경 전(`dca104d8`)**: 같은 시뮬레이터 · 같은 탭에서 운석 c가 y ≈ 0 ~ 150px에 걸쳐 Wi-Fi · 배터리를 덮는다 — inset 위 주황 픽셀 **10185**. Android의 B1 결함이 iOS에서도 같았고 이 변경이 고쳤다. 변경 전후 CSS 차는 `top: -17px` → `top: ${insets.top}px`(62px), +79pt로 캡처의 이동과 맞는다.
- **한계**: 제품 `main` 번들이 아니다 · 한 장면만 찍었다 · 로그인 뒤 경로는 보지 않았다. 이 절의 판정 문구는 「관찰」이다(Android S12 (a) (b)의 `count` 판정과 같은 형식의 PASS가 아니다).

### r02 — 2026-10-06 · HEAD `6b3110c3` (계약 r03 뒤 구현의 두 번째 실행)

Pixel_8(API 37 · 1080x2400 · 제스처) + R6_API30(API 30 · 1080x2340 · 3버튼, 종료함) · 모의 값 번들(`example.invalid`, 18790 서빙 · 종료) + HEAD debug + androidTest · S1 (d) · S7 (d)용 bundled APK(끝에 debug로 복귀). 호스트 load average 3.4 ~ 11(다른 프로세스 — Chrome 등). **렌더러는 이 실행에서 기록하지 못했다**(그 칸이 문서에 없었다). 도구는 이 문서의 코드 블록에서 꺼냈다(selftest OK ×2). 시작 · 끝 HEAD 동일 · `git status` clean.
**r02 당시의 전체 판정은 failed**(S6 전환 지연 FAIL 4건)였고 운석 수정(S5 · S12)은 확인됐다. 그 뒤 진단(`latency-diagnosis`)이 지연을 환경(SwiftShader)으로 볼 근거를 냈고 `sbjudge.py`를 고쳤다 — **r03이 고친 정의로 재판정했다: FAIL 4건은 판정 불가(환경)이고 통과가 아니다(위 r03의 「r02 FAIL 4건의 재판정」). 이 실행의 전체 판정은 위 r03 절이다.** 「제품 결함 0」은 쓰지 않는다(첫 실행의 제품 결함은 운석이었고 수정됐다 · S6 FAIL의 분류는 재판정 대기).

**green 재확인(HEAD `6b3110c3`)**

| 층 | 결과 |
|---|---|
| unit | 377 + 1425 + 124 = **1926 passed** |
| ui | 169 + 1235 = **1404 passed** |
| integration | 462 + 118 + 89 = **669 passed** |
| android-bundle | **84/84** |
| Gradle | `testDebugUnitTest --rerun` JVM **60/60** · `:app:assembleDebug` · `:app:assembleDebugAndroidTest` BUILD SUCCESSFUL |
| 계측 `StatusBarIconsHostTest`(API 37) | **OK (7 tests)** — r02 당시 기록이다. 그 뒤 HI8이 더해져 **지금은 8건**이다(`OK (8 tests)` — r03 두 기기에서 확인) |

**운석 전후(S5 · S12)** — 주황 `#F46B18`(채널 차 8) 연결 성분의 bbox(px)

| | 구현 전 `S5-streak.png`(첫 실행) | r02 API 37 | r02 API 30 |
|---|---|---|---|
| 운석 c | x 840..974 · **y 0..135**(위가 잘림 — 띠 안에 **6951px**) | x 840..984 · **y 177..312** · 8936px(띠 안 **0**) | x 829..979 · y 192..334 · 9749px |
| 상태바 inset | 132px | 132px | 145px |
| 상자 위쪽 끝 | −17dp = −44.6px(추정) | inset(132px) — 주황 글리프 맨 위 +45px(177 = 132 + 45) | 145 + 47 = 192 |

주황 글리프 y 0..135 → 177..312: 구현 전보다 **+177px(≈ 67.3dp) 내려갔고** 상자 위쪽 끝이 inset과 같다. 띠 안 주황 픽셀 6951 → **0**. 인접 배경은 `#2C292D` · 14.36:1(구현 전 인접 배경 `#F46B18` · 3.02). 운석 a · b · 큰 불꽃 · 0 · day streak은 구현 전과 bbox가 같다(507..625 × 518..661 · 0..109 × 670..805 · 466..615 × 685..914 · 840..984 × 1040..1175).
**새 관찰**: 내려온 운석 c(스크림 뒤 장식 층)가 스크림 아래 맵의 **알림 벨(우상단 ≈ x 960 ~ 1010, y 190 ~ 240) 위에 놓여 부분적으로 가린다**(구현 전에는 벨이 보였다). 비활성 배경이라 눌리는 요소가 아니라고 보았다 — **터치는 시도하지 않았다.** 뒤로 버튼(x 62 ~ 210) · 트로피 칩과는 겹치지 않는다. 캡처: `S5-streak.png` · `S12-streak-api30.png`.

**표면별 실측**(시계 / 아이콘 최악 — **글리프 묶음에 인접한 배경의 최악 픽셀**, 기대는 test-plan r03)

| 표면 | r02 실측 | 기대 | 일치 |
|---|---|---|---|
| D1 표지 | 17.94 / 17.94 (`#1B1613`) | 17.94 | ✓ |
| D2 서사 | 12.29 · 12.29 / 13.44 · 13.82 | 12.29 · 13.13 / 13.82 · 12.64 | 시계 첫 값 ✓, 다른 장면 타이밍 차(< 1) — 기대는 범위 |
| D3 시험 | 13.48 / **7.32** | 13.48 / 7.32 | ✓ |
| D4 | 12.76 / 13.68 | 12.76 / 13.68 | ✓ |
| D6 트로피 | 14.36 / 14.36 | 14.36 | ✓ |
| **D6 연속 학습** | **14.36 / 14.36**(인접 배경 `#2C292D`) | 14.36 / 14.36 | ✓ (구현 전 3.02) |
| D7 | 15.11 / 15.70 | 15.11 / 15.70 | ✓ |
| M2 | 4.53 / 4.53 (API 30도 4.53) | 4.53 | ✓ |
| M3 | 4.48 / 4.48 (하한 4.4) | 4.48 | ✓ |
| M4 | 4.67 / 4.67 | 4.67 | ✓ |
| 맵(API 37) | 20.71 | 20.71 | ✓ |
| 맵(API 30) | 5.73 | 5.73 | ✓ |
| JS 스플래시 | `#F46B18` 위 검정 6.96(5묶음 모두) | 6.96 | ✓ |
| 스크림 0.45 API 30 | `#999999` 위 3.81 | 3.81 | ✓ |

밝은 표면으로 돌아왔을 때 어두운 아이콘이 아닌 경우(새는 경우): **0**(트로피 · 연속 학습 · M2 ~ M4 · D7 닫기 · 표지 뒤로가기 · 1.3 재생성 뒤 모두 확인).

**S6 전환 지연(API 37) — r02의 값과 r02 당시 판정(고치기 전 정의)**. 마지막 열은 고친 정의(환경 조건 · 시작 / 끝)의 재판정이다: API 37은 렌더러가 SwiftShader(r03 `envrec`)라 영상마다 **판정 불가(환경)**이고, r03이 직접 다시 돌린 것은 FAIL 4건이다. 이 표는 통과를 만들지 않는다.

| 전환 | r02 점 추정(구간, ms) | r02 당시 판정 | 고친 정의 |
|---|---|---|---|
| 맵 → 표지 S6a ×3 | +350(267 ~ 400) · +231(137 ~ 281) · **+421**(326 ~ 471) | 판정 불가 · PASS · **FAIL** | 판정 불가(환경) — S6a-3은 r03이 재판정(종료 4) · 나머지는 SwiftShader라 같은 분류 |
| 모달 열기 S6d ×2 | +168(88 ~ 218) · **+433**(316 ~ 483) | PASS · **FAIL** | 판정 불가(환경) — S6d-close는 r03이 재판정(종료 4) |
| 모달 닫기 S6d ×2 | +271(182 ~ 321) · +343(224 ~ 393) | 판정 불가 ×2 | 판정 불가(환경) |
| 표지 → 뒤로 S6e ×2 | +266(187 ~ 316) · +85(67 ~ 135) | 판정 불가 · PASS | 판정 불가(환경) |
| M2 닫기 | +395(299 ~ 445) | 판정 불가 | 판정 불가(환경) — API 30의 M2 닫기는 r03 PASS |
| 서사 → 채팅 S6c1 | +100(0 ~ 150) | PASS | 판정 불가(환경) |
| 채팅 → 서사 ×4(S6c2 · S11-chat2narr · C2N-1 · C2N-2) | **+413**(316 ~ 463) · **+373**(329 ~ 423) · +363(245 ~ 413) · +327(205 ~ 377) | **FAIL ×2** · 판정 불가 ×2 (첫 실행은 +83 ms) | 판정 불가(환경) — S6c2 · S11-chat2narr는 r03이 재판정(종료 4) |
| 표지 → 서사 S6b | 명암 변화 0회(L 하나) | PASS | 순서 · 변화 0회는 프레임 간격과 무관 — 그대로 |
| API 30(S9) 8회 | 모두 +50 ~ +54 | PASS | **PASS**(고친 도구로 저장 영상 재판정: 시작 +50 ~ +54 · 끝 +115 ~ +138 — 「도구를 돌려 본 기록」의 r03 뒤) |

`--emit-lag` 가정: 위 구간은 `--emit-lag 0.05`에 기댄 값이다. `--emit-lag inf`(보수)로 돌리면 PASS였던 것이 대부분 판정 불가로 바뀐다(S6a-2 · S6d 열기 · S6e-3 · S9a-1 · S9e ×2 · S9 M2 닫기). 다만 FAIL 3건(S6a-3 +421 · S6d-close의 열기 +433 · S6c2 채팅 → 서사 +413)은 inf에서도 FAIL(하한이 300 ms 초과 — 가정과 무관). PASS가 유지된 것: S6c1 · S6b · S9a-2(+50, 보수 상한 +71).
분류(r02 당시): 제품 결함인지 환경인지 **확정 못 했다**(`git diff --stat f6aae70e 6b3110c3 -- apps`는 `JourneyStatModal.tsx`(1줄) · css · ui 테스트뿐 — 호스트 · 표지 동기화 경로 불변). 그 뒤 진단이 **환경(iii)으로 볼 근거**를 냈다.

**r02가 되돌린 문서 · 도구 결함 10건과 처리** — 처리한 것은 기기에서 다시 돌리지 않았다.

| # | r02가 본 것 | 처리 |
|---|---|---|
| 1 | `SBCLOCK`이 셸 변수라 새 셸에서 `sbzones` 없이 `sbvid`를 부르면 기본 구역(2,14)이 쓰여 API 30 영상이 전부 `N` → FAIL(S9 M2 닫기 · Dialog) | `sbzones`가 `$OUT/zones-$ID.txt`에 쓰고 `sbvid`가 그 파일을 읽는다 — **없으면 실패**(「셸 관용구」) |
| 2 | 채팅의 M3는 `tapmid 3`으로 안 잡힌다(서사 둘째 장면에 머묾 · 탭이 안내를 소비). `S11-seq3`의 배경색 `#767779`를 폴링해 잡았고 M4는 `943 2242` 반복 + `#747475` 폴링 | `pollbg`(「셸 관용구」) · S11의 순서 |
| 3 | 분할 화면 조작이 O6 참조뿐 — 이 기기의 실제 순서: 최근 앱 → 앱 칩 `408 372` → `Split screen` `420 654` → 카드 `540 1200`, 해제는 구분선 `540 1200` → `540 2350` 스와이프 | S7 (c) · 「좌표」 |
| 4 | 「bundled 미실행」은 낡았다 — 계측 픽스처가 bundled APK에서도 동작해 재생성 전후를 본다(S7 (d)가 bundled로 확인됨). ⟨2026-10-08⟩ **이 정정은 축소 전 빌드에서만 맞았다** — `bundled`가 R8로 축소된 뒤로는 픽스처가 붙지 않는다(ADR-0052 D3). 지금의 문면은 S7 (d) | S7 (d) · 실행 상태 |
| 5 | `early … 1.6`은 시스템 스플래시(무늬 없는 주황 · 흰 아이콘)이고 JS 스플래시는 3초에 선다 | S1 (d) — 3초 |
| 6 | S4의 기대 수치 쌍(12.29 · 13.82 / 13.13 · 12.64)이 캡처 타이밍에 따라 바뀐다 — 「장면」이 아니라 「화면의 그림」 기준 | S4 판정 — 기대는 범위 |
| 7 | `count --above`의 API 30 inset은 145px이고 `dumpsys window`의 `InsetsSource … STATUS_BAR frame=[0,0][1080,145]`에서 읽는다 | S12 |
| 8 | `sbjudge` — 같은 전환의 점 추정이 +85 ~ +433 ms로 흩어져 300 ms 판정이 PASS · FAIL · 판정 불가로 갈린다. 호스트 부하를 기록하는 칸이 문서에 없다 | `envrec`(렌더러 · 부하) · `sbjudge.py`의 환경 조건(종료 4) · 시작 / 끝 — 「판정 정의」 · S6 |
| 9 | 맵 항목 좌표(`Our Imagined Café` `540 1764` · `Final test` `540 1674` — 시드 · 스크롤 3회 기준)가 문서에 없다 | 「좌표」 · S10 |
| 10 | S14: L2 판정용 `px.py`가 이 문서 도구에 없어 직접 픽셀 샘플로 대체했다 | S14 — 어디서 꺼내는지 · 대체의 기록 |

**판정 불가 · 도달 실패 · 미실행**: 판정 불가 — S6 지연 다수(점 추정만 · PASS로 세지 않음). 도달 실패 — S1 (f) BottomSheet(10초 뒤에도 시트 없음) · D5 `journey-entry`(vitest). 미실행 — S1 (c) 학습 화면 · S10 `roleplay-visual-novel` · S13(AVD 없음) · S12 (c) iOS · S14의 L1 · B2 · B4 · 회전 · S3 · S8 재확인.
**환경 정리**: 마지막에 emulator-5554는 HEAD debug + androidTest(재설치 뒤 `pm clear`), 전역 설정 diff 0(`globals` · 전체 `settings list global/system/secure` · 오버레이 · night · wm). R6_API30: `globals` diff 0, 전체 덤프는 `Phenotype_boot_count` 17 → 18만 다름(부팅 카운터 — 사용자 설정 아님), `emu kill` 완료. 18790 서버 종료, 3000 포트 서버는 건드리지 않음. 환경 문제: 호스트 부하 변동 · 이미지 없음(S13) · 계측 픽스처 180초(만료 시 재시작).

### 첫 실행 — 2026-10-06 · HEAD `f6aae70e`


**2026-10-06 · HEAD `f6aae70e` · 구현 `bc44c645`** · Pixel_8(API 37 · 1080x2400 · 제스처) + R6_API30(API 30 · 1080x2340 · 3버튼, 종료함) · 모의 값 번들 + debug + androidTest. 이 결과는 **고치기 전의 절차 · 도구**로 낸 것이다.

**구현 전 캡처의 e2e-red: confirmed** — D1 · D2 · D6(연속 학습) · 3버튼 D2 모두 FAIL(시계 · 아이콘 1.00 ~ 1.10:1, D6은 구역 최밝은 픽셀이 운석 `#F46B18`), 가드는 맵 `dark` PASS 20.71 · 밝은 아이콘 탐침 `dark` FAIL. **e2e-green: partial** — 실행한 항목은 전부 PASS(제품 결함 0)이나 아래 판정 불가 · 도달 실패 · 미실행이 있어 「전체 통과」가 아니다.
**r03 정정**: 위 「제품 결함 0」과 아래 S5 · 「연속 학습 2차」의 PASS는 **도구의 측정 정의 결함으로 틀렸다** — 연속 학습 모달의 아이콘 인접 배경이 주황이었다(흰 아이콘 3.02:1). 이 문서는 판정을 대신 쓰지 않는다: S5는 첫 실행 시점에 「재실행 대기」였고 **r02가 PASS로 확정했다**(위 r02 절).

| 구분 | 항목 |
|---|---|
| **PASS** | S1 (a) 맵 (b) 설정 · 롤플레이 (e) Dialog · S2 · S3 · S4 · S5(트로피 · 1차만 — 연속 학습의 2차는 **정정: 재실행 대기**) · S6 (a) (b) 서사 → 채팅 · 서사 → 통화 · S7 (a) (b) · S8 · S9(맵 · 표지 · M2 · 구역을 맞춘 뒤) · S10 · S11 |
| **판정 불가 → 재판정 대기** | S6 (d) 모달 열기 · 닫기 ×2 · S6 (e) 표지 → 뒤로 ×3 · S6 (c) 채팅 → 서사 · S11 M2 닫기 · S9 (a)의 지연 · S9 뒤로 — 모두 **순서는 기대와 같았고 지연 점 추정은 +51 ~ +85 ms**였으나 정지 화면 직전의 구간 정의 때문에 상한이 판정되지 않았다(결함 4). 통과가 아니다. 고친 도구의 재판정은 기기에서 다시 찍어 확정한다(→ **r03이 확정했다**: API 30 PASS · API 37 판정 불가(환경) — 「실행 결과」 r03) |
| **도달 실패** | S1 (f) BottomSheet(`completeProgress` 맵 13/13 · 5초 뒤에도 시트 없음 — vitest IS9가 증거) · D5 `journey-entry`(문서대로 닿지 못함 — UT6 · IS8) |
| **미실행** | S1 (c) 학습 화면 · (d) 스플래시(bundled) · S7 (c) 분할 화면 · S7 (d)의 「재생성 뒤 표지에서 다시 밝아짐」(debug는 번들을 잃는다 — HI6이 덮는다 · bundled 미실행) · S14 전체 · **S12 · S13(r03 신규)** |

**표면별 실측 대비**(시계 · 아이콘, 같은 값이면 하나 — **고치기 전 정의(빈 구역 기준)의 값**이다. 고친 정의의 재측정값은 「판정 정의」의 표)

| 표면 | 배경 | 아이콘 | 실측 | design 기대 |
|---|---|---|---|---|
| 맵 · 설정 · 롤플레이 (API 37) | `#FFFDFC` | `#000000` | 20.71 | 20.71 |
| 맵 (API 30) | `#FFFDFC` | `#666565` | 5.73 | 5.72 |
| D1 표지 | `#1B1613` | `#FFFFFF` | 17.94 | 17.9 |
| D1′ 확인창 | `#1B1919` | `#FFFFFF` | 17.50 | — |
| D2 서사 | `#302B27` / `#36312D` | `#FFFFFF` | 14.00 / 12.85 | ≥ 9.67 |
| D3 시험 | `#595246`(최악 프레임) | `#FFFFFF` | 7.72 (서사 13.03) | 4.75 (차이는 S10의 기록) |
| D4 비주얼 노벨 | `#37322D` | `#FFFFFF` | 12.68 | ≥ 9.71 |
| D6 트로피 | `#2C292D` | `#FFFFFF` | 14.36 | 14.45 |
| D6 연속 학습 | `#2C292D`(빈 구역 — **아이콘 인접은 `#F46B18`, 3.02:1 — r03 정정**) | `#FFFFFF` | ~~14.36~~ **정정: 시계 14.36 · 아이콘 3.02** | 14.45 |
| 스크림 0.45 API 37 | `#999999` | `#000000` | 7.37 | 7.27(API 37 실측 7.37) |
| 스크림 0.45 API 30 | `#999999` | `#3D3D3D` | **3.81** | 3.69 ~ 3.80 — **수용 기록**(시계 4.5 미달 · 아이콘 3.0 충족 · U2 · ADR-0050). **API 31 ~ 36 미실측** |
| M2 (API 37 · 30) | `#767678` | `#FFFFFF` | 4.53 · 4.53 | 4.53 |
| D7 | `#232223` | `#FFFFFF` | 15.85 | S4와 같음 |
| **M3** | `#767779` | `#FFFFFF` | **4.48**(하한 4.4 통과 · **4.5 기준 미달 — 알고 받아들인 값**) | 4.48 ~ 4.50 |
| M4 | `#747475` | `#FFFFFF` | 4.67 | 4.67 ~ 4.70 |
| 스플래시(재생성 중 프레임 — S1 (d)의 대체가 아니다) | `#F46B18` | `#000000` | 6.96 | 6.96 |

내비게이션 바(S8): 표지 `#E9E8E8`/`#666666` 4.70 · 서사 `#EBEBEB`/`#666666` 4.82. 두 기기의 전역 설정 diff 0.

**첫 실행이 되돌린 절차 · 도구 결함 11건과 처리**: 1 · 2 · 3 · 10 노드 이름 → 좌표(「좌표」) · 4 지연 구간 정의(`sbjudge.py`) · 5 API 30 시계 구역(`sbpng.py zones` · `sbzones` · `SBCLOCK`) · 6 `am start -n` 제거 · 7 S7 (d) debug 한계 · 8 서사 2장면 · 9 연속 학습 2차(**r03에서 틀린 것으로 정정 — 아래 결함 12**) · 11 픽스처 180초(`fixture_left` · 0.5초 폴링). 고친 것은 기기에서 다시 돌리지 않았다.

**r03이 더한 결함 12 — 측정 정의**: 2차 판정이 배경을 「빈 구역(30 ~ 60%)의 가장 밝은 픽셀」로 잡아 글리프 뒤의 배경이 다른 표면(연속 학습 모달의 주황 운석 · D3의 명암)을 틀리게 쟀다. 첫 실행의 결함 9(「연속 학습 2차도 PASS」)와 S5 · 「제품 결함 0」이 그 영향이다. **`sbpng.py`를 글리프 묶음별 인접 배경으로 고쳤다**(부록 · 판정 정의 — 계약 r03.2). 저장된 캡처에서 재현 · 확인했고 기기에서는 다시 돌리지 않았다.

## test-plan과 다른 점

- **S14 추가(r03 이전에는 S12)**: 앞선 작업 회귀 스모크(실행 화면 · 구성 변경 · 뒤로가기). test-plan의 회귀 절이 가리키는 것을 e2e 항목으로 옮겼다. **test-plan r03이 S12(운석 c의 자리) · S13(API 33/34 기록)을 새 항목으로 정해 번호가 겹쳤다 — r03의 번호를 따르고 이 항목을 S14로 옮겼다.**
- **`sbpng.py check`가 구역 옵션을 쓰지 않는다(r03)**: test-plan r03은 「방법의 정본은 `sb.py`」라고만 정했다. `sb.py`처럼 글리프를 직접 찾으므로 `--clock` · `--icon` · `--blank`는 받기만 한다(`sbzones`가 `SBOPT`로 붙이는 셸 관용구를 건드리지 않으려고). 영상의 시계 구역(`SBCLOCK`)에만 남는다.
- **알림 묶음에도 아이콘 하한 3.0**: r03.2의 「아이콘 묶음 각각 3.0」을 알림(왼쪽의 시계 다음 묶음)에도 적용했다. 접근성 점검의 요약(`sb.py`)은 `iconN`만 요약에 넣으므로 표의 아이콘 수치는 `iconN`이고 알림은 따로 적는다.
- **S1의 세부**: 스크림 0.45가 뒤집히지 않음을 영상(`--expect D`)으로 판정한다(test-plan은 「대비만 기록」). 계약 G7의 가드다. `BottomSheet`는 `completeProgress`의 설문 시트가 뜰 때만(코드로 판단).
- **S10 · S11이 닿게 됐다**: test-plan은 D3 · D4를 「닿지 못함」, S11을 「닿지 못함 — vitest만」으로 두었다. 픽스처에 옵션(`visualNovelProgress` · `finalProgress` · `completeProgress` · `loadProgress`)을 더해 **닿을 수 있게 만들었다 — 코드로 판단했고 기기에서 확인되지 않았다.** 첫 실행이 도달을 확인하고, 안 닿으면 test-plan의 사유로 돌아간다.
- **`px.py strip` 대신 `sbpng.py check`**: 계약 8.2의 구역 모드를 새 도구로 실었다(앞선 문서의 `px.py`를 고치지 않았다 — 그 문서는 시작 구간의 판정이라 그대로다). 글리프를 구역의 가장 밝은(어두운) 픽셀로 잡는다.
- **전환 지연은 환경 조건이 서는 영상에서만, 시작 · 끝으로 가른다**: 순서 · 깜빡임은 프레임 간격과 무관하게 판정하고, 지연은 전환 직후(표면 변화 뒤 0.5초 안) 프레임 간격 중앙 25 ms 이하 · 렌더러에 SwiftShader 없음일 때만 아이콘 색 전환의 시작 ≤ 100 ms · 끝 ≤ 300 ms로 판정한다(구간으로 가둔다 — 걸치면 판정 불가 종료 3). 조건이 안 서면 판정 불가(환경, 종료 4)다. test-plan의 「표면 변화 프레임과 명암이 맞는 첫 프레임의 차 300 ms」를 `latency-diagnosis` 6.1의 권고에 따라 고쳤다.
- **S7 (c) 분할 화면은 기록**: 시스템 상태바가 앱 위에 그려져 2차 판정이 의미가 없다(1차 `apr=`만 판정).
- **D5 `journey-entry`**: 로그인이 소셜(웹 인증)뿐이라 닿지 못한다 — 계약 · test-plan과 같다. 사유를 코드 근거와 함께 적었다.

## 도구를 돌려 본 기록

도구를 **에뮬레이터 없이** 돌려 본 기록이다(2026-10-06). 구현 전 캡처는 작업 `android-status-bar-appearance`의 `artifacts/spec/`(계약 단계 실측)와 `artifacts/integration-design/`(통합 설계 단계 캡처)다 — 둘 다 구현 전 빌드의 API 37 · 제스처 캡처다.
구현 뒤의 PASS 경로는 첫 실행(같은 날)에서 기기로 봤다. 아래 첫 표들은 첫 실행 전에 구현 전 캡처 · 합성 이미지로 확인한 것이고, 맨 끝 「첫 실행 뒤 고친 도구」가 고친 도구를 첫 실행의 저장된 데이터에 다시 돌린 것이다.

> 아래 첫 표 셋(구현 전 캡처 · 가드 · 합성)은 **고치기 전 정의(빈 구역 기준)의 도구**로 돌린 기록이다. r03에서 정의를 바꿨고 새 결과는 이 절의 맨 끝 「r03」이다. 판정(FAIL · PASS)은 새 도구에서도 같고, 메시지와 수치 · 합성 사례가 다르다.

**`sbpng.py check`를 구현 전 캡처에 돌린 결과 — 밝은 아이콘 표면은 전부 FAIL**

| 캡처 | 표면 | 명령 | 결과 |
|---|---|---|---|
| `spec/pre-01-episode-intro-gesture.png` | D1 | `check … light` | **FAIL** — 배경 `#1B1613`(휘도 0.009), 시계 · 아이콘 글리프 `#1B1613`(구역에서 가장 밝은 픽셀이 배경 자신 — 검정 아이콘은 더 어둡다), 휘도 0.009 · 대비 1.00:1 / 1.00:1. 종료 1 |
| `spec/pre-02-prologue-narrative.png` | D2 | `check … light` | **FAIL** — 배경(빈 구역의 가장 밝은 픽셀) `#302B27`, 시계 `#36322E`(휘도 0.033 · 1.10:1), 아이콘 `#322E2C`(0.028 · 1.04:1). 종료 1 |
| `spec/pre-07-stat-modal-gesture.png` | D6 연속 학습 | `check … light` | **FAIL** — 배경 `#2C292D`, 시계 `#2C292D`(0.023 · 1.00:1), **아이콘 구역의 가장 밝은 픽셀 `#F46B18`(주황 운석, 휘도 0.298)** — 휘도 0.9 미만이라 FAIL. 앞선 `px.py strip`은 이 운석을 아이콘으로 읽었다. 구역을 갈라도 운석이 아이콘 구역에 들어오므로 이 모달은 **1차만** 판정한다(S5) |
| `integration-design/sbi-2-intro.png` | D1 | `check … light` | **FAIL** — `pre-01`과 같은 값 |
| `integration-design/sbi-3-narrative.png` | D2 | `check … light` | **FAIL** — 배경 `#26211D`, 시계 `#251F1B`(1.02:1), 아이콘 `#26201C`(1.01:1) |
| `integration-design/sbi-4-modal.png` | D6 연속 학습 | `check … light` | **FAIL** — `pre-07`과 같은 값(아이콘 `#F46B18`) |
| `spec/pre-02-prologue-narrative-3button.png` | D2, 3버튼 | `check … light` | **FAIL** — 배경 `#37322D`, 시계 `#37312A`(1.01:1) |

**가드(어두운 아이콘 표면)는 구현 전에도 PASS이고, 표지가 새면 FAIL이 되는 것을 확인**

| 캡처 | 명령 | 결과 |
|---|---|---|
| `spec/pre-map-gesture.png` · `integration-design/sbi-1-map.png` | `check … dark` | **PASS** — 배경 `#FFFDFC`, 시계 · 아이콘 `#000000`, 20.71:1 / 20.71:1. 종료 0 |
| `spec/probe-light-icons-on-light-screen.png`(밝은 면 위에 밝은 아이콘을 강제로 켠 탐침) | `check … dark` | **FAIL** — 글리프 `#FFFDFC`(휘도 0.985 — 어둡지 않다), 대비 1.00:1. 표지가 밝은 화면에 새는 경우를 이 도구가 잡는다 |
| `spec/pre-01-episode-intro-3button.png` · `pre-02-prologue-narrative-3button.png` | `navband` | **PASS**(가드) — 띠 `#E9E8E8` · `#EBEBEB`, 버튼 `#666666`, 4.70 · 4.82:1 [계약 2.6의 값과 같다] |
| `spec/pre-map-gesture.png` | `layout` | 전경 묶음 x 4.0 ~ 9.7%(시계) · 13.0 ~ 14.0%(보호 표시) · 75.5 ~ 93.0%(아이콘 셋) — **기본 구역(시계 2 ~ 14% · 아이콘 72 ~ 95%) 안** |

**PASS 경로 · 경계 — 합성 이미지**(`python3 "$TOOLS/sbpng.py" selftest`, 종료 0 · `selftest OK`)

| 합성 입력 | 모드 | 결과 |
|---|---|---|
| 흰 글리프 / `#1B1613` | `light` | PASS 17.94:1 |
| 검정 글리프 / `#1B1613`(구현 전 모양) | `light` | FAIL |
| 흰 글리프 / `#FFFDFC`(밝은 아이콘이 밝은 면에 샘) | `light` | FAIL |
| 검정 글리프 / `#FFFDFC` | `dark` | PASS 20.71:1 |
| 흰 글리프 / `#767779`(M3 모양) · `--clock-min 4.4` | `light` | PASS 4.48:1 |
| 같은 캡처 · 기본 하한 4.5 | `light` | **FAIL**(M3의 근소한 미달 — 하한 4.4가 필요한 까닭) |
| 글리프 없음(배경과 같은 색) | `light` | FAIL |
| 빈 구역에 검은 펀치홀 · 밝은 면 | `dark` | PASS(배경을 최빈색으로 잡아 흔들리지 않는다) |

**영상 도구**: 구현 전 전환 영상이 없어 `sbjudge.py`를 구현 전 영상에는 돌리지 못했다 — **합성 프레임 표**로 일곱 경우를 확인했다(`python3 "$TOOLS/sbjudge.py" selftest`, `selftest OK`):
맵 → 표지가 한 프레임 뒤 뒤집힘(PASS) · 표지에서 아이콘이 끝까지 어두움(`D`만 — **FAIL**, 구현 전의 모양) · 같은 명암끼리의 교체(`L` — PASS) · 교체 중 한 프레임 기본값(`L,N,L` — **FAIL**, 깜빡임) ·
지연 0.6초(**FAIL**) · 프레임 간격 0.5초(**판정 불가** 종료 3) · 모달 열기 · 닫기(`D,L,D` — PASS).
`sbframes`는 앞선 작업의 저장된 콜드 스타트 영상(`android-launch-appearance`의 `D37-1.mp4`)에서 프레임 표를 만들었고(33프레임, 간격 80 ~ 2334 ms) `sbjudge.py`가 그 표를 읽어 판정을 냈다 — 이 영상은 이 항목의 대상이 아니라 **파서 · 판정 경로가 실제 출력으로 도는지**만 본 것이다.

**첫 실행 뒤 고친 도구를 저장된 데이터에 다시 돌린 결과**(2026-10-06, 에뮬레이터 없음 — 첫 실행의 프레임 표 · 캡처 · 영상)

| 입력 | 도구 | 결과 |
|---|---|---|
| 구현 전 캡처 D1 · D2 · D6 · `sbi-2` ~ `sbi-4` | `sbpng.py check … light` | **여전히 FAIL**(여섯 모두 종료 1) · 맵 `dark` PASS · 밝은 아이콘 탐침 `dark` FAIL |
| 첫 실행에서 PASS였던 전환: S6a · S6c1(서사 → 채팅) · S6c2의 서사 → 통화 · S6b · S1-dialog · S3-dialog · S11-d7 | `sbjudge.py` | **여전히 PASS**(지연 +52 · +148 · +101 ms, 구간은 같거나 좁아짐 — 판정이 뒤집히지 않는다) |
| 판정 불가였던 전환: S6c2 채팅 → 서사 · S6d ×2 · S6e ×3 · S11 M2 닫기 · S9a · S9 뒤로 | `sbjudge.py`(`--emit-lag 0.05`) | 고친 정의에서 구간이 **+31 ~ +135 ms로 좁아져 한계 안**(점 추정 +51 ~ +85 ms) — (이 기록 당시 표에는 「재판정 대기」였고 r03이 기기에서 확정했다). 가정이 맞는다는 증거가 아니다. `--emit-lag inf`로 같은 표를 돌리면 이 아홉 영상이 **이전처럼 전부 판정 불가(종료 3)**이고 PASS였던 것은 PASS 그대로다(이전 정의 재현 확인) |
| API 30 영상 S9a · S9 뒤로 | `sbframes --clock 12.8,23.3` + `sbjudge.py` | 기본 구역은 **`N` → FAIL**(시계를 못 찾는다), 맞춘 구역은 **D,L · L,D 순서가 읽힌다**(지연 +51 ms · 구간 +33 ~ +101 ms) |
| API 30 캡처 4장 | `sbpng.py zones` · `check` | `zones` = `--clock 12.8,23.3`(스크림 · 안내 위 캡처는 12.8,23.2). 맵 5.73 · 표지 17.94 · 스크림 위 3.81(기록) · 안내 4.53:1. API 37 캡처 3장은 기본 구역 그대로 |

합성: `sbjudge.py selftest` 10개(새 셋: 직전이 1초 정지 화면 · 70 ms 뒤 뒤집힘 PASS / 0.6초 뒤 FAIL / 표면 변화 뒤 프레임 없이 2초 판정 불가) + 보수 정의 1개, `sbpng.py selftest` 8개 모두 OK(고치기 전 도구 — r03에서 12개가 됐다).

### r03 — 인접 배경 정의로 고친 `sbpng.py`를 저장된 캡처에 돌린 결과 (2026-10-06, 에뮬레이터 없음)

**이것은 도구를 돌려 본 기록이지 e2e의 판정이 아니다.** 저장된 캡처는 구현 전(운석 c가 `top: -17px`)의 것이고, S5의 판정은 「재실행 대기」다.

**① 접근성 점검의 `sb.py`와 대조** — 접근성 출력(`after-light.txt` · `after-dark.txt` · `before.txt`)의 캡처 70장 가운데 파일이 남은 66장에서 고친 도구의 시계 · 아이콘(`iconN`) 최악 대비가 `sb.py`의 요약과 **소수 둘째 자리까지 같다**(차이 0건, 허용 0.011). 4장은 캡처 파일이 저장소 밖에 있어 대조하지 못했다(`e2e-green/` · `E5-7s.png`).

**② 표면별 결과**(`sbpng.py check`, 시계 / 알림 최악 / 아이콘 `iconN` 최악, 대비 하한은 문서의 판정 정의)

| 캡처 | 표면 | 모드 · 옵션 | 시계 | 알림 | 아이콘 | 종료 |
|---|---|---|---|---|---|---|
| `S5-trophy.png` | D6 트로피 | `light --bg-expect '#2C292D'` | 14.36 | 14.36 | 14.36 — 모든 묶음의 인접 배경 `#2C292D` | **0 PASS** |
| **`S5-streak.png`** | **D6 연속 학습** | `light --bg-expect '#2C292D'` | 14.36 | 14.36 | **3.02 — 셀룰러 · Wi-Fi · 배터리의 인접 배경 `#F46B18`** | **1 FAIL**(구현 전의 기대대로) |
| `S5-streak.png` | 같은 캡처, 옵션 없이 | `light` | 14.36 | 14.36 | 3.02 | 0 PASS — **대비 하한만으로는 통과한다**(3.02 ≥ 3.0). 그래서 `--bg-expect`를 함께 건다 |
| `S5-streak.png` · `pre-07-…` | 띠 안의 운석 주황 | `count … '#F46B18' --above 132` | — | — | y < 132 안 **6951픽셀**(트로피 모달은 0) | **1 FAIL**(S12의 구현 전 기대 (a)) |
| `S2-intro.png` | D1 | `light` | 17.94 | 17.94 | 17.94 | 0 PASS |
| `S3-dialog.png` | D1′ | `light` | 17.50 | 17.50 | 17.50 | 0 PASS |
| `S4-t1.png` · `S4-t2.png` · `S10-final-intro.png` | D2 첫 장면 · 둘째 · 최종 테스트 도입 | `light` | 12.29 · 13.13 · 13.28 | 12.29 · 12.45 · 12.42 | 13.82 · 12.64 · 12.43 | 0 PASS ×3 |
| `S10-final-exam.png` | D3 시험 단계 | `light` | 13.48 | 12.74 | **7.32**(배터리 뒤 `#5F5544`) | 0 PASS |
| `S10-vn.png` · `S10-roleplay-vn.png` | D4 | `light` | 12.76 | 13.37 | 13.68 | 0 PASS ×2 |
| `S11-d7.png` | D7 | `light` | 15.11 | 15.09 | 15.70 | 0 PASS |
| `S11-m2.png` | M2 | `light` | 4.53 | 4.53 | 4.53 | 0 PASS |
| `S11-seq3.png` | M3 | `light` | 4.48 | 4.48 | 4.48 | 기본 4.5로 **1 FAIL** · `--clock-min 4.4`로 **0 PASS** |
| `S11-q1.png` | M4 | `light` | 4.67 | 4.67 | 4.67 | 0 PASS |
| `S1-map.png` · `S1-settings.png` | 밝은 표면(API 37) | `dark` | 20.71 | 20.71 | 20.71 | 0 PASS ×2 |
| `S1-dialog.png` | 스크림 0.45(API 37) | `dark` | 7.37 | 7.37 | 7.37 | 0 PASS |
| `S9-dialog.png` | 스크림 0.45(API 30) — 기록 | `dark --clock-min 0` | **3.81** | — | 3.81 | 0 PASS(시계 4.5 미달은 받아들인 값) |
| `spec/pre-01-…gesture.png` · `pre-02-…narrative.png` · `pre-07-…gesture.png` · `pre-01-…3button.png` · `pre-02-…3button.png` | 구현 전 D1 · D2 · D6 · 3버튼 D1 · D2 | `light` | — | — | 글리프 묶음을 찾지 못한다(검정 아이콘 — 속 픽셀이 없다) | **1 FAIL ×5**(구현 전 캡처는 여전히 FAIL) |
| `spec/pre-map-gesture.png` | 구현 전 맵(가드) | `dark` | 20.71 | — | 20.71 | 0 PASS |
| `spec/probe-light-icons-on-light-screen.png` | 밝은 면 위의 밝은 아이콘(탐침) | `dark` | — | — | 글리프 속 색 휘도 0.985 · 시계 묶음 없음 | **1 FAIL** |

표의 수치는 test-plan r03의 표면별 기대값과 ±0.1 안에서 같다(M3는 4.48 — 하한 4.4). D2 · D4의 알림 묶음은 아이콘(`iconN`) 값보다 낮을 수 있으나 모두 3.0을 넘는다.
`layout` · `zones` · `navband`는 고치지 않았고 같은 값이다(맵 시계 4.0 ~ 9.7% — 기본 구역, 3버튼 띠 4.70:1). `--clock 12.8,23.3 --icon 72,95` 같은 구역 옵션을 붙여도 `check`는 받기만 하고 결과가 같다(`sbcheck`의 `SBOPT`가 그대로 동작한다).

**③ 합성**: `sbpng.py selftest` 12개 + `count` 2개 모두 OK. 새 사례: 트로피 모양(흰 아이콘 / `#2C292D` · `--bg-expect`) PASS · **연속 학습 모양**(아이콘 옆의 주황 운석) 대비 하한만 PASS(3.02) · 같은 캡처에 `--bg-expect` **FAIL** · 아이콘에 인접한 밝은 그림 `#F0F0F0` FAIL(1.14:1) · 띠 안의 주황 운석 `count` FAIL · 주황 없음 PASS. 고치기 전 8개는 그대로 같은 종료 코드다.


### r02 뒤 — 고친 `sbjudge.py`를 저장된 영상에 돌린 결과 (2026-10-06, 에뮬레이터 없음)

**이것은 도구를 돌려 본 기록이지 e2e의 판정이 아니다.** 첫 실행(`artifacts/e2e/`)과 r02(`artifacts/e2e-r02/`)의 저장된 영상(mp4) 36개를 `sbframes`(기기별 시계 구역: Pixel_8 `2,14` · R6_API30 `12.8,23.3`)로 프레임 표로 다시 뽑아 — 저장된 표와 모든 프레임이 같았다 — 고친 `sbjudge.py`(`--gles` 없이 · 기본 환경 조건)로 판정했다. 렌더러 줄은 저장된 것이 없어 프레임 간격 조건만 걸렸다.

| 영상 | 프레임 간격 중앙 | 고친 도구 | 시작 · 끝(점 추정) |
|---|---|---|---|
| **API 30 8개** — 첫 실행 `S9a` · `S9-back`, r02 `S9a-1` · `S9a-2` · `S9e-1` · `S9e-2` · `S9-m2close` · `S9-dialog` | 16 ~ 18 ms | 지연이 있는 7개 **PASS(종료 0)** · `S9-dialog`는 D 하나(지연 판정 없음) PASS | 판독 +50 ~ +54 ms · 시작 +50 ~ +54 · 끝 +115 ~ +138(중간색 프레임 4 ~ 5개) |
| **API 37 첫 실행 7개** — `S6a` · `S6d` · `S6d2` · `S6e` · `S6e2` · `S6e3` · `S11-m2close` | 17 · 21 · 18 · 23 · 21 · 24 · 22 ms(≤ 25) | **PASS(종료 0)** — 조건이 선다 | 시작 +52 ~ +85 · 끝 +67 ~ +119 |
| API 37 첫 실행 `S6c1`(서사 → 채팅) · `S6c2`(채팅 → 서사 → 통화) | 42 · 34 ms | **판정 불가(환경, 종료 4)** — 이전 도구는 +148 · +83 · +101 ms PASS | 값 기록 |
| API 37 첫 실행 `S6b` · `S11-d7` · `S1-dialog` · `S3-dialog` | 36 · 40 · 25 · 881 ms | 변화 0회 · 순서 맞음 → PASS(종료 0, 지연 판정 없음) | — |
| **API 37 r02 13개** — FAIL 4건 영상(`S6a-3` 88 · `S6d-close` 117 · `S6c2` 171 · `S11-chat2narr` 120)을 포함 | 57 ~ 171 ms(`S6e-3`만 32) | **모두 판정 불가(환경, 종료 4)** — 순서 · 깜빡임은 통과, 지연은 판정하지 않고 값만 적었다 | 판독 +0 ~ +433 ms |
| API 37 r02 `S6b` · `S11-d7` | 138 · 153 ms | 변화 0회 → PASS(종료 0) | — |

- **순서 판정은 모두 그대로다**: 36개 영상의 「관찰한 명암 순서」 · 순서 · 깜빡임 FAIL 줄이 이전 도구와 같았다(차이 0건).
- 환경 조건은 (이 기록 당시) 영상 전체의 프레임 간격 중앙으로 걸었다 — r02 `S6e-3`(+85 ms PASS였던 영상)은 중앙 32 ms라 판정 불가(환경)이고, 표면 변화 뒤 0.5초 안의 간격만 보면 24 ms다. **r03 뒤 도구는 후자(전환 직후)로 건다** — 아래 「r03 뒤」.
- 구현 전 모양은 여전히 FAIL이다: 합성 표(`D` 뒤 `N`만 · 순서가 틀린 표 · 프레임 간격 100 ms에서 순서가 틀린 표)가 `sbjudge.py selftest`에서 종료 1이고, 구현 전 캡처(`spec/pre-*.png` 다섯)는 `sbpng.py check … light`가 모두 FAIL(종료 1)이다(`sbpng.py`는 이번에 바뀌지 않았다).
- `sbjudge.py selftest`: 이전 10개 + 보수 정의 1개(환경 조건을 끄고 같은 결과) + 새 9개(호스트 GPU 모양 PASS · 간격 17 ms에 끝 +350 ms FAIL · 시작 +150 ms FAIL · 중간색 없음 PASS · 프레임 간격 100 ms 종료 4 · 같은 간격에서 순서 틀림 종료 1 · SwiftShader 렌더러 줄 종료 4 · 호스트 GPU 렌더러 줄 PASS · 간격 100 ms 변화 0회 PASS) 모두 OK.
- 이 도구도 문서의 코드 블록에서 꺼냈다(`py_compile` · `selftest` OK). 셸 블록은 `bash -n` · `zsh -n`을 통과했다.

### r03 뒤 — 환경 조건을 「전환 직후」로 고친 `sbjudge.py`를 저장된 영상에 돌린 결과 (2026-10-06, 에뮬레이터 없음)

**이것은 도구를 돌려 본 기록이지 e2e의 판정이 아니다.** 입력: `artifacts/e2e-r03/`의 영상 48개(API 30 26 · API 37 22) + r02 FAIL 4건 영상(`S6a-3` · `S6d-close` · `S6c2` · `S11-chat2narr`) + 첫 실행의 API 37 영상 7개(`S6a` · `S6d` · `S6d2` · `S6e` · `S6e2` · `S6e3` · `S11-m2close`). `sbframes`를 영상에 다시 돌려(기기별 시계 구역: Pixel_8 `2,14` · R6_API30 `12.8,23.2`) 저장된 프레임 표와 **전부 같음**(59개)을 확인한 뒤 r03 당시 도구와 고친 도구를 같은 표에 돌렸다. 렌더러 줄은 r03의 `envrec`(5554 SwiftShader · 5556 호스트 GPU)이고 첫 실행 영상의 렌더러는 기록이 없어 5554의 줄과 「줄 없이」를 둘 다 돌렸다.

- **순서 판정은 바뀌지 않았다**: 59개 영상 모두 「관찰한 명암 순서」가 r03 당시 도구와 같았다(차이 0건). 순서 FAIL은 `a37-n2chat-1 · -2`(기대 `L,D`에 `L`)뿐이고 종료 1 그대로다.
- **API 30(26개)**: 종료가 바뀐 영상 3개 — `a30-n2chat-1`(직후 32 ms) · `a30-n2call-2`(직후 33 ms) **0 → 4**, `a30-m2close-2`(전체 27 ms · 직후 22 ms) **4 → 0**. 지연이 판정된(종료 0) 전환 영상은 **17개**(시작 +19 ~ +60 · 끝 +99 ~ +142 ms), 전환 종류 10가지 모두 하나 이상. 변화 0회 · D 하나 · L 하나 영상(`c2n` ×2 · `d7close` · `dlg` ×2 · `s3` ×2)은 그대로 종료 0.
- **API 37(r03 22개)**: 종료가 바뀐 영상 0개 — 전환 영상 16개 종료 4 · `c2n` ×2 · `s3` · `s1dlg` 종료 0 · `n2chat-1 · -2` 종료 1. 직후 간격 중앙 91 ~ 134 ms(`n2chat-4`만 295 ms).
- **r02 FAIL 4건**: 전부 종료 4(직후 75 ~ 119 ms · SwiftShader) — 「실행 결과」 r03의 표. `S11-chat2narr`는 기대 `L,D,L,D`일 때이고 r02 원문 기대 `D,L`로는 순서 FAIL(종료 1)이다. 환경 조건을 끈 값은 같은 값이 한계(시작 100 · 끝 300 ms)를 넘어 FAIL이다.
- **첫 실행의 API 37 7개**: 5554의 렌더러 줄을 주면 종료 4(SwiftShader), **줄 없이 프레임 간격만 보면 전부 종료 0**(직후 17 ~ 25 ms · 시작 +52 ~ +85 · 끝 +67 ~ +119) — r02 뒤 기록과 같다. 첫 실행 당시 렌더러는 기록이 없다(같은 5554라는 추론) — 이 7개는 **통과로 세지 않는다**.
- **API 30의 r02 · 첫 실행 S9 영상 8개**(구역 `12.8,23.3`): 지연이 있는 7개 PASS(직후 16 ~ 17 ms · 시작 +50 ~ +54 · 끝 +115 ~ +138) · `S9-dialog` D 하나 PASS.
- **구현 전 모양은 여전히 FAIL이다**: `sbjudge.py selftest`의 합성 표(`D` 뒤 `N`만 · 순서가 틀린 표 · 프레임 간격 100 ms에서 순서가 틀린 표)가 종료 1이고 구현 전 캡처(`spec/pre-*.png`)는 `sbpng.py check … light`가 FAIL(종료 1)이다(`sbpng.py`는 바뀌지 않았다).
- `sbjudge.py selftest`: 25개 모두 OK(r02 뒤 20개 + 새 5개 — 영상 전체 17 ms · 직후 40 ms → 종료 4 · 영상 전체 500 ms · 직후 17 ms → PASS · 전환 둘에서 둘째만 종료 4 · 정지 구간 뒤 같은 프레임 변화 → 「지연 값 없음」 종료 3 · 같은 모양 · 직후가 느림 → 종료 4). 이 도구도 문서의 코드 블록에서 꺼냈다(`py_compile` · `selftest` OK). 셸 블록은 `bash -n` · `zsh -n`을 통과했다 — `tapuntil_dark` · 새 `fixture` 함수 묶음은 기기에서 돌리지 않았다 — `A`를 스텁으로 바꿔 bash · zsh에서 시작 시각 파일 · 남은 시간 · 재시작 · 폴링 종료 코드만 확인했다.


## 부록 — 도구 코드

네 블록은 위 「도구」의 명령이 파일로 꺼낸다. 이 블록이 정본이다.
**이 도구들은 문서의 코드 블록에만 있고 저장소의 테스트가 지키지 않는다** — 고칠 때마다 `selftest`와 저장된 캡처로 다시 대조한다.

### `sbpng.py` — PNG 한 장의 구역별 판독

```python file=sbpng.py
#!/usr/bin/env python3
"""android-status-bar-appearance e2e 판독 도구(PNG) — 표준 라이브러리만 쓴다.

  sbpng.py layout PNG                         상태바 띠의 전경(배경과 다른 픽셀) 묶음의 x 범위 — 구역(zone)을 기기에 맞출 때 본다
  sbpng.py zones PNG                          시계 · 아이콘 구역을 이 기기에 맞춘 `--clock a,b --icon c,d` 를 낸다(API 30 은 시계가 14.8 ~ 21.3%). 영상(sbframes)의 구역에만 쓴다
  sbpng.py check PNG light|dark [옵션]          글리프 묶음별 인접 배경으로 색 쌍을 판정한다 (종료 0 PASS · 1 FAIL)
  sbpng.py dist PNG light|dark                묶음별 픽셀 대비 분포 — 기록용, 늘 0
  sbpng.py count PNG #RRGGBB --above Y [--tol 8]  위쪽 Y 줄 안에서 그 색(채널 차 tol 이내)의 픽셀 수 — 있으면 FAIL (S12: 띠 안의 운석 주황)
  sbpng.py navband PNG                        3버튼 내비게이션 바(맨 아래 100px): 띠가 밝고(휘도 >= 0.6) 버튼이 어둡다(< 0.4) — S8
  sbpng.py selftest                           합성 이미지로 PASS · FAIL 경로를 확인한다

옵션: --clock-min 4.5  --icon-min 3.0   (기본값. M3 는 --clock-min 4.4, 스크림 0.45 의 기록은 --clock-min 0 --icon-min 0)
      --bg-expect #2C292D  --bg-tol 8   모든 묶음의 최악 인접 배경이 이 색에서 채널 차 tol(기본 8) 이내여야 한다 — S5(지표 모달의 스크림 합성색)
      --clock a,b --icon c,d --blank e,f   받기만 한다(sbzones 가 SBOPT 로 붙인다). check 는 글리프를 직접 찾으므로 구역을 쓰지 않는다

정의 (spec r03.2 — 접근성 점검의 sb.py 와 같은 방법. 「빈 구역의 가장 밝은 픽셀」을 배경으로 쓰지 않는다):
  1. 띠 = 높이의 0.5% ~ 4.2%. 글리프의 속 = light 는 세 채널 모두 250 이상, dark 는 띠에서 가장 어두운 색에서 채널 차 6 이내.
  2. 속 픽셀의 열을 12px 간격으로 묶는다(시계 · 알림 · 셀룰러 · Wi-Fi · 배터리). 높이 8px 미만이고 속 픽셀 30개 미만인 것은 글리프가 아니다.
     끝이 폭의 50% 이전인 묶음이 왼쪽(첫 묶음 = 시계, 나머지 = 알림), 나머지가 오른쪽(아이콘)이다.
  3. 묶음 주위 12px 여백 영역의 테두리에서 이웃과의 채널 차 5 이하로 번져 나간 픽셀을 2px 깎은 것이 그 영역의 배경이다.
     (글리프의 가장자리는 계단이 커서 넘지 못하고, 섞여 든 옅은 가장자리 픽셀은 2px 깎아 내면 빠진다. 단색 표면에서는 이것이 최빈색이다.)
  4. 묶음의 최악 배경 = 그 묶음의 x 범위(이웃 묶음과의 중간까지)에 든 배경 픽셀 가운데 light 는 가장 밝은, dark 는 가장 어두운 픽셀.
  5. 색 쌍 = 글리프의 속 색 / 묶음의 최악 배경. 시계 묶음 >= clock-min, 알림 · 셀룰러 · Wi-Fi · 배터리 묶음 **각각** >= icon-min.
  판정: 시계 · 아이콘 묶음이 모두 있어야 하고, light 는 속 색 휘도 >= 0.9(글리프가 없으면 FAIL), dark 는 속 색 휘도 < 0.4(API 30 의 어두운 아이콘은 60% 검정).
        --bg-expect 가 있으면 모든 묶음의 최악 배경이 그 색 근처여야 한다. 대비 하한만으로는 주황 배경 뒤의 흰 아이콘(3.02:1)을 못 잡는다.
"""
import struct
import sys
import zlib


def load(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "PNG 가 아니다: " + path
    p, idat = 8, b""
    while p < len(d):
        n, t = struct.unpack(">I4s", d[p:p + 8])
        body = d[p + 8:p + 8 + n]
        p += 12 + n
        if t == b"IHDR":
            w, h, bd, ct, _, _, il = struct.unpack(">IIBBBBB", body)
        elif t == b"IDAT":
            idat += body
    assert bd == 8 and il == 0 and ct in (2, 6), ("지원하지 않는 PNG 형식", bd, ct, il)
    bpp = 4 if ct == 6 else 3
    raw, st = zlib.decompress(idat), w * bpp
    rows, prev, q = [], bytearray(st), 0
    for _ in range(h):
        f = raw[q]
        line = bytearray(raw[q + 1:q + 1 + st])
        q += 1 + st
        if f == 1:
            for i in range(bpp, st):
                line[i] = (line[i] + line[i - bpp]) & 255
        elif f == 2:
            for i in range(st):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(st):
                line[i] = (line[i] + (((line[i - bpp] if i >= bpp else 0) + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(st):
                a = line[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                line[i] = (line[i] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
        rows.append(line)
        prev = line
    return w, h, bpp, rows


def write_png(path, w, h, pixel):
    """selftest 용. pixel(x, y) -> (r, g, b)."""
    raw = b"".join(b"\x00" + bytes(v for x in range(w) for v in pixel(x, y)) for y in range(h))

    def chunk(t, b):
        c = struct.pack(">I", len(b)) + t + b
        return c + struct.pack(">I", zlib.crc32(t + b) & 0xFFFFFFFF)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                           + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def at(img, x, y):
    w, h, bpp, rows = img
    r = rows[y]
    return (r[x * bpp], r[x * bpp + 1], r[x * bpp + 2])


def hx(c):
    return "#%02X%02X%02X" % c


def lum(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def strip_rows(img):
    return int(img[1] * 0.005), int(img[1] * 0.035)


def zone_pixels(img, pct):
    w = img[0]
    ya, yb = strip_rows(img)
    x0, x1 = int(w * pct[0] / 100.0), int(w * pct[1] / 100.0)
    return [at(img, x, y) for y in range(ya, yb) for x in range(x0, x1)]


def mode_of(pixels):
    hist = {}
    for c in pixels:
        hist[c] = hist.get(c, 0) + 1
    return max(hist, key=lambda c: (hist[c], c))


GLYPH_BAND = (0.005, 0.042)   # 글리프 판독 띠(높이의 비율). 구역 도구(strip_rows)보다 아래 끝이 조금 더 내려간다
T = 5                         # 배경이 번지는 이웃 픽셀과의 채널 차


def glyph_band(img):
    h = img[1]
    return int(h * GLYPH_BAND[0]), int(h * GLYPH_BAND[1])


def cores(img, mode):
    """글리프의 속 픽셀과 그 색."""
    w = img[0]
    ya, yb = glyph_band(img)
    if mode == "light":
        return [(x, y) for y in range(ya, yb) for x in range(w) if min(at(img, x, y)) >= 250], (255, 255, 255)
    dk = min((at(img, x, y) for y in range(ya, yb) for x in range(w)), key=lambda c: (lum(c), c))
    return [(x, y) for y in range(ya, yb) for x in range(w)
            if max(abs(at(img, x, y)[i] - dk[i]) for i in range(3)) <= 6], dk


def clusters(pts):
    """속 픽셀의 열을 12px 간격으로 묶는다 → (x0, x1, y0, y1, 개수)."""
    cols = sorted(set(x for x, _ in pts))
    runs, a, p = [], cols[0], cols[0]
    for x in cols[1:]:
        if x - p > 12:
            runs.append((a, p))
            a = x
        p = x
    runs.append((a, p))
    out = []
    for a, b in runs:
        ys = [y for x, y in pts if a <= x <= b]
        out.append((a, b, min(ys), max(ys), len(ys)))
    return out


def flood(img, x0, y0, x1, y1):
    """테두리에서 이웃과의 채널 차 T 이하로 번지는 픽셀. 좌표는 닫힌 구간."""
    stack = [(x, y) for x in range(x0, x1 + 1) for y in (y0, y1)] + [(x, y) for y in range(y0, y1 + 1) for x in (x0, x1)]
    seen = set(stack)
    while stack:
        x, y = stack.pop()
        c = at(img, x, y)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < x0 or nx > x1 or ny < y0 or ny > y1 or (nx, ny) in seen:
                continue
            d = at(img, nx, ny)
            if max(abs(c[i] - d[i]) for i in range(3)) <= T:
                seen.add((nx, ny))
                stack.append((nx, ny))
    return seen


def background(img, x0, y0, x1, y1):
    """영역의 배경 픽셀 집합 — 번져 나간 픽셀에서 배경이 아닌 픽셀 2px 안의 것을 깎아 낸다."""
    raw = flood(img, x0, y0, x1, y1)
    out = set()
    for (x, y) in raw:
        if all(not (x0 <= x + dx <= x1 and y0 <= y + dy <= y1) or (x + dx, y + dy) in raw
               for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2)):
            out.add((x, y))
    return out


def measure(img, mode):
    """글리프 묶음별 측정. 돌려주는 값: (글리프 속 색, 묶음 목록). 묶음 = dict(label, x, y, bg(최악), contrast, fg(전경 픽셀의 대비))."""
    w = img[0]
    pts, glyph = cores(img, mode)
    if not pts:
        return glyph, []
    cl = [c for c in clusters(pts) if c[3] - c[2] >= 8 or c[4] >= 30]
    if not cl:
        return glyph, []
    gy0, gy1 = min(c[2] for c in cl), max(c[3] for c in cl)
    worst = max if mode == "light" else min
    out = []
    for side, group in (("L", [c for c in cl if c[1] < w * 0.5]), ("R", [c for c in cl if c[1] >= w * 0.5])):
        if not group:
            continue
        x0 = max(0, min(c[0] for c in group) - 12)
        x1 = min(w - 1, max(c[1] for c in group) + 12)
        y0, y1 = max(0, gy0 - 8), gy1 + 8
        bgset = background(img, x0, y0, x1, y1)
        bgc = [at(img, x, y) for x, y in bgset]
        lo = [min(c[i] for c in bgc) for i in range(3)] if bgc else [0, 0, 0]
        hi = [max(c[i] for c in bgc) for i in range(3)] if bgc else [0, 0, 0]
        e = 0 if lo == hi else 2        # 그림 · 명암 표면은 배경 범위 ±2 밖을 전경으로 센다
        for k, (a, b, cy0, cy1, n) in enumerate(group):
            xa = x0 if k == 0 else (group[k - 1][1] + a) // 2 + 1
            xb = x1 if k == len(group) - 1 else (b + group[k + 1][0]) // 2
            near = [at(img, x, y) for x, y in bgset if xa <= x <= xb]
            label = ("clock" if k == 0 else "notif%d" % k) if side == "L" else "icon%d" % (k + 1)
            item = {"label": label, "x": (a, b), "y": (cy0, cy1), "bg": None, "contrast": None, "fg": []}
            if near:
                wb = worst(near, key=lambda c: (lum(c), c))
                item["bg"], item["contrast"] = wb, contrast(glyph, wb)
                for y in range(y0, y1 + 1):
                    for x in range(xa, xb + 1):
                        c = at(img, x, y)
                        if all(lo[i] - e <= c[i] <= hi[i] + e for i in range(3)):
                            continue
                        item["fg"].append(contrast(c, wb) if ((lum(c) > lum(wb)) == (mode == "light")) else 1.0 / contrast(c, wb))
            out.append(item)
    return glyph, out


def parse_opts(args):
    o = {"clock-min": 4.5, "icon-min": 3.0, "bg-tol": 8.0, "bg-expect": None}
    i = 0
    while i < len(args):
        k = args[i].lstrip("-")
        v = args[i + 1]
        if k in ("clock", "icon", "blank"):
            o[k] = tuple(float(t) for t in v.split(","))      # 받기만 한다 — check · dist 는 구역을 쓰지 않는다
        elif k == "bg-expect":
            o[k] = tuple(int(v.lstrip("#")[j:j + 2], 16) for j in (0, 2, 4))
        else:
            o[k] = float(v)
        i += 2
    return o


def near_color(c, ref, tol):
    return max(abs(c[i] - ref[i]) for i in range(3)) <= tol


def cmd_check(img, mode, o):
    glyph, items = measure(img, mode)
    print("글리프 속 색 %s(휘도 %.3f) · 묶음 %d" % (hx(glyph), lum(glyph), len(items)))
    ok = True
    tone = lum(glyph) >= 0.9 if mode == "light" else lum(glyph) < 0.4
    if not items:
        print("  FAIL 글리프 묶음을 찾지 못했다(%s 아이콘이 아니다)" % ("밝은" if mode == "light" else "어두운"))
        print("FAIL")
        return 1
    if not tone:
        ok = False
        print("  FAIL 글리프 속 색의 휘도 %.3f — %s" % (lum(glyph), "밝다 >= 0.9 가 아니다" if mode == "light" else "어둡다 < 0.4 가 아니다"))
    labels = [it["label"] for it in items]
    for need, what in (("clock", "시계"), ("icon", "아이콘")):
        if not any(l.startswith(need) for l in labels):
            ok = False
            print("  FAIL %s 묶음이 없다 — 묶음 %s" % (what, labels))
    for it in items:
        floor = o["clock-min"] if it["label"] == "clock" else o["icon-min"]
        if it["bg"] is None:
            ok = False
            print("  FAIL %-6s x=%4d..%4d 인접 배경 픽셀이 없다" % (it["label"], it["x"][0], it["x"][1]))
            continue
        good = it["contrast"] >= floor
        why = ""
        if o["bg-expect"] is not None and not near_color(it["bg"], o["bg-expect"], o["bg-tol"]):
            good = False
            why = " · 인접 배경이 %s 가 아니다(채널 차 %d 초과)" % (hx(o["bg-expect"]), o["bg-tol"])
        ok = ok and good
        print("  %s %-6s x=%4d..%4d 최악 인접 배경 %s · %s/%s = %.2f:1 (하한 %.2f)%s" % (
            "PASS" if good else "FAIL", it["label"], it["x"][0], it["x"][1], hx(it["bg"]), hx(glyph), hx(it["bg"]), it["contrast"], floor, why))
    clock = [it for it in items if it["label"] == "clock" and it["bg"] is not None]
    notifs = [it for it in items if it["label"].startswith("notif") and it["bg"] is not None]
    icons = [it for it in items if it["label"].startswith("icon") and it["bg"] is not None]
    if clock and icons:
        wi = min(icons, key=lambda it: it["contrast"])
        wn = min(notifs, key=lambda it: it["contrast"]) if notifs else None
        print("요약 시계 %s = %.2f:1 | 알림 최악 %s | 아이콘 최악 %s(%s) = %.2f:1" % (
            hx(clock[0]["bg"]), clock[0]["contrast"], ("%s = %.2f:1" % (hx(wn["bg"]), wn["contrast"])) if wn else "-", wi["label"], hx(wi["bg"]), wi["contrast"]))
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


def cmd_count(img, color, o):
    ref = tuple(int(color.lstrip("#")[j:j + 2], 16) for j in (0, 2, 4))
    top, tol = int(o.get("above", 0)), o.get("tol", 8)
    n = sum(1 for y in range(min(top, img[1])) for x in range(img[0]) if near_color(at(img, x, y), ref, tol))
    print("y < %d 안의 %s(채널 차 %d 이내) 픽셀: %d" % (top, hx(ref), tol, n))
    print("PASS" if n == 0 else "FAIL")
    return 0 if n == 0 else 1


def cmd_dist(img, mode, o):
    glyph, items = measure(img, mode)
    print("기록(판정 아님) 글리프 속 색 %s · 묶음별 최악 인접 배경 기준" % hx(glyph))
    for it in items:
        cs = it["fg"]
        if not cs:
            print("  %-6s 전경 없음" % it["label"])
            continue
        n = len(cs)
        print("  %-6s 최악 배경 %s · 전경 %5d · 4.5 이상 %5.1f%% · 3.0 이상 %5.1f%% · 평균 %.2f" % (
            it["label"], hx(it["bg"]), n, 100.0 * sum(c >= 4.5 for c in cs) / n, 100.0 * sum(c >= 3.0 for c in cs) / n, sum(cs) / n))
    return 0


def cmd_layout(img):
    ya, yb = strip_rows(img)
    w = img[0]
    px = [(x, at(img, x, y)) for y in range(ya, yb) for x in range(w)]
    m = mode_of([c for _, c in px])
    cols = sorted(set(x for x, c in px if max(abs(c[i] - m[i]) for i in range(3)) >= 40))
    if not cols:
        print("전경 없음")
        return 0
    runs, s, p = [], cols[0], cols[0]
    for x in cols[1:]:
        if x - p > 12:
            runs.append((s, p))
            s = x
        p = x
    runs.append((s, p))
    print("띠 y=%d..%d · 배경 최빈 %s · 전경 묶음(x, 폭의 %%):" % (ya, yb, hx(m)))
    for a, b in runs:
        print("  x=%d..%d (%.1f%% ~ %.1f%%)" % (a, b, 100.0 * a / w, 100.0 * b / w))
    return 0


def cmd_zones(img):
    """시계 · 아이콘 구역을 기기에 맞춘다. 기본 구역에 들면 기본값, 아니면 전경 묶음에 맞춘 값을 `--clock a,b --icon c,d` 로 낸다.
    API 37 Pixel_8: 시계 4.0 ~ 10.3% → 기본(2,14). API 30 R6_API30: 시계 14.8 ~ 21.3% → 12.8,23.3."""
    ya, yb = strip_rows(img)
    w = img[0]
    px = [(x, at(img, x, y)) for y in range(ya, yb) for x in range(w)]
    m = mode_of([c for _, c in px])
    cols = sorted(set(x for x, c in px if max(abs(c[i] - m[i]) for i in range(3)) >= 40))
    if not cols:
        print("전경 없음 — 띠에 글리프가 없다", file=sys.stderr)
        return 1
    runs, s, p = [], cols[0], cols[0]
    for x in cols[1:]:
        if x - p > 12:
            runs.append((s, p))
            s = x
        p = x
    runs.append((s, p))
    pc = lambda v: 100.0 * v / w
    a, b = pc(runs[0][0]), pc(runs[0][1])
    clock = (2, 14) if (a >= 2 and b <= 14) else (max(0.0, round(a - 2, 1)), round(b + 2, 1))
    c, d = pc(runs[-3 if len(runs) >= 3 else 0][0]), pc(runs[-1][1])
    icon = (72, 95) if (c >= 72 and d <= 95) else (max(0.0, round(c - 2, 1)), min(100.0, round(d + 2, 1)))
    print("--clock %g,%g --icon %g,%g" % (clock + icon))
    return 0


def cmd_navband(img):
    w, h = img[0], img[1]
    px = [at(img, x, y) for y in range(h - 100, h) for x in range(0, w)]
    band = mode_of(px)
    btn = min(px, key=lambda c: (lum(c), c))
    ok = lum(band) >= 0.6 and lum(btn) < 0.4
    print("내비게이션 띠(맨 아래 100px 최빈) %s 휘도 %.3f · 가장 어두운 픽셀(버튼) %s 휘도 %.3f · 대비 %.2f:1" % (
        hx(band), lum(band), hx(btn), lum(btn), contrast(btn, band)))
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


def selftest():
    import os
    import tempfile
    d = tempfile.mkdtemp()
    w, h = 1080, 2400

    def make(bg, fg, name, bgfn=None):
        def px(x, y):
            if 50 <= y <= 70 and (60 <= x <= 200 or 780 <= x <= 1000):
                return fg
            return bgfn(x, y) if bgfn else bg
        p = os.path.join(d, name)
        write_png(p, w, h, px)
        return p
    dark, light, scrim, orange = (0x1B, 0x16, 0x13), (0xFF, 0xFD, 0xFC), (0x2C, 0x29, 0x2D), (0xF4, 0x6B, 0x18)
    meteor = lambda x, y: orange if (900 <= x <= 1080 and 20 <= y <= 100) else scrim      # 아이콘 오른쪽에 걸친 운석
    expect = ["--bg-expect", "#2C292D"]
    cases = [
        ("흰 아이콘 / 어두운 면 → PASS", make(dark, (255, 255, 255), "a.png"), "light", [], 0),
        ("검정 아이콘 / 어두운 면(구현 전 모양) → FAIL", make(dark, (0, 0, 0), "b.png"), "light", [], 1),
        ("흰 아이콘 / 밝은 면(밝은 아이콘이 새는 경우) → FAIL", make(light, (255, 255, 255), "c.png"), "light", [], 1),
        ("검정 아이콘 / 밝은 면 · dark → PASS", make(light, (0, 0, 0), "d.png"), "dark", [], 0),
        ("흰 아이콘 / #767779 · --clock-min 4.4 → PASS", make((0x76, 0x77, 0x79), (255, 255, 255), "e.png"), "light", ["--clock-min", "4.4"], 0),
        ("같은 캡처 · 하한 4.5 → FAIL(M3 의 근소한 미달)", os.path.join(d, "e.png"), "light", [], 1),
        ("글리프 없음(배경과 같은 색) → FAIL", make(dark, dark, "f.png"), "light", [], 1),
        ("빈 구역에 검은 펀치홀 · dark → PASS", make(light, (0, 0, 0), "g.png",
         lambda x, y: (0, 0, 0) if 520 <= x <= 560 and 50 <= y <= 70 else light), "dark", [], 0),
        ("트로피 모양: 흰 아이콘 / 스크림 #2C292D · --bg-expect → PASS", make(scrim, (255, 255, 255), "h.png"), "light", expect, 0),
        ("연속 학습 모양: 아이콘 옆에 주황 운석 · 대비 하한만 → PASS(3.02 는 3.0 을 넘는다 — 하한만으로는 못 잡는다)", make(scrim, (255, 255, 255), "i.png", meteor), "light", [], 0),
        ("같은 캡처 · --bg-expect #2C292D → FAIL(인접 배경이 주황)", os.path.join(d, "i.png"), "light", expect, 1),
        ("아이콘에 인접한 밝은 그림 #F0F0F0 → FAIL(대비 1.1:1)", make(dark, (255, 255, 255), "j.png",
         lambda x, y: (0xF0, 0xF0, 0xF0) if 1000 <= x <= 1080 and 20 <= y <= 100 else dark), "light", [], 1),
    ]
    bad = 0
    for name, path, mode, extra, want in cases:
        print("--", name)
        got = cmd_check(load(path), mode, parse_opts(extra))
        if got != want:
            bad += 1
            print("selftest 불일치: 기대 종료 %d, 실제 %d" % (want, got))
    for name, blob, want in (("count: 띠 안의 주황 운석 → FAIL", True, 1), ("count: 띠 안에 주황 없음 → PASS", False, 0)):
        print("--", name)
        p = os.path.join(d, "k.png")
        write_png(p, w, h, lambda x, y: orange if (blob and 900 <= x <= 1000 and 10 <= y <= 60) else scrim)
        got = cmd_count(load(p), "#F46B18", parse_opts(["--above", "132"]))
        if got != want:
            bad += 1
            print("selftest 불일치: 기대 종료 %d, 실제 %d" % (want, got))
    print("selftest", "OK" if not bad else "FAILED %d" % bad)
    return 1 if bad else 0


def main(a):
    if len(a) < 2:
        print(__doc__)
        return 2
    c = a[1]
    if c == "selftest":
        return selftest()
    if c == "layout" and len(a) >= 3:
        return cmd_layout(load(a[2]))
    if c == "check" and len(a) >= 4 and a[3] in ("light", "dark"):
        return cmd_check(load(a[2]), a[3], parse_opts(a[4:]))
    if c == "zones" and len(a) >= 3:
        return cmd_zones(load(a[2]))
    if c == "navband" and len(a) >= 3:
        return cmd_navband(load(a[2]))
    if c == "count" and len(a) >= 4:
        return cmd_count(load(a[2]), a[3], parse_opts(a[4:]))
    if c == "dist" and len(a) >= 4 and a[3] in ("light", "dark"):
        return cmd_dist(load(a[2]), a[3], parse_opts(a[4:]))
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### `sbframes.swift` — 영상 → 프레임 표

```swift file=sbframes.swift
import AVFoundation
import CoreGraphics
import Foundation

// 사용: sbframes <영상.mp4> [--clock 2,14] [--blank 30,60]
// 프레임마다 한 줄을 stdout에 낸다 (상태바 띠 = 높이의 0.5% ~ 3.5%, 구역 x 범위는 폭의 %):
//   0042 t=2.670 bg=0.981 cmax=0.012 cmin=0.000 top=#1B1613
// bg   = 빈 구역(기본 30~60%)에서 가장 큰 상대 휘도
// cmax = 시계 구역(기본 2~14%)에서 가장 큰 상대 휘도 · cmin = 가장 작은 상대 휘도
// top  = (폭 10%, 높이 10%) 표본 — 표면이 바뀌었는지 사람이 보는 참고값
// 영상은 코덱 오차가 있어 값 자체보다 sbjudge.py 가 bg 와의 차(0.3 이상)로 명암을 읽는다.
let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: sbframes <video> [--clock a,b] [--blank a,b]"); exit(2) }
var clock = (2.0, 14.0), blank = (30.0, 60.0)
var k = 2
while k + 1 < args.count {
  let v = args[k + 1].split(separator: ",").compactMap { Double($0) }
  if v.count == 2 {
    if args[k] == "--clock" { clock = (v[0], v[1]) }
    if args[k] == "--blank" { blank = (v[0], v[1]) }
  }
  k += 2
}
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }
let reader = try! AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
])
reader.add(output)
reader.startReading()
let table: [Double] = (0..<256).map { i in
  let v = Double(i) / 255.0
  return v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4)
}
func lum(_ p: UnsafePointer<UInt8>) -> Double { 0.2126 * table[Int(p[2])] + 0.7152 * table[Int(p[1])] + 0.0722 * table[Int(p[0])] }
var index = 0
while let sample = output.copyNextSampleBuffer() {
  guard let buf = CMSampleBufferGetImageBuffer(sample) else { continue }
  let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
  CVPixelBufferLockBaseAddress(buf, .readOnly)
  let w = CVPixelBufferGetWidth(buf), h = CVPixelBufferGetHeight(buf)
  let stride = CVPixelBufferGetBytesPerRow(buf)
  let base = CVPixelBufferGetBaseAddress(buf)!.assumingMemoryBound(to: UInt8.self)
  let ya = Int(Double(h) * 0.005), yb = Int(Double(h) * 0.035)
  func extremes(_ a: Double, _ b: Double) -> (Double, Double) {
    var hi = 0.0, lo = 1.0
    for y in ya..<yb {
      for x in Int(Double(w) * a / 100.0)..<Int(Double(w) * b / 100.0) {
        let l = lum(base + y * stride + x * 4)
        if l > hi { hi = l }
        if l < lo { lo = l }
      }
    }
    return (hi, lo)
  }
  let bg = extremes(blank.0, blank.1).0
  let c = extremes(clock.0, clock.1)
  let tp = base + min(h - 1, Int(Double(h) * 0.10)) * stride + min(w - 1, Int(Double(w) * 0.10)) * 4
  print(String(format: "%04d t=%.3f bg=%.3f cmax=%.3f cmin=%.3f top=#%02X%02X%02X", index, t, bg, c.0, c.1, tp[2], tp[1], tp[0]))
  CVPixelBufferUnlockBaseAddress(buf, .readOnly)
  index += 1
}
print("frames=\(index)")
```

### `sbjudge.py` — 전환 영상의 판정

```python file=sbjudge.py
#!/usr/bin/env python3
"""전환 영상의 프레임 표(sbframes 의 출력)를 판정한다 — 상태바 아이콘 명암의 전환 (S6).

  sbjudge.py frames.txt --expect D,L [--max-lag 0.3] [--max-start 0.1] [--emit-lag 0.05|inf] [--allow-n]
                                     [--env-gap 25|inf] [--gles "GLES: …"]
  sbjudge.py selftest

--expect 는 영상 전체에서 시계의 명암이 거쳐야 하는 순서다. D = 어두운 아이콘 · L = 밝은 아이콘.
  맵 → 표지: D,L   표지 → 서사(같은 명암끼리): L   모달 열기 · 닫기: D,L,D   서사 → 채팅: L,D

프레임의 명암(시계 구역 기준 — 아이콘 구역에는 앱의 그림이 겹칠 수 있다):
  L  cmax - bg >= 0.2   시계가 빈 구역의 가장 밝은 지점보다 밝다(밝은 아이콘)
  D  bg - cmin >= 0.2   시계가 어둡다(어두운 아이콘)
  N  둘 다 아니다        시계가 배경과 구별되지 않는다(어두운 아이콘이 어두운 면 위에 있는 구현 전의 모양)

판정 — 순서 · 깜빡임은 프레임 간격과 무관하게 판정한다(에뮬레이터의 렌더러가 느려도 같다):
  1) 순서: N 프레임을 건너뛰고 같은 명암을 이은 것이 --expect 와 정확히 같아야 한다. 더 많이 바뀌면(왕복 · 떨림) FAIL — design T4.
     한 전환에서 명암은 한 번만 바뀐다 — 기대 순서의 경계 하나가 전환 하나다.
  2) 깜빡임: 같은 명암 사이에 낀 N 프레임이 있으면 FAIL(L,N,L = 다른 명암으로 갔다 왔을 수 있다). --allow-n 으로 끈다.
지연 — 환경이 허락할 때만 판정한다:
  0) 환경 조건: ① **전환 직후** 프레임 간격의 중앙이 --env-gap(기본 25 ms)을 넘으면 ② --gles 로 준 렌더러 줄에 SwiftShader 가 있으면
     지연은 판정하지 않고 「판정 불가(환경)」(종료 4)로 낸다. 값(시작 · 끝의 점 추정)은 적는다.
     「전환 직후」 = 그 전환의 표면 변화 프레임 **뒤 0.5초 안**(NEAR_WIN)에 도착한 프레임들의 간격(직전 프레임과의 차). 표면 변화마다 따로 재서
     그 표면 변화에 짝지은 아이콘 전환에만 건다. 영상 전체의 중앙은 정지 구간(앞뒤의 긴 간격)에 흔들려 기록으로만 남긴다.
     SwiftShader(CPU 렌더링)는 SystemUI 의 상태바 프레임 간격을 70 ~ 220 ms 로 벌려 120 ms 짜리 색 애니메이션이 300 ms 를 넘어 끝난다 —
     앱 밖의 일이라 앱의 FAIL 이 아니다(latency-diagnosis). 순서 · 깜빡임이 FAIL 이면 환경과 무관하게 FAIL(종료 1).
  3) 지연: 표면 변화(bg 가 0.15 이상 뛴 첫 프레임)와 아이콘 색 전환의 시작 · 끝 짝마다 실제 지연의 구간을 가둔다.
       시작 = 새 명암 쪽으로 시계 색이 처음 10% 움직인 프레임 · 끝 = 90% 에 닿은 첫 프레임(그 명암의 최종 값 기준).
       중간색 프레임(10% ~ 90%)이 하나라도 있으면 시작 · 끝을 구분한다 — 시작 <= --max-start(0.1초) · 끝 <= --max-lag(0.3초).
       중간색 프레임이 없으면 시작과 끝이 한 프레임이라 끝만 판정하고 시작은 기록한다.
       표면 변화는 정지 화면 뒤에 온다 — 정지 화면에서는 프레임이 나오지 않으니 직전 프레임과의 간격은 변화 시각의 불확실이 아니다.
       그래서 표면 변화의 실제 시각을 (max(직전 프레임, t - emit-lag), t] 로 본다(화면이 바뀌면 screenrecord 는 한 합성 주기, 관측 최소 간격 14 ~ 16ms 안에 프레임을 낸다).
       아이콘 색 변화는 표면이 움직이는 중에 온다 — 거기 프레임 간격이 성긴 것은 누락일 수 있어 (직전 프레임, t] 전체를 그대로 쓴다.
       emit-lag 기본 0.05초(= 합성 주기 3개 — 프레임 한두 장의 누락 · 인코더 지터를 허락). 이 가정은 입력 시각이 없어 이 도구로 검증되지 않는다 — `--emit-lag inf` 는 이전 정의(보수)다.
       끝: 구간의 아래끝이 한계보다 크거나 위끝이 -max-lag 보다 작으면 FAIL, 구간이 한계 안에 다 들어오면 PASS, 걸치면 판정 불가(종료 3).
       시작: 구간의 위끝이 emit-lag 로 50 ms 부풀어 한계 100 ms 에서는 거의 늘 걸친다 — 점 추정이 한계 이하면 PASS · 구간의 아래끝이 한계를 넘으면 FAIL · 그 사이는 판정 불가.
       출력의 「보수」는 이전 정의의 구간(기록). 「판독」은 시계가 처음 L · D 로 읽힌 프레임(대비 0.2 — 이전 도구의 지연 값)의 점 추정(기록).
       **기록값으로 쓸 수 없는 경우**: 아이콘 변화가 표면 변화와 같은 프레임이고 그 프레임 직전의 간격이 --emit-lag 보다 길면(영상이 정지 구간으로 시작했거나
       정지 구간 뒤에 둘이 한꺼번에 나온 모양) 점 추정은 +0 이고 구간은 정지 구간만큼 음수(−799 ~ +50 ms 같은 값)로 벌어진다 — 같은 프레임 안의 차는 영상으로
       가려낼 수 없다. 이때는 수치를 내지 않고 「지연 값 없음 — 기록값으로 쓰지 않는다」로 적고 지연은 판정 불가(종료 3, 환경 조건이 안 서면 4)다.
종료 코드: 0 PASS · 1 FAIL · 2 사용법 · 3 판정 불가(구간이 한계에 걸침) · 4 판정 불가(환경 — 프레임 간격 · 렌더러).
screenrecord 는 화면이 바뀔 때만 프레임을 내므로 간격이 불규칙하다(정지 화면은 수 초). 짧게 녹화해 정지 구간이 중앙값을 끌어올리지 않게 한다.
이 도구는 입력(탭)에서 화면까지의 시간이 아니라 녹화에 보인 표면 변화와 아이콘 색 변화의 차를 잰다.
"""
import re
import sys

LINE = re.compile(r"^(\d+) t=([\d.]+) bg=([\d.]+) cmax=([\d.]+) cmin=([\d.]+)")
ENV_GAP = 0.025       # 전환 직후 프레임 간격 중앙이 이 값을 넘으면 지연은 판정 불가(환경)
NEAR_WIN = 0.5        # 「전환 직후」 = 표면 변화 프레임 뒤 이 시간(초). 아이콘 전환은 한계 300 ms 안에 끝나야 하므로 그 한계에 여유를 더한 창이다
START_FRAC, END_FRAC = 0.1, 0.9


def parse(path):
    frames = []
    for line in open(path, encoding="utf-8"):
        m = LINE.match(line)
        if m:
            frames.append((float(m.group(2)), float(m.group(3)), float(m.group(4)), float(m.group(5))))
    return frames


def tone(f):
    _, bg, cmax, cmin = f
    up, down = cmax - bg, bg - cmin
    if up >= 0.2 and up >= down:
        return "L"
    if down >= 0.2:
        return "D"
    return "N"


def metric(f, t):
    """시계가 명암 t 쪽으로 얼마나 왔나(대비). L: cmax - bg · D: bg - cmin."""
    _, bg, cmax, cmin = f
    return (cmax - bg) if t == "L" else (bg - cmin)


def surface_events(frames):
    ev, last = [], -9.0
    for i in range(1, len(frames)):
        if abs(frames[i][1] - frames[i - 1][1]) >= 0.15 and frames[i][0] - last > 0.3:
            ev.append(i)
            last = frames[i][0]
    return ev


def span(frames, i, emit_lag):
    """프레임 i 가 가리키는 변화가 실제로 일어난 시각의 구간 (아래끝, 위끝)."""
    prev = frames[i - 1][0] if i > 0 else frames[i][0] - emit_lag
    return max(prev, frames[i][0] - emit_lag), frames[i][0]


def median(xs):
    xs = sorted(xs)
    return xs[len(xs) // 2]


def near_gaps(frames, e, win=NEAR_WIN):
    """표면 변화 프레임 e 뒤 win 초 안에 도착한 프레임들의 간격(각각 직전 프레임과의 차) — 「전환 직후 프레임 간격」."""
    return [frames[i][0] - frames[i - 1][0] for i in range(e + 1, len(frames)) if frames[i][0] <= frames[e][0] + win]


def start_end(frames, runs, j):
    """runs[j] 로 가는 아이콘 색 전환의 시작 · 끝 프레임 번호(그 명암의 최종 값 대비 10% · 90%)."""
    t = runs[j][0]
    final = max(metric(frames[i], t) for i in range(runs[j][1], runs[j][2] + 1))
    i0, i1 = runs[j - 1][2], runs[j][2]
    start = next((i for i in range(i0, i1 + 1) if metric(frames[i], t) >= START_FRAC * final), runs[j][1])
    end = next((i for i in range(start, i1 + 1) if metric(frames[i], t) >= END_FRAC * final), runs[j][1])
    return start, end


def bound(frames, i, s, ss):
    """프레임 i 의 변화가 표면 변화(s, 구간 ss)에서 얼마나 뒤인가 — (점, 아래끝, 위끝, 보수 상한) 초."""
    prev = frames[i - 1][0] if i > 0 else frames[i][0] - 1.0
    return (frames[i][0] - frames[s][0], prev - frames[s][0], frames[i][0] - ss[0], frames[i][0] - frames[s - 1][0])


def verdict(lo, hi, limit, max_lag):
    if lo > limit or hi < -max_lag:
        return "FAIL"
    if hi <= limit and lo >= -max_lag:
        return "PASS"
    return "판정 불가"


def verdict_start(pt, lo, hi, limit, max_lag):
    """시작(한계 100 ms): 구간의 위끝은 emit-lag(50 ms)만큼 부풀어 한계 100 ms 에서는 거의 늘 걸친다.
    그래서 점 추정이 한계 이하면 PASS, 구간의 아래끝이 한계를 넘으면 FAIL, 그 사이는 판정 불가."""
    if lo > limit or hi < -max_lag:
        return "FAIL"
    if pt <= limit and pt >= -max_lag:
        return "PASS"
    return "판정 불가"


def judge(frames, expect, max_lag=0.3, allow_n=False, emit_lag=0.05, max_start=0.1, env_gap=ENV_GAP, gles="", near_win=NEAR_WIN):
    tones = [tone(f) for f in frames]
    gaps = [frames[i][0] - frames[i - 1][0] for i in range(1, len(frames))]
    gap_med = median(gaps) if gaps else 0.0
    if gaps:
        print("프레임 %d · 간격(영상 전체 — 기록) 최소 %.0f · 중앙 %.0f · 최대 %.0f ms" % (
            len(frames), 1000 * min(gaps), 1000 * gap_med, 1000 * max(gaps)))
    runs = []
    for i, t in enumerate(tones):
        if t == "N":
            continue
        if runs and runs[-1][0] == t:
            runs[-1][2] = i
        else:
            runs.append([t, i, i])
    observed = [r[0] for r in runs]
    print("관찰한 명암 순서: %s · 기대 %s (프레임 %s)" % (",".join(observed) or "(없음)", ",".join(expect),
          " ".join("%s@%.3f" % (r[0], frames[r[1]][0]) for r in runs)))
    ok, undecided, env_undecided = True, False, False
    if observed != expect:
        ok = False
        print("FAIL 순서가 기대와 다르다" + (" — 시계가 어느 명암으로도 읽히지 않는 프레임뿐이다(N)" if not observed else ""))
    if not allow_n:
        # 같은 명암 사이에 낀 N: 앞뒤 비-N 프레임의 명암이 같고 그 사이에 N 이 있다
        last = None
        for i, t in enumerate(tones):
            if t == "N":
                continue
            if last is not None and tones[last] == t and i - last > 1:
                print("FAIL 깜빡임 의심: %s 프레임 %d(t=%.3f)와 %d(t=%.3f) 사이에 시계가 보이지 않는 프레임 %d개" % (
                    t, last, frames[last][0], i, frames[i][0], i - last - 1))
                ok = False
            last = i
    events = surface_events(frames)
    print("표면 변화(빈 구역 휘도가 0.15 이상 뛴 첫 프레임): " + (" ".join("%d@%.3f" % (i, frames[i][0]) for i in events) or "없음"))
    # 환경 조건 — 렌더러는 영상 전체, 프레임 간격은 전환마다 그 표면 변화 직후의 것
    env_why = []
    if "swiftshader" in gles.lower():
        env_why.append("렌더러 SwiftShader(CPU 렌더링)")
    near_med = {}
    for e in events:
        g = near_gaps(frames, e, near_win)
        near_med[e] = median(g) if g else None
        print("전환 직후 프레임 간격(표면 변화 @%.3f 뒤 %.1f초) 중앙 %s — 환경 조건에 쓰는 값" % (
            frames[e][0], near_win, "%.0f ms (%d개)" % (1000 * near_med[e], len(g)) if g else "없음(프레임이 없어 조건을 걸지 않는다)"))
    env_reasons = []
    for j in range(1, len(runs)):
        k = runs[j][1]
        if not events:
            print("기록 명암 변화 %s→%s @%.3f — 짝지을 표면 변화가 없다" % (runs[j - 1][0], runs[j][0], frames[k][0]))
            continue
        s = min(events, key=lambda e: abs(frames[e][0] - frames[k][0]))
        ss = span(frames, s, emit_lag)
        a, b = start_end(frames, runs, j)
        pt, lo, hi, wide = bound(frames, k, s, ss)
        sp, slo, shi, _ = bound(frames, a, s, ss)
        ep, elo, ehi, _ = bound(frames, b, s, ss)
        who = "명암 변화 %s→%s @%.3f · 표면 변화 @%.3f" % (runs[j - 1][0], runs[j][0], frames[k][0], frames[s][0])
        why = list(env_why)
        if near_med[s] is not None and near_med[s] > env_gap:      # 직후에 프레임이 없으면 잴 간격이 없다 — 지연 구간이 한계에 걸려 판정 불가(종료 3)가 된다
            why.append("전환 직후 프레임 간격 중앙 %.0f ms > %.0f ms" % (1000 * near_med[s], 1000 * env_gap))
        still_gap = frames[s][0] - frames[s - 1][0]
        unusable = (k == s or a == s) and still_gap > emit_lag + 1e-6      # 간격이 emit-lag 와 같으면(부동소수 오차 포함) 정지 구간이 아니다
        read = "판독 지연 %+.0f ms(실제는 %+.0f ~ %+.0f ms 사이 · 보수 상한 %+.0f)" % (1000 * pt, 1000 * lo, 1000 * hi, 1000 * wide)
        split = b > a          # a 가 10% ~ 90% 의 중간색 프레임이다
        if unusable:
            read = "지연 값 없음"
            detail = ("표면 변화와 아이콘 변화가 같은 프레임이고 그 직전 프레임이 %.0f ms 전이다(정지 구간 뒤) — "
                      "같은 프레임 안의 차는 영상으로 가려낼 수 없다. 기록값으로 쓰지 않는다" % (1000 * still_gap))
        elif split:
            detail = "시작 %+.0f ms(%+.0f ~ %+.0f) · 끝 %+.0f ms(%+.0f ~ %+.0f) · 중간색 프레임 %d개" % (
                1000 * sp, 1000 * slo, 1000 * shi, 1000 * ep, 1000 * elo, 1000 * ehi, b - a)
        else:
            detail = "시작 · 끝 한 프레임 %+.0f ms(%+.0f ~ %+.0f) — 중간색 프레임이 없어 시작은 따로 판정하지 못하고 기록한다" % (
                1000 * ep, 1000 * elo, 1000 * ehi)
        if why:
            print("판정 불가(환경) %s · %s · %s — %s이라 지연은 판정하지 않는다(값은 기록)" % (who, read, detail, " · ".join(why)))
            env_undecided = True
            env_reasons += [w for w in why if w not in env_reasons]
            continue
        if unusable:
            print("판정 불가 %s · %s · %s" % (who, read, detail))
            undecided = True
            continue
        vs = [("끝", verdict(elo, ehi, max_lag, max_lag), max_lag)]
        if split:
            vs.insert(0, ("시작", verdict_start(sp, slo, shi, max_start, max_lag), max_start))
        worst = "FAIL" if any(v[1] == "FAIL" for v in vs) else ("판정 불가" if any(v[1] == "판정 불가" for v in vs) else "PASS")
        marks = " · ".join("%s %s(한계 %.0f ms)" % (n, v, 1000 * lim) for n, v, lim in vs)
        print("%s %s · %s · %s — %s" % (worst, who, read, detail, marks))
        if worst == "FAIL":
            ok = False
        elif worst == "판정 불가":
            undecided = True
    if not ok:
        print("FAIL")
        return 1
    if env_undecided:
        print("판정 불가(환경) — 순서 · 깜빡임은 통과, 지연은 판정하지 않았다: %s" % " · ".join(env_reasons))
        return 4
    if undecided:
        print("판정 불가")
        return 3
    print("PASS")
    return 0


def selftest():
    def table(rows):
        return [(t, bg, mx, mn) for t, bg, mx, mn in rows]
    light_map = (0.98, 0.98, 0.0)      # 맵 위 어두운 아이콘
    cover_l = (0.01, 1.0, 0.01)        # 어두운 면 위 밝은 아이콘
    cover_n = (0.01, 0.01, 0.0)        # 어두운 면 위 어두운 아이콘 = 구현 전
    off = float("inf")                 # 환경 조건을 끈다 — 아래 앞 열 개는 구간 정의만 본다(프레임 간격이 성긴 합성 표)
    cases = [
        ("맵 → 표지, 한 프레임 뒤 뒤집힘 → PASS(D,L)",
         table([(0.0,) + light_map, (0.1,) + light_map, (0.2,) + cover_n, (0.25,) + cover_l, (0.4,) + cover_l]), ["D", "L"], 0),
        ("구현 전: 표지에서 아이콘이 끝까지 어둡다 → FAIL",
         table([(0.0,) + light_map, (0.1,) + light_map, (0.2,) + cover_n, (0.5,) + cover_n, (1.0,) + cover_n]), ["D", "L"], 1),
        ("같은 명암끼리: 표면은 바뀌고 명암은 L 그대로 → PASS(L)",
         table([(0.0,) + cover_l, (0.1, 0.20, 1.0, 0.2), (0.2,) + cover_l]), ["L"], 0),
        ("어두움 → 어두움 교체 중 한 프레임 기본값 → FAIL(깜빡임)",
         table([(0.0,) + cover_l, (0.1,) + cover_n, (0.15,) + cover_l]), ["L"], 1),
        ("지연 0.6초 → FAIL",
         table([(0.0,) + light_map, (0.1,) + light_map, (0.15,) + cover_n, (0.3,) + cover_n, (0.45,) + cover_n, (0.6,) + cover_n, (0.75,) + cover_l, (0.8,) + cover_l]), ["D", "L"], 1),
        ("프레임 간격 0.5초 · 지연이 한계에 걸침 → 판정 불가",
         table([(0.0,) + light_map, (0.5,) + cover_n, (1.0,) + cover_l]), ["D", "L"], 3),
        ("모달 열기 · 닫기 D,L,D → PASS",
         table([(0.0,) + light_map, (0.1,) + light_map, (0.15,) + cover_l, (0.5,) + cover_l, (0.55,) + light_map, (0.6,) + light_map]), ["D", "L", "D"], 0),
        ("직전이 1초 정지 화면 · 70 ms 뒤 뒤집힘 → PASS(첫 실행 결함 4)",
         table([(0.0,) + light_map, (1.0,) + cover_n, (1.02,) + cover_n, (1.07,) + cover_l, (1.1,) + cover_l]), ["D", "L"], 0),
        ("직전이 정지 화면 · 0.6초 뒤 뒤집힘 → FAIL(정지 화면이 지연을 숨기지 않는다)",
         table([(0.0,) + light_map, (1.0,) + cover_n, (1.2,) + cover_n, (1.4,) + cover_n, (1.6,) + cover_l, (1.62,) + cover_l]), ["D", "L"], 1),
        ("표면이 바뀐 뒤 프레임 없이 2초 · 명암이 그 뒤에 뒤집힘 → 판정 불가(누락인지 알 수 없다)",
         table([(0.0,) + light_map, (1.0,) + cover_n, (3.0,) + cover_l]), ["D", "L"], 3),
    ]
    bad = 0
    for name, frames, expect, want in cases:
        print("--", name)
        got = judge(frames, expect, env_gap=off)
        if got != want:
            bad += 1
            print("selftest 불일치: 기대 종료 %d, 실제 %d" % (want, got))
    # 보수 정의(--emit-lag inf)는 같은 정지 화면 입력을 판정 불가로 낸다
    print("-- 보수 정의 · 정지 화면 → 판정 불가")
    still = table([(0.0,) + light_map, (1.0,) + cover_n, (1.02,) + cover_n, (1.07,) + cover_l, (1.1,) + cover_l])
    if judge(still, ["D", "L"], emit_lag=float("inf"), env_gap=off) != 3:
        bad += 1
        print("selftest 불일치: 보수 정의는 3 이어야 한다")

    # 호스트 GPU 처럼 17 ms 간격 · 120 ms 애니메이션(중간색 프레임 있음): 표면 변화는 t=1.0
    def fast(start_at, steps, tail=8):
        rows = [(0.0,) + light_map, (0.9,) + light_map, (1.0,) + cover_n]
        t = 1.0
        for v in steps:
            t += 0.017
            rows.append((t, 0.01, v, 0.0) if t >= start_at else (t,) + cover_n)
        for _ in range(tail):
            t += 0.017
            rows.append((t,) + cover_l)
        return table(rows)
    ramp = [0.01, 0.25, 0.47, 0.69, 0.82, 0.92, 0.97, 1.0]          # API 30 의 실제 모양(중간색 4 프레임)
    print("-- 호스트 GPU 모양: 시작 +50 · 끝 +120 ms → PASS")
    if judge(fast(0, ramp), ["D", "L"]) != 0:
        bad += 1
        print("selftest 불일치: PASS 이어야 한다")
    slow_end = [0.01] * 3 + [0.25, 0.47, 0.69] + [0.82] * 17 + [1.0]    # 시작은 빠르고 끝이 0.3초를 넘는다
    print("-- 간격 17 ms 인데 끝이 +350 ms 이후 → FAIL(환경이 아닌 앱 · 시스템의 지연)")
    if judge(fast(0, slow_end), ["D", "L"]) != 1:
        bad += 1
        print("selftest 불일치: FAIL 이어야 한다")
    late_start = [0.01] * 9 + [0.25, 0.47, 0.69, 0.82, 0.92, 0.97, 1.0]   # 시작이 +150 ms 이후 · 끝은 한계 안
    print("-- 간격 17 ms · 시작 +150 ms · 끝 +250 ms → FAIL(시작 100 ms 초과)")
    if judge(fast(0, late_start), ["D", "L"]) != 1:
        bad += 1
        print("selftest 불일치: FAIL 이어야 한다")
    jump = [0.01, 0.01, 1.0]
    print("-- 간격 17 ms · 중간색 프레임 없음 · 끝 +50 ms → PASS(끝만 판정 · 시작은 기록)")
    if judge(fast(0, jump), ["D", "L"]) != 0:
        bad += 1
        print("selftest 불일치: PASS 이어야 한다")
    # 느린 렌더러(프레임 100 ms): 지연은 판정하지 않는다 — 순서는 판정한다
    def slow_frames(order_ok=True):
        rows = [(0.0,) + light_map, (0.9,) + light_map, (1.0,) + cover_n, (1.1,) + cover_n, (1.2, 0.01, 0.4, 0.0),
                (1.3, 0.01, 0.8, 0.0), (1.4, 0.01, 1.0, 0.0), (1.5,) + cover_l, (1.6,) + cover_l]
        if not order_ok:
            rows += [(1.7,) + light_map, (1.8,) + light_map]
        return table(rows)
    print("-- 프레임 간격 100 ms(SwiftShader 모양) · 순서 맞음 → 판정 불가(환경) 종료 4")
    if judge(slow_frames(), ["D", "L"]) != 4:
        bad += 1
        print("selftest 불일치: 종료 4 이어야 한다")
    print("-- 프레임 간격 100 ms · 순서가 틀림(L 뒤 D 한 번 더) → FAIL 종료 1(환경과 무관)")
    if judge(slow_frames(False), ["D", "L"]) != 1:
        bad += 1
        print("selftest 불일치: 종료 1 이어야 한다")
    print("-- 프레임 간격 17 ms 인데 렌더러가 SwiftShader → 판정 불가(환경) 종료 4")
    if judge(fast(0, ramp), ["D", "L"], gles="GLES: Google (ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0)))") != 4:
        bad += 1
        print("selftest 불일치: 종료 4 이어야 한다")
    print("-- 프레임 간격 17 ms · 호스트 GPU 렌더러 줄 → PASS")
    if judge(fast(0, ramp), ["D", "L"], gles="GLES: Android Emulator OpenGL ES Translator (Apple M5 Pro)") != 0:
        bad += 1
        print("selftest 불일치: PASS 이어야 한다")
    print("-- 프레임 간격 100 ms · 명암 변화 0회(같은 명암끼리) → 지연 판정이 없어 PASS(환경과 무관)")
    same = table([(0.0,) + cover_l, (0.1, 0.20, 1.0, 0.2), (0.2,) + cover_l, (0.3,) + cover_l])
    if judge(same, ["L"]) != 0:
        bad += 1
        print("selftest 불일치: PASS 이어야 한다")

    # 「전환 직후」의 프레임 간격 — 영상 전체의 중앙이 아니라 표면 변화 뒤 0.5초 안의 중앙으로 건다
    def around(before, after, steps, tail, n_before=40, n_tail=40):
        """간격 before 의 밝은 맵 프레임 n_before 개 → 표면 변화 → 간격 after 의 steps(시계의 cmax) → 간격 tail 의 표지 프레임 n_tail 개."""
        rows, t = [], 0.0
        for _ in range(n_before):
            rows.append((t,) + light_map)
            t += before
        rows.append((t,) + cover_n)
        for v in steps:
            t += after
            rows.append((t, 0.01, v, 0.0))
        for _ in range(n_tail):
            t += tail
            rows.append((t,) + cover_l)
        return table(rows)
    ramp8 = [0.01, 0.25, 0.47, 0.69, 0.82, 0.92, 0.97, 1.0]
    print("-- 영상 전체 간격 중앙 17 ms · 전환 직후 40 ms(렌더러는 SwiftShader 아님) → 판정 불가(환경) 종료 4(영상 전체 중앙으로 걸던 옛 정의는 PASS 로 냈다)")
    if judge(around(0.017, 0.040, ramp8, 0.040, n_before=150, n_tail=12), ["D", "L"]) != 4:
        bad += 1
        print("selftest 불일치: 종료 4 이어야 한다")
    print("-- 영상 전체 간격 중앙 500 ms · 전환 직후 17 ms → 지연을 판정한다(PASS 종료 0)")
    if judge(around(0.5, 0.017, ramp8, 0.5), ["D", "L"]) != 0:
        bad += 1
        print("selftest 불일치: PASS 이어야 한다")
    print("-- 전환이 둘(D,L,D) · 첫 전환은 직후 17 ms · 둘째는 직후 40 ms → 첫 전환은 판정하고 둘째만 판정 불가(환경) 종료 4(전환마다 잰다)")
    two = list(around(0.017, 0.017, ramp8, 0.017))
    t = two[-1][0] + 0.017
    two.append((t,) + cover_l)
    t += 0.017
    two.append((t, 0.98, 1.0, 0.9))                                    # 표면 변화(아직 시계가 어느 명암도 아니다)
    for lo in [0.7, 0.4, 0.15, 0.0, 0.0]:
        t += 0.040
        two.append((t, 0.98, 0.98, lo))
    for _ in range(8):                                                 # 둘째 전환 직후 0.5초가 40 ms 간격으로 채워진다
        t += 0.040
        two.append((t,) + light_map)
    for _ in range(40):
        t += 0.017
        two.append((t,) + light_map)
    import contextlib
    import io
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        got = judge(two, ["D", "L", "D"])
    sys.stdout.write(buf.getvalue())
    if got != 4 or "PASS 명암 변화 D→L" not in buf.getvalue() or buf.getvalue().count("판정 불가(환경) 명암 변화") != 1:
        bad += 1
        print("selftest 불일치: 첫 전환 PASS · 둘째 판정 불가(환경) · 종료 4 이어야 한다(종료 %d)" % got)
    print("-- 영상이 정지 구간으로 시작하고 표면 · 아이콘 변화가 같은 프레임 → 지연 값 없음 · 판정 불가 종료 3(+0 · 음수 구간을 기록값으로 내지 않는다)")
    first_still = table([(0.0,) + light_map, (0.8,) + cover_l] + [(0.8 + 0.017 * i,) + cover_l for i in range(1, 40)])
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        got = judge(first_still, ["D", "L"])
    sys.stdout.write(buf.getvalue())
    if got != 3 or "지연 값 없음" not in buf.getvalue() or "+0 ms" in buf.getvalue():
        bad += 1
        print("selftest 불일치: 종료 3 · 「지연 값 없음」이어야 한다(종료 %d)" % got)
    print("-- 같은 모양인데 전환 직후가 느리다 → 판정 불가(환경) 종료 4")
    first_slow = table([(0.0,) + light_map, (0.8,) + cover_l] + [(0.8 + 0.1 * i,) + cover_l for i in range(1, 10)])
    if judge(first_slow, ["D", "L"]) != 4:
        bad += 1
        print("selftest 불일치: 종료 4 이어야 한다")
    print("selftest", "OK" if not bad else "FAILED %d" % bad)
    return 1 if bad else 0


def main(a):
    if len(a) >= 2 and a[1] == "selftest":
        return selftest()
    if len(a) >= 4 and a[2] == "--expect":
        max_lag, max_start, allow_n, emit_lag, env_gap, gles, i = 0.3, 0.1, False, 0.05, ENV_GAP, "", 4
        while i < len(a):
            if a[i] == "--max-lag" and i + 1 < len(a):
                max_lag = float(a[i + 1])
                i += 2
            elif a[i] == "--max-start" and i + 1 < len(a):
                max_start = float(a[i + 1])
                i += 2
            elif a[i] == "--emit-lag" and i + 1 < len(a):
                emit_lag = float(a[i + 1])
                i += 2
            elif a[i] == "--env-gap" and i + 1 < len(a):      # ms. inf 면 환경 조건 끔
                env_gap = float(a[i + 1]) / 1000.0
                i += 2
            elif a[i] == "--gles" and i + 1 < len(a):
                gles = a[i + 1]
                i += 2
            elif a[i] == "--allow-n":
                allow_n = True
                i += 1
            else:
                print(__doc__)
                return 2
        frames = parse(a[1])
        if len(frames) < 2:
            print("프레임 표가 비었다 — sbframes 출력이 맞는지 확인한다")
            return 3
        return judge(frames, a[3].split(","), max_lag, allow_n, emit_lag, max_start, env_gap, gles)
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### `nodefind.py` — uiautomator 이름으로 노드 찾기

```python file=nodefind.py
#!/usr/bin/env python3
"""uiautomator dump(XML, 표준 입력)에서 content-desc 또는 text 가 정규식과 맞는 첫 노드의 가운데 좌표를 낸다.

  adb -s ID exec-out cat /sdcard/ui.xml | nodefind.py 'REGEX'          →  "x y" (종료 0) · 없으면 아무것도 안 내고 종료 1
  ... | nodefind.py 'REGEX' --all                                        →  맞는 노드를 전부 "x y  content-desc/text" 로 (이름을 확인할 때)
  ... | nodefind.py --list                                               →  이름이 있는 노드 전부

정규식은 대소문자를 구분하고 부분 일치(re.search)다. 제 위치를 `^…$` 로 묶어 쓴다.
"""
import re
import sys
import xml.etree.ElementTree as ET


def main(a):
    if len(a) < 2:
        print(__doc__)
        return 2
    listing = a[1] == "--list"
    pat = None if listing else re.compile(a[1])
    show_all = "--all" in a[2:]
    found = False
    for n in ET.fromstring(sys.stdin.read()).iter("node"):
        name = n.get("content-desc") or n.get("text") or ""
        if not name:
            continue
        nums = re.findall(r"[0-9]+", n.get("bounds") or "")
        if len(nums) != 4:
            continue
        x0, y0, x1, y1 = (int(v) for v in nums)
        if listing or pat.search(n.get("content-desc") or "") or pat.search(n.get("text") or ""):
            line = "%d %d" % ((x0 + x1) // 2, (y0 + y1) // 2)
            found = True
            if listing or show_all:
                print("%s  [%d,%d][%d,%d]  %s" % (line, x0, y0, x1, y1, name.replace("\n", " ")))
            else:
                print(line)
                return 0
    return 0 if found else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

