// 티켓 없음 대화상자(E6m)의 원형 카운트다운 그림입니다 — 원 둘레를 티켓 칸 셋으로 나누고, 위에서부터 시계 방향으로
// 칸 순서(지금 차는 칸 · 기다리는 칸 · 찬 칸)대로 그립니다. 찬 칸은 주황으로 다 칠하고, 지금 차는 칸은 진행률만큼
// 칠합니다. Lynx의 SVG는 획 애니메이션이 없어 매초 새 문서를 짓습니다. 순수 함수입니다.

import type { TicketSlot } from "../../lib/learning-tickets";

const size = 200;
const radius = 87;
const center = size / 2;
const strokeWidth = 12;
/** 칸 사이 틈(도)입니다. 둥근 끝이 맞닿지 않게 획 굵기보다 조금 넓게 둡니다. */
const gapDegrees = 10;

function point(degrees: number): string {
  const radians = ((degrees - 90) * Math.PI) / 180;
  const x = center + radius * Math.cos(radians);
  const y = center + radius * Math.sin(radians);
  return `${x.toFixed(1)} ${y.toFixed(1)}`;
}

function arc(from: number, to: number, stroke: string): string {
  const large = to - from > 180 ? 1 : 0;
  return `<path d="M${point(from)} A${String(radius)} ${String(radius)} 0 ${String(large)} 1 ${point(to)}" stroke="${stroke}"/>`;
}

export function ticketRingSvg(
  slots: readonly TicketSlot[],
  colors: { readonly track: string; readonly fill: string },
): string {
  const span = 360 / slots.length;
  const paths = slots.map((slot, index) => {
    const from = index * span + gapDegrees / 2;
    const to = (index + 1) * span - gapDegrees / 2;
    const track = arc(from, to, colors.track);
    const share = slot.kind === "ready" ? 1 : slot.kind === "charging" ? slot.progress : 0;
    // 진행이 아주 작으면 둥근 끝 점 하나만 남깁니다 — 길이 0인 호는 그려지지 않습니다.
    const filled =
      share <= 0 ? "" : arc(from, from + Math.max(0.5, (to - from) * share), colors.fill);
    return track + filled;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(size)}" height="${String(size)}" viewBox="0 0 ${String(size)} ${String(size)}"><g fill="none" stroke-width="${String(strokeWidth)}" stroke-linecap="round">${paths.join("")}</g></svg>`;
}
