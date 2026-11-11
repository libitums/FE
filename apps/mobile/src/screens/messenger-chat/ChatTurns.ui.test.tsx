import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { chatTurnsTestIds as ids } from "./chat-turns.contract";
import { CoinSendButton, LastFreeStrip, TurnLine } from "./ChatTurns";
import type { ResetClock, TurnPlan } from "./free-turns";

// `ui` 계층(MC2-UI5): 턴 표시 조각 — 머리 줄 글 · tone · 마지막 무료 띠 · 엽전 보내기 단추.
// 가정(구현자가 따를 것): `turn-line`의 data-plan은 plan.kind(free · last-free · coin — due와 shown 둘 다 coin)이고,
// tone은 클래스로 갈린다 — 회색(T1) / 주황(T2 · T3 같은 tone) / 황동(T4)이 서로 다른 클래스다.

afterEach(cleanup);

const RESET: ResetClock = { hours: 5, minutes: 12 };
const line = (): HTMLElement => screen.getByTestId(ids.line);

function mountLine(plan: TurnPlan, reset: ResetClock = RESET) {
  render(<TurnLine plan={plan} reset={reset} />);
}

test("MC2-UI5. T1 free: 「N of 3 free messages left today」 · data-plan free", () => {
  mountLine({ kind: "free", remaining: 2, total: 3 });

  expect(line().textContent?.trim()).toBe("2 of 3 free messages left today");
  expect(line().getAttribute("data-plan")).toBe("free");
});

test("MC2-UI5. T2 last-free: 「Last free message today」", () => {
  mountLine({ kind: "last-free", total: 3, price: 10 });

  expect(line().textContent?.trim()).toBe("Last free message today");
  expect(line().getAttribute("data-plan")).toBe("last-free");
});

test("MC2-UI5. T3 coin · due: 「Free messages used」", () => {
  mountLine({ kind: "coin", price: 10, outPanel: "due" });

  expect(line().textContent?.trim()).toBe("Free messages used");
  expect(line().getAttribute("data-plan")).toBe("coin");
});

test("MC2-UI5. T4 coin · shown: 가격과 다시 무료까지 시간이 보인다", () => {
  mountLine({ kind: "coin", price: 10, outPanel: "shown" });

  expect(line().textContent?.trim()).toBe("Each message 10 coins · free again in 5h 12m");
  expect(line().getAttribute("data-plan")).toBe("coin");
});

test("MC2-UI5. 시계가 0h 0m이어도 시간 글이 깨지지 않는다", () => {
  mountLine({ kind: "coin", price: 10, outPanel: "shown" }, { hours: 0, minutes: 0 });

  expect(line().textContent).toContain("free again in 0h 0m");
});

test("MC2-UI5. tone 클래스: T1 · T2 · T4가 서로 다르고, T2와 T3는 같은 주황 tone이다", () => {
  mountLine({ kind: "free", remaining: 3, total: 3 });
  const t1 = line().className;
  cleanup();
  mountLine({ kind: "last-free", total: 3, price: 10 });
  const t2 = line().className;
  cleanup();
  mountLine({ kind: "coin", price: 10, outPanel: "due" });
  const t3 = line().className;
  cleanup();
  mountLine({ kind: "coin", price: 10, outPanel: "shown" });
  const t4 = line().className;

  expect(new Set([t1, t2, t4]).size).toBe(3);
  expect(t3).toBe(t2);
});

test("MC2-UI5. unlimited면 아무것도 그리지 않는다", () => {
  mountLine({ kind: "unlimited" });

  expect(screen.queryByTestId(ids.line)).toBeNull();
});

test("MC2-UI5. 머리 줄은 접근성 요소이고 낭독은 보이는 글과 같다", () => {
  mountLine({ kind: "free", remaining: 1, total: 3 });

  const el = line();
  const labelled = el.hasAttribute("accessibility-label")
    ? el
    : (el.querySelector("[accessibility-label]") ?? el);
  expect(labelled.getAttribute("accessibility-label")).toBe("1 of 3 free messages left today");
});

// ------------------------------------------------------------------ 마지막 무료 띠

test("MC2-UI5. 띠: 「After this, 10 coins per message」 글 한 줄이고 낭독도 같다", () => {
  render(<LastFreeStrip price={10} />);

  const strip = screen.getByTestId(ids.strip);
  expect(strip.textContent?.trim()).toBe("After this, 10 coins per message");
  expect(strip.querySelector("[accessibility-label]")?.getAttribute("accessibility-label")).toBe(
    "After this, 10 coins per message",
  );
});

test("MC2-UI5. 띠에는 Go unlimited 단추가 없다 — 무제한 티켓은 학습 전용(2026-11-10 결정)", () => {
  render(<LastFreeStrip price={10} />);

  const strip = screen.getByTestId(ids.strip);
  expect(strip.textContent).not.toContain("Go unlimited");
  expect(strip.querySelector('[accessibility-traits="button"]')).toBeNull();
  expect(strip.querySelector("[bindtap]")).toBeNull();
  expect(document.querySelector('[data-testid="messenger-chat-turn-strip-unlimited"]')).toBeNull();
});

// ------------------------------------------------------------------ 엽전 보내기 단추

test("MC2-UI5. 엽전 보내기: 엽전 아이콘 + 10, 낭독 「Send for 10 coins」, data-enabled=true", () => {
  render(<CoinSendButton price={10} enabled={true} onTap={vi.fn<() => void>()} />);

  const button = screen.getByTestId(ids.coinSend);
  expect(button.getAttribute("data-enabled")).toBe("true");
  expect(button.querySelector("svg")).not.toBeNull();
  expect(button.textContent).toContain("10");
  const labelled = button.hasAttribute("accessibility-label")
    ? button
    : button.querySelector("[accessibility-label]");
  expect(labelled?.getAttribute("accessibility-label")).toBe("Send for 10 coins");
  expect(labelled?.getAttribute("accessibility-traits")).toBe("button");
});

test("MC2-UI5. 엽전 보내기: enabled면 탭이 onTap을 한 번 부른다", () => {
  const onTap = vi.fn<() => void>();
  render(<CoinSendButton price={10} enabled={true} onTap={onTap} />);

  fireEvent.tap(screen.getByTestId(ids.coinSend), {});

  expect(onTap).toHaveBeenCalledTimes(1);
});

test("MC2-UI5. 엽전 보내기: enabled=false면 data-enabled=false이고 탭이 아무것도 하지 않는다", () => {
  const onTap = vi.fn<() => void>();
  render(<CoinSendButton price={10} enabled={false} onTap={onTap} />);

  const button = screen.getByTestId(ids.coinSend);
  expect(button.getAttribute("data-enabled")).toBe("false");
  fireEvent.tap(button, {});

  expect(onTap).not.toHaveBeenCalled();
});

test("F3. 턴 줄은 한 줄로 자른다(text-maxline) — 큰 글자에서 머리가 두 줄로 부풀지 않게", () => {
  mountLine({ kind: "free", remaining: 2, total: 3 });
  expect(line().getAttribute("text-maxline")).toBe("1");
});
