# Android 공통 버튼 접근성 View — 01

## 실행 조건

- 상태: 미측정 — 렌더링 시간·프레임·메모리 캡처를 수행하지 않았다.
- 대상 commit: `2da6e59d` 이후 공통 `Button`의 Android 평탄화 설정 변경.
- 기기: Android 15 API 35 ARM 에뮬레이터, 390×844·320×640·160 dpi.
- OS: Android 15.
- Lynx SDK: 4.0.1.
- 빌드: 번들 포함 Android APK.

## 시나리오

온보딩의 `Next`·`Get started`와 로그인 화면의 Apple·Google·Facebook 버튼에서
`flatten={false}`로 Android 네이티브 View를 생성해 접근성 이름을 노출했다.

## 분석 결과

- Android `uiautomator dump`에서 `Next`와 세 소셜 버튼의 `content-desc`를 확인했다.
- 390×844 호스트 Maestro와 320×640·글자 배율 1.0·1.3 Maestro가 이름 선택으로 통과했다.
- 공통 버튼마다 Android View가 하나씩 추가된다.
- 렌더링 시간·프레임·메모리 수치는 수집하지 않았다.

## 해석

버튼 이름의 접근성 노출은 확인됐다. 성능 지표는 미측정이므로 추가 View가
프레임·메모리에 미친 영향은 판정하지 않는다.

## 결론과 후속

실제 TalkBack 탐색과 낭독을 검증할 때 화면별 View 수와 성능도 함께 측정한다.
