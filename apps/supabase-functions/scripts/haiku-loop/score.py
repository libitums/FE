"""정적 평가 집계 — 채점 결과(out-*.json)를 key.json으로 설정에 되돌려 축별 통과율 · appeal 평균 · 평균 순위 · 1위 비율 · Sonnet 대비 승률을 낸다.

python3 score.py <run 폴더> [--vs sonnet@low] [--split train|holdout|all] [--fails arm]
"""
import glob, json, os, sys
from collections import defaultdict

run = sys.argv[1]
args = sys.argv[2:]
opt = lambda n, d: args[args.index(f"--{n}") + 1] if f"--{n}" in args else d
vs, split, show_fails = opt("vs", "sonnet@low"), opt("split", "all"), opt("fails", "")

key = json.load(open(os.path.join(run, "judge/key.json")))["key"]
splits = {}
for arm_dir in glob.glob(os.path.join(run, "*/results.json")):
    for row in json.load(open(arm_dir))["rows"]:
        splits[f'{row["set"]}/{row["id"]}'] = row["split"]

axes = ["persona", "speech", "spoiler", "level", "natural", "safety", "learning", "canon"]
passed, total = defaultdict(lambda: defaultdict(int)), defaultdict(lambda: defaultdict(int))
appeal, ranks, firsts, cases = defaultdict(list), defaultdict(list), defaultdict(int), defaultdict(int)
wins = defaultdict(lambda: [0, 0])  # arm → [이김, 맞대결 수] (vs 설정과의 순위 비교)
allpass = defaultdict(int)
fails_by_arm = defaultdict(list)
seen = set()
for path in sorted(glob.glob(os.path.join(run, "judge/out-*.json"))):
    for case in json.load(open(path))["cases"]:
        cid = case["id"].replace("=== CASE ", "").strip()
        if cid not in key or cid in seen:
            continue
        if split != "all" and splits.get(cid) != split:
            continue
        seen.add(cid)
        mapping = key[cid]
        rank = case.get("rank", [])
        for letter, arm in mapping.items():
            rep = case["replies"].get(letter)
            if rep is None:
                continue
            cases[arm] += 1
            ok_all = True
            for ax in axes:
                v = rep["axes"].get(ax)
                if v is None:
                    continue
                total[arm][ax] += 1
                passed[arm][ax] += 1 if v else 0
                ok_all &= bool(v)
            allpass[arm] += ok_all
            appeal[arm].append(rep.get("appeal", 3))
            if letter in rank:
                ranks[arm].append(rank.index(letter) + 1)
                firsts[arm] += rank[0] == letter
            for ax, why in (rep.get("fails") or {}).items():
                fails_by_arm[arm].append(f"{cid} [{ax}] {why}")
        inv = {a: l for l, a in mapping.items()}
        if vs in inv and inv[vs] in rank:
            for arm, letter in inv.items():
                if arm == vs or letter not in rank:
                    continue
                wins[arm][1] += 1
                wins[arm][0] += rank.index(letter) < rank.index(inv[vs])

arms = sorted(cases, key=lambda a: sum(ranks[a]) / max(1, len(ranks[a])))
print(f"cases={len(seen)} split={split}")
head = f'{"arm":14} {"모두통과":>8} ' + " ".join(f"{a[:7]:>7}" for a in axes) + f' {"appeal":>6} {"평균순위":>6} {"1위":>4} {"vs "+vs:>14}'
print(head)
for arm in arms:
    n = cases[arm]
    cells = " ".join(f'{(100*passed[arm][ax]/total[arm][ax]) if total[arm][ax] else float("nan"):7.0f}' for ax in axes)
    w = wins[arm]
    wr = f"{100*w[0]/w[1]:.0f}% ({w[0]}/{w[1]})" if w[1] else "-"
    print(f"{arm:14} {100*allpass[arm]/n:7.0f}% {cells} {sum(appeal[arm])/n:6.2f} {sum(ranks[arm])/max(1,len(ranks[arm])):6.2f} {100*firsts[arm]/n:3.0f}% {wr:>14}")
if show_fails:
    print(f"\n--- {show_fails} 실패 ---")
    print("\n".join(fails_by_arm[show_fails]))
