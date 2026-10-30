import "background-only";

// 번들에 내장한 에피소드입니다(사용자 결정: 초반 에피소드는 내장, 이후는 서버).
import manifestJson from "../../content/manifest.json";
import u00Tutorial from "../../content/episodes/u00-tutorial.json";
import u01Water from "../../content/episodes/u01-water.json";
import u02Checkin from "../../content/episodes/u02-checkin.json";
import u03Mina from "../../content/episodes/u03-mina.json";
import u04Directions from "../../content/episodes/u04-directions.json";
import u05Baekban from "../../content/episodes/u05-baekban.json";
import u06Cafe from "../../content/episodes/u06-cafe.json";
import u07Jaemin from "../../content/episodes/u07-jaemin.json";
import u08Umbrella from "../../content/episodes/u08-umbrella.json";
import u09Subway from "../../content/episodes/u09-subway.json";
import u10Laundry from "../../content/episodes/u10-laundry.json";
import type { CatalogInput } from "./episode-catalog";
import { decodeManifest } from "./episode-manifest";

// 내장 매니페스트는 코드와 함께 배포되는 데이터라, 디코드 실패는 빌드 시점 결함입니다. 런타임
// 무예외 원칙의 유일한 예외로 모듈 평가에서 던집니다.
const decoded = decodeManifest(manifestJson);
if (!decoded.ok) {
  throw new Error(`bundled manifest is invalid: ${JSON.stringify(decoded.errors)}`);
}

export const bundledCatalogInput: CatalogInput["bundled"] = {
  manifest: decoded.manifest,
  episodes: {
    "u00-tutorial": u00Tutorial,
    "u01-water": u01Water,
    "u02-checkin": u02Checkin,
    "u03-mina": u03Mina,
    "u04-directions": u04Directions,
    "u05-baekban": u05Baekban,
    "u06-cafe": u06Cafe,
    "u07-jaemin": u07Jaemin,
    "u08-umbrella": u08Umbrella,
    "u09-subway": u09Subway,
    "u10-laundry": u10Laundry,
  },
};
