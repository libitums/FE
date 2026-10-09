import { describe, expect, it } from "vitest";
import { deployEnvironment } from "./deploy-env";

describe("deployEnvironment", () => {
  it("U-DE1 Vercel 밖에서는 SITE_URL을 그대로 넘기고 색인을 허용한다", () => {
    expect(deployEnvironment({})).toEqual({ siteUrlEnv: undefined, indexable: true });
    expect(deployEnvironment({ SITE_URL: "https://duru.example" })).toEqual({
      siteUrlEnv: "https://duru.example",
      indexable: true,
    });
  });

  it("U-DE2 Vercel 프로덕션에서 SITE_URL이 없으면 프로젝트의 프로덕션 주소를 쓴다", () => {
    expect(
      deployEnvironment({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
      }),
    ).toEqual({ siteUrlEnv: "https://duru.vercel.app", indexable: true });
  });

  it("U-DE3 SITE_URL이 있으면 프로덕션에서도 그것이 우선한다", () => {
    expect(
      deployEnvironment({
        SITE_URL: "https://duru.example",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
      }),
    ).toEqual({ siteUrlEnv: "https://duru.example", indexable: true });
  });

  it("U-DE4 Vercel 프리뷰 · 개발 배포는 주소를 갖지 않고 색인에서 빠진다", () => {
    for (const VERCEL_ENV of ["preview", "development"]) {
      expect(
        deployEnvironment({
          VERCEL_ENV,
          SITE_URL: "https://duru.example",
          VERCEL_PROJECT_PRODUCTION_URL: "duru.vercel.app",
        }),
      ).toEqual({ siteUrlEnv: undefined, indexable: false });
    }
  });
});
