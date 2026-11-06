import { afterEach, expect, test } from "vitest";
import { fireEvent, screen, waitFor, within } from "@lynx-js/react/testing-library";

import u00Tutorial from "../../content/test-fixtures/bundled-2026-10-23/episodes/u00-tutorial.json";
import u01Water from "../../content/test-fixtures/bundled-2026-10-23/episodes/u01-water.json";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import type { SettingsEvent } from "../screens/settings/settings.contract";
import { bootItemAudioApp, lessonPlanWith } from "./test-helpers/item-audio-harness";
import {
  resetApp,
  tapButtonIn,
  tapChoice,
  tapId,
  tapNode,
} from "./test-helpers/episode-format-harness";
import { solveActivity } from "./test-helpers/episode-format-solvers";

// `integration` 계층: 보기 로마자 설정이 App 전체에서 이어지는지 — 기본 켬 · 저장값 · 설정 토글(이벤트, 상태,
// 기기 저장) · 다른 문항 반영 · 재시작 · 로그아웃 뒤 유지 · 듣기 답 전 · 영어 보기. 대역은 경계뿐입니다.

afterEach(resetApp);

const u00 = "u00-tutorial";
const u01 = "u01-water";
const storageKey = "libitum.session-option.show-choice-romanization";
const itemId = "ui-lynx-settings-group-item-show-choice-romanization";
const upToS8 = { [u00]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"] };
const afterS1 = { [u00]: ["intro", "S1"] };
const u01UpToS7 = { [u01]: ["intro", "S1", "S2", "S3", "S4", "S5", "S6", "S7"] };

type RawOption = { ko: string; roman: string };
type RawStep = { id: string; items: { type: string; options?: RawOption[] }[] };
const stepOf = (episode: unknown, id: string): RawStep =>
  (episode as { steps: RawStep[] }).steps.find((step) => step.id === id)!;
const romanOf = (episode: unknown, step: string): Map<string, string> =>
  new Map(stepOf(episode, step).items[0]!.options!.map((option) => [option.ko, option.roman]));
const replyRomans = romanOf(u00Tutorial, "S9");
const listenRomans = romanOf(u00Tutorial, "S2");

const romanId = (index: number): string => `ui-lynx-option-selector-romanization-choice-${index}`;
const labelOf = (index: number): string =>
  screen.getByTestId(`ui-lynx-option-selector-label-choice-${index}`).textContent ?? "";
const nameOf = (index: number): string | null =>
  screen
    .getByTestId(`ui-lynx-option-selector-item-choice-${index}`)
    .getAttribute("accessibility-label");
const lines = (): HTMLElement[] =>
  screen.queryAllByTestId(/^ui-lynx-option-selector-romanization-/);
const cell = (id = itemId): HTMLElement =>
  within(screen.getByTestId(id)).getByTestId("ui-lynx-settings-cell");
const openTab = (tab: "journey" | "settings"): void =>
  void fireEvent.tap(screen.getByTestId(`ui-lynx-bottom-navigator-item-${tab}`), {});
const tapToggle = (): void => void fireEvent.tap(cell(), {});
const leaveLesson = (): void => {
  tapId("learning-shell-exit");
  tapButtonIn("ui-lynx-dialog-action-leave");
};

function expectLines(romans: Map<string, string>, count: number): void {
  expect(lines().length).toBe(count);
  for (let index = 0; index < count; index += 1) {
    const expected = romans.get(labelOf(index));
    expect(expected).toBeTruthy();
    expect(screen.getByTestId(romanId(index))).toHaveTextContent(expected!);
    expect(nameOf(index)).toBe(`${labelOf(index)}, Pronunciation: ${expected}`);
  }
}

function expectNoLines(count: number): void {
  expect(lines().length).toBe(0);
  for (let index = 0; index < count; index += 1) expect(nameOf(index)).toBe(labelOf(index));
}

async function startReply(seed?: Record<string, string>) {
  const events: SettingsEvent[] = [];
  const booted = await bootItemAudioApp({
    progress: upToS8,
    settingsEventSink: (event) => events.push(event),
    ...(seed === undefined ? {} : { seed }),
  });
  return { ...booted, settings: events };
}
const optionEvents = (events: readonly SettingsEvent[]) =>
  events.filter((event) => event.name === "session_option_changed");

test("IT-CR1. 저장 키가 없는 새 설치에서 REPLY_SELECT 문항 보기 셋에 로마자 줄이 서고 이름은 한글, 로마자다", async () => {
  await startReply();

  tapNode(u00, "S9");

  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  expectLines(replyRomans, 3);
});

test("IT-CR2. 저장값이 off인 설치에서는 같은 문항에 줄이 없고 이름은 한글뿐이다", async () => {
  await startReply({ [storageKey]: "off" });

  tapNode(u00, "S9");

  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  expectNoLines(3);
});

test("IT-CR3. 설정 셀을 탭하면 이벤트 1건(value false) · 저장 off · 셀 꺼짐, 다시 탭하면 on · true다", async () => {
  const booted = await startReply();
  openTab("settings");
  expect(cell()).toHaveAttribute("data-checked", "true");
  expect(optionEvents(booted.settings)).toHaveLength(0);

  tapToggle();

  expect(optionEvents(booted.settings)).toEqual([
    { name: "session_option_changed", option: "show-choice-romanization", value: false },
  ]);
  expect(booted.store.get(storageKey)).toBe("off");
  expect(cell()).toHaveAttribute("data-checked", "false");

  tapToggle();

  expect(optionEvents(booted.settings)).toEqual([
    { name: "session_option_changed", option: "show-choice-romanization", value: false },
    { name: "session_option_changed", option: "show-choice-romanization", value: true },
  ]);
  expect(booted.store.get(storageKey)).toBe("on");
  expect(cell()).toHaveAttribute("data-checked", "true");
});

test("IT-CR4. 설정에서 끄면 다음 문항에 줄이 없고, 다시 켜면 줄이 돌아온다", async () => {
  await startReply();
  openTab("settings");
  tapToggle();
  openTab("journey");
  tapNode(u00, "S9");
  expectNoLines(3);

  leaveLesson();
  openTab("settings");
  tapToggle();
  openTab("journey");
  tapNode(u00, "S9");

  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  expectLines(replyRomans, 3);
});

test("IT-CR5. 끈 뒤 앱을 다시 세우면 설정 셀은 꺼짐이고 문항에 줄이 없다", async () => {
  const booted = await startReply();
  openTab("settings");
  tapToggle();

  await booted.restart();

  openTab("settings");
  expect(cell()).toHaveAttribute("data-checked", "false");
  openTab("journey");
  tapNode(u00, "S9");
  expectNoLines(3);
});

test("IT-CR6. 끈 뒤 로그아웃해도 키는 off로 남고 다시 들어오면 설정은 꺼짐이다", async () => {
  const booted = await startReply();
  openTab("settings");
  tapToggle();

  fireEvent.tap(cell("ui-lynx-settings-group-item-sign-out"), {});
  tapButtonIn("ui-lynx-dialog-action-sign-out");
  await waitFor(() => expect(screen.getByTestId("login-screen-title")).toBeTruthy());

  expect(booted.store.get(storageKey)).toBe("off");
  booted.store.set(
    authSessionStorageKey,
    serializeAuthSession({ accessToken: "a", refreshToken: "r", expiresAt: 4_102_444_800_000 }),
  );
  await booted.restart();
  openTab("settings");
  expect(cell()).toHaveAttribute("data-checked", "false");
});

test("IT-CR7. 듣기 문항은 답 전에 보기 로마자만 서고 제시문 대본은 없으며, 답한 뒤 대본이 선다", async () => {
  await bootItemAudioApp({ progress: afterS1 });

  tapNode(u00, "S2");

  expect(screen.getByTestId("listening-screen-content")).toBeInTheDocument();
  expectLines(listenRomans, 4);
  expect(screen.queryByTestId("listening-prompt-text")).not.toBeInTheDocument();
  expect(screen.queryByTestId("listening-prompt-romanization")).not.toBeInTheDocument();

  tapChoice(1);

  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent("진짜요? 감사합니다!");
  expect(screen.getByTestId("listening-prompt-romanization")).toHaveTextContent(
    "jinjjayo? gamsahamnida!",
  );
  expect(lines().length).toBe(4);
});

test("IT-CR8. TRANSLATE_TO_EN 문항은 켬 상태에서도 로마자 줄이 없다", async () => {
  await bootItemAudioApp({ progress: u01UpToS7 });
  const plan = lessonPlanWith(u01, "S8");
  const at = plan.activities.findIndex((activity) => activity.form === "word-choice");
  const english = stepOf(u01Water, "S8")
    .items.filter((item) => item.type === "TRANSLATE_TO_EN")
    .flatMap((item) => item.options?.map((option) => option.ko) ?? []);
  tapNode(u01, "S8");
  plan.activities.slice(0, at).forEach((activity) => solveActivity(activity, true, false));

  expect(screen.getByTestId("word-choice-screen-content")).toBeInTheDocument();
  expect(english).toContain(labelOf(0));
  expect(lines().length).toBe(0);
  expect(nameOf(0)).toBe(labelOf(0));
});
