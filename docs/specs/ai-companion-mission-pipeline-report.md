# 판 끝: 채점 → 점수 → 리포트 (파이프라인 문서에 합칠 절 — 임시 파일)

> 2026-11-23, 에이전트 C. 조율자가 파이프라인 문서의 「판 끝」 절로 합친다. 정본: 프롬프트 `mission-grader-prompt.ts`, 다듬기
> `mission-grader.ts`(`normalizeGrade` · `buildMissionReport`), 점수 `mission-score.ts`, 계약 `missionReportSchema`, SQL
> `companion_mission_save_result` · `companion.mission_report_json`. 점수식(50 · 30 · 20, 힌트 −5)은 바꾸지 않았다.

## 1. 흐름

1. 판이 닫힌다(`goals` · `turn_limit` · `finish`). 그만둠(`abandon`)은 채점하지 않는다.
2. **채점 호출 한 번**(Sonnet 5.5, 구조화 출력, 출력 상한 3000 토큰). 리포트의 모든 글은 이 한 번에서 나온다 — 고친 문장은 턴마다 저장된
   교정(Haiku)을 다시 쓰므로 추가 호출이 없다.
3. 코드가 다듬는다(`normalizeGrade`): 모르는 id 버림, 목표 최종 달성 = 턴 ∪ 채점자, `tip`은 최종으로 못 이룬 목표에만, `focus.refs`는
   1 ~ 교정 수 안의 번호만(묶음 셋까지), 잘한 점 둘 · 다시 해 볼 표현 셋까지(없으면 못 쓴 목표 표현), 정확도 0 ~ 100 정수.
4. **점수는 코드**(`scoreMission`): `max(0, round(0.5 × 과업 + 0.3 × 정확도 + 0.2 × 목표 표현) − 5 × 힌트)`, 성공 = 필수 목표 모두.
   SQL이 같은 식으로 다시 계산해 결과 행에 남기고(가중치 함께), 코어 값과 다르면 로그(`score_mismatch`)만 남긴다.
5. 리포트(`mission_report_json`) — 결과 행 + 턴 교정 + 이 미션 최고 기록.

## 2. 채점 입력

| 자리표 | 내용 |
|---|---|
| `mission_brief` | 장면 · 상대역 · 목표 요약 · 턴 상한 |
| `goals_json` | `[{id, required, criteria}]` |
| `target_expressions_json` | 미션의 목표 표현 그대로 |
| `turn_goals_done_json` | 턴에서 쌓인 목표(참고일 뿐 — 채점자가 다시 확인) |
| `corrections_json` | 교정이 있는 학습자 메시지마다 `{n, original, corrected, kind, reason}` (`reason` = 교정 조각 까닭을 이은 글, 학습자 언어) |
| `transcript` | 진입 대사부터 전문(`Learner:` · 상대역 호칭) |
| `learner_l1` | 학습자 언어(BCP 47), 모르면 `en` |

## 3. 채점 출력(쓰는 순서 = 근거 → 판정)

| 칸 | 언어 | 규칙 |
|---|---|---|
| `goals[].evidence` → `done` → `tip` | 인용은 한국어 · `tip.meaning`은 L1 | 아래 「목표 판정」 |
| `accuracyNotes` → `accuracy` | 메모(한/영) | 아래 「정확도 눈금」 |
| `expressions[].evidence` → `used` | 인용 | 활용형 · 다른 낱말 · 반말형 · 틀린 꼴(「하나 잔 주세요」)은 사용, 핵심 낱말을 뺀 구조(「아메리카노 주세요」)는 미사용 |
| `focus[{refs, reason}]` | L1 | 턴 교정 번호로 셋까지, 같은 유형 묶음, 문법 용어 없이 한 줄. 받아 적기 흔적 · 말투만 고친 것은 뺀다 |
| `strengths[{quote, note}]` | 인용 · L1 | 한두 개, 구체적으로 |
| `retry[{ko, meaning}]` | 한국어 · L1 | 1 ~ 3, 빈칸 없이 이 장면에 맞게 |
| `headline` · `summary` · `nextStep` | L1 | 한 줄 · 두세 줄(잘한 점 하나 · 고칠 점 하나 · 격려, 빈말 · 숫자 · 문법 용어 금지) · 한 줄 |

**목표 판정**: 학습자 자기 말만 — 상대역이 이름 대고 「네」만 하면 불인정. 말만 하고 안 함(「주문할게요」 · 「이따가 할게요」) 불인정. 통하면
틀려도 인정, 문맥상 분명한 한 낱말(「카드.」) 인정. 핵심이 외국어뿐이면 불인정(한국어 문장 속 외국 낱말은 인정).

**정확도 눈금**: 100 실수 없음 · 90 작은 실수 하나 · 75–85 작은 실수 몇 개 또는 점원에게 반말 내내 · 55–70 메시지 절반쯤 실수 또는 외국어 한 덩이 ·
35–50 대부분 실수 또는 외국어 여러 덩이 · 10–30 거의 한국어 아님 · 0 한국어 없음. 띠를 먼저 고르고 그 안의 수. 받아 적기 흔적(문장 부호 ·
띄어쓰기 · 숫자 표기)과 구어 생략은 실수가 아니다.

**흔들림 줄이기**: 눈금표 · 근거 먼저 · 칸 순서 고정. temperature는 Sonnet 5.5가 받지 않는다(기본값 외 400).

## 4. 리포트 칸(계약 `missionReportSchema`) — ★ = 2026-11-23 더한 (선택) 칸

| 칸 | 언어 | 뜻 |
|---|---|---|
| `outcome` · `endReason` · `totalScore` · `taskScore` · `accuracyScore` · `expressionScore` · `hintsUsed` · `weights` | — | 결과 · 점수 · 그때의 가중치 |
| ★ `scoreParts {task, accuracy, expression, hintPenalty}` | — | 식의 항(가중치 × 세부 점수, 소수 첫째 자리)과 감점 — 화면에 낼지와 별개로 데이터에 |
| ★ `headline` | L1 | 결과 한 줄 |
| `goals[] {id, required, label, done, evidence}` | 인용 | 목표별 달성 + 근거 |
| ★ `goals[].tip {ko, meaning}` | 한 · L1 | 못 이룬 목표의 「이렇게 말하면 됐어요」 |
| `expressions[]` | 한 · L1 | 목표 표현 사용 |
| `corrections[] {original, corrected, kind}` | 한 | 턴 교정 전부 |
| ★ `corrections[].items[] {original, corrected, reason}` | 한 · L1 | 턴 교정 조각(까닭은 Haiku가 쓴 L1) |
| ★ `focus[] {examples[{original, corrected}], reason}` | 한 · L1 | 꼭 볼 고친 문장 0 ~ 3묶음 |
| ★ `strengths[] {quote, note}` | 한 · L1 | 잘한 점 0 ~ 2 |
| `retry[]` | 한 · L1 | 다시 해 볼 표현 0 ~ 3 |
| `summary` | L1 | 총평 두세 줄 |
| ★ `nextStep` | L1 | 다음 도전 한 줄 |
| `bestScore` · `graderModel` · `createdAt` | — | |

## 5. 실패 때 동작 · 지연

- 채점 호출이 시간 초과 · 거절 · 깨진 출력(구조화 출력도 받은 뒤 `graderSchema`로 다시 확인)이면 **부분 리포트를 만들지 않고**
  `grading_failed`(`retryable: true`)로 답하고 값을 돌려준다. 판은 끝난 채 남아 같은 요청이 채점만 다시 돈다(몇 번 불러도 결과는 하나).
  부분 리포트를 버린 까닭: 점수의 30 %인 정확도와 목표 표현이 같은 호출에서 나와, 그것 없이 낸 점수는 나중 점수와 달라진다.
- 칸 하나가 비면(예: `focus` 없음 · `strengths` 빈 배열) 그 구역만 안 그린다. `retry`가 비면 못 쓴 목표 표현으로 채운다.
- 지연(실험실 · 진짜 Sonnet 5.5, 고정 대본 12판 × 4번): 채점 한 번 **중앙 약 5.4초**(4.6 ~ 7.9초, 고치기 전 약 3.3초 — 출력 칸이 늘어서).
  원가는 한 번 약 0.017달러(고치기 전 약 0.010달러). 앱은 채점 중 화면(「Scoring your conversation…」)을 이 시간만큼 보인다.

## 6. 잰 수치(2026-11-23, 맥미니 QA 하니스 · 진짜 모델)

고정 대본 12판(`ops-dashboard` `config/mission-grade-gold.json` — 학습자 · 상대역 말 모두 고정, 답 모델 안 부름, 교정은 진짜 Haiku) ×
(채점 1 + 재채점 3). 기대 범위는 손으로 정했다(셋은 내 계산 착오를 바로잡음 — 파일의 `note`).

| 판 | 기대(합계 · 성공) | 전: 합계 | 후: 합계 | 전 → 후 일치 |
|---|---|---|---|---|
| 01 모범 | 95–100 · 성공 | 100 ×4 | 100 ×4 | 4 → 4 |
| 02 필수만 + 끝내기 | 60–66 · 성공 | 65 ×4 | 65 ×4 | 4 → 4 |
| 03 오류 많음 | 70–90 · 정확도 35–70 | 87 ×4 (정확도 55–58) | 87–90 (정확도 55–65) | 4 → 4 |
| 04 반말 | 78–94 · 정확도 55–85 | 80–90 (표현 판정 흔들림) | 93 ×4 (정확도 78) | 4 → 4 |
| 05 한 낱말 | 50–70 | 63 ×4 | 65 ×4 | 4 → 4 |
| 06 영어 섞임 | 45–72 · 가격 목표 불인정 | 77 ×4 — 영어 「How much is it?」로 가격 인정 | 60–61 | **0 → 4** |
| 07 주제 이탈 | 60–68 | 64 ×4 | 64–65 | 4 → 4 |
| 08 턴 상한 실패 | 38–46 · 실패 · stay 불인정 | 64 ×4 — 상대역 질문에 「네」로 stay 인정, 「아메리카노 주세요」를 「한 잔 주세요」로 인정 | 41 ×4 | **0 → 4** |
| 09 힌트 따라 말함(힌트 2) | 50–57 | 55 ×4 | 55 ×4 | 4 → 4 |
| 10 말만 · 상대역이 대신 | 15–40 · 실패 · 목표 0 | 24–26 | 26–27 | 4 → 4 |
| 11 편의점 필수 뒤 끝내기 | 70–75 | 75 ×4 | 75 ×4 | 4 → 4 |
| 12 받아 적기 흔적 | 94–100 · 정확도 90–100 | 97 ×4 (정확도 90) | 98–99 (정확도 92–95) | 4 → 4 |
| **합계** | | | | **40/48 → 48/48** |

- **재채점 흔들림**(같은 판 4번의 합계 표준편차 평균): 0.42 → **0.25**. 판정(목표 · 표현)이 한 번이라도 뒤집힌 판: 1 → **0**
  (중간 단계에서 03 · 04의 표현 판정이 흔들려 「틀린 꼴 · 반말형도 사용」을 예로 박아 없앴다). 합계 최대 폭: 10점(04) → 3점(03).
- **턴 교정 오탐**(맞는 문장 15개 — 받아 적기 흔적 · 구어 생략 · 숫자 표기): 1/15(「라떼 하나요」를 「주세요」로) → **0/15**.
  틀린 문장 7개 미탐: 0/7 → 0/7(중간 단계에서 「I want americano.」를 놓쳐 규칙 문구를 고침).
- 리포트 언어: L1 칸(headline · summary · nextStep · note · reason · meaning)이 en으로, 한국어 칸(tip.ko · retry.ko · 인용)이 한국어로 나옴을
  12판 모두에서 확인(다른 L1 — es · ja · id · vi — 은 이번에 재지 않음).

## 7. 앱 초안에 없는 요소(앱 인계) — 플레이어 `missionPlayer/reportExtras.tsx`

앱 초안 `MissionReportScreen.tsx`의 구역 · 클래스(`mission-report-section` · `-heading` · `-row` · `-card` · `-ko` · `-strike` · `-muted`)만 써서
더했다. 칸이 없으면(옛 결과 행) 그리지 않는다. 순서: 히어로(결과 · 점수 · 최고 기록 · **결과 한 줄**) → 목표 → **이렇게 말하면 됐어요** →
목표 표현 → 정확도 · 힌트 → **점수 항** → **잘한 점** → **꼭 볼 고친 문장** → 고친 문장(꼭 볼 것에 든 것은 뺌) → 다시 해 볼 표현 → 총평 →
**다음 도전**.

| 문구 키(제안) | 영어(확정) | 쓰는 곳 |
|---|---|---|
| `report.scoreParts` | How your score adds up | 점수 항 구역 제목 |
| `report.partTask` | Goals | 점수 항 줄 |
| `report.partAccuracy` | Accuracy | 점수 항 줄 |
| `report.partExpression` | Target expressions | 점수 항 줄 |
| `report.partHints` | Hints | 점수 항 줄(감점이 있을 때만, 「−10」) |
| `report.tips` | You could have said | 못 이룬 목표 예문 구역 제목 |
| `report.focus` | Key corrections | 꼭 볼 고친 문장 구역 제목 |
| `report.strengths` | What went well | 잘한 점 구역 제목 |
| `report.nextStep` | Next challenge | 다음 도전 구역 제목 |

es · ja · id · vi 번역은 필요. 점수 항 구역을 앱에 낼지는 사용자 결정(데이터에는 늘 있음).

## 8. 남은 것

- Haiku 턴 교정이 한국어 고친 문장에 한자를 섞은 사례 1건(「여기서 마**实** 할게요」, 판 03). `focus`가 턴 교정을 그대로 쓰므로 리포트에도
  나온다 — 교정 다듬기(`feedbackFrom`, 1단계와 공용)에서 원문에 없는 한자 · 가나가 든 고친 문장을 버리는 검사가 필요(이번에 고치지 않음).
- 다른 L1(es · ja · id · vi)의 리포트 언어 · 어조는 재지 않았다.
- SQL의 `scoreParts`는 정수로 남긴 세부 점수로 계산해 코어 값과 소수점에서 다를 수 있다(과업 33.3 → 33).
