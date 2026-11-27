# haiku-loop — 답장 모델 평가 · 프롬프트 개선 하니스

운영 답장 코드(`supabase/functions/_shared`)를 Node 22로 그대로 불러 실제 Claude API로 답을 만들고, 채점 · 학습자 역할은 Claude Code
서브에이전트에게 맡긴다. 기록은 `LOG.md`, 산출물은 `runs/`(커밋하지 않음).

## 준비
- Node 22(이 패키지의 `engines`) · `pnpm install`(이 패키지의 `node_modules`).
- API 키: `ANTHROPIC_API_KEY` 환경 변수, 없으면 `HAIKU_LOOP_ENV`(기본 `~/Developer/libitum/duru-curation/.env`)의 `*ANTHROPIC_API_KEY=` 줄. 값은 출력하지 않는다.
- `data/characters.json`(운영 `companion_inspect_characters` 스냅숏) · `data/learning.json`(진도별 학습 맥락 스냅숏, 기록 칸 0) · `data/personas.json`(학습자 8명).

## 모델 표기
`haiku@low` · `haiku@medium` · `haiku@high` · `haiku@off`(생각 끔, Haiku만) · `sonnet@low` … → `claude-<이름>-5-5` + 답장 생각 깊이(`COMPANION_REPLY_EFFORT`와 같은 값).

## 정적 평가 (고정 답장 세트 108케이스)
```sh
scripts/haiku-loop/run static --model haiku@low --split train --out scripts/haiku-loop/runs/i3/haiku@low
python3 scripts/haiku-loop/pack.py scripts/haiku-loop/runs/i3 --split train      # 설정 폴더들을 섞어 judge/batch-NN.txt + key.json
# 묶음마다 새 Opus 서브에이전트: prompts/judge-static.md (RUBRIC=data/judge-rubric.txt, BATCH, OUT=judge/out-NN.json)
python3 scripts/haiku-loop/score.py scripts/haiku-loop/runs/i3 --vs r0-sonnet@low [--fails haiku@low]
```
- `--split train`(68) · `holdout`(40) · `all`. 고칠 때는 학습용만 보고 검증용은 확인할 때만 채점한다.
- 이전 실행과 견주려면 그 설정 폴더를 `runs/<새 실행>/r0-sonnet@low`처럼 복사해 넣고 묶는다.

## 대화 평가 (학습자 서브에이전트와 20턴)
```sh
python3 scripts/haiku-loop/convo-setup.py scripts/haiku-loop/runs/i3 haiku@low,sonnet@low   # 대화 파일 + 학습자 지시 파일
# 지시 파일마다 Sonnet 서브에이전트: "다음 파일을 읽고 그 지시대로 학습자 역할을 끝까지 수행하세요: <runs/i3/convo/prompts/…md>"
python3 scripts/haiku-loop/convo-pack.py scripts/haiku-loop/runs/i3      # 같은 페르소나 대화를 X/Y/Z로 섞기
# 대화마다 새 Opus 서브에이전트: prompts/judge-convo.md (FILE, OUT=<id>.out.json)
python3 scripts/haiku-loop/convo-score.py scripts/haiku-loop/runs/i3 [--detail]
```
- 한 턴 실행기: `scripts/haiku-loop/run turn new|say|show --conv <파일> …`(`turn.ts` 머리 주석). 운영 턴의 답 부분(화제 상태 · 분기 지시 ·
  스토리 카드 · 학습 표현 결과)을 그대로 따르고, 검사 · 피드백 · 번역 · 칩 · 기억 · 요약은 부르지 않는다.
- **대화가 도는 동안 `_shared` 프롬프트를 고치지 않는다** — 대화는 매 턴 프롬프트를 다시 읽는다.
- 프롬프트 토큰 보기: `scripts/haiku-loop/run dump-prompt --conv <대화 파일> [--print]`.
