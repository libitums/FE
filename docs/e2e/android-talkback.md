# Android TalkBack 검증

## 환경과 재현

Android 15 API 35 Google Play ARM 에뮬레이터(390×844, 160 dpi)에 포함된
`com.google.android.marvin.talkback` 서비스를 켰다. `dumpsys accessibility`에서
TalkBack이 `Bound services`에 나타났고 터치 탐색도 켜져 있었다. 테스트 APK는
모의 Supabase URL을 넣은 Debug 번들과 로컬 HTTP 미리보기로 실행했다.

전용 에뮬레이터와 Maestro가 준비되면 저장소 루트에서 실행한다.

```sh
E2E_UDID=<Google Play 에뮬레이터 ID> pnpm test:e2e:android:talkback
```

이 명령은 TalkBack을 켜고 기존 온보딩 Maestro E2E를 실행한다. 전용 에뮬레이터의
앱 데이터가 지워진다. 테스트 빌드에는 `PUBLIC_SUPABASE_URL=https://example.invalid`와
모의 anon key를 사용하므로 제공자 로그인을 호출하지 않는다.

## 관찰 결과

- TalkBack 활성 상태의 첫 화면에서 실제 초점 테두리가 첫 대사에 표시됐다.
- 진행 표시의 장식용 `PageIndicator`가 부모의 `Step 1 of 3` 대신
  `Scene 1 of 3`을 노출했다. 온보딩에서는 내부 표시를 장식으로 처리해
  `Step 1 of 3` 노드가 노출되는 것을 계측에서 확인했다.
- 같은 환경에서 `android-host.yaml`의 첫 대사는 보였지만 `Next` 선택이 실패했다.
  실패 시 Maestro 화면에는 버튼이 그려졌으나 계층 JSON에는 `Next`가 없었다.
- AOSP API 35 에뮬레이터에서 `ButtonAccessibilityTest`는 통과했다. TalkBack을
  켠 Google Play 이미지에서 같은 계측은 Lynx 접근성 노드가 호출마다 달라져
  완주하지 못했다.

따라서 실제 TalkBack의 온보딩 전체 초점 순서, 음성 낭독, 로그인 버튼 실행은 아직
통과로 판정할 수 없다. `Next` 노드가 TalkBack 활성 상태에서 안정적으로 제공되는지
호스트와 Lynx의 접근성 트리 상호작용을 확인해야 한다. 음성 출력은 헤드리스
에뮬레이터에서 청취하지 않았다. 하단 탐색·설정 항목에는 Android 네이티브 View와
접근성 클릭 동작을 붙였으며, 로그인된 화면의 실제 TalkBack 탐색도 후속 검증이 필요하다.
