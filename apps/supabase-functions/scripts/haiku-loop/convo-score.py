"""대화 평가 집계 — <run>/convo/judge/*.out.json 을 key.json으로 설정에 되돌려 평균 점수 · 세기 합 · 1위 수를 낸다.

python3 convo-score.py <run 폴더> [--detail]
"""
import glob, json, os, sys
from collections import defaultdict

run = sys.argv[1]
d = os.path.join(run, "convo/judge")
key = json.load(open(os.path.join(d, "key.json")))["key"]
dims = ["engagement", "persona", "level", "responsive", "variety", "format"]
counts = ["speech_breaks", "multi_question_turns"]
score, cnt, first, ranks, issues, n = defaultdict(lambda: defaultdict(float)), defaultdict(lambda: defaultdict(int)), defaultdict(int), defaultdict(list), defaultdict(list), defaultdict(int)
worst = defaultdict(list)
for path in sorted(glob.glob(os.path.join(d, "*.out.json"))):
    j = json.load(open(path))
    cid = j.get("id") or os.path.basename(path)[: -len(".out.json")]
    mapping = key.get(cid)
    if not mapping:
        continue
    rank = j.get("rank", [])
    for letter, arm in mapping.items():
        c = j["convos"].get(letter)
        if not c:
            continue
        n[arm] += 1
        for k in dims:
            score[arm][k] += c.get(k, 0)
        for k in counts:
            cnt[arm][k] += c.get(k, 0)
        issues[arm] += [f"{cid}: {x}" for x in c.get("boundary_issues", [])]
        worst[arm] += [f"{cid}: {x}" for x in c.get("worst", [])]
        if letter in rank:
            ranks[arm].append(rank.index(letter) + 1)
            first[arm] += rank[0] == letter
print(f'{"arm":14} ' + " ".join(f"{k[:8]:>8}" for k in dims) + f' {"말투깨짐":>6} {"질문둘+":>6} {"경계":>4} {"평균순위":>6} {"1위":>4}')
for arm in sorted(n, key=lambda a: sum(ranks[a]) / max(1, len(ranks[a]))):
    print(f"{arm:14} " + " ".join(f"{score[arm][k]/n[arm]:8.2f}" for k in dims)
          + f" {cnt[arm]['speech_breaks']:6d} {cnt[arm]['multi_question_turns']:6d} {len(issues[arm]):4d} {sum(ranks[arm])/max(1,len(ranks[arm])):6.2f} {first[arm]:3d}/{n[arm]}")
if "--detail" in sys.argv:
    for arm in n:
        print(f"\n--- {arm} 경계 문제 ---\n" + "\n".join(issues[arm]))
        print(f"--- {arm} 최악 답 ---\n" + "\n".join(worst[arm]))
