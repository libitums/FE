// 완료 화면 사전 등록 통합 — 실제 TrialPage 마크업 + initTrial(폼 결선) + 가짜 사전 등록 접점.
// 형식 → 보내기 → 상태 · 초점 · 낭독 · 이벤트가 함께 맞는지 봅니다. 실제 주소 · 실제 이메일은 쓰지 않습니다.

import { afterEach, describe, expect, it } from "vitest";

import { textOf } from "../components/trial/trial-ui.support";
import { trialEn } from "../i18n/trial-copy";
import {
  type Harness,
  finishEpilogue,
  flush,
  heard,
  mountTrial,
  playToRoleplay,
  shown,
  speakTurn,
  stepOf,
  tap,
  unmount,
} from "./trial-flow.test-support";
import { SPEECH_CORRECT } from "./trial.test-support";

let h: Harness | undefined;
afterEach(() => {
  unmount(h);
  h = undefined;
});

async function toComplete(harness: Harness): Promise<void> {
  await playToRoleplay(harness);
  for (const index of [0, 1, 2]) {
    await speakTurn(harness, heard(SPEECH_CORRECT[index] ?? ""));
    await tap(harness, "trial-turn-next");
  }
  await finishEpilogue(harness);
  expect(stepOf(harness)).toBe("complete");
}

const eventOf = (harness: Harness, type: string) =>
  new (harness.window as Window & typeof globalThis).Event(type, {
    bubbles: true,
    cancelable: true,
  });
const formOf = (harness: Harness) => shown(harness, "trial-prereg") as HTMLFormElement;
const inputOf = (harness: Harness) => shown(harness, "trial-prereg-email") as HTMLInputElement;
const stateOf = (harness: Harness) => formOf(harness).getAttribute("data-state");
const preregEvents = (harness: Harness) =>
  harness.sent.filter((event) => event.name === "trial_preregister");

/** 입력에 값을 넣고 제출 버튼을 누른다(시계는 돌리지 않음). */
async function submit(harness: Harness, value: string): Promise<void> {
  const input = inputOf(harness);
  input.value = value;
  input.dispatchEvent(eventOf(harness, "input"));
  shown(harness, "trial-prereg-submit").click();
  await flush();
}

describe("TI-P1 형식 확인", () => {
  it("형식이 틀리면 요청 0 · 오류 보임 · aria-invalid · 초점 입력 · 이벤트 0", async () => {
    h = await mountTrial();
    await toComplete(h);
    expect(stateOf(h)).toBe("idle");
    await submit(h, "mina@example");
    expect(h.prereg.submits).toEqual([]);
    expect(stateOf(h)).toBe("invalid");
    shown(h, "trial-prereg-error");
    expect(inputOf(h).getAttribute("aria-invalid")).toBe("true");
    expect(h.doc.activeElement).toBe(inputOf(h));
    expect(preregEvents(h)).toEqual([]);
    await submit(h, "   ");
    expect(h.prereg.submits).toEqual([]);
  });
});

describe("TI-P2 · TI-P3 성공 · 중복은 완료", () => {
  it.each([
    ["submitted", "submitted"],
    ["duplicate", "duplicate"],
  ] as const)(
    "%s → done · 상태 글 preregDone · 초점 상태 글 · 이벤트 status=%s, 보낸 값은 소문자 · locale en",
    async (outcome, status) => {
      h = await mountTrial();
      await toComplete(h);
      await submit(h, "  Mina.Kim@Example.COM ");
      expect(stateOf(h)).toBe("sending");
      const button = shown(h, "trial-prereg-submit");
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(textOf(button)).toBe(trialEn.preregSending);
      expect(h.prereg.submits).toEqual([{ email: "mina.kim@example.com", locale: "en" }]);
      h.prereg.resolvePending(outcome);
      await flush();
      expect(stateOf(h)).toBe("done");
      const message = shown(h, "trial-prereg-status");
      expect(textOf(message)).toBe(trialEn.preregDone);
      expect(h.doc.activeElement).toBe(message);
      expect(inputOf(h).getAttribute("aria-invalid")).not.toBe("true");
      expect(preregEvents(h)).toEqual([{ name: "trial_preregister", params: { status } }]);
    },
  );
});

describe("TI-P4 실패 → 다시 시도", () => {
  it("failed → 상태 글 preregFailed · 버튼 「Try again」 · 다시 보내 submitted → done", async () => {
    h = await mountTrial();
    await toComplete(h);
    h.prereg.queue("failed");
    await submit(h, "mina@example.com");
    expect(stateOf(h)).toBe("failed");
    expect(textOf(shown(h, "trial-prereg-status"))).toBe(trialEn.preregFailed);
    expect(textOf(shown(h, "trial-prereg-submit"))).toBe(trialEn.preregRetry);
    expect(shown(h, "trial-prereg-submit").getAttribute("aria-disabled")).not.toBe("true");
    h.prereg.queue("submitted");
    shown(h, "trial-prereg-submit").click();
    await flush();
    expect(stateOf(h)).toBe("done");
    expect(h.prereg.submits).toHaveLength(2);
    expect(preregEvents(h).map((event) => event.params)).toEqual([
      { status: "failed" },
      { status: "submitted" },
    ]);
  });
});

describe("TI-P5 보내는 중 연타 · Enter 제출", () => {
  it("보내는 중 두 번 더 눌러도 요청 하나 · 폼 submit(Enter)도 같은 길", async () => {
    h = await mountTrial();
    await toComplete(h);
    await submit(h, "mina@example.com");
    shown(h, "trial-prereg-submit").click();
    formOf(h).dispatchEvent(eventOf(h, "submit"));
    await flush();
    expect(h.prereg.submits).toHaveLength(1);
    h.prereg.resolvePending("submitted");
    await flush();
    expect(stateOf(h)).toBe("done");
    expect(h.errors).toEqual([]);
  });

  it("제출은 페이지를 떠나지 않는다(기본 동작 막음)", async () => {
    h = await mountTrial();
    await toComplete(h);
    h.prereg.queue("submitted");
    const event = eventOf(h, "submit");
    inputOf(h).value = "mina@example.com";
    formOf(h).dispatchEvent(event);
    await flush();
    expect(event.defaultPrevented).toBe(true);
    expect(stateOf(h)).toBe("done");
  });
});

describe("TI-P6 이벤트에 PII 없음 · 설정 없음", () => {
  it("trial_preregister 속성은 status 하나 — @ · 입력 글 없음", async () => {
    h = await mountTrial();
    await toComplete(h);
    h.prereg.queue("submitted");
    await submit(h, "secret.person@example.com");
    const text = JSON.stringify(h.sent);
    expect(text).not.toContain("@");
    expect(text).not.toContain("secret");
    expect(textOf(shown(h, "trial-live"))).not.toContain("secret");
  });

  it("접점이 없으면(null) 제출해도 요청 0 · failed로 안내(오류 0)", async () => {
    h = await mountTrial({ prereg: false });
    await toComplete(h);
    await submit(h, "mina@example.com");
    expect(h.prereg.submits).toEqual([]);
    expect(stateOf(h)).toBe("failed");
    expect(h.errors).toEqual([]);
  });

  it("ko 페이지(설정 없는 빌드)는 unavailable — 입력이 없고 상태 글만", async () => {
    h = await mountTrial({ language: "ko" });
    await toComplete(h);
    expect(stateOf(h)).toBe("unavailable");
    expect(h.root.querySelector('[data-testid="trial-prereg-email"]')).toBeNull();
    expect(h.prereg.submits).toEqual([]);
  });
});
