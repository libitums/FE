import { expect, test } from "vitest";
import { render } from "@lynx-js/react/testing-library";

import { UiCopyContext, useUiCopy } from "./ui-copy";
import { uiCopyEn } from "./ui-copy-en";
import type { UiCopy } from "./ui-copy.contract";
import { markedUiCopy } from "./ui-copy.test-support";

// `ui` 계층: `useUiCopy`를 읽는 테스트 컴포넌트로 Provider 유무에 따른 표를 확인합니다.

function Probe({ onCopy }: { readonly onCopy: (copy: UiCopy) => void }) {
  onCopy(useUiCopy());
  return <text>probe</text>;
}

test("[UI0] Provider가 없으면 영어 표를 받는다", () => {
  let received: UiCopy | undefined;
  render(<Probe onCopy={(copy) => (received = copy)} />);

  expect(received).toBe(uiCopyEn);
});

test("[UI0] Provider에 markedUiCopy를 주면 그 표를 받는다", () => {
  let received: UiCopy | undefined;
  render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <Probe onCopy={(copy) => (received = copy)} />
    </UiCopyContext.Provider>,
  );

  expect(received).toBe(markedUiCopy);
});
