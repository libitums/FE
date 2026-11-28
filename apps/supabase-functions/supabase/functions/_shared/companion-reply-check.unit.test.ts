import { describe, expect, test } from "vitest";

import { dropRepeatedAction, replyViolations } from "./companion-reply-check.ts";

const sp = (text: string) => ({ kind: "speech", text });

describe("답장 규칙 검사", () => {
  test("RC1. 질문 둘이면 questions", () => {
    expect(replyViolations([sp("뭐 먹었어요?"), sp("맛있었어요?")], "polite")).toEqual([
      "questions",
    ]);
  });
  test("RC2. 해요체에 반말 끝이 섞이면 speech-level, 명사 감탄 · 따옴표 예문은 넘긴다", () => {
    expect(replyViolations([sp("와, 맛있겠다! 저도 먹고 싶어요.")], "polite")).toEqual([
      "speech-level",
    ]);
    expect(replyViolations([sp("정답! '맛있다'는 delicious예요.")], "polite")).toEqual([]);
    expect(replyViolations([sp("봄밤! 좋은 드라마예요 ㅎㅎ")], "polite")).toEqual([]);
  });
  test("RC3. 반말에 -요가 섞이면 speech-level", () => {
    expect(replyViolations([sp("오늘 뭐 했어? 저는 바빴어요.")], "casual")).toEqual([
      "speech-level",
    ]);
    expect(replyViolations([sp("아니요, 괜찮아!")], "casual")).toEqual([]);
  });
  test("RC4. 말풍선 넷 · 영어 메모", () => {
    expect(replyViolations([sp("a"), sp("b"), sp("c"), sp("d")], "polite")).toEqual(["bubbles"]);
    expect(
      replyViolations(
        [sp("Wait, I need to fix the state line before sending this reply.")],
        "polite",
      ),
    ).toEqual(["meta"]);
    expect(replyViolations([sp("반가워요, 여러분... 아니, 학생!")], "polite")).toEqual(["meta"]);
    expect(
      replyViolations([sp("Oops, that has two questions? No — only one. Fine.")], "polite"),
    ).toEqual(["meta"]);
    expect(replyViolations([sp("'사랑해요' means I love you!")], "polite")).toEqual([]);
    expect(replyViolations([sp("아니, 괜찮아요... 정말요!")], "polite")).toEqual([]);
    expect(replyViolations([sp("조심히 들어가세요, 아니 조심히 주무세요 ㅎㅎ")], "polite")).toEqual(
      ["meta"],
    );
    expect(replyViolations([sp("소고기가 더 좋구나... 아니요, 좋군요.")], "polite")).toEqual([
      "speech-level",
      "meta",
    ]);
  });
  test("RC7. 만남 · 기다림 약속은 meeting, 바람은 넘긴다", () => {
    expect(
      replyViolations([sp("덕수궁 앞 떡볶이 가게 앞에서 기다리고 있을게요.")], "polite"),
    ).toEqual(["meeting"]);
    expect(replyViolations([sp("같이 가면 재밌겠어요 ㅎㅎ")], "polite")).toEqual([]);
    expect(replyViolations([sp("내일 또 와요. 기다릴게요!")], "polite")).toEqual([]);
    expect(replyViolations([sp("또 오면 따뜻한 밥 한 공기 준비해 둘게요.")], "polite")).toEqual([]);
    expect(replyViolations([sp("주말에 집에서 봐요?")], "polite")).toEqual([]);
  });
  test("RC5. 말이 없으면 empty", () => {
    expect(replyViolations([{ kind: "action", text: "웃는다" }], "polite")).toEqual(["empty"]);
  });
  test("RC6. 지난 답에 행동 줄이 있으면 이번 행동 줄을 뺀다, 말이 안 남으면 그대로", () => {
    const act = { kind: "action", text: "칠판에 쓴다" };
    expect(dropRepeatedAction([act, sp("안녕하세요")], [act, sp("네")])).toEqual([
      sp("안녕하세요"),
    ]);
    expect(dropRepeatedAction([act, sp("안녕하세요")], [sp("네")])).toEqual([
      act,
      sp("안녕하세요"),
    ]);
    expect(dropRepeatedAction([act], [act])).toEqual([act]);
  });
  test("RC8. 지난 답들과 같은 첫 낱말 · 같은 틀이면 repeat", () => {
    const prev = [[sp("헐, 진짜요?")], [sp("헐, 대박!")], [sp("좋아요.")]];
    expect(replyViolations([sp("헐, 맛있겠어요.")], "polite", prev)).toEqual(["repeat"]);
    const frames = [
      [sp("한국어로는 '사랑해요'라고 해요.")],
      [sp("한국어로는 '배고파요'라고 해요.")],
    ];
    expect(replyViolations([sp("한국어로는 '맛있어요'라고 해요.")], "polite", frames)).toEqual([
      "repeat",
    ]);
    expect(replyViolations([sp("오늘은 비가 와요.")], "polite", frames)).toEqual([]);
  });
  test("RC9. 65자 넘는 말풍선은 long", () => {
    expect(
      replyViolations(
        [
          sp(
            "비빔밥은 밥 위에 나물, 고기, 달걀을 올리고 고추장을 넣어서 비벼 먹는 음식이에요. 정말 맛있고 건강해서 저는 일주일에 두세 번은 꼭 먹어요.",
          ),
        ],
        "polite",
      ),
    ).toEqual(["long"]);
  });
});
