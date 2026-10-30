import { describe, expect, it } from "vitest";
import { buildAirbridgeBootstrap } from "../analytics/airbridge-bootstrap";
import Airbridge from "./Airbridge.astro";
import { render } from "./render.support";

const webToken = "e2e-test-web-token-0000000000";

describe("Airbridge", () => {
  it("UI-AB1 토큰이 있으면 부트스트랩 inline script 하나를 내고 외부 src는 달지 않는다", async () => {
    const { document, html } = await render(Airbridge, { props: { webToken } });
    const bootstraps = [...document.querySelectorAll("script:not([src])")].filter((node) =>
      (node.textContent ?? "").includes("airbridge.init("),
    );
    expect(bootstraps).toHaveLength(1);
    const body = bootstraps[0]?.textContent ?? "";
    expect(body).toBe(buildAirbridgeBootstrap(webToken));
    expect(body).toContain("static.airbridge.io");
    expect(body.split(webToken)).toHaveLength(2);
    // 로더가 SDK를 스스로 끼우므로 다른 호스트를 가리키는 정적 script는 없습니다(모듈 스크립트는 로컬 src로 렌더됩니다).
    expect(document.querySelectorAll('script[src^="http"]')).toHaveLength(0);
    expect(document.querySelectorAll('script[type="module"]')).toHaveLength(1);
    expect(html).toContain(webToken);
  });

  it("UI-AB2 토큰이 없으면 아무 스크립트도 내지 않는다", async () => {
    // 토큰이 있을 때 script가 나오는 긍정 쪽은 UI-AB1이 맡습니다.
    const { document, html } = await render(Airbridge, { props: { webToken: "" } });
    expect(document.querySelectorAll("script")).toHaveLength(0);
    expect(html).not.toMatch(/airbridge/i);
  });
});
