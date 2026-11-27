"""증류 결과(runs/distill/sel-*.json)를 `_shared/companion-persona-examples.data*.ts`로 쓴다.

파일 길이 제한(300줄) 때문에 인물을 두 묶음(data-a · data-b)으로 나누고, data.ts가 합친다.
"""
import glob, json, os
here = os.path.dirname(os.path.abspath(__file__))
table = {}
for path in sorted(glob.glob(os.path.join(here, "runs/distill/sel-*.json"))):
    for cid, items in json.load(open(path)).items():
        table[cid] = [{**({"history": it["history"]} if it.get("history") else {}), "learner": it["learner"], "reply": it["reply"]} for it in items]
shared = os.path.join(here, "../../supabase/functions/_shared")
head = "// 생성 파일 — `scripts/haiku-loop/examples-build.py`가 증류 결과(runs/distill/sel-*.json)로 만든다. 손으로 고치지 않는다.\n\n"
ids = list(table)
half = (len(ids) + 1) // 2
for part, chunk in (("a", ids[:half]), ("b", ids[half:])):
    body = json.dumps({cid: table[cid] for cid in chunk}, ensure_ascii=False, indent=2)
    open(os.path.join(shared, f"companion-persona-examples.data-{part}.ts"), "w").write(
        head + 'import type { PersonaExample } from "./chat-send.contract.ts";\n\n'
        f"export const personaExamples{part.upper()}: Readonly<Record<string, readonly PersonaExample[]>> = {body};\n")
open(os.path.join(shared, "companion-persona-examples.data.ts"), "w").write(
    head + 'import type { PersonaExample } from "./chat-send.contract.ts";\n'
    'import { personaExamplesA } from "./companion-persona-examples.data-a.ts";\n'
    'import { personaExamplesB } from "./companion-persona-examples.data-b.ts";\n\n'
    "export const personaExampleTable: Readonly<Record<string, readonly PersonaExample[]>> = {\n"
    "  ...personaExamplesA,\n  ...personaExamplesB,\n};\n")
print({k: len(v) for k, v in table.items()}, "a:", ids[:half], "b:", ids[half:])
