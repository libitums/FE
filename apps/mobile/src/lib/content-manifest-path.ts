// 콘텐츠 수준별 매니페스트 경로입니다(ADR-0087). 순수 함수만 둡니다.

/** 수준 1(처음 나간 앱)이 읽는 매니페스트입니다. 옛 앱은 이 경로만 압니다. */
export const BASE_MANIFEST_PATH = "manifest.json";

/**
 * 이 앱이 차례로 시도할 매니페스트 경로 — 자기 수준부터 2까지 `manifests/level-<n>.json`, 마지막은
 * `manifest.json`. 수준 1 이하면 `manifest.json` 하나입니다. 앞 경로가 서버에 없을 때만 다음으로 넘어갑니다.
 */
export function contentManifestPathsFor(clientLevel: number): readonly string[] {
  const paths: string[] = [];
  for (let level = Math.floor(clientLevel); level >= 2; level -= 1) {
    paths.push(`manifests/level-${level}.json`);
  }
  paths.push(BASE_MANIFEST_PATH);
  return paths;
}
