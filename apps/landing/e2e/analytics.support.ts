import type { Page } from "@playwright/test";

/** 측정 ID가 든 빌드에서 밖으로 나가는 스크립트 호스트 — gtag와 Airbridge 로더. 요청은 세되 빈 스크립트로 답한다. */
export const blockedHosts = ["www.googletagmanager.com", "static.airbridge.io"] as const;

/** 위 호스트의 요청을 전부 빈 JS로 막는다. */
export async function routeBlockedHosts(page: Page): Promise<void> {
  for (const host of blockedHosts) {
    await page.route(`https://${host}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "text/javascript", body: "" }),
    );
  }
}

/** 막은 호스트가 아닌 바깥 호스트만 남긴다(단언용). */
export const unexpectedHosts = (hosts: readonly string[]): string[] =>
  hosts.filter((host) => !(blockedHosts as readonly string[]).includes(host));
