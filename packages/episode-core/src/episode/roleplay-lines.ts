// 롤플레이 턴의 `line_id`(`D<n>`)로 대화에서 상대 줄 · 내 줄을 찾습니다(순수).

import type { DialogueLine } from "./episode-content.model";

const LINE_ID = /^D([1-9][0-9]*)$/;

/** 턴 하나의 상대 줄(seq n-1)과 내 줄(seq n)입니다. */
export type RoleplayLines = { readonly counterpart: DialogueLine; readonly player: DialogueLine };

/** `line_id`가 가리키는 플레이어 줄과 그 앞 상대 줄입니다. 어긋나면 `null`입니다. */
export function roleplayLinesOf(
  lineId: string,
  dialogue: readonly DialogueLine[],
): RoleplayLines | null {
  const matched = LINE_ID.exec(lineId);
  if (matched === null) return null;
  const seq = Number(matched[1]);
  const player = dialogue.find((line) => line.seq === seq);
  const counterpart = dialogue.find((line) => line.seq === seq - 1);
  if (player === undefined || counterpart === undefined) return null;
  if (player.role !== "player" || counterpart.role !== "counterpart") return null;
  return { counterpart, player };
}
