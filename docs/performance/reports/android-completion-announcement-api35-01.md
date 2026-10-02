# Android 완료 안내 호스트 성능 기록

## 실행 조건

- 상태: 부분 측정 — Debug APK 크기와 기능 경로만 기록했다. 호출 지연·CPU·메모리는 미측정.
- 대상 commit: `98e12669` (`origin/main`) 기준 `feat/android-completion-announcement` 작업 트리.
- 기기: Android 15 API 35 ARM 에뮬레이터, 390×844·160 dpi·글자 배율 1.0.
- OS: Android 15.
- Lynx SDK: 4.0.1.
- 빌드: Debug APK, 로컬 미리보기 Lynx 번들.
- 실행 회차: 01.

## 시나리오

모의 로그인과 진행 데이터로 한 문항 듣기 화면을 열고 답을 선택해 완료 화면으로
전이한다. 계측은 실제 Android 접근성 공지 이벤트와 콜백을 확인한다.

## 분석 결과

- Debug APK 크기는 62,731,436 bytes다. 동일 조건의 직전 빌드를 확보하지 않아
  증가분은 계산하지 않았다.
- API 35 계측 3건과 Maestro 1건이 통과했다. Maestro에서 완료 화면이 나타났고
  `CompletionAnnouncementModule.announce` 호출이 한 번 기록됐다.
- 완료 공지 요청부터 TalkBack 발화 시작·완료까지의 시간은 수집하지 않았다.

## 해석

이 기록은 기능 경로와 APK 크기에 한정된다. CPU·메모리·호출 지연은 미측정이며,
실제 TalkBack 가청성·중단·완주는 판정할 수 없다.

## 결론과 후속

완료 화면에서 Android 네이티브 안내 호출이 한 번 발생한다. 배포 후보 실기에서
완료 전이의 발화와 지연을 확인한다.
