import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { LoginSocialMethods } from "./LoginSocialMethods";
import type { LoginSocialMethodsProps, SocialLoginMethod } from "./login.contract";

// `ui` 계층: 소셜 묶음은 받은 `methods`를 입력 순서 그대로 그립니다(spec §3-1, test-plan LSM1).

function renderMethods(methods: readonly SocialLoginMethod[], onSelect = vi.fn()) {
  const props: LoginSocialMethodsProps = { methods, status: { kind: "idle" }, onSelect };
  return { onSelect, ...render(<LoginSocialMethods {...props} />) };
}

function renderedMethods(container: Element): (string | null)[] {
  return Array.from(container.querySelectorAll('[data-testid^="login-screen-method-"]')).map((el) =>
    el.getAttribute("data-testid"),
  );
}

describe("LoginSocialMethods", () => {
  it("[LSM1] methods가 빈 배열이면 묶음만 서고 버튼이 없다", () => {
    const { container } = renderMethods([]);

    expect(container.querySelector(".login-screen-methods")).not.toBeNull();
    expect(renderedMethods(container)).toEqual([]);
    expect(container.querySelectorAll('[data-testid="ui-lynx-button"]')).toHaveLength(0);
  });

  it("[LSM1] methods가 [google]이면 버튼 하나이고 누르면 그 수단으로 onSelect가 1회 불린다", () => {
    const { container, onSelect } = renderMethods(["google"]);

    expect(renderedMethods(container)).toEqual(["login-screen-method-google"]);
    fireEvent.tap(
      within(screen.getByTestId("login-screen-method-google")).getByTestId("ui-lynx-button"),
      {},
    );
    expect(onSelect).toHaveBeenCalledWith("google");
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("[LSM1] 순서는 입력 순서를 따른다", () => {
    const { container } = renderMethods(["google", "apple"]);

    expect(renderedMethods(container)).toEqual([
      "login-screen-method-google",
      "login-screen-method-apple",
    ]);
  });
});
