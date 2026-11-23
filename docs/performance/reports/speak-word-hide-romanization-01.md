# 낱말 말하기 — 판정 전 정답 로마자를 「Hint」 뒤로 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 판정 전 카드에서 로마자 줄이 빠지고 조립 문항과 같은 「Hint」 버튼(알약 하나)이 선다. 시트는 누를 때만 선다.
- 기능 변경: 낱말 말하기(SPEAK_WORD)의 판정 전 정답 로마자는 「Hint → Show the answer」로만 선다(「Hear the answer」는 정답 소리). 판정 뒤 정답 상자는 그대로([ADR-0084](../../adr/0084-lesson-item-redesign.md) 2026-11-23 적용 기록).
- 대상 commit: `fix/speak-word-hide-romanization` 브랜치 HEAD
- 기기: 렌더 측정 기기 없음(번들 크기만)
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음)
- 측정 일시: 2026-11-23

## 시나리오

- 번들 크기 천장 검사(`pnpm size:check`)만 돌렸다. main과의 증감은 PR의 번들 크기 보고(CI, 같은 조건)가 단다.

## 이 변경이 무엇을 건드렸나

- `SpeakWordActivity`가 판정 전 로마자 줄 대신 `speak-word-hint.tsx`(조립 문항 힌트 부품 재사용)를 그린다. 보조 버튼을 `SpeakWordSecondary.tsx`로 뺐다(파일 300줄 규칙).
- 이벤트: 판정 · 건너뜀 보고에 기존 속성 `hintUsed`가 실린다. 네이티브 · 콘텐츠는 바뀌지 않았다.

## 분석 결과

| 번들 | 크기 | 천장 |
| --- | ---: | ---: |
| 이 변경 (`.env.local` 없음) | 5,516.6 kB | 5,850.0 kB |

## 제한 사항

- 번들만 쟀고 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.

## 결론과 후속

- 배포 뒤 SPEAK_WORD의 「들은 응답 중 정답률」을 다시 본다 — 지금 수치(u01 S6-10 53% · u02 S6-13 67%)는 로마자 도움을 받은 값이다.
