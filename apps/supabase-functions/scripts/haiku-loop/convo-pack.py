"""대화 평가 채점 묶음 — 같은 (페르소나, 인물) 대화를 설정마다 하나씩 모아 X, Y, Z …로 섞어 한 글에 담는다. 섞은 표는 key.json.

python3 convo-pack.py <run 폴더> [--arms a,b,c]
  <run 폴더>/convo/<arm>/<대화 id>.json → <run 폴더>/convo/judge/<대화 id>.txt · key.json
"""
import json, os, random, sys

run = sys.argv[1]
base = os.path.join(run, "convo")
arms = sys.argv[sys.argv.index("--arms") + 1].split(",") if "--arms" in sys.argv else sorted(
    d for d in os.listdir(base) if d not in ("prompts", "judge") and os.path.isdir(os.path.join(base, d)))
_d = os.path.dirname(os.path.abspath(__file__))
personas = {**json.load(open(os.path.join(_d, "data/personas.json"))), **json.load(open(os.path.join(_d, "data/personas-holdout.json")))}

def card(p):
    rows = [f"Name: {p.get('name')} ({p.get('age','')})", f"Job: {p.get('job','')}", f"Role: {p.get('role','')}",
            f"How they talk to the learner: {p.get('register','')}", f"Speech style: {p.get('speech','')}"]
    if p.get("doNot"):
        rows.append("Never be:\n" + "\n".join(f"- {x}" for x in p["doNot"]))
    if p.get("romanceOff"):
        rows.append("Romance: not a romance character — must laugh off flirting kindly and move on, never flirt back.")
    return "\n".join(rows)

def transcript(conv):
    name = conv["persona"]["name"]
    out = []
    for e in conv["history"]:
        if e["role"] == "user":
            out.append(f"학습자: {e['text']}")
        else:
            out.append("\n".join(f"{name}: " + (f"({s['text']})" if s["kind"] == "action" else s["text"]) for s in e["segments"]))
    return "\n".join(out)

rng = random.Random(20261128)
ids = sorted({f[:-5] for arm in arms for f in os.listdir(os.path.join(base, arm)) if f.endswith(".json")})
out_dir = os.path.join(base, "judge")
os.makedirs(out_dir, exist_ok=True)
key = {}
for cid in ids:
    convs = {arm: json.load(open(os.path.join(base, arm, cid + ".json"))) for arm in arms
             if os.path.exists(os.path.join(base, arm, cid + ".json"))}
    convs = {a: c for a, c in convs.items() if len(c["turns"]) >= 10}
    if len(convs) < 2:
        continue
    order = list(convs)
    rng.shuffle(order)
    letters = "XYZWV"[: len(order)]
    key[cid] = dict(zip(letters, order))
    any_conv = convs[order[0]]
    pid = cid.split("__")[0]
    head = (f"# Character card\n{card(any_conv['persona'])}\n\n"
            f"# Learner setup\n- Age band: {any_conv['ageBand']}\n- Speech level the character must use: {any_conv['speechLevel']} "
            f"(polite = 해요체 존댓말 only, never 반말)\n- Learner's language: {any_conv['l1']}\n"
            f"- Learner persona (played by a simulator): {personas[pid]['persona']}\n"
            f"- Story progress: episodes {', '.join(any_conv['learning']['episodes'])}")
    body = "\n\n".join(f"## Conversation {l}\n{transcript(convs[a])}" for l, a in zip(letters, order))
    open(os.path.join(out_dir, cid + ".txt"), "w").write(f"=== {cid} ===\n{head}\n\n{body}\n")
json.dump({"arms": arms, "key": key}, open(os.path.join(out_dir, "key.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({"conversations": len(key), "arms": arms}))
