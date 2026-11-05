import { describe, expect, it } from "vitest";
import { airbridgeDeeplinkOptionsOf, airbridgeSdkOf, startsTrackingIn } from "./airbridge";

describe("airbridgeDeeplinkOptionsOf", () => {
  const play = "https://play.google.com/store/apps/details?id=libitum.duru.android";

  it("U-AB4 클릭한 카드의 href를 desktop · ios 폴백에 쓴다 — 페이지 주소가 아니다", () => {
    expect(airbridgeDeeplinkOptionsOf(play)).toEqual({
      type: "click",
      deeplinks: { android: "duru://journey", ios: "duru://journey", desktop: play },
      fallbacks: { android: "google-play", ios: play },
    });
  });

  it("U-AB4 href의 쿼리 · 조각을 손대지 않고 다른 주소도 그대로 반영한다", () => {
    const other = "https://play.google.com/store/apps/details?id=app.duru&hl=ko#x";
    const options = airbridgeDeeplinkOptionsOf(other);
    expect(options.deeplinks.desktop).toBe(other);
    expect(options.fallbacks.ios).toBe(other);
    expect(options.deeplinks.desktop).not.toContain("k-duru.com");
  });
});

describe("startsTrackingIn", () => {
  it("U-AB5 유럽 밖이거나 모르면 시작한다", () => {
    for (const zone of [
      "Asia/Seoul",
      "America/New_York",
      "UTC",
      "Australia/Sydney",
      undefined,
      "",
    ]) {
      expect(startsTrackingIn(zone)).toBe(true);
    }
  });

  it("U-AB5 Europe/* 와 EEA 대서양 영토는 시작하지 않는다", () => {
    const zones = [
      "Europe/Paris",
      "Europe/London",
      "Europe/Zurich",
      "Europe/Dublin",
      "Europe/Istanbul",
      "Atlantic/Reykjavik",
      "Atlantic/Canary",
      "Atlantic/Madeira",
      "Atlantic/Faroe",
    ];
    for (const zone of zones) {
      expect(startsTrackingIn(zone)).toBe(false);
    }
  });

  it("U-AB5 Atlantic/Azores(포르투갈 — EU)도 시작하지 않는다", () => {
    expect(startsTrackingIn("Atlantic/Azores")).toBe(false);
  });
});

describe("airbridgeSdkOf", () => {
  it("U-AB6 SDK가 아닌 값은 null", () => {
    const candidates: unknown[] = [
      undefined,
      null,
      "x",
      {},
      { isSDKEnabled: false, openDeeplink() {} },
      { isSDKEnabled: true },
      {
        get isSDKEnabled() {
          return false;
        },
        openDeeplink() {},
      },
    ];
    for (const candidate of candidates) {
      expect(airbridgeSdkOf(candidate)).toBeNull();
    }
  });

  it("U-AB6 켜진 SDK는 같은 참조로 돌려준다", () => {
    const sdk = { isSDKEnabled: true, openDeeplink() {} };
    expect(airbridgeSdkOf(sdk)).toBe(sdk);
  });
});
