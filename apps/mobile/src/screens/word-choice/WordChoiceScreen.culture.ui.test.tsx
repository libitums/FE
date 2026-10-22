import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";
import { MotionProvider } from "@libitums/ui-lynx/motion";

import {
  choiceItemId,
  choiceMeaningId,
  expectChoiceResult,
} from "../../components/question-options.test-support";
import type { AnswerResult } from "../../lib/answer-result";
import type { ConversationCast } from "../../lib/conversation-cast";
import type { ItemAnswerReport } from "../../lib/item-answer";
import type { LessonPosition } from "../learning/activity-finish";
import { WordChoiceActivity } from "./WordChoiceScreen";
import type { WordChoiceQuestion } from "./word-choice-questions";

// `ui` 계층: 문화 확인(CULTURE_CHECK)의 장면 질문 · 해설 판 흐름입니다. 문항은 매핑이 내는 꼴(u00 S13 · u01 CULT)로
// 손으로 세웠습니다 — 매핑 계산은 unit이 지고, 여기서는 받은 문항을 그리는지와 판정 뒤 동작만 봅니다.

const sceneQuestion: WordChoiceQuestion = {
  prompt: "한국어 잘하시네요!",
  choices: ["잘 먹겠습니다!", "안녕하세요!", "감사합니다!"],
  choiceTranslations: ["Thanks for the meal!", "Hello!", "Thank you!"],
  answerIndex: 2,
  instruction: "What do you say?",
  culture: {
    scene: {
      imageUrl: "https://cdn/images/u00-tutorial/cult-u00-jalhasineyo.webp",
      line: {
        ko: "한국어 잘하시네요!",
        romanization: "hangugeo jalhasineyo!",
        meaning: "Your Korean is so good!",
      },
    },
    explanation: {
      en: 'Answer a compliment with "Thank you."',
      ko: "칭찬을 들으면 「감사합니다」로 받으면 돼요.",
    },
  },
};

const imagelessQuestion: WordChoiceQuestion = {
  ...sceneQuestion,
  culture: {
    ...sceneQuestion.culture!,
    scene: { ...sceneQuestion.culture!.scene!, imageUrl: null },
  },
};

// u01 CULT-04 꼴 — 장면이 없는 질문 카드 갈래입니다.
const cardQuestion: WordChoiceQuestion = {
  prompt: "봉투에 돈을 넣어 줄 때 알맞은 것은?",
  romanization: "bongtue doneul neoeo jul ttae almajeun geoseun?",
  translation: "What goes in the envelope?",
  choices: ["현금", "카드"],
  choiceTranslations: ["cash", "card"],
  answerIndex: 0,
  instruction: "Pick the right one.",
  culture: {
    scene: null,
    explanation: { en: "Cash goes in a white envelope.", ko: "흰 봉투에 현금을 넣어요." },
  },
};

const plainQuestion: WordChoiceQuestion = {
  prompt: "___로 할게요.",
  choices: ["현금", "봉투", "카드"],
  answerIndex: 2,
  instruction: "Fill in the blank.",
};

const cast: ConversationCast = { counterpart: { name: "Mina" }, me: { name: "Sehyun Kim" } };

const spoken: string[] = [];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  spoken.length = 0;
});

function mount(
  questions: readonly WordChoiceQuestion[],
  extra: {
    readonly cast?: ConversationCast;
    readonly onFinish?: (results: readonly AnswerResult[], skippedCount: number) => void;
    readonly onItemAnswered?: (report: ItemAnswerReport) => void;
    readonly lesson?: LessonPosition;
  } = {},
) {
  vi.stubGlobal("NativeModules", {
    LynxAccessibilityModule: {
      accessibilityAnnounce: (args: { content: string }, callback: (result: unknown) => void) => {
        spoken.push(args.content);
        callback("announced");
      },
    },
  });
  return render(
    <WordChoiceActivity
      questions={questions}
      onExit={() => {}}
      onFinish={extra.onFinish ?? (() => {})}
      cast={extra.cast ?? cast}
      {...(extra.lesson === undefined ? {} : { lesson: extra.lesson })}
      {...(extra.onItemAnswered === undefined ? {} : { onItemAnswered: extra.onItemAnswered })}
    />,
  );
}

const id = (testId: string) => screen.getByTestId(testId);
const maybe = (testId: string) => screen.queryByTestId(testId);
const tapChoice = (index: number): void => void fireEvent.tap(id(choiceItemId(index)), {});

describe("문화 확인 장면 — 질문", () => {
  test("CC-H. 문화 확인 문항의 세션 머리 이름표는 Culture quiz이고, 다른 낱말 고르기는 Word choice 그대로다", () => {
    mount([sceneQuestion]);
    expect(id("learning-shell-form")).toHaveTextContent("Culture quiz");
    cleanup();

    mount([{ prompt: "사과", choices: ["사과", "배"], answerIndex: 0 }]);
    expect(id("learning-shell-form")).toHaveTextContent("Word choice");
  });

  test("CC8. 장면 문항은 그림 · 상대 말풍선(로마자 · 뜻) · 상대 아바타 · 지시문 · 보기 뜻 줄로 선다", () => {
    mount([sceneQuestion]);

    const scene = id("word-choice-culture-scene");
    expect(within(scene).getByTestId("word-choice-culture-scene-image")).toBeInTheDocument();
    const partner = within(scene).getByTestId("word-choice-culture-scene-partner");
    expect(within(partner).getByTestId("ui-lynx-chat-bubble")).toHaveAttribute(
      "data-direction",
      "incoming",
    );
    expect(within(partner).getByTestId("ui-lynx-chat-bubble-message")).toHaveTextContent(
      "한국어 잘하시네요!",
    );
    expect(
      within(partner).getByTestId("ui-lynx-chat-bubble-annotation-romanization"),
    ).toHaveTextContent("hangugeo jalhasineyo!");
    expect(within(partner).getByTestId("ui-lynx-chat-bubble-annotation-meaning")).toHaveTextContent(
      "Your Korean is so good!",
    );
    // 말풍선의 낭독 이름은 로마자를 「Pronunciation: …」 접두로 읽습니다.
    expect(within(partner).getByTestId("ui-lynx-chat-bubble")).toHaveAttribute(
      "accessibility-label",
      "Partner: 한국어 잘하시네요!, Pronunciation: hangugeo jalhasineyo!, Your Korean is so good!",
    );
    expect(within(partner).getByTestId("ui-lynx-avatar-initials")).toHaveTextContent("M");
    expect(id("learning-shell-instruction")).toHaveTextContent("What do you say?");
    expect(id(choiceMeaningId(0))).toHaveTextContent("Thanks for the meal!");
    expect(id(choiceMeaningId(2))).toHaveTextContent("Thank you!");
    expect(maybe("word-choice-culture-scene-reply")).not.toBeInTheDocument();
    expect(maybe("learning-shell-feedback")).not.toBeInTheDocument();
  });

  test("CC8. 상대 아바타는 cast의 imageUrl을 imageSource로 받는다", () => {
    mount([sceneQuestion], {
      cast: { counterpart: { name: "Mina", imageUrl: "file:///episodes/u00/avatar.webp" }, me: {} },
    });

    const partner = id("word-choice-culture-scene-partner");
    expect(within(partner).getByTestId("ui-lynx-avatar-image")).toHaveAttribute(
      "src",
      "file:///episodes/u00/avatar.webp",
    );
  });

  test("CC12. 그림이 없는 장면은 그림 없이 말풍선만 선다", () => {
    mount([imagelessQuestion]);

    expect(id("word-choice-culture-scene")).toBeInTheDocument();
    expect(maybe("word-choice-culture-scene-image")).not.toBeInTheDocument();
    expect(id("ui-lynx-chat-bubble-annotation-romanization")).toBeInTheDocument();
  });

  test("CC12. 장면이 없는 문항은 장면 없이 텍스트 카드로 서고 보기 뜻 줄이 있다", () => {
    mount([cardQuestion]);

    expect(maybe("word-choice-culture-scene")).not.toBeInTheDocument();
    expect(id("word-choice-screen-prompt")).toHaveTextContent(
      "봉투에 돈을 넣어 줄 때 알맞은 것은?",
    );
    expect(id("word-choice-screen-romanization")).toBeInTheDocument();
    expect(id("learning-shell-instruction")).toHaveTextContent("Pick the right one.");
    expect(id(choiceMeaningId(0))).toHaveTextContent("cash");
  });

  test("AX2. 장면 말풍선 이름에 화자(Partner)가 들어간다", () => {
    mount([sceneQuestion]);

    expect(id("ui-lynx-chat-bubble").getAttribute("accessibility-label")).toMatch(/^Partner: /);
  });
});

describe("문화 확인 장면 — 답한 뒤", () => {
  test("CC9. 정답을 탭하면 넘김 층 없이 정답 판이 서고 그림 · 상대 로마자가 접히고 내 말풍선이 붙는다", () => {
    mount([sceneQuestion]);

    tapChoice(2);

    expect(maybe("learning-shell-advance")).not.toBeInTheDocument();
    const feedback = id("learning-shell-feedback");
    expect(feedback).toHaveAttribute("data-tone", "correct");
    expect(feedback).toHaveTextContent("Nice reply!");
    expect(feedback).toHaveTextContent('Answer a compliment with "Thank you."');
    expect(feedback).toHaveTextContent("칭찬을 들으면 「감사합니다」로 받으면 돼요.");
    expect(maybe("word-choice-culture-scene-image")).not.toBeInTheDocument();
    expect(maybe("ui-lynx-chat-bubble-annotation-romanization")).not.toBeInTheDocument();
    expect(
      within(id("word-choice-culture-scene-partner")).getByTestId("ui-lynx-chat-bubble-message"),
    ).toHaveTextContent("한국어 잘하시네요!");
    const reply = id("word-choice-culture-scene-reply");
    expect(within(reply).getByTestId("ui-lynx-chat-bubble")).toHaveAttribute(
      "data-direction",
      "outgoing",
    );
    expect(within(reply).getByTestId("ui-lynx-chat-bubble-message")).toHaveTextContent(
      "감사합니다!",
    );
  });

  test("CC9. 고르지 않은 보기는 접히고 고른 보기 하나가 correct로 남으며 아래 버튼은 Continue다", () => {
    mount([sceneQuestion]);

    tapChoice(2);

    expect(maybe(choiceItemId(0))).not.toBeInTheDocument();
    expect(maybe(choiceItemId(1))).not.toBeInTheDocument();
    expectChoiceResult(id(choiceItemId(2)), "correct");
    expect(
      within(id("learning-shell-feedback")).getByTestId("learning-shell-action"),
    ).toHaveAttribute("accessibility-label", "Continue");
  });

  test("CC9. 내 말풍선은 동작 줄이기에서 줄이기 클래스를 얻고 보통 동작에서는 얻지 않는다", () => {
    const standard = mount([sceneQuestion]);
    tapChoice(2);
    expect(id("word-choice-culture-scene-reply")).not.toHaveClass(
      "culture-check-scene-reply-motion-reduced",
    );
    standard.unmount();

    render(
      <MotionProvider motion="reduced">
        <WordChoiceActivity
          questions={[sceneQuestion]}
          onExit={() => {}}
          onFinish={() => {}}
          cast={cast}
        />
      </MotionProvider>,
    );
    tapChoice(2);

    expect(id("word-choice-culture-scene-reply")).toHaveClass(
      "culture-check-scene-reply-motion-reduced",
    );
  });

  test("CC9. 판의 글은 하나의 이름이고(버튼은 그 형제) 답하는 순간 한 번만 낭독한다", () => {
    mount([sceneQuestion]);

    tapChoice(2);
    tapChoice(2);

    const body = within(id("learning-shell-feedback")).getByTestId("learning-shell-feedback-body");
    expect(id("learning-shell-feedback")).not.toHaveAttribute("accessibility-element");
    expect(body).toHaveAttribute("accessibility-element", "true");
    expect(body.contains(id("learning-shell-action"))).toBe(false);
    expect(spoken).toEqual(['Nice reply!. Answer a compliment with "Thank you."']);
  });

  test("CC10. 오답을 탭하면 incorrect 판이 서고 내 말풍선은 없으며 고른 보기 하나만 incorrect로 남는다", () => {
    mount([sceneQuestion]);

    tapChoice(0);

    const feedback = id("learning-shell-feedback");
    expect(feedback).toHaveAttribute("data-tone", "incorrect");
    expect(feedback).toHaveTextContent("Not quite");
    expect(feedback).toHaveTextContent('Answer a compliment with "Thank you."');
    expect(maybe("word-choice-culture-scene-reply")).not.toBeInTheDocument();
    expectChoiceResult(id(choiceItemId(0)), "incorrect");
    expect(maybe(choiceItemId(1))).not.toBeInTheDocument();
    expect(maybe(choiceItemId(2))).not.toBeInTheDocument();
  });

  test("CC12. 장면이 없는 문항도 같은 해설 판 흐름이다(제목은 That's right!)", () => {
    mount([cardQuestion]);

    tapChoice(0);

    expect(maybe("learning-shell-advance")).not.toBeInTheDocument();
    const feedback = id("learning-shell-feedback");
    expect(feedback).toHaveAttribute("data-tone", "correct");
    expect(feedback).toHaveTextContent("That's right!");
    expect(feedback).toHaveTextContent("Cash goes in a white envelope.");
    expect(maybe(choiceItemId(1))).not.toBeInTheDocument();
    expect(id("word-choice-screen-prompt")).toHaveTextContent(
      "봉투에 돈을 넣어 줄 때 알맞은 것은?",
    );
  });

  test("CC11. Continue는 다음 문항으로 넘기고 판이 사라지며 보기가 새로 선다", () => {
    mount([sceneQuestion, plainQuestion]);

    tapChoice(2);
    fireEvent.tap(id("learning-shell-action"), {});

    expect(maybe("learning-shell-feedback")).not.toBeInTheDocument();
    expect(maybe("word-choice-culture-scene")).not.toBeInTheDocument();
    expect(id("word-choice-screen-prompt")).toHaveTextContent("___로 할게요.");
    for (const index of [0, 1, 2]) expectChoiceResult(id(choiceItemId(index)), "none");
  });

  test("CC11. 레슨 중간 활동의 마지막 문항 Continue는 결과 배열에 이 문항을 담아 onFinish를 한 번 부른다", () => {
    const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
    mount([plainQuestion, sceneQuestion], {
      onFinish,
      lesson: { offset: 0, total: 4, last: false },
    });

    tapChoice(2);
    fireEvent.tap(id("learning-shell-advance"), {});
    tapChoice(0);
    expect(onFinish).not.toHaveBeenCalled();
    fireEvent.tap(id("learning-shell-action"), {});

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct", "incorrect"], 0);
  });

  test("CC11. 단독 활동의 마지막 문항 Continue는 완료 카드로 가고 결과 보기가 onFinish를 한 번 부른다", () => {
    const onFinish = vi.fn<(results: readonly AnswerResult[], skippedCount: number) => void>();
    mount([sceneQuestion], { onFinish });

    tapChoice(2);
    fireEvent.tap(id("learning-shell-action"), {});

    expect(id("word-choice-screen-complete")).toBeInTheDocument();
    expect(maybe("learning-shell-feedback")).not.toBeInTheDocument();
    fireEvent.tap(id("learning-shell-action"), {});

    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(["correct"], 0);
  });

  test("EV5. 문항 판정은 첫 탭에서 한 번만 보고된다", () => {
    const onItemAnswered = vi.fn<(report: ItemAnswerReport) => void>();
    mount([sceneQuestion], { onItemAnswered });

    tapChoice(0);

    expect(onItemAnswered).toHaveBeenCalledTimes(1);
    expect(onItemAnswered).toHaveBeenCalledWith({
      questionIndex: 0,
      outcome: "incorrect",
      density: "regular",
    });
  });
});
