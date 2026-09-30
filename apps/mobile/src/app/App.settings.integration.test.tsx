import { journeySeedBefore } from "./test-helpers/journey-seed";
// 자동 재생 설정의 범용 듣기 경로를 명시적 배정 픽스처로 엽니다.
vi.mock("../screens/journey-map/journey-map", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../screens/journey-map/journey-map")>()),
  ...(await import("./test-helpers/learning-route-fixture")),
}));

import { afterEach, expect, test, vi } from "vitest";
import { fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import type { JourneyStepId } from "../screens/journey-map/journey-map";
import type { SettingsEventSink } from "../screens/settings/settings.contract";
import { renderSignedInApp } from "./test-helpers/signed-in-app";

// 서사 표지를 이미 끝낸 채로 부팅합니다 — 이 파일이 보는 것은 표지 뒤의 흐름입니다. 표지
// 자체는 `App.episode-intro.integration.test.tsx`가 봅니다.
const completedIntros = ["tutorial-intro"] as const;

// 설정에서 프로필·문서로 이동하고 기본 듣기 동작을 유지하는지 검증합니다.
function startStep(stepId: JourneyStepId): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  fireEvent.tap(screen.getByTestId(`ui-lynx-learning-unit-${stepId}`), {});
  expect(screen.getByTestId("step-sheet-panel")).toBeInTheDocument();
  fireEvent.tap(screen.getByTestId("step-sheet-start"), {});
}

function openSettingsTab(): void {
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-settings"), {});
}

// 기존 `render` 직접 호출 자리를 대신하는 공용 헬퍼(`renderApp`)입니다. 토큰이 있는
// 상태를 스텁하고 가짜 타이머로 `entrySplashDurationMs`만큼 전진시켜 진입
// 스플래시를 건너뜁니다. 이 파일이 이미 세운 `NativeModules` 스텁(있으면,
// `stubHost()`의 오디오 모듈)을 지우지 않고 `StorageModule`만 얹습니다.
// 설정 항목 셀입니다. 셀은 ui-lynx `SettingsGroup`이 그리고, 항목은 그룹이 싣는
// `ui-lynx-settings-group-item-{id}` 상자로 가려 집습니다(`id`는 이동 대상 · 옵션 키).
// 나가기는 동그란 뒤로 버튼(ui-lynx `RoundButton`)입니다 — testid 상자 안의 버튼을 누릅니다.
function exitButton(testId: "profile-screen-exit"): HTMLElement {
  return within(screen.getByTestId(testId)).getByTestId("ui-lynx-round-button");
}

function settingsCell(id: string): HTMLElement {
  return within(screen.getByTestId(`ui-lynx-settings-group-item-${id}`)).getByTestId(
    "ui-lynx-settings-cell",
  );
}

// 오디오 호스트 경계 대역입니다 — `App.integration.test.tsx`의 `stubHost()`와 같은
// 형태입니다(파일이 다르므로 다시 선언합니다). `lib/audio.ts`를 `vi.mock`하지
// 않습니다 — 대역을 두는 자리는 호스트 경계 하나입니다. `done`을 호출하지 않아
// 재생이 그대로 `"playing"`에 머뭅니다 — IT5~IT8이 필요한 것은 재생 여부(호출
// 수)와 컨트롤 라벨뿐입니다.
type HostCall = { source: string };

function stubHost(): { audio: HostCall[] } {
  const audio: HostCall[] = [];
  vi.stubGlobal("NativeModules", {
    AudioPlaybackModule: {
      play: (source: string, _done: (result: unknown) => void) => void audio.push({ source }),
      stop: () => void audio.push({ source: "<stop>" }),
    },
  });
  return { audio };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ------------------------------------------------------------------------- IT1

test("[IT1] 설정 탭을 열면 계정 항목 넷과 계정 동작 둘만 표시된다", async () => {
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openSettingsTab();

  const list = screen.getByTestId("settings-screen-list");
  const itemTestIds = Array.from(
    list.querySelectorAll('[data-testid^="ui-lynx-settings-group-item-"]'),
  ).map((el) => el.getAttribute("data-testid"));
  expect(itemTestIds).toEqual([
    "ui-lynx-settings-group-item-profile",
    "ui-lynx-settings-group-item-notifications",
    "ui-lynx-settings-group-item-privacy-policy",
    "ui-lynx-settings-group-item-terms-of-use",
    "ui-lynx-settings-group-item-sign-out",
    "ui-lynx-settings-group-item-delete-account",
  ]);
});

// ------------------------------------------------------------------------- IT2

// 2026-09-27 개정(ADR-0007): 바텀 네비게이션은 **탭 루트에서만** 섭니다. 프로필은 설정
// 탭 위에 쌓인 화면이라 바가 없습니다 — 「탭이 설정 그대로다」를 바로 볼 수 없게 됐고,
// 대신 **바가 사라졌다가 나가면 설정 루트에서 다시 선다**로 같은 것을 봅니다.
test("[IT2] 사용자 프로필 항목을 tap하면 프로필 화면이 서고 바가 사라진다", async () => {
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openSettingsTab();
  fireEvent.tap(settingsCell("profile"), {});

  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  fireEvent.tap(exitButton("profile-screen-exit"), {});

  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.getByTestId("ui-lynx-bottom-navigator-item-settings")).toHaveAttribute(
    "data-selected",
    "true",
  );
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);
});

// ------------------------------------------------------------------------- IT3

test("[IT3] 프로필의 설정으로를 tap하면 설정 화면으로 돌아가고 프로필 화면이 사라진다", async () => {
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openSettingsTab();
  fireEvent.tap(settingsCell("profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();

  fireEvent.tap(exitButton("profile-screen-exit"), {});

  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryByTestId("profile-screen-title")).not.toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT4

// 방침 · 약관은 앱 위 브라우저로 엽니다(ADR-0033). 호스트 경계 대역(`LegalDocumentModule`)만
// 세웁니다 — 이미 세운 `NativeModules`(저장소 · 오디오)를 지우지 않고 얹습니다.
function stubLegalDocumentHost(): { opened: string[] } {
  const opened: string[] = [];
  const previous = (globalThis as { NativeModules?: Record<string, unknown> }).NativeModules ?? {};
  vi.stubGlobal("NativeModules", {
    ...previous,
    LegalDocumentModule: {
      open: (args: { document: string }, callback: (payload: unknown) => void) => {
        opened.push(args.document);
        callback({ status: "opened" });
      },
    },
  });
  return { opened };
}

test("[IT4] 개인정보처리방침 · 이용약관 항목을 tap하면 그 문서를 호스트로 열고 설정 화면에 남는다", async () => {
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  const { opened } = stubLegalDocumentHost();
  openSettingsTab();

  fireEvent.tap(settingsCell("privacy-policy"), {});
  fireEvent.tap(settingsCell("terms-of-use"), {});

  expect(opened).toEqual(["privacy-policy", "terms-of-use"]);
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT8

test("[IT8] (앵커) 토글을 건드리지 않고 듣기 화면을 열면 오늘 동작 그대로다 — 대본이 있고 컨트롤이 '멈춤'", async () => {
  const { audio } = stubHost();
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );

  startStep("ordering");

  expect(audio).toHaveLength(1);
  expect(screen.getByTestId("listening-prompt-playback")).toHaveAttribute(
    "accessibility-label",
    "Pause",
  );
  expect(screen.getByTestId("listening-prompt-text")).toBeInTheDocument();
});

// ------------------------------------------------------------------------- IT9

test("[IT9] 설정 sink는 설정 탭 tap마다 발화하고 이미 설정 탭인데 다시 눌러도 여전히 1건이다 — 다른 탭을 다녀오면 2건이 된다(spec §7.2)", async () => {
  const settingsEventSink = vi.fn<NonNullable<SettingsEventSink>>();
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={completedIntros}
      settingsEventSink={settingsEventSink}
    />,
  );

  openSettingsTab();
  expect(settingsEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "settings_opened" },
  ]);

  // 이미 설정 탭인데 다시 누릅니다 — 네비게이션이 무동작이라 발화하지 않습니다.
  openSettingsTab();
  expect(settingsEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "settings_opened" },
  ]);

  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-navigator-item-journey"), {});
  openSettingsTab();
  expect(settingsEventSink.mock.calls.map(([event]) => event)).toEqual([
    { name: "settings_opened" },
    { name: "settings_opened" },
  ]);
});

// ------------------------------------------------------------------------ IT10

test("[IT10] 공용 로그 — 설정 → 프로필 → 설정으로 → 이용약관의 순서가 정확히 계약대로다('설정으로' 복귀는 settings_opened를 내지 않는다)", async () => {
  const log: unknown[] = [];
  const settingsEventSink: NonNullable<SettingsEventSink> = (event) => log.push(event);
  await renderSignedInApp(
    <App
      journeySeed={journeySeedBefore("ordering")}
      completedEpisodeIntroIds={completedIntros}
      settingsEventSink={settingsEventSink}
    />,
  );

  openSettingsTab();
  fireEvent.tap(settingsCell("profile"), {});
  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  fireEvent.tap(exitButton("profile-screen-exit"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  stubLegalDocumentHost();
  fireEvent.tap(settingsCell("terms-of-use"), {});
  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();

  expect(log).toEqual([
    { name: "settings_opened" },
    { name: "profile_opened" },
    { name: "legal_document_opened", document: "terms-of-use", source: "settings" },
  ]);
});

// ------------------------------------------------------------------------ IT12

test("[IT12] (가드) sink 없이 render(App) — 탭·항목 tap이 던지지 않는다", async () => {
  await expect(
    renderSignedInApp(
      <App
        journeySeed={journeySeedBefore("ordering")}
        completedEpisodeIntroIds={completedIntros}
      />,
    ),
  ).resolves.toBeDefined();

  expect(() => {
    openSettingsTab();
  }).not.toThrow();

  expect(() => {
    fireEvent.tap(settingsCell("profile"), {});
  }).not.toThrow();

  expect(() => {
    const exit = exitButton("profile-screen-exit");
    if (exit !== null) fireEvent.tap(exit, {});
  }).not.toThrow();

  expect(() => {
    fireEvent.tap(settingsCell("privacy-policy"), {});
    fireEvent.tap(settingsCell("terms-of-use"), {});
  }).not.toThrow();
});

// ------------------------------------------------------------------------ IT13

// [IT13] **뒤집힙니다**(ADR-0007 2026-09-27 개정). 예전에는 「프로필을 연 채 여정 탭을
// 다녀오면 프로필이 그대로 있다」를 봤습니다. 이제 쌓인 화면에서는 탭을 바꿀 수단이
// 없으므로 그 상태를 **조작으로 만들 수 없습니다** — 리듀서의 스택 보존은 그대로 살아
// 있지만 UI로 닿지 않습니다.
//
// 그 자리에 **닿을 수 없다는 것 자체**를 답니다: 쌓인 화면에는 탭이 하나도 없고, 나가야
// 다시 섭니다. 이것이 없으면 바를 되살려도 아무것도 빨개지지 않습니다.
test("[IT13] 쌓인 화면에서는 탭으로 나갈 수단이 없고, 나가면 탭이 다시 선다", async () => {
  await renderSignedInApp(
    <App journeySeed={journeySeedBefore("ordering")} completedEpisodeIntroIds={completedIntros} />,
  );
  openSettingsTab();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);

  fireEvent.tap(settingsCell("profile"), {});

  expect(screen.getByTestId("profile-screen-title")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(0);

  fireEvent.tap(exitButton("profile-screen-exit"), {});

  expect(screen.getByTestId("settings-screen-title")).toBeInTheDocument();
  expect(screen.queryAllByTestId(/^ui-lynx-bottom-navigator-item-/)).toHaveLength(3);
});

test("프로필은 갱신된 로그인 계정의 한글 이름·이메일·전화번호를 표시한다", async () => {
  const payload = {
    sub: "profile-fixture",
    email: "learner@example.test",
    phone: "+821012345678",
    user_metadata: { full_name: "김하늘" },
  };
  const token = `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
  const events: unknown[] = [];
  await renderSignedInApp(<App settingsEventSink={(event) => events.push(event)} />, {
    refreshedAccessToken: token,
  });
  openSettingsTab();
  fireEvent.tap(settingsCell("profile"), {});
  expect(screen.getByTestId("profile-item-value-name")).toHaveTextContent("김하늘");
  expect(screen.getByTestId("profile-item-value-email")).toHaveTextContent("learner@example.test");
  expect(screen.getByTestId("profile-item-value-phone")).toHaveTextContent("+821012345678");
  expect(JSON.stringify(events)).not.toContain("learner@example.test");
  expect(screen.queryByTestId("profile-item-learning-goal")).not.toBeInTheDocument();
});

test("계정이 제공하지 않은 정보는 예시 개인정보로 채우지 않는다", async () => {
  await renderSignedInApp(<App />);
  openSettingsTab();
  fireEvent.tap(settingsCell("profile"), {});
  for (const id of ["name", "email", "phone"]) {
    expect(screen.getByTestId(`profile-item-value-${id}`)).toHaveTextContent("Not provided");
  }
});
