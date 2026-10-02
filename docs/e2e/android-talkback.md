# Android TalkBack 검증

## 환경과 재현

Android 15 API 35 Google Play ARM 에뮬레이터(390×844, 160 dpi)에 포함된
`com.google.android.marvin.talkback` 서비스를 켰다. `dumpsys accessibility`에서
TalkBack이 `Bound services`에 나타났고 터치 탐색도 켜져 있었다. 테스트 APK는
모의 Supabase URL을 넣은 내장 번들 APK로 실행했다. 접근성 계측은 같은 번들의
Debug APK와 로컬 HTTP 미리보기를 사용했다.

전용 에뮬레이터와 Maestro가 준비되면 저장소 루트에서 실행한다.

```sh
E2E_UDID=<Google Play 에뮬레이터 ID> pnpm test:e2e:android:talkback
```

이 명령은 모의 인증 설정으로 Lynx 번들과 APK를 다시 빌드·설치하고 TalkBack을 켠 뒤
기존 온보딩 Maestro E2E를 실행한다. Node.js·pnpm·JDK 17·Android SDK·Maestro가
필요하며, 전용 에뮬레이터의 앱 데이터가 지워진다. 제공자 로그인은 호출하지 않는다.

## 관찰 결과

- TalkBack 활성 상태의 첫 화면에서 실제 초점 테두리가 첫 대사에 표시됐다.
- 진행 표시의 장식용 `PageIndicator`가 부모의 `Step 1 of 3` 대신
  `Scene 1 of 3`을 노출했다. 온보딩에서는 내부 표시를 장식으로 처리해
  `Step 1 of 3` 노드가 노출되는 것을 계측에서 확인했다.
- 초기 Maestro 실행에서는 첫 대사가 보였지만 `Next` 선택이 한 번 실패했다. 실패
  화면에는 버튼이 그려졌으나 계층 JSON에는 `Next`가 없었다. 동일 APK와 TalkBack
  활성 상태에서 이후 세 번 연속 온보딩부터 로그인 화면까지 통과했다.
- `ButtonAccessibilityTest`는 첫 대사를 번역문만으로 찾던 기대값을 실제
  `화자: 한국어 대사, 번역` 접근성 이름으로 고쳤다. 계측의 `UiAutomation`도 TalkBack
  서비스를 중지하지 않도록 설정했다. 수정 후 TalkBack 활성 Google Play 이미지에서
  `ACTION_CLICK`으로 온보딩 전체와 로그인 버튼·약관 링크 노드를 확인해 통과했다.

이 자동화는 TalkBack 서비스가 켜진 동안의 노드 노출과 접근성 클릭을 확인한다.
헤드리스 에뮬레이터에서 음성 출력, 스와이프에 따른 실제 초점 순서, 제공자 로그인과
로그인 후 화면 탐색은 확인하지 못했다. 초기 `Next` 누락이 반복되는지도 계속 살펴야
하므로 전체 사용자 경험을 통과로 판정하지 않는다.
