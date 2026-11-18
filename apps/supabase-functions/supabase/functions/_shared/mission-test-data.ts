// 미션 단위 테스트 · 번들 생성이 읽는 저장소 미션 파일(Node 전용 — Edge Function은 이 파일을 import하지 않습니다).
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { parseMission, type MissionDefinition } from "./mission-definition.ts";

export const missionsDir = fileURLToPath(new URL("./missions/", import.meta.url));

/** `missions/*.json`을 파일 이름 순으로 읽어 검사한 것. 틀린 파일이 있으면 던집니다. */
export function loadMissionFiles(): MissionDefinition[] {
  return readdirSync(missionsDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => parseMission(JSON.parse(readFileSync(`${missionsDir}${name}`, "utf8"))));
}

const byId = (id: string): MissionDefinition => {
  const mission = loadMissionFiles().find((entry) => entry.id === id);
  if (mission === undefined) throw new Error(`미션 파일이 없습니다: ${id}`);
  return mission;
};

export const cafeMission = byId("u06-cafe");
export const waterMission = byId("u01-water");
