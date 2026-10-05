import { describe, expect, it } from "vitest";
import { buildGtagBootstrap, consentDeniedRegions, resolveMeasurementId } from "./gtag";

describe("resolveMeasurementId", () => {
  it("U-GA1 비었거나 없으면 빈 문자열", () => {
    expect(resolveMeasurementId(undefined)).toBe("");
    expect(resolveMeasurementId("")).toBe("");
    expect(resolveMeasurementId("   ")).toBe("");
  });

  it("U-GA2 G-로 시작하는 측정 ID는 다듬어 그대로", () => {
    expect(resolveMeasurementId(" G-AB12CD34EF ")).toBe("G-AB12CD34EF");
  });

  it("U-GA3 측정 ID 모양이 아니면 변수 이름과 받은 값을 말하며 던진다", () => {
    expect(resolveMeasurementId("G-AB12CD34EF")).toBe("G-AB12CD34EF");
    for (const wrong of ["UA-12345-1", "g-ab12", "G-", "GTM-ABC123", "G-AB12<script>"]) {
      expect(() => resolveMeasurementId(wrong)).toThrow("PUBLIC_GA_MEASUREMENT_ID");
      expect(() => resolveMeasurementId(wrong)).toThrow(wrong);
    }
  });
});

describe("consentDeniedRegions", () => {
  it("U-GA4 EU 27개국과 EEA · 영국 · 스위스를 담고 한국 · 미국은 없다", () => {
    expect(consentDeniedRegions).toHaveLength(32);
    expect(new Set(consentDeniedRegions).size).toBe(32);
    for (const code of ["DE", "FR", "IE", "IS", "LI", "NO", "GB", "CH"]) {
      expect(consentDeniedRegions).toContain(code);
    }
    for (const code of ["KR", "US", "JP", "VN"]) {
      expect(consentDeniedRegions).not.toContain(code);
    }
  });
});

describe("buildGtagBootstrap", () => {
  const bootstrap = () => buildGtagBootstrap("G-AB12CD34EF");

  it("U-GA5 동의 기본값 둘이 config보다 앞에 온다", () => {
    const script = bootstrap();
    const denied = script.indexOf('"analytics_storage":"denied"');
    const granted = script.indexOf('"analytics_storage":"granted"');
    const config = script.indexOf('gtag("config","G-AB12CD34EF")');
    expect(denied).toBeGreaterThan(-1);
    expect(granted).toBeGreaterThan(denied);
    expect(config).toBeGreaterThan(granted);
  });

  it("U-GA6 거부 기본값에만 지역이 붙고, 광고 저장은 어디서나 거부", () => {
    const script = bootstrap();
    const calls = [...script.matchAll(/gtag\("consent","default",(\{.*?\})\);/g)].map(
      (match) => JSON.parse(match[1] ?? "{}") as Record<string, unknown>,
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]?.region).toEqual([...consentDeniedRegions]);
    expect(calls[1]?.region).toBeUndefined();
    for (const call of calls) {
      expect(call.ad_storage).toBe("denied");
      expect(call.ad_user_data).toBe("denied");
      expect(call.ad_personalization).toBe("denied");
    }
  });

  it("U-GA7 측정 ID 모양이 아니면 던진다", () => {
    expect(buildGtagBootstrap("G-AB12CD34EF")).toContain("G-AB12CD34EF");
    expect(() => buildGtagBootstrap("")).toThrow(/\S/);
    expect(() => buildGtagBootstrap('G-X");alert(1)//')).toThrow(/\S/);
  });
});
