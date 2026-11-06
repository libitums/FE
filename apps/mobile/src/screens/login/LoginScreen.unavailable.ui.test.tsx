import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { SocialSignInOutcome } from "../../lib/social-sign-in.contract";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { loginMethodLabel, socialProviderName, unavailableSocialLoginMethodsFor } from "./login";
import { LoginScreen } from "./LoginScreen";
import type { LoginScreenProps } from "./login.contract";

// `ui` 계층: 사용 불가 수단 안내 대화상자(spec §9-2, test-plan LG-D1~5). 문구는
// `uiCopyEn.login.unavailable` · `loginMethodLabel`을 참조하고 리터럴을 다시 적지 않습니다.
// 대화상자 액션 · 뒤로가기 조작은 settings 로그아웃 대화상자 테스트와 같은 방식입니다.

const DIALOG = "login-screen-unavailable-dialog";

afterEach(() => {
  cleanup();
});

function renderLogin(overrides: Partial<LoginScreenProps> = {}) {
  const onSelectSocialMethod = vi.fn((): Promise<SocialSignInOutcome> => new Promise(() => {}));
  render(
    <LoginScreen
      phoneSignIn="visible"
      unavailableMethods={unavailableSocialLoginMethodsFor("ios", null)}
      guestSignIn="visible"
      onContinueAsGuest={() => undefined}
      onSelectSocialMethod={onSelectSocialMethod}
      onSubmitPhoneNumber={() => Promise.resolve({ status: "sent" as const })}
      onOpenLegalDocument={() => undefined}
      {...overrides}
    />,
  );
  return { onSelectSocialMethod: overrides.onSelectSocialMethod ?? onSelectSocialMethod };
}

function methodButton(method: string): HTMLElement {
  return within(screen.getByTestId(`login-screen-method-${method}`)).getByTestId("ui-lynx-button");
}

function dialogAction(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
}

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

describe("LoginScreen 사용 불가 수단 안내", () => {
  it("[LG-D7] 사용 불가 목록이 비면(정책이 열어 준 뒤) facebook 탭이 대화상자 없이 onSelectSocialMethod로 간다", () => {
    const { onSelectSocialMethod } = renderLogin({ unavailableMethods: [] });

    fireEvent.tap(methodButton("facebook"), {});

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onSelectSocialMethod).toHaveBeenCalledTimes(1);
    expect(onSelectSocialMethod).toHaveBeenCalledWith("facebook");
  });

  it("[LG-D6] guestSignIn이 hidden이면(설정 › Sign in) 설명이 「계정 없이」를 말하지 않는다", () => {
    renderLogin({ guestSignIn: "hidden" });

    fireEvent.tap(methodButton("facebook"), {});

    const wrapper = screen.getByTestId(DIALOG);
    expect(within(wrapper).getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
      uiCopyEn.login.unavailable.descriptionWithoutGuest,
    );
    expect(within(wrapper).getByTestId("ui-lynx-dialog-description")).not.toHaveTextContent(
      uiCopyEn.login.unavailable.description,
    );
  });

  it("[LG-D1] facebook을 누르면 대화상자가 서고 onSelectSocialMethod는 불리지 않으며 제목에 Facebook 라벨이 든다", () => {
    const { onSelectSocialMethod } = renderLogin();
    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();

    fireEvent.tap(methodButton("facebook"), {});

    const wrapper = screen.getByTestId(DIALOG);
    // 제목은 제공자 이름(Facebook)으로 — 버튼 라벨(「Connect with Facebook」)이 들어가면 비문이다(접근성 R1).
    expect(within(wrapper).getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
      uiCopyEn.login.unavailable.title(socialProviderName.facebook),
    );
    expect(within(wrapper).getByTestId("ui-lynx-dialog-title")).not.toHaveTextContent(
      loginMethodLabel("facebook", uiCopyEn.login),
    );
    expect(within(wrapper).getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
      uiCopyEn.login.unavailable.description,
    );
    expect(dialogAction("use-google")).toHaveAttribute("data-variant", "brand");
    expect(dialogAction("close")).toHaveAttribute("data-variant", "subtle");
    expect(onSelectSocialMethod).not.toHaveBeenCalled();
  });

  it("[LG-D2] use-google 액션은 대화상자를 닫고 onSelectSocialMethod('google')을 1회 부른다", () => {
    const { onSelectSocialMethod } = renderLogin();
    fireEvent.tap(methodButton("facebook"), {});

    fireEvent.tap(dialogAction("use-google"), {});

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onSelectSocialMethod).toHaveBeenCalledTimes(1);
    expect(onSelectSocialMethod).toHaveBeenCalledWith("google");
  });

  it("[LG-D3] close 액션은 대화상자를 닫고 호출은 0회다", () => {
    const { onSelectSocialMethod } = renderLogin();
    fireEvent.tap(methodButton("facebook"), {});

    fireEvent.tap(dialogAction("close"), {});

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onSelectSocialMethod).not.toHaveBeenCalled();
  });

  it("[LG-D3] 뒤로가기는 대화상자만 닫고 onBack · onSelectSocialMethod는 0회다", () => {
    const onBack = vi.fn<() => void>();
    const { onSelectSocialMethod } = renderLogin({ onBack });
    fireEvent.tap(methodButton("facebook"), {});
    expect(screen.getByTestId(DIALOG)).toBeInTheDocument();

    expect(pressBack()).toBe(true);

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    expect(onSelectSocialMethod).not.toHaveBeenCalled();
  });

  it("[LG-D4] android에서 apple을 누르면 대화상자가 서고 호출은 0회다(제목은 Apple 라벨)", () => {
    const { onSelectSocialMethod } = renderLogin({
      unavailableMethods: unavailableSocialLoginMethodsFor("android", null),
    });

    fireEvent.tap(methodButton("apple"), {});

    expect(
      within(screen.getByTestId(DIALOG)).getByTestId("ui-lynx-dialog-title"),
    ).toHaveTextContent(uiCopyEn.login.unavailable.title(socialProviderName.apple));
    expect(onSelectSocialMethod).not.toHaveBeenCalled();
  });

  it("[LG-D4] iOS에서 apple을 누르면 대화상자 없이 onSelectSocialMethod('apple') 1회다", () => {
    const { onSelectSocialMethod } = renderLogin({
      unavailableMethods: unavailableSocialLoginMethodsFor("ios", null),
    });

    fireEvent.tap(methodButton("apple"), {});

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onSelectSocialMethod).toHaveBeenCalledTimes(1);
    expect(onSelectSocialMethod).toHaveBeenCalledWith("apple");
  });

  it("[LG-D4] android에서 google은 대화상자 없이 그대로 요청된다", () => {
    const { onSelectSocialMethod } = renderLogin({
      unavailableMethods: unavailableSocialLoginMethodsFor("android", null),
    });

    fireEvent.tap(methodButton("google"), {});

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onSelectSocialMethod).toHaveBeenCalledWith("google");
  });

  it("[LG-D5] google 요청이 안 끝난 동안 facebook을 눌러도 대화상자가 서지 않는다", () => {
    const { onSelectSocialMethod } = renderLogin();
    fireEvent.tap(methodButton("google"), {});

    fireEvent.tap(methodButton("facebook"), {});

    expect(screen.queryByTestId(DIALOG)).not.toBeInTheDocument();
    expect(onSelectSocialMethod).toHaveBeenCalledTimes(1);
  });
});
