import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { MotionProvider } from "@libitums/ui-lynx/motion";
import type { AnswerResult } from "../../lib/answer-result";
import { backHandlers } from "../../lib/back-handler";
import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { CatalogFinalScreen } from "./CatalogFinalScreen";
import type { CatalogRoleplayTurn, CatalogRoleplayTurns } from "./catalog-final.contract";

// `ui` 계층: 카탈로그 최종 테스트 화면 — 상대 대사 · 섞인 타일 · 놓은 순서로 이은 대답의 판정 · 정답 공개 ·
// 결과 한 번. 판정과 리듀서 전이는 순수 함수 unit이 지므로(여기서 다시 계산하지 않습니다) 렌더가 그
// 결과를 내는지만 봅니다. 턴은 계획 모듈이 내는 꼴로 손으로 세웠고, 정답 순서는 픽스처에 적어 둡니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const sceneUrl = "https://cdn/images/u01-water/pre-6.jpg";

// 타일은 이미 섞인 순서입니다 — 정답 문장은 `accepted[0]`이고, 그 순서로 놓는 타일 인덱스가 `correctOrder`입니다.
const turnOne: CatalogRoleplayTurn = {
  id: "RP-01",
  instruction: "What do you say?",
  line: { ko: "봉투 드릴까요?", roman: "bongtu deurilkkayo?", en: "Would you like a bag?" },
  tiles: [
    { ko: "괜찮아요.", roman: "gwaenchanayo." },
    { ko: "아니요,", roman: "aniyo," },
  ],
  accepted: ["아니요, 괜찮아요."],
  replyTranslation: "No, I'm fine.",
  imageUrl: sceneUrl,
};
const turnTwo: CatalogRoleplayTurn = {
  id: "RP-02",
  instruction: "What do you say?",
  line: { ko: "삼천 원입니다.", roman: "samcheon woninnida.", en: "That's three thousand won." },
  tiles: [
    { ko: "할게요.", roman: "halgeyo." },
    { ko: "카드로", roman: "kadeuro" },
  ],
  accepted: ["카드로 할게요."],
  replyTranslation: "I'll pay by card.",
  imageUrl: sceneUrl,
};
const turnThree: CatalogRoleplayTurn = {
  id: "RP-03",
  instruction: "What do you say?",
  line: { ko: "영수증 드릴까요?", roman: "yeongsujeung deurilkkayo?", en: null },
  tiles: [
    { ko: "주세요.", roman: "juseyo." },
    { ko: "네,", roman: "ne," },
  ],
  accepted: ["네, 주세요."],
  replyTranslation: null,
  imageUrl: sceneUrl,
};

const turns: CatalogRoleplayTurns = [turnOne, turnTwo, turnThree];
// 세 턴 모두 둘째 타일이 문장의 앞입니다.
const correctOrder = [1, 0] as const;
const wrongOrder = [0, 1] as const;

function mount(
  options: { readonly list?: CatalogRoleplayTurns; readonly motion?: "reduced" } = {},
) {
  const onFinish = vi.fn<(results: readonly AnswerResult[]) => void>();
  const onExit = vi.fn<() => void>();
  const element = (
    <CatalogFinalScreen
      insets={insets}
      ordinal={1}
      counterpartName="편의점 점원"
      turns={options.list ?? turns}
      onFinish={onFinish}
      onExit={onExit}
    />
  );
  render(
    options.motion === undefined ? (
      element
    ) : (
      <MotionProvider motion={options.motion}>{element}</MotionProvider>
    ),
  );
  return { onFinish, onExit };
}

const root = () => screen.getByTestId("catalog-final-screen");
// 계약 표는 `data-turnIndex`로 적고 시험 계획은 `data-turn-index`로 적습니다 — 어느 쪽으로 서도 읽습니다.
const turnIndexAttribute = () =>
  root().getAttribute("data-turn-index") ??
  root().getAttribute("data-turnindex") ??
  root().getAttribute("data-turnIndex");
const chip = (index: number) => screen.getByTestId(`sentence-order-chip-${index}`);
const actionButton = () =>
  within(screen.getByTestId("catalog-final-screen-action")).getByTestId("ui-lynx-button");
const actionText = () =>
  within(screen.getByTestId("catalog-final-screen-action")).getByTestId("ui-lynx-button-label");
const bank = () => screen.getByTestId("catalog-final-screen-bank");
const reply = () => screen.getByTestId("catalog-final-screen-reply");

function place(order: readonly number[]): void {
  for (const tileIndex of order) {
    fireEvent.tap(chip(tileIndex), {});
  }
}

afterEach(() => {
  cleanup();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

describe("CatalogFinalScreen", () => {
  test("UF1. 첫 렌더는 제목 · 진행 · 상대 대사 · 지시문 · 뜻 힌트 · 섞인 창고 칩을 보이고 버튼은 없다", () => {
    mount();

    const title = screen.getByTestId("catalog-final-screen-title");
    expect(title).toHaveTextContent("Episode 1. Final test");
    expect(title).toHaveAttribute("accessibility-traits", "header");
    expect(screen.getByTestId("catalog-final-screen-progress")).toHaveTextContent("Turn 1 of 3");
    expect(turnIndexAttribute()).toBe("0");
    expect(root()).toHaveAttribute("data-phase", "arranging");

    expect(screen.getByTestId("catalog-final-screen-line")).toHaveAttribute(
      "accessibility-label",
      "편의점 점원: 봉투 드릴까요? Would you like a bag?",
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-speaker")).toHaveTextContent(
      "편의점 점원",
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-line")).toHaveTextContent(
      "봉투 드릴까요?",
    );
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog-translation")).toHaveTextContent(
      "Would you like a bag?",
    );
    expect(screen.getByTestId("catalog-final-screen-instruction")).toHaveTextContent(
      "What do you say?",
    );
    expect(screen.getByTestId("catalog-final-screen-hint")).toHaveTextContent("Say: No, I'm fine.");

    const bankTexts = [...bank().querySelectorAll('[data-testid^="sentence-order-chip-"]')].map(
      (el) => el.textContent,
    );
    expect(bankTexts).toEqual(turnOne.tiles.map((tile) => tile.ko));

    expect(screen.queryByTestId("catalog-final-screen-verdict")).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("catalog-final-screen-action")).queryByTestId("ui-lynx-button"),
    ).not.toBeInTheDocument();
    expect(reply()).toHaveAttribute("accessibility-label", "Your reply, empty");
    expect(reply()).toHaveAttribute("accessibility-element", "true");
  });

  test("UF2. 창고 칩을 탭하면 대답 줄로 가고 그 자리는 빈 칸이 되며 다시 탭하면 돌아온다", () => {
    mount();

    fireEvent.tap(chip(0), {});

    expect(within(reply()).getByTestId("sentence-order-chip-0")).toHaveAttribute(
      "data-placed",
      "1",
    );
    // 타일이 놓이면 줄은 접근성 요소가 아닙니다 — 줄이 요소면 iOS에서 안쪽 칩이 가려져 되돌릴 수 없습니다.
    expect(reply()).toHaveAttribute("accessibility-element", "false");
    expect(within(bank()).queryByTestId("sentence-order-chip-0")).not.toBeInTheDocument();
    expect(within(bank()).getByTestId("sentence-order-bank-slot-0")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("catalog-final-screen-action")).queryByTestId("ui-lynx-button"),
    ).not.toBeInTheDocument();

    fireEvent.tap(within(reply()).getByTestId("sentence-order-chip-0"), {});

    expect(within(bank()).getByTestId("sentence-order-chip-0")).toHaveAttribute(
      "data-placed",
      "none",
    );
    expect(within(bank()).queryByTestId("sentence-order-bank-slot-0")).not.toBeInTheDocument();
  });

  test("UF3. 정답 순서로 놓고 Check하면 맞음이 서고 정답 공개는 없으며 칩이 잠기고 버튼은 Next가 된다", () => {
    mount();

    place(correctOrder);
    expect(reply()).toHaveAttribute("accessibility-label", "Your reply: 아니요, 괜찮아요.");
    expect(actionText()).toHaveTextContent("Check");
    fireEvent.tap(actionButton(), {});

    expect(root()).toHaveAttribute("data-phase", "checked");
    expect(
      within(screen.getByTestId("catalog-final-screen-verdict")).getByTestId("answer-verdict"),
    ).toHaveAttribute("data-result", "correct");
    expect(screen.queryByTestId("catalog-final-screen-answer")).not.toBeInTheDocument();
    expect(chip(0)).toHaveAttribute("accessibility-traits", "disabled");
    expect(chip(1)).toHaveAttribute("accessibility-traits", "disabled");
    expect(actionText()).toHaveTextContent("Next");
  });

  test("UF4. 다음 턴에서 틀린 순서로 Check하면 틀림과 정답 공개가 선다", () => {
    mount();
    place(correctOrder);
    fireEvent.tap(actionButton(), {});
    fireEvent.tap(actionButton(), {});

    expect(screen.getByTestId("catalog-final-screen-progress")).toHaveTextContent("Turn 2 of 3");
    expect(turnIndexAttribute()).toBe("1");
    expect(root()).toHaveAttribute("data-phase", "arranging");

    place(wrongOrder);
    fireEvent.tap(actionButton(), {});

    expect(
      within(screen.getByTestId("catalog-final-screen-verdict")).getByTestId("answer-verdict"),
    ).toHaveAttribute("data-result", "incorrect");
    const answer = screen.getByTestId("catalog-final-screen-answer");
    expect(answer).toHaveTextContent("카드로 할게요.");
    expect(answer.textContent).not.toContain("Answer:");
    expect(screen.getByTestId("answer-reveal-label")).toHaveTextContent("Answer");
  });

  test("RV2. 오답 뒤 정답 상자는 머리 줄 Answer + 정답 문장이고 어두운 면 표지가 없다", () => {
    mount();
    place(correctOrder);
    fireEvent.tap(actionButton(), {});
    fireEvent.tap(actionButton(), {});
    place(wrongOrder);

    expect(screen.queryByTestId("catalog-final-screen-answer")).not.toBeInTheDocument();
    fireEvent.tap(actionButton(), {});

    const answer = screen.getByTestId("catalog-final-screen-answer");
    expect(answer).toHaveTextContent("카드로 할게요.");
    expect(answer).not.toHaveAttribute("data-surface");
    expect(screen.getByTestId("answer-reveal-label")).toHaveTextContent("Answer");
    expect(document.querySelector('[accessibility-label="Answer, 카드로 할게요."]')).not.toBeNull();
    expect(document.body.innerHTML).not.toContain("surface-dark");
  });

  test("UF5. 마지막 턴 뒤 See results를 두 번 눌러도 결과는 한 번 올라간다", () => {
    const { onFinish } = mount();

    place(correctOrder);
    fireEvent.tap(actionButton(), {});
    fireEvent.tap(actionButton(), {});
    place(wrongOrder);
    fireEvent.tap(actionButton(), {});
    fireEvent.tap(actionButton(), {});
    place(correctOrder);
    fireEvent.tap(actionButton(), {});

    expect(actionText()).toHaveTextContent("See results");
    expect(onFinish).toHaveBeenCalledTimes(0);
    fireEvent.tap(actionButton(), {});
    fireEvent.tap(actionButton(), {});

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect", "correct"]);
  });

  test("UF6. 머리의 나가기 버튼과 시스템 뒤로는 각각 onExit를 한 번 올린다", () => {
    const first = mount();
    fireEvent.tap(
      within(screen.getByTestId("catalog-final-screen-back")).getByTestId("ui-lynx-round-button"),
      {},
    );
    expect(first.onExit).toHaveBeenCalledTimes(1);
    expect(first.onFinish).toHaveBeenCalledTimes(0);
    cleanup();

    const second = mount();
    expect(backHandlers.runTop()).toBe(true);
    expect(second.onExit).toHaveBeenCalledTimes(1);
  });

  test("UF7a. 턴 그림이 있으면 배경 이미지가 그 URL로 서고 그림 로드 없이도 대사와 칩이 있다", () => {
    mount();

    expect(screen.getByTestId("narrative-background-image")).toHaveAttribute("src", sceneUrl);
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toBeInTheDocument();
    expect(chip(0)).toBeInTheDocument();
    expect(chip(1)).toBeInTheDocument();
  });

  test("UF7b. 턴 그림이 없으면 배경 그림 없이 단색 바탕이 서고 대사와 칩은 그대로 있다", () => {
    const bare: CatalogRoleplayTurns = [{ ...turnOne, imageUrl: null }];
    mount({ list: bare });

    expect(screen.queryByTestId("narrative-background")).not.toBeInTheDocument();
    expect(screen.getByTestId("catalog-final-screen-backdrop")).toBeInTheDocument();
    expect(screen.getByTestId("ui-lynx-visual-novel-dialog")).toBeInTheDocument();
    expect(chip(0)).toBeInTheDocument();
  });

  test("UF8. 상태 표시줄은 밝은 아이콘이고 루트를 탭해도 상태가 바뀌지 않는다", () => {
    mount();

    expect(root()).toHaveAttribute("data-statusbar", lightStatusBarIcons);
    fireEvent.tap(root(), {});

    expect(root()).toHaveAttribute("data-phase", "arranging");
    expect(turnIndexAttribute()).toBe("0");
    expect(screen.getByTestId("catalog-final-screen-progress")).toHaveTextContent("Turn 1 of 3");
  });

  test("UF9. 모션 축소에서도 같은 화면이 서고 배경 전환은 없다", () => {
    mount({ motion: "reduced" });

    expect(screen.getByTestId("catalog-final-screen-title")).toHaveTextContent(
      "Episode 1. Final test",
    );
    expect(screen.getByTestId("narrative-background")).toHaveAttribute("data-transition", "none");
    expect(chip(0)).toBeInTheDocument();
    expect(chip(1)).toBeInTheDocument();
  });
});
