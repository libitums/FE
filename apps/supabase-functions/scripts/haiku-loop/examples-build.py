"""증류 결과(runs/distill/sel-*.json)를 `_shared/companion-persona-examples.data.ts`로 쓴다."""
import glob, json, os
here = os.path.dirname(os.path.abspath(__file__))
table = {}
for path in sorted(glob.glob(os.path.join(here, "runs/distill/sel-*.json"))):
    for cid, items in json.load(open(path)).items():
        table[cid] = [{**({"history": it["history"]} if it.get("history") else {}), "learner": it["learner"], "reply": it["reply"]} for it in items]
out = os.path.join(here, "../../supabase/functions/_shared/companion-persona-examples.data.ts")
body = json.dumps(table, ensure_ascii=False, indent=2)
open(out, "w").write(
    "// 생성 파일 — `scripts/haiku-loop/examples-build.py`가 증류 결과(runs/distill/sel-*.json)로 만든다. 손으로 고치지 않는다.\n\n"
    'import type { PersonaExample } from "./chat-send.contract.ts";\n\n'
    f"export const personaExampleTable: Readonly<Record<string, readonly PersonaExample[]>> = {body};\n")
print({k: len(v) for k, v in table.items()})
