// 빌드 전용 순수 함수입니다. 브라우저 번들(`scripts/airbridge-main.ts`)은 이 파일을 import하지 않습니다.

import { airbridgeAppName, airbridgeDefaultChannel } from "../site";
import { airbridgeLoaderSnippet } from "./airbridge-loader";
import type {
  AirbridgeInitOptionsOf,
  BuildAirbridgeBootstrap,
  ResolveAirbridgeWebToken,
} from "./airbridge.contract";

const webTokenPattern = /^[A-Za-z0-9._-]{16,}$/;
const webTokenMessage =
  "PUBLIC_AIRBRIDGE_WEB_TOKEN 모양이 틀렸습니다(영문 · 숫자 · . _ - 16자 이상, 공백 없음)";

/** `PUBLIC_AIRBRIDGE_WEB_TOKEN`의 원문을 토큰 또는 `""`로 바꿉니다. 모양이 틀리면 값 없이 던집니다. */
export const resolveAirbridgeWebToken: ResolveAirbridgeWebToken = (env) => {
  const candidate = (env ?? "").trim();
  if (candidate === "") return "";
  if (!webTokenPattern.test(candidate)) throw new Error(webTokenMessage);
  return candidate;
};

export const airbridgeInitOptionsOf: AirbridgeInitOptionsOf = (webToken) => ({
  app: airbridgeAppName,
  webToken,
  utmParsing: true,
  defaultChannel: airbridgeDefaultChannel,
  autoStartTrackingEnabled: false,
});

/** 로더 스니펫 뒤에 `airbridge.init(...)` 호출을 붙인 inline 스크립트 본문입니다. */
export const buildAirbridgeBootstrap: BuildAirbridgeBootstrap = (webToken) => {
  if (!webTokenPattern.test(webToken)) throw new Error(webTokenMessage);
  return `${airbridgeLoaderSnippet}airbridge.init(${JSON.stringify(airbridgeInitOptionsOf(webToken))});`;
};
