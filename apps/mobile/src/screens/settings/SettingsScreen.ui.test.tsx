import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { SettingsScreen } from "./SettingsScreen";
import { settingsNavTargets } from "./settings";
import { initialSessionOptions, sessionOptionKeys } from "../../lib/session-options";
import type { AccountDeletionResult } from "../../lib/account.contract";
import { UiCopyContext } from "../../lib/ui-copy";
import { markedUiCopy } from "../../lib/ui-copy.test-support";

// `ui` 계층: 컴포넌트 렌더와 상호작용 (ADR-0006 D4).
// 이 화면은 제목 텍스트 하나와 흐름 영역의 목록 상자를 그립니다 (screens.contract.ts).
//
// `SettingsScreenProps`가 필수 prop 여섯을 요구합니다(계정 콜백 셋 포함, 계약 `AccountActionsProps`).
// 기존 케이스는 `defaultSettingsScreenProps`(초기값 · no-op 콜백)만 채웁니다.
const accountNoopProps = {
  onSignOut: () => undefined,
  onDeleteAccount: () => new Promise<AccountDeletionResult>(() => undefined),
  onLayerChange: () => undefined,
};
const defaultSettingsScreenProps = {
  sessionOptions: initialSessionOptions,
  onSelectNavTarget: () => undefined,
  onToggleSessionOption: () => undefined,
  ...accountNoopProps,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test("설정 화면이 제목을 렌더한다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("Settings");
});

// 재고정 2026-09-02: 제목 다섯이 같은 방식으로 heading이 됩니다 (screens.contract.ts).
test("설정 화면 제목이 accessibility-traits header를 갖는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-title")).toHaveAttribute(
    "accessibility-traits",
    "header",
  );
});

// ---------------------------------------------------------------- 스크롤 영역
//
// 설정의 흐름 자식은 목록 상자 하나입니다. 고정은 제목 <text> 하나입니다.

test("[U1] settings-screen-scroll이 존재한다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll")).toBeInTheDocument();
});

test("[U3] settings-screen-title이 스크롤 컨테이너 밖에 있다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(within(scroll).queryByTestId("settings-screen-title")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
});

// ---------------------------------------------------------------- 스크롤 영역 접근성 부재
//
// 「없음」을 지키는 회귀 그물입니다. 오늘의 구현은 이 넷을 하나도 붙이지 않습니다
// — **red가 없는 것이 이 케이스의 성질입니다.** 다음 편집이 넷 중 하나라도
// 붙이면 여기서만 red가 되고, 그 red는 이 파일을 고치라는 신호가 아니라 계약으로
// 되돌아가라는 신호입니다.
test("[U8] 스크롤 컨테이너에 accessibility-*가 하나도 붙지 않는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(scroll).not.toHaveAttribute("accessibility-element");
  expect(scroll).not.toHaveAttribute("accessibility-label");
  expect(scroll).not.toHaveAttribute("accessibility-traits");
  expect(scroll).not.toHaveAttribute("accessibility-elements-hidden");
});

// ---------------------------------------------------------------- 스크롤 세로 동작
//
// `<scroll-view>`는 `scroll-orientation` prop이 없으면 `_enableScrollY` 초기값이
// NO라 세로 스크롤이 원리적으로 불가능합니다. jsdom은 레이아웃이 없어 실제로
// 스크롤되는지는 이 계층이 원리적으로 못 봅니다(실기가 답합니다).
//
// U11의 기댓값이 문자열 "true"인 이유: `@lynx-js/testing-environment`의
// `__SetAttribute`(ElementPAPI.js:87~89)가 boolean을 `JSON.stringify`로
// 직렬화합니다.

test("[U9] settings-screen-scroll에 scroll-orientation='vertical'이 붙는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll")).toHaveAttribute(
    "scroll-orientation",
    "vertical",
  );
});

test("[U11] settings-screen-scroll에 scroll-bar-enable='true'가 붙는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll")).toHaveAttribute("scroll-bar-enable", "true");
});

// U10 — 목록 상자 하나(`settings-screen-list`)를 그 자리에 세워도 **직계 자식은
// 하나**이므로 이 케이스는 계속 green입니다(ADR-0022 D4).
test("[U10] 스크롤 컨테이너의 직계 자식이 하나를 넘지 않는다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(screen.getByTestId("settings-screen-scroll").children.length).toBeLessThanOrEqual(1);
});

// ---------------------------------------------------------------- 이동 항목 둘 · 토글 항목 둘
//
// 기대값은 `settingsNavLabel`·`sessionOptionStateLabel` 등 실제 순수 함수의
// 결과로 비교합니다 — 문구 리터럴을 이 파일이 다시 짓지 않습니다.

test("[ST1] settings-screen-list가 스크롤의 유일한 직계 요소 자식이다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const scroll = screen.getByTestId("settings-screen-scroll");
  expect(scroll.children).toHaveLength(1);
  expect(scroll.children[0]).toHaveAttribute("data-testid", "settings-screen-list");
});

// 항목 셀입니다 — 그룹이 싣는 `ui-lynx-settings-group-item-{id}` 상자로 가려 집습니다.
function settingsCell(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
}

test("[ST2] 목록 상자 안에 그룹 셋(계정 · 학습 · 계정 동작)이 서고, 항목 순서가 이동 둘 → 토글 둘 → 로그아웃 → 삭제다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const list = screen.getByTestId("settings-screen-list");
  const groups = within(list).getAllByTestId("ui-lynx-settings-group");
  expect(groups.map((group) => group.getAttribute("accessibility-label"))).toEqual([
    "Account",
    "Learning",
    "Account actions",
  ]);
  const testids = Array.from(
    list.querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(testids).toEqual([
    ...settingsNavTargets.map((target) => `ui-lynx-settings-group-item-${target}`),
    ...sessionOptionKeys.map((key) => `ui-lynx-settings-group-item-${key}`),
    "ui-lynx-settings-group-item-sign-out",
    "ui-lynx-settings-group-item-delete-account",
  ]);
});

test("[ST3] 이동 항목 tap → onSelectNavTarget 1회 · 토글 tap → onToggleSessionOption 1회, 서로 침범하지 않는다", () => {
  const onSelectNavTarget = vi.fn<(target: string) => void>();
  const onToggleSessionOption = vi.fn<(key: string) => void>();
  render(
    <SettingsScreen
      sessionOptions={initialSessionOptions}
      onSelectNavTarget={onSelectNavTarget}
      onToggleSessionOption={onToggleSessionOption}
      {...accountNoopProps}
    />,
  );

  fireEvent.tap(settingsCell(settingsNavTargets[0]), {});
  expect(onSelectNavTarget).toHaveBeenCalledTimes(1);
  expect(onSelectNavTarget).toHaveBeenCalledWith(settingsNavTargets[0]);
  expect(onToggleSessionOption).not.toHaveBeenCalled();

  fireEvent.tap(settingsCell(sessionOptionKeys[0]), {});
  expect(onToggleSessionOption).toHaveBeenCalledTimes(1);
  expect(onToggleSessionOption).toHaveBeenCalledWith(sessionOptionKeys[0]);
  expect(onSelectNavTarget).toHaveBeenCalledTimes(1);
});

// ST4 (가드) — 이동·토글 항목은 제목이 아닙니다. 목록 상자가 서기 전에도 제목
// 하나는 이미 있어 green입니다.
test("[ST4] 화면 안 header trait 요소가 settings-screen-title 하나다", () => {
  const { container } = render(<SettingsScreen {...defaultSettingsScreenProps} />);

  const headers = container.querySelectorAll('[accessibility-traits="header"]');
  expect(headers).toHaveLength(1);
  expect(headers[0]).toBe(screen.getByTestId("settings-screen-title"));
});

// ST5 — 섞인 fixture입니다. 둘 다 켜짐이 아닌 값으로 상태가 실제로 내려가는지를
// 봅니다(⚠ 둘 다 켜짐 fixture로는 옳은 배선과 「값을 안 읽고 상수를 그린다」가
// 구별되지 않습니다).
test("[ST5] 섞인 fixture에서 토글 값이 실제로 내려가고, 낭독 이름이 켜짐/꺼짐을 싣는다", () => {
  render(
    <SettingsScreen
      sessionOptions={{ "auto-play-audio": false, "show-transcript": true }}
      onSelectNavTarget={() => undefined}
      onToggleSessionOption={() => undefined}
      {...accountNoopProps}
    />,
  );

  const autoPlay = settingsCell("auto-play-audio");
  expect(autoPlay).toHaveAttribute("data-checked", "false");
  expect(autoPlay).toHaveAttribute("accessibility-label", "Auto-play, off");

  const transcript = settingsCell("show-transcript");
  expect(transcript).toHaveAttribute("data-checked", "true");
  expect(transcript).toHaveAttribute("accessibility-label", "Show transcript, on");
});

// ---------------------------------------------------------------- 영어 (AC1u E)

test("[AC1u-E] 이동 항목 셋이 영어 이름으로 낭독된다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(settingsCell(settingsNavTargets[0])).toHaveAttribute(
    "accessibility-label",
    "User profile",
  );
  expect(settingsCell(settingsNavTargets[1])).toHaveAttribute(
    "accessibility-label",
    "Privacy Policy",
  );
  expect(settingsCell(settingsNavTargets[2])).toHaveAttribute(
    "accessibility-label",
    "Terms of Use",
  );
});

test("[AC1u-E] 토글 항목 둘이 영어 이름과 on 상태로 낭독된다", () => {
  render(<SettingsScreen {...defaultSettingsScreenProps} />);

  expect(settingsCell("auto-play-audio")).toHaveAttribute("accessibility-label", "Auto-play, on");
  expect(settingsCell("show-transcript")).toHaveAttribute(
    "accessibility-label",
    "Show transcript, on",
  );
});

// ---------------------------------------------------------------- 문구표에서 읽음 (AC1u M)

test("[AC1u-M] 제목 · 묶음 이름 · 이동 · 토글 이름 · 상태가 문구표에서 온다", () => {
  const { container } = render(
    <UiCopyContext.Provider value={markedUiCopy}>
      <SettingsScreen
        sessionOptions={{ "auto-play-audio": false, "show-transcript": true }}
        onSelectNavTarget={() => undefined}
        onToggleSessionOption={() => undefined}
        {...accountNoopProps}
      />
    </UiCopyContext.Provider>,
  );

  expect(screen.getByTestId("settings-screen-title")).toHaveTextContent("⟦settings.title⟧");
  const groups = within(screen.getByTestId("settings-screen-list")).getAllByTestId(
    "ui-lynx-settings-group",
  );
  expect(groups.map((group) => group.getAttribute("accessibility-label"))).toEqual([
    "⟦settings.group.account⟧",
    "⟦settings.group.learning⟧",
    "⟦settings.group.accountActions⟧",
  ]);
  expect(settingsCell(settingsNavTargets[0])).toHaveAttribute(
    "accessibility-label",
    "⟦settings.nav.profile⟧",
  );
  expect(settingsCell(settingsNavTargets[1])).toHaveAttribute(
    "accessibility-label",
    "⟦settings.nav.privacy-policy⟧",
  );
  expect(settingsCell(settingsNavTargets[2])).toHaveAttribute(
    "accessibility-label",
    "⟦settings.nav.terms-of-use⟧",
  );
  // 토글 상태 낭독(on · off)은 ui-lynx SettingsCell의 영어 기본값이다 — 앱이 넘기는 경로가 없다(spec §6 D4 개정).
  expect(settingsCell("auto-play-audio")).toHaveAttribute(
    "accessibility-label",
    "⟦settings.sessionOption.auto-play-audio⟧, off",
  );
  expect(settingsCell("show-transcript")).toHaveAttribute(
    "accessibility-label",
    "⟦settings.sessionOption.show-transcript⟧, on",
  );
  expect(container.textContent).not.toMatch(/[가-힣]/);
});

// ================================================================ 계정 동작 (계정 삭제 · 로그아웃, W4)
//
// 대화상자 두 개(로그아웃 · 삭제)는 화면 루트의 자식 래퍼(`settings-screen-*-dialog`) 안에
// ui-lynx `Dialog`로 선다. 행은 `SettingsGroup`, 대화상자 액션은 `Dialog`가 testid를 붙인다.

const deleteDescription =
  "Your account and learning progress will be permanently deleted. This can't be undone.";
const networkFailure = "Couldn't delete your account. Check your connection and try again.";
const otherFailure = "Couldn't delete your account. Please try again.";

type Deferred = {
  readonly promise: Promise<AccountDeletionResult>;
  readonly settle: (result: AccountDeletionResult) => void;
  readonly reject: (error: unknown) => void;
};

function deferred(): Deferred {
  let settle: Deferred["settle"] = () => undefined;
  let reject: Deferred["reject"] = () => undefined;
  const promise = new Promise<AccountDeletionResult>((resolve, rej) => {
    settle = resolve;
    reject = rej;
  });
  return { promise, settle, reject };
}

type AnnounceCall = { args: readonly unknown[] };

function stubAnnounceHost(): AnnounceCall[] {
  const calls: AnnounceCall[] = [];
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (...args: readonly unknown[]) => void calls.push({ args }),
    },
  });
  return calls;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function renderAccount(options: { marked?: boolean } = {}) {
  const gate = deferred();
  const onSignOut = vi.fn<() => void>();
  const onDeleteAccount = vi.fn<() => Promise<AccountDeletionResult>>(() => gate.promise);
  const onLayerChange = vi.fn<(open: boolean) => void>();
  const screenElement = (
    <SettingsScreen
      sessionOptions={initialSessionOptions}
      onSelectNavTarget={() => undefined}
      onToggleSessionOption={() => undefined}
      onSignOut={onSignOut}
      onDeleteAccount={onDeleteAccount}
      onLayerChange={onLayerChange}
    />
  );
  const view = render(
    options.marked === true ? (
      <UiCopyContext.Provider value={markedUiCopy}>{screenElement}</UiCopyContext.Provider>
    ) : (
      screenElement
    ),
  );
  return { ...view, gate, onSignOut, onDeleteAccount, onLayerChange };
}

function dialogAction(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-dialog-action-${id}`)).getByTestId("ui-lynx-button");
}

function openSignOut() {
  fireEvent.tap(settingsCell("sign-out"), {});
}

function openDelete() {
  fireEvent.tap(settingsCell("delete-account"), {});
}

// SU7까지 가는 경로 — 삭제 대화상자에서 `delete`를 눌러 대기 중으로 둔다.
async function startDeleting(options: { marked?: boolean } = {}) {
  const rendered = renderAccount(options);
  openDelete();
  fireEvent.tap(dialogAction("delete"), {});
  await flush();
  return rendered;
}

async function settleWith(gate: Deferred, result: AccountDeletionResult) {
  await act(async () => {
    gate.settle(result);
    await Promise.resolve();
  });
  await flush();
}

test("[SU1-E] 세 번째 묶음이 Account actions이고 sign-out → delete-account 순서로 서며, 대화상자와 실패 문구는 없다", () => {
  renderAccount();

  const groups = within(screen.getByTestId("settings-screen-list")).getAllByTestId(
    "ui-lynx-settings-group",
  );
  expect(groups).toHaveLength(3);
  expect(groups[2]).toHaveAttribute("accessibility-label", "Account actions");
  const items = Array.from(
    groups[2]!.querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(items).toEqual([
    "ui-lynx-settings-group-item-sign-out",
    "ui-lynx-settings-group-item-delete-account",
  ]);
  expect(within(groups[2]!).getByText("Sign out")).toBeInTheDocument();
  expect(within(groups[2]!).getByText("Delete account")).toBeInTheDocument();
  expect(screen.queryByTestId("settings-screen-account-error")).not.toBeInTheDocument();
  expect(screen.queryByTestId("settings-screen-sign-out-dialog")).not.toBeInTheDocument();
  expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
  expect(screen.queryByTestId("ui-lynx-dialog")).not.toBeInTheDocument();
  // 기존 두 묶음 불변
  expect(groups[0]).toHaveAttribute("accessibility-label", "Account");
  expect(groups[1]).toHaveAttribute("accessibility-label", "Learning");
});

test("[SU1-M] 묶음 이름과 두 행 제목이 문구표에서 온다", () => {
  renderAccount({ marked: true });

  const groups = within(screen.getByTestId("settings-screen-list")).getAllByTestId(
    "ui-lynx-settings-group",
  );
  expect(groups[2]).toHaveAttribute("accessibility-label", "⟦settings.group.accountActions⟧");
  expect(screen.getByText("⟦settings.action.sign-out⟧")).toBeInTheDocument();
  expect(screen.getByText("⟦settings.action.delete-account⟧")).toBeInTheDocument();
});

test("[SU2] sign-out 행 탭 → 로그아웃 대화상자가 서고 본문이 낭독에서 가려지며 onLayerChange(true)", () => {
  const { onLayerChange } = renderAccount();

  openSignOut();

  const wrapper = screen.getByTestId("settings-screen-sign-out-dialog");
  expect(within(wrapper).getByTestId("ui-lynx-dialog")).toBeInTheDocument();
  expect(within(wrapper).getByTestId("ui-lynx-dialog-title")).toHaveTextContent("Sign out?");
  expect(within(wrapper).queryByTestId("ui-lynx-dialog-description")).not.toBeInTheDocument();
  const actionIds = Array.from(
    wrapper.querySelectorAll('[data-testid^="ui-lynx-dialog-action-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(actionIds).toEqual(["ui-lynx-dialog-action-sign-out", "ui-lynx-dialog-action-stay"]);
  expect(dialogAction("sign-out")).toHaveAttribute("data-variant", "brand");
  expect(dialogAction("stay")).toHaveAttribute("data-variant", "subtle");
  expect(onLayerChange).toHaveBeenLastCalledWith(true);
  expect(screen.getByTestId("settings-screen-title")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
  expect(screen.getByTestId("settings-screen-scroll")).toHaveAttribute(
    "accessibility-elements-hidden",
    "true",
  );
});

test("[SU3] 로그아웃 대화상자에서 stay → 닫히고 onSignOut 0 · onLayerChange(false) · 숨김 해제", () => {
  const { onSignOut, onLayerChange } = renderAccount();
  openSignOut();

  fireEvent.tap(dialogAction("stay"), {});

  expect(screen.queryByTestId("settings-screen-sign-out-dialog")).not.toBeInTheDocument();
  expect(onSignOut).not.toHaveBeenCalled();
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
  expect(screen.getByTestId("settings-screen-title")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
  expect(screen.getByTestId("settings-screen-scroll")).not.toHaveAttribute(
    "accessibility-elements-hidden",
  );
});

test("[SU4] 로그아웃 대화상자에서 sign-out → onSignOut 1회 · 대화상자 닫힘 · onDeleteAccount 0", () => {
  const { onSignOut, onDeleteAccount } = renderAccount();
  openSignOut();

  fireEvent.tap(dialogAction("sign-out"), {});

  expect(onSignOut).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("settings-screen-sign-out-dialog")).not.toBeInTheDocument();
  expect(onDeleteAccount).not.toHaveBeenCalled();
});

test("[SU5-E] delete-account 행 탭 → 삭제 대화상자 · 제목 · 설명 · 액션 순서 · 취소 경로 keep", () => {
  renderAccount();

  openDelete();

  const wrapper = screen.getByTestId("settings-screen-delete-dialog");
  expect(within(wrapper).getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
    "Delete your account?",
  );
  expect(within(wrapper).getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
    deleteDescription,
  );
  const actionIds = Array.from(
    wrapper.querySelectorAll('[data-testid^="ui-lynx-dialog-action-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(actionIds).toEqual(["ui-lynx-dialog-action-delete", "ui-lynx-dialog-action-keep"]);
  expect(within(wrapper).getByTestId("ui-lynx-dialog")).toHaveAttribute(
    "data-cancelactionid",
    "keep",
  );
});

test("[SU5-M] 삭제 대화상자의 제목 · 설명 · 액션이 문구표에서 온다", () => {
  renderAccount({ marked: true });

  openDelete();

  expect(screen.getByTestId("ui-lynx-dialog-title")).toHaveTextContent(
    "⟦settings.deleteDialog.title⟧",
  );
  expect(screen.getByTestId("ui-lynx-dialog-description")).toHaveTextContent(
    "⟦settings.deleteDialog.description⟧",
  );
  expect(dialogAction("delete")).toHaveTextContent("⟦settings.deleteDialog.confirm⟧");
  expect(dialogAction("keep")).toHaveTextContent("⟦settings.deleteDialog.cancel⟧");
});

test("[SU6] 삭제 대화상자에서 keep → 닫히고 onDeleteAccount 0", () => {
  const { onDeleteAccount } = renderAccount();
  openDelete();

  fireEvent.tap(dialogAction("keep"), {});

  expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
  expect(onDeleteAccount).not.toHaveBeenCalled();
});

test("[SU7] delete → 대기 중: onDeleteAccount 1회 · 대화상자 유지 · delete 로딩 · keep 비활성 · 취소 경로 없음 · 다시 탭해도 호출 수 불변", async () => {
  const { onDeleteAccount, onLayerChange } = await startDeleting();

  expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
  const del = dialogAction("delete");
  expect(del).toHaveAttribute("data-loading", "true");
  expect(within(del).getByTestId("ui-lynx-button-spinner")).toBeInTheDocument();
  expect(del).toHaveAttribute("accessibility-label", "Delete account, loading");
  expect(dialogAction("keep")).toHaveAttribute("data-disabled", "true");
  // 값이 undefined인 속성을 testing-environment가 "null" 문자열로 직렬화한다 — 실제 Lynx에서는 속성 없음.
  expect(screen.getByTestId("ui-lynx-dialog").getAttribute("data-cancelactionid") ?? "null").toBe(
    "null",
  );

  fireEvent.tap(dialogAction("delete"), {});
  fireEvent.tap(dialogAction("keep"), {});
  await flush();
  expect(onDeleteAccount).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
  expect(onLayerChange).toHaveBeenLastCalledWith(true);
});

test("[SU8] deleting → cancelled: 대화상자 유지 · 두 액션 다시 활성 · 실패 문구 없음 · announce 0", async () => {
  const calls = stubAnnounceHost();
  const { gate } = await startDeleting();

  await settleWith(gate, { status: "cancelled" });

  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
  expect(dialogAction("delete")).toHaveAttribute("data-loading", "false");
  expect(dialogAction("keep")).toHaveAttribute("data-disabled", "false");
  expect(screen.queryByTestId("settings-screen-account-error")).not.toBeInTheDocument();
  expect(calls).toHaveLength(0);
});

test("[SU9] deleting → failed/network: 대화상자 닫힘 · 네트워크 문구 · announce 1회 같은 문자열 · onLayerChange(false)", async () => {
  const calls = stubAnnounceHost();
  const { gate, onLayerChange } = await startDeleting();

  await settleWith(gate, { status: "failed", reason: "network" });

  expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-account-error")).toHaveTextContent(networkFailure);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.args[0]).toEqual({ content: networkFailure });
  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});

for (const reason of [
  "unavailable",
  "session-expired",
  "apple-unconfirmed",
  "unconfigured",
] as const) {
  test(`[SU10] deleting → failed/${reason}: 일반 실패 문구 · announce 1회`, async () => {
    const calls = stubAnnounceHost();
    const { gate } = await startDeleting();

    await settleWith(gate, { status: "failed", reason });

    expect(screen.getByTestId("settings-screen-account-error")).toHaveTextContent(otherFailure);
    expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.args[0]).toEqual({ content: otherFailure });
  });
}

test("[SU11] 실패 뒤 sign-out 행을 탭하면 실패 문구가 사라지고 로그아웃 대화상자가 선다", async () => {
  stubAnnounceHost();
  const { gate } = await startDeleting();
  await settleWith(gate, { status: "failed", reason: "network" });
  expect(screen.getByTestId("settings-screen-account-error")).toBeInTheDocument();

  openSignOut();

  expect(screen.queryByTestId("settings-screen-account-error")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-sign-out-dialog")).toBeInTheDocument();
});

test("[SU11] 실패 뒤 delete-account 행을 다시 탭하면 실패 문구가 사라지고 삭제 대화상자가 선다", async () => {
  stubAnnounceHost();
  const { gate } = await startDeleting();
  await settleWith(gate, { status: "failed", reason: "unavailable" });
  expect(screen.getByTestId("settings-screen-account-error")).toBeInTheDocument();

  openDelete();

  expect(screen.queryByTestId("settings-screen-account-error")).not.toBeInTheDocument();
  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
});

test("[SU12] deleting → deleted: 대화상자 · 로딩 그대로 · 실패 문구 없음 · announce 0", async () => {
  const calls = stubAnnounceHost();
  const { gate } = await startDeleting();

  await settleWith(gate, { status: "deleted" });

  expect(screen.getByTestId("settings-screen-delete-dialog")).toBeInTheDocument();
  expect(dialogAction("delete")).toHaveAttribute("data-loading", "true");
  expect(screen.queryByTestId("settings-screen-account-error")).not.toBeInTheDocument();
  expect(calls).toHaveLength(0);
});

test("[SU13] onDeleteAccount가 거부해도 화면이 던지지 않고 일반 실패 문구로 끝난다", async () => {
  const calls = stubAnnounceHost();
  const { gate } = await startDeleting();

  await act(async () => {
    gate.reject(new Error("boom"));
    await Promise.resolve();
  });
  await flush();

  expect(screen.getByTestId("settings-screen-account-error")).toHaveTextContent(otherFailure);
  expect(screen.queryByTestId("settings-screen-delete-dialog")).not.toBeInTheDocument();
  expect(calls).toHaveLength(1);
});

test("[SU14-M] 실패 문구가 문구표에서 온다(network)", async () => {
  stubAnnounceHost();
  const { gate } = await startDeleting({ marked: true });

  await settleWith(gate, { status: "failed", reason: "network" });

  expect(screen.getByTestId("settings-screen-account-error")).toHaveTextContent(
    "⟦settings.deleteFailure.network⟧",
  );
});

test("[SU14-M] 실패 문구가 문구표에서 온다(other)", async () => {
  stubAnnounceHost();
  const { gate } = await startDeleting({ marked: true });

  await settleWith(gate, { status: "failed", reason: "unavailable" });

  expect(screen.getByTestId("settings-screen-account-error")).toHaveTextContent(
    "⟦settings.deleteFailure.other⟧",
  );
});

test("[SU15] 대화상자가 열린 채 언마운트되면 onLayerChange(false)가 마지막으로 불린다", () => {
  const { unmount, onLayerChange } = renderAccount();
  openSignOut();
  expect(onLayerChange).toHaveBeenLastCalledWith(true);

  unmount();

  expect(onLayerChange).toHaveBeenLastCalledWith(false);
});
