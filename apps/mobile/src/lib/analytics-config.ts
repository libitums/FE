// 분석 설정 판정 — 순수. 키가 없거나 프로젝트 키(phc_)가 아니면 null(보내지 않음). 계약: spec §3.
import type {
  AnalyticsConfig,
  AnalyticsConfigFrom,
  AnalyticsEnvironmentFrom,
  PostHogHost,
} from "./analytics.contract";

export const postHogHost: PostHogHost = "https://us.i.posthog.com";

const projectKeyPattern = /^phc_\S+$/;

// 정확히 "production"만 운영입니다. 빠졌거나 다른 값이면 development(ADR-0029 D13).
export const analyticsEnvironmentFrom: AnalyticsEnvironmentFrom = (environment) =>
  environment === "production" ? "production" : "development";

export const analyticsConfigFrom: AnalyticsConfigFrom = (projectKey, environment) => {
  if (typeof projectKey !== "string") {
    return null;
  }
  const trimmed = projectKey.trim();
  if (!projectKeyPattern.test(trimmed)) {
    return null;
  }
  return {
    projectKey: trimmed,
    host: postHogHost,
    environment: analyticsEnvironmentFrom(environment),
  };
};

// 번들 치환을 위해 리터럴 멤버 접근으로 읽습니다(구조 분해 · 동적 키 금지). 호출마다 읽습니다.
export const analyticsConfig = (): AnalyticsConfig | null =>
  analyticsConfigFrom(
    import.meta.env.PUBLIC_POSTHOG_KEY,
    import.meta.env.PUBLIC_ANALYTICS_ENVIRONMENT,
  );
