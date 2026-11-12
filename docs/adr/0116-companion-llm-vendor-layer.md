# ADR-0116 — 컴패니언의 LLM 호출은 자체 인터페이스 `CompanionLlm` 하나 뒤에 두고, 구현은 Anthropic 공식 SDK를 바로 쓴다

- 상태: **제안** — FE 팀 리뷰 대기. `feat/companion-m1`이 이미 이 결정대로 쓰였다(`_shared/companion-llm.ts` · `companion-llm-fake.ts`).
- 날짜: (채택일에 적는다)
- 다루는 축: Edge Function이 LLM을 **어떤 계층으로** 부르는가, 단계마다 **어떤 모델을** 쓰는가, 벤더를 **언제 · 어떻게** 바꾸는가.
  **다루지 않는 것**: 프롬프트 글(→ `companion-llm-prompts.ts` · `companion-prompt.ts` · `companion-safety.ts`) · 원가 · 크레딧 단가(→ PRD O1) · 평가 세트(→ PRD §6).
- 이어받는 결정: 없음. PRD §9 ADR 후보 2가 「얇은 계층 하나(후보 Vercel AI SDK)」로 적었던 것을 구현대로 좁힌다.

근거 표시: **[코드]** 저장소 코드 · **[사용자]** 사용자 결정 · **[추론]** 관찰 없이 이어 붙인 것.

## 맥락

1. **LLM이 하는 일은 여섯 가지로 고정돼 있다** [코드 — `chat-send.contract.ts` `CompanionLlm`]. 답변 스트림(`reply`) · 입력 · 출력 검사(`moderate`) · 피드백 카드(`feedback`) · L1 번역(`translate`) · 기억 추출(`extractMemories`) · 요약(`summarize`). 도구 호출 · 에이전트 루프 · 여러 단계 체인이 없다.
2. **구조화 출력 · 프롬프트 캐시 · 생각 깊이 · 서버 쪽 대체 모델**을 쓴다 [코드]. 검사 · 피드백 · 번역 · 기억은 zod 스키마로 받는 구조화 출력(`messages.parse` + `zodOutputFormat`), 답변은 시스템 프롬프트 앞부분에 `cache_control`, 모든 호출 `effort: "low"`.
3. **원가와 지연이 단계마다 다르다** [사용자 — 2026-11-09]. 답변 · 피드백은 품질이, 검사 · 번역 · 기억 · 요약은 속도와 원가가 먼저다.
4. **키 없이도 화면을 봐야 한다** [코드]. `COMPANION_LLM=fake`면 정해진 답을 내는 구현이 같은 인터페이스로 돈다. 테스트도 이 구현을 쓴다.

## 결정

### D1. 핸들러는 `CompanionLlm` 인터페이스만 안다

- `chat-send` · `companion-proactive` · `companion-eval` · `companion-suggest`는 `CompanionLlm`의 메서드만 부른다. 벤더 SDK 타입은 핸들러에 새지 않는다.
- 구현은 둘이다 — 운영 `anthropicCompanionLlm`(`companion-llm.ts`), 키 없는 `fakeCompanionLlm`(`companion-llm-fake.ts`). 벤더를 바꾸면 이 두 파일과 환경 읽기(`chat-send-env.ts`)만 바뀐다.
- 프롬프트 글 · 결과 다듬기(`feedbackFrom` 등)는 벤더와 무관한 모듈(`companion-llm-prompts.ts`)에 둔다 — 평가 창구가 같은 함수를 부르므로 고치면 평가도 같이 바뀐다.

### D2. 구현은 Anthropic 공식 TypeScript SDK를 바로 쓴다 — 중간 추상화 라이브러리 · 오케스트레이션 프레임워크는 없다

- `@anthropic-ai/sdk` 1.3.0(Deno는 `npm:` import map). SDK 재시도는 끄고(`maxRetries: 0`) 재시도는 핸들러가 정한다 — 조각을 하나도 보내기 전일 때만 한 번(API §2.1).
- Vercel AI SDK · LangChain 같은 계층을 두지 않는다(버린 대안).

### D3. 단계마다 모델을 환경 변수로 고른다 [사용자 — 2026-11-09]

| 단계 | 환경 변수 | 비우면 | 운영 |
|---|---|---|---|
| 답변 · 선톡 | `COMPANION_MODEL` | 코드 기본값 | Sonnet |
| 피드백 | `COMPANION_FEEDBACK_MODEL` | `COMPANION_MODEL` | Sonnet |
| 검사 · 기억 추출 · 요약 | `COMPANION_MODERATION_MODEL` | `COMPANION_MODEL` | Haiku |
| L1 번역 | `COMPANION_TRANSLATION_MODEL` | 검사 모델 | Haiku |
| 추천 답변 | `COMPANION_SUGGEST_MODEL` | 검사 모델 | Haiku |

- 번역 스위치 `COMPANION_TRANSLATION`(`every` · `off`). 모르는 값이면 설정 오류(500)다.
- `companion-eval`은 모든 단계를 한 모델로 바꿔 돌려 볼 수 있다(`companionLlmWithModel`, 허용 목록 Haiku · Sonnet · Opus).

### D4. 서버 쪽 대체 모델은 답변 호출에만, Haiku로 도는 호출에는 싣지 않는다

- 정책 거절이 나면 서버가 다른 모델로 다시 돌리는 옵션(`fallbacks: "default"`)은 **답변 스트림에만** 싣는다. 모델 이름이 `claude-haiku`로 시작하면 싣지 않는다 — Haiku에는 대체 모델이 없어 옵션을 실으면 요청이 거절된다(`serverFallbackOptions`).
- 구조화 출력 호출(검사 · 피드백 · 번역 · 기억)은 거절되면 `StructuredUnavailable`로 끝나고, 핸들러가 그 단계만 없는 것으로 처리한다(피드백 `unavailable` · 번역 없음 등). 검사 호출이 실패하면 통과로 보지 않고 턴을 `upstream_unavailable`로 끝낸다(차감 없음).

## 버린 대안

- **Vercel AI SDK(PRD 초안의 후보)** — 벤더 중립이지만 우리가 쓰는 기능(구조화 출력 형식 · 프롬프트 캐시 · 생각 깊이 · 서버 쪽 대체 모델 베타)은 벤더별 옵션이라 결국 벤더 옵션을 그대로 넘기게 된다. 의존성 하나가 늘고 Deno 배포 검증도 하나 는다. 인터페이스가 여섯 메서드라 자체 계층으로 충분하다.
- **LangChain 등 오케스트레이션 프레임워크** — 맥락 1. 체인 · 에이전트 · 도구가 없다. 프롬프트가 프레임워크 템플릿 뒤로 숨으면 평가 창구가 운영과 같은 글을 돌린다는 보장이 약해진다.
- **SDK 없이 HTTP 직접 호출** — 가능하지만 스트림 이벤트 해석 · 구조화 출력 파싱을 우리가 다시 쓴다. 공식 SDK가 Deno `npm:`으로 돈다.
- **모든 단계를 한 모델로** — 맥락 3. 검사 · 번역을 Sonnet으로 돌리면 턴마다 원가와 지연이 그대로 는다.

## 대가

- 벤더를 바꾸면 `companion-llm.ts`를 새로 쓴다(약 230줄) — 인터페이스 덕에 핸들러 · 테스트는 그대로다.
- 단계마다 모델이 달라 평가를 단계별로 돌려야 한다(`companion-eval`의 `kind`).
- 서버 쪽 대체 모델은 베타 옵션이다 — 이름이 바뀌면 `serverFallbackOptions`를 고친다.

## 재검토 조건 — 벤더 교체 기준

- 벤더 비교(PRD §6)에서 다른 벤더가 페르소나 유지 · 한국어 자연스러움 · 교정 정확도 · 가드레일 통과에서 같거나 낫고 원가가 분명히 낮을 때.
- 이용약관의 미성년자 · 로맨스 허용 범위가 바뀌어 1단계 정책(PRD §3.3 · §3.12)과 맞지 않게 될 때.
- 한 벤더 장애가 반복돼 두 번째 벤더로 넘기는 대체 경로가 필요해질 때 — 그때 `CompanionLlm` 구현을 둘 겹쳐 쓰는 래퍼를 더한다.
- 도구 호출 · 여러 단계 에이전트가 기능 요구로 생기면(2단계 미션 채점 등) 오케스트레이션 계층을 다시 본다.
