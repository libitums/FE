// 랜딩 Airbridge 진입점입니다. 결선만 하고 계산은 하지 않습니다.

import { airbridgeDeeplinkOptionsOf, airbridgeSdkOf } from "../analytics/airbridge";
import { initAirbridgeCta, initAirbridgeTracking } from "./airbridge-cta";

initAirbridgeTracking({
  airbridge: window.airbridge,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});
initAirbridgeCta({
  root: document,
  sdkOf: () => airbridgeSdkOf((window as { airbridge?: unknown }).airbridge),
  deeplink: airbridgeDeeplinkOptionsOf({ origin: location.origin, pathname: location.pathname }),
});
