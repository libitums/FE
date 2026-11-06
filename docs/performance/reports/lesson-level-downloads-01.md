# 레슨 단위 받기 — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 그림 · 음성을 받는 · 허락하는 · 받았다고 판정하는 단위를 편에서 「공통 + 유닛」으로 내리고, 받기 시트의 「다시 묻지 않기」를 없애며, Wi-Fi만 정책에 출구 셋을, 설정 › 다운로드에 편별 레슨 집계와 「이 편 나머지 받기」를 더합니다 — ADR-0095 3d(D5 ~ D8 정정) · ADR-0071 D3.
- 대상 commit: `feat/lesson-level-downloads`(origin/main c3afcf8a 위)
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm --filter @libitums/mobile build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-06

## 시나리오

- 번들 크기: CI 설정 빌드 `main.lynx.bundle` 3,931.4 kB(상한 4,060.0 kB 통과), `ui-lynx/dist` 555.6 kB(상한 556.0 kB 통과) — 최종 `pnpm verify`의 `size:check`.
- 런타임: 미측정. 받기 차례마다 편 하나의 자산을 공통 → 유닛 묶음으로 나누고(한 번 더 걷는 순수 계산), 묶음마다 표시 하나를 읽고 씁니다. 표지 · 유닛을 누를 때마다 편 표시에 더해 공통 · 유닛 표시를 읽습니다. 설정 › 다운로드를 열 때 편마다 유닛 수만큼 표시를 읽습니다(u01은 11).

## 이 변경이 무엇을 건드렸나

- 받기 파이프라인(묶음): `episode-assets.ts`(공통 · 유닛 분할) · 새 `episode-asset-groups-sync.ts`(공통 → 유닛 순 받기 · 묶음 표시 · `deferred`) · `episode-refresh-entry.ts`(편 단위 사전 판정 제거) · `download-policy.ts`(허락 토큰 `"<id>#<unitKey>"`) · `download-usage.ts`(대상별 받음 판정 · 받은 유닛 수).
- 문지기: `use-download-gate.tsx`(편 · 유닛 대상) · 새 `download-gate-layer.tsx`(시트 · 핸들러 — 정책 저장 없음) · 새 `download-gate-target.ts`.
- 시트: `DownloadSheet` 새 상태 행 셋 · 안내 한 줄 · 체크 행 제거 · wifi-only 액션 셋 · 오프라인 액션 순서, 새 `DownloadSheetBody`, 문구 다섯 언어.
- 설정: `DownloadSettingsScreen` 편별 집계 줄 · 「이 편 나머지 받기」 · 「모두 받기」 outline, 새 `download-progress.ts` · `download-settings-nav.ts`(설정 탭 루트 → `download-settings`).

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다. 번들은 `main.lynx.bundle` 3,931.4 kB(이전 보고서 `download-sheets-01` 3,848.2 kB에서 +83.2 kB, 상한까지 128.6 kB), `ui-lynx/dist` 555.6 kB(상한까지 0.4 kB — ui-lynx 변경 0이라 이 변경이 늘린 것이 아닙니다).

## 해석

- 이 기록은 성능 판정이 아닙니다. 받기 차례의 추가 계산(자산 목록을 한 번 더 걷고 묶음마다 표시를 읽고 씀)과 설정 화면의 표시 읽기는 모두 저장소 키-값 읽기 몇 번 수준이지만, 재지 않아 수치로 말할 수 없습니다(미측정의 한계).
- 받는 파일의 수와 순서만 바뀌고 동시 받기 4개 · sha 검증 · 스테이징은 그대로라, 받기 전체 시간은 이전과 같아야 한다는 것은 추론이지 측정이 아닙니다.

## 결론과 후속

- 미측정입니다.
- 후속: 기기 확인(`docs/e2e/lesson-level-downloads.md` LD-E1 ~ E8)에서 공통 → 유닛 받기 순서와 큰 글자의 시트 본문을 본 뒤, 받기 중 탭 지연(ADR-0071 ⟨2026-11-05⟩ 기록과 같은 자리)이 다시 보이면 받기 차례를 측정 빌드로 잽니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
