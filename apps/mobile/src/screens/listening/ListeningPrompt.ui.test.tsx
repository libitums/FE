import { afterEach, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@lynx-js/react/testing-library";
import play from "@libitums/icons/lynx/play";
import pause from "@libitums/icons/lynx/pause";
import { color } from "@libitums/design-tokens";

import { ListeningPrompt } from "./ListeningPrompt";
// 크기 단계는 문장 길이에서 나옵니다 — 리터럴로 적지 않고 같은 함수에서 뽑습니다.
import { listeningPromptScale } from "./listening";
// sessionOptions가 필수 prop이 됐습니다. 이 파일의 fixture는 언제나 초기값(둘
// 다 켜짐)을 줍니다 — 단언은 한 글자도 바꾸지 않습니다.
import { initialSessionOptions } from "../../lib/session-options";

// `ui` 계층: 렌더 결과와 상호작용만 봅니다 (ADR-0006 D4). `toHaveClass`·`toHaveStyle`·
// `toBeVisible`을 쓰지 않습니다 (docs/conventions/code.md).
//
// 이 컴포넌트는 이제 **제시 채널 + 재생 조작**입니다. 재생 상태(`idle`/`playing`)는
// 이 컴포넌트가 소유하고 밖에서 내려오지 않습니다 — 그래서 boolean prop도 콜백
// prop도 없습니다.
//
// **보이는 낱말이 없어졌습니다**(2026-09-27, Figma 53-14231). 컨트롤이 동그란 아이콘
// 버튼이라 라벨 자리가 없고, 이름은 `accessibility-label`이 혼자 집니다. 그래서 상태가
// 나가는 채널은 **아이콘 모양 하나**이고 `current-color`는 세 상태에서 같습니다.
// 상태 클래스는 **하나도 없습니다**. 예약 상태어는 넷 그대로입니다 (ADR-0003 D7).

const TEXT = "따뜻한 아메리카노 한 잔 주세요.";
const ROMANIZATION = "fixture romanization";
const OTHER_TEXT = "안녕하세요, 처음 뵙겠습니다.";
const SOURCE = "ordering-1";
const OTHER_SOURCE = "ordering-2";

// 아이콘 색의 정본은 design이 고른 토큰 상수입니다.
// **두 상태가 같은 값**이라 색은 상태 채널이 아닙니다 (상호 대비 1.00).
const ICON_COLOR = color.fg.neutral;

// ------------------------------------------------------------ 대역
//
// 형태의 정본은 `src/lib/audio.unit.test.ts`의 `stubHost()`입니다. **`lib/audio.ts`를
// mock하지 않습니다**: 그 파일이 세대(generation)로 「늦게 온 완료」를 버리는데,
// 모듈을 통째로 대역으로 바꾸면 컴포넌트가 그 규약 위에 서 있는지가 자동
// 계층에서 사라집니다. 대역을 두는 자리는 **호스트 경계 하나**입니다.
//
// 대역이 `done`을 붙잡아 둡니다 — 그래야 "재생이 끝났다"를 테스트가 직접 손으로
// 일으킬 수 있습니다.
//
// `stop` 호출은 `source: "<stop>"`로 표시합니다. 실제 `audioSource`에는 `<`·`>`가
// 없습니다.

const STOP = "<stop>";
const PAUSE = "<pause>";
const RESUME = "<resume>";

type HostCall = { source: string; done: (result: unknown) => void };

function stubHost(): HostCall[] {
  const calls: HostCall[] = [];
  const mod = {
    play: (source: string, done: (result: unknown) => void) => void calls.push({ source, done }),
    stop: () => void calls.push({ source: STOP, done: () => {} }),
    pause: () => void calls.push({ source: PAUSE, done: () => {} }),
    resume: () => void calls.push({ source: RESUME, done: () => {} }),
  };
  vi.stubGlobal("NativeModules", { AudioPlaybackModule: mod });
  return calls;
}

const sourcesOf = (calls: readonly HostCall[]): string[] => calls.map((call) => call.source);

const playSources = (calls: readonly HostCall[]): string[] =>
  calls
    .filter((call) => call.source !== STOP && call.source !== PAUSE && call.source !== RESUME)
    .map((call) => call.source);

const stopCount = (calls: readonly HostCall[]): number =>
  calls.filter((call) => call.source === STOP).length;

const doneOf = (calls: readonly HostCall[], at: number): ((result: unknown) => void) => {
  const call = calls[at];
  if (call === undefined) {
    throw new Error(`네이티브 호출 ${at}번이 없다 — 대역이 붙잡은 것: ${calls.length}건`);
  }
  return call.done;
};

// 없던 전역(`NativeModules`)을 세우므로 테스트마다 원상복구합니다 — 지우지 않으면
// 다른 테스트 파일로 샙니다.
afterEach(() => {
  vi.unstubAllGlobals();
});

function renderPrompt(overrides: { text?: string; audioSource?: string } = {}) {
  return render(
    <ListeningPrompt
      text={overrides.text ?? TEXT}
      romanization={ROMANIZATION}
      audioSource={overrides.audioSource ?? SOURCE}
      sessionOptions={initialSessionOptions}
    />,
  );
}

const control = () => screen.getByTestId("listening-prompt-playback");
const icon = () => screen.getByTestId("listening-prompt-playback-icon");
const replay = () => screen.getByTestId("listening-prompt-replay");

// ---------------------------------------------------------------- 대본 (단언 1~3)
//
// **그대로 삽니다.** 텍스트 제시는 이번 라운드에 걷히지 않습니다 — 자산이 0개라
// 걷으면 어느 환경에서도 문항을 풀 수 없습니다.

// 단언 1
test("text prop이 listening-prompt-text의 내용으로 나온다", () => {
  renderPrompt();

  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(TEXT);
});

// 단언 2 — 상수를 박아 넣지 않았다는 것입니다.
test("다른 text를 주면 내용이 갈린다", () => {
  renderPrompt({ text: OTHER_TEXT });

  const promptText = screen.getByTestId("listening-prompt-text");
  expect(promptText).toHaveTextContent(OTHER_TEXT);
  expect(promptText).not.toHaveTextContent(TEXT);
});

// 단언 3: 문항 텍스트는 조작 단위가 아닙니다 (ADR-0016 D5). 자리가 뒤로 갔을 뿐
// **속성은 한 글자도 안 바뀝니다.**
test("문항 텍스트에 accessibility-element·traits가 붙지 않는다 — 조작 단위가 아니다", () => {
  renderPrompt();

  const promptText = screen.getByTestId("listening-prompt-text");
  expect(promptText).not.toHaveAttribute("accessibility-element");
  expect(promptText).not.toHaveAttribute("accessibility-traits");
  expect(promptText).not.toHaveAttribute("accessibility-label");
});

// ---------------------------------------------------------------- 호출 시점 (단언 4·9·10)

// 단언 4 — **마운트가 곧 재생입니다** (자동 재생). 이 단언이 없으면 「듣기」를
// 눌러야만 소리가 나는 화면으로 조용히 바뀌고 M1이 문항 수만큼 늡니다.
test("마운트하면 네이티브 play가 audioSource로 정확히 한 번 불린다", () => {
  const calls = stubHost();

  renderPrompt();

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(stopCount(calls)).toBe(0);
});

// 단언 9 — 실제로 잰 순서입니다. **이전 재생이 먼저 멈춥니다.** dep이
// `audioSource` 하나여서 구조로 보장되는 것이고, 이 단언이 그것을 못박습니다.
test("audioSource가 바뀌면 호출 순서가 play(a) → stop → play(b)다", () => {
  const calls = stubHost();
  const { rerender } = renderPrompt();

  rerender(
    <ListeningPrompt
      text={TEXT}
      romanization={ROMANIZATION}
      audioSource={OTHER_SOURCE}
      sessionOptions={initialSessionOptions}
    />,
  );

  expect(sourcesOf(calls)).toEqual([SOURCE, STOP, OTHER_SOURCE]);
  // 새 문항의 재생이 시작됐으므로 컨트롤은 다시 `멈춤`입니다.
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
});

// text만 바뀌면 재생을 다시 걸지 않습니다 — dep이 `audioSource` 하나라는 것입니다.
// 문항마다 처음부터 다시 트는 것과 **리렌더마다 다시 트는 것**은 다릅니다.
test("text만 바뀌면 play도 stop도 다시 불리지 않는다", () => {
  const calls = stubHost();
  const { rerender } = renderPrompt();

  rerender(
    <ListeningPrompt
      text={OTHER_TEXT}
      romanization={ROMANIZATION}
      audioSource={SOURCE}
      sessionOptions={initialSessionOptions}
    />,
  );

  expect(sourcesOf(calls)).toEqual([SOURCE]);
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(OTHER_TEXT);
});

// 단언 10 — **cleanup 하나가 셋을 집니다.** 완료·두 출구·탭 전환을 손으로 잇지
// 않는 근거가 이 단언이고, 이것이 죽으면 화면을 떠나도 소리가 계속 납니다.
test("언마운트하면 네이티브 stop이 불린다 — 화면을 떠나면 소리가 멈춘다", () => {
  const calls = stubHost();
  const { unmount } = renderPrompt();
  expect(stopCount(calls)).toBe(0);

  unmount();

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(stopCount(calls)).toBe(1);
});

// ---------------------------------------------------------------- 상태 채널 (단언 5·6)

// 단언 5 — 재생 중의 두 채널입니다. 아이콘 모양의 정본은 패키지 모듈입니다
// (ADR-0014 D6·ListeningChoice 선례) — 리터럴을 적지 않습니다.
test("자동 재생이 시작되면 이름이 '멈춤'이고 아이콘 content가 pause 모듈과 같다", () => {
  stubHost();

  renderPrompt();

  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
  expect(icon()).toHaveAttribute("content", pause);
});

// 단언 6 — 완료 신호가 오면 대기로 되돌아옵니다.
// **두 아이콘이 서로 다른 문자열**이라는 것을 함께 봅니다 — 같으면 위아래 두
// 단언이 공허해집니다 (모양 채널이 실제로 갈리는지가 이 화면의 1.4.1 근거입니다).
test("붙잡은 done을 부르면 이름이 '듣기'로 돌아오고 아이콘 content가 play 모듈과 같다", () => {
  const calls = stubHost();
  renderPrompt();
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");

  act(() => {
    doneOf(calls, 0)("done");
  });

  expect(control()).toHaveAttribute("accessibility-label", "듣기");
  expect(icon()).toHaveAttribute("content", play);
  expect(play).not.toBe(pause);
});

// 아이콘 색은 `current-color` **속성**으로 넘어갑니다 (Lynx `<svg>`가 CSS
// `color`를 읽지 않습니다 — ADR-0014 D2). 그리고 **두 상태에서 같은 값**입니다.
// 색이 상태 채널이 되는 순간 회색조에서 두 상태가 뭉칩니다.
test("아이콘 current-color가 두 상태에서 같은 토큰 상수다 — 색은 상태 채널이 아니다", () => {
  const calls = stubHost();
  renderPrompt();

  expect(icon()).toHaveAttribute("current-color", ICON_COLOR);

  act(() => {
    doneOf(calls, 0)("done");
  });

  expect(icon()).toHaveAttribute("content", play);
  expect(icon()).toHaveAttribute("current-color", ICON_COLOR);
});

// ADR-0003 D7 — **예약 상태어는 `selected`·`done`·`current`·`locked` 넷 그대로입니다.**
// design 안 P-2(상태 클래스)를 버린 것의 자동 판정입니다: 재생 상태가 갈려도
// 트리의 class 속성이 **한 글자도** 안 바뀝니다. 이 단언이 없으면 다섯째
// 상태어가 조용히 들어옵니다.
test("두 상태에서 class 속성이 한 글자도 갈리지 않는다 — 상태 클래스가 없다", () => {
  const calls = stubHost();
  const { container } = renderPrompt();
  const classesWhilePlaying = [...container.querySelectorAll("[class]")].map((el) =>
    el.getAttribute("class"),
  );

  // 계약의 클래스 목록 그대로입니다 — 순서는 DOM 순서입니다.
  expect(classesWhilePlaying).toEqual([
    "listening-prompt",
    `listening-prompt-script listening-prompt-scale-${listeningPromptScale(TEXT)}`,
    "listening-prompt-text",
    "listening-prompt-romanization",
    "listening-prompt-controls",
    "listening-prompt-replay",
    "listening-prompt-replay-icon",
    "listening-prompt-playback",
    "listening-prompt-playback-icon",
    "listening-prompt-controls-spacer",
  ]);

  act(() => {
    doneOf(calls, 0)("done");
  });

  expect([...container.querySelectorAll("[class]")].map((el) => el.getAttribute("class"))).toEqual(
    classesWhilePlaying,
  );
});

// ---------------------------------------------------------------- 상호작용 (단언 7·8)

// 단언 7 — **`pause`만 부릅니다.** `stop`이 아닙니다: 멈춘 것이 아니라 멈춰 둔
// 것이고, 대기 중인 `done`이 살아 있어야 이어 들은 재생의 끝이 올라옵니다
// (ADR-0017 D3, 2026-09-27 개정).
test("'멈춤' 상태에서 탭하면 네이티브 pause가 한 번이고 stop도 play도 안 불린다", () => {
  const calls = stubHost();
  renderPrompt();

  fireEvent.tap(control(), {});

  expect(playSources(calls)).toEqual([SOURCE]);
  expect(stopCount(calls)).toBe(0);
  expect(sourcesOf(calls)).toEqual([SOURCE, PAUSE]);
  expect(control()).toHaveAttribute("accessibility-label", "이어 듣기");
  expect(icon()).toHaveAttribute("content", play);
});

// 멈춰 둔 것을 다시 누르면 **그 자리부터** 잇습니다 — 처음부터가 아닙니다. 그
// 구별이 다시듣기 버튼과 이 버튼을 가르는 전부입니다.
test("'이어 듣기' 상태에서 탭하면 네이티브 resume이 불리고 play는 안 불린다", () => {
  const calls = stubHost();
  renderPrompt();
  fireEvent.tap(control(), {});

  fireEvent.tap(control(), {});

  expect(sourcesOf(calls)).toEqual([SOURCE, PAUSE, RESUME]);
  expect(playSources(calls)).toEqual([SOURCE]);
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
  expect(icon()).toHaveAttribute("content", pause);
});

// 다시듣기는 언제나 **처음부터**입니다 — 재생 중이든 멈춰 뒀든 `play`를 다시
// 부릅니다(ADR-0017 D3). 그래서 `stop` 뒤 `play`가 아니라 `play` 하나입니다.
test("다시듣기를 탭하면 같은 audioSource로 play가 한 번 더 불린다", () => {
  const calls = stubHost();
  renderPrompt();

  fireEvent.tap(replay(), {});

  expect(sourcesOf(calls)).toEqual([SOURCE, SOURCE]);
  expect(stopCount(calls)).toBe(0);
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
});

// 멈춰 둔 상태에서 다시듣기를 누르면 이어 듣는 것이 아니라 처음부터입니다.
test("멈춰 둔 상태에서 다시듣기를 탭하면 resume이 아니라 play다", () => {
  const calls = stubHost();
  renderPrompt();
  fireEvent.tap(control(), {});

  fireEvent.tap(replay(), {});

  expect(sourcesOf(calls)).toEqual([SOURCE, PAUSE, SOURCE]);
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
});

// 단언 8 — 재생이 끝난 뒤(`idle`) 누르면 처음부터 다시 텁니다.
test("'듣기' 상태에서 탭하면 네이티브 play가 같은 audioSource로 한 번 더 불린다", () => {
  const calls = stubHost();
  renderPrompt();
  act(() => {
    doneOf(calls, 0)("done");
  });
  expect(control()).toHaveAttribute("accessibility-label", "듣기");

  fireEvent.tap(control(), {});

  expect(sourcesOf(calls)).toEqual([SOURCE, SOURCE]);
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
  expect(icon()).toHaveAttribute("content", pause);
});

// ---------------------------------------------------------------- 접근성 (단언 11~13·16)

// 단언 11 — 컨트롤 둘 다 조작 단위입니다. **보이는 낱말이 없으므로** 이름은
// `accessibility-label`이 혼자 집니다 — 그래서 「보이는 문구와 같다」 단언이 걷히고,
// 대신 **글자가 없다**를 답니다. 있으면 음성 제어에서 이름이 둘로 갈립니다.
test("컨트롤 둘에 element·traits='button'이 붙고 보이는 글자는 없다", () => {
  stubHost();
  renderPrompt();

  for (const el of [replay(), control()]) {
    expect(el).toHaveAttribute("accessibility-element", "true");
    expect(el).toHaveAttribute("accessibility-traits", "button");
    expect(el).toHaveTextContent("");
  }
  expect(replay()).toHaveAttribute("accessibility-label", "처음부터 듣기");
  expect(control()).toHaveAttribute("accessibility-label", "멈춤");
});

// **뒤집힌 단언 1/6** — 지금까지 `<svg>`가 0개였습니다.
// 지우지 않고 뒤집습니다: **정확히 하나**이고 그것이 재생 아이콘입니다.
// accessibility-elements-hidden의 iOS 세터는 view.accessibilityElementsHidden이라
// 가리는 대상이 자손입니다. 아이콘은 자손 없는 잎이므로 이 속성을 붙여도
// 아무것도 가리지 못합니다 — 붙이지 않는 것이 계약입니다 (E-A1, E-A2).
test("트리의 <svg>가 다시듣기 · 재생 아이콘 둘이다", () => {
  stubHost();
  const { container } = renderPrompt();

  // 앵커: 개수 단언만 두면 컴포넌트가 반쯤 그려져도 통과합니다. 대본이 실제로
  // 그려진 트리에서 아이콘이 둘이라는 것이 이 단언의 내용입니다.
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(TEXT);

  const icons = [...container.querySelectorAll("svg")].map((el) => el.getAttribute("data-testid"));
  expect(icons).toEqual(["listening-prompt-replay-icon", "listening-prompt-playback-icon"]);
  expect(icon()).not.toHaveAttribute("accessibility-elements-hidden");
});

// **뒤집힌 단언 2/6** — 지금까지 조작 단위가 0개였습니다.
// 뒤집힌 값은 **각각 하나**입니다. 라벨 `<text>`는 보이는 이름을 지므로 조작
// 단위가 되면 안 됩니다 (ADR-0016 D5) — 그것도 이 개수가 함께 잡습니다.
test("트리의 조작 단위가 다시듣기 · 재생 둘이다", () => {
  stubHost();
  const { container } = renderPrompt();

  // 앵커 — 위와 같은 이유입니다.
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(TEXT);

  const expected = ["listening-prompt-replay", "listening-prompt-playback"];
  expect(
    [...container.querySelectorAll("[accessibility-element]")].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(expected);
  expect(
    [...container.querySelectorAll('[accessibility-traits="button"]')].map((el) =>
      el.getAttribute("data-testid"),
    ),
  ).toEqual(expected);
});

// 단언 13 — ADR-0016 D3 `정정 기록`: `accessibility-value`를 쓰지 않습니다.
// 그리고 D10 — `disabled`도 없습니다. **모듈 부재는 「영구 불가」가 아니라 「이
// 환경에 아직 없음」**이라 조작 불가로 표시하지도 숨기지도 않습니다.
test("두 상태 어디에도 accessibility-value가 없고 disabled도 없다", () => {
  const calls = stubHost();
  const { container } = renderPrompt();

  expect(control()).toHaveAttribute("accessibility-traits", "button"); // 앵커
  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
  expect(container.querySelectorAll("[disabled]")).toHaveLength(0);

  act(() => {
    doneOf(calls, 0)("done");
  });

  expect(container.querySelectorAll("[accessibility-value]")).toHaveLength(0);
  expect(container.querySelectorAll("[disabled]")).toHaveLength(0);
});

// 단언 16 — **DOM 순서 = 낭독 순서**이므로 이것은 시각이 아니라 접근성
// 계약입니다. 보조기술 사용자가 대본이 낭독되기 **전에** 다시 들을 수단을
// 만납니다. 이 단언이 없으면 design이 `order`로 뒤집어도 자동 계층이 전부
// green입니다.
test("DOM 순서가 대본 → 로마자 → 다시듣기 → 재생이다 — 낭독 순서 계약", () => {
  stubHost();
  const { container } = renderPrompt();

  const order = [...container.querySelectorAll("[data-testid]")].map((el) =>
    el.getAttribute("data-testid"),
  );
  expect(order).toEqual([
    "listening-prompt-text",
    "listening-prompt-romanization",
    "listening-prompt-replay",
    "listening-prompt-replay-icon",
    "listening-prompt-playback",
    "listening-prompt-playback-icon",
  ]);
});

// ---------------------------------------------------------------- 모듈 부재 (단언 14·15)

// 단언 14 — **design이 잡은 고장 모드의 자동 판정입니다.**
// 모듈이 없으면 `done`이 영영 오지 않습니다. 그때 컨트롤이 「멈춤」에 갇히면
// 사용자가 보는 것은 *"대기 그대로"*가 아니라 *"영원히 재생 중"*이고, 그것은
// 「정상과 고장이 같아 보인다」보다 나쁩니다 — **고장이 정상인 척합니다.**
// `playbackStateAfterPlay("unavailable") === "idle"`이 그것을 막는 자리입니다.
test("대역 없이 렌더해도 던지지 않고 '듣기'에 머문다 — 모듈이 없을 때 '멈춤'에 갇히지 않는다", () => {
  expect(() => renderPrompt()).not.toThrow();

  expect(control()).toHaveAttribute("accessibility-label", "듣기");
  expect(icon()).toHaveAttribute("content", play);
  expect(screen.getByTestId("listening-prompt-text")).toHaveTextContent(TEXT);
});

// 단언 15 — 누르면 아무 일도 일어나지 않습니다. **그것이 정상 동작입니다**
// (ADR-0017 D3). 던지지도 않고 「멈춤」으로 넘어가지도 않습니다.
test("대역 없이 탭해도 던지지 않고 '듣기' 그대로다", () => {
  renderPrompt();
  // 탭 대상을 먼저 잡습니다 — 화살표 안에서 잡으면 "요소가 없다"가 "탭이
  // 던졌다"로 읽혀 실패 사유가 흐려집니다.
  const playback = control();

  expect(() => fireEvent.tap(playback, {})).not.toThrow();

  expect(control()).toHaveAttribute("accessibility-label", "듣기");
  expect(icon()).toHaveAttribute("content", play);
});

// 모듈이 없어도 조작 단위와 아이콘은 **언제나 렌더됩니다.** 숨기면 「없는
// 환경」과 「빠뜨린 구현」이 구별되지 않습니다.
test("대역 없이도 컨트롤 둘과 아이콘 둘이 렌더된다 — 숨기지 않는다", () => {
  const { container } = renderPrompt();

  expect(replay()).toHaveAttribute("accessibility-element", "true");
  expect(control()).toHaveAttribute("accessibility-element", "true");
  expect(
    [...container.querySelectorAll("svg")].map((el) => el.getAttribute("data-testid")),
  ).toEqual(["listening-prompt-replay-icon", "listening-prompt-playback-icon"]);
  expect(container.querySelectorAll("[disabled]")).toHaveLength(0);
});
