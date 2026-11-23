# 롤플레이 미션 — 넘겨받는 사람을 위한 메모 (2026-11-19)

2026-11-18 ~ 19에 2단계 「롤플레이 미션」의 서버 · 시험 환경 · 화면 초안을 **브랜치에서만** 만들었다. 이 문서는 그 결과를 한곳에 모은 것이다 —
어디에 무엇이 있는지, 어떻게 돌려 보는지, 넣어야 하는 환경 변수, 그리고 **사용자가 정해야 하는 것**.

- 기획: [2단계 PRD](ai-companion-mission.md) · [ADR-0177](../adr/0177-companion-mission.md)
- **main에는 아무것도 머지하지 않았다. 운영 DB에 적용한 것도, 배포한 것도, 진짜 유료 API를 부른 것도 없다.**
- 이 문서는 임시 메모다. 결정이 끝나면 내용을 PRD · ADR로 옮기고 지운다.

## 1. 브랜치 지도

| 저장소 | 브랜치 | 내용 | 검증 |
|---|---|---|---|
| FE | `feat/companion-mission` (PR #496) | PRD + ADR-0177 | CI 통과 |
| FE | `feat/companion-mission-core` | 미션 코어 — 계약 · 미션 파일 둘 · 프롬프트 틀 · 상태 전이 · 점수식 · 채점 · 힌트 · 실험실 번들 | `pnpm verify` |
| FE | `feat/companion-mission-db` | 마이그레이션 `20261226120000_companion_mission.sql` · SQL 함수 · 통합 테스트 | `pnpm verify` |
| FE | **`feat/companion-mission-server`** | 위 둘을 합치고 Edge Function을 이은 **통합 브랜치** — `mission-start` · `chat-send` 미션 갈래 · `mission-hint` · `mission-finish` · 미션 올리기 스크립트. 이 문서가 여기 있다 | `pnpm verify` |
| FE | `feat/companion-mission-app` | 앱 화면 초안(mock 데이터, 스위치 뒤) — §6 | `pnpm verify` |
| FE | **`feat/companion-mission-e2e-int`** (2026-11-23) | 위 서버 통합 위에 세 갈래를 합친 것 — 답 · 페르소나 · 가드레일 · 연출 지시 · 목표 판정(`e2e-reply`, A), 채점 · 리포트 새 칸(`e2e-report`, C), 작별 인사 · 교정 비한글 거르개 · 미션 장면의 메뉴와 값(version 2). 단계 · 수치 · 앱 인계 · 사용자 결정은 [미션 파이프라인](ai-companion-mission-pipeline.md) | `pnpm verify` |
| FE | `feat/speech-vendor-bench` | 음성 인식 · 발음 평가 벤더 비교 도구(`devtools/speech-bench/`) | `pnpm verify` |
| FE | `feat/roleplay-turn-logs` (PR #498) · `feat/legal-pages` (PR #495) | 턴 로그 · 법률 문서 — 앞서 올린 것 | CI |
| ops-dashboard | `feat/companion-mission-lab` | 「롤플레이 실험실」 백엔드 + 옮겨 온 화면 빌드 | pytest 777 |
| dashboards-web | `feat/companion-mission-lab` | 「롤플레이 실험실」 화면 | 테스트 · 타입 · 빌드 |
| ops-dashboard | **`feat/companion-mission-e2e-int`** (2026-11-23) | 실험실 백엔드 통합 — 판정 · 연출 지시 · 턴 콜백(답 스트리밍 → 플레이어 `turn-stream`의 `replyDelta` · `reply`) · 거르개(A), 음성 · 플레이어(B), 채점 · 리포트(C), 시나리오 25개 · QA 하니스 | pytest |
| dashboards-web | **`feat/companion-mission-e2e-int`** (2026-11-23) | 플레이어(음성 · 스트리밍 턴, B) + 리포트 새 구역(C) | 테스트 · 타입 · 빌드 |

대시보드 두 저장소의 작업 트리: `/Users/komet/orca/ops-dashboard-mission` · `/Users/komet/orca/dashboards-web-mission`(원래 체크아웃은 건드리지 않았다).

## 2. 돌려 보는 방법

### 2.1 대시보드 「롤플레이 실험실」 — 미션을 실제로 해 보는 곳

⟨2026-11-19⟩ **맥미니의 운영 대시보드에 올라가 있다** — `http://1-macmini:8800/companion/mission`(tailnet, 컴패니언 섹션 옆 메뉴 「롤플레이 실험실」),
공개 주소를 켜 두었다면 `https://contents.k-duru.com/companion/mission`. ops-dashboard `main` `a6857de` · dashboards-web `main` `98879dc`.
키(`COMPANION_LAB_ANTHROPIC_API_KEY`)는 맥미니 `runtime/ops.env`에 이미 있어 **진짜 모델로 돈다(유료)** — 판을 시작할 때 확인란을 한 번 적는다.
아래의 로컬 미리보기는 키 없이 흐름만 볼 때 쓴다.

운영 DB · 운영 함수를 쓰지 않는다. 대시보드 프로세스가 Anthropic API를 직접 부르고 결과를 `runtime/companion-mission/mission.db`(로컬 sqlite)에 남긴다.
프롬프트 · 미션 정의 · 점수식은 FE 서버가 쓰는 것을 **번들 파일**(`config/mission-lab-bundle.json`)로 그대로 읽는다.

```sh
cd /Users/komet/orca/ops-dashboard-mission

# 가짜 모드 — 키도 돈도 필요 없다. 흐름만 확인한다(가짜 모델이 낱말로 목표를 정한다)
PREVIEW_FAKE_COMPANION=1 PYTHONPATH=$PWD DURU_NO_PUSH=1 uv run --frozen python scripts/dev_preview.py
# → http://127.0.0.1:18800/companion/mission          한 판 해 보기
# → http://127.0.0.1:18800/companion/mission?tab=scenarios   시나리오 세트 자동 실행

# 진짜 모델 — 유료. runtime/ops.env에 키를 넣은 뒤 위 명령에서 PREVIEW_FAKE_COMPANION=1만 뺀다
```

- **한 판**: 미션 고르기 → 대화(목표 체크리스트 · 남은 턴 · 교정 · 힌트) → 끝 → 리포트(점수와 계산식의 항 · 목표별 근거 발화). 오른쪽에 턴마다 들어간
  시스템 프롬프트 · 모델 원문 · 해석된 상태 · 시간 · 토큰 · 원가. 턴마다 「목표 판정 · 역할 지킴」, 판마다 「채점이 맞았나」를 표시해 둘 수 있다.
  같은 대화를 다시 채점해 점수가 흔들리는지 볼 수 있다(최대 5번).
- **시나리오 세트**: 미션 둘 × 여섯 종류(모범 · 필수만 · 틀렸지만 통함 · 주제 이탈 · 턴 상한 · 모호한 발화) 12개를 자동으로 돌려 턴 판정의 오탐 · 미탐,
  이탈 뒤 복귀, 점수 편차를 낸다. PRD §8의 N2(평가)를 여기서 한다.
- 번들을 바꾸려면 FE에서 `pnpm mission:bundle` → 나온 `apps/supabase-functions/mission-lab-bundle.json`을 대시보드의 `config/mission-lab-bundle.json`에 덮어쓴다.
  덮어쓴 뒤 `uv run --frozen pytest -q tests/test_companion_mission.py`가 번들 안의 사례로 포팅이 맞는지 알려 준다.

### 2.2 FE 서버 — 테스트로만 돈다

```sh
eval "$(fnm env --shell bash)" && fnm use 22.23.5
pnpm install --frozen-lockfile
pnpm --filter @libitums/supabase-functions test:unit          # 코어 · 핸들러(가짜 LLM)
pnpm --filter @libitums/supabase-functions test:integration   # 일회용 Postgres — 한 판을 처음부터 끝까지
node apps/supabase-functions/scripts/upload-missions.ts       # 미션 파일 검증만(dry-run, 네트워크 없음)
```

운영에 올리는 순서는 `apps/supabase-functions/README.md`의 「롤플레이 미션 함수」 절에 있다. **1단계 마이그레이션 기록이 정리되기 전에는 올리지 않는다**(PRD §0.9).

### 2.3 벤더 비교 도구

`feat/speech-vendor-bench`의 `devtools/speech-bench/README.md`를 처음부터 따라간다. 데이터(AI Hub)와 키가 있어야 실제로 돈다.

## 3. 넣어야 하는 환경 변수 (값은 비워 둔다)

### 3.1 대시보드 — `runtime/ops.env` (사람이 넣는다 · 권한 600 · 커밋 금지)

```sh
# 롤플레이 실험실 · 스냅샷 실험실이 함께 쓰는 Claude API 키. 없으면 I18N_ANTHROPIC_API_KEY를 읽는다
COMPANION_LAB_ANTHROPIC_API_KEY=        # sk-ant-…
# (선택) 번들 파일 경로. 비우면 config/mission-lab-bundle.json
COMPANION_MISSION_BUNDLE=               # 절대 경로 또는 저장소 기준 상대 경로
```

### 3.2 FE 서버 — Edge Function 비밀 값 (`supabase/functions/env.example`에 견본이 있다)

```sh
# 미션 모델 — 컴패니언의 모델 설정(COMPANION_MODEL 등)을 물려받지 않는다. 비우면 코드 기본값
COMPANION_MISSION_MODEL=                # 상대역 답 모델 id. 비우면 claude-haiku-5-5 (2026-11-23)
COMPANION_MISSION_JUDGE_MODEL=          # 턴의 목표 판정 모델 id(답 · 교정과 병렬). 비우면 claude-haiku-5-5
COMPANION_MISSION_GRADER_MODEL=         # 채점 모델 id. 비우면 claude-sonnet-5-5
COMPANION_MISSION_FEEDBACK_MODEL=       # 교정 모델 id. 비우면 claude-haiku-5-5
COMPANION_MISSION_HINT_MODEL=           # 힌트 모델 id. 비우면 claude-haiku-5-5
# 아래는 1단계에서 이미 쓰는 것 — 미션 턴의 입력 · 출력 검사와 번역은 이 값을 그대로 읽는다
ANTHROPIC_API_KEY=                      # sk-ant-…
COMPANION_LLM=                          # anthropic | fake
COMPANION_MODERATION_MODEL=             # 검사 모델 id
COMPANION_TRANSLATION_MODEL=            # 번역 모델 id
```

미션 파일을 표로 올릴 때(사람이, 운영 적용 때 한 번):

```sh
SUPABASE_URL=                           # https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=              # service_role 키 또는 sb_secret_…
```

### 3.3 벤더 비교 도구 — 저장소 밖에 둔 파일을 `--env-file`로 넘긴다 (`devtools/speech-bench/env.example`)

```sh
AZURE_SPEECH_KEY=
AZURE_SPEECH_REGION=                    # 예: koreacentral (또는 AZURE_SPEECH_ENDPOINT=)
SPEECHSUPER_APP_KEY=
SPEECHSUPER_SECRET_KEY=
CLOVA_SPEECH_SECRET_KEY=
ELEVENLABS_API_KEY=
OPENAI_API_KEY=
DEEPGRAM_API_KEY=
```

## 4. 사용자가 정해야 하는 것

급한 순서대로 적었다. ◆는 다음 작업을 막는 것이다.

### 4.1 실험실을 진짜 모델로 처음 돌릴 때
1. ◆ **어떤 모델로 볼 것인가.** 번들의 기본값은 코드 기본값이다 — 답 · 채점은 `claude-sonnet-5-5`, 교정 · 힌트는 `claude-haiku-5-5`(2026-11-19 사용자 결정, 컴패니언의 Opus 설정을 물려받지 않는다). 실험실 화면에서 판마다 바꿀 수 있다.
2. ◆ **첫 호출이 통하는지.** 서버는 대화를 상대역의 진입 대사(assistant 메시지)로 시작한다(1단계의 첫 인사 뒤 턴과 같은 방식). 진짜 API 호출로는 아무도 확인하지 못했다 — 400이 나면 오류 본문이 화면에 그대로 뜬다. 그때는 진입 대사 앞에 고정 user 글을 넣는 쪽으로 서버(코어의 `sceneStartUser`)와 번들을 같이 바꾼다.
3. Opus 5.5는 「도구 강제 호출」을 받지 않아 실험실이 우회(자동 선택 + 「도구로만 답하라」)를 쓴다. 도구 호출이 빠지는 경우가 있는지 본다.
4. 예상 원가는 생각 토큰을 셈에 넣지 않아 실제보다 낮게 나올 수 있다. 시나리오 세트 한 번에 $0.7 ~ 1.4로 추정했다.

### 4.2 미션의 내용
5. ◆ **미션 둘의 문구** — `apps/supabase-functions/supabase/functions/_shared/missions/u06-cafe.json` · `u01-water.json`의 목표, 필수 / 선택, 역할 카드, 예시 대사. 초안이다.
6. 1화를 본편대로 계산 도중(「봉투 드릴까요?」)에서 시작할지, 물건을 고르는 데서 시작할지.
7. **시나리오 세트의 기대값**(대시보드 `config/mission-scenarios.json`) — 「아이스 라떼 하나 줘요」를 교정 대상으로 볼지, 「커피요… 아니, 잠깐만요」를 주문 안 함으로 볼지, 점수 범위.
8. 턴 상한이 한 번 남았을 때 상대역이 마무리 대사를 하게 할지(지금은 남은 턴 수만 프롬프트에 보인다).
9. 입력 검사에 걸린 턴의 고정 안내 문구(임시: 「죄송하지만 그 말씀에는 답할 수 없어요. 하던 이야기로 돌아갈까요?」).
9-1. **자동 번역은 검수 전 초안이다.** 진입 대사 · 목표 글은 미션 파일에 그 언어 칸(`opening.ja` · `goals[].label.vi` …)이 없으면 번역 노드가 만들어 캐시(`companion.mission_translations`)에 남긴다. 검수한 번역은 미션 파일에 넣고 판(`version`)을 올린다 — 파일이 캐시보다 먼저다.

### 4.3 값 (PRD §9)
10. **M1** 하루 무료 미션 횟수와 엽전 정액 — 임시값: free 1 · `unlimited_tickets` 1 · `chat_plus` 3 · `premium` 5, 정액 10엽전.
11. **M2** 턴 상한 — 6화 10, 1화 8. **M3** 가중치 50 · 30 · 20, 힌트 −5, 힌트 3번.
12. **M5** 채점 모델 — 기본 Sonnet 5.5로 정함(2026-11-19 사용자). **M8** 방치된 판을 닫는 시간 30분.
13. **M6** 진입 대사 · 목표 글의 번역 — 「미션 파일에 그 언어의 글이 있으면 그것, 없으면 번역 노드(1단계 번역 프롬프트 · 모델)로 만들어 미션 × 판 × 언어로 캐시」로 정했다(2026-11-19). 번역이 실패하면 영어로 내고 다음 시작 때 다시 만든다.
14. **M7** 미션의 대화 시간을 사용 시간 상한에 세고, 미션의 입력 차단을 같은 반복 위반 셈에 더했다 — 그대로 둘지.

### 4.4 설계에서 [제안]과 다르게 간 것 — 확인만 하면 된다
15. 목표 표현을 id 배열이 아니라 `{id, ko, meaning}` 객체로 둔다(서버가 앱 콘텐츠를 읽지 않고 프롬프트를 채우려고).
16. 힌트는 추천 답변 노드를 다시 쓰지 않고 전용 프롬프트를 둔다(모델만 같이 쓴다).
17. 정의의 판마다 한 행을 두는 표 `companion.mission_versions`를 더했다(판 도중 정의가 바뀌어도 시작한 판의 정의로 채점).
18. 상대역 메시지의 출처 값 `messages.origin = 'mission'`을 더했다(컴패니언의 평가 · 미디어 대상에 섞이지 않게).
19. 기존 함수 하나를 고쳤다 — `companion_release_stale_holds`가 미션 예약을 건드리지 않게 한 줄.
20. 에피소드를 「끝냈다」는 진행 스냅숏에 완료 키(기본 `RP`)가 있는 것으로 본다. 에피소드마다 키가 다르면 미션 파일의 `completionKeys`에 적는다.
21. 힌트 문장을 만들다 실패해도 힌트 수는 이미 줄어 있다(SQL이 먼저 센다). 돌려줄지.
22. 끝났는데 채점하지 않고 방치된 판은 리포트 없이 닫히고 값은 확정된다.
23. 실험실에는 「끝내고 채점」 버튼이 있다(앱에서는 필수를 못 이룬 채 그만두면 리포트가 없다 — 실험실만의 편의). 필수를 이룬 뒤의 끝내기는 앱에도 있다(`finish`, 아래).
    - **판이 끝나는 규칙을 바꿨다**(2026-11-23, ADR-0177 D6). 필수만 이루면 판은 닫히지 않고 「성공 확정」(`requiredDone`)으로 이어진다. 닫히는 때는 모든 목표(`goals`) · 턴 상한(`turn_limit`) · 필수 뒤 끝내기(`finish`). 1화 편의점이 봉투 · 결제 두 답으로 닫혀 영수증 · 다른 물건 묻기에 닿지 못하던 것을 실험실에서 찾았다. 실험실은 번들의 `transitions.endRule` · `fixtures`(`required_done`) · `finishFixtures` · `prompts.requiredStatusWords`를 따른다.

### 4.5 손대지 않고 남긴 것
24. 운영 도구(`ops_admin`)의 캐릭터별 메시지 수에 미션 메시지가 섞인다. `companion_operator_reset`은 그 캐릭터의 미션 판도 지운다(시험 계정 전용).
25. 앱용 「지난 판의 대화 전문 보기」 RPC가 없다(M11).
26. `companion_list_mission_results(null)`(전체 조회)은 계약 스키마와 맞지 않는다.
27. 목표 수 · 턴 상한의 허용 범위가 코어(좁다)와 SQL(넓다)이 다르다 — 올리기 스크립트가 코어 기준이라 실제로는 좁은 쪽이 적용된다.

### 4.6 벤더 비교 (`feat/speech-vendor-bench`)
28. ◆ **AI Hub 데이터 신청**(한국 거주자 명의)과, 그 데이터를 해외 벤더 API로 보내도 되는지의 확인. 안 되면 동의를 받아 직접 녹음한 세트로 한다.
29. 단가 표(`devtools/speech-bench/prices.json`)가 비어 있다 — 벤더별 요금을 넣어야 예상 비용이 나온다. SpeechSuper는 견적이 필요하다.
30. 표본 크기(기본 300) · 벤더별 모델.
31. 「화자 식별용 특징값을 만들지 않는다」는 조건은 어느 벤더 문서에도 없었다 — 계약할 때 서면으로 묻는다.

### 4.7 앞서 올린 PR에 남아 있는 것
32. #495 법률 문서: 시행일 · 「대화를 AI 학습에 쓰지 않는다」 약속 · Sentry 보존 기간 · Notion 두 페이지 맞추기 · 이용약관의 낡은 내용.
33. #498 턴 로그: 운영 적용 순서 · 방침 문장과 시행일 · 스토어 표시 · 기기 모델(네이티브 모듈 필요).
34. 번호 — main 받기(2026-11-22)에서 미션을 ADR 0160 → **0177**, 마이그레이션 20261214 → **20261226**으로 옮겼다(main에 0160 구독 입구 · 0176 입장 선택, 20261214 구독 대기 · 20261225 선톡 푸시가 먼저 들어옴). main에는 0159(온보딩) · 0167(법률 문서) · 마이그레이션 20261213(early access)이 이미 있어, #495 법률 문서의 ADR 0159와 #498 턴 로그의 ADR 0161 · 마이그레이션 20261213도 머지할 때 옮겨야 한다(0161은 아직 main에 비어 있다).

## 5. 확인하지 못한 것

- 진짜 LLM으로 돌린 판이 하나도 없다. 프롬프트의 품질(턴 판정의 오탐 · 주제 이탈 복귀 · 채점의 일관성)은 모른다 — §2.1의 시나리오 세트가 그것을 재는 도구다.
- 운영 DB · pg_cron · 배포된 함수에서 돌려 보지 않았다.
- 벤더 API의 세부(SpeechSuper 한국어 응답 칸, CLOVA 발음 평가의 한국어 지원, Deepgram nova-3의 한국어 지원)는 문서로 확정하지 못했다.

## 6. 앱 화면 초안 (`feat/companion-mission-app`)

- 스위치 `ROLEPLAY_MISSION_READY = false` 뒤에 있다 — 꺼져 있으면 사용자에게 아무것도 보이지 않는다. 테스트와 개발에서만 켠다.
- 롤플레이 목록의 미션 카드 → 미리보기 → 대화(목표 체크리스트 · 남은 턴 · 교정 · 힌트 · 글자와 마이크 입력) → 자동 채점 → 리포트까지 **가짜 출처(fixture)** 로 돈다.
  서버를 붙일 자리는 `apps/mobile/src/app/roleplay-mission-wiring.ts`의 `serverMissionSource`다(지금은 비어 있다).
- 판의 상태는 순수 리듀서(`screens/roleplay-mission/mission-session.ts`)다. 화면 스펙은 그 브랜치의 `docs/specs/roleplay-mission-screens.md`, 수동 흐름은 `docs/e2e/roleplay-mission.md`.
- `pnpm verify` 통과. **실기 · 시뮬레이터에서는 띄워 보지 않았다**(키보드 높이 · 마이크 · 화면 맞춤은 테스트 렌더로만 봤다).
- 이 브랜치는 `feat/companion-mission-core`에서 땄다. 서버 통합 브랜치와 합칠 때 계약 패키지가 겹친다(서버 쪽이 오류 코드를 더했다).

사용자가 정해야 하는 것:

35. ◆ **디자인.** 시안 없이 기존 부품으로 임시 구성했다 — 목표 체크리스트의 모양, 위 띠의 장면 그림과 높이, 마이크 위치(대본형처럼 큰 마이크로 할지), 힌트 카드,
    끝 · 채점 중 표시, 리포트의 시각 요소, 목록에서 미션 카드가 대본형 카드와 구별되지 않는 점. 목록은 화면 스펙 §7.
36. **번들 크기.** 스위치가 꺼져 있어도 코드가 들어가 +122 kB다(천장까지 남은 여유의 약 44%). 가짜 출처를 개발 빌드에만 둘지, 번역 초안을 나중에 읽게 할지.
37. **분석 이벤트 이름**(M10) — 제안만 적어 두고 보내지 않는다: `roleplay_mission_opened` · `_started` · `_start_rejected` · `_hint_used` · `_finished` · `_grading_failed` · `_abandoned`.
38. 화면 문구의 es · ja · id · vi 번역은 초안이다(원어민 검수 필요).
39. 가정한 동작: 「다시 하기」는 바로 시작하지 않고 미리보기로 돌아간다(값을 다시 보여 주려고). 힌트의 「Use this」는 바로 보내지 않고 입력 칸을 채운다. 잠김은 에피소드 완료를 따르고 서버의 판정은 시작할 때 거절로만 반영한다.
40. 만들지 않은 것: 서버 출처, 시작 전 말하기 권한 안내, 지난 리포트 목록, 대화 전문 다시 보기.
