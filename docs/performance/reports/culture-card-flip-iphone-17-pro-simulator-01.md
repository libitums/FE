# 문화 카드 G2 (카드 덱 + 앞 · 뒤 뒤집기) — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 카드 한 장의 요소 수가 늘었다(덱 뒤 두 장 · 앞면 사진과 명암 · 점) — 렌더 비용은 실기에서 잰 적이 없다.
- 기능 PR: 문화 카드 화면을 G2 시안(사용자 선택)으로 바꾼다 — 덱 위 숫자 · 뒤 두 장 · 앞면(사진 또는 브랜드 면 위 제목) · 뒷면(본문 · In Korean) · 뒤집기 · 점. `stimulus.image_url`을 콘텐츠 그림 포트로 푼다. 근거 [ADR-0072](../../adr/0072-culture-card-flip.md).
- 대상 commit: 이 보고서와 같은 PR의 `feat/culture-card-flip` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 실기 iPhone · Android에서 한다
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-19

## 시나리오

- 번들 크기: 이 변경과 기준선(main 6739e505)을 같은 CI 설정으로 빌드해 바이트를 비교하고 `pnpm size:check`로 판정했다.

## 이 변경이 무엇을 건드렸나

- 새 컴포넌트 하나(`CultureCardFace` — 앞 · 뒷면)와 화면 배선(덱 · 점 · 사진 실패 · 아래 버튼의 뒤집기/넘기기), 순수 함수 넷(`cultureCardActionOf` · `cultureCardFaceClassName` · `cultureCardPhotoOf` · `cultureCardLabelOf`).
- CSS 두 파일(덱 층 · 뒤집기 keyframe · 앞면 명암 · 뒷면 상자). 아이콘 둘(`plastic-bag` · `refresh`)과 ui-lynx `PageIndicator`(이미 번들에 있던 부품).
- 셸에 무대 변형 `stage: "card" | "bare"` 하나. 다른 학습형의 DOM은 그대로(`card` 기본).
- 뒤집기 움직임은 `rotateY` keyframe 300 ms(`d6` · `enter`) 한 번 — 뒤집을 때만 돌고 동작 줄이기에서는 걸지 않는다.
- 의존성 · 미디어 · 네이티브는 바뀌지 않았다. 앞면 사진은 콘텐츠가 주소를 채울 때만 내려받는다(지금 내장 콘텐츠는 전부 빈 주소 — 내려받기 0).

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| 기준선 main 6739e505 — CI 설정 | 2,195,122 bytes |
| 이 변경 — CI 설정 | 2,211,459 bytes |
| 증가 | +16,337 bytes |
| 상한 | 2,197,000 → 2,213,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |

- 증가는 전부 이 기능에서 설명된다 — 새 화면 문자열(클래스 이름 · 문구 · 아이콘 경로)이 두 스레드 산출물에 각각 실린다(`culture-card-` 등장 35 → 92, `Tap to flip` 0 → 4, 아이콘 경로 0 → 2).

## 제한 사항

- 번들만 쟀고 렌더 · 메모리는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 사진이 있는 카드는 지금 내장 콘텐츠에 없어(전부 빈 주소) 사진 내려받기 · 디코드 비용은 어떤 경로로도 재지 않았다.

## 결론과 후속

- 실기에서 [새 형식 화면 e2e](../../e2e/episode-format-screens.md) 「G2 — 카드 덱 + 앞 · 뒤 뒤집기」 소절(CF1 ~ CF9)을 돈다(뒤집기 체감 · 동작 줄이기 · 사진 · 보조기술).
- 콘텐츠가 사진 주소를 채운 뒤 사진 카드 한 회차의 첫 프레임 · 메모리를 이 보고서의 02로 잰다.
