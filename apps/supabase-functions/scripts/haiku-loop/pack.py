"""정적 평가 채점 묶음 만들기 — 여러 설정(arm)의 답을 케이스마다 A, B, C …로 섞어 한 글에 담는다. 섞은 표는 key.json(채점자에게 주지 않음).

python3 pack.py <run 폴더> [--split train|holdout|all] [--batch 9] [--arms a,b,c]
  <run 폴더>/<arm>/results.json 들을 읽어 <run 폴더>/judge/batch-NN.txt · key.json 을 쓴다.
"""
import json, os, random, sys

run = sys.argv[1]
args = sys.argv[2:]
opt = lambda name, default: args[args.index(f"--{name}") + 1] if f"--{name}" in args else default
split = opt("split", "all")
batch = int(opt("batch", "9"))
arms = opt("arms", "") or sorted(d for d in os.listdir(run) if os.path.isfile(os.path.join(run, d, "results.json")))
arms = arms.split(",") if isinstance(arms, str) else arms

rows = {}
for arm in arms:
    data = json.load(open(os.path.join(run, arm, "results.json")))
    for row in data["rows"]:
        rows.setdefault(f'{row["set"]}/{row["id"]}', {})[arm] = row

rng = random.Random(20261127)
key, blocks = {}, []
for case_id, by_arm in rows.items():
    any_row = next(iter(by_arm.values()))
    if split != "all" and any_row["split"] != split:
        continue
    content = next((r["judgeContent"] for r in by_arm.values() if r.get("judgeContent")), None)
    if content is None:
        continue
    head = content.split("# Character's reply")[0].rstrip()
    order = [a for a in arms if a in by_arm]
    rng.shuffle(order)
    letters = "ABCDEFGH"[: len(order)]
    key[case_id] = dict(zip(letters, order))
    replies = []
    for letter, arm in zip(letters, order):
        row = by_arm[arm]
        text = "\n".join(f'@{s["kind"]} {s["text"]}' for s in row.get("reply") or []) if row["ok"] else f'(error: {row.get("error")})'
        replies.append(f"## Reply {letter}\n{text or '(empty)'}")
    blocks.append(f"=== CASE {case_id} ===\n{head}\n\n# Candidate replies (one bubble per line)\n" + "\n\n".join(replies))

out = os.path.join(run, "judge")
os.makedirs(out, exist_ok=True)
for name in os.listdir(out):
    if name.startswith("batch-"):
        os.remove(os.path.join(out, name))
for n, start in enumerate(range(0, len(blocks), batch), 1):
    open(os.path.join(out, f"batch-{n:02d}.txt"), "w").write("\n\n".join(blocks[start : start + batch]))
json.dump({"arms": arms, "split": split, "key": key}, open(os.path.join(out, "key.json"), "w"), ensure_ascii=False, indent=1)
print(json.dumps({"cases": len(blocks), "batches": (len(blocks) + batch - 1) // batch, "arms": arms}))
