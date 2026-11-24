# Letters — 스피커 색은 소리가 나는 동안만 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 칸 상태가 「들은 칸 목록」에서 「지금 소리가 나는 칸 하나」로 바뀌고, 탭마다 다시 그리는 칸 수는 전과 같다(누른 칸 · 앞 칸).
- 기능 변경: 자모 칸 스피커(기초 칸은 테두리도)가 소리가 나는 동안만 brand-strong이다([ADR-0169](../../adr/0169-more-menu-letters-wordbook.md) 2026-11-23 적용 기록).
- 대상 commit: `fix/letters-speaker-while-playing` 브랜치 HEAD
- 기기: 렌더 측정 기기 없음. 화면은 Android 에뮬레이터에서 봤다(PR 본문).
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`(`.env.local` 없음)
- 측정 일시: 2026-11-23

## 시나리오

- 번들 천장 검사만. main 대비 증감은 PR의 번들 크기 보고(CI)가 단다.

## 이 변경이 무엇을 건드렸나

- 새 훅 `components/use-playing-letter.ts`(재생 중 칸 하나 · 3초 안전망 타이머), `LettersScreen` · `EntryBasicsLettersScreen`의 칸 상태, `LetterSoundPort.play`의 끝 알림, 결선.

## 분석 결과

- 번들 크기는 CI 「Build and bundle size」의 PR 보고를 본다. 탭 하나에 타이머 하나가 서고 다음 탭이나 화면을 떠날 때 걷힌다.

## 제한 사항

- 렌더 성능은 미측정이다 — 이 문서는 성능 판정의 근거가 아니다.

## 결론과 후속

- 없음.
