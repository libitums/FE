import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { chatTurnsTestIds as ids } from "./chat-turns.contract";
import { CoinSendButton, LastFreeStrip, TurnLine } from "./ChatTurns";
import type { TurnPlan } from "./free-turns";

// `ui` 계층(MC2-UI5 · CP-UI13): 턴 표시 조각 — 머리 줄 글 · tone · 마지막 무료 띠 · 엽전 보내기 단추. 요금은 서버 규칙(ADR-0155)이라
// 하루 · 남은 시간 글이 없다. `turn-line`의 data-plan은 plan.kind(trial · last-free · coin)이고, tone은 클래스로 갈린다 —
// 회색(체험) / 주황(마지막 무료 · 다 씀 — 같은 tone) / 황동(엽전)이 서로 다른 클래스다.

afterEach(cleanup);

const line = (): HTMLElement => screen.getByTestId(ids.line);

function mountLine(plan: TurnPlan, used = false) {
  render(<TurnLine plan={plan} used={used} />);
}

test("CP-UI13. 체험: 「N of 20 free messages left」 · data-plan trial", () => {
  mountLine({ kind: "trial", remaining: 12, total: 20 });

  expect(line().textContent?.trim()).toBe("12 of 20 free messages left");
  expect(line().getAttribute("data-plan")).toBe("trial");
});

test("CP-UI13. 체험 수를 모르면 「Free trial messages」", () => {
  mountLine({ kind: "trial", remaining: null, total: 20 });

  expect(line().textContent?.trim()).toBe("Free trial messages");
});

test("CP-UI13. 마지막 무료: 「Last free message」", () => {
  mountLine({ kind: "last-free", total: 20, price: 10 });

  expect(line().textContent?.trim()).toBe("Last free message");
  expect(line().getAttribute("data-plan")).toBe("last-free");
});

test("CP-UI13. 엽전 · 판이 열린 동안(used): 「Free messages used」", () => {
  mountLine({ kind: "coin", price: 10 }, true);

  expect(line().textContent?.trim()).toBe("Free messages used");
  expect(line().getAttribute("data-plan")).toBe("coin");
});

test("CP-UI13. 엽전: 가격만 보인다 — 다시 무료까지의 시간이 없다", () => {
  mountLine({ kind: "coin", price: 10 });

  expect(line().textContent?.trim()).toBe("10 coins per message");
  expect(line().textContent).not.toContain("free again");
});

test("CP-UI13. tone 클래스: 체험 · 마지막 무료 · 엽전이 서로 다르고, 마지막 무료와 다 씀은 같은 주황 tone이다", () => {
  mountLine({ kind: "trial", remaining: 3, total: 20 });
  const trial = line().className;
  cleanup();
  mountLine({ kind: "last-free", total: 20, price: 10 });
  const last = line().className;
  cleanup();
  mountLine({ kind: "coin", price: 10 }, true);
  const used = line().className;
  cleanup();
  mountLine({ kind: "coin", price: 10 });
  const coin = line().className;

  expect(new Set([trial, last, coin]).size).toBe(3);
  expect(used).toBe(last);
});

test("MC2-UI5. unlimited면 아무것도 그리지 않는다", () => {
  mountLine({ kind: "unlimited" });

  expect(screen.queryByTestId(ids.line)).toBeNull();
});

test("MC2-UI5. 머리 줄은 접근성 요소이고 낭독은 보이는 글과 같다", () => {
  mountLine({ kind: "trial", remaining: 1, total: 20 });

  const el = line();
  const labelled = el.hasAttribute("accessibility-label")
    ? el
    : (el.querySelector("[accessibility-label]") ?? el);
  expect(labelled.getAttribute("accessibility-label")).toBe("1 of 20 free messages left");
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
  mountLine({ kind: "trial", remaining: 2, total: 20 });
  expect(line().getAttribute("text-maxline")).toBe("1");
});
