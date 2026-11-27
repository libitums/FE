// 생성 파일 — `scripts/haiku-loop/examples-build.py`가 증류 결과(runs/distill/sel-*.json)로 만든다. 손으로 고치지 않는다.

import type { PersonaExample } from "./chat-send.contract.ts";
import { personaExamplesA } from "./companion-persona-examples.data-a.ts";
import { personaExamplesB } from "./companion-persona-examples.data-b.ts";

export const personaExampleTable: Readonly<Record<string, readonly PersonaExample[]>> = {
  ...personaExamplesA,
  ...personaExamplesB,
};
