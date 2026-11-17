# 에피소드 설문 낮은 별점 이유 체크리스트 — 01

## 실행 조건

- 측정 일시: 2026-11-17T18:00:00+09:00
- 상태: 미측정 — 런타임 성능(Rendering · Memory · Trace)은 수집하지 않았다. 설문 시트(에피소드당 한 번 뜸)의 1~3점 단계에 보기 여덟 개가 더해지는 변경의 영향 범위를 적은 기록이다
- 기능 PR: 브랜치 `feat/episode-survey-checklist`
- 대상 commit: 첫 커밋
- 기기: 없음(vitest · Node 22)
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 `pnpm build` · `pnpm size:check`
- 실행 회차: 01

## 시나리오

- 단계: 설문 시트에서 2점 → 이유 체크리스트 → 「Other」 → 글 칸.
- 하지 않은 것: 프레임 · 메모리 측정.

## 이 변경이 무엇을 건드렸나

- 1~3점 단계에서 글 칸 대신 `OptionSelector`(여덟 항목, 두 칸 격자)와 질문 `<text>` 하나를 그린다. 글 칸은 「Other」를 고른 동안만.
- 시트는 에피소드를 끝낸 뒤 한 번만 뜨고, 학습 화면 · 맵 렌더 경로는 바뀌지 않는다.
- 문구 5개 언어 × 9줄.

## 분석 결과

```text
앱 번들 main.lynx.bundle  5031.6 kB / 천장 5327.0 kB (pnpm size:check 통과)
ui-lynx dist              566.6 kB / 622.0 kB
```

## 해석

- 측정 한계: 번들 크기만 봤다. 시트의 화면 맞춤 · 키보드는 기기 확인(`docs/e2e/episode-survey-low-rating-message.md` ESC-E1 ~ E7)이 본다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아니다.
- 후속: 배포 뒤 `feedback.context->>'reasons'` · `episode_survey_answered.reasons` 분포를 본다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
