import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import type { SocialSignInOutcome } from "../../lib/social-sign-in.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { LoginScreen } from "./LoginScreen";
import { unavailableSocialLoginMethodsFor } from "./login";
import type { LoginScreenProps } from "./login.contract";

// `ui` 계층: 「비회원으로 계속」 버튼과 플랫폼별 소셜 목록(spec §3-1, test-plan LG-G1~4).
// 라벨은 `uiCopyEn.login.guest`를 참조합니다 — 문구 리터럴을 다시 적지 않습니다.

function renderLogin(overrides: Partial<LoginScreenProps> = {}) {
  return render(
    <LoginScreen
      phoneSignIn="visible"
      unavailableMethods={unavailableSocialLoginMethodsFor("ios", null)}
      guestSignIn="visible"
      onContinueAsGuest={() => undefined}
      onSelectSocialMethod={() => new Promise<SocialSignInOutcome>(() => {})}
      onSubmitPhoneNumber={() => Promise.resolve({ status: "sent" as const })}
      onOpenLegalDocument={() => undefined}
      {...overrides}
    />,
  );
}

function methodButton(method: string): HTMLElement {
  return within(screen.getByTestId(`login-screen-method-${method}`)).getByTestId("ui-lynx-button");
}

// 소셜 수단 요소(전화번호 · 비회원 제외)의 수단 이름을 DOM 순서대로 돌려줍니다.
function renderedSocialMethods(container: Element): string[] {
  return Array.from(container.querySelectorAll('[data-testid^="login-screen-method-"]'))
    .map((el) => (el.getAttribute("data-testid") ?? "").replace("login-screen-method-", ""))
    .filter((method) => method !== "phone" && method !== "guest");
}

describe("LoginScreen 비회원으로 계속", () => {
  it("[LG-G1] visible이면 비회원 버튼이 소셜 묶음 뒤에 서고 라벨이 copy.login.guest이며, 누르면 onContinueAsGuest만 1회 불린다", () => {
    const onContinueAsGuest = vi.fn();
    const onSelectSocialMethod = vi.fn((): Promise<SocialSignInOutcome> => new Promise(() => {}));
    renderLogin({ guestSignIn: "visible", onContinueAsGuest, onSelectSocialMethod });

    const guest = screen.getByTestId("login-screen-method-guest");
    const lastSocial = screen.getByTestId("login-screen-method-google");
    expect(
      lastSocial.compareDocumentPosition(guest) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(methodButton("guest")).toHaveAttribute("accessibility-label", uiCopyEn.login.guest);
    expect(methodButton("guest")).toHaveAttribute("accessibility-traits", "button");

    fireEvent.tap(methodButton("guest"), {});

    expect(onContinueAsGuest).toHaveBeenCalledTimes(1);
    expect(onSelectSocialMethod).not.toHaveBeenCalled();
  });

  it("[LG-G2] hidden이면 비회원 버튼이 없고 소셜 셋은 그대로다", () => {
    const { container } = renderLogin({ guestSignIn: "hidden" });

    expect(screen.queryByTestId("login-screen-method-guest")).not.toBeInTheDocument();
    expect(renderedSocialMethods(container)).toEqual(["apple", "google", "facebook"]);
  });

  it("[LG-G3] 사용 불가 목록이 무엇이든 소셜 셋이 모두 선다(android 목록 · 빈 목록)", () => {
    const android = renderLogin({
      unavailableMethods: unavailableSocialLoginMethodsFor("android", null),
    });
    expect(renderedSocialMethods(android.container)).toEqual(["apple", "google", "facebook"]);
    android.unmount();

    const unknown = renderLogin({ unavailableMethods: [] });
    expect(renderedSocialMethods(unknown.container)).toEqual(["apple", "google", "facebook"]);
  });

  it("[LG-G4] google 요청이 안 끝난 동안 비회원 버튼을 눌러도 onContinueAsGuest가 불리지 않는다", () => {
    const onContinueAsGuest = vi.fn();
    renderLogin({ onContinueAsGuest });

    fireEvent.tap(methodButton("google"), {});
    fireEvent.tap(methodButton("guest"), {});

    expect(onContinueAsGuest).not.toHaveBeenCalled();
  });
});
