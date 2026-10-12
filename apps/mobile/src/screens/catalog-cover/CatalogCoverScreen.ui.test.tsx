import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import { backHandlers } from "../../lib/back-handler";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { CatalogCoverScreen } from "./CatalogCoverScreen";
import type { CatalogCutView, CatalogCuts } from "./catalog-cover.contract";

// `ui` 계층: 표지 컷 화면 — 컷 순서 · 로마자 토글 · 지문 · 이미지 층 분리 · 진행 버튼 · 접근성.
// 컷 표시 모델을 만드는 계산(치환 · URL · 화자 정리)은 순수 함수 unit이 지므로 여기서는 손으로
// 세운 표시 모델을 넣고 렌더만 봅니다. 표준 모션에서 대사는 타자기로 쓰이므로 가짜 타이머로 시간을 흘립니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const imageOne = "https://cdn/images/u01-water/pre-1.jpg";

const monologueKo = "비행기를 오래 탔더니 목이 마르다. 편의점이 어디 있지?";
const monologueEn = "Thirsty after that long flight. Where's a convenience store?";
const monologueRoman = "bihaenggireul orae tatdeoni mogi mareuda. pyeonuijeomi eodi itji?";
const narrationKo = "골목 어귀에 편의점 간판이 보인다.";
const narrationEn = "A convenience store sign is visible at the corner of the alley.";
const narrationRoman = "golmok eogwie pyeonuijeom ganpani boinda.";
const asideKo = "딸랑거리는 문소리에 고개를 들며";
const asideEn = "Looking up at the sound of the door bell.";

const views: readonly CatalogCutView[] = [
  {
    kind: "line",
    voice: "thought",
    index: 0,
    speaker: { kind: "self" },
    text: { ko: monologueKo, en: monologueEn, roman: monologueRoman },
    aside: null,
    imageUrl: imageOne,
  },
  {
    kind: "narration",
    index: 1,
    text: { ko: narrationKo, en: narrationEn, roman: narrationRoman },
    imageUrl: imageOne,
  },
  {
    kind: "line",
    voice: "speech",
    index: 2,
    speaker: { kind: "named", name: "점원" },
    text: { ko: "어서 오세요.", en: "Welcome.", roman: "eoseo oseyo." },
    aside: { ko: asideKo, en: asideEn, roman: "ttallanggeorineun munsorie gogaereul deulmyeo" },
    imageUrl: "https://cdn/images/u01-water/pre-3.jpg",
  },
  {
    kind: "line",
    voice: "speech",
    index: 3,
    speaker: { kind: "named", name: "점원" },
    text: { ko: "뭐 드릴까요?", en: "What can I get you?", roman: "mwo deurilkkayo?" },
    aside: null,
    imageUrl: null,
  },
  {
    kind: "narration",
    index: 4,
    text: { ko: "점원이 웃는다.", en: "The clerk smiles.", roman: "jeomwoni unneunda." },
    imageUrl: null,
  },
  {
    kind: "line",
    voice: "speech",
    index: 5,
    speaker: { kind: "self" },
    text: { ko: "물 있나요?", en: "Do you have water?", roman: "mul innayo?" },
    aside: null,
    imageUrl: null,
  },
];

function cutsOf(list: readonly CatalogCutView[]): CatalogCuts {
  const [first, ...rest] = list;
  if (first === undefined) {
    throw new Error("컷이 하나는 있어야 합니다");
  }
  return [first, ...rest];
}

function mount(list: readonly CatalogCutView[] = views, motion?: "reduced") {
  const onComplete = vi.fn<() => void>();
  const onExit = vi.fn<() => void>();
  const screenElement = (
    <CatalogCoverScreen
      insets={insets}
      ordinal={1}
      cuts={cutsOf(list)}
      onComplete={onComplete}
      onExit={onExit}
    />
  );
  render(
    motion === undefined ? (
      screenElement
    ) : (
      <MotionProvider motion={motion}>{screenElement}</MotionProvider>
    ),
  );
  return { onComplete, onExit };
}

const root = () => screen.getByTestId("catalog-cover-screen");
const nextWrapper = () => screen.getByTestId("catalog-cover-screen-next");
const tapNext = () => fireEvent.tap(within(nextWrapper()).getByTestId("ui-lynx-button"), {});
const tapLine = () =>
  fireEvent.tap(screen.getByTestId("catalog-cover-screen-line"), { eventType: "catchEvent" });
const translation = () => screen.getByTestId("ui-lynx-visual-novel-dialog-translation");

// 타자기가 대사를 끝까지 쓰도록 시간을 흘립니다.
const settle = () =>
  act(() => {
    vi.advanceTimersByTime(5000);
  });
// 대사를 끝까지 보인 뒤 다음 컷으로 넘깁니다 — 첫 탭이 대사 완성, 둘째 탭이 넘김이기 때문입니다.
const nextCut = () => {
  settle();
  tapNext();
};
const dialog = () => screen.getByTestId("ui-lynx-visual-novel-dialog");
const dialogLine = () => screen.getByTestId("ui-lynx-visual-novel-dialog-line");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("CatalogCoverScreen", () => {
  test("UC1. 첫 렌더는 제목 · 첫 컷(영어 번역) · 화자 Me · 진행 버튼을 낸다", () => {
    mount();

    const title = screen.getByTestId("catalog-cover-screen-title");
    expect(title).toHaveTextContent("Episode 1.");
    expect(title).toHaveAttribute("accessibility-traits", "header");
    expect(root()).toHaveAttribute("data-cut-index", "0");
    expect(root()).toHaveAttribute("data-script", "en");
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("Me");
    settle();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(monologueKo);
    expect(translation()).toHaveTextContent(monologueEn);
    expect(within(nextWrapper()).getByTestId("ui-lynx-button-label")).toHaveTextContent("Next");
    expect(nextWrapper()).toHaveAttribute("accessibility-label", "Next scene, 1 of 6");
  });

  test("UC2. 대사 상자를 누르면 영어와 로마자가 번갈아 서고 낭독 꼬리가 따라간다", () => {
    mount();
    const line = () => screen.getByTestId("catalog-cover-screen-line");
    expect(line().getAttribute("accessibility-label")).toMatch(/Show romanization$/);

    tapLine();

    expect(root()).toHaveAttribute("data-script", "roman");
    expect(translation()).toHaveTextContent(monologueRoman);
    expect(line().getAttribute("accessibility-label")).toMatch(/Show English$/);

    tapLine();

    expect(root()).toHaveAttribute("data-script", "en");
    expect(translation()).toHaveTextContent(monologueEn);
    expect(line().getAttribute("accessibility-label")).toMatch(/Show romanization$/);
  });

  test("UC3. 로마자 상태로 다음 컷에 가도 로마자가 유지된다", () => {
    mount();

    tapLine();
    nextCut();

    expect(root()).toHaveAttribute("data-cut-index", "1");
    expect(root()).toHaveAttribute("data-script", "roman");
    expect(translation()).toHaveTextContent(narrationRoman);
  });

  test("UC4. 지문은 지문 있는 대사 컷에만 서고 ko 아래 en 둘째 줄이 든다 · 내레이션은 화자가 없다", () => {
    mount();

    // 컷 0 — 지문 없는 독백
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-aside")).not.toBeInTheDocument();

    // 컷 1 — 내레이션
    nextCut();
    expect(screen.getByTestId("catalog-cover-screen-line")).toHaveAttribute(
      "data-cut-kind",
      "narration",
    );
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-aside")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ui-lynx-visual-novel-dialog-speaker")).not.toBeInTheDocument();

    // 컷 2 — 지문 있는 대사
    nextCut();
    const aside = screen.getByTestId("ui-lynx-visual-novel-dialog-aside");
    expect(aside).toHaveTextContent(asideKo);
    expect(aside).toHaveTextContent(asideEn);
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent("점원");
  });

  test("UC5a. 이미지가 있는 컷은 장면 층을 애니메이션으로 그리고 로드 전에도 글과 버튼이 첫 프레임에 있다", () => {
    mount();

    expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("src", imageOne);
    expect(screen.getByTestId("narrative-background-image")).toHaveAttribute(
      "data-motion",
      "animated",
    );
    expect(screen.getByTestId("narrative-background")).not.toHaveAttribute(
      "data-transition",
      "none",
    );
    // `bindload`를 쏘지 않았습니다 — 이미지가 아직 안 온 상태이고, 투명 처리는 이미지 층에만 걸립니다.
    expect(screen.getByTestId("narrative-background-frame").getAttribute("class") ?? "").toContain(
      "loading",
    );
    expect(screen.getByTestId("catalog-cover-screen-backdrop")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-cover-screen-line")).toBeInTheDocument();
    expect(dialog()).toBeInTheDocument();
    expect(nextWrapper()).toBeInTheDocument();
    expect(within(nextWrapper()).getByTestId("ui-lynx-button-label")).toHaveTextContent("Next");
  });

  test("UC5c. 이미지가 끝내 안 와도(로드 없음) 패널 · 버튼이 서 있고 다음 컷으로 넘어간다", () => {
    mount();

    settle();
    expect(dialog()).toBeInTheDocument();
    tapNext();

    expect(root()).toHaveAttribute("data-cut-index", "1");
  });

  test("UC5b. 이미지가 없는 컷은 장면 층 없이 단색 배경만 두고 글과 버튼이 선다", () => {
    mount([views[3] as CatalogCutView, views[5] as CatalogCutView]);

    expect(screen.queryByTestId("narrative-background")).not.toBeInTheDocument();
    expect(screen.getByTestId("catalog-cover-screen-backdrop")).toBeInTheDocument();
    expect(screen.getByTestId("catalog-cover-screen-line")).toBeInTheDocument();
    expect(nextWrapper()).toBeInTheDocument();
  });

  test("UC6. 다음을 다섯 번 누르면 마지막 컷의 Continue가 서고 두 번 눌러도 완료는 한 번이다", () => {
    const { onComplete } = mount();

    for (let i = 0; i < 5; i += 1) {
      nextCut();
    }

    expect(root()).toHaveAttribute("data-cut-index", "5");
    expect(within(nextWrapper()).getByTestId("ui-lynx-button-label")).toHaveTextContent("Continue");
    expect(nextWrapper()).toHaveAttribute("accessibility-label", "Finish intro");
    expect(onComplete).toHaveBeenCalledTimes(0);

    nextCut();
    nextCut();

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("UC7a. 머리의 나가기 버튼은 onExit를 한 번 올린다", () => {
    const { onExit, onComplete } = mount();

    fireEvent.tap(
      within(screen.getByTestId("catalog-cover-screen-back")).getByTestId("ui-lynx-round-button"),
      {},
    );

    expect(onExit).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(0);
  });

  test("UC7b. 시스템 뒤로도 onExit를 한 번 올린다", () => {
    const { onExit } = mount();

    let handled = false;
    act(() => {
      handled = backHandlers.runTop();
    });

    expect(handled).toBe(true);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  test("UC8a. 토글 있는 대사 상자는 하나의 버튼 요소이고 이름이 본문 · 번역 · 다음 동작을 읽는다", () => {
    mount();

    const line = screen.getByTestId("catalog-cover-screen-line");
    expect(line).toHaveAttribute("accessibility-element", "true");
    expect(line).toHaveAttribute("accessibility-traits", "button");
    expect(line).toHaveAttribute(
      "accessibility-label",
      `Me, thinking: ${monologueKo} ${monologueEn}, Show romanization`,
    );

    tapLine();

    expect(line).toHaveAttribute(
      "accessibility-label",
      `Me, thinking: ${monologueKo} ${monologueRoman}, Show English`,
    );
  });

  test("UC8b. 내레이션 컷의 이름은 화자 없이 본문으로 시작한다", () => {
    mount();
    nextCut();

    expect(screen.getByTestId("catalog-cover-screen-line")).toHaveAttribute(
      "accessibility-label",
      `${narrationKo} ${narrationEn}, Show romanization`,
    );
  });

  test("UC8c. 번역이 한쪽뿐이라 토글이 없는 컷은 text trait이고 눌러도 스크립트가 안 바뀐다", () => {
    mount([
      {
        kind: "line",
        voice: "speech",
        index: 0,
        speaker: { kind: "named", name: "점원" },
        text: { ko: "어서 오세요.", en: "Welcome.", roman: null },
        aside: null,
        imageUrl: null,
      },
    ]);

    const line = screen.getByTestId("catalog-cover-screen-line");
    expect(line).toHaveAttribute("accessibility-traits", "text");
    expect(line).toHaveAttribute("accessibility-label", "점원: 어서 오세요. Welcome.");

    tapLine();

    expect(root()).toHaveAttribute("data-script", "en");
    expect(translation()).toHaveTextContent("Welcome.");
  });

  test("UC8d. 지문 있는 컷의 이름은 화자 뒤에 지문 ko를 넣어 읽는다", () => {
    mount();
    nextCut();
    nextCut();

    expect(screen.getByTestId("catalog-cover-screen-line")).toHaveAttribute(
      "accessibility-label",
      `점원, ${asideKo}: 어서 오세요. Welcome., Show romanization`,
    );
  });

  test("UC9. 루트가 밝은 상태바 아이콘 표지를 단다", () => {
    mount();

    expect(root()).toHaveAttribute("data-statusbar", lightStatusBarIcons);
  });

  test("UC10. 대사 상자와 버튼 밖을 눌러도 컷이 안 넘어가고 완료도 안 올린다", () => {
    const { onComplete } = mount();
    const before = root().getAttribute("data-cut-index");

    fireEvent.tap(root(), {});

    expect(root().getAttribute("data-cut-index")).toBe(before);
    expect(onComplete).toHaveBeenCalledTimes(0);
  });

  test("UC11. 표준 모션에서 대사는 타자기로 쓰이고 즉시 전체 표시가 아니다", () => {
    mount();

    expect(dialog()).toHaveAttribute("data-reveal", "typewriter");
    expect(dialog()).toHaveAttribute("data-status", "revealing");
    expect(dialogLine()).not.toHaveTextContent(monologueKo);
    act(() => {
      vi.advanceTimersByTime(35);
    });
    expect(dialogLine().textContent).toBe("비");
    settle();
    expect(dialog()).toHaveAttribute("data-status", "ready");
    expect(dialogLine()).toHaveTextContent(monologueKo);
  });

  test("UC12. 타자기 중 Next 첫 탭은 대사만 완성하고 컷은 그대로이며 둘째 탭이 넘긴다", () => {
    mount();
    act(() => {
      vi.advanceTimersByTime(35);
    });
    expect(dialogLine()).not.toHaveTextContent(monologueKo);

    tapNext();

    expect(root()).toHaveAttribute("data-cut-index", "0");
    expect(dialog()).toHaveAttribute("data-status", "ready");
    expect(dialogLine()).toHaveTextContent(monologueKo);
    expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("src", imageOne);

    tapNext();

    expect(root()).toHaveAttribute("data-cut-index", "1");
    expect(dialog()).toHaveAttribute("data-status", "revealing");
    expect(dialogLine()).not.toHaveTextContent(narrationKo);
  });

  test("UC12b. 마지막 컷도 타자기 중 첫 탭은 완료를 올리지 않고 둘째 탭이 올린다", () => {
    const { onComplete } = mount([views[3] as CatalogCutView]);

    tapNext();
    expect(onComplete).toHaveBeenCalledTimes(0);
    expect(dialog()).toHaveAttribute("data-status", "ready");

    tapNext();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test("UC13. 모션 축소에서는 대사가 즉시 전체이고 배경은 비애니메이션이며 한 번 탭으로 넘어간다", () => {
    mount(views, "reduced");

    expect(root()).toHaveAttribute("data-cut-index", "0");
    expect(dialog()).toHaveAttribute("data-reveal", "instant");
    expect(dialog()).toHaveAttribute("data-status", "ready");
    expect(dialogLine()).toHaveTextContent(monologueKo);
    expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-transition", "none");
    expect(screen.getByTestId("narrative-background-image")).toHaveAttribute(
      "data-motion",
      "static",
    );
    expect(screen.getByTestId("catalog-cover-screen-line")).toBeInTheDocument();
    expect(nextWrapper()).toBeInTheDocument();

    tapNext();

    expect(root()).toHaveAttribute("data-cut-index", "1");
  });

  test("UC14. 독백 컷은 thought 패널(주황 테두리 변형)이고 일반 대사 컷은 speech 패널이다", () => {
    mount();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "data-variant",
      "thought",
    );
    nextCut();
    nextCut();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toHaveAttribute(
      "data-variant",
      "speech",
    );
  });
});
