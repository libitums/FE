import { moderationInstruction } from "../../supabase/functions/_shared/companion-safety.ts";
for (const band of ["adult", "minor", "unknown"] as const)
  console.log(
    `\n===== 입력 검사 기준 — ageBand=${band} =====\n` + moderationInstruction("input", band),
  );
