// 에피소드를 열 때 받기 시트를 띄울지 정하는 순수 판정입니다(ADR-0095 D6 · D7). 던지지 않습니다.

import type { MobileDataPolicy } from "./download-policy";
import type { NetworkProperties } from "./network-status";

/** `open` 바로 엶 · `ask` 받을지 묻는 시트 · `wifi-only` Wi-Fi에서 받는다는 안내 · `offline` 오프라인 시트. */
export type EpisodeOpenGate = "open" | "ask" | "wifi-only" | "offline";

export type EpisodeOpenGateInput = {
  readonly assetsComplete: boolean;
  readonly isTutorial: boolean;
  readonly network: NetworkProperties;
  readonly policy: MobileDataPolicy;
  readonly allowed: boolean;
};

export function episodeOpenGate(input: EpisodeOpenGateInput): EpisodeOpenGate {
  if (input.assetsComplete || input.isTutorial) return "open";
  if (input.network.network === "offline") return "offline";
  const cost = input.network.networkCost;
  // 요금 없는 연결 · 모르는 연결은 받는 중이니 엽니다 — 받는 대로 그림 · 소리가 채워집니다(ADR-0071).
  if (cost !== "metered" && cost !== "constrained") return "open";
  if (input.policy === "always" || input.allowed) return "open";
  return input.policy === "wifi-only" ? "wifi-only" : "ask";
}
