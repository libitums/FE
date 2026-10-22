// Airbridge 딥링크 URL을 앱이 아는 탭으로 읽습니다(ADR-0080 D2). 사용자 결정(2026-10-22): **앱 열기 + 주요 탭 셋**.
// `duru://<탭>` 또는 `duru:///<탭>`이고, 쿼리 · 끝의 `/`는 무시합니다. 모르는 목적지 · 로그인 콜백 · 다른 scheme은
// `null` — 앱만 열고 화면을 옮기지 않습니다. 순수.

import type { Tab } from "./nav-state";

const tabs: Readonly<Record<string, Tab>> = {
  journey: "journey",
  roleplay: "roleplay",
  settings: "settings",
};

const deeplink = /^duru:\/\/([^/?#]*)\/?([^/?#]*)/i;

export function deeplinkTabFrom(url: unknown): Tab | null {
  if (typeof url !== "string") return null;
  const matched = deeplink.exec(url);
  if (matched === null) return null;
  const name = (matched[1] === "" ? matched[2] : matched[1]).toLowerCase();
  return Object.prototype.hasOwnProperty.call(tabs, name) ? tabs[name] : null;
}
