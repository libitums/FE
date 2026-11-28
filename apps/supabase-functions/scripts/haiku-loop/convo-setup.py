"""대화 평가 준비 — 설정(arm)마다 대화 파일을 만들고 학습자 서브에이전트에게 줄 지시 파일을 쓴다.

python3 convo-setup.py <run 폴더> <arm,arm,...> [--turns 20] [--personas data/personas-holdout.json] [--matrix pid:char,…]
                       [--samples 2] [--runner <다른 작업 트리의 scripts/haiku-loop/run>]
  --runner: 학습자가 부를 실행기(기준선 Sonnet을 운영 프롬프트 그대로 돌릴 때 main 작업 트리의 것).
  <run 폴더>/convo/<arm>/<대화 id>.json   — 대화(turn.ts new)
  <run 폴더>/convo/prompts/<arm>__<대화 id>.md — 학습자 지시(prompts/persona.md를 채운 것)
"""
import json, os, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
run, arms = sys.argv[1], sys.argv[2].split(",")
opt = lambda n, d: sys.argv[sys.argv.index(f"--{n}") + 1] if f"--{n}" in sys.argv else d
turns = opt("turns", "20")
personas = json.load(open(os.path.join(here, opt("personas", "data/personas.json"))))
samples = int(opt("samples", "1"))
runner = os.path.abspath(opt("runner", os.path.join(here, "run")))
template = open(os.path.join(here, "prompts/persona.md")).read()
# 실제 학습자 말 표본(운영 DB에서 뽑아 개인정보 꼴을 거른 것, runs/real/lines.json — 커밋하지 않음). 말투 참고용으로 대화마다 25개.
_lines_path = os.path.join(here, "runs/real/lines.json")
real_lines = json.load(open(_lines_path)) if os.path.exists(_lines_path) else []
import random as _random

# 운영 대화의 57%가 덕수쌤(첫 20통 체험) — 페르소나 8명 모두 덕수쌤, 친구 인물은 둘만.
matrix = [(p, "duksu") for p in personas] + [("p3-br-romance", "geonwoo"), ("p7-heavy-lonely", "daeun")]
if opt("matrix", ""):
    matrix = [tuple(x.split(":")) for x in opt("matrix", "").split(",")]

os.makedirs(os.path.join(run, "convo/prompts"), exist_ok=True)
made = []
for arm in arms:
    os.makedirs(os.path.join(run, "convo", arm), exist_ok=True)
    for (pid, character), k in [(m, k) for m in matrix for k in range(1, samples + 1)]:
        p = personas[pid]
        cid = f"{pid}__{character}" + (f"__s{k}" if samples > 1 else "")
        conv = os.path.abspath(os.path.join(run, "convo", arm, f"{cid}.json"))
        s = p["setup"]
        subprocess.run([runner, "turn", "new", "--conv", conv, "--character", character, "--model", arm,
                        "--learning", s["learning"], "--age", s["age"], "--l1", s["l1"], "--force"], check=True, capture_output=True)
        sample = _random.Random(cid).sample(real_lines, min(25, len(real_lines))) if real_lines else []
        real = ("\n\n## 실제 학습자 말 표본 (운영 데이터 — 말투 · 길이 · 오타의 결만 참고, 그대로 베끼지 말 것)\n" + "\n".join(f"- {x}" for x in sample)) if sample else ""
        text = (template.replace("{TURNS}", turns).replace("{CONV}", conv).replace("scripts/haiku-loop/run turn", runner + " turn")
                .replace("{PERSONA}", f"{p['persona']}\n\n대본 비트(턴 번호 즈음): {p['beats']}\n\n상대 캐릭터: {character} (첫 인사는 대화 파일에 있음)") + real)
        path = os.path.abspath(os.path.join(run, "convo/prompts", f"{arm}__{cid}.md"))
        open(path, "w").write(text)
        made.append(path)
print("\n".join(made))
