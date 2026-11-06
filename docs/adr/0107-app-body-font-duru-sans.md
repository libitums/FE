# ADR-0107 — 본문 글꼴을 앱에 넣는다 (Duru Sans = Pretendard JP 서브셋, 로마자는 Duru Roman)

- 상태: **채택 — 호스트 글꼴 파일 + 앱 CSS + Android 호스트 한 줄.** 서버 변경 0.
- 날짜: 2026-11-06.
- **사용자 결정**(2026-11-06): 「Pretendard 설치해서 적용은」 → 「다국어도 적용이 돼야 하지 않나」 → 「기울임도 있는 폰트는」 → 「Pretendard JP도 있을 텐데」 → 추천안(**Pretendard JP의 JIS 1수준 서브셋 + 로마자용 Inter Italic 서브셋**)으로 「진행」.
- 다루는 축: 본문 · 버튼 토큰(`Pretendard Variable` 목록)이 실제로 무엇으로 그려지는가, 로마자 기울임의 출처, 일본어 자형.
  **다루지 않는 것**: 랜딩(웹 글꼴 — 따로), 강조 글꼴(Jost · League Spartan — ADR-0030 · 0091 그대로), 보기 로마자 표시(별도 작업).
- 부분 대체: [ADR-0030](0030-app-fonts-jost.md) D3(「Pretendard는 넣지 않는다」), [ADR-0084](0084-lesson-item-redesign.md) 재검토 조건 1(로마자 기울임의 출처), [ADR-0098](0098-japanese-localization.md) D4(일본어 목록의 맨 앞).

## 맥락

1. **토큰은 Pretendard인데 앱에는 Pretendard가 없었다** [코드]. 본문 · 버튼 토큰 19개와 `font-family-default`가 `"Pretendard Variable", "Pretendard", -apple-system, …`이고, 호스트에 넣은 글꼴은 Jost · League Spartan뿐이다 — 본문은 iOS SF Pro + Apple SD Gothic Neo, Android Roboto + 기기 한글 글꼴로 그려졌다(플랫폼 · 제조사마다 모양이 다르다).
2. **글자 범위**(2026-11-06 대조 — 앱 문구 `ui-copy-*.ts`와 콘텐츠 JSON 25편의 모든 글자를 글꼴 cmap과 견줌):

   | 글꼴 | ko · en · es · id · vi | ja |
   |---|---|---|
   | Pretendard 1.3.9 | 빠짐 없음(베트남어 성조 글자 포함) | 가나는 있음, **한자 250자(콘텐츠 523자) 없음** |
   | **Pretendard JP 1.3.9** | 빠짐 없음 | **빠짐 없음**(한자 7,138자) |

   이모지 한 글자(👀)는 어느 쪽에도 없고 시스템 이모지 글꼴로 그려진다.
3. **크기**(직접 서브셋 — 모두 라틴 · 베트남어 · KS X 1001 한글 2,350자 포함):

   | 판 | 한자 | 크기 |
   |---|---|---|
   | Pretendard(비교) | — | 1.25 MB |
   | JP · 저장소가 쓰는 한자만 | 751 | 1.74 MB |
   | **JP · JIS X 0208 1수준 + 저장소 한자** | **3,212** | **3.84 MB** |
   | JP · JIS 1 · 2수준 | 6,355 | 6.66 MB |
   | JP 원본 | 7,138 | 12.48 MB |

   콘텐츠는 내려받으므로 「쓰는 한자만」 판은 새 에피소드의 처음 보는 한자가 시스템 글꼴로 섞인다 — 버렸다.
4. **한글 글꼴에는 기울임 판이 없다** — Pretendard · Noto Sans KR · IBM Plex Sans KR · SUIT · Wanted Sans · LINE Seed 모두. 앱의 로마자 줄은 기울임이 모양 채널이고(ADR-0084), 지금까지는 시스템 서체의 진짜 기울임이었다. Pretendard에서 `font-style: italic`은 합성(iOS는 똑바로 그릴 수 있음)이 된다.
5. **Pretendard JP는 OFL의 예약 글꼴 이름(RFN)이 「Pretendard JP」다**(`LICENSE.txt`). 글자를 덜어 낸 서브셋은 OFL이 말하는 수정판이라 예약 이름을 쓸 수 없다. Inter는 예약 이름이 없다.
6. **Android 배포 빌드는 앱 글꼴을 한 번도 그리지 않았다** [기기 — 2026-11-06 에뮬레이터 R6(API 30) · Pixel 8(API 37)]. `bundled` 빌드의 온보딩 제목이 Jost가 아니라 Roboto였고, 같은 소스의 Debug 빌드는 Jost였다. 대조:
   - R8을 끈 `bundled` → 그대로 Roboto(R8 아님).
   - `bundled`에 **아무 일도 하지 않는 일반 자원 가져오기**(`setGenericResourceFetcher`)를 등록 → Jost · Duru Sans가 그려짐. 가져오기는 한 번도 불리지 않았다.
   - 원인: `MainActivity`가 `setEnableGenericResourceFetcher(TRUE)`로 켜 두고, 가져오기는 Debug의 `DebugSupport`만 등록했다. Lynx Android(4.0.1)는 켜진 채 가져오기가 없으면 `@font-face`의 `local(file://…)`을 그리지 않는다. ADR-0092의 확인은 Debug 빌드였다.

## 결정

### D1. 본문 글꼴은 Duru Sans — Pretendard JP 1.3.9 변형 글꼴의 서브셋

- 출처: npm `pretendard-jp@1.3.9` `dist/public/variable/PretendardJPVariable.ttf`(OFL 1.1). 굵기 축(wght 45 ~ 930)은 남긴다 — 토큰이 500 · 600 · 700을 쓴다.
- 범위: 라틴(기본 · Latin-1 · 확장 A/B · 결합 부호 · 확장 추가(베트남어) · 일반 구두점 · 통화 · 문자형 기호 · 화살표), 한글 호환 자모 + **KS X 1001 2,350자**, CJK 기호 · 가나 · 전각/반각, **JIS X 0208 1수준 한자**, 그리고 저장소의 콘텐츠 · 문구에 쓰인 한글 음절 · 한자.
- **이름은 `Duru Sans`**(D5의 RFN). 파일 `DuruSans.ttf` 4,028,140 bytes.
- 만드는 법: `tooling/fonts/build.sh <PretendardJPVariable.ttf> <InterVariable-Italic.ttf>`(fonttools) — iOS · Android 두 자리에 같은 파일을 쓴다.

### D2. 로마자는 Duru Roman — Inter 4.1 Italic, 굵기 500 정적 판

- 출처: Inter 4.1 릴리스 `InterVariable-Italic.ttf`(OFL 1.1). `wght=500 · opsz=14`로 고정한 정적 판에서 ASCII · Latin-1 · 일반 구두점만 남긴다(로마자 표기는 ASCII뿐). `DuruRoman.ttf` 89,916 bytes.
- 쓰는 자리: `.text-role-romanization`(학습 화면 로마자 전부), 언어 선택 미리보기 로마자, ChatBubble 로마자(`app.css`가 셸 아래에서 다시 정함). 목록은 `"Duru Roman", "DuruRoman", -apple-system, BlinkMacSystemFont, system-ui, "Roboto", "Helvetica Neue", "Segoe UI", sans-serif` — 없으면 시스템 서체의 진짜 기울임으로 떨어진다. `font-style: italic`은 그대로 둔다.
- Pretendard의 라틴이 Inter를 바탕으로 해서 본문과 로마자 줄의 결이 같다. ADR-0084 재검토 조건 1의 대안(로마자만 Jost)은 버렸다 — 본문과 결이 다르다.

### D3. 토큰 목록 — 앱 글꼴을 맨 앞(강조는 Jost 뒤)에 끼운다

- `.app`: 본문 · 버튼 토큰 19개 + `font-family-default`의 목록 맨 앞에 `"Duru Sans", "DuruSans"`. 나머지는 토큰의 대체 순서 그대로(토큰마다 다시 적는다 — 변수 안의 `var()`에 기대지 않는다).
- 강조 토큰(`.app` · `.app-lang-vi`): `"DuruJost"` · `"DuruLeagueSpartan"` 바로 뒤에 `"Duru Sans", "DuruSans"` — 한글 · 가나 · 한자가 Duru Sans로 떨어진다.
- `.app-lang-ja`: 모든 글꼴 토큰의 맨 앞이 `"Duru Sans", "DuruSans"`, 그다음이 지금의 일본어 시스템 글꼴(`Hiragino Sans` · `Noto Sans JP` …). Pretendard JP의 한자는 일본 자형이라 ADR-0098 D4의 걱정(한국 · 중국 자형)이 풀리고, 서브셋에 없는 드문 한자만 일본어 시스템 글꼴로 떨어진다.
- 찾는 길은 Jost와 같다(ADR-0030 · 0092): iOS는 `UIAppFonts`에 등록한 이름 `Duru Sans` · `Duru Roman`, Android는 `@font-face` `DuruSans` · `DuruRoman`(`local(file:///data/data/libitum.duru.android/files/fonts/…)`) — `AppFonts.FILES`에 두 파일을 더한다.

### D4. Android 호스트는 배포 빌드에서도 일반 자원 가져오기를 등록한다

- `UnavailableResourceFetcher`(main 소스) — 모든 요청을 실패로 돌려준다. 이 앱은 템플릿 · 그림 · 소리를 다른 길로 읽어 여기로 오는 요청이 없다(2026-11-06 확인: 시험용 가져오기가 한 번도 불리지 않음).
- `MainActivity`가 `setEnableGenericResourceFetcher(TRUE)` 바로 뒤에 등록하고, Debug는 `DebugSupport`가 `DevResourceFetcher`로 바꾼다.
- `host-app-fonts.integration.test.mjs` AF-W3: 일반 자원 가져오기를 켜면 main 소스가 `UnavailableResourceFetcher`를 등록해야 한다.
- 이 한 줄로 **이미 배포된 Jost(강조) · League Spartan(베트남어 강조)도 Android 배포 빌드에서 처음 그려진다.**

### D5. 서브셋은 새 이름을 단다 — OFL 예약 이름

- 이름표(가족 · 하위 가족 · 전체 · PostScript · 고유 ID)를 `Duru Sans` / `Duru Roman`으로 바꾼다. 저작권 · 라이선스 줄은 원본 그대로 두고, 원본 `LICENSE.txt`를 `DuruSans-OFL.txt` · `DuruRoman-OFL.txt`로 글꼴 옆에 둔다(iOS · Android 둘 다).
- 약관 · 오픈소스 고지 화면이 생기면 Pretendard JP(길형진) · Inter(The Inter Project Authors)의 OFL 고지를 싣는다(ADR-0030 재검토 조건과 같은 자리).

## 측정 (2026-11-06)

- **Android 첫 화면 시간**(`am start -W` TotalTime, 에뮬레이터 R6 API 30, `bundled` 빌드 — 새 글꼴 두 파일 유무만 다름, 5회):
  - 첫 실행(설치 직후 · 글꼴 복사 포함): 없음 165 · 235 · 190 · 191 · 193 ms(중앙 191) / 있음 191 · 195 · 196 · 237 · 220 ms(중앙 196).
  - 두 번째 실행(복사 없음): 없음 중앙 183 ms / 있음 중앙 174 ms — 차이 없음.
  - 복사는 크기가 같으면 다시 하지 않는다(`AppFonts.needsCopy`). 저사양 실기의 첫 실행 비용은 아직 실기로 재지 않았다.
- **APK 크기**: `bundled` 55,293,490 → 57,741,037 bytes(+2.45 MB, 압축 후). 앱 번들(`main.lynx.bundle`)은 CSS 목록만 늘었다.
- **화면**(Pixel 8 에뮬레이터 `bundled`): 온보딩 제목 Jost, 말풍선 · 로그인 화면 본문 Duru Sans, 굵기 700(제목) · 600(버튼) · 500(본문) 구별됨. 언어 선택 미리보기 로마자가 Duru Roman(Inter Italic)과 같은 모양이고 이중으로 기울지 않음(Debug playground).

## 대가

1. **설치 크기 +약 4.1 MB(압축 전) · APK +2.45 MB.** 저사양 기기 목록(기기 성능 목록)에서 저장 공간이 빠듯한 기기에 부담이다.
2. **본문 글자 폭 · 줄바꿈이 모든 화면에서 바뀐다.** Inter 계열은 Roboto · SF Pro보다 조금 넓다 — 13 mini 높이 예산(ADR-0084 §5) · compact 밀도 · 큰 글자에서 넘치는 화면이 생길 수 있다. 이번 변경은 온보딩 · 로그인 · 언어 선택만 기기로 봤다.
3. **iOS는 시뮬레이터(iPhone 17, iOS 26.5)로만 봤다** — 같은 빌드에서 `DuruSans.ttf` · `DuruRoman.ttf`만 뺀 판과 온보딩 화면이 달라(글자 모양 · 줄 폭) 등록 이름 `Duru Sans`로 그려짐을 확인했다. 로마자 기울임 · 실기 · 일본어 UI 화면은 아직 보지 않았다.
4. **서브셋 밖의 글자**(KS X 1001 밖 한글 음절 · JIS 1수준 밖 한자)는 그 글자만 시스템 글꼴로 그려진다 — 새 콘텐츠가 들어오면 `build.sh`를 다시 돌려 저장소의 글자를 더한다.
5. 한글 본문의 `font-style: italic`(통화 화면 배경 대사 · 비주얼 노블 곁말)은 합성 기울임이 된다 — iOS는 똑바로 그릴 수 있다. 로마자가 아니라 그대로 둔다.
6. 패키지 이름이 CSS에 박히는 대가(ADR-0092)는 그대로다.

## 재검토 조건

- 일본어 사용자 비중이 작게 남으면 → 한자를 덜어 낸 판(Pretendard 기본 서브셋, 1.25 MB)으로 되돌리고 `.app-lang-ja`의 맨 앞을 일본어 시스템 글꼴로 돌린다.
- 새 콘텐츠에 서브셋 밖 글자가 늘면 → `build.sh`를 다시 돌린다(저장소 글자를 자동으로 더한다).
- Lynx가 `@font-face` 굵기 · 스타일 서술자를 받게 되면 → Duru Sans를 정적 판 여러 개로 나눌지 본다.
- Lynx가 일반 자원 가져오기 없이도 `@font-face`를 그리게 되면 → `UnavailableResourceFetcher`를 걷는다.
