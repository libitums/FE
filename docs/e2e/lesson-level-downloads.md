# 레슨 단위 받기 · 받기 시트 매번 묻기 · 설정 레슨 집계 — 기기 확인

결정은 [ADR-0095](../adr/0095-content-delivery-and-data-policy.md) 적용 기록 ⟨2026-11-06⟩ 3d(레슨 단위 받기)와 [ADR-0071](../adr/0071-episode-background-download.md) D3(받기 단위) 적용 기록이 진다. 받기 · 허락 · 받음 표시의 단위가 편에서 「공통 + 유닛」으로 내려갔고, 받기 시트의 「Don't ask again」 행이 사라졌으며, wifi-only 시트에 출구 셋이 생겼고, 설정 › 다운로드에 편별 레슨 집계가 생겼다.

자동 테스트(unit · ui · integration)는 자산 묶음 나누기 · 묶음별 받기 순서 · 허락 토큰 · 대상별 받음 판정 · 시트 행 · 액션 순서 · 설정 집계 줄을 지킨다. 아래는 **기기에서만** 판정한다.

- 호스트가 파일을 실제로 **공통 → 유닛 순**으로 받는가(자동 테스트는 가짜 받기 호출 순서만 본다).
- 실제 셀룰러로 바뀌었을 때 OS가 연결 종류를 알려 시트가 뜨는가 · 비행기 모드의 오프라인 판정.
- 「설정 바꾸기」가 설정 탭의 다운로드 화면으로 가고 뒤로가 설정 루트로 돌아오는가(실제 탭 스택).
- 최대 글자 크기에서 시트 본문(행 셋 + 안내)이 잘리지 않는가.

수용 기준 번호는 이 작업의 요구사항 1 ~ 9를 가리킨다(항목 표 마지막 열).

## 준비

- Release 호스트(iOS) · 디버그 이상(Android). 번들에 `apps/mobile/.env.local`의 `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`(PostHog 키는 넣지 않는다). 새 워크트리에는 이 파일이 없으니 메인 체크아웃에서 복사한다.
- **처음 설치**(또는 앱 삭제 후 재설치)로 시작한다. 받아 둔 파일 · 받음 표시가 남아 있으면 「덜 받음」 조건을 만들 수 없다. 항목마다 조건이 다르면 앱을 지우고 다시 설치한다.
- 학습 진행: u01-water S1이 열려 있어야 한다(내장 에피소드 — 첫 실행 뒤 튜토리얼을 마치면 열린다). 표지 · S1 · S2를 누를 수 있는 계정으로 시작한다.
- **셀룰러만**: Wi-Fi를 끄고 셀룰러 데이터를 켠다(iOS 설정 › Wi-Fi 끔 · Android 빠른 설정 Wi-Fi 끔). 시뮬레이터 · 에뮬레이터는 실제 셀룰러 전환을 알리지 않으니 **실기**로 본다. 「모바일 데이터」 판정(`metered` · `constrained`)은 호스트 `NetworkStatusModule`이 준다.
- **비행기 모드**: 제어 센터 · 빠른 설정에서 켠다. Wi-Fi도 꺼진 상태여야 한다(비행기 모드 뒤 Wi-Fi가 자동으로 켜지는 기기가 있다).
- **정책 바꾸기**: 설정 탭 › 「Downloads」 › 「Download on mobile data」에서 「Ask every time」 · 「Always download」 · 「Wi-Fi only」를 고른다. 새 설치의 기본값은 「Ask every time」이다.
- **받기 순서 보는 법**: 호스트 모듈(`ContentFileModule`, iOS `apps/ios/Host/ContentFileModule.swift` · Android `apps/android/app/src/main/java/com/libitum/host/ContentFileModule.java`)은 **로그를 남기지 않는다** — 로그 태그가 없다. 대신 받은 파일이 앱 전용 폴더 `content-files/`에 경로 그대로 생기므로 그 폴더의 **수정 시각 순서**를 본다.
  - iOS(실기): `xcrun devicectl device info files --device <기기> --domain-type appDataContainer --domain-identifier com.libitum.host --subdirectory "Library/Application Support/content-files"`로 목록을 뜨고 받는 도중 몇 초 간격으로 반복해 새 경로가 어느 묶음에서 생기는지 본다(`devicectl device copy from`으로 폴더를 내려받아 `ls -lt`로 봐도 된다).
  - Android(디버그 빌드): `adb shell run-as libitum.duru.android ls -lt files/content-files/<하위 폴더>`를 받는 도중 반복한다.
  - 공통 묶음 파일 = 표지 · 통과 뒤 컷 · 대화 · 낱말 · 상대 아바타 · 막간 자산(`steps[]` 밖). 유닛 파일 = 그 스텝 아래의 그림 · 음성. 어느 파일이 어느 묶음인지는 에피소드 JSON(`steps[i]`의 `image_url` · `audio_url`)과 맞춰 본다. 받음 표시 키는 기기에서 직접 읽기 어려우니 **시트가 다시 묻는지**(받은 유닛은 묻지 않는다)로 간접 판정한다.

## 항목

| id | 기기 | 절차 | 기대 | 수용 기준 |
| --- | --- | --- | --- | --- |
| LD-E1 | iOS · Android | 처음 설치 · 셀룰러만(Wi-Fi 끔) · 정책 「Ask every time」. 맵에서 u01 첫 유닛(S1, 「Lesson 1」)을 탭한다 | 유닛은 열리지 않고 시트 「Download Lesson 1?」(설명 「Pictures and audio for this lesson aren't on your phone yet. Downloading uses mobile data.」)이 뜬다. **크기 줄(「About …」)이 없다.** 본문 행이 **셋**: 「Shared pictures and audio」 · 「Downloads now」(pending), 「Lesson 1」 · 「Downloads now」(pending), 「Other lessons」 · 「On Wi-Fi」. 안내 「You'll be asked each time. Change this in Settings › Downloads.」. 버튼은 「Download now」 · 「Download on Wi-Fi」 둘뿐이고 **「Don't ask again」 행이 없다.** 구현 전과 다르다: 옛 빌드는 「Download Episode 1?」(편 시트)에 크기 줄 · 「Don't ask again」 체크 행이 있고 행 목록 · 안내가 없다. 「Download on Wi-Fi」를 누르면 시트가 닫히고 유닛은 열리지 않는다 | 1, 3 |
| LD-E2 | iOS · Android | LD-E1에서 「Download now」를 누른다. 받는 동안 「받기 순서 보는 법」으로 폴더를 반복해 본다. 다 받은 뒤 맵으로 나와 S2를 탭한다. 그 뒤 설정 › Downloads를 연다 | 유닛이 열리고, 폴더에는 **공통 묶음 파일이 먼저, 그 뒤에 S1 파일**이 생긴다(S1 파일이 생긴 뒤에 새 공통 파일이 생기지 않는다). 다 받은 뒤 S2를 탭하면 **다시 묻는다** — 시트 「Download Lesson 2?」에서 첫 행 「Shared pictures and audio」가 「On your phone」(done), 「Lesson 2」는 「Downloads now」. 이미 받은 S1을 다시 탭하면 시트 없이 열린다. 설정 › Downloads › 「Download on mobile data」는 여전히 **「Ask every time」**이다(시트의 어떤 선택도 정책을 바꾸지 않는다). 구현 전과 다르다: 옛 빌드는 「지금 받기」가 그 편 전체를 허락하고(S2도 묻지 않고 받음) 체크 행을 켠 경우에만 정책이 바뀌었다 | 1, 3, 4, 7 |
| LD-E3 | iOS · Android | 처음 설치 · 셀룰러만 · 정책 「Ask every time」. 맵에서 u01 표지를 탭한다 | 시트 「Download Episode 1?」(설명 「Pictures and audio for this episode aren't on your phone yet. Downloading uses mobile data.」)에 **크기 줄 「About …」**이 있고 행이 **둘**(「Shared pictures and audio」 pending · 「All lessons in this episode」 pending). 「Don't ask again」 행 없음. 「Download now」 → 표지가 열리고, 폴더에 **공통 → S1 → S2 … → RP 순**으로(스텝 순) 편 전체가 받아진다. 다 받은 뒤 어느 유닛을 탭해도 시트 없이 열린다. 구현 전과의 구별: 시트 모양은 옛 빌드와 비슷하지만(편 시트) 행 목록 · 안내가 있고 체크 행이 없으며, 받기가 유닛 순으로 진행된다 | 2, 3, 7 |
| LD-E4 | iOS · Android | 처음 설치 · 셀룰러만 · 설정에서 정책을 「Wi-Fi only」로 바꾼 뒤 맵으로 돌아와 덜 받은 유닛(S1)을 탭한다. 세 출구를 각각 다시 시도한다(앱을 지우지 않고 시트를 다시 띄움) | 시트 「Lesson 1 downloads on Wi-Fi」, 설명 「You chose Wi-Fi only in Settings. Use mobile data this once, open without pictures and audio, or change the setting.」, 행 셋(LD-E1과 같다). 버튼 **셋**: 「Use mobile data this once」 · 「Open without pictures and audio」 · 「Change setting」. ① 「Use mobile data this once」 → S1이 받아지며 열리고, 설정의 정책은 **그대로 「Wi-Fi only」**(다른 유닛을 탭하면 다시 안내). ② 「Open without pictures and audio」 → 받지 않고 열린다(그림은 단색, 듣기 항목은 건너뜀, 폴더에 새 파일 없음). ③ 「Change setting」 → **설정 탭의 Downloads 화면**이 서고, 뒤로 → 설정 루트. 구현 전과 다르다: 옛 빌드는 「OK」 하나뿐이라 열 수도 받을 수도 설정으로 갈 수도 없었다 | 3, 6 |
| LD-E5 | iOS · Android | 비행기 모드(Wi-Fi 포함 끔). 덜 받은 유닛을 탭한다. 이어서 LD-E2에서 받아 둔 유닛(S1)을 탭한다 | 덜 받은 유닛: 시트 「You're offline」, 설명 「Lesson 2 isn't downloaded yet. It will download when you're back online.」(해당 유닛 이름), 안내 「Pictures show as plain color and listening items are skipped.」, 행 목록 없음. 버튼 순서 **「Open anyway」 → 「OK」**(첫 버튼이 열기). 「Open anyway」 → 열린다. 받아 둔 유닛: **시트 없이** 열린다(같은 편의 다른 유닛이 덜 받아져 있어도). 구현 전과 다르다: 옛 빌드는 편 문구(「Episode 1 isn't downloaded yet…」)에 버튼 순서가 「OK」 → 「Open anyway」였고, 편 일부만 받았으면 받은 유닛도 시트가 떴다 | 4, 5 |
| LD-E6 | iOS · Android | Wi-Fi 연결(요금 없는 연결). 정책을 「Ask every time」 · 「Wi-Fi only」 · 「Always download」 각각으로 두고 처음 설치 상태에서 표지 · 유닛을 탭한다. 튜토리얼(Episode 0) 유닛도 탭한다 | 어떤 정책에서도 **시트가 뜨지 않고** 바로 열리며 백그라운드로 편 전체가 자동으로 받아진다(폴더에 파일이 계속 생긴다). 튜토리얼도 시트 없이 열린다. 정책 「Always download」는 셀룰러에서도 같다. 회귀 0(옛 빌드와 같아야 한다) | 9 |
| LD-E7 | iOS · Android | 설정 › Downloads를 연다(LD-E2 뒤 — S1만 받은 상태). 셀룰러에서 「Download the rest of Episode 1」을 누른다. Wi-Fi에서 다시 한 번 해 본다. 「Download all for offline」 · 「Downloaded: …」 줄도 확인한다 | 편마다 한 줄: 진행 중인 편은 「Episode 1: 1 of 11 lessons」 꼴(받은 수 of 전체), 다 받은 편은 「Episode n: complete」. 버튼 「Download the rest of Episode 1」(진행 중인 편 = 맵 순서로 첫 미완료 열린 편의 번호). 셀룰러에서 누르면 확인 창 「Download on mobile data?」(설명 「The rest of Episode 1 downloads on mobile data. You can also wait for Wi-Fi.」), 「Download now」 → 「Downloading in the background. You can keep learning.」 줄이 서고 폴더에 그 편의 남은 유닛 파일이 생기며, 다 받으면 줄이 「Episode 1: complete」로 바뀐다(화면을 다시 열어 확인). 「Cancel」은 아무것도 받지 않는다. Wi-Fi에서는 확인 창 없이 곧바로 시작한다. 「Download all for offline」 동작과 「Downloaded: …」(받은 용량 = 다 받은 편의 합 — 편이 끝나기 전에는 그 편이 더해지지 않는다)는 옛 빌드와 같다. 구현 전과 다르다: 옛 빌드는 집계 줄 · 「Download the rest…」 버튼이 없다 | 8 |
| LD-E8 | iOS | 설정 › 손쉬운 사용 › 디스플레이 및 텍스트 크기 › 더 큰 텍스트에서 최대(Accessibility 5단계)로 올린다. LD-E1 · LD-E4 시트를 띄운다 | 제목 · 설명 · 행 셋 · 안내가 **잘리지 않고 끝까지 보이며 버튼이 화면 안에 보여 눌린다**(시트의 설명 영역은 스크롤 가능). 행 하나가 고정 높이가 아니라 줄 바꿈으로 늘어난다. 넘치거나 버튼이 가려지면 계약(spec 3-1)의 「본문을 scroll-view로 감싸지 않는다」 결정을 다시 본다 | (비기능 — 큰 글자) |

## 구현 전과의 차이

옛 빌드(편 단위 시트)와 이 문서의 새 빌드를 판정자가 구별하는 표지는 다음과 같다. 기대가 이 표지와 맞지 않으면 옛 동작이 남았거나 새 동작이 덜 들어간 것이다.

| 장면 | 구현 전(옛 빌드) | 구현 후(새 빌드) |
| --- | --- | --- |
| 유닛 탭 · 셀룰러 · 묻기 | 「Download Episode 1?」 편 시트(크기 줄 · 「Don't ask again」 체크 행) | 「Download Lesson 1?」, 크기 줄 없음, 행 셋, 체크 행 없음 |
| 「Download now」 | 편 전체를 허락 · 받기, 체크했으면 정책이 「Always download」로 저장 | 그 유닛(과 공통)만 허락 · 받기, 정책 저장값 불변 |
| 같은 편의 다른 유닛 | 이미 편을 허락했으니 묻지 않고 받음(또는 편 일부만 받아도 시트) | 받은 유닛은 묻지 않고 열리고 덜 받은 유닛은 다시 묻는다 |
| wifi-only · 덜 받음 | 「OK」 버튼 하나 | 「Use mobile data this once」 · 「Open without pictures and audio」 · 「Change setting」 |
| 오프라인 · 덜 받음 | 편 문구, 버튼 「OK」 → 「Open anyway」 | 유닛 문구 · 안내 줄, 버튼 「Open anyway」 → 「OK」 |
| 받기 순서 | 편 단위로 한꺼번에(편이 끝나야 받은 것으로 판정) | 공통 → 유닛(스텝 순), 유닛이 끝나는 즉시 그 유닛은 받은 것으로 판정 |
| 설정 › Downloads | 설명 · 모두 받기 · 받은 용량 | 편별 「Episode n: a of b lessons / complete」 줄 + 「Download the rest of Episode n」 추가 |

## 실행 기록

| 날짜 | 기기 | 빌드 | 결과 |
| --- | --- | --- | --- |
