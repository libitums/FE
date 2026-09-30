import { expect, test } from "vitest";
import { render, screen } from "@lynx-js/react/testing-library";

import { UiCopyContext } from "../lib/ui-copy";
import { markedUiCopy } from "../lib/ui-copy.test-support";
import { CallCaller } from "./CallCaller";

// `ui` 계층: 통화 상대 묶음의 낭독 이름이 문구표의 것인지 봅니다(ADR-0006 D4).

const props = {
  callerName: "Minseo",
  callerPortrait: "portrait.png",
  clockRunning: false,
  testIdPrefix: "call",
} as const;

test("[SH5-E] 통화 상대 묶음의 낭독 이름이 영어 Voice call, 이름이다", () => {
  render(<CallCaller {...props} />);

  expect(screen.getByTestId("call-caller")).toHaveAttribute(
    "accessibility-label",
    "Voice call, Minseo",
  );
});

test("[SH5-M] 문구표를 주입하면 낭독 이름이 phoneCall.voiceCall 경로(인자 포함)로 나온다", () => {
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <CallCaller {...props} />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("call-caller")).toHaveAttribute(
    "accessibility-label",
    "⟦phoneCall.voiceCall⟧(Minseo)",
  );
});
