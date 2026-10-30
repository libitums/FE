import { describe, expect, it } from "vitest";
import { airbridgeDeeplinkOptionsOf, airbridgeSdkOf, startsTrackingIn } from "./airbridge";

describe("airbridgeDeeplinkOptionsOf", () => {
  it("U-AB4 지금 페이지 주소를 desktop · ios 폴백에 쓴다", () => {
    expect(airbridgeDeeplinkOptionsOf({ origin: "https://k-duru.com", pathname: "/ko/" })).toEqual({
      type: "click",
      deeplinks: {
        android: "duru://journey",
        ios: "duru://journey",
        desktop: "https://k-duru.com/ko/",
      },
      fallbacks: { android: "google-play", ios: "https://k-duru.com/ko/" },
    });
    expect(
      airbridgeDeeplinkOptionsOf({ origin: "https://k-duru.com", pathname: "/" }).deeplinks.desktop,
    ).toBe("https://k-duru.com/");
    const local = airbridgeDeeplinkOptionsOf({ origin: "http://127.0.0.1:4398", pathname: "/" });
    expect(local.deeplinks.desktop).toBe("http://127.0.0.1:4398/");
    expect(local.fallbacks.ios).toBe("http://127.0.0.1:4398/");
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

  it("U-AB5 목록에 없는 Atlantic/Azores는 시작한다(목록을 넓히면 이 줄이 바뀐다)", () => {
    expect(startsTrackingIn("Atlantic/Azores")).toBe(true);
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
