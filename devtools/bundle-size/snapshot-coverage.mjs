// 메인 스레드가 background의 그리기 틀(snapshot)과 main-thread 함수(worklet)를 모두 갖고 있는지 봅니다(ADR-0149 「줄인 기록」 1).
//
// 메인 스레드는 첫 화면만 그리고(`apps/mobile/src/app/render-app-content.tsx`) 그 뒤 화면은 background가 그려 패치로 보냅니다.
// 패치는 그리기 틀을 id로만 가리키므로, background가 만들 수 있는 틀의 등록이 메인 스레드 번들에서 빠지면 그 화면을 여는 순간
// 「Snapshot not found」로 멈춥니다. worklet도 같습니다. 순수 함수만 둡니다 — 빌드와 파일 읽기는 `snapshot-coverage-cli.mjs`.

const SNAPSHOT_ID = /__snapshot_[0-9a-f]{5}_[0-9a-f]{5}_\d+/g;
const WORKLET_REGISTERED = /registerWorkletInternal\("main-thread","([^"]+)"/g;
const WORKLET_USED = /_wkltId:"([^"]+)"/g;

function collect(source, pattern, group = 0) {
  const found = new Set();
  for (const match of source.matchAll(pattern)) found.add(match[group]);
  return found;
}

/**
 * @param {{ mainThread: string; background: string }} sources 중간 산출물(`.rspeedy/main`)의 두 스레드 코드
 * @returns {{ snapshots: number; worklets: number; missingSnapshots: string[]; missingWorklets: string[] }}
 */
export function snapshotCoverage({ mainThread, background }) {
  const mainSnapshots = collect(mainThread, SNAPSHOT_ID);
  const backgroundSnapshots = collect(background, SNAPSHOT_ID);
  const registered = collect(mainThread, WORKLET_REGISTERED, 1);
  const used = collect(background, WORKLET_USED, 1);
  return {
    snapshots: backgroundSnapshots.size,
    worklets: used.size,
    missingSnapshots: [...backgroundSnapshots].filter((id) => !mainSnapshots.has(id)).sort(),
    missingWorklets: [...used].filter((id) => !registered.has(id)).sort(),
  };
}
