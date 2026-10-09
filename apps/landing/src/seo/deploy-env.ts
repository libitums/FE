// 배포 환경에서 「이 빌드가 어느 주소로 나가고, 검색에 실려도 되는가」를 정합니다.
// Vercel의 시스템 환경 변수(VERCEL_ENV · VERCEL_PROJECT_PRODUCTION_URL)를 읽고, 그 밖에서는 SITE_URL만 봅니다.

export interface DeployEnvironment {
  /** `resolveSiteUrl`에 넘길 배포 주소의 원문입니다. 없으면 `undefined`. */
  siteUrlEnv: string | undefined;
  /** 검색에 실려도 되는 빌드인가. Vercel의 프리뷰 · 개발 배포는 아닙니다. */
  indexable: boolean;
}

export function deployEnvironment(env: Record<string, string | undefined>): DeployEnvironment {
  const vercel = env.VERCEL_ENV;
  // 프리뷰는 배포마다 주소가 달라 canonical이 가리킬 곳이 없고, 프로덕션과 같은 내용이 검색에 겹쳐 실리면 안 됩니다.
  if (vercel !== undefined && vercel !== "production") {
    return { siteUrlEnv: undefined, indexable: false };
  }
  const explicit = env.SITE_URL?.trim();
  if (explicit) return { siteUrlEnv: explicit, indexable: true };
  const production = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return {
    siteUrlEnv: vercel === "production" && production ? `https://${production}` : undefined,
    indexable: true,
  };
}
