import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { entryLoginMethods } from "../../lib/entry-flow";
import type { SocialSignInOutcome } from "../../lib/social-sign-in.contract";
import { LoginScreen } from "./LoginScreen";

function renderLogin(
  overrides: {
    onBack?: () => void;
    onSelectSocialMethod?: () => Promise<SocialSignInOutcome>;
  } = {},
) {
  return render(
    <LoginScreen
      phoneSignIn="visible"
      onSelectSocialMethod={overrides.onSelectSocialMethod ?? (() => new Promise(() => {}))}
      onSubmitPhoneNumber={() => Promise.resolve({ status: "sent" as const })}
      onBack={overrides.onBack}
      onOpenLegalDocument={vi.fn()}
    />,
  );
}

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US20] 요청 중이 아니면 뒤로가기는 onBack 1회", () => {
  const onBack = vi.fn<() => void>();
  renderLogin({ onBack });

  expect(pressBack()).toBe(true);

  expect(onBack).toHaveBeenCalledTimes(1);
});

test("[UN3] 요청 중 → runTop()은 true(등록은 됐다)지만 onBack은 0회", () => {
  const onBack = vi.fn<() => void>();
  renderLogin({ onBack });
  const social = entryLoginMethods.filter((method) => method !== "phone")[0]!;
  fireEvent.tap(
    within(screen.getByTestId(`login-screen-method-${social}`)).getByTestId("ui-lynx-button"),
    {},
  );

  expect(pressBack()).toBe(true);

  expect(onBack).not.toHaveBeenCalled();
});

test("[UL6] 국가 시트 열림 → 뒤로가기는 시트만 닫는다(onBack 0회)", () => {
  const onBack = vi.fn<() => void>();
  renderLogin({ onBack });
  // 시트는 보이는 국가 칩으로 엽니다 — 이 케이스는 층 등록만 따로 봅니다.
  fireEvent.tap(screen.getByTestId("login-screen-country"), {});
  expect(screen.getByTestId("ui-lynx-bottom-sheet")).toBeInTheDocument();

  expect(pressBack()).toBe(true);

  expect(screen.queryByTestId("ui-lynx-bottom-sheet")).not.toBeInTheDocument();
  expect(onBack).not.toHaveBeenCalled();
});
