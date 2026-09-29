import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { authFailureMessage } from "../../lib/auth-failure";
import type { PhoneOtpRequestResult } from "../../lib/auth-session.contract";
import { entryLoginMethods } from "../../lib/entry-flow";
import { loginMethodLabel } from "./login";
import { loginCountries } from "./login-countries";
import { LoginScreen } from "./LoginScreen";
import type { LoginScreenProps } from "./login.contract";

// `ui` 계층: 실제 컴포넌트를 렌더하고 수단 넷의 조작 단위·전화번호 입력·요청 상태를 봅니다
// (ADR-0006 D4). 라벨 값은 `loginMethodLabel`의 결과로 비교합니다 — 수단 라벨은 임시가
// 아닙니다 — 로직을 다시 적지 않습니다.
//
// 계약 개정(spec.md §2.2): `onSelectMethod(method, phoneNumber?)` 하나가
// `onSelectSocialMethod` · `onSubmitPhoneNumber(Promise)` 둘로 갈립니다. 네트워크는
// 부르지 않습니다 — 콜백은 `vi.fn()`이 돌려주는 Promise로 섭니다. 끝나지 않는 요청은
// `new Promise(() => {})`, 끝나는 요청은 풀 수 있는 Promise(deferred)로 짓습니다
// (test-plan §3 머리).
//
// 입력 이벤트는 CompactNumericInput.ui.test.tsx 선례와 같은 형태로 쏩니다 — lynx의
// `<input>`은 jsdom의 알려진 엘리먼트라 `fireEvent`에 직접 넘길 수 없고
// `lynx.createSelectorQuery().select(...)`로 얻은 NodesRef를 거쳐야 합니다.

function dispatchTextFieldInput(anchor: HTMLElement, value: string) {
  const EventConstructor = anchor.ownerDocument.defaultView?.CustomEvent;
  if (!EventConstructor) throw new Error("CustomEvent is unavailable");
  const ref = lynx.createSelectorQuery().select('[data-testid="ui-lynx-text-field-input"]');
  fireEvent(
    ref as unknown as Element,
    new EventConstructor("bindEvent:input", { detail: { value } }),
  );
}

function typePhoneNumber(value: string) {
  const field = screen.getByTestId("login-screen-phone-field");
  const input = within(field).getByTestId("ui-lynx-text-field-input");
  dispatchTextFieldInput(input, value);
}

// 수단 행 안의 ui-lynx Button(2026-09-21 디자인 반영). `login-screen-method-phone`도
// 같은 모양이라 Continue도 이 helper로 잡습니다.
function methodButton(method: string): HTMLElement {
  return within(screen.getByTestId(`login-screen-method-${method}`)).getByTestId("ui-lynx-button");
}

function loginMethodPhone(): HTMLElement {
  return screen.getByTestId("login-screen-method-phone");
}

// 조작 단위(accessibility-element="true" + traits="button")를 화면 쪽 testid로
// 부릅니다. ui-lynx 컴포넌트 안의 단위는 그것을 감싼 `login-screen-*` 자리의
// 이름으로 읽습니다.
function actionUnitIds(container: Element): (string | null)[] {
  return [
    ...container.querySelectorAll('[accessibility-element="true"][accessibility-traits="button"]'),
  ].map((el) => el.closest('[data-testid^="login-screen-"]')?.getAttribute("data-testid") ?? null);
}

// 소셜 셋만 남긴 목록입니다 — 화면이 쓰는 `SocialLoginMethod`와 같은 걸러내기를
// 테스트 쪽에서 다시 짓지 않고 phone 하나만 뺍니다.
const socialMethods = entryLoginMethods.filter((method) => method !== "phone");

// ------------------------------------------------------------ 렌더 헬퍼
//
// props 셋 다 필수(`onBack`만 옵셔널)라 기본값을 여기서 쥡니다. 개별 케이스는
// 필요한 콜백만 갈아 끼웁니다.

function renderLogin(
  overrides: {
    onSelectSocialMethod?: LoginScreenProps["onSelectSocialMethod"];
    onSubmitPhoneNumber?: LoginScreenProps["onSubmitPhoneNumber"];
    onBack?: LoginScreenProps["onBack"];
  } = {},
) {
  return render(
    <LoginScreen
      onSelectSocialMethod={overrides.onSelectSocialMethod ?? vi.fn()}
      onSubmitPhoneNumber={
        overrides.onSubmitPhoneNumber ?? (() => Promise.resolve({ status: "sent" as const }))
      }
      onBack={overrides.onBack}
    />,
  );
}

// ------------------------------------------------------------ Promise 짓기
//
// 끝나는 요청은 이 helper로 풀 수 있는 Promise를 만듭니다. 끝나지 않는 요청은
// `new Promise(() => {})`를 직접 씁니다(test-plan §3 머리).

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

// act 콜백 안에서 이미 걸린 microtask 두 틱을 흘려보냅니다 — `resolve(...)`로 풀린
// Promise가 화면의 `await onSubmitPhoneNumber(...)` 이어달리기를 마치고 상태가
// 반영될 시간을 줍니다.
async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

// ------------------------------------------------------------ announce 대역
//
// 형태의 정본은 `AssessmentScreen.ui.test.tsx:36-62`입니다. 없던 전역
// (`NativeModules`)을 세우므로 테스트마다 원복합니다.

type HostCall = { args: readonly unknown[] };

function stubAnnounceHost(): HostCall[] {
  const calls: HostCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (...args: readonly unknown[]) => void calls.push({ args }),
    },
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginScreen", () => {
  it("[LG-U1] 수단 넷이 어휘 순서로 서고 각각 조작 단위다", () => {
    const { container } = renderLogin();

    for (const method of entryLoginMethods) {
      const button = methodButton(method);
      expect(button).toHaveAttribute("accessibility-element", "true");
      expect(button).toHaveAttribute("accessibility-traits", "button");
      expect(button).toHaveAttribute("accessibility-label", loginMethodLabel(method));
    }

    const rendered = Array.from(
      container.querySelectorAll('[data-testid^="login-screen-method-"]'),
    ).map((el) => el.getAttribute("data-testid"));
    expect(rendered).toEqual(entryLoginMethods.map((method) => `login-screen-method-${method}`));
  });

  it.each(socialMethods)(
    "[LG-U2] %s를 누르면 onSelectSocialMethod가 그 수단으로 1회, onSubmitPhoneNumber는 0회다",
    (method) => {
      const onSelectSocialMethod = vi.fn();
      const onSubmitPhoneNumber = vi.fn(() => Promise.resolve({ status: "sent" as const }));
      renderLogin({ onSelectSocialMethod, onSubmitPhoneNumber });

      fireEvent.tap(methodButton(method), {});

      expect(onSelectSocialMethod).toHaveBeenCalledTimes(1);
      expect(onSelectSocialMethod).toHaveBeenCalledWith(method);
      expect(onSubmitPhoneNumber).not.toHaveBeenCalled();
    },
  );

  it("[LG-U3] 전화번호 입력 칸이 서고, 입력만 해서는 어느 콜백도 불리지 않는다", () => {
    const onSelectSocialMethod = vi.fn();
    const onSubmitPhoneNumber = vi.fn(() => Promise.resolve({ status: "sent" as const }));
    renderLogin({ onSelectSocialMethod, onSubmitPhoneNumber });

    typePhoneNumber("01012345678");

    expect(onSelectSocialMethod).not.toHaveBeenCalled();
    expect(onSubmitPhoneNumber).not.toHaveBeenCalled();

    const scroll = screen.getByTestId("login-screen-scroll");
    const accessibilityAttrs = Array.from(scroll.attributes).filter((attr) =>
      attr.name.startsWith("accessibility-"),
    );
    expect(accessibilityAttrs).toHaveLength(0);
  });

  it("[LG-P0] 번호가 비면 data-complete가 false이고 Continue를 눌러도 onSubmitPhoneNumber가 0회다", () => {
    const onSubmitPhoneNumber = vi.fn(() => Promise.resolve({ status: "sent" as const }));
    renderLogin({ onSubmitPhoneNumber });

    expect(loginMethodPhone()).toHaveAttribute("data-complete", "false");

    fireEvent.tap(methodButton("phone"), {});

    expect(onSubmitPhoneNumber).not.toHaveBeenCalled();
  });

  it("[LG-P1] 번호를 입력하면 data-complete가 true이고 Continue를 누르면 onSubmitPhoneNumber가 변환된 번호로 1회 불린다", () => {
    const onSubmitPhoneNumber = vi.fn(() => Promise.resolve({ status: "sent" as const }));
    renderLogin({ onSubmitPhoneNumber });

    typePhoneNumber("10 1234 5678");

    expect(loginMethodPhone()).toHaveAttribute("data-complete", "true");

    fireEvent.tap(methodButton("phone"), {});

    expect(onSubmitPhoneNumber).toHaveBeenCalledTimes(1);
    expect(onSubmitPhoneNumber).toHaveBeenCalledWith({
      e164: "+821012345678",
      display: "+82 10 1234 5678",
    });
  });

  it("[LG-P2] 요청이 안 끝난 동안 data-status가 requesting이고 Continue·소셜·뒤로가기가 무동작이다", () => {
    const onSubmitPhoneNumber = vi.fn(() => new Promise<PhoneOtpRequestResult>(() => {}));
    const onSelectSocialMethod = vi.fn();
    const onBack = vi.fn();
    renderLogin({ onSubmitPhoneNumber, onSelectSocialMethod, onBack });

    typePhoneNumber("10 1234 5678");
    fireEvent.tap(methodButton("phone"), {});

    expect(loginMethodPhone()).toHaveAttribute("data-status", "requesting");

    fireEvent.tap(methodButton("phone"), {});
    expect(onSubmitPhoneNumber).toHaveBeenCalledTimes(1);

    fireEvent.tap(methodButton("apple"), {});
    expect(onSelectSocialMethod).not.toHaveBeenCalled();

    const back = within(screen.getByTestId("login-screen-header")).getByTestId(
      "ui-lynx-round-button",
    );
    fireEvent.tap(back, {});
    expect(onBack).not.toHaveBeenCalled();
  });

  it("[LG-P3] 요청이 network로 실패하면 data-status가 failed이고 오류 문구가 서며 announce가 1회 불린다", async () => {
    const calls = stubAnnounceHost();
    const { promise, resolve } = deferred<PhoneOtpRequestResult>();
    const onSubmitPhoneNumber = vi.fn(() => promise);
    renderLogin({ onSubmitPhoneNumber });

    typePhoneNumber("10 1234 5678");
    fireEvent.tap(methodButton("phone"), {});

    resolve({ status: "failed", reason: "network" });
    await flushMicrotasks();

    expect(loginMethodPhone()).toHaveAttribute("data-status", "failed");
    expect(screen.getByTestId("login-screen-error")).toHaveTextContent(
      authFailureMessage("network"),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args[0]).toEqual({ content: authFailureMessage("network") });
  });

  it("[LG-P4] 실패 뒤 번호를 고치면 오류가 사라지고 data-status가 idle로 돌아간다", async () => {
    const { promise, resolve } = deferred<PhoneOtpRequestResult>();
    const onSubmitPhoneNumber = vi.fn(() => promise);
    renderLogin({ onSubmitPhoneNumber });

    typePhoneNumber("10 1234 5678");
    fireEvent.tap(methodButton("phone"), {});
    resolve({ status: "failed", reason: "network" });
    await flushMicrotasks();

    expect(loginMethodPhone()).toHaveAttribute("data-status", "failed");
    expect(screen.getByTestId("login-screen-error")).toBeInTheDocument();

    typePhoneNumber("10 1234 5679");

    expect(screen.queryByTestId("login-screen-error")).not.toBeInTheDocument();
    expect(loginMethodPhone()).toHaveAttribute("data-status", "idle");
  });

  it("[LG-P5] 처음 렌더에는 login-screen-error가 없다", () => {
    renderLogin();

    expect(screen.queryByTestId("login-screen-error")).not.toBeInTheDocument();
  });

  it("[LG-P6] 요청이 sent로 끝나면 data-status가 idle이고 오류가 없다", async () => {
    const { promise, resolve } = deferred<PhoneOtpRequestResult>();
    const onSubmitPhoneNumber = vi.fn(() => promise);
    renderLogin({ onSubmitPhoneNumber });

    typePhoneNumber("10 1234 5678");
    fireEvent.tap(methodButton("phone"), {});
    resolve({ status: "sent" });
    await flushMicrotasks();

    expect(loginMethodPhone()).toHaveAttribute("data-status", "idle");
    expect(screen.queryByTestId("login-screen-error")).not.toBeInTheDocument();
  });

  it("[LG-U4] 제목이 accessibility-traits='header'다", () => {
    renderLogin();

    expect(screen.getByTestId("login-screen-title")).toHaveAttribute(
      "accessibility-traits",
      "header",
    );
  });

  // LG-U5 — 전화번호 TextField의 <input>은 접근성 요소이지만 traits="button"이
  // 아니라 이 목록에서 빠집니다.
  it("[LG-U5] 조작 단위 목록이 국가 칩과 수단 넷과 정확히 같다", () => {
    const { container } = renderLogin();

    expect(actionUnitIds(container)).toEqual([
      "login-screen-country",
      ...entryLoginMethods.map((method) => `login-screen-method-${method}`),
    ]);

    const phoneInput = screen.getByTestId("ui-lynx-text-field-input");
    expect(phoneInput).toHaveAttribute("accessibility-element", "true");
  });

  // LG-U6 — 2026-09-21 디자인 반영: 좌상단 뒤로가기입니다.
  it("[LG-U6] onBack이 있으면 뒤로가기가 맨 앞 조작 단위로 서고 누르면 1회 불린다", () => {
    const onBack = vi.fn();
    const { container } = renderLogin({ onBack });

    const back = within(screen.getByTestId("login-screen-header")).getByTestId(
      "ui-lynx-round-button",
    );
    expect(back).toHaveAttribute("accessibility-label", "Back");
    expect(actionUnitIds(container)[0]).toBe("login-screen-header");

    fireEvent.tap(back, {});
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // LG-U7 — 2026-09-21 디자인 반영: 국가 선택 바텀시트입니다(국가 번호가 있는 모든
  // 지역입니다).
  it("[LG-U7] 국가 칩을 누르면 전체 국가 목록 시트가 열려 뒤쪽이 가려지고, 고르면 코드가 바뀌며 닫힌다", () => {
    renderLogin();

    const chip = screen.getByTestId("login-screen-country");
    expect(chip).toHaveAttribute("accessibility-label", "Country code, South Korea +82");
    expect(screen.queryByTestId("ui-lynx-bottom-sheet")).toBeNull();

    fireEvent.tap(chip, {});
    const list = screen.getByTestId("login-screen-country-list");
    const body = chip.closest(".login-screen-body");
    expect(body).toHaveAttribute("accessibility-elements-hidden", "true");

    // 모든 지역이 ui-lynx OptionSelector 선택지 하나씩으로 섭니다(국기·이름·국가
    // 번호 한 라벨입니다).
    const selector = within(list).getByTestId("ui-lynx-option-selector");
    expect(selector).toHaveAttribute("data-selection", "single");
    expect(selector).toHaveAttribute("data-commit", "immediate");
    const options = list.querySelectorAll('[data-testid^="ui-lynx-option-selector-item-"]');
    expect(options.length).toBe(loginCountries.length);
    const korea = screen.getByTestId("ui-lynx-option-selector-item-kr");
    expect(korea).toHaveAttribute("data-selected", "true");
    expect(korea).toHaveAttribute("accessibility-label", "South Korea +82, 선택됨");

    fireEvent.tap(screen.getByTestId("ui-lynx-option-selector-item-jp"), {});

    expect(screen.queryByTestId("ui-lynx-bottom-sheet")).toBeNull();
    expect(screen.getByTestId("login-screen-country")).toHaveAttribute(
      "accessibility-label",
      "Country code, Japan +81",
    );
    expect(body).toHaveAttribute("accessibility-elements-hidden", "false");
  });

  // LG-U8 — 국가 목록이 국가 번호가 있는 지역을 빠짐없이 담습니다.
  it("[LG-U8] 국가 목록에 id가 겹치지 않고 모든 항목에 국기·이름·+국가 번호가 있다", () => {
    expect(loginCountries.length).toBe(245);
    expect(new Set(loginCountries.map((option) => option.id)).size).toBe(loginCountries.length);
    for (const option of loginCountries) {
      expect(option.name.trim()).not.toBe("");
      expect(option.flag).not.toBe("");
      expect(option.dialCode).toMatch(/^\+\d{1,4}$/);
    }
    for (const id of ["kr", "us", "jp", "vn", "xk"]) {
      expect(loginCountries.some((option) => option.id === id)).toBe(true);
    }
  });
});
