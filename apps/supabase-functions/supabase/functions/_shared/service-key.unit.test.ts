import { describe, expect, test } from "vitest";

import { isJwtShaped, serviceKeyHeaders } from "./service-key.ts";

describe("SK1 serviceKeyHeaders", () => {
  test("레거시 JWT는 apikey와 Authorization, 비밀 키는 apikey만", () => {
    expect(isJwtShaped("eyJh.eyJi.sig")).toBe(true);
    expect(isJwtShaped("sb_secret_abc")).toBe(false);
    expect(serviceKeyHeaders("eyJh.eyJi.sig")).toEqual({
      apikey: "eyJh.eyJi.sig",
      Authorization: "Bearer eyJh.eyJi.sig",
    });
    expect(serviceKeyHeaders("sb_secret_abc")).toEqual({ apikey: "sb_secret_abc" });
  });
});
