# Letters — 자모 칸 소리를 앱 내장 녹음으로 — 01

## 실행 조건

- 상태: 미측정 — 번들 · 앱 자산 크기만. 렌더링 · 메모리 캡처를 돌리지 않았다. JS 변경은 칸마다 소리 주소를 버킷 해석 대신 순수 함수(`jamoClipOf`)로 고르는 것뿐이다.
- 기능 변경: 자모 칸(Letters · 입장 전 기초)을 누르면 앱에 실은 그 자모의 녹음을 낸다([ADR-0173](../../adr/0173-letters-audio.md) 2026-11-23 적용 기록). 합치기 퀴즈 음절 소리는 그대로.
- 대상 commit: `feat/letters-bundled-jamo-sound` 브랜치 HEAD
- 기기: 렌더 측정 기기 없음. 재생 경로는 Android 에뮬레이터(Pixel_8 AVD, 오디오 없음)에서 호스트가 번들 파일을 여는지만 봤다 — 아래 「제한 사항」
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음)
- 측정 일시: 2026-11-23

## 시나리오

- Lynx 번들 천장 검사(`pnpm size:check`). 앱 자산은 더한 파일 크기 합을 적었다.

## 이 변경이 무엇을 건드렸나

- 순수 함수 `jamoClipOf`(`lib/letters/jamo.ts`), `LetterSoundPort.letterSourceOf`, Letters · 기초 글자 칸의 소리 주소.
- 앱 자산: `apps/ios/Host/audio/hangul-*.m4a` 39개(합계 317,558 B). Android는 같은 폴더를 빌드 때 복사한다.

## 분석 결과

| 항목 | 크기 |
| --- | ---: |
| 더한 앱 음성 자산 39개 | 317,558 B |

- Lynx 번들 수치는 PR의 번들 크기 보고(CI, 같은 조건)가 main 대비 증감을 단다.

## 제한 사항

- 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 녹음 내용(자음이 「가」인지 단독 소리인지)과 실제 소리는 사람이 기기에서 들어 확인해야 한다.

## 결론과 후속

- 실기에서 칸 40개를 눌러 소리 · 음량이 고른지 듣는다.
