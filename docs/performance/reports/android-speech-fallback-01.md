# Android 말하기 — 온디바이스 한국어 팩 없음 → 네트워크 인식기로 되돌아감 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. JS 쪽 변경은 인식 결과 페이로드의 키 셋을 읽어 측정 이벤트에 싣는 것과, 화면이 아직 부르지 않는 한국어 팩 접점 함수뿐이라 렌더 경로가 늘지 않는다.
- 기능 변경: Android 호스트가 ko-KR 모델이 없는 온디바이스 인식기 대신 네트워크 인식기로 한 번 다시 시도한다(시작 전 확인 · 실행 중 언어 오류). 결과 · 측정 이벤트에 오류 코드 · 되돌아감 · 한국어 팩 상태를 싣는다([ADR-0017](../../adr/0017-host-native-capabilities-and-audio.md) 2026-11-19 적용 기록).
- 대상 commit: `fix/android-speech-fallback` 브랜치 HEAD
- 기기: 렌더 측정 기기 없음(번들 크기만). 호스트 동작은 Android 37 에뮬레이터(Pixel_8 AVD, Play 이미지, 오디오 없음)에서 계측 테스트로 확인했다 — 아래 「제한 사항」
- OS: 해당 없음(번들 산출물). 호스트 계측은 Android 17(API 37) 에뮬레이터
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build` 산출 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음, CI와 같음)
- 측정 일시: 2026-11-19

## 시나리오

- 번들 크기: 같은 작업 트리에서 `apps/mobile/src`만 origin/main(`c3a80f8b`)으로 되돌려 지은 크기와 이 변경을 비교했다.

## 이 변경이 무엇을 건드렸나

- 인식 결과 파서가 키 셋(`koreanPack` · `fallback` · `fallbackErrorCode`)을 더 읽고, 말하기 결말 · 문항 보고 · 측정 이벤트가 진단 세 값을 싣는다.
- 새 모듈 `lib/speech-korean-pack.ts`(팩 상태 · 내려받기 접점과 내려받기 제안 판정) — 아직 어느 화면도 import하지 않는다(동의 화면은 디자인 승인 대기).
- 네이티브(Android): 컨트롤러 · 새 클래스 둘(`SpeechRecognitionRoute` · `SpeechModelSupport`). 앱 번들 크기와 무관하다. iOS는 바뀌지 않았다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| origin/main `c3a80f8b` (`.env.local` 없음) | 5,241,451 bytes |
| 이 변경 (`.env.local` 없음) | 5,242,696 bytes (+1,245) |

- 천장 5,327,000 B([ADR-0149](../../adr/0149-bundle-size-ceiling-and-report.md))는 그대로다 — 남은 여유 84,304 B.

## 제한 사항

- 번들만 쟀고 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 시작 전 팩 확인(`checkRecognitionSupport`)은 첫 말하기에서 최대 1초를 기다린다(그 뒤는 앱이 떠 있는 동안 기억). 에뮬레이터에서는 곧바로 답했다. 실기 지연은 재지 않았다.

## 결론과 후속

- 실기 확인: 한국어 오프라인 팩이 없는 Android 13+ 폰에서 낱말 말하기가 들리는지, 이벤트에 `speechFallback: pack-missing`이 실리는지 본다([Android 검증](../../e2e/android-speech-recognition.md) 「한국어 팩 없음」).
- 배포 뒤 `episode_item_answered`(SPEAK_WORD)의 건너뜀 비율을 `speechFallback` · `speechKoreanPack` · `speechErrorCode`로 갈라 본다.
