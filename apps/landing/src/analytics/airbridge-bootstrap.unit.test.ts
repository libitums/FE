import { describe, expect, it } from "vitest";
import { airbridgeAppName, airbridgeDefaultChannel } from "../site";
import {
  airbridgeInitOptionsOf,
  buildAirbridgeBootstrap,
  resolveAirbridgeWebToken,
} from "./airbridge-bootstrap";
import { airbridgeLoaderSnippet } from "./airbridge-loader";

const tok = "e2e-test-web-token-0000000000";

function messageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
}

describe("resolveAirbridgeWebToken", () => {
  it("U-AB1 비었거나 없으면 빈 문자열, 값은 다듬어 돌려준다", () => {
    expect(resolveAirbridgeWebToken(undefined)).toBe("");
    expect(resolveAirbridgeWebToken("")).toBe("");
    expect(resolveAirbridgeWebToken("   ")).toBe("");
    expect(resolveAirbridgeWebToken(` ${tok} `)).toBe(tok);
  });

  it("U-AB1 모양이 틀리면 변수 이름만 말하며 던진다(값은 싣지 않는다)", () => {
    const wrongs = [
      "a b",
      "tok\n",
      "short-1",
      "tok<script>",
      "토큰토큰토큰토큰토큰토큰",
      "e2e-test!web-token-0000000000",
    ];
    for (const wrong of wrongs) {
      expect(() => resolveAirbridgeWebToken(wrong)).toThrow("PUBLIC_AIRBRIDGE_WEB_TOKEN");
      expect(messageOf(() => resolveAirbridgeWebToken(wrong))).not.toContain(wrong);
    }
  });
});

describe("airbridgeInitOptionsOf", () => {
  it("U-AB2 다섯 키로 닫힌 init 옵션을 만든다", () => {
    expect(airbridgeInitOptionsOf(tok)).toEqual({
      app: "duru",
      webToken: tok,
      utmParsing: true,
      defaultChannel: "k-duru.com",
      autoStartTrackingEnabled: false,
    });
    expect(Object.keys(airbridgeInitOptionsOf(tok)).sort()).toEqual([
      "app",
      "autoStartTrackingEnabled",
      "defaultChannel",
      "utmParsing",
      "webToken",
    ]);
  });

  it("U-AB2 사이트 상수", () => {
    expect(airbridgeAppName).toBe("duru");
    expect(airbridgeDefaultChannel).toBe("k-duru.com");
  });
});

describe("buildAirbridgeBootstrap", () => {
  it("U-AB3 로더 스니펫 뒤에 init 호출이 정확히 한 번 붙는다", () => {
    const out = buildAirbridgeBootstrap(tok);
    const call = `airbridge.init(${JSON.stringify(airbridgeInitOptionsOf(tok))});`;
    expect(out.startsWith(airbridgeLoaderSnippet)).toBe(true);
    expect(out.slice(airbridgeLoaderSnippet.length)).toContain(call);
    expect(out.split("airbridge.init(")).toHaveLength(2);
    expect(out.split(call)).toHaveLength(2);
  });

  it("U-AB3 모양이 틀린 토큰이면 던지고 </script를 담지 않는다", () => {
    expect(() => buildAirbridgeBootstrap("")).toThrow();
    expect(() => buildAirbridgeBootstrap("a b")).toThrow();
    expect(buildAirbridgeBootstrap(tok)).not.toContain("</script");
    expect(buildAirbridgeBootstrap(tok)).toContain(tok);
  });
});
