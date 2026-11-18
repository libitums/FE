// 「앱을 올리지 않은 사람」 세그먼트(ADR-0130 D13)의 순수 판정입니다 — 목표 빌드 · 대상 · 스토어 이름 · PostHog 행 읽기.
// 서버(push_devices)는 앱 버전을 모릅니다. 버전은 PostHog 이벤트의 `platform` · `appBuild`(ADR-0110)에서 옵니다.

export const UPDATE_SEGMENT = "update-available";

/**
 * 목표 빌드의 처음 값 — 이보다 낮은 빌드가 대상입니다. Android 23 = 1.4.1(채팅을 모든 회원에게 연 스토어 빌드).
 * iOS는 1.1.1이 아직 App Store에 없어 비워 둡니다 — 스토어에 오르면 콘솔에서 그 빌드 번호를 적습니다.
 */
export const DEFAULT_TARGET_BUILDS = Object.freeze({ android: 23, ios: null });

export const PLATFORMS = ["android", "ios"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** HogQL 시각 → ms(sources.mjs `hogqlTimeMs`와 같은 규칙 — sources가 이 파일을 읽어 서로 부르지 않게 둡니다). */
function timeMs(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value);
  const ms = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

/** 양의 정수만 빌드로 읽습니다. 그 밖은 `null`. */
function buildOf(value) {
  if (typeof value === "number") return Number.isInteger(value) && value > 0 ? value : null;
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) && Number(text) > 0 ? Number(text) : null;
}

/** 콘솔 입력 → 플랫폼마다 목표 빌드(없으면 그 플랫폼은 대상이 아님). 입력이 없으면 처음 값입니다. */
export function normalizeTargets(input) {
  if (input === undefined || input === null) return { ...DEFAULT_TARGET_BUILDS };
  return { android: buildOf(input.android), ios: buildOf(input.ios) };
}

export function targetsProblems(targets) {
  return PLATFORMS.some((platform) => targets?.[platform])
    ? []
    : ["목표 빌드를 Android · iOS 중 하나는 적어 주세요."];
}

/** 그 사람의 마지막 빌드가 그 플랫폼 목표보다 낮은지 봅니다. PostHog에서 본 적 없으면 `false`. */
export function needsUpdate(learner, targets) {
  const target = targets?.[learner?.platform];
  return (
    typeof target === "number" && typeof learner.appBuild === "number" && learner.appBuild < target
  );
}

export const storeNameFor = (platform) => (platform === "ios" ? "App Store" : "Google Play");

/**
 * PostHog 행 `[distinct_id, platform, appBuild, appVersion, 마지막 시각]` → 사용자 id마다 마지막 앱 정보입니다.
 * distinct_id가 Supabase 사용자 id(uuid)인 행 · 알려진 플랫폼 · 숫자 빌드만 남깁니다.
 */
export function appVersionsFrom(rows) {
  const versions = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Array.isArray(row)) continue;
    const [userId, platform, build, version, seen] = row;
    const appBuild = buildOf(build);
    if (!UUID.test(String(userId)) || !PLATFORMS.includes(platform) || appBuild === null) continue;
    versions.set(userId, {
      platform,
      appBuild,
      appVersion: typeof version === "string" ? version : null,
      seenMs: timeMs(seen),
    });
  }
  return versions;
}

/** 「업데이트함」 HogQL 조건 — 플랫폼마다 목표 빌드 이상인 이벤트입니다. 목표가 하나도 없으면 `null`. */
export function updatedCondition(targets) {
  const parts = PLATFORMS.flatMap((platform) => {
    const target = buildOf(targets?.[platform]);
    return target === null
      ? []
      : [
          `(properties.platform = '${platform}' AND toIntOrNull(toString(properties.appBuild)) >= ${target})`,
        ];
  });
  return parts.length === 0 ? null : parts.join(" OR ");
}
