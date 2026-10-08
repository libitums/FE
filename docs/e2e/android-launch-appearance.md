# Android 실행 시 색과 적응형 아이콘

Android 앱을 켤 때 사용자가 보는 **시스템이 그리는 구간**(시작 창 · 시스템 스플래시 · Lynx가 첫 프레임을 그리기 전의 창)이 JS 스플래시와 같은 주황(`#F46B18`)으로 이어지는지,
그 구간의 시스템 바가 `onCreate` 뒤와 같은 모양인지, 런처 아이콘이 마스크에 맞게 보이는지를 에뮬레이터의 실제 프레임 · 스크린샷의 픽셀로 확인한다.
리소스 · 테마 · 매니페스트 값의 판정(`host-launch-appearance.mjs`의 `launchAppearanceIssues`)과 패키지된 리소스 · 기기에서 풀린 테마 값(`integration`의 HL · HB · IC)은 이미 다른 계층이 진다.
이 문서는 **시스템이 실제로 그린 것**(콜드 스타트 프레임 · 런처의 마스크 · 창 배경이 드러나는 순간)만 진다.
항목 정본은 작업 `android-launch-appearance`의 계약(`spec.md`, r02 포함)과 test-plan `e2e`(L1 ~ L7, **판정 구간 · L7의 정의는 `## r02`가 단일 출처**)다. 계약이 **추론으로 남겨 둔 셋**(투명 스플래시 아이콘 · 시작 창의 바 설정 · 창 배경이 드러나는 순간)은
구현 뒤 이 절차의 관찰로만 닫힌다 — 아래 「계약의 추론 셋」이 어느 항목이 닫는지 적는다.

이 문서는 **절차**다. 2026-10-06에 두 번 돌렸다. 결정과 받아들인 대가는 [ADR-0049](../adr/0049-android-launch-appearance.md)가 진다.

- **실행 ①**(HEAD `486ecc95`, 구현 `dfbe03cb`): 판정 **실패**. 이 실행이 문서와 도구의 결함을 되돌려 판정 정의를 다시 고쳤다 — 고친 판을 **r02**라 부른다
  (고친 것: F0 · F1 · J0의 정의, L7을 L7-a ~ L7-e로 가름, 도구의 상수 비교 결함, 문서의 절차 결함 여섯. 맨 아래 「r02에서 고친 결함」).
- **실행 ②**(HEAD `e22758d2` — 제품 코드는 `dfbe03cb` 뒤로 변경 0줄): 판정 **통과**. 실행 ①의 저장된 영상을 r02 도구로 **다시 판정**하고, 영상 · 캡처를 **새로 찍고**, 실행 ①에서 미실행이던 항목(L4 홈 · L9 알림 · R2 · R3)을 돌렸다.
  같은 영상을 고친 정의로 다시 읽은 것은 같은 데이터의 재해석이다 — 그래서 아래 표는 「다시 판정」과 「새로 찍음」을 따로 적는다. 이 실행도 문서 · 도구 결함을 되돌렸고(E1 ~ E7) 이 판이 반영했다.

- **실행 ③**(HEAD `ede6f7fc` — 이 문서의 앞 판이 들어간 커밋, **release AAB** 분할 설치): 리뷰 직전의 최종 검증이 이 문서의 문면 그대로 **L1 · L2 · L4만** 다시 돌렸다. 통과.
  **documentation 단계 뒤 문면 그대로 다시 돈 것은 이 셋뿐이다** — L3 · L5 ~ L10과 API 30 항목은 앞 판의 문면으로 돈 실행 ① · ②의 결과다.
- **번쩍임 관찰**(HEAD `ede6f7fc`, debug + 픽스처): 리뷰가 짚은 경로(알림 탭 · Custom Tab 복귀 · 권한 대화상자 · 최근 앱 · 홈 아이콘 복귀)에서 밝은 화면 위로 주황이 번쩍이는지를 영상으로 봤다 — L11.
- 같은 날 **접근성 점검**이 저장된 무손실 캡처를 다시 재어 L7-a의 뜻을 고쳤다: L7-a는 **판정이 아니라 받아들인 값의 기록**이다(L7).

구현 전 캡처에서 나온 값은 아래 각 항목의 「구현 전 관찰」 열에 적었고, 구현 뒤에는 그 값이 나오지 않아야 한다.

## 실행 상태

⟨2026-10-08⟩ **아래 결과는 전부 축소 전 바이너리의 것이다.** `bundled`와 `release`가 R8로 축소 · 난독화되도록 바뀌었다([ADR-0052](../adr/0052-android-release-shrinking.md)) — `bundled`를 까는 항목(L1 ~ L3 · L5 · L6 (b) (c) (e) · L7 · L10)은 **절차가 그대로 돌고, 보는 대상이 축소된 코드로 바뀐다.** 축소 뒤 빌드로 이 문서의 항목을 다시 돌린 적은 없다. debug + 픽스처 항목(L6 (a) (d))은 영향이 없다.

| 항목 | 무엇 | 기기 | 빌드 | 어느 실행 (전부 2026-10-06) | 결과 |
|---|---|---|---|---|---|
| L1 | 콜드 스타트 영상: 시작 구간 내내 주황 | Pixel_8 (API 37) | bundled | ①의 영상 4개를 ②에서 다시 판정 + ②에서 새 영상 2개 + ③에서 1개(release AAB) | **통과** — 일곱 실행 모두 구간 안 어긋난 프레임 0, F1′ − F1 0.000초. (①의 r01 판정은 4회 중 2회 형식 FAIL이었다 — F0 정의 결함) |
| L2 | 시스템 스플래시: 여섯 점이 정확히 주황 · 가운데에 아이콘과 흰 원 없음 | Pixel_8 | bundled | ① 1장 · ② 새 캡처 4장 · ③ 1장(release AAB) | **통과** — ①의 1.6초 한 장, ②의 1.0초 둘 · 0.6초 하나, ③의 1.6초 한 장. ②의 1.6초 한 장은 `center` FAIL(비주황 6270 · 흰 점 0)이었다 — 시스템 스플래시가 이미 걷히고 워드마크 첫 획이 그려지는 중(캡처 시점. 여섯 점은 정확히 주황). 절차대로 지연을 줄여 다시 찍었다 |
| L3 | 콜드 스타트 영상 + 무손실 한 장: 시작 창이 주황 | R6_API30 (API 30) | bundled | ①의 영상 2개를 ②에서 다시 판정 + ②에서 새 영상 2개 · 무손실 1장(①에도 1장) | **통과** — 영상 넷 모두 어긋남 0, F1′ − F1 ≤ 0.087초. 무손실 둘 모두 네 점이 정확히 `#F46B18`(nav `#FEF0E8`은 값만) |
| L4 (앱 서랍) | 런처 아이콘: 마스크 가장자리 안쪽에 흰 띠 없음 · 잘림 없음 · 옆 아이콘과 같은 크기 | Pixel_8 · R6_API30 | 어느 빌드든 | ① | 통과 (두 API. API 37 지름 159 = Chrome 159, API 30 지름 136 = Settings 136) |
| L4 (홈 화면 · API 37) | 같은 판정을 홈 화면에서, 끌기 중의 이음매(관찰) | Pixel_8 | 어느 빌드든 | ② · ③ | **통과 — 홈 작업 영역에서.** Duru 지름 159 = 하단 줄의 Chrome 159, 안쪽 10px 양쪽 주황 아닌 점 0, 잘림 없음. 끌기 중 이음매 안 보임(관찰). ③은 release AAB에서 서랍 자리를 다시 재고(159 = 159) `dragicon`으로 홈 작업 영역에 놓았다. **하단 줄(핫시트) 자리는 판정하지 못했다** — 네 칸이 차 있었다 |
| L5 | 다크 모드에서도 L2와 같은 색 | Pixel_8 | bundled | ① 1장 · ② 새 캡처 1장 | 통과 |
| L6 | 실행 뒤 창 배경(주황)이 드러나지 않는다: (a) 키보드 (b) 분할 화면 (c) 최근 앱 복귀 (d) 화면 전환 (e) 구성 변경 | Pixel_8 | (a) (d) debug + 픽스처 · (b) (c) (e) bundled | ① (②에서 다시 돌리지 않았다) | 통과 (a ~ e 전부. (b)는 세로 모양에서 판정, 가로 모양은 관찰). 단일 캡처의 한계가 있다 |
| L7-a | API 37 시스템 스플래시 구간의 상태바 대비(무손실) — **받아들인 값의 기록, 판정 아님** | Pixel_8 | bundled · release AAB | ①의 2장 · ②의 5장 · ③의 1장 + 접근성 점검의 재측정 | **기록(통과 · 실패로 세지 않는다 — 이 기준은 주황 위에서 실패할 수 없다).** 색 쌍 `#FFFFFF` / `#F46B18` = **3.016:1**(구현 전 20.12:1). **시계 글자: 4.5 이상인 픽셀 0%**(구현 전 68.9%). 전체: 3.0 이상인 픽셀 63.4%(캡처에 따라 58.4 ~ 71.1%, 구현 전 77.5%) · 픽셀 평균 2.60(구현 전 13.83). **알고 받아들인 후퇴다**(사용자 결정 U7 — L7) |
| L7-b | API 37 첫 화면에서 어두운 아이콘 | Pixel_8 | bundled | ①의 영상 4 다시 판정 + ② 새 영상 2 | 통과 — 여섯 실행 모두 F1 · 그 다음 프레임 `#000000` |
| L7-c | API 37 시작 구간의 뒤집힘 ≤ 1회 · 밝음 → 어두움 | Pixel_8 | bundled | 위와 같은 영상 6 | 통과 — 여섯 실행 모두 정확히 1회. J0와 같은 프레임 3 · J0 뒤 3(적기만 한다) |
| L7-d | API 30 어두운 아이콘 · 대비 ≥ 3.0:1 | R6_API30 | bundled | ①의 영상 2 · 무손실 1 다시 판정 + ② 새 영상 2 · 무손실 1 | 통과 — 영상 4.08:1(`#632C05` / `#FE7412`), 무손실 3.72:1(`#622B0A`) |
| L7-e | API 30 회색 띠 · 검정 내비게이션 바 0장(F0 앞 구간 포함) | R6_API30 | bundled | ①의 영상 2 다시 판정 + ② 새 영상 2 | 통과 — 넷 모두 status 회색 0 · nav 순검정 0. 구현 전 `cold30-bundle404`는 같은 판정에서 FAIL(회색 12장 · 검정 11장) |
| L11 | 앱이 떠 있는 동안 밝은 화면 위로 주황이 번쩍이는 경로(관찰) | Pixel_8 | debug + 픽스처 | 번쩍임 관찰(HEAD `ede6f7fc`) | **관찰되지 않았다** — 알림 탭(앱이 앞 · 홈에서) · Custom Tab 복귀 · 알림 권한 대화상자 · 최근 앱 복귀 · 홈 아이콘 복귀 각 2회, 영상 12개 모두 주황 프레임 0장(같은 도구가 콜드 스타트 영상에서는 21장을 잡았다). **한계가 크다** — 에뮬레이터 한 대, **약 0.1 ~ 0.2초 미만의 노출은 배제하지 못한다**(15 ms대 간격으로 찍힌 것은 12영상 가운데 하나뿐이다), 스냅샷 없는 웜 스타트 · 콜드 알림 탭은 미실행(L11) |
| L8 | 번들을 읽지 못하면 끝없는 주황 | Pixel_8 · R6_API30 | debug | ① (②에서 다시 돌리지 않았다) | 통과 (6초 · 11초, 두 API) |
| L9 | 최근 앱 · 앱 정보 · 알림의 아이콘, 런처의 움직임 효과(관찰) | Pixel_8 · R6_API30 | debug (알림은 픽스처) | 최근 앱 · 앱 정보 ① · 알림 ②(API 37) | 관찰 기록. 최근 앱 · 앱 정보: 가득 찬 주황 원, 흰 바탕 없음. 알림: 작은 아이콘은 `drawable/ic_notification` 그대로(`dumpsys`), 셰이드의 알림 머리에는 **주황 앱 아이콘**이 보였다(단색 윤곽이 아니다 — L9) |
| L10 R1 · R4 | 구성 변경 뒤 재생성 없음 · 시스템 뒤로가기 | Pixel_8 | bundled | ① | 통과 |
| L10 R2 | edge-to-edge · safe area | Pixel_8 | bundled | ② | **통과** — `appframe` ` frame=[0,0][1080,2400]`, status · top `#FFFDFC` 정확. (①에서는 `lynxbounds`가 빈 값이라 판정 불가였다) |
| L10 R3 | 3버튼 탭 바 위치 | Pixel_8 | debug + 픽스처 | ② | **통과** — 390x844 · 160 dpi · 3버튼에서 알약 아래 784(기준 784 ± 2), 세 탭 전환 |
| 기록 | 범위 밖 관찰(U6): 워드마크 진행도 · 워드마크가 안 보이는 실행 | Pixel_8 · R6_API30 | bundled | ① · ② | 수치 기록(판정 아님). API 37 J0 진행도 ①의 네 실행 37 ~ 73% · ②의 두 실행 48%. **워드마크가 안 보이는 실행은 간헐적이다**(API 30 9실행 중 6 · API 37 11실행 중 1 — 「범위 밖 관찰 기록란」) |

**실행하면 이 표와 맨 아래 「실행 결과」를 같은 날 함께 고친다.** 「미실행」 · 「재판정 대기」 · 「판정 불가」는 통과가 아니다. 건너뛴 항목(분할 화면 진입 불가 · 키보드가 안 뜸 등)도 통과로 적지 않고 사유를 적는다.

## 이 절차로 확인되지 않는 것

- **실기기 · 제조사 런처**: 두 AVD의 기본 런처만 본다. 제조사 런처의 마스크 모양(원 · 스퀴어클 · 둥근 사각 · 물방울), 아이콘 확대 · 시차 효과, 아이콘 팩 적용은 보지 못한다.
- **테마 아이콘(단색) 모드**: 이 변경은 `<monochrome>`을 넣지 않았다(계약 §6.3). 런처가 테마 아이콘을 켜도 이 앱의 아이콘이 어떻게 보이는지는 확인하지 않는다.
- **API 26 ~ 29 · 31 ~ 36**: API 37 · API 30 두 기기만 쓴다. 시스템 스플래시가 처음 생긴 API 31, 사이 버전에서 `windowSplashScreen*` 속성이 듣는 방식 · API 26 · 27의 시작 창 바 설정은 확인하지 못한다.
  API 31 이상의 모든 기기가 API 37과 같다는 보장은 없다. 특히 **API 31+ 시스템 스플래시의 상태바 아이콘 명암을 플랫폼이 스플래시 배경색으로 정한다는 규칙**(계약 r02.2)은 API 37 에뮬레이터 하나에서만 잰 것이고, 어느 밝기에서 갈리는지(문턱)는 모른다.
- **실기에서의 스플래시 길이**: 에뮬레이터(16 KB 페이지 이미지)는 시작이 느려 시스템 스플래시가 3초대로 보인다(계약 §2.1). 이 절차가 적는 시간은 실기의 값이 아니다. 색과 순서만 기기와 무관하다고 본다.
- **API 37의 시스템 스플래시 구간과 그 직전의 창 배경 구간의 분리**: 둘 다 평평한 주황 면이라 픽셀로는 가르지 못한다. 이 절차는 하나의 「주황 면 구간」으로 판정한다.
- **3버튼 내비게이션의 API 37 콜드 스타트**: 시작 값(제스처)에서만 잰다. 3버튼에서는 시스템이 까는 가림막이 nav 점 색을 바꿀 수 있고(API 30의 JS 스플래시 위 `#FEF0E8`), 이 절차는 그 조합을 재지 않았다.
- **홈 하단 줄(핫시트) 자리의 아이콘**: 에뮬레이터의 하단 줄 네 칸이 차 있어 실행 ②는 홈 작업 영역에서 쟀다. 구현 전의 「원 157px 안에 그림 72px」는 하단 줄에서 잰 값이고, 구현 뒤 같은 자리의 값은 없다(L4의 「자리」).
- **문면 그대로의 재실행**: 이 판(실행 ② 뒤에 고친 문면)의 명령으로 기기에서 다시 돈 것은 L1 · L2 · L4뿐이다(실행 ③). 나머지 항목의 고친 문면(L9 알림의 `dumpsys` 줄 등)은 저장된 출력으로만 맞춰 봤다.
- **주황 번쩍임의 모든 경로**: L11은 API 37 에뮬레이터 한 대의 영상이다. `screenrecord`는 화면이 바뀔 때만 프레임을 내고 그 간격이 대부분 0.1초 안팎이라 **약 0.1 ~ 0.2초 미만의 노출은 놓쳤을 수 있다**(L11의 한계).
  시스템이 스냅샷 없이 시작 창을 그리는 웜 스타트, 프로세스가 죽은 상태의 알림 탭, API 31 미만(알림 탭에 시스템 스플래시가 없는 기기), 실기는 보지 못했다. 구현 전 빌드와의 대조는 알림 탭 · 최근 앱 · 홈 아이콘 경로만 했다.
- **상태바 대비의 다른 조건**: 대비 분포(L7-a)는 API 37 에뮬레이터의 무손실 캡처에서만 쟀다. 실기의 화면(OLED · 야외 밝기 · 색 보정 · 고대비 텍스트 · 글꼴 크기)과 제조사 상태바의 아이콘 굵기, 흰 아이콘 구간의 실기 길이는 모른다. API 30의 분포는 재지 못했다(그 캡처는 위 160줄에 띠 밖의 내용이 섞인다).
- **알림이 보이는 모양의 전부**: 작은 아이콘은 `ic_notification`이고 이 변경이 건드리지 않는다. L9는 알림에 실린 작은 아이콘이 「변하지 않았다」를 `dumpsys`로 보고, 셰이드에 보이는 모양은 관찰로만 적는다(API 37 셰이드는 알림 머리에 앱 아이콘을 보여 줬다 — 이 변경 전의 모양과는 대조하지 않았다).
- **iOS**: 이 변경은 iOS 파일을 바꾸지 않는다. 증거는 `git diff --stat`의 `apps/ios/` 0줄이다(test-plan 회귀 절).
- **로그인 화면의 전화번호 입력**: 제품에서 숨겨져 있다(`apps/mobile/src/screens/login/login.ts`의 `productPhoneSignIn = "hidden"`). 그래서 L6 (a)의 키보드는 로그인 화면이 아니라 **피드백 화면**의 입력칸으로 연다.
  로그인 뒤에만 닿는 화면이라 픽스처가 필요하고, 그 픽스처는 debug 빌드 위에서 돈다.
- **상태바 아이콘이 어두운 표면 위에서 가려지는 문제**: 이 작업이 다루지 않는 후속이다(계약 §5.3 · U1). L7은 시작 구간만 본다.

## 전제

### 기기 · 빌드

| 기기 | AVD | API | 쓰는 항목 |
|---|---|---|---|
| 주 기기 | `Pixel_8` | 37 (16 KB 페이지 · 1080x2400 · 420 dpi · 시스템 스플래시 있음) | L1 · L2 · L4 ~ L10 |
| 구 버전 기기 | `R6_API30` | 30 (4 KB 페이지 · 1080x2340 · 440 dpi · 시스템 스플래시 없음) | L3 · L4 · L7 · L8 · L9 |

- JDK 17 이상, Android SDK, `ANDROID_HOME`, `python3`, Node 22(`export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`), `pnpm` 의존 설치 완료, macOS의 `swiftc` · `sips`.
  **이 맥에는 ImageMagick · ffmpeg · Pillow가 없다.** 판독은 아래 「도구」의 Swift · Python 표준 라이브러리 코드만 쓴다.
- **전용 에뮬레이터를 쓴다.** 야간 모드 · 화면 크기 · 키보드 설정 같은 전역 설정을 바꾸고, 영상을 찍는 동안 다른 실행이 같은 기기를 쓰면 프레임이 오염된다.
  Maestro · 계측 · 다른 e2e와 **동시에 돌리지 않는다**(한 기기에서).
- **16 KB 호환성 대화상자는 뜨지 않아야 한다.** 뜨면 콜드 스타트 프레임이 덮이므로 그 시도를 버린다([Android 시스템 뒤로가기](android-system-back.md)의 「준비」 — `Don't Show Again`을 누른 뒤 `force-stop` 부터 다시).
- 디스플레이 기본값(`wm size` · `wm density` 재정의 없음), 글꼴 배율 1.0, 애니메이션 배율 1.0, 야간 모드 꺼짐에서 한다(아래 「시작 전 전역 설정」).
- **어느 빌드로 재는가**

| 항목 | 빌드 | 이유 |
|---|---|---|
| L1 · L2 · L3 · L5 · L7 · 기록 · L10 | **`bundled`**(내장 번들 — release와 같은 설정이고 debug 키로 서명된다) | 콜드 스타트의 길이와 구간이 번들을 받아 오는 경로에 달려 있다. debug는 `10.0.2.2:3000`(또는 `--es bundle-url`)의 서버를 읽어, 서버 상태가 구간을 바꾼다 |
| L4 · L9의 아이콘 | 어느 빌드든 | 같은 `res/`다. 마스크는 번들과 무관하다 |
| L6 (a) (d) | debug + 픽스처 | 로그인 뒤 화면이 필요하고 픽스처(`SignedInScreenFixtureTest`)가 debug 계측 APK다 |
| L6 (b) (c) (e) | bundled(권장) 또는 debug | 첫 화면(온보딩)에서 한다. debug로 했다면 사실을 적는다 |
| L8 | **debug만** | bundled는 `bundle-url` extra를 무시한다(`HostPaths.template`: debug가 아니면 내장 `main.lynx.bundle`). 번들을 못 읽게 만들 수단이 debug의 닿지 않는 주소뿐이다 |

  **debug 앱을 extra 없이 `am start`하면 `10.0.2.2:3000`의 번들을 읽는다.** 그 포트가 번들 서버가 아니면 404로 Lynx가 아무것도 그리지 않고 창 배경만 남는다(계약 §2.2의 실행 A). 이 문서의 debug 명령은 늘 `--es bundle-url`을 붙인다.
  **bundled와 debug는 같은 패키지 · 같은 서명(debug 키)이라 `install -r`로 서로 덮어쓴다.** release AAB(다른 키)가 설치돼 있으면 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`이 나므로 `A uninstall libitum.duru.android` 뒤에 깐다.

```sh
# 두 기기 공통 — 한 번만
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
ID="<adb devices 가 보여 준 에뮬레이터 ID>"     # 기기를 바꿀 때 ID만 다시 정한다
A() { adb -s "$ID" "$@"; }    # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; $A shell …`)는 zsh에서 command not found가 난다
PKG=libitum.duru.android
ACT=$PKG/com.libitum.host.MainActivity
# 증거 폴더는 **절대 경로**로 받는다. 상대 경로(`.agent-harness/…`)는 격리 워크트리 · 다른 작업 폴더에서 실행하면 없는 폴더를 가리킨다(r02 결함 D1)
#   예: export OUT=/Users/me/work/android-launch-appearance/artifacts/e2e   (이 셸을 열기 전에 정한다)
: "${OUT:?OUT 에 증거 폴더의 절대 경로를 넣는다(export OUT=/…/artifacts/e2e)}"
case "$OUT" in /*) ;; *) echo "OUT 은 절대 경로여야 한다: $OUT" ;; esac
TOOLS="$OUT/tools"; mkdir -p "$OUT" "$TOOLS"
DOC="$PWD/docs/e2e/android-launch-appearance.md"    # 저장소 루트에서 연 셸 기준
A shell getprop ro.build.version.sdk        # 37 또는 30
```

빌드 · 설치(저장소 루트에서, **검증할 커밋의 SHA를 실행 결과에 적는다**):

```sh
git rev-parse --short HEAD
# 1) 번들 — 실제 서버 주소가 번들에 들어가지 않게 모의 값으로 만든다
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) bundled APK (L1 · L2 · L3 · L5 · L7 · L10 · 기록)
( cd apps/android && ./gradlew :app:assembleBundled )
A install -r apps/android/app/build/outputs/apk/bundled/app-bundled.apk
# 3) debug APK + 계측 APK (L6 (a) (d) · L8 · L9) — 필요할 때 이 두 줄로 바꿔 깐다
( cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest )
# A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
# A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

**`pnpm verify`를 돌린 뒤에는 1)을 반드시 다시 돌린다.** `pnpm verify`가 `apps/mobile/dist`를 모의 값 없는 번들로 덮어써서, 그 번들을 서빙하는 debug 픽스처가 실패한 적이 있다([Android 화면 방향과 구성 변경](android-orientation.md)의 「기기 · 빌드」).
bundled APK는 `assets/`의 번들을 담으므로 1) 뒤에 2)를 다시 해야 새 번들이 들어간다.

debug 항목(L6 (a) (d) · L8)이 번들 서버를 쓸 때(저장소 루트에서):

```sh
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist >/tmp/libitum-launch-preview.log 2>&1 &
curl -sI http://localhost:18790/main.lynx.bundle | head -1      # 200
BUNDLE=http://10.0.2.2:18790/main.lynx.bundle                   # 에뮬레이터 안에서 호스트 PC는 10.0.2.2
```

### 시작 전 전역 설정 — 기록하고 확인한다

```sh
globals() {
  echo "sdk: $(A shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "night: $(A shell cmd uimode night | tr -d '\r')"
  echo "size: $(A shell wm size | tr -d '\r' | tr '\n' ' ')"
  echo "density: $(A shell wm density | tr -d '\r' | tr '\n' ' ')"
  for K in font_scale; do echo "$K: $(A shell settings get system $K | tr -d '\r')"; done
  for K in window_animation_scale transition_animation_scale animator_duration_scale; do echo "$K: $(A shell settings get global $K | tr -d '\r')"; done
  echo "navigation_mode: $(A shell settings get secure navigation_mode | tr -d '\r')"
  echo "show_ime_with_hard_keyboard: $(A shell settings get secure show_ime_with_hard_keyboard | tr -d '\r')"
}
globals | tee "$OUT/globals-before-$ID.txt"
```

| 설정 | 시작 전에 이 값이어야 한다 | 아니면 |
|---|---|---|
| `night` | `Night mode: no` | `A shell cmd uimode night no` |
| `size` · `density` | `Physical …` 한 줄만(재정의 없음) | `A shell wm size reset` · `A shell wm density reset` |
| `font_scale` | `1.0` | `A shell settings put system font_scale 1.0` |
| 애니메이션 배율 셋 | `1.0` 또는 `null`(기본) — 계약의 실측이 1.0이었다. 0으로 끄면 스플래시 구간이 달라진다 | `A shell settings put global window_animation_scale 1.0` 등 |
| `navigation_mode` | **시작 값을 기록한다.** Pixel_8 `2`(제스처) · R6_API30 `0`(3버튼). L1 · L2 · L5는 시작 값(제스처)에서만 잰다 | 바꾸지 않는다. 바꿨다면 L10 R3 끝에서 되돌린다 |
| `show_ime_with_hard_keyboard` | 기록만 한다. L6 (a)에서 키보드가 안 뜨면 `1`로 바꾸고 끝에서 시작 값으로 되돌린다 | — |

### 도구 — 이 문서의 코드 블록을 파일로 저장해 쓴다

이 문서 맨 아래 「부록 — 도구 코드」에 파일 셋이 있다. 저장소 밖 경로(`.agent-harness/work/…/artifacts/spec/`)에 기대지 않으려고 **문서 안에 실행 가능한 형태로** 실었고, 아래 명령이 코드 블록을 파일로 꺼낸다
(` ```swift file=frames.swift ` 처럼 여는 줄에 `file=`이 있는 블록만). 코드를 손으로 옮겨 적지 않는다 — 문서의 블록이 정본이다.
도구를 저장소에 두는 것은 후속 제안이다(예: `devtools/android-launch-appearance/`에 같은 세 파일). 이 문서는 그 위치를 가정하지 않는다.

```sh
python3 - "$DOC" "$TOOLS" <<'PY'
import pathlib, re, sys
doc, out = sys.argv[1], pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for m in re.finditer(r'^```\w+ file=(\S+)\n(.*?)^```$', open(doc, encoding='utf-8').read(), re.S | re.M):
    (out / m.group(1)).write_text(m.group(2), encoding='utf-8')
    print('wrote', out / m.group(1))
PY
swiftc -O "$TOOLS/frames.swift" -o "$TOOLS/frames" 2>&1 | grep -E 'error' ; ls -l "$TOOLS/frames"   # warning(tracks(withMediaType:) 폐기 예고)은 무시한다
python3 -m py_compile "$TOOLS/px.py" "$TOOLS/judge.py" && echo tools-ok
```

| 도구 | 하는 일 |
|---|---|
| `frames` (Swift) | 영상(`screenrecord`의 mp4)의 프레임마다 여섯 표본점의 색, 워드마크 띠의 흰 점 수, **상태바 띠의 아이콘 색 · 실제 배경색**(`icon=` · `ibg=`, L7용)을 한 줄로 낸다. `--save 인덱스,… --out 폴더`로 그 프레임을 PNG로 뽑는다 |
| `judge.py` | `frames`의 출력에서 F0 · F1 · F1′ · J0를 찾고(r02 정의 — 「구간의 용어」) L1(API 37) · L3(API 30)의 구간 색 판정과 가드, L7-b · L7-c(API 37) · L7-d · L7-e(API 30)의 영상 쪽 판정, 워드마크 진행도 기록을 낸다. 종료 코드 0 통과 · 1 실패 · 3 판정 불가(F0 · F1을 못 찾음, 표에 `icon` 열이 없음 — 통과가 아니다) |
| `px.py` | PNG 한 장의 판독: `samples` · `expect`(L2 · L3 · L8) · `center`(L2) · `rows`(L6) · `strip PNG [contrast\|dark\|both]`(L7 — **같은 캡처의 실제 배경**과 비교한다) · `iconedge`(L4) |

### 셸 관용구와 관찰 도구

```sh
shot() { A exec-out screencap -p > "$OUT/$1.png"; }
front() { A shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity"; }
# 콜드 스타트를 영상으로 잡는다 → $OUT/<이름>.mp4. 기록 시작 1.5초 뒤에 시작한다(영상 앞 1.5초는 런처)
#   cold L1-1                                  — 번들 내장(bundled)
#   cold L8-1 --es bundle-url "$BUNDLE"        — debug
#   이름은 지역 변수 NAME 에 받는다 — 전역 N 에 받으면 호출하는 쪽의 반복문 변수를 덮어쓴다(`for N in 1 2; do cold L1-$N; vid 37 L1-$N; done` 에서 파일명이 어긋났다, r02 실행의 E2)
cold() {
  local NAME=$1; shift
  A shell am force-stop "$PKG"; A shell input keyevent KEYCODE_HOME; sleep 2
  A shell "screenrecord --time-limit 12 /sdcard/$NAME.mp4 & sleep 1.5; am start -W -n $ACT $*; wait" >/dev/null
  A pull "/sdcard/$NAME.mp4" "$OUT/$NAME.mp4" >/dev/null && echo "$OUT/$NAME.mp4"
}
# 영상 → 프레임 표 → 판정:  vid 37 L1-1   (API 번호는 37 또는 30)
vid() { "$TOOLS/frames" "$OUT/$2.mp4" > "$OUT/$2.txt" && python3 "$TOOLS/judge.py" "$1" "$OUT/$2.txt"; }
# 콜드 스타트 직후 <초> 뒤의 무손실 한 장 → $OUT/<이름>.png. 기기 안에서 재서 adb 지연이 끼지 않는다. 한 번의 실행에 한 장만 찍는다
#   early L2 1.6   (API 37: 1.6초)      early L3-lossless 0.25   (API 30: 0.25초)
early() {
  A shell am force-stop "$PKG"; A shell input keyevent KEYCODE_HOME; sleep 2
  A shell "am start -n $ACT $3 >/dev/null; sleep $2; screencap -p /sdcard/$1.png"
  A pull "/sdcard/$1.png" "$OUT/$1.png" >/dev/null && echo "$OUT/$1.png"
}
# 재생성 없음 판정(Activity 수명 이벤트): mark 뒤 조작, lc → "create: 0 destroy: 0 relaunch_resume: 0"
mark() { A logcat -b events -c; }
lc() {
  EV=$(A logcat -b events -d | tr -d '\r' | grep 'com.libitum.host.MainActivity')
  echo "create: $(echo "$EV" | grep -c wm_on_create_called) destroy: $(echo "$EV" | grep -c wm_on_destroy_called) relaunch_resume: $(echo "$EV" | grep -c wm_relaunch_resume_activity)"
}
# LynxView 의 bounds "왼,위-오른,아래" = 창 안에서 Lynx 가 차지한 영역. 실행 ①에서는 온보딩 화면에서 빈 값이었고(r02 결함 D7) 실행 ②에서는 같은 화면에서 0,0-1080,2400 을 냈다 —
#   빈 값이 나오는 조건은 모른다. 빈 값이면 아래 appframe 을 쓴다(R2 는 처음부터 appframe 으로 판정한다)
lynxbounds() { A shell dumpsys activity top | tr -d '\r' | grep -o 'com.lynx.tasm.LynxView{[^}]*}' | grep -o '[0-9]*,[0-9]*-[0-9]*,[0-9]*' | head -1; }
# MainActivity 의 창(앱 창) 프레임 "[왼,위][오른,아래]" — 화면 어느 구성에서든 dumpsys window 에 나온다. 시작 창(Splash Screen …)은 이름이 달라 걸리지 않는다
#   기기에서 확인했다(실행 ②, API 37 온보딩): " frame=[0,0][1080,2400]"
appframe() {
  A shell dumpsys window windows | tr -d '\r' \
    | awk '/Window #[0-9]+ Window\{[^}]*libitum\.duru\.android\/com\.libitum\.host\.MainActivity\}/{f=1} f&&/Frames:/{print; exit}' \
    | grep -o ' frame=\[[0-9,]*\]\[[0-9,]*\]' | head -1
}
# 런처에서 앱 서랍을 연다. 기기에서 확인한 것(실행 ②, API 37 Pixel_8 기본 런처):
#   - `input keyevent KEYCODE_ALL_APPS` — **첫 시도에 열렸다.** API 30 에서는 돌려 보지 않았다
#   - `am start -a android.intent.action.ALL_APPS` — 뒤이은 시도에서 서랍이 열려 있었지만 "intent has been delivered to currently running top-most instance" 경고가 났고,
#     앞 시도의 서랍이 닫혔는지 불확실해 **단독으로 여는지는 확정하지 못했다**
#   - **스와이프는 통하지 않았다**: `swipe 540 2000 540 600 300`(제스처 영역, 실행 ①) · `540 1600 540 300 120` · `540 1700 540 400 200`(실행 ② 2/2. 앞의 것은 실행 ①에서 한 번 열렸으나 두 번째부터 불안정했다).
#     그래서 API 31 이상의 시도에서 뺐다. 각 시도 뒤 iconcell Duru 로 열렸는지 확인한다
#   - API 30(3버튼 — 아래 가장자리가 제스처 영역이 아니다): 실행 ①이 서랍 자리에서 쟀다. 그때 문서의 명령은 `swipe 540 1900 540 600 300` 이었는데 **어느 명령으로 열렸는지는 로그에 남지 않았다.**
#     앞의 둘이 안 통하면 이 스와이프를 마지막으로 시도한다(API 30 이하에서만)
opendrawer() {
  local TRY
  for TRY in "input keyevent KEYCODE_ALL_APPS" "am start -a android.intent.action.ALL_APPS" "input swipe 540 1900 540 600 300"; do
    case "$TRY" in "input swipe"*) [ "$(A shell getprop ro.build.version.sdk | tr -d '\r')" -le 30 ] || continue ;; esac
    A shell input keyevent KEYCODE_HOME; sleep 1.5
    A shell "$TRY" >/dev/null 2>&1; sleep 1.5
    if [ -n "$(iconcell Duru)" ]; then echo "서랍 열림: $TRY"; return 0; fi
  done
  echo "서랍을 열지 못했다 — L4 는 「닿지 못함」으로 적는다"; return 1
}
# 아이콘을 (x0,y0) 에서 (x1,y1) 로 끈다: DOWN → 1.2초 대기(길게 누르기) → MOVE 다섯 번(0.3초 간격) → UP.
#   이 순서가 API 37 런처에서 통했다(실행 ② — 서랍의 아이콘이 홈 작업 영역에 놓였다). **`input draganddrop <x0> <y0> <x1> <y1> 1000` 은 통하지 않았다**(서랍이 닫히고 아이콘이 놓이지 않았다).
#   함수 그대로도 기기에서 통했다(실행 ③, release AAB — `dragicon 667 1232 270 700 L4-drag` 로 서랍의 아이콘이 홈 작업 영역에 놓이고 끄는 중 캡처가 찍혔다).
#   $5 에 이름을 주면 MOVE 셋째 뒤(끄는 중)에 무손실 한 장을 찍는다
dragicon() {
  local X0=$1 Y0=$2 X1=$3 Y1=$4 SHOT=$5 I
  A shell input motionevent DOWN "$X0" "$Y0"; sleep 1.2
  for I in 1 2 3 4 5; do
    A shell input motionevent MOVE $(( X0 + (X1 - X0) * I / 5 )) $(( Y0 + (Y1 - Y0) * I / 5 )); sleep 0.3
    if [ "$I" = 3 ] && [ -n "$SHOT" ]; then shot "$SHOT"; fi
  done
  A shell input motionevent UP "$X1" "$Y1"
}
# content-desc 가 $1 로 시작하는 노드의 bounds / 그 가운데를 누른다 (앱 화면 안)
dumpb() { A shell uiautomator dump /sdcard/ui.xml >/dev/null; A shell cat /sdcard/ui.xml | grep -o "content-desc=\"$1[^\"]*\"[^>]*bounds=\"[^\"]*\""; }
tapdesc() {
  B=$(dumpb "$1" | head -1 | grep -o 'bounds="[^"]*"' | grep -o '[0-9]*' | tr '\n' ' ')
  [ -n "$B" ] || { echo "no node: $1"; return 1; }
  A shell input tap $(echo "$B" | awk '{ print int(($1 + $3) / 2), int(($2 + $4) / 2) }')
}
# 런처 화면에서 라벨이 $1 인 아이콘 칸의 bounds 를 "x0 y0 x1 y1" 로 (이 앱이 앞에 있으면 건너뛴다)
iconcell() {
  A shell uiautomator dump /sdcard/ui.xml >/dev/null
  A exec-out cat /sdcard/ui.xml | python3 -c '
import re, sys, xml.etree.ElementTree as ET
want = sys.argv[1]
for n in ET.fromstring(sys.stdin.read()).iter("node"):
    if n.get("package") != "libitum.duru.android" and want in (n.get("text"), n.get("content-desc")):
        print(*re.findall(r"[0-9]+", n.get("bounds"))); break
' "$1"
}
```

### 저장된 영상 다시 판정 — 재촬영 없이

영상(mp4)이 남아 있으면 판정만 새로 돌릴 수 있다. 프레임 표(`.txt`)는 영상에서 다시 만든다 — **옛 표에는 `icon` · `ibg` 열이 없어** `judge.py`가 L7 영상 항목을 「판정 불가」(종료 3)로 낸다.

```sh
# SRC = 영상이 있는 폴더의 절대 경로. e2e 실행의 영상은 artifacts/e2e, 구현 전 캡처는 artifacts/spec
SRC=/절대/경로/artifacts/e2e
revid() { "$TOOLS/frames" "$SRC/$2.mp4" > "$OUT/$2.r02.txt" && python3 "$TOOLS/judge.py" "$1" "$OUT/$2.r02.txt"; echo "exit=$?"; }
for N in L1-1 L1-2 L1-3 L1-4; do revid 37 $N; done
for N in L3-1 L3-2; do revid 30 $N; done
# 구현 전 캡처: 고친 정의가 red 를 지우지 않는지 — 넷 모두 FAIL(exit=1)이어야 한다
SRC=/절대/경로/artifacts/spec
revid 37 cold37-plain; revid 37 cold37-show-icon; revid 30 cold30; revid 30 cold30-bundle404
```

무손실 PNG(`L2.png` · `L3-lossless.png` 등)는 새 표가 필요 없다 — `px.py`를 그대로 돌린다. 이 절의 명령은 판정 도구를 돌리는 방법이고, **그 출력을 이 문서의 실행 상태 표에 옮기는 것은 판정을 내리는 쪽(test-execution)이다.**

### 구간의 용어 — 콜드 스타트 프레임을 어떻게 가르는가

영상은 `screenrecord`의 mp4다. 화면이 바뀔 때만 프레임이 나오므로(정지한 시스템 스플래시는 한두 프레임) **프레임 수가 아니라 시각(`t`)**으로 구간을 잰다.
표본점은 화면 폭 · 높이의 비율이다: status (0.10, 0.012) · top (0.10, 0.10) · centre (0.50, 0.50) · centreL (0.30, 0.50) · low (0.10, 0.85) · nav (0.10, 0.99).

정의는 test-plan r02-1이 단일 출처다. r01의 정의가 e2e 실행에서 L1 2/4회 · L3 2/2회 형식 실패를 냈다(결함 D2 · D3).

| 이름 | 정의 | 판정에서의 뜻 |
|---|---|---|
| **F0** (덮임 프레임) | 영상이 처음 바뀐(런처에서 앱으로 넘어가기 시작한) 뒤, **status · top · centreL · low · nav 다섯 점**이 서로 채널별 16 이내로 같아진 첫 프레임. **3버튼 기기(API 30)는 nav를 빼고 넷** | 런처의 열림 확대 애니메이션이 끝난 시점. 확대 중에는 창이 화면보다 작아 가운데 세 점만 먼저 같아지고 status · nav 표본에는 런처 배경이 찍힌다(API 37 `#DBDFE7` · `#0D0F17`, API 30 `#B18795`) — 그 프레임은 F0가 아니다. 판정 구간의 시작 |
| **F1** (구간의 끝) | F0 뒤에 **top이 `#F46B18` ± 16을 벗어난 첫 프레임** | 판정 구간 [F0, F1)의 끝(이 프레임은 포함하지 않는다). 주황 → 첫 화면의 교차 페이드(API 30에서 0.1초 · 4프레임, top `#FCBF92` → `#FDECDE`)는 시작 구간이 아니라 화면 전환이라 구간에서 뺀다 |
| **F1′** (가드) | F1 뒤에 top이 `#FFFDFC`(첫 화면의 셸 색) ± 16에 들어온 첫 프레임 | **F1′의 시각 − F1의 시각 ≤ 0.3초**여야 한다. 넘으면 실패 — F1을 앞당긴 대신, 주황도 첫 화면 색도 아닌 색이 오래 머무는 경우를 놓치지 않게 한다. 0.3초는 관찰된 겹침 0.1초의 세 배다 |
| **J0** (워드마크가 처음 보인 프레임) | [F0, F1) 안에서 top이 `#F46B18` ± 16이고 워드마크 띠(가로 15~85% · 세로 40~60%)의 흰 점(R·G·B 모두 252 이상)이 20개 이상인 첫 프레임 | JS 스플래시의 흰 손글씨가 보이기 시작한 시점. **없을 수 있다 — 간헐적이다.** `bundled` 빌드에서 워드마크 이미지의 로드가 가끔 실패하고 그때 스플래시가 바로 닫힌다(주황 창 약 0.1초 뒤 바로 온보딩 — API 30 9실행 가운데 6실행, API 37 11실행 가운데 1실행. 「범위 밖 관찰 기록란」). 「API 30의 `bundled`에서는 J0가 없다」가 아니다 — 같은 빌드 · 같은 기기에서 있는 실행과 없는 실행이 섞인다. 없으면 `judge.py`가 「J0 없음」을 적고, J0를 쓰는 판정(워드마크 진행도)은 건너뛰며 **통과로 세지 않는다.** ⟨2026-10-07⟩ **원인이 확정되고 호스트가 고쳐졌다**([ADR-0051](../adr/0051-android-image-url-redirect.md) — Lynx 이미지 URL 재작성의 스레드 경합). **그 수정이 든 빌드에서 J0가 없으면 이제 「간헐적인 기존 결함」이 아니라 결함이다** — logcat의 `LynxImageManager: onFailed` 줄을 확인하고 [스플래시 워드마크 절차](android-splash-wordmark.md)로 간다. **예외가 하나 있다 — dev 빌드(debug + HTTP 번들)의 「늦은 도착」이다**: `onFailed` 줄이 없고 주황 창이 약 0.1초가 아니라 **약 4초** 이어진 뒤 첫 화면으로 넘어간다(워드마크 이미지가 늦게 떠 스플래시의 4초 안전 타이머가 재생보다 먼저 닫았다). 그 수정과 무관한 기존 성질이고 `bundled` 빌드에서는 관찰되지 않았다 — 판정(LATE)과 진단은 [ADR-0051](../adr/0051-android-image-url-redirect.md) 「첫 e2e와 늦은 도착 증상」 · D5가 진다. 그 실행도 J0를 쓰는 판정을 건너뛰고 **통과로 세지 않는다.** 앞의 실행 수(9실행 가운데 6 · 11실행 가운데 1)는 수정 전 빌드의 기록이고, 수정 전 빈도를 다시 잰 값은 ADR-0051의 「재현 빈도」에 있다 |

- F0를 못 찾으면(다섯 점이 한 번도 같아지지 않음) 「판정 불가」(종료 3)이지 통과가 아니다.

| 구간 | API 37 | API 30 | 구현 전 | 구현 뒤 기대 |
|---|---|---|---|---|
| 시스템 스플래시 구간 | 시스템 스플래시. F0부터 시작 | **없다**(시스템 스플래시는 API 31부터) | 바탕 영상 `#F8F8F8`(무손실 `#FAFAFA`) 위 가운데에 흰 원과 아이콘, 3.1 · 3.4초 | 가운데까지 평평한 `#F46B18` |
| 창 배경 구간 | 위와 구별되지 않는다(둘 다 평평한 주황 면) | 시작 창(미리보기 창) 0.2초 뒤 Lynx가 그리기 전의 창까지 | API 30: `#F8F8F8`, 0.57 · 0.60초. 상태바 띠 `#747474` · 내비게이션 바 `#000000`은 **번들을 읽지 못한 실행**(`cold30-bundle404.mp4`, 1.66 ~ 1.87초)에서만 보였다 — `cold30.mp4`에는 옅어지는 꼬리만(계약 r02.3) | 평평한 `#F46B18`, 상태바 띠 · 검정 내비게이션 바 없음 |
| JS 스플래시 | J0 ~ F1. 영상 `#F16A15`(무손실 `#F46B18`) 위 흰 손글씨 | 같음. 이 에뮬레이터의 영상 인코더는 `#FE7412`로 찍는다(채널 오차 최대 10). 3버튼 바 자리는 `#FEF0E8`(시스템 가림막). `bundled` 빌드에서는 **보이는 실행과 안 보이는 실행이 섞인다**(9실행 가운데 3실행에서 보였다 — 보일 때 [J0, F1)은 약 2.4초) | 같음(API 30은 debug + HTTP 번들에서 J0 2.86초) | 같음(바뀌지 않는다) |
| 첫 화면 | F1′ ~. 영상 `#FBFCF9`(무손실 `#FFFDFC`) | 같음 | 같음 | 같음 |

- **영상의 허용 오차는 채널별 절대 차 16 이하**다(코덱 오차 — 같은 색이 API 37에서 3, API 30에서 10까지 어긋났다. 가려야 할 두 색 `#FAFAFA` ↔ `#F46B18`은 G 채널이 143 떨어져 있다).
  **무손실 캡처(`screencap -p`)는 오차 0**이다 — 값이 정확히 같아야 한다.
- 실행 도중의 `screencap`은 몇 초씩 밀릴 수 있다(연속 캡처가 6초 밀린 적이 있다). **한 번의 실행에 한 장**만 찍고, 기기 안에서 `sleep` 뒤 바로 찍는 `early`를 쓴다.
- 판정 구간은 **[F0, F1)**이다. F0 앞의 확대 프레임과 F1의 교차 페이드는 판정하지 않는다. API 30에서는 이 구간이 1 ~ 2프레임(0.01 ~ 0.04초)으로 짧다 — 그 앞의 확대 프레임과 뒤의 교차 페이드를 뺀 값이다. 무손실 한 장(L3)이 그 빈틈을 메운다.
- F1을 찾지 못하면(번들을 못 읽었거나 영상이 짧다) 영상 끝까지를 구간으로 보고 `judge.py`가 그 사실을 적는다 — 어긋난 점이 없어도 그 실행은 통과가 아니라 판정 불가(종료 3)이고 L1 · L3으로 세지 않는다.

## 항목

기대 red는 구현 전(HEAD `a2fcf3ec`: 창 배경 · 스플래시 · 시작 창 바 설정 · 적응형 아이콘 없음) 기준이다. **구현 전의 실패는 계약 단계의 실측(`am start`가 만든 프레임 · 스크린샷)이 본 것이고, 이 절차를 구현 전 빌드로 돌린 것은 아니다.**

### L1 — API 37 콜드 스타트 영상: 시작 구간 내내 주황 (AC1)

- **기기 · 빌드**: Pixel_8 · bundled. 시작 값 전역 설정(제스처 내비게이션).
- **준비**: bundled APK 설치 → `A shell pm clear "$PKG"`(로그인 전 상태 — 첫 화면이 온보딩이라 F1의 색이 `#FFFDFC`다) → 16 KB 대화상자 없음 확인.
- **조작 · 캡처**: 2회.
  ```sh
  cold L1-1; vid 37 L1-1
  cold L1-2; vid 37 L1-2
  ```
  `judge.py`는 구간(F0 · F1 · F1′ · J0의 시각)과 어긋난 점을 모두 적는다. 시스템 스플래시 구간(F0 ~ J0)의 **길이**도 기록한다(에뮬레이터 값 — 실기의 값이 아니다).
- **판정**
  - **[F0, F1)의 모든 프레임에서 status · top · low · nav가 `#F46B18` ± 16**(영상, r02 정의의 F0 · F1). **F0 프레임에서는 centre · centreL도 `#F46B18` ± 16**(U2 — 시스템 스플래시에 아이콘이 없다). 어긋난 프레임 0장. **가드: F1′ − F1 ≤ 0.3초.** `judge.py`의 「L1 판정」 줄이 PASS, 두 실행 모두.
  - `judge.py`의 「참고」 줄: `[F0, J0)`에서 centre가 주황이 아닌 프레임이 0장이어야 한다(F0 이후의 가운데 값. 판정은 F0만이지만, 있으면 L2가 따로 확인한다).
  - API 37의 `bundled`에서는 J0가 대부분 관찰됐다(11실행 가운데 10 — 판정 실행 여섯은 전부). J0가 없으면 「J0 없음」을 적고 워드마크 기록은 건너뛴다(원인은 「범위 밖 관찰 기록란」의 워드마크 이미지 로드 실패다 — logcat에서 확인한다).
- **구현 전 관찰**: **red** — F0부터 3.1 · 3.4초 동안 `#F8F8F8`, centre는 아이콘(`#F7A98B` 부근).
- **기록(판정 아님)**: F0 ~ J0의 길이, J0의 워드마크 진행도(아래 「범위 밖 관찰 기록란」).

### L2 — API 37 시스템 스플래시: 여섯 점이 정확히 주황 · 가운데에 아이콘과 흰 원 없음 (AC1 · 추론 1)

- **기기 · 빌드**: Pixel_8 · bundled. **계약의 추론 1**(투명 `windowSplashScreenAnimatedIcon`이 아이콘과 흰 원을 실제로 지우는가)을 닫는 항목이다.
- **조작 · 캡처**: `am start` 1.6초 뒤 무손실 한 장.
  ```sh
  early L2 1.6
  python3 "$TOOLS/px.py" samples "$OUT/L2.png"
  python3 "$TOOLS/px.py" expect "$OUT/L2.png" '#F46B18' 0 status,top,centre,centreL,low,nav
  python3 "$TOOLS/px.py" center "$OUT/L2.png" 400
  ```
  `center`가 비주황 점을 세면 흰 점의 **비율**과 **밝은 비주황 점**(주황과 흰색 사이의 연한 주황 — 예 `#FAD2BC`)의 수로 안내한다.
  - 가운데의 20% 이상이 흰 면이면 흰 원(스플래시 아이콘 바탕)이나 흰 화면이다 — 워드마크가 아니고 스플래시가 걷힌 것도 아니다(구현 전 캡처가 이 경우다: 흰 점 44%).
  - 일부(20% 미만)만 흰 점이면 워드마크의 획일 수 있다(스플래시가 걷히는 중).
  - **흰 점이 0인데 밝은 비주황 점이 있으면 워드마크의 첫 획일 수 있다** — 막 쓰이기 시작한 획은 반투명이라 순백(채널 252 이상)이 하나도 없다. 실행 ②의 1.6초 캡처가 이 경우였다(비주황 6270 · 흰 점 0 — 시스템 스플래시는 이미 걷혀 있었다).
    앞 판의 도구는 이것을 「아이콘 · 어두운 점」이라고 안내했다(r02 실행의 E1). **색만으로는 아이콘의 밝은 면(구현 전 아이콘 속 `#FCA98B`)과 가르지 못한다** — 안내일 뿐이고 종료 코드는 비주황 점이 하나라도 있으면 1이다.
  - 뒤의 두 경우는 지연을 `1.0`으로 줄여 처음부터 다시(`early L2b 1.0`) 한 장 찍는다. 그래도 걷혀 있으면 `0.6`(실행 ②에서 1.0초 둘 · 0.6초 하나가 통과했다). 어느 쪽이든 PNG를 열어 눈으로 구별한다(r02 결함 D4).
- **판정**: 여섯 표본점이 **전부 정확히 `#F46B18`**(`expect` 종료 코드 0). **화면 가운데 400x400px 구역에 `#F46B18`이 아닌 픽셀 0**(`center` PASS, 흰 점 0). 눈으로도 한 번 본다(`$OUT/L2.png`) — 흰 원 · 아이콘 · 어두운 점이 없다.
- **구현 전 관찰**: **red** — 바탕 `#FAFAFA`, 가운데에 흰 원과 220px 정사각 아이콘.
- **관찰 의미**: 이 항목이 서면(가운데에 원이나 아이콘이 남음) 투명 drawable이 아이콘을 지운다는 추론이 틀린 것이다 — 관찰을 그대로 적고 실패로 보고한다. 고치는 방법은 계약에 없다(`splash_icon_none`의 모양은 구현이 정한다).

### L3 — API 30 콜드 스타트: 시작 창이 주황 (AC1 · 추론 2)

- **기기 · 빌드**: R6_API30 · bundled. 시스템 스플래시가 없으므로 시작 창과 첫 그리기 전의 창이 대상이다. **계약의 추론 2**(시작 창이 테마의 투명 시스템 바 · 밝은 바 아이콘 설정을 따르는가)의 API 30 쪽을 닫는다.
- **준비**: L1과 같다(`pm clear`).
- **조작 · 캡처**: 영상 2회 + `am start` 0.25초 뒤 무손실 한 장.
  ```sh
  cold L3-1; vid 30 L3-1
  cold L3-2; vid 30 L3-2
  early L3-lossless 0.25
  python3 "$TOOLS/px.py" samples "$OUT/L3-lossless.png"
  python3 "$TOOLS/px.py" expect "$OUT/L3-lossless.png" '#F46B18' 0 top,centre,centreL,low
  ```
  무손실 캡처의 centre · centreL에 `#FDFDFC`(흰)가 나오면 JS 스플래시의 워드마크가 이미 시작된 것이다 — `early L3-lossless 0.15`로 다시.
- **판정**
  - 영상: [F0, F1)의 모든 프레임에서 **status · top · low가 `#F46B18` ± 16**, F0에서 centre · centreL도. F1′ − F1 ≤ 0.3초(`judge.py`의 「L3 판정」 줄 PASS, 두 실행 모두). F0는 nav를 뺀 넷(3버튼)으로 찾는다. J0는 없을 수 있다 — 간헐적이다(실행 ①의 두 번은 없었고 실행 ②의 새 영상 둘은 하나가 있고 하나가 없었다). 없으면 「J0 없음」을 적고 통과로 세지 않는다.
  - 무손실: **top · centre · centreL · low가 정확히 `#F46B18`**.
  - **nav는 L3에서 판정하지 않고 값만 적는다**(3버튼의 시스템 가림막 — 계약 §8). `judge.py`가 「nav 값」을 적는다. 검정 내비게이션 바가 사라졌는지는 L7-e가 판정한다.
- **구현 전 관찰**: **red** — F0부터 0.57 · 0.60초 동안 `#F8F8F8`(무손실 `#FAFAFA`). 상태바 `#747474` · 내비게이션 바 `#000000`은 구현 전 `cold30-bundle404.mp4`에서만 보였고 `cold30.mp4`에는 없다(L7-e가 다룬다).

### L4 — 런처 아이콘: 마스크에 맞게 보인다 (AC2)

- **기기 · 자리**: Pixel_8은 **앱 서랍과 홈 화면**, R6_API30은 **앱 서랍**. 어느 빌드든 같은 리소스다. **어느 자리에서 쟀는지를 결과에 적는다** — 자리마다 판정은 같지만 서로를 대신하지 않는다.
  - **홈 화면의 자리**: 하단 줄(핫시트)에 빈 칸이 있으면 하단 줄에 놓고 잰다. **하단 줄이 꽉 차 있으면 홈 작업 영역에 놓고 거기서 판정한다**(실행 ②가 그랬다 — Pixel_8의 하단 줄 네 칸이 Phone · Messages · Chrome · Play로 차 있었다).
    그때 결과는 「홈 작업 영역에서 통과」이고 **하단 줄 자리는 「판정하지 못함」으로 따로 적는다.** 옆 아이콘 크기 비교는 하단 줄의 아이콘(예: Chrome)과 해도 된다(실행 ②에서 작업 영역의 Duru와 하단 줄의 Chrome이 둘 다 159px이었다).
    하단 줄의 다른 앱을 치워 자리를 만들지 않는다(런처 구성을 바꾸는 일이고 이 절차가 되돌리지 못한다).
- **준비**: 앱이 설치돼 있다. 홈 화면에 Duru 아이콘이 없으면 앱 서랍을 열어(`opendrawer`) 아이콘을 홈 화면의 빈 자리로 끌어 놓는다(`dragicon` — 서랍의 아이콘 칸 가운데에서 홈 화면의 빈 칸 가운데로. 서랍에서 끌기 시작하면 런처가 홈 화면으로 바뀐다).
  이전 설치의 흰 원 아이콘이 캐시돼 보이면 앱을 `uninstall` 뒤 다시 깔고 런처가 갱신될 때까지 3초 기다린다.
  **앱 서랍 열기 · 끌기는 기기에서 확인한 명령만 쓴다**(실행 ②, API 37 — 「셸 관용구」의 `opendrawer` · `dragicon` 주석): 서랍은 `KEYCODE_ALL_APPS`가 첫 시도에 열었고 스와이프는 통하지 않았다. 끌기는 `input motionevent`의 DOWN → 대기 → MOVE 여러 번 → UP이 통했고 `input draganddrop`은 통하지 않았다.
  어느 시도로 열렸는지 `opendrawer`의 출력이 적으므로 실행 결과에 그 시도를 적는다. 하나도 열리지 않으면 L4를 「닿지 못함」으로 적는다(통과가 아니다).
- **조작 · 캡처**
  ```sh
  A shell input keyevent KEYCODE_HOME; sleep 2          # 홈 화면 자리. 서랍 자리를 잴 때는 이 줄 대신: opendrawer
  shot L4-launcher
  read X0 Y0 X1 Y1 <<< "$(iconcell Duru)"; echo "Duru 칸: $X0 $Y0 $X1 $Y1"
  python3 "$TOOLS/px.py" iconedge "$OUT/L4-launcher.png" "$X0" "$Y0" "$X1" "$Y1"
  read N0 M0 N1 M1 <<< "$(iconcell Chrome)"; echo "옆 아이콘 칸: $N0 $M0 $N1 $M1"     # API 30 서랍에서는 보이는 다른 앱(예: Settings)의 라벨로 바꾼다
  python3 "$TOOLS/px.py" iconedge "$OUT/L4-launcher.png" "$N0" "$M0" "$N1" "$M1"
  # 눈으로 볼 크롭(칸 주변 20px를 더한다)
  sips -c $(( Y1 - Y0 + 40 )) $(( X1 - X0 + 40 )) --cropOffset $(( Y0 - 20 )) $(( X0 - 20 )) "$OUT/L4-launcher.png" --out "$OUT/L4-crop.png" >/dev/null
  ```
  (`read … <<<`로 나눈다 — zsh는 따옴표 없는 변수를 단어로 쪼개지 않아 `$CELL`을 그대로 넘기면 한 인자가 된다.)
  **옆 아이콘(Chrome · Settings)에 돌린 `iconedge`의 `FAIL`은 무시한다 — 지름만 읽는다.** `iconedge`의 PASS/FAIL은 「가장자리 안쪽이 주황인가」라 주황이 아닌 아이콘에서는 늘 FAIL이다(실행 ② · ③ 모두 Chrome 칸이 FAIL · 지름 159px이었다).
  서랍을 열면 검색창에 포커스가 가 키보드가 함께 올라온다(실행 ③의 관찰 — 아이콘 칸은 키보드 위에 있어 `iconcell` · `iconedge` 판독에 지장이 없었다).
  `iconedge`는 칸 안에서 배경(칸 왼쪽 · 오른쪽 끝의 색)과 다른 영역의 가장 넓은 가로줄을 아이콘 가운뎃줄로 잡고, 마스크 왼쪽 · 오른쪽 가장자리와 지름, 줄을 따라 색 런(O 주황 · W 흰색 · . 그 밖)을 낸다.
  가장자리를 못 찾으면(배경이 복잡한 화면) 칸 좌표를 넓히거나 배경 화면이 단색에 가까운 자리에서 다시 찍는다.
- **판정**
  - **`iconedge`의 Duru 칸 PASS**: 원(마스크)의 안쪽 가장자리에서 안으로 10px 구간(가장자리 2px 안쪽부터 10px)이 **양쪽 모두 주황 계열**(R > 200 · G < 200 · B < 170)이다 — 흰 띠가 없다.
  - **옆 아이콘과 같은 크기의 원**: Duru 칸의 지름이 옆 아이콘 지름과 **±4px** 이내.
  - 눈으로(`$OUT/L4-crop.png`을 연다): 마크(꽃잎 · 그릇)가 **잘리지 않았다**, 마스크 안쪽이 그림으로 가득 차 있다(흰 원 안의 작은 정사각이 아니다).
- **구현 전 관찰**: **red** — API 37에서 원 157px(안쪽 흰 면 127px) 안에 그림 72px, 양옆 흰 띠 27px씩. 이 절차의 `iconedge`는 구현 전 캡처(계약 단계의 홈 하단 줄 PNG)에서 FAIL을 내는 것을 확인했다(가장자리부터 주황이 아닌 구간 11px 이상 — 복숭아색 테두리 뒤 흰 띠).
- **관찰(판정하지 않는다) — 움직임 효과의 이음매**: 전경은 정사각 그림 전체를 80dp로 줄여 놓은 것이고 배경은 단색이라, 런처가 레이어를 따로 움직이면 정사각 경계가 드러날 수 있다(계약 §14 위험 5). 아래를 찍어 **보이는지 · 안 보이는지**를 적는다(런처마다 다르다).
  ```sh
  XC=$(( (X0 + X1) / 2 )); YC=$(( (Y0 + Y1) / 2 ))
  A shell input swipe $XC $YC $XC $YC 3000 &  sleep 1.5; shot L4-longpress; wait       # 길게 누르는 중
  A shell input swipe $XC $YC $(( XC + 80 )) $(( YC - 120 )) 3000 &  sleep 1.8; shot L4-drag; wait   # 끄는 중 (API 30 에서 찍혔다)
  A shell input keyevent KEYCODE_HOME
  # API 37 은 위의 swipe 로 끄는 중이 찍히지 않았다(실행 ① — 홈 화면만 찍혔다). motionevent 로 끌며 찍는다(아이콘이 그 자리로 옮겨진다):
  #   dragicon $XC $YC <빈 칸의 x> <빈 칸의 y> L4-drag        # 목적지는 스크린샷에서 빈 칸의 가운데를 읽는다
  ```
  `L4-longpress.png` · `L4-drag.png`을 열어 아이콘의 정사각 경계(그러데이션 정사각과 단색 주황 배경이 만나는 선)가 보이는지 적는다.

### L5 — API 37 다크 모드에서도 같은 색 (AC1)

- **기기 · 빌드**: Pixel_8 · bundled. 계약에 `-night` 변형이 없으므로(규칙 `night-variant`) 어느 모드에서도 같은 값이어야 한다.
- **조작 · 캡처**
  ```sh
  A shell cmd uimode night yes; sleep 1; A shell cmd uimode night            # Night mode: yes
  early L5 1.6
  A shell cmd uimode night no; A shell cmd uimode night                       # Night mode: no — 항목 안에서 되돌린다
  python3 "$TOOLS/px.py" expect "$OUT/L5.png" '#F46B18' 0 status,top,centre,centreL,low,nav
  python3 "$TOOLS/px.py" center "$OUT/L5.png" 400
  ```
- **판정**: L2와 같다(여섯 점이 정확히 `#F46B18`, 가운데 400x400에 다른 픽셀 0).
- **구현 전 관찰**: red(L2와 같은 이유). 구현 전의 다크 모드 값은 재지 않았다.

### L6 — 실행 뒤 창 배경(주황)이 드러나지 않는다 (계약 §6.5 · 추론 3)

**계약의 추론 3**을 닫는 항목이다. `MainActivity`는 실행 뒤에도 창 배경을 주황으로 둔다(U4 — Java 변경 0). Lynx가 그리지 않는 틈이 있으면 그 주황이 드러난다.
앞선 작업의 Android 캡처 19장에서는 창 배경이 절반 이상을 차지한 줄이 0이었지만 **키보드가 열린 캡처는 없었다.**

- **판정(모든 소항목 공통)**: 앱 영역에서 **가로줄의 절반 이상이 정확히 `#F46B18`인 줄이 0**(`px.py rows`의 PASS). 하나라도 있으면 U4를 다시 연다(`MainActivity`가 첫 화면 뒤 창 배경을 `#FFFDFC`로 바꾸는 계약 — `logic`부터).
  `rows`는 「양 끝이 모두 주황인 줄」도 함께 센다. 주황 줄이 있는데 양 끝이 주황이 아니면 화면 안의 주황 버튼일 수 있다 — 스크린샷을 열어 확인하고 **그 사실을 적되 판정은 `rows`의 줄 수로 한다**.
- **구현 전 관찰**: 가드 — 구현 전에는 주황 창 배경이 없어 항상 0이다. **구현 뒤의 결과만 뜻이 있다.**

**(a) 키보드가 열릴 때 · (d) 화면 전환 중** — 같은 픽스처 한 번(180초)으로 한다. **로그인 화면에는 입력칸이 없다**(전화번호 수단 숨김). 코드로 확인한 입력칸이 있는 화면은 둘이다:
피드백 화면(`FeedbackScreen`의 메시지칸 — 설정 탭의 「Send feedback」)과 인증번호 화면(`VerificationCodeScreen` — 전화번호 수단이 숨겨져 있어 닿지 않는 것으로 코드를 읽고 판단했다). 그래서 피드백 화면을 쓴다.

- **준비**: debug APK + 계측 APK 설치, 번들 서버(위 `BUNDLE`), 시작 전 전역 설정. 키보드가 안 뜨는 AVD(하드웨어 키보드 설정)면 `A shell settings put secure show_ime_with_hard_keyboard 1`(끝에서 시작 값으로 되돌린다).
  ```sh
  fixture() {   # 픽스처를 시작한다(최대 180초). 백그라운드로 돈다 — 진입에 25초쯤 걸린다
    A shell pm clear "$PKG" >/dev/null
    [ "$(A shell getprop ro.build.version.sdk | tr -d '\r')" -ge 33 ] && A shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS
    A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest \
      -e audioProgress true -e bundleUrl "$BUNDLE" \
      "$PKG.test/androidx.test.runner.AndroidJUnitRunner" >"$OUT/fixture.log" 2>&1 &
  }
  stop_fixture() { A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE; }
  ```
  (정본은 [Android 화면 방향과 구성 변경](android-orientation.md)의 「기준 화면」 `fixture`다.) 진입 조작을 미리 정리해 두고, 180초가 모자라면 그 항목을 처음부터 다시 한다. `STOP` 뒤에는 4초 이상 둔다.
- **조작 · 캡처**
  ```sh
  fixture; sleep 30; dumpb "Journey"                       # Journey, selected 가 나오면 맵
  # (d) 화면 전환: 탭 전환과 화면 열기 직후를 연속으로 찍는다(각 줄 사이에 sleep 없음)
  tapdesc "Settings"; for N in 1 2 3; do shot L6d-tab-$N; done
  tapdesc "Send feedback"; for N in 1 2 3; do shot L6d-open-$N; done
  # (a) 키보드: 메시지칸을 누르고 열리는 동안과 열린 뒤
  tapdesc "Anything else"; for N in 1 2 3; do shot L6a-opening-$N; done
  sleep 1.5; A shell dumpsys input_method | grep -E 'mInputShown|isInputShown' | head -2     # true 여야 한다. false 면 키보드가 안 뜬 것 — 판정하지 않고 사유를 적는다
  shot L6a-keyboard
  for F in L6d-tab-1 L6d-tab-2 L6d-tab-3 L6d-open-1 L6d-open-2 L6d-open-3 L6a-opening-1 L6a-opening-2 L6a-opening-3 L6a-keyboard; do
    echo "== $F"; python3 "$TOOLS/px.py" rows "$OUT/$F.png"
  done
  stop_fixture
  ```
  `tapdesc`가 노드를 못 찾으면(「no node」) 스크린샷을 열어 좌표를 직접 읽어 `A shell input tap <x> <y>`로 누르고 사실을 적는다(Lynx 화면의 `content-desc` 이름은 화면 문구를 따른다: 설정 탭 `Settings`, 항목 `Send feedback`, 메시지칸 라벨 `Anything else you'd like to tell us? (optional)`).
  키보드가 연 동안 화면이 위로 밀리거나 줄어드는 것은 정상이다 — 판정은 주황 줄뿐이다.

**(b) 분할 화면**

- **조작**: [Android 화면 방향과 구성 변경](android-orientation.md)의 O6 조작 1 · 2를 따른다(최근 앱 → 앱 카드 머리글 → `Split screen` → 아래 앱으로 설정 앱). 앱을 **위쪽**에 둔다. 좌표는 스크린샷으로 확인한다.
  ```sh
  sleep 3; shot L6b-split; echo "lynx: $(lynxbounds)"       # 예: 0,0-1080,1187 — 세로 모양 영역
  python3 "$TOOLS/px.py" rows "$OUT/L6b-split.png" 0,0,1080,1187      # 박스는 lynxbounds 의 오른쪽 · 아래 값으로 바꾼다
  ```
  가로 모양 영역(분할선 y≈800, 영역 약 1080x823)에서도 같은 명령으로 한 장 더 찍어 기록한다 — 거기서는 시스템이 세로 창을 가운데 세우고 좌우를 비운다(레터박스). **판정은 세로 모양 영역에서 하고, 가로 모양은 관찰로 적는다**
  (레터박스 바탕은 시스템이 칠하는 것이라 창 배경이 아닐 수 있다). 분할선을 아래 끝으로 끌어 전체 화면으로 돌아온다. 분할에 못 들어가면 「닿지 못함」으로 적는다.

**(c) 최근 앱 화면에서 돌아온 직후**

- **조작**: 첫 화면(온보딩)이 선 상태에서 최근 앱을 열고 앱 카드를 눌러 돌아온다.
  ```sh
  A shell input keyevent KEYCODE_APP_SWITCH; sleep 1.5; shot L9-recents      # 카드 위치를 눈으로 확인한다(L9에서도 쓴다)
  A shell input tap 540 1200; shot L6c-0; sleep 1; shot L6c-1                  # 좌표는 L9-recents.png 에서 앱 카드의 가운데로 바꾼다
  for F in L6c-0 L6c-1; do echo "== $F"; python3 "$TOOLS/px.py" rows "$OUT/$F.png"; done
  ```

**(e) 구성 변경 — 다크 모드 · 화면 크기** (첫 화면에서; 재생성은 L10 R1이 따로 본다)

- **조작**: bundled로 콜드 스타트해 온보딩이 선 뒤(`A shell am start -n "$ACT"; sleep 6`).
  ```sh
  A shell cmd uimode night yes; sleep 0.2; shot L6e-night-0; sleep 2; shot L6e-night-1; A shell cmd uimode night no
  A shell wm size 1080x1920; sleep 0.2; shot L6e-size-0; sleep 2; shot L6e-size-1; A shell wm size reset
  for F in L6e-night-0 L6e-night-1 L6e-size-0 L6e-size-1; do echo "== $F"; python3 "$TOOLS/px.py" rows "$OUT/$F.png"; done
  ```
- 번들 로드 실패 때의 창 배경은 L8이 다룬다.

### L7 — 시작 구간의 상태바 아이콘 (AC3의 시작 구간 · 추론 2) — r02: L7-a ~ L7-e

- **기기 · 빌드**: Pixel_8 · R6_API30 · bundled. **계약의 추론 2**의 API 37 쪽과 API 30 전체를 닫는다. L1 · L2 · L3 · L5의 캡처 · 영상을 쓴다 — 새로 찍는 것은 없다.
- **왜 r02에서 갈랐나**(계약 r02): 시작 창의 상태바 아이콘 명암은 **API 30 이하에서는 테마의 `windowLightStatusBar`를 따르고, API 31+의 시스템 스플래시에서는 플랫폼이 스플래시 배경색으로 정한다**(앱이 테마로 바꿀 수 없다 — API 37 실측 2×2).
  배경이 주황 `#F46B18`이면 API 37 시작 구간은 **흰 아이콘**이고, 앱의 창이 드러나면 어두운 아이콘으로 **한 번 뒤집힌다**. 이 변화를 받아들이는 것이 계약의 기본값(선택지 A)이었고 **사용자가 확정했다**(U7 — 2026-10-06). 시작 구간 내내 밝은 아이콘으로 통일하는 선택지 B는 채택하지 않는다 — 낮은 대비 구간이 오히려 길어진다는 것이 접근성 점검의 판단이다(ADR-0049 「버린 대안」).
  그래서 r01의 「두 프레임 모두 어두운 아이콘」은 **API 30 이하에만** 남고(L7-d), API 31+는 명암을 판정하지 않고 대비만 본다(L7-a).
- **재는 방법(고정)**: 상태바 띠 = 화면 높이의 0.5% ~ 3.5%. 띠의 최빈색을 **배경**, 배경에서 가장 먼 색을 **아이콘**으로 본다(아이콘의 가장 밝은/어두운 속 픽셀). **대비는 `#F46B18` 상수가 아니라 그 띠의 실제 배경과 잰다**
  (r02 결함 D5: 예전 `px.py strip`은 상수와 비교해, 흰 `#FAFAFA` 위 검정 아이콘도 「6.96:1」로 읽었다 — 실제 배경과는 20.12:1). 배경과 채널 차가 40 미만이면 「아이콘이 구별되지 않음」으로 실패.
  `frames`가 영상 프레임마다 같은 정의로 `icon=` · `ibg=`를 낸다(`judge.py`가 읽는다).
- **L7-a는 판정이 아니다 — 받아들인 값의 기록이다.** `px.py strip … contrast`는 띠에서 배경과 가장 먼 색 **하나**의 대비가 3.0 이상인지만 본다. 주황 `#F46B18` 위에서는 흰색(3.016)도 검정(6.963)도 넘으므로 **이 기준은 실패할 수 없다**
  (걸리는 것은 배경이 한 단계 밝아져 — 예 `#F56B18` — 순백이 3.00이 되는 경우 정도다). 시계(텍스트)와 아이콘을 가르지도 않는다. 그래서 도구가 `PASS`를 내도 **통과로 세지 않고**, 아래 값을 기록한다.
- **기록하는 값**(무손실 캡처에서만 — 영상은 코덱이 주황을 `#F16A15`, 흰색을 `#FEFEFE`로 옮겨 같은 자리가 3.08:1로 읽힌 적이 있다):
  1. **색 쌍의 대비** — `px.py strip <PNG> contrast`가 내는 「실제 배경과의 대비」. 지정된 두 색의 산술값이다.
  2. **픽셀 분포** — `px.py dist <PNG>`. 캡처 위 160줄(전폭)의 최빈색을 배경으로, 배경과 한 채널이라도 다른 모든 픽셀을 전경으로 세고, 가로로 12px 넘게 떨어진 묶음으로 갈라 맨 왼쪽을 시계, 나머지를 아이콘으로 본다.
     **시계 묶음의 「4.5 이상」 픽셀 비율**과 **전체의 「3.0 이상」 픽셀 비율 · 평균**을 적는다. **`px.py dist`는 저장된 캡처에만 돌았다 — 기기에서 새로 찍은 캡처에 이 문면대로 돌린 적은 없다.** (접근성 점검이 쓴 방법을 이 문서의 도구로 옮긴 것이고, 같은 캡처에서 그 점검의 수치와 같은 값을 낸다.)
  ```sh
  python3 "$TOOLS/px.py" strip "$OUT/L2.png" contrast      # 색 쌍의 대비(도구의 PASS 는 통과로 세지 않는다)
  python3 "$TOOLS/px.py" dist "$OUT/L2.png"                # 시계 · 아이콘 · 전체의 4.5 이상 · 3.0 이상 픽셀 비율과 평균(늘 종료 0)
  ```
- **받아들인 값**(2026-10-06, API 37 에뮬레이터 — 사용자가 이 수치를 보고 받아들였다. [ADR-0049](../adr/0049-android-launch-appearance.md)의 「이 작업이 만든 변화」):

  | | 구현 전 시작 구간 | **구현 뒤 시작 구간** | 구현 뒤 JS 스플래시(앱의 창) |
  |---|---|---|---|
  | 배경 / 아이콘 | `#FAFAFA` / `#000000` | `#F46B18` / `#FFFFFF` | `#F46B18` / `#000000` |
  | 색 쌍의 대비 | 20.12:1 | **3.016:1** | 6.963:1 |
  | 시계 — 4.5 이상인 픽셀 | 68.9% | **0%** | 65.9% |
  | 전체 — 3.0 이상인 픽셀 | 77.5% | 63.4% | 76.1% |
  | 전체 — 픽셀 평균 대비 | 13.83 | **2.60** | 5.54 |

  - **3.016:1은 색 쌍의 산술값이고 여유가 사실상 0이다.** 주황 위에서 「3.0 이상」은 곧 「정확히 `#FFFFFF`」다 — 둘째로 밝은 `#FFFEFE`가 이미 2.996이다. 가장자리가 한 단계만 섞여도 3.0 아래다.
  - **띠 안의 시계는 텍스트다.** 대응하는 기준은 WCAG 1.4.3의 4.5:1이고 흰색의 상한이 3.016이라 닿는 픽셀이 0이다. 아이콘에는 1.4.11의 3:1이 대응하고 색 쌍으로는 넘는다. 「기준을 넘는다」로 요약하지 않는다.
  - 「전체 3.0 이상」 비율은 캡처마다 흔들린다 — 시계의 숫자와 셀룰러 막대의 꺼진 칸 수가 달라서다(접근성 점검의 여덟 장 58.4 ~ 66.8%). 실행 ③의 한 장이 71.1%로 그 범위 밖인 것은 **상태바의 알림 글리프가 다른 캡처라서다** — 그 묶음이 150픽셀(가장 먼 색 `#FEF1E9`, 3.0 이상 0%)이고 다른 캡처는 방패 외곽선 667픽셀(3.0 이상 25.2%)이다(`px.py dist`의 묶음 줄). 낮은 픽셀이 많은 묶음이 작아져 전체 비율이 올랐을 뿐 대비가 나아진 것이 아니다. 구현 전에도 77.5%였다 — **나빠진 정도를 보여 주는 것은 이 비율이 아니라 색 쌍의 값 · 시계의 4.5 이상 비율 · 평균이다.**
  - 구현 뒤 시작 구간의 열은 계약 단계의 캡처(HEAD 그대로의 빌드)를 접근성 점검이 잰 값이고, 이 문서의 `px.py dist`로 다시 재어 같은 수를 얻었다.
  - 흰 아이콘 구간의 길이는 에뮬레이터 여섯 실행에서 3.13 ~ 4.27초였다(느린 16 KB 페이지 이미지의 값 — 실기는 재지 않았다).

| id | 기기 | 무엇을 | 판정 | 명령 · 도구 |
|---|---|---|---|---|
| L7-a | API 37 (API 31+) | 시스템 스플래시 구간의 **무손실** 한 장(L2의 캡처 `L2.png`, 다크 모드의 `L5.png`) | **판정하지 않는다 — 기록한다**: 색 쌍의 대비, 시계의 4.5 이상 픽셀 비율, 전체의 3.0 이상 픽셀 비율 · 평균. 명암도 판정하지 않는다(플랫폼이 스플래시 배경색으로 정한다) | `px.py strip … contrast` + `px.py dist …`(위) |
| L7-b | API 37 | 영상에서 F1 프레임과 그 다음 프레임 | 어두운 아이콘(아이콘의 상대 휘도 < 0.1)이고 구별된다(채널 차 ≥ 40) | `vid 37 L1-1`의 「L7-b」 줄 |
| L7-c | API 37 | 영상의 [F0, F1) 전체 | 아이콘 명암이 바뀌는 횟수 **≤ 1**이고 방향이 **밝음 → 어두움**(되돌아가지 않는다). 바뀐 프레임이 J0보다 앞인지 뒤인지와 그 시각은 **적기만 한다**(판정하지 않음) | `vid 37 L1-1`의 「L7-c」 줄 |
| L7-d | API 30 (30 이하) | 영상의 F0 · F0 다음(구간 안에 있을 때) · J0(있으면), 그리고 무손실 한 장(L3의 캡처) | 어두운 아이콘(휘도 < 0.1)이고 **실제 배경과의 대비 ≥ 3.0:1** | `vid 30 L3-1`의 「L7-d」 줄 + `python3 "$TOOLS/px.py" strip "$OUT/L3-lossless.png" both` |
| L7-e | API 30 | 영상의 F0 뒤(와 F0 앞의 창이 덮인 뒤 구간) | status 점이 회색(`#757575` ± 16)인 프레임 0장, nav 점이 어두운(세 채널 모두 < 64) 프레임 0장 | `vid 30 L3-1`의 「L7-e」 줄 |

- `judge.py`는 이 행들을 「L7-x 판정: PASS / FAIL / 판정 불가」로 낸다. 프레임 표에 `icon` 열이 없으면 판정 불가다(옛 표 — 「저장된 영상 다시 판정」).
- **L7-e는 F0 앞도 본다**: 시작 창의 회색 띠 · 검정 내비게이션 바는 창 안쪽 세 점(top · centreL · low)이 이미 덮인 뒤 status · nav만 아직 따라오지 않은 프레임에 나타난다. r02의 F0는 status · nav까지 같아진 프레임이라 그 프레임들이 F0 **앞**에 놓인다 —
  「F0 뒤」만 보면 구현 전 영상(`cold30-bundle404.mp4`)도 통과해 버린다. 그래서 `judge.py`는 창 안쪽 세 점이 덮인 프레임부터 F0 앞까지에서 status가 `#757575` ± 16인 프레임과 nav가 순검정(세 채널 모두 16 이하)인 프레임도 센다
  (런처 확대 프레임의 가장자리 표본 `#B18795` · `#251032`는 이 색이 아니라 걸리지 않는다). **이것은 test-plan r02의 문면(「F0 뒤」)보다 넓다 — 이 문서가 넓힌 이탈이다.** test-plan이 다르게 정하면 `judge.py`의 해당 줄만 고친다.
  이탈은 실행으로 확인됐다(실행 ②): 구현 뒤 API 30 영상 넷(저장 2 + 새 2)에서 F0 앞 구간의 회색 0장 · 순검정 0장 — **넓힌 구간이 거짓 FAIL을 내지 않았다.** 구현 전 `cold30-bundle404`는 FAIL(회색 12장 · 순검정 11장)이었다 — 넓히지 않으면 잡지 못하는 프레임들이다.
- **L7-b의 「F1 프레임」**은 top이 주황을 벗어난 첫 프레임이다. API 37에서는 첫 화면이 곧바로 서므로(F1 = F1′) 첫 화면의 프레임이다. API 30의 교차 페이드 프레임은 L7-d에 넣지 않는다.
- PNG로 뽑아 눈으로 보고 싶으면 `judge.py`가 적는 인덱스(「PNG로 뽑을 프레임 인덱스」)로 `"$TOOLS/frames" "$OUT/L1-1.mp4" --save <i>,<j> --out "$OUT/L7-37"` 한 뒤 `px.py strip <PNG> dark`로 명암만 읽을 수 있다(영상 프레임이라 대비는 참고).
- **구현 전 기대**: **L7은 구현 전 red가 아니었다**(r02 정정). 구현 전 API 37 시스템 스플래시(`#FAFAFA`)의 아이콘은 `#000000`이었다(`px.py strip artifacts/spec/api37-system-splash.png` PASS — 실제 배경과 20.12:1).
  앞 판의 「구현 전 관찰: red — `#FAFAFA` 위 약 1.04:1」은 **재현되지 않았다.** API 30의 회색 띠는 구현 전 영상 둘 중 `cold30-bundle404.mp4`에만 있다(`cold30.mp4`에는 옅어지는 꼬리뿐). **L7은 red 증거로 세지 않는다.** L7-e만 `cold30-bundle404.mp4`로 구현 전 FAIL을 재현할 수 있다(위의 F0 앞 구간 덕분).
- **L7-a의 기록이 받아들인 값과 달라지면**(색 쌍의 대비가 3.016이 아니다 · 시계의 4.5 이상 비율이 0이 아니다 · 아이콘이 흰색이 아니다 — 다른 기기 · API 수준 · 토큰 색 변경): 통과 · 실패를 매기지 말고 값을 그대로 보고한다. 받아들인 것은 위 표의 값이다 — ADR-0049의 재검토 조건이 그 뒤를 진다.
- **서면**: API 31+ 시작 구간의 흰 아이콘과 한 번의 뒤집힘은 **사용자가 받아들인 모양**이다(U7 — 2026-10-06, 위 수치와 L11의 관찰을 보고받은 뒤의 결정). L7-c가 PASS이고 L7-a의 기록이 위 표와 같으면 그 사실을 적는다. 이 절차가 U7을 뒤집지는 않는다.

### L8 — 번들을 읽지 못하면 끝없는 주황 (계약 §2.4 · §12)

- **기기 · 빌드**: Pixel_8 · R6_API30 · **debug**(bundled는 `bundle-url`을 무시한다). 이전에는 이 화면이 회백색(`#FAFAFA`)이 끝까지 남았다(8초 이상, 계약 §2.2 실행 A) — 「빈 흰 화면」을 실패 신호로 적은 문서가 낡는다는 뜻이다.
- **조작 · 캡처**
  ```sh
  A shell am force-stop "$PKG"; A shell input keyevent KEYCODE_HOME; sleep 2
  A shell am start -n "$ACT" --es bundle-url http://10.0.2.2:9/none.bundle; sleep 6
  shot L8-bundle-fail
  python3 "$TOOLS/px.py" samples "$OUT/L8-bundle-fail.png"
  python3 "$TOOLS/px.py" expect "$OUT/L8-bundle-fail.png" '#F46B18' 0 status,top,centre,centreL,low
  python3 "$TOOLS/px.py" center "$OUT/L8-bundle-fail.png" 400
  sleep 5; shot L8-bundle-fail-11s; python3 "$TOOLS/px.py" expect "$OUT/L8-bundle-fail-11s.png" '#F46B18' 0 top,centre,low     # 끝없이 이어지는지
  front; A shell am force-stop "$PKG"
  ```
- **판정**: 6초 · 11초 뒤 모두 **status · top · centre · centreL · low가 정확히 `#F46B18`**, 가운데 400x400에 다른 픽셀 0, 앱이 앞에 남아 있다(`front`가 `MainActivity`). nav는 **값만 적는다**(API 30의 3버튼 가림막 때문 — L3과 같은 이유; API 37에서는 정확히 주황이 나오는지 함께 적는다).
- **구현 전 관찰**: **red** — `#FAFAFA`가 8초 이상(API 30 실측). API 37은 구현 전에 이 상황을 재지 않았다.
- **뜻**: 이 화면은 시스템 스플래시도 JS도 아닌 **창 배경만 남은 상태**다. 주황이면 「창 배경 = 주황」이 실제 창에서 맞다는 직접 증거이기도 하다(추론 3의 다른 쪽).

### L9 — 런처 밖의 아이콘과 움직임 효과 (AC2 · 관찰)

판정 기준이 없는 **관찰 항목**이다. 보이는 모양을 적는다. 구현 전과 달라지는 것(원 안의 작은 정사각 → 가득 찬 그림)이 기대다.

- **최근 앱 화면**: L6 (c)에서 찍은 `L9-recents.png`을 연다. 카드 머리글의 앱 아이콘이 흰 원 안의 작은 그림이 아니라 가득 찬 주황 그림인가. 카드 안의 미리보기(앱 화면)는 아이콘과 무관하다.
- **설정의 앱 정보**
  ```sh
  A shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d "package:$PKG"; sleep 2; shot L9-appinfo
  A shell input keyevent KEYCODE_HOME
  ```
  `L9-appinfo.png` 맨 위의 앱 아이콘이 L4와 같은 모양인가. (설정 앱의 아이콘은 마스크가 없는 정사각 · 원일 수 있어 모양 자체는 런처와 다를 수 있다 — 흰 바탕이 끼는지만 본다.)
- **알림의 아이콘**: 작은 아이콘은 `ic_notification`이고 큰 아이콘을 쓰지 않으므로 **바뀌지 않아야** 한다. 픽스처(L6)가 선 상태에서 [Android 시스템 뒤로가기](android-system-back.md)의 B9 (b)의 방송(`POST_PUSH_FIXTURE`)으로 알림을 띄운다.
  - **`pm clear` 뒤에는 알림 권한을 다시 준다**(API 33 이상): `A shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS`. 권한이 없으면 알림이 뜨지 않는다 — 실행 ①에서 「알림이 셰이드에 잡히지 않음」이었던 가장 유력한 원인이다(추론 — 권한을 준 실행 ②에서 잡혔다). 위 `fixture()`는 이 줄을 이미 돈다. 픽스처 뒤에 `pm clear`를 따로 했다면 다시 준다.
  - **알림에 실린 작은 아이콘은 `dumpsys`로 확인한다**(셰이드의 모양으로 판단하지 않는다):
    ```sh
    A shell dumpsys notification --noredact | grep -A1 "pkg=$PKG" | grep -o 'icon=Icon([^)]*)'      # icon=Icon(typ=RESOURCE pkg=libitum.duru.android id=0x7f……)
    # 그 id 의 리소스 이름: 설치한 APK 에 aapt2 를 돌린다(build-tools 36.0.0 — `resource 0x… <type>/<name>` 줄). drawable/ic_notification 이어야 한다
    "${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools/36.0.0/aapt2" dump resources apps/android/app/build/outputs/apk/debug/app-debug.apk | grep -i "<위의 id>"
    ```
    첫 줄은 실행 ②의 저장된 `dumpsys` 출력으로 돌려 확인했다. 큰 아이콘은 같은 `--noredact` 출력에서 이 앱 알림의 `extras`에 `android.largeIcon`이 없는지 읽는다(명령으로 굳히지 않았다 — 출력을 연다).
    실행 ②(API 37): `icon=Icon(typ=RESOURCE pkg=libitum.duru.android id=0x7f070080)` = `drawable/ic_notification`, 알림 id 1001 · 채널 `duru-updates`, 큰 아이콘 없음.
  - **셰이드 캡처는 3초 이상 기다린 뒤 찍는다**: `A shell cmd statusbar expand-notifications; sleep 3.5; shot L9-notification`. 1초 뒤의 캡처는 셰이드가 펼쳐지는 도중이라 알림이 보이지 않았다.
  - **셰이드에 보이는 모양은 관찰로만 적는다.** API 37 에뮬레이터의 셰이드는 알림 머리 자리에 **가득 찬 주황 앱 아이콘(꽃잎)** 을 보여 줬다 — 단색 윤곽이 아니다. 상태바에는 일반 종 아이콘이 보였고 Duru 글리프는 없었다.
    앞 판의 「알림 머리의 작은 아이콘이 단색 윤곽인가」는 이 셰이드에서 판정 문구로 쓰면 오판이다(r02 실행의 E4). 플랫폼이 셰이드에 앱 아이콘을 보여 주는 것으로 본 것은 추론이고, **이 변경 전의 모양과 대조하지 않았다** — 적응형 아이콘이 들어가며 달라진 것인지 알 수 없다.
- **런처의 움직임 효과**: L4의 관찰 항목(길게 누르기 · 끌기)과 같은 것이다. 결과를 한 곳에 적는다.

### L10 — 앞선 작업 회귀 스모크 (AC4)

테마가 `Theme.Material.Light.NoActionBar`에서 `Theme.Duru`로 바뀌었다. 앞선 작업이 `MainActivity`에서 코드로 적는 설정(`layoutEdgeToEdge`)과 부딪치지 않는지만 본다. **각 문서의 전체 절차를 다시 돌리지 않는다** — 아래 최소 확인이다.

| id | 앞선 작업 | 최소 확인 | 판정 |
|---|---|---|---|
| R1 | 구성 변경 뒤 재생성 없음([android-orientation.md](android-orientation.md) O2) | bundled로 첫 화면이 선 뒤 `mark; A shell cmd uimode night yes; sleep 1.5; lc; A shell cmd uimode night no; sleep 1.5; lc` | 두 `lc` 모두 `create: 0 destroy: 0 relaunch_resume: 0`(`mark` 한 번이므로 합계). 화면이 같은 첫 화면 |
| R2 | edge-to-edge · safe area([android-orientation.md](android-orientation.md) O3, ADR-0044) | 첫 화면에서 `appframe`과 `shot R2`, `python3 "$TOOLS/px.py" expect "$OUT/R2.png" '#FFFDFC' 16 status,top` | `appframe`이 ` frame=[0,0][<화면 폭>,<화면 높이>]`(앱 창 전체 — 상태바 · 내비게이션 바 자리까지 덮는다), 상태바 영역(status 점)과 top 점이 첫 화면 셸 색 `#FFFDFC` ± 16(투명 상태바 위에 앱이 그려진다 — 회색 띠 · 검정 띠 없음). `appframe`은 기기에서 확인됐다(실행 ② — ` frame=[0,0][1080,2400]`). **`lynxbounds`로 판정하지 않는다** — 온보딩 화면에서 실행 ①은 빈 값, 실행 ②는 `0,0-1080,2400`이었고 빈 값이 나오는 조건을 모른다(결함 D7은 재현되지 않았다) |
| R3 | 3버튼 탭 바 위치([android-navigation-insets.md](android-navigation-insets.md) N1) | 그 문서의 N1 한 번만(3버튼 전환 · 160 dpi 조건 포함 — 그 문서의 「전제」를 따른다) | 그 문서의 N1 판정 그대로. 끝나면 내비게이션 모드 · 크기 · 밀도를 시작 값으로 되돌린다 |
| R4 | 시스템 뒤로가기([android-system-back.md](android-system-back.md) B7) | `pm clear` 뒤 bundled를 켜 온보딩 1단계(`Step 1 of 3`)에서 `A shell input keyevent KEYCODE_BACK; sleep 1.5; front` | 앱이 떠난다(앞이 `MainActivity`가 아니다 — 런처). 그 문서의 B7 (b) 마지막 단계와 같다 |

R1 · R2는 `integration`의 IC4(`isAppearanceLightStatusBars` · inset)가 기기 안에서 같은 것을 본다 — 이 두 줄은 화면에서의 확인이다.

### L11 — 앱이 떠 있는 동안 밝은 화면 위로 주황이 번쩍이는가 (관찰 · 리뷰 후속)

창 배경이 주황이 되면서 생긴 물음이다: **앱이 밝은 화면(`#FFFDFC`)을 보이는 중에 새 창이 잠깐 뜨는 경로**에서 주황이 화면을 덮었다 사라지는가.
특히 `PushNotificationTapActivity` — 알림을 누르면 뜨고 `onCreate`에서 곧바로 `MainActivity`를 띄운 뒤 끝나는 중계 Activity — 가 `<application>`의 `Theme.Duru`(주황 창 배경 · 주황 스플래시)를 **물려받는다**(매니페스트에 그 Activity의 테마가 따로 없다).
구현 전에는 같은 경로의 창이 `#FAFAFA`라 밝은 화면 위에서 눈에 띄지 않았다. 리뷰가 추론으로 짚었고, 그 뒤 영상으로 봤다. **판정 기준이 고정된 항목이 아니라 관찰 항목이다** — 주황 프레임이 나오면 수와 시각을 그대로 보고한다.

- **기기 · 빌드**: Pixel_8 · debug + 픽스처(L6의 `fixture`, 번들 서버 `BUNDLE`). 알림은 [Android 시스템 뒤로가기](android-system-back.md)의 B9 (b) 방송(`POST_PUSH_FIXTURE`)으로 띄운다(L9와 같다 — 권한을 먼저 준다).
- **경로**(각 2회, 조작을 `screenrecord`로 찍는다 — `A shell "screenrecord --time-limit 10 /sdcard/<이름>.mp4"`를 백그라운드로 시작한 뒤 조작하고 `A pull`):

  | # | 경로 | 앞뒤 화면 |
  |---|---|---|
  | 1 | 알림 탭 — 앱이 앞(맵 화면)에 있을 때 | 맵 → 알림 셰이드 → 탭 → 앱의 알림 화면(`Notifications` — 밝은 화면이다) |
  | 2 | 알림 탭 — 홈 화면에서(앱은 백그라운드에 살아 있다) | 런처 → 셰이드 → 앱(알림의 목적지 화면) |
  | 3 | Custom Tab에서 복귀(모의 콜백 `duru://auth-callback?code=fake` — [출시 설정 절차](android-release-config.md) R4의 인텐트) | Custom Tab → 로그인 화면 |
  | 4 | 알림 권한 대화상자가 뜨고 닫힘(설정 탭 → `Notifications` → 허용) | 설정 화면 → 대화상자 → 설정 화면 |
  | 5 | 최근 앱 화면에서 복귀 | 홈 → 최근 앱 → 앱 |
  | 6 | 홈 화면의 아이콘으로 복귀(앱이 살아 있다) | 홈 → 앱 |

  권한 대화상자(4)는 `pm clear` 직후의 상태에서 찍는다 — `pm grant` / `pm revoke`를 거치면 권한 플래그가 바뀌어 대화상자 대신 시스템 설정 화면이 열렸다. 픽스처는 180초 뒤 끝나고 그때 알림도 사라진다(그 뒤에 찍은 영상은 버린다).
- **세는 법**: 프레임마다 화면이 주황으로 덮였는지 본다. 관찰 실행은 `frames`에 열을 더한 사본(가로줄을 8행 간격으로 훑어, 절반 이상의 점이 `#F46B18` ± 16인 줄이 전체의 50% 이상이면 「주황 프레임」)으로 셌다 — 그 사본은 이 문서에 없다.
  이 문서의 `frames`로는 아래처럼 센다(top · centreL · low 세 점이 모두 주황 ± 16인 프레임). **저장된 영상 13개에서 두 방법의 수가 같았다**(콜드 스타트 대조 21장, 나머지 12개 0장). **이 함수는 저장된 영상에만 돌았다 — 기기에서 이 문면대로 찍어 돌린 적은 없다.**
  ```sh
  orangeframes() {
    "$TOOLS/frames" "$1" | python3 -c '
  import re, sys
  n = hit = 0
  for line in sys.stdin:
      p = dict(re.findall(r"(top|centreL|low)=#([0-9A-Fa-f]{6})", line))
      if len(p) < 3: continue
      n += 1
      if all(abs(int(v[i:i + 2], 16) - c) <= 16 for v in p.values() for i, c in ((0, 0xF4), (2, 0x6B), (4, 0x18))): hit += 1
  print("프레임 %d · top · centreL · low 가 모두 주황(±16)인 프레임 %d" % (n, hit))'
  }
  orangeframes "$OUT/L1-1.mp4"        # 양성 대조 — 콜드 스타트 영상에서는 0이 아니어야 한다(도구가 주황을 잡는가)
  orangeframes "$OUT/L11-notif-fg-1.mp4"
  ```
- **관찰**(2026-10-06, HEAD `ede6f7fc`): **여섯 경로 각 2회, 영상 12개 모두 주황 프레임 0장.** 양성 대조(콜드 스타트 영상)는 21장. 알림 탭에서 `PushNotificationTapActivity`는 생성 뒤 약 0.3 ~ 0.5초에 파괴됐고(logcat) 그 사이의 영상 프레임은 셰이드가 접히는 프레임과 앱의 밝은 화면 프레임뿐이었다 — 주황 프레임은 없었다.
  알림을 누른 뒤 서는 화면은 맵이 아니라 **앱의 알림 화면**이다(앱이 앞에 있던 영상의 저장된 프레임에서 `Notifications` 제목을 이미지로 확인했다. 관찰 기록은 「맵」으로 적었었다 — 밝은 화면이라 결론은 같다. 홈에서 누른 영상의 프레임은 이미지로 열어 보지 않았다).
  구현 전 빌드(`a2fcf3ec`)의 대조는 경로 1 · 2 · 5 · 6만 했다(주황 0 — 그때 창 배경은 `#FAFAFA`이고, 그 색은 영상에서 앱의 밝은 화면과 구별되지 않아 「구현 전에 창이 보였는가」는 세지 못했다).
- **한계 — 「없다」가 아니라 「이 방법으로 보이지 않았다」다**:
  - `screenrecord`는 화면이 바뀔 때만 프레임을 낸다. **약 0.1 ~ 0.2초 미만의 노출은 배제하지 못한다.** 저장된 프레임 표 12개의 프레임 간격을 직접 읽으면, 15 ms대(12 ~ 13 ms) 간격으로 찍힌 것은 한 영상(알림 탭 — 앱이 앞, 첫 회)뿐이고 나머지 열한 영상의 **가장 짧은 간격이 64 ~ 90 ms**다.
    알림 탭의 셰이드 접힘 → 앱 구간의 간격은 96 ~ 212 ms였다(리뷰가 같은 표에서 읽은 값). 앞 판의 「전환 중 약 15 ~ 100 ms 간격 · 수십 ms 미만의 한 프레임」은 과소였다.
    「0장」이라는 관찰과 「중계 Activity가 살아 있던 0.3 ~ 0.5초 동안 주황 프레임이 없었다」는 그대로다 — 그보다 짧게 스친 노출이 있었는지를 이 영상으로는 말하지 못한다는 뜻이다.
  - API 37 에뮬레이터 한 대다. 실기 · 다른 API(특히 API 31 미만)는 보지 못했다.
  - **스냅샷 없는 웜 스타트는 재현하지 못했다** — 경로 5 · 6은 최근 앱 스냅샷이 있는 경우다. 시스템이 스냅샷 없이 시작 창을 그리면 주황이 보일 수 있다(추론).
  - **프로세스가 죽은 상태의 알림 탭은 돌리지 않았다** — 그 경로의 debug 앱은 `bundle-url` 없이 `MainActivity`를 열어 맥의 3000 포트 서버를 읽는다(실행 조건과 충돌). 정상 콜드 스타트라 주황이 보이는 것이 당연한 경로다.
  - 경로 3의 Custom Tab 페이지는 `example.invalid`의 오류 화면이었다. 구현 전 대조는 경로 3 · 4를 하지 않았다.
- **주황 프레임이 나오면**: 수 · 시각 · 경로를 보고한다. 고치는 방법은 이 문서가 정하지 않는다(접근성 점검이 낸 후보는 그 중계 Activity에 창을 만들지 않는 테마를 주는 것이다 — ADR-0049 「후속 과제」).

## 계약의 추론 셋 — 어느 항목이 닫는가

계약이 관찰 없이 이어 붙인 셋이다(`spec.md` §4 P5 · P9, §6.5). 구현 뒤 **관찰로만** 확인된다. 하나라도 어긋나면 관찰을 그대로 적고 실패로 보고한다 — 이 문서가 고치는 방법을 정하지 않는다.

| # | 추론 | 닫는 항목 | 어긋남의 모양 |
|---|---|---|---|
| 1 | 투명 `windowSplashScreenAnimatedIcon`(`splash_icon_none`)이 API 37 시스템 스플래시의 아이콘과 흰 원을 실제로 지운다 | L2(정본) · L1(F0의 centre) · L5 | 가운데에 흰 원 · 아이콘이 남는다 / 가운데 400x400에 주황이 아닌 점 |
| 2 | 시작 창이 테마의 투명 시스템 바 · 밝은 바 아이콘 설정을 따른다 — **API 30 이하에서는 따른다**(회색 상태바 띠와 검정 내비게이션 바가 사라진다). **API 31+의 시스템 스플래시는 따르지 않는다** — 플랫폼이 스플래시 배경색으로 명암을 정한다(계약 r02.2) | L3 · L7-d · L7-e (API 30) · L7-a ~ L7-c (API 37) | API 30: status가 `#747474`로 남는다 / nav가 검정 / 아이콘이 밝다. API 37: 아이콘이 두 번 이상 바뀌거나 어두움 → 밝음으로 바뀐다 / 첫 화면에서 아이콘이 어둡지 않다(L7-a의 대비는 어긋남의 기준이 아니다 — 판정이 아니라 받아들인 값의 기록이다) |
| 3 | 실행 뒤 창 배경(주황)이 드러나는 순간이 없다 | L6 (a) 키보드 · (b) 분할 · (c) 최근 앱 복귀 · (d) 화면 전환 · (e) 구성 변경 · L8(번들 로드 실패 — 이 경우는 드러나는 것이 정상이고 주황이어야 한다) | 가로줄의 절반 이상이 정확히 `#F46B18`인 줄이 생긴다 → U4를 다시 연다 |

### 추론 셋의 결론 (2026-10-06 실행 ① · ② — 관찰 · 한계 포함)

| # | 결론 | 근거 | 한계 |
|---|---|---|---|
| 1 | **성립** | L2 · L5 여섯 점이 정확히 `#F46B18`, 가운데 400x400 비주황 0 · 흰 점 0(실행 ① 2장 + 실행 ② 4장). L1 여섯 실행 모두 [F0, J0)에서 centre 비주황 0 | API 37에서 시스템 스플래시와 창 배경 구간은 픽셀로 가르지 못한다 |
| 2 | **API 30은 성립. API 37은 플랫폼이 정한다(어긋남이 아니라 규칙이 다르다)** | API 30: 회색 띠 0장, 검정 내비게이션 바 없음(`#FEF0E8`), 아이콘 어두움(무손실 `#622B0A` · 3.72:1). API 37: 시작 구간의 흰 아이콘(3.02:1)은 테마 속성과 무관하게 스플래시 배경색을 따른다(계약 r02.1의 2×2 실측), 앱이 뜬 뒤 어두운 아이콘 | API 37 에뮬레이터 하나. 문턱 · API 31 ~ 36 · 제조사 빌드는 모른다. L7-b ~ L7-e는 실행 ②에서 전부 통과했다. L7-a는 판정이 아니라 받아들인 값의 기록이다(색 쌍 3.016:1, 시계 글자는 4.5:1에 못 미친다) |
| 3 | **드러난 순간 없음** | 키보드 4 · 화면 전환 6 · 분할 2(+전체 복귀) · 최근 앱 복귀 2 · 구성 변경 4장 전부 rows 0. L8은 주황이 정상으로 나옴 | **단일 캡처**(0.2초 이상 간격)라 전환 중 프레임을 모두 보지는 않았다. 영상으로 전환 중을 훑는 일은 하지 않았다 |

## 범위 밖 관찰 기록란 — 판정에 넣지 않는다

계약 §2.4가 범위 밖으로 보고한 현상이다: **API 37에서 JS 스플래시의 손글씨 애니메이션 앞부분이 시스템 스플래시에 가려진다**(주황이 처음 보일 때 워드마크가 이미 절반 이상 써져 있었다 — 계약 §11 U6, 후속 후보).
이 변경 뒤에도 같은지 **수치로 적기만 한다.** L1 · L3의 `judge.py` 출력 마지막 줄 근처 「기록(판정 아님) 워드마크」가 낸다: 워드마크가 처음 보인 프레임(J0)의 흰 점 수 · 그 구간의 최대 흰 점 수 · 그 비율.

| 기기 | 실행 | F0 ~ J0 길이(초) | J0의 흰 점 / 최대 | 진행도(%) | 구현 전(참고) |
|---|---|---|---|---|---|
| Pixel_8 | L1-1 | 3.44 | 1614 / 2731 | 59 | 56%(계약의 다른 정의 · 실행 1) · 이 도구 정의로 구현 전 영상에서 57% |
| Pixel_8 | L1-2 | 2.47 | 1021 / 2726 | 37 | 91%(계약의 다른 정의 · 실행 2) |
| Pixel_8 | L1-3 | 3.13 | 1699 / 2725 | 62 | — |
| Pixel_8 | L1-4 | 3.34 | 2000 / 2740 | 73 | — |
| Pixel_8 | 실행 ② N-L1-1 | 4.27 | 1307 / 2743 | 48 | — |
| Pixel_8 | 실행 ② N-L1-2 | 3.25 | 1307 / 2735 | 48 | — |
| R6_API30 | 실행 ① L3-1 · L3-2 | **J0 없음** | — | — | 이 도구 정의로 6%(구현 전 debug + HTTP 번들 영상 — 빌드가 달라 직접 비교하지 않는다) |
| R6_API30 | 실행 ② N-L3-1 | 0.09 | 207 / 2701 | 8 | — |
| R6_API30 | 실행 ② N-L3-2 | **J0 없음** | — | — | — |

(실행 ①의 Pixel_8 네 줄(L1-1 ~ L1-4)은 e2e 실행이 적은 진행도 값이고, 길이 · 흰 점 수는 저장된 영상에서 r02 도구(F0는 r02 정의)로 다시 읽은 기록이다. 실행 ②의 줄은 그 실행의 프레임 표를 같은 도구로 읽었다 — 기록일 뿐 판정이 아니다.)

**정의가 계약의 것과 다르다**(계약은 「로고 띠의 흰 표본 3600 가운데 N」, 이 도구는 4px 간격 표본의 흰 점 수를 그 구간 최대로 나눈 값이다). 같은 영상에서는 구현 전 값 56% · 57%로 가까웠다. 비교는 참고용이다.
**읽는 법**: 새 빌드에서 J0의 진행도가 높다(예: 50% 이상)면 시스템 스플래시가 걷히는 순간 워드마크가 이미 써져 있다는 뜻이다 — 「주황 한 면 → 쓰다 만 워드마크가 갑자기 나타남」(계약 §2.4). 낮으면 가려지지 않는 것이다. 어느 쪽이든 이 작업의 판정이 아니다. API 30은 J0가 있을 때 진행도가 낮다(8%) — 가려지지 않는다.

### 워드마크가 아예 안 보이는 실행 — 워드마크 이미지의 간헐적 로드 실패 (실행 ②의 진단, 판정 아님)

> ⟨2026-10-07 적용 기록⟩ **이 절의 「모르는 것」은 닫혔다 — 원인과 수정은 [ADR-0051](../adr/0051-android-image-url-redirect.md)이 진다.**
> 원인은 Lynx 4.0.1 `LynxImageManager`의 경합이다: 호스트가 미디어 fetcher를 달아 두면 UI 스레드에서 들어온 `src`의 URL 재작성이 다른 스레드 풀로 넘어가고, 이미지 요청 작업이 재작성 전의 `/static/…`으로 먼저 나갈 수 있다.
> 호스트가 재작성을 동기 `ImageInterceptor`로 옮겼다(작업 `android-splash-wordmark`).
>
> - **아래 표의 실행 수는 그때의 기록으로 둔다.** 같은 종류의 빌드(수정 전 `bundled`)를 다시 잰 값은 API 30 70실행 가운데 5실행 · API 37 85실행 가운데 1실행이고, 아래의 「9실행 가운데 6실행」은 재현되지 않았다 — 빈도가 부하 · 타이밍에 흔들린다(이 문서의 실행에는 화면 녹화를 함께 돌린 실행이 섞여 있다). 수치와 조건은 ADR-0051의 「재현 빈도」.
> - **「API 30에서 잦고 API 37에서 드문 까닭」의 추론(시스템 스플래시 유무 · 시작 속도)은 근거가 없어졌다.** `pm clear` 직후가 조건인 것도 아니었다(`am force-stop` 뒤 · 첫 설치 직후에도 났다). `bundled` 빌드에만 있는 것도 아니었다(dev 빌드에서 더 잦았다).
> - **수정 뒤의 기대**: 워드마크가 매 실행 보인다. 수정이 든 빌드에서 「J0 없음」이 나오거나 아래 logcat 줄이 찍히면 **결함으로 적는다**(「범위 밖 관찰」이 아니다).
>   **예외 — dev 빌드(debug + HTTP 번들)의 늦은 도착**: 아래 logcat 줄이 **없고** 주황 화면이 약 4초 이어진 뒤 닫힌 실행은 그 결함이 아니다. dev 빌드만 워드마크를 HTTP로 받는데, 그 이미지가 스플래시 마운트 뒤 약 1.6초보다 늦게 뜨면 4초 안전 타이머가 재생보다 먼저 닫는다(수정 전 빌드에도 있던 성질).
>   (이미지가 타이머 전에 뜨면 쓰다 만 워드마크가 보여 J0가 있을 수도 있다 — 그때도 스플래시는 약 4초에 닫힌다.) 「J0 없음 · `onFailed` 없음 · 약 4초」로 적고 [스플래시 워드마크 절차](android-splash-wordmark.md)의 판정(LATE — 통과가 아니다)과 [ADR-0051](../adr/0051-android-image-url-redirect.md)의 「첫 e2e와 늦은 도착 증상」을 가리킨다. **이 문서의 판정 빌드인 `bundled`에서 같은 모양이 나오면 예외가 아니다** — 내장 빌드에서는 관찰된 적이 없으니 결함 후보로 적는다.
> - 고쳐졌는지를 자연 조건의 콜드 스타트 반복으로 확인하는 절차 · 횟수의 계산 · 항목별 실행 상태는 [Android 스플래시 워드마크](android-splash-wordmark.md)가 진다. 이 문서는 그 판정을 하지 않는다.
>
> 아래는 닫히기 전의 기록이다.

**「API 30의 `bundled` 빌드에서는 JS 스플래시 워드마크가 관찰되지 않는다」는 앞 판의 서술은 틀린 일반화였다**(실행 ①의 두 실행만 보고 적었다 — r02 실행의 E5). 실제는 **간헐적**이고, 원인은 이 변경이 아니라 워드마크 이미지의 로드 실패다.

| 빌드 · 기기 | 실행 수 | 워드마크가 안 보인 실행 | 내역 |
|---|---|---|---|
| HEAD `bundled` · API 30 | 9 | **6** | 실행 ①의 L3 둘(없음 2) + 실행 ②의 새 L3 둘(없음 1) + 진단 다섯(없음 3) |
| HEAD `bundled` · API 37 | 11 | **1** | 실행 ①의 L1 넷 + 실행 ②의 새 L1 둘 + 진단 다섯(없음 1) |
| 구현 전 `a2fcf3ec` `bundled` · API 30 | 6 | **4** | 일회용 사본에서 빌드(JS 번들은 같다 — `apps/mobile` 차이 0줄) |

- **로그가 일치한다**: 워드마크가 없는 실행에서만 logcat에 `E LynxImageManager: onFailed src:…/static/image/logo-handwriting.<해시>.webp, with reason: Unsupported uri scheme! Uri is: /static/image/logo-handwriting…`이 이미지 뷰 생성 10 ~ 40 ms 뒤에 찍혔다.
  있는 실행에는 그 줄이 없고 약 2.4초 뒤 `finalloopcomplete`가 왔다. 로그 16개(API 30 HEAD 5 · 구현 전 6 · API 37 5)에서 예외가 없었다.
- **코드**: `apps/mobile/src/screens/splash/SplashScreen.tsx`의 `<image>`가 `bindfinalloopcomplete={finish}` · `binderror={finish}`다. 이미지 로드 오류가 나면 스플래시가 즉시 끝난다 — 증상(주황 약 0.1초 뒤 온보딩)과 맞는다.
- **이 변경의 회귀가 아니다**: 구현 전 빌드에서도 같은 로그와 함께 6실행 가운데 4실행에서 안 보였다.
- **모르는 것**: URI가 왜 가끔 풀리지 않는지(이미지 로더가 번들 안 상대 경로를 풀기 전에 요청이 가는 경합이라는 것은 추론), API 30에서 잦고 API 37에서 드문 까닭(시스템 스플래시 유무와 시작 속도의 차이로 본 것도 추론). 모든 실행이 `pm clear` 직후의 콜드 스타트다. 실기 · release AAB에서는 재지 않았다.
- **이 절차에서 J0가 없을 때 확인하는 법**: 그 실행의 logcat에서 위 줄을 찾는다.
  ```sh
  A logcat -d | grep -E "LynxImageManager.*onFailed.*logo-handwriting"      # 줄이 있으면 워드마크 이미지 로드 실패 — 「J0 없음」의 원인이다
  ```
  (`cold` 앞에 `A logcat -c`로 비워 두면 그 실행의 줄만 남는다.)
- 후속으로 남긴 자리: [ADR-0049](../adr/0049-android-launch-appearance.md) 「후속 과제」 2 · [결정 기록의 보류 표](../adr/README.md#보류-표). ⟨2026-10-07⟩ 두 자리 모두 [ADR-0051](../adr/0051-android-image-url-redirect.md)로 이어졌다.

## 끝난 뒤 되돌리기

**기기마다 돈다.**

```sh
A shell "cmd uimode night no; wm size reset; wm density reset; settings put system font_scale 1.0"
# 시작 때 기록과 다르면 맞춘다. show_ime_with_hard_keyboard 는 시작 값이 null 이면 delete
IME=$(grep '^show_ime_with_hard_keyboard:' "$OUT/globals-before-$ID.txt" | sed 's/.*: //')
if [ "$IME" = "null" ] || [ -z "$IME" ]; then A shell settings delete secure show_ime_with_hard_keyboard; else A shell settings put secure show_ime_with_hard_keyboard "$IME"; fi
stop_fixture 2>/dev/null          # 픽스처가 남았으면
kill %1 2>/dev/null               # 이 셸에서 띄운 번들 서버(작업 번호는 jobs 로 확인한다)
A shell am force-stop "$PKG"
globals | diff - "$OUT/globals-before-$ID.txt" && echo "restored"
```

- L10 R3(내비게이션 모드 · 크기 · 밀도)을 했다면 그 문서의 「끝난 뒤 되돌리기」를 따른다.
- 끝나면 기기에 bundled 또는 debug 앱이 설치돼 있고 앱 데이터는 `pm clear`로 비어 있다. 다른 e2e를 돌릴 때는 그 문서의 설치부터 다시 한다.
- 홈 화면(하단 줄 · 작업 영역)에 Duru 아이콘을 끌어다 놓았다면 그대로 둬도 되지만, 다른 실행이 홈 구성을 가정한다면 끌어 내린다. 실행 ②는 Pixel_8의 홈 작업 영역에 아이콘 하나를 남겼다(런처 상태이고 전역 설정이 아니다).

## 실행 결과

### 실행 ③ · 번쩍임 관찰 · 접근성 재측정 — 2026-10-06, HEAD `ede6f7fc` (리뷰 직전 · 직후)

**실행 ③ — 최종 검증, release AAB** (Pixel_8 · API 37. `bundletool`의 기기용 APK set 설치 — `pm path`에 `base` + 분할 셋. 16 KB 대화상자 없음). 이 문서의 문면 그대로 **L1 · L2 · L4만** 돌렸다. L3 · API 30 항목 · L5 ~ L10은 이 실행의 범위 밖이다.

| 항목 | 결과 | 근거(값) |
|---|---|---|
| L2 | 통과 | 1.6초 무손실: 여섯 점 정확히 `#F46B18`, 가운데 400x400 비주황 0 · 흰 점 0 |
| L1 | 통과(1회) | 구간 [1.988, 6.103) 16프레임 어긋남 0, F1′ − F1 0.000초, L7-b · L7-c PASS, 워드마크 보임(J0 5.540초) |
| L7-a | 기록 | 같은 `L2.png`: 색 쌍 `#FFFFFF` / `#F46B18` 3.016:1, 시계 4.5 이상 0%, 전체 3.0 이상 71.1% · 평균 2.70(`px.py dist` — 이 문서를 고치며 저장된 캡처로 읽은 값) |
| L4 | 통과(서랍 자리) + 홈 작업 영역에 놓음 | `opendrawer`가 `KEYCODE_ALL_APPS` 첫 시도에 열림. Duru 지름 159 = Chrome 159, 안쪽 10px 양쪽 비주황 0. `dragicon 667 1232 270 700 L4-drag`가 통해 홈 작업 영역에 원형 적응형 아이콘이 놓였다 |

- 문면 그대로 기기에서 돈 함수: `cold` · `early` · `vid` · `shot` · `front` · `iconcell` · `opendrawer` · `dragicon` · 도구 추출 · `swiftc` · `py_compile`. 안 되는 함수 0.
- 이 실행이 되돌린 문서 결함 셋(경미)은 「r02에서 고친 결함」 아래 표에 있다. 워드마크가 안 보인 실행은 없었다(1회).
- 같은 실행에서 계측 일괄은 `OK (47 tests)`(통과 44 + 건너뜀 3), `LaunchAppearanceTest` 단독 `OK (4 tests)`였다. 끝난 뒤 전역 설정 차이 0, 기기에는 release AAB가 설치돼 있다.

**번쩍임 관찰 — L11** (Pixel_8 · API 37 · debug + 픽스처)

| 경로 | 구현 뒤(`ede6f7fc`) 영상 · 프레임 수 | 주황 프레임 | 구현 전(`a2fcf3ec`) 대조 |
|---|---|---|---|
| 알림 탭 — 앱이 앞 | 2개 · 43 · 28 | **0 · 0** | 2개 · 주황 0 |
| 알림 탭 — 홈에서 | 2개 · 28 · 28 | **0 · 0** | 1개 · 주황 0 |
| Custom Tab 복귀 | 2개 · 21 · 19 | **0 · 0** | 하지 않음 |
| 알림 권한 대화상자 | 2개 · 35 · 32 | **0 · 0** | 하지 않음 |
| 최근 앱 복귀 | 2개 · 24 · 25 | **0 · 0** | 1개 · 주황 0 |
| 홈 아이콘 복귀 | 2개 · 20 · 18 | **0 · 0** | 1개 · 주황 0 |
| 양성 대조 — 앱 콜드 스타트 | 1개 · 31 | 21 | — |

미실행: 프로세스가 죽은 상태의 알림 탭, 스냅샷 없는 웜 스타트. 한계는 L11에 있다.

**접근성 재측정** (에뮬레이터를 쓰지 않았다 — 저장된 무손실 캡처를 다시 읽었다): L7의 「받아들인 값」 표. 뒤집힘(흰색 → 검정 한 번, 바뀌는 픽셀은 화면의 약 0.2%)은 접근성 문제로 보지 않았다 — 한 방향 한 번이라 깜빡임 기준(반대 방향의 한 쌍)에 해당하지 않는다.
런처 아이콘은 식별성이 좋아졌다고 봤다(마크가 원 지름의 46% → 약 70% — 뒤의 값은 크롭에서 눈으로 읽은 값이다).

### 실행 ② — 2026-10-06, HEAD `e22758d2` (r02 정의. 저장된 영상의 재판정 + 새 실행 + 미실행이던 항목) — 전체 판정 **통과**

제품 코드는 구현 커밋 `dfbe03cb` 뒤로 변경 0줄이다(`git diff --stat dfbe03cb e22758d2 -- apps/android/app/src/main`). 기기: Pixel_8 emulator-5554 (API 37, 제스처) · R6_API30 emulator-5556 (API 30, 3버튼).
빌드: bundled(`pnpm bundle:android` 모의 값 + `assembleBundled`) · debug + androidTest(L9 알림 · R3). 도구는 이 문서의 블록을 그대로 꺼내 컴파일했다. L6 · L8 · L10 R1 · R4는 이 실행에서 다시 돌리지 않았다(실행 ①의 결과).

**다시 판정 — 실행 ①이 찍은 영상 · 캡처를 r02 도구로** (같은 데이터의 재해석이다)

| 대상 | 결과 | 값 |
|---|---|---|
| L1-1 ~ L1-4 (API 37) | L1 · L7-b · L7-c 모두 PASS(4/4) | 구간 18 · 17 · 14 · 16장 가운데 어긋남 0, F1′ − F1 0.000. 뒤집힘 1회 밝음 → 어두움(L1-1 · L1-2는 J0 뒤, L1-3 · L1-4는 J0와 같은 프레임) |
| L3-1 · L3-2 (API 30) | L3 · L7-d · L7-e 모두 PASS(2/2) | 구간 1 · 2장 어긋남 0, F1′ − F1 0.070 · 0.087, F0 아이콘 `#632C05` / `#FE7412` 4.08:1(영상), J0 없음 |
| `L2.png` · `L5.png` (L7-a) | 기록 — 도구 출력 PASS | 아이콘 `#FFFFFF`, 배경(같은 캡처의 최빈색) `#F46B18`, 3.02:1(정확값 3.016) |
| `L3-lossless.png` (L7-d) | PASS | `#622B0A` 휘도 0.043, 3.72:1 |
| 구현 전 캡처 넷(`cold37-plain` · `cold37-show-icon` · `cold30` · `cold30-bundle404`) | **FAIL 유지**(넷 모두 종료 1) | `cold37-plain` F0 `#F8F8F8` · centre `#F8AB8F`. `cold30` L3 FAIL · L7-d FAIL(2.85:1). `cold30-bundle404` **L7-e FAIL: F0 앞 status 회색 12장 · nav 순검정 11장** — 고친 정의가 red를 지우지 않았다 |

**새로 찍은 실행** (`pm clear` 뒤)

| 항목 | 결과 | 기기 · API | 근거(값 · 파일) |
|---|---|---|---|
| L1 | 통과(2/2) | Pixel_8 · 37 | N-L1-1: 구간 18장 어긋남 0, [F0, J0) centre 비주황 0, F1′ − F1 0.000. N-L1-2: 20장 0 |
| L2 | 통과(3/3 — 1.0초 둘 · 0.6초 하나) | 37 | 여섯 점 정확히 `#F46B18`, center 비주황 0 · 흰 점 0. **1.6초 한 장(`N-L2.png`)은 `center` FAIL**(비주황 6270 · 흰 점 0, 여섯 점은 정확) — 시스템 스플래시가 이미 걷히고 워드마크 첫 획(반투명 연한 주황 `#FAD2BC` 계열)이 그려지는 중이었다. 절차대로 지연을 줄였다 |
| L5 | 통과 | 37 | `N-L5.png`(night yes, 1.6초) 여섯 점 정확, center 0. night no 복귀 |
| L3 | 통과(2/2) · 무손실 통과 | R6_API30 · 30 | N-L3-1: 구간 75장 어긋남 0(**J0 있음** 1.762초 — 워드마크가 보였다), F1′ − F1 0.000. N-L3-2: 구간 3장 0, 0.052, J0 없음. 무손실: top · centre · centreL · low 정확히 `#F46B18`, nav `#FEF0E8`(값만) |
| L7-a | 기록 — 도구 출력은 PASS 5/5(그 기준은 실패할 수 없다 — L7) | 37 | 새 무손실 다섯 장(1.6초 · night 1.6초 · 1.0초 둘 · 0.6초) 전부 `#FFFFFF` / `#F46B18` 3.02:1(정확값 3.016, 여유 0.016). 영상 프레임(N-L1-2의 F0)은 3.08:1로 읽혔다 — 영상으로 판정하지 않는 이유 |
| L7-b · L7-c | 통과(2/2) | 37 | F1 · 그 다음 프레임 `#000000`. 뒤집힘 1회 — N-L1-1은 J0와 같은 프레임, N-L1-2는 J0 뒤(t = 6.410) |
| L7-d · L7-e | 통과(2/2) | 30 | 영상 4.08:1, 무손실 `#622B0A` 3.72:1. status 회색 0 · nav 순검정 0(nav는 `#FFF0E8` · `#FDF0E5`) |
| L4 (홈 화면) | **통과 — 홈 작업 영역에서. 하단 줄은 판정하지 못함** | 37 | 서랍: `KEYCODE_ALL_APPS`로 첫 시도에 열림(스와이프 둘은 2/2 열리지 않음). 끌기: `input draganddrop`은 통하지 않음, `motionevent` DOWN → 1.2초 → MOVE 다섯 번(0.3초 간격) → UP으로 홈에 놓임. 하단 줄 네 칸이 차 있어 작업 영역(칸 305 1001 521 1252)에 놓았다. `iconedge`: 지름 159px = 하단 줄 Chrome 159px, 안쪽 10px 양쪽 주황 아닌 점 0. 크롭에서 잘림 · 흰 띠 없음. 끌기 중 캡처에서 정사각 이음매 안 보임(관찰) |
| L9 알림 | 관찰 기록 | 37 | `pm grant … POST_NOTIFICATIONS` 뒤 `POST_PUSH_FIXTURE` → `dumpsys notification`에 알림(id 1001 · 채널 `duru-updates`). 작은 아이콘 `id=0x7f070080` = `drawable/ic_notification`, 큰 아이콘 없음. 셰이드(3.5초 뒤 캡처): 알림 머리에 가득 찬 주황 앱 아이콘, 상태바에는 일반 종 아이콘 |
| L10 R2 | 통과 | 37 | `appframe` ` frame=[0,0][1080,2400]`, `R2.png` status · top `#FFFDFC` 정확. `lynxbounds`도 이번에는 `0,0-1080,2400`을 냈다 |
| L10 R3 | 통과 | 37 | 390x844 · 160 dpi · 3버튼 · debug + 픽스처. 알약 Journey `[67,736][131,784]` · Roleplay `[163,736][227,784]` · Settings `[259,736][323,784]`(기준 784 ± 2). 세 탭 전환 `selected` 확인, 알약이 ◁○□ 위에 있고 겹침 없음. 끝난 뒤 제스처 모드 · 크기 · 밀도 복귀 |
| 기록 | 수치 | 37 · 30 | J0 진행도 N-L1-1 · N-L1-2 48%. 워드마크가 안 보이는 실행의 진단은 「범위 밖 관찰 기록란」 |

- 정리: 두 기기의 전역 설정은 시작 전후 차이 0. Pixel_8에는 HEAD debug 빌드가 설치돼 있고 앱 데이터는 비어 있다. 홈 작업 영역에 Duru 아이콘 하나가 남았다. R6_API30은 종료했다.
- 이 실행에서도 판정하지 못한 것: L4의 하단 줄 자리. 다시 돌리지 않은 것: L6 · L8 · L10 R1 · R4(실행 ①의 결과가 유효 — 제품 코드 변경 0줄).

### 실행 ① — 2026-10-06, HEAD `486ecc95`, 구현 `dfbe03cb` (r01 정의로 돈 실행) — 전체 판정 **실패**

**아래 표는 그 실행이 적은 그대로다.** 「재판정 대기」 · 「미실행」 · 「판정 불가」였던 항목의 뒤 결과는 위 실행 ②에 있다 — 이 표를 고쳐 쓰지 않았다.
기기: Pixel_8 emulator-5554 (API 37, 1080x2400, 제스처) · R6_API30 emulator-5556 (API 30, 1080x2340, 3버튼). 빌드: bundled(`pnpm bundle:android` 모의 값 + `assembleBundled`) · debug + androidTest(L6 a/d · L8 · L9).
실패의 내용: L1(4회 중 2회) · L3(2회 모두)의 형식 FAIL은 r01 도구의 F0 · F1 정의 탓이었고, L7은 API 37 시작 구간의 흰 아이콘이었다(계약 r02가 규칙으로 정리해 받아들였다 — [ADR-0049](../adr/0049-android-launch-appearance.md)의 「이 작업이 만든 변화」).

| 항목 | 결과 | 기기 · API | 근거(값 · 파일) |
|---|---|---|---|
| L1 | **재판정 대기** (r01 판정은 4회 중 2회 형식 FAIL) | Pixel_8 · 37 | 실패한 두 실행의 어긋난 점은 전부 F0 한 프레임의 status(`#DBDFE7` · `#E3E7EF`) · nav(`#0D0F17`) — 런처 열림 확대 프레임. F0 다음부터 어긋남 0. [F0, J0)에서 centre 비주황 4실행 모두 0. `L1-*.txt` · `L1-1-frames/` |
| L2 | 통과 | 37 | `L2.png` 여섯 점 정확히 `#F46B18`, center 400x400 비주황 0 · 흰 점 0 |
| L3 | **재판정 대기** (r01 판정은 2회 모두 형식 FAIL) · 무손실은 통과 | R6_API30 · 30 | 영상: F0~F0+4의 status `#B18795`(런처 확대 프레임), 주황 → 첫 화면 교차 페이드 0.1초(top `#FCBF92` → `#FDDDC4`)가 F1 정의에 늦게 걸림. 무손실 `L3-lossless.png`: top · centre · centreL · low 정확히 `#F46B18`(nav `#FEF0E8` 값). **J0 없음**(두 실행) |
| L4 (앱 서랍) | 통과 | 37 · 30 | API 37: Duru 지름 159 = Chrome 159, 안쪽 10px 양쪽 주황 아닌 점 0. API 30: 지름 136 = Settings 136. 크롭에서 마크 잘림 없음. 길게 누르기(API 37) · 길게 누르기 · 끌기(API 30): 정사각 이음매 안 보임(관찰) |
| L4 (홈 하단 줄 · API 37 끌기) | **미실행** | 37 | Duru가 하단 줄에 없었고 서랍 열기가 불안정했다(D6). 끌기 캡처 실패(홈 화면만 찍힘) |
| L5 | 통과 | 37 | `L5.png` night yes 상태 여섯 점 정확히 `#F46B18`, center 비주황 0. night no로 복귀 확인 |
| L6 (a) 키보드 · (d) 화면 전환 | 통과 | 37 | 피드백 화면 메시지칸, `mInputShown=true`. opening 3 + keyboard 1, tab 3 + open 3 장 rows 주황 줄 0 |
| L6 (b) 분할 | 통과(세로 모양) · 가로 모양은 관찰 | 37 | 세로: `lynxbounds` 0,0-1080,1187, 재생성 0, rows 0. 가로(관찰): 0,0-815,823 `letterboxReason=FIXED_ORIENTATION`, 박스 rows 0. 전체 화면 복귀 0,0-1080,2400 |
| L6 (c) 복귀 · (e) 구성 변경 | 통과 | 37 | L6c 2장 · night 2장 · size 1080x1920 2장 rows 0 |
| L7 | **r02 기준 재판정 대기** | 37 · 30 | 관찰(판정 아님): API 37 L2 · L5 무손실 흰 아이콘 `#FFFFFF` 휘도 1.000 · 3.02:1 → L7-a 값은 기준 위. L1-2 · L1-4 프레임에서 F0 · F0+1 흰색, L1-4의 J0는 어두움, L1-2의 J0는 흰색(e2e 기록). API 30: 회색 띠 `#757575` 0장, 아이콘 휘도 0.045 ~ 0.060 · 3.17 ~ 3.68:1, 무손실 `#622B0A` 3.72:1. nav `#FEF0E8` 부근, 검정 바 없음 |
| L8 | 통과 | 37 · 30 | 6초 · 11초 모두 주황 정확(API 30은 nav `#FEF0E8` 값), center 비주황 0, 앞 = MainActivity |
| L9 | 관찰 기록 · 알림 미실행 | 37 · 30 | 앱 정보 · 최근 앱: 가득 찬 주황 원 + 꽃잎 마크, 흰 바탕 없음. 런처 움직임은 L4와 같음. 알림: `POST_PUSH_FIXTURE` 방송 뒤 셰이드에 알림이 잡히지 않음 |
| L10 R1 | 통과 | 37 | night yes → no 전후 `create 0 destroy 0 relaunch_resume 0` 두 번. 양성 대조(font_scale 1.3)에서 `1 1 1`로 카운터 유효 |
| L10 R2 | **판정 불가** (status · top 부분은 통과) | 37 | `R2.png` status · top `#FFFDFC` 정확. `lynxbounds`가 온보딩에서 빈 값이라 「창 전체 bounds」는 못 읽음(D7) |
| L10 R3 | **미실행** | — | android-navigation-insets N1 별도 절차. 추정 통과 아님 |
| L10 R4 | 통과 | 37 | `pm clear` 후 `Step 1 of 3`에서 BACK → top이 NexusLauncherActivity |
| 기록 U6 | 수치 | 37 · 30 | J0 진행도 59 · 37 · 62 · 73%. API 30은 J0 없음 |

미실행 · 미판정(이 실행에서): L4 API 37 홈 하단 줄 · 끌기, L9 알림, L10 R3, R2의 창 전체 bounds. → 실행 ②가 홈 작업 영역 · 끌기 · 알림 · R3 · R2를 돌렸다. 하단 줄 자리는 여전히 판정하지 못했다.

## r02에서 고친 결함

e2e 실행이 되돌린 문서 · 도구 결함(D1 ~ D7)과 이 판의 처리다. **제품 결함(API 37 시작 구간의 흰 아이콘)은 계약 r02가 규칙으로 정리했고 L7의 기준으로 반영했다.**

| # | 결함 | 고친 곳 |
|---|---|---|
| D1 | `OUT`이 상대 경로(`.agent-harness/…`)라 격리 워크트리에 없었다 | 「전제」의 `OUT`을 절대 경로 변수로 받는다(`: "${OUT:?…}"` + 절대 경로 검사) |
| D2 | F0가 top · centreL · low 세 점만 봐서 런처 열림 확대 프레임이 F0로 잡혔다(L1 2/4 · L3 2/2 형식 실패) | F0 = status · top · centreL · low · nav 다섯 점(3버튼은 nav 제외) |
| D3 | F1이 `#FFFDFC` 진입이라 주황 → 첫 화면 교차 페이드가 [F0, F1)에 들어갔다 | F1 = top이 주황을 벗어난 첫 프레임, F1′ 가드(≤ 0.3초), J0는 없을 수 있음 |
| D4 | `px.py center`가 흰 원도 워드마크로 세어 「스플래시가 이미 걷혔다」고 안내했다 | 흰 점의 비율로 흰 면(원) · 워드마크 획을 가른 안내 |
| D5 | L7의 구현 전 관찰이 재현되지 않았고(구현 전 아이콘은 `#000000`), `strip`이 실제 배경이 아닌 `#F46B18` 상수와 비교했다 | L7을 L7-a ~ L7-e로 가름, `strip`이 같은 띠의 최빈색(실제 배경)과 비교, `frames`에 `icon` · `ibg` 열 |
| D6 | API 37 앱 서랍 열기 스와이프가 열리지 않았다 | `opendrawer`(키코드 → 인텐트 → 스와이프). 실행 ②가 기기에서 확인했다 — 아래 E3 |
| D7 | `lynxbounds`가 온보딩 화면에서 빈 값이라 R2의 「창 전체」를 못 재었다 | `appframe`(`dumpsys window windows`의 앱 창 `frame=`). 실행 ②가 기기에서 확인했다 — 아래 E6 |

### 실행 ② · 실행 ③ · 리뷰 · 접근성 점검이 되돌린 결함과 이 판의 처리

실행 ②(판정 통과)가 남긴 문서 · 도구 결함이다. 제품 결함은 없다. **판정을 바꾸는 수정은 없다** — 고친 도구(`px.py center`)는 저장된 캡처로 다시 돌려 종료 코드와 수치가 같음을 확인했다.

| # | 결함 | 고친 곳 |
|---|---|---|
| E1 | `px.py center`가 흰 점 0 · 비주황 있음을 「아이콘 · 어두운 점」이라고 안내했다. 실제는 워드마크 첫 획의 반투명 연한 주황이었다(D4의 남은 틈) | `center`가 밝은 비주황 점(주황과 흰색 사이)을 따로 세어 「워드마크 첫 획일 수 있다 — 지연을 줄여 다시」로 안내한다. 색만으로는 아이콘의 밝은 면과 가르지 못한다는 것도 적는다. 종료 코드 · 「비주황 · 흰 점」 수는 그대로다. L2의 안내 문단 |
| E2 | `cold()`의 `N=$1`이 호출자의 반복문 변수 `N`을 덮어써 파일명이 어긋났다 | `local NAME=$1`. `opendrawer` · `dragicon`의 변수도 `local` |
| E3 | 서랍 열기 · 끌기의 「기기 확인 전」 명령 — 스와이프 둘과 `input draganddrop`이 통하지 않았다. 하단 줄이 꽉 찼을 때의 판정 기준이 없었다 | `opendrawer`에서 통하지 않은 스와이프를 빼고(API 30 이하의 마지막 시도 하나만 남김), 끌기를 `dragicon`(`motionevent`)으로, L4의 「자리」에 하단 줄이 꽉 찼을 때는 홈 작업 영역에서 판정하고 하단 줄은 「판정하지 못함」으로 적는다는 기준 |
| E4 | L9 알림: 권한 부여가 빠져 있었고, 셰이드를 1초 뒤에 찍었고, 「머리의 작은 아이콘이 단색 윤곽」이라는 기대가 API 37 셰이드의 실제 모습과 달랐다 | L9의 알림 항목 — `pm grant … POST_NOTIFICATIONS`, 3.5초 대기, 작은 아이콘은 `dumpsys notification --noredact`의 `icon=` + `aapt2`의 리소스 이름으로, 셰이드의 모양은 관찰로만 |
| E5 | 「API 30의 `bundled`에서는 J0가 관찰되지 않는다」는 틀린 일반화 | 「구간의 용어」의 J0 행 · 구간 표 · L1 · L3 · 「범위 밖 관찰 기록란」 — 간헐적이고 원인은 워드마크 이미지 로드 실패(logcat 줄과 확인 명령) |
| E6 | `appframe`이 「기기에서 확인되지 않았다」로, `lynxbounds`가 「온보딩에서 빈 값」으로 적혀 있었다 — 실행 ②에서 `appframe`은 확인됐고 `lynxbounds`의 빈 값은 재현되지 않았다 | 「셸 관용구」의 두 주석 · L10 R2 — `appframe`으로 판정하고, `lynxbounds`의 빈 값은 조건을 모르는 것으로 |
| E7 | 「실행 상태」가 재판정 대기로 남아 있었다 | 「실행 상태」 표(어느 실행의 결과인지 구분 · L7-a ~ L7-e 각각) · 「실행 결과」의 실행 ② |
| E8 | 3.02:1의 정확값과 여유(관찰) | L7의 「받아들인 값」 표와 그 아래 설명 — 색 쌍 3.016:1, 여유가 사실상 0(앞 판의 「근소하다는 것」 문단은 리뷰 뒤 이 자리로 바뀌었다) |
| F1 (실행 ③) | L4에서 옆 아이콘(Chrome)에 `iconedge`를 돌리면 주황 기준이라 `FAIL`이 나와 실패로 읽힐 수 있다 | L4 — 옆 아이콘은 지름만 읽고 `FAIL`은 무시한다는 주의 |
| F2 (실행 ③) | `dragicon` 주석의 「함수 형태 그대로 기기에서 돌린 것은 아니다」가 낡았다 | 주석 — 실행 ③에서 함수 그대로 통했다 |
| F3 (실행 ③) | 서랍을 열면 검색창 포커스로 키보드가 올라온다(관찰) | L4에 관찰로 |
| P1-1 · A3 (리뷰 · 접근성) | 「3.02:1 — 기준 3.0을 0.016 차로 넘는다」가 띠 전체의 판정처럼 읽혔다. 3.016은 색 쌍의 산술값이고 띠 안의 시계에는 4.5:1이 대응한다 | L7의 「받아들인 값」 문단과 표, 실행 상태의 L7-a 행 |
| P1-2 · A4 (리뷰 · 접근성) | L7-a는 주황 위에서 실패할 수 없는 기준인데 「통과」로 적혀 있었다. 시계와 아이콘을 가르지 않고 분포를 기록하지 않았다 | L7-a를 「받아들인 값의 기록」으로, 부록 `px.py`에 `dist`(판정 없음 — 시계 · 아이콘 · 전체의 4.5 이상 · 3.0 이상 픽셀 비율과 평균). `strip`의 판정은 그대로 뒀다 |
| P1-3 · A5 (리뷰 · 접근성) | 알림 탭 · Custom Tab 복귀 · 권한 대화상자 뒤의 주황 노출이 관찰되지 않았다 | L11 신설(경로 · 세는 법 · 관찰 결과 · 한계) |
| E9 | `SplashScreen.tsx`의 `binderror={finish}`가 이미지 로드 오류에서 스플래시를 즉시 닫는다(범위 밖 — 제품 쪽 후속 후보) | 이 문서는 기록만 한다(「범위 밖 관찰 기록란」). 후속 자리는 ADR-0049 「후속 과제」 2 |

## 부록 — 도구 코드

세 블록은 위 「도구」의 명령이 파일로 꺼낸다. 이 블록이 정본이다. 계약 단계의 `frames.swift` · `px.py`(저장소 밖)에서 출발해 영상 판정 · 상태바 · 아이콘 가장자리 판독을 더했고, r02에서 `judge.py`의 F0 · F1 · F1′ · J0 정의와 L7-b ~ L7-e 판정, `frames`의 `icon` · `ibg` 열, `px.py strip`의 실제 배경 비교와 모드, `px.py center`의 안내를 고쳤다. 실행 ② 뒤에는 `px.py center`의 안내 문구만 한 번 더 고쳤다(E1 — 밝은 비주황 점. 판정은 그대로다). 리뷰 뒤에는 `px.py`에 기록용 `dist`를 더했다(판정 없음 — 다른 명령의 출력과 종료 코드는 그대로다).
**이 도구들은 문서의 코드 블록에만 있고 저장소의 테스트가 지키지 않는다** — 고칠 때마다 저장된 프레임으로 손으로 대조한다(리뷰의 지적. 저장소로 옮기는 일은 후속이다 — ADR-0049 「후속 과제」).

### `frames.swift` — 영상 → 프레임 표

```swift file=frames.swift
import AVFoundation
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

// 사용: frames <영상.mp4> [--save 인덱스,인덱스,... --out 폴더]
// 프레임마다 한 줄을 stdout에 낸다. --save 를 주면 그 인덱스의 프레임을 PNG로 저장한다.
//   0042 t=2.670 1080x2400 status=#F8F8F8 top=#F8F8F8 centre=#F7A98B centreL=#F8F8F8 low=#F8F8F8 nav=#F8F8F8 white=0 icon=#000000 ibg=#F8F8F8
// white = 워드마크 띠(가로 15%~85% · 세로 40%~60%)에서 R·G·B가 모두 252 이상인 점의 수(4px 간격 표본)
// ibg · icon = 상태바 띠(높이의 0.5%~3.5%, 가로 2px 간격 표본)의 최빈색(실제 배경)과 배경에서 가장 먼 색(아이콘의 가장 밝은/어두운 속 픽셀).
//   px.py strip 과 같은 정의다 (L7). 영상은 코덱 오차가 있어 icon · ibg 의 값 자체보다 명암(어두움/밝음)의 변화를 읽는 데 쓴다
let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: frames <video> [--save i,j,... --out dir]"); exit(2) }
var saveSet = Set<Int>()
var outDir = URL(fileURLWithPath: "frames-out")
var k = 2
while k < args.count {
  if args[k] == "--save", k + 1 < args.count {
    saveSet = Set(args[k + 1].split(separator: ",").compactMap { Int($0) })
    k += 2
  } else if args[k] == "--out", k + 1 < args.count {
    outDir = URL(fileURLWithPath: args[k + 1])
    k += 2
  } else {
    k += 1
  }
}
if !saveSet.isEmpty { try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true) }
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }
let reader = try! AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
])
reader.add(output)
reader.startReading()
func hex(_ p: UnsafePointer<UInt8>) -> String { String(format: "#%02X%02X%02X", p[2], p[1], p[0]) }
let points: [(String, Double, Double)] = [
  ("status", 0.10, 0.012), ("top", 0.10, 0.10), ("centre", 0.50, 0.50),
  ("centreL", 0.30, 0.50), ("low", 0.10, 0.85), ("nav", 0.10, 0.99),
]
var index = 0
while let sample = output.copyNextSampleBuffer() {
  guard let buf = CMSampleBufferGetImageBuffer(sample) else { continue }
  let t = CMSampleBufferGetPresentationTimeStamp(sample).seconds
  CVPixelBufferLockBaseAddress(buf, .readOnly)
  let w = CVPixelBufferGetWidth(buf), h = CVPixelBufferGetHeight(buf)
  let stride = CVPixelBufferGetBytesPerRow(buf)
  let base = CVPixelBufferGetBaseAddress(buf)!.assumingMemoryBound(to: UInt8.self)
  var parts: [String] = []
  for (name, fx, fy) in points {
    let x = min(w - 1, Int(Double(w) * fx)), y = min(h - 1, Int(Double(h) * fy))
    parts.append("\(name)=\(hex(base + y * stride + x * 4))")
  }
  var white = 0
  var y = Int(Double(h) * 0.40)
  while y < Int(Double(h) * 0.60) {
    var x = Int(Double(w) * 0.15)
    while x < Int(Double(w) * 0.85) {
      let p = base + y * stride + x * 4
      if p[0] >= 252 && p[1] >= 252 && p[2] >= 252 { white += 1 }
      x += 4
    }
    y += 4
  }
  var hist: [UInt32: Int] = [:]
  let ya = Int(Double(h) * 0.005), yb = Int(Double(h) * 0.035)
  for yy in ya..<yb {
    var xx = 0
    while xx < w {
      let p = base + yy * stride + xx * 4
      hist[UInt32(p[2]) << 16 | UInt32(p[1]) << 8 | UInt32(p[0]), default: 0] += 1
      xx += 2
    }
  }
  let bgKey = hist.max { a, b in a.value != b.value ? a.value < b.value : a.key > b.key }!.key
  func dist2(_ k: UInt32) -> Int {
    let dr = Int((k >> 16) & 255) - Int((bgKey >> 16) & 255)
    let dg = Int((k >> 8) & 255) - Int((bgKey >> 8) & 255)
    let db = Int(k & 255) - Int(bgKey & 255)
    return dr * dr + dg * dg + db * db
  }
  let farKey = hist.keys.max { a, b in dist2(a) != dist2(b) ? dist2(a) < dist2(b) : a > b }!
  print(String(format: "%04d t=%.3f %dx%d ", index, t, w, h) + parts.joined(separator: " ") + " white=\(white)" + String(format: " icon=#%06X ibg=#%06X", farKey, bgKey))
  if saveSet.contains(index) {
    let cs = CGColorSpaceCreateDeviceRGB()
    let ctx = CGContext(data: base, width: w, height: h, bitsPerComponent: 8, bytesPerRow: stride, space: cs,
      bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    let dst = outDir.appendingPathComponent(String(format: "f%04d_%05dms.png", index, Int(t * 1000)))
    let d = CGImageDestinationCreateWithURL(dst as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(d, ctx.makeImage()!, nil)
    CGImageDestinationFinalize(d)
  }
  CVPixelBufferUnlockBaseAddress(buf, .readOnly)
  index += 1
}
print("frames=\(index)")
```

### `judge.py` — 영상의 L1 · L3 · L7-b ~ L7-e 판정

```python file=judge.py
#!/usr/bin/env python3
"""콜드 스타트 영상의 프레임 표(frames 의 출력)로 L1(API 37) · L3(API 30)의 영상 판정과 L7 의 영상 쪽 판정을 낸다 (test-plan r02).

  judge.py 37 frames.txt     또는     judge.py 30 frames.txt

정의 (test-plan r02-1):
  F0  = status · top · centreL · low · nav 다섯 점이 서로 채널별 16 이내로 같아진 첫 프레임.
        3버튼 기기(API 30)는 nav 를 빼고 넷. 런처의 열림 확대 프레임(창이 화면보다 작아 가장자리 표본에 런처 배경이 찍힌다)은 F0 가 아니다.
  F1  = F0 뒤에 top 이 #F46B18 ±16 을 벗어난 첫 프레임. 교차 페이드 프레임은 판정 구간 [F0, F1) 에 들어가지 않는다.
  F1' = F1 뒤에 top 이 #FFFDFC ±16 에 들어온 첫 프레임. F1' 의 시각 - F1 의 시각 <= 0.3초여야 한다 (가드).
  J0  = [F0, F1) 에서 top 이 주황이고 워드마크 띠의 흰 점이 20 이상인 첫 프레임. 없을 수 있다 — 없으면 J0 를 쓰는 판정은 건너뛰고
        통과로 세지 않는다 (출력에 「J0 없음」).

L7 의 영상 판정은 frames 가 낸 icon · ibg 열(상태바 띠의 아이콘 색 · 실제 배경색)을 읽는다. 열이 없는 옛 표는 「판정 불가」다.
L7-a(API 31+ 무손실 대비)는 영상으로 판정하지 않는다 — px.py strip 으로 무손실 PNG 한 장을 읽는다.

종료 코드: 0 통과 · 1 판정 실패 · 3 판정 불가(F0 를 못 찾음 · F1 을 못 찾음 · 판정에 쓸 열이 없음. 통과가 아니다).
"""
import re
import sys

ORANGE = (0xF4, 0x6B, 0x18)
FIRST = (0xFF, 0xFD, 0xFC)
GRAY = (0x75, 0x75, 0x75)
TOL = 16
GUARD_S = 0.3
LINE = re.compile(r"^(\d+) t=([\d.]+) (\d+)x(\d+) (.*?) white=(\d+)(?: icon=(#[0-9A-Fa-f]{6}) ibg=(#[0-9A-Fa-f]{6}))?$")


def near(c, ref, tol=TOL):
    return all(abs(c[i] - ref[i]) <= tol for i in range(3))


def rgb(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def lum(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def parse(path):
    frames = []
    for ln in open(path, encoding="utf-8"):
        m = LINE.match(ln.strip())
        if not m:
            continue
        pts = {k: rgb(v) for k, v in (kv.split("=") for kv in m.group(5).split())}
        frames.append({"i": int(m.group(1)), "t": float(m.group(2)), "p": pts, "white": int(m.group(6)),
                       "icon": rgb(m.group(7)) if m.group(7) else None, "ibg": rgb(m.group(8)) if m.group(8) else None})
    return frames


def icon_state(f):
    """(휘도, 대비, 배경과의 채널 차) — 열이 없으면 None. 채널 차 40 미만이면 아이콘이 구별되지 않는다."""
    if f["icon"] is None:
        return None
    dist = max(abs(f["icon"][i] - f["ibg"][i]) for i in range(3))
    return lum(f["icon"]), contrast(f["icon"], f["ibg"]), dist


def main(argv):
    if len(argv) != 3 or argv[1] not in ("37", "30"):
        print(__doc__)
        return 2
    api, fr = argv[1], parse(argv[2])
    if not fr:
        print("프레임을 읽지 못했다")
        return 3

    def tt(k):
        return "%.3fs(#%d)" % (fr[k]["t"], fr[k]["i"]) if k is not None and k < len(fr) else "없음"

    # F0: 영상이 처음 바뀐 뒤, 다섯 점(3버튼은 넷)이 서로 16 이내로 같아진 첫 프레임
    f0_points = ["status", "top", "centreL", "low"] + (["nav"] if api == "37" else [])
    first = fr[0]["p"]
    start = next((k for k, f in enumerate(fr) if f["p"] != first), None)
    f0 = None
    if start is not None:
        for k in range(start, len(fr)):
            p = fr[k]["p"]
            if all(near(p[a], p[b]) for i, a in enumerate(f0_points) for b in f0_points[i + 1:]):
                f0 = k
                break
    if f0 is None:
        print("F0(덮임 프레임: %s 이 서로 같아진 첫 프레임)를 찾지 못했다 — 판정 불가(통과가 아니다). 표를 눈으로 읽는다. 영상이 앱이 뜨기 전에 끝났거나 겹침이 끝나지 않았다" % " · ".join(f0_points))
        return 3

    # F1: F0 뒤 top 이 주황을 벗어난 첫 프레임. F1': 그 뒤 top 이 첫 화면 셸 색에 들어온 첫 프레임
    f1 = next((k for k in range(f0 + 1, len(fr)) if not near(fr[k]["p"]["top"], ORANGE)), None)
    f1p = next((k for k in range(f1, len(fr)) if near(fr[k]["p"]["top"], FIRST)), None) if f1 is not None else None
    end = f1 if f1 is not None else len(fr)
    j0 = next((k for k in range(f0, end) if near(fr[k]["p"]["top"], ORANGE) and fr[k]["white"] >= 20), None)

    print("F0(%s 이 같아진 첫 프레임) = %s" % (" · ".join(f0_points), tt(f0)))
    print("F1(top 이 주황을 벗어난 첫 프레임) = %s · F1'(top 이 #FFFDFC ±16 에 들어온 첫 프레임) = %s" % (tt(f1), tt(f1p)))
    if j0 is not None:
        print("J0(워드마크가 처음 보인 프레임: 주황 + 흰 점 20 이상) = %s" % tt(j0))
    else:
        print("J0 없음 — 판정 구간 안에 워드마크(흰 점 20 이상)가 보인 프레임이 없다. J0 를 쓰는 판정(워드마크 진행도 기록)은 건너뛰고 통과로 세지 않는다")
    if f1 is None:
        print("주의: F1(주황을 벗어난 프레임)을 못 찾았다 — 영상 끝까지를 판정 구간으로 본다. 번들을 못 읽었거나 영상이 짧다. 어긋난 점이 없어도 통과로 세지 않는다")
    b = j0 if j0 is not None else end
    print("구간 [F0, %s) = %s ~ %s : %s" % ("J0" if j0 is not None else "F1", tt(f0), tt(b),
          "주황 면 — 시스템 스플래시(API 37) · 창 배경 · 글씨가 쓰이기 전의 JS 스플래시. 평평한 면이라 색으로는 서로 가르지 못한다" if api == "37"
          else "주황 면 — 시작 창 · 첫 그리기 전의 창 · 글씨가 쓰이기 전의 JS 스플래시"))
    if j0 is not None:
        print("구간 [J0, F1) = %s ~ %s : JS 스플래시(워드마크가 보이는 동안)" % (tt(j0), tt(f1)))
    print("판정 구간 [F0, F1) = %s ~ %s, 프레임 %d장. F0 앞(영상이 바뀐 뒤)의 확대 프레임 %d장과 F1 의 교차 페이드는 판정하지 않는다" % (tt(f0), tt(f1), end - f0, f0 - (start or 0)))

    # --- L1 / L3: 구간의 색 ---
    names = ["status", "top", "low", "nav"] if api == "37" else ["status", "top", "low"]
    bad = []
    for k in range(f0, end):
        p = fr[k]["p"]
        for n in names + (["centre", "centreL"] if k == f0 else []):
            if not near(p[n], ORANGE):
                bad.append((k, n))
    for k, n in bad[:12]:
        print("FAIL #%d t=%.3f %s=#%02X%02X%02X (기대 #F46B18 ±%d)" % (fr[k]["i"], fr[k]["t"], n, *fr[k]["p"][n], TOL))
    if len(bad) > 12:
        print("... 어긋난 점 모두 %d개" % len(bad))
    frames_bad = len({k for k, _ in bad})
    print("판정 구간 프레임 %d장 중 어긋난 프레임 %d장 (판정 점: %s + F0 의 centre · centreL)" % (end - f0, frames_bad, ",".join(names)))
    if api == "30":
        print("참고(판정 아님) nav 값: " + " ".join(sorted({"#%02X%02X%02X" % fr[k]["p"]["nav"] for k in range(f0, end)})))
    obs = [k for k in range(f0, b) if not near(fr[k]["p"]["centre"], ORANGE)]
    print("참고: [F0, %s)에서 centre 가 주황이 아닌 프레임 %d장%s" % ("J0" if j0 is not None else "F1", len(obs), " — 가운데에 무엇이 그려졌다(L2가 정본)" if obs else ""))

    # F1' 가드: 주황도 첫 화면 색도 아닌 색이 오래 머무르지 않는다
    guard = "pass"
    if f1 is not None:
        if f1p is not None:
            gap = fr[f1p]["t"] - fr[f1]["t"]
            guard = "pass" if gap <= GUARD_S + 1e-9 else "fail"
            print("가드: F1' - F1 = %.3f초 (기준 %.1f초 이하): %s" % (gap, GUARD_S, "PASS" if guard == "pass" else "FAIL"))
        else:
            gap = fr[-1]["t"] - fr[f1]["t"]
            guard = "fail" if gap > GUARD_S else "unknown"
            print("가드: F1 뒤 %.3f초 동안 top 이 #FFFDFC 에 들어오지 않았다: %s" % (gap, "FAIL" if guard == "fail" else "영상이 너무 일찍 끝나 판정 불가"))
    interval = "FAIL" if (bad or guard == "fail") else ("판정 불가" if (f1 is None or guard == "unknown") else "PASS")
    print("%s 판정(구간 색 · 가드): %s" % ("L1" if api == "37" else "L3", interval))

    # --- L7 (영상 쪽) ---
    l7 = {}
    has_icon = all(f["icon"] is not None for f in fr)
    if not has_icon:
        print("L7 영상 판정 불가: 프레임 표에 icon · ibg 열이 없다(옛 frames 가 만든 표). 새 frames 로 영상에서 표를 다시 만든다")
    elif api == "37":
        print("L7-a: 영상으로는 판정하지 않는다 — 코덱이 두 색을 옮겨 3.02:1 의 여유(0.02)보다 큰 오차를 낸다. 무손실 PNG 로 `px.py strip PNG contrast`")
        # L7-b: 첫 화면(F1)과 그 다음 프레임의 아이콘이 어둡다
        pair = [k for k in (f1, f1 + 1 if f1 is not None else None) if k is not None and k < len(fr)]
        if not pair:
            l7["L7-b"] = "판정 불가"
            print("L7-b: F1 이 없다 — 판정 불가")
        else:
            ok = True
            for k in pair:
                st = icon_state(fr[k])
                dark = st[2] >= 40 and st[0] < 0.1
                ok = ok and dark
                print("  L7-b #%d t=%.3f 아이콘 %s 배경 %s 휘도 %.3f (채널 차 %d) %s" % (fr[k]["i"], fr[k]["t"], "#%02X%02X%02X" % fr[k]["icon"], "#%02X%02X%02X" % fr[k]["ibg"], st[0], st[2], "어두움" if dark else "어둡지 않다"))
            l7["L7-b"] = "PASS" if ok else "FAIL"
        # L7-c: [F0, F1) 의 명암 바뀜 <= 1, 방향 밝음 -> 어두움
        seq = []
        for k in range(f0, end):
            st = icon_state(fr[k])
            if st[2] >= 40:
                seq.append((k, "어두움" if st[0] < 0.1 else "밝음"))
        flips = [(seq[n][0], seq[n - 1][1], seq[n][1]) for n in range(1, len(seq)) if seq[n][1] != seq[n - 1][1]]
        ndark = sum(1 for _, s in seq if s == "어두움")
        print("L7-c: 아이콘이 구별되는 프레임 %d장 중 어두운 %d · 밝은 %d" % (len(seq), ndark, len(seq) - ndark))
        for k, a, c in flips:
            where = "J0 와 같은 프레임" if j0 == k else ("J0 보다 앞" if j0 is not None and k < j0 else ("J0 보다 뒤" if j0 is not None else "J0 없음"))
            print("  뒤집힘 #%d t=%.3f %s -> %s (%s) — 기록만 한다" % (fr[k]["i"], fr[k]["t"], a, c, where))
        if j0 is not None:
            print("  J0 프레임의 아이콘: %s" % next((s for k, s in seq if k == j0), "구별되지 않음"))
        if not seq:
            l7["L7-c"] = "판정 불가"
            print("L7-c: 아이콘이 구별되는 프레임이 없다 — 판정 불가")
        else:
            okc = len(flips) <= 1 and all(a == "밝음" and c == "어두움" for _, a, c in flips)
            l7["L7-c"] = "PASS" if okc else "FAIL"
            print("L7-c: 뒤집힘 %d회 (기준 1회 이하, 방향 밝음 -> 어두움)" % len(flips))
    else:
        # L7-d: F0 · F0 다음(구간 안에 있으면) · J0(있으면) 의 아이콘이 어둡고 실제 배경과의 대비 3.0 이상
        picks = [("F0", f0)]
        if f0 + 1 < end:
            picks.append(("F0 다음", f0 + 1))
        else:
            print("  F0 다음 프레임은 판정 구간 밖(F1)이다 — 교차 페이드 프레임이라 L7-d 에 넣지 않는다")
        if j0 is not None:
            picks.append(("J0", j0))
        okd = True
        for name, k in picks:
            st = icon_state(fr[k])
            ok = st[2] >= 40 and st[0] < 0.1 and st[1] >= 3.0
            okd = okd and ok
            print("  L7-d %s #%d t=%.3f 아이콘 %s 배경 %s 휘도 %.3f 대비 %.2f:1 (채널 차 %d) %s" % (name, fr[k]["i"], fr[k]["t"], "#%02X%02X%02X" % fr[k]["icon"], "#%02X%02X%02X" % fr[k]["ibg"], st[0], st[1], st[2], "PASS" if ok else "FAIL"))
        if j0 is None:
            print("  L7-d: J0 없음 — J0 프레임은 판정에서 빠진다")
        l7["L7-d"] = "PASS" if okd else "FAIL"
    if api == "37" and not has_icon:
        l7["L7-b"] = l7["L7-c"] = "판정 불가"
    if api == "30":
        if not has_icon:
            l7["L7-d"] = "판정 불가"
        gray = [k for k in range(f0 + 1, end) if near(fr[k]["p"]["status"], GRAY)]
        dark_nav = [k for k in range(f0 + 1, end) if max(fr[k]["p"]["nav"]) < 64]
        # F0 앞에도 본다: 시작 창의 회색 띠 · 검정 내비게이션 바는 창 안쪽 세 점(top · centreL · low)이 이미 덮인 뒤 status · nav 만
        # 아직 안 따라온 프레임에 나타난다(구현 전 cold30-bundle404: status #747474 · nav #000000, 1.66~1.87초). 그 프레임은 F0 의 정의상 F0 앞이라
        # 「F0 뒤」만 보면 구현 전 영상도 통과한다. 런처 확대 프레임의 가장자리 표본(status #B18795 · nav #251032)과 섞이지 않게 회색 #757575 ±16 · 순검정(채널 모두 16 이하)만 센다
        cover = next((k for k in range(start if start is not None else 0, f0) if all(near(fr[k]["p"][a], fr[k]["p"][c]) for a, c in (("top", "centreL"), ("top", "low"), ("centreL", "low")))), None)
        pre_gray = [k for k in range(cover, f0) if near(fr[k]["p"]["status"], GRAY)] if cover is not None else []
        pre_black = [k for k in range(cover, f0) if max(fr[k]["p"]["nav"]) <= 16] if cover is not None else []
        print("L7-e: F0 뒤 status 가 #757575 ±16 인 프레임 %d장 · nav 점이 어두운(세 채널 모두 64 미만) 프레임 %d장 · F0 앞 (창 안쪽 세 점이 덮인 %s 부터) status 회색 %d장 · nav 순검정 %d장 (기대 모두 0)" % (len(gray), len(dark_nav), tt(cover), len(pre_gray), len(pre_black)))
        gray, dark_nav = gray + pre_gray, dark_nav + pre_black
        l7["L7-e"] = "PASS" if not gray and not dark_nav else "FAIL"
    for key in sorted(l7):
        print("%s 판정: %s" % (key, l7[key]))

    nxt = f0 + 1 if f0 + 1 < len(fr) else None
    print("PNG 로 뽑을 프레임 인덱스(px.py strip 용): F0 = %s · F0 다음 = %s · F1 = %s · J0 = %s" % (fr[f0]["i"], fr[nxt]["i"] if nxt is not None else "없음", fr[f1]["i"] if f1 is not None else "없음", fr[j0]["i"] if j0 is not None else "없음"))
    if j0 is not None:
        mx = max(fr[k]["white"] for k in range(j0, end))
        print("기록(판정 아님) 워드마크: 워드마크가 처음 보인 프레임(J0)의 흰 점 %d / 그 구간 최대 %d = %d%% (spec 의 구현 전 실측 56%% · 91%% 는 다른 정의의 수치라 참고용)" % (fr[j0]["white"], mx, round(100 * fr[j0]["white"] / mx) if mx else 0))
    else:
        print("기록(판정 아님) 워드마크: J0 없음 — 진행도를 적지 않는다")

    verdicts = [interval] + list(l7.values())
    if "FAIL" in verdicts:
        print("FAIL")
        return 1
    if "판정 불가" in verdicts:
        print("판정 불가 (통과가 아니다)")
        return 3
    print("PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

### `px.py` — PNG 판독

```python file=px.py
#!/usr/bin/env python3
"""android-launch-appearance e2e 판독 도구 — 표준 라이브러리만 쓴다(Pillow · ImageMagick 불필요).

  px.py samples PNG...                          여섯 표본점의 색
  px.py expect PNG HEX TOL 점이름,점이름,...      그 점들이 HEX 에 채널별 TOL 이내인지(PASS/FAIL)
  px.py center PNG [SIZE]                       화면 가운데 SIZE x SIZE 에서 #F46B18 이 아닌 점 · 흰 점의 수 (L2)
  px.py rows PNG [x0,y0,x1,y1]                  가로줄의 절반 이상이 정확히 #F46B18 인 줄의 수 (L6)
  px.py strip PNG [MODE]                        상태바 띠의 아이콘 색과 같은 띠의 실제 배경색과의 대비 (L7). MODE:
                                                  contrast  대비 >= 3.0 만 판정 (L7-a, API 31+ 시스템 스플래시. 명암은 판정하지 않는다)
                                                  dark      아이콘이 어둡다(상대 휘도 < 0.1) 만 판정 (L7-b)
                                                  both      어둡고 대비 >= 3.0 (L7-d, API 30 이하. 기본값)
  px.py dist PNG [ROWS]                         상태바 글리프의 픽셀별 대비 분포 — 시계 묶음과 아이콘 묶음을 갈라 4.5 이상 · 3.0 이상인 픽셀 비율과 평균 (L7-a 의 기록. 판정하지 않는다 — 늘 0)
  px.py iconedge PNG x0 y0 x1 y1                런처 아이콘 칸에서 마스크 가장자리 안쪽 10px 가 주황인지 (L4)

종료 코드: 0 통과 · 1 판정 실패 · 2 사용법.  PNG 는 `screencap -p` 나 frames 가 저장한 8비트 RGB/RGBA 비인터레이스 형식이다.
"""
import struct
import sys
import zlib

ORANGE = (0xF4, 0x6B, 0x18)
FIRST = (0xFF, 0xFD, 0xFC)
POINTS = [("status", 0.10, 0.012), ("top", 0.10, 0.10), ("centre", 0.50, 0.50),
          ("centreL", 0.30, 0.50), ("low", 0.10, 0.85), ("nav", 0.10, 0.99)]


def load(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "PNG 가 아니다: " + path
    p = 8
    idat = b""
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
    raw = zlib.decompress(idat)
    st = w * bpp
    rows = []
    prev = bytearray(st)
    q = 0
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
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        rows.append(line)
        prev = line
    return w, h, bpp, rows


def at(img, x, y):
    w, h, bpp, rows = img
    r = rows[y]
    return (r[x * bpp], r[x * bpp + 1], r[x * bpp + 2])


def hx(c):
    return "#%02X%02X%02X" % c


def parse_hex(s):
    s = s.lstrip("#")
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def near(c, ref, tol):
    return all(abs(c[i] - ref[i]) <= tol for i in range(3))


def lum(c):
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def point_xy(img, name):
    for n, fx, fy in POINTS:
        if n == name:
            return min(img[0] - 1, int(img[0] * fx)), min(img[1] - 1, int(img[1] * fy))
    raise SystemExit("점 이름을 모른다: " + name)


def cmd_samples(paths):
    for path in paths:
        img = load(path)
        print(path.split("/")[-1], "%dx%d" % (img[0], img[1]),
              " ".join("%s=%s" % (n, hx(at(img, *point_xy(img, n)))) for n, _, _ in POINTS))
    return 0


def cmd_expect(path, hexv, tol, names):
    img = load(path)
    ref, tol, bad = parse_hex(hexv), int(tol), 0
    for n in names.split(","):
        c = at(img, *point_xy(img, n))
        ok = near(c, ref, tol)
        bad += 0 if ok else 1
        print("%s %s=%s (기대 %s ±%d)" % ("PASS" if ok else "FAIL", n, hx(c), hexv, tol))
    return 1 if bad else 0


def cmd_center(path, size=400):
    img = load(path)
    w, h = img[0], img[1]
    x0, y0 = w // 2 - size // 2, h // 2 - size // 2
    # pale = 주황과 흰색 사이의 밝은 점(모든 채널이 주황 이상 · R 240 이상 · 순백은 아님). 반투명 흰 획이 주황 위에 얹힌 색(예 #FAD2BC)이 여기 든다.
    # 안내에만 쓴다 — 판정(non == 0)에는 들어가지 않는다. 아이콘의 밝은 면(예 #FCA98B)도 같은 범위라 색만으로는 가르지 못한다
    non, white, pale = 0, 0, 0
    for y in range(y0, y0 + size):
        for x in range(x0, x0 + size):
            c = at(img, x, y)
            if c != ORANGE:
                non += 1
            if min(c) >= 252:
                white += 1
            elif c != ORANGE and c[0] >= 240 and c[1] >= ORANGE[1] and c[2] >= ORANGE[2]:
                pale += 1
    print("center %dx%d at (%d,%d): #F46B18 이 아닌 점 %d · 흰 점 %d" % (size, size, x0, y0, non, white))
    if non:
        frac = white / float(size * size)
        if frac >= 0.2:
            print("가운데 %d%% 가 흰 면이다 — 흰 원(스플래시 아이콘 바탕) 또는 흰 화면이지 워드마크가 아니다. 스플래시가 걷힌 것으로 보지 않는다. PNG 를 열어 본다" % round(100 * frac))
        elif white:
            print("흰 점이 일부 있다(%.1f%%) — 워드마크의 획일 수 있다(스플래시가 걷히는 중). 1.0초로 줄여 다시 찍어 보고, PNG 를 열어 흰 원 · 아이콘과 구별한다" % (100 * frac))
        elif pale:
            print("흰 점은 없고 밝은 비주황 점(주황과 흰색 사이의 연한 주황)이 %d개다(주황이 아닌 점의 %d%%) — 워드마크의 첫 획일 수 있다(반투명이라 순백이 없다. 스플래시가 걷히는 중). 1.0초 · 0.6초로 줄여 다시 찍는다. 아이콘의 밝은 면도 같은 색 범위라 PNG 를 열어 구별한다" % (pale, round(100.0 * pale / non)))
        else:
            print("주황이 아닌 점이 있고 흰 점도 밝은 비주황 점도 없다 — 아이콘 · 어두운 점이다. PNG 를 열어 본다")
    ok = non == 0
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


def cmd_rows(path, box=None):
    img = load(path)
    w, h = img[0], img[1]
    x0, y0, x1, y1 = (0, 0, w, h) if not box else [int(v) for v in box.split(",")]
    half, edge, first = 0, 0, None
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if at(img, x, y) == ORANGE)
        if n * 2 >= (x1 - x0):
            half += 1
            first = y if first is None else first
            if at(img, x0, y) == ORANGE and at(img, x1 - 1, y) == ORANGE:
                edge += 1
    print("영역 (%d,%d)-(%d,%d): 절반 이상이 #F46B18 인 줄 %d (그중 양 끝이 모두 #F46B18 인 줄 %d, 첫 줄 y=%s)" % (x0, y0, x1, y1, half, edge, first))
    print("PASS" if half == 0 else "FAIL")
    return 0 if half == 0 else 1


def cmd_strip(path, mode="both"):
    if mode not in ("contrast", "dark", "both"):
        return 2
    img = load(path)
    w, h = img[0], img[1]
    ya, yb = int(h * 0.005), int(h * 0.035)
    hist = {}
    for y in range(ya, yb):
        for x in range(0, w, 2):
            c = at(img, x, y)
            hist[c] = hist.get(c, 0) + 1
    bg = max(hist, key=hist.get)
    far = max(hist, key=lambda c: sum((c[i] - bg[i]) ** 2 for i in range(3)))
    dist = max(abs(far[i] - bg[i]) for i in range(3))
    print("상태바 띠 y=%d..%d: 배경(최빈, 같은 캡처의 실제 배경) %s · 배경과 가장 다른 색(아이콘의 가장 밝은/어두운 속 픽셀) %s (채널 차 %d)" % (ya, yb, hx(bg), hx(far), dist))
    if dist < 40:
        print("FAIL 띠에 배경과 구별되는 색이 없다 — 아이콘이 배경과 거의 같은 색이거나 그려지지 않았다")
        return 1
    L, C = lum(far), contrast(far, bg)
    dark = L < 0.1
    print("아이콘 상대 휘도 %.3f (어두움 = 0.1 미만: %s) · 실제 배경과의 대비 %.2f:1 (기준 3.0:1 이상)" % (L, dark, C))
    print("주의: 대비는 아이콘의 가장 밝은/어두운 속 픽셀 기준의 상한이다(가장자리의 안티에일리어싱 픽셀은 더 낮다). 영상 프레임은 코덱 오차가 3.02:1 같은 근소한 값의 여유보다 커서 이 판정은 무손실 PNG 에서만 한다")
    ok = {"contrast": C >= 3.0, "dark": dark, "both": dark and C >= 3.0}[mode]
    print("판정 모드 %s: %s" % (mode, "PASS" if ok else "FAIL"))
    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


def cmd_dist(path, ymax=160):
    # 기록용이다(판정 없음). 위 ymax 줄(전폭, 표본 추출 없음)의 최빈색을 배경으로, 배경과 한 채널이라도 다른 모든 픽셀을 전경으로 센다.
    # 전경을 가로로 12px 넘게 떨어진 묶음으로 가른다 — 맨 왼쪽 묶음이 시계(텍스트), 나머지가 아이콘이다(Pixel 의 상태바 배치 기준. 다른 배치면 묶음의 x 범위를 보고 읽는다).
    # 전경에는 획의 속 · 가장자리 안티에일리어싱 · 플랫폼이 일부러 흐리게 그리는 것(셀룰러 막대의 꺼진 칸)이 섞인다.
    img = load(path)
    w = img[0]
    ymax = min(ymax, img[1])
    hist = {}
    for y in range(ymax):
        for x in range(w):
            c = at(img, x, y)
            hist[c] = hist.get(c, 0) + 1
    bg = max(hist, key=hist.get)
    fg = [(x, y) for y in range(ymax) for x in range(w) if at(img, x, y) != bg]
    print("위 %d줄: 배경(최빈) %s 상대 휘도 %.4f · 전경 픽셀 %d" % (ymax, hx(bg), lum(bg), len(fg)))
    if not fg:
        print("전경 픽셀이 없다 — 상태바 글리프가 그려지지 않았거나 배경과 같은 색이다")
        return 0
    cols = sorted(set(x for x, _ in fg))
    runs, start, prev = [], cols[0], cols[0]
    for x in cols[1:]:
        if x - prev > 12:
            runs.append((start, prev))
            start = x
        prev = x
    runs.append((start, prev))

    def line(name, pts):
        cs = sorted(contrast(at(img, x, y), bg) for x, y in pts)
        n = len(cs)
        far = max((at(img, x, y) for x, y in pts), key=lambda c: sum((c[i] - bg[i]) ** 2 for i in range(3)))
        print("  %-12s 픽셀 %5d · 가장 먼 색 %s 색 쌍 대비 %.3f:1 · 4.5 이상 %5.1f%% · 3.0 이상 %5.1f%% · 중앙값 %.2f · 평균 %.2f" % (
            name, n, hx(far), contrast(far, bg),
            100.0 * sum(1 for c in cs if c >= 4.5) / n, 100.0 * sum(1 for c in cs if c >= 3.0) / n, cs[n // 2], sum(cs) / n))

    groups = [[(x, y) for x, y in fg if a <= x <= b] for a, b in runs]
    for i, (a, b) in enumerate(runs):
        line("묶음 %d x=%d..%d" % (i, a, b), groups[i])
    line("시계(묶음 0)", groups[0])
    if len(groups) > 1:
        line("아이콘(나머지)", [q for g in groups[1:] for q in g])
    line("전체", fg)
    print("기록일 뿐 판정이 아니다. 색 쌍 대비는 지정된 두 색의 산술값이고, 비율 · 평균은 화면에 그려진 픽셀의 분포다(가장자리 때문에 어느 색 쌍에서도 100%가 아니다)")
    return 0


def klass(c):
    if c[0] > 200 and c[1] < 200 and c[2] < 170:
        return "O"   # 주황 계열(L4 의 판정 색)
    if min(c) >= 240:
        return "W"   # 흰색
    return "."


def cmd_iconedge(path, x0, y0, x1, y1):
    img = load(path)
    x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
    best = None
    for y in range(y0, min(y1, y0 + (x1 - x0))):
        rl, rr = at(img, x0, y), at(img, x1 - 1, y)

        def d(c, r):
            return max(abs(c[i] - r[i]) for i in range(3))
        L = next((x for x in range(x0, x1 - 8) if all(d(at(img, x + k, y), rl) > 40 for k in range(6))), None)
        R = next((x for x in range(x1 - 1, x0 + 8, -1) if all(d(at(img, x - k, y), rr) > 40 for k in range(6))), None)
        if L is not None and R is not None and R > L and (best is None or R - L > best[0]):
            best = (R - L, y, L, R)
    if not best:
        print("칸 안에서 아이콘의 가장자리를 찾지 못했다 — 칸의 좌표 · 배경 화면(단색에 가까운 것)을 확인한다")
        return 2
    width, y, L, R = best
    print("아이콘 가운뎃줄 y=%d · 마스크 가장자리 x=%d..%d (지름 %dpx)" % (y, L, R, width + 1))
    runs, cur, start = [], None, L
    for x in range(L, R + 1):
        k = klass(at(img, x, y))
        if k != cur:
            if cur is not None:
                runs.append((cur, start, x - 1))
            cur, start = k, x
    runs.append((cur, start, R))
    print("런(O 주황 · W 흰색 · . 그 밖): " + " ".join("%s:%d-%d" % r for r in runs if r[2] - r[1] >= 3))
    bad = 0
    for name, xs in (("왼쪽", range(L + 2, L + 12)), ("오른쪽", range(R - 11, R - 1))):
        non = [x for x in xs if klass(at(img, x, y)) != "O"]
        lead = 0
        seq = range(L + 2, R) if name == "왼쪽" else range(R - 2, L, -1)
        for x in seq:
            if klass(at(img, x, y)) == "O":
                break
            lead += 1
        print("%s 안쪽 10px: 주황이 아닌 점 %d개 (가장자리부터 주황이 아닌 구간 %dpx)" % (name, len(non), lead))
        bad += 1 if non else 0
    print("PASS" if not bad else "FAIL")
    return 1 if bad else 0


def main(a):
    if len(a) < 2:
        print(__doc__)
        return 2
    c = a[1]
    try:
        if c == "samples":
            return cmd_samples(a[2:])
        if c == "expect":
            return cmd_expect(*a[2:6])
        if c == "center":
            return cmd_center(a[2], int(a[3]) if len(a) > 3 else 400)
        if c == "rows":
            return cmd_rows(a[2], a[3] if len(a) > 3 else None)
        if c == "strip":
            return cmd_strip(a[2], a[3] if len(a) > 3 else "both")
        if c == "dist":
            return cmd_dist(a[2], int(a[3]) if len(a) > 3 else 160)
        if c == "iconedge":
            return cmd_iconedge(*a[2:7])
    except TypeError:
        pass
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```
