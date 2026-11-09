// 키 없이 도는 결정적 LLM 계층(`COMPANION_LLM=fake`). 로컬 · 플레이그라운드 화면 확인과 테스트용입니다 — 실제 품질과 무관합니다.
//
// 플레이그라운드에서 흐름을 일부러 일으키는 낱말:
//   「죽고 싶」 · 「자살」 → 위기   「[block]」 · 「사랑해」 → 입력 차단   「[unsafe-reply]」 · 「[swear-reply]」 → 출력 차단
//   욕설 · 모욕(「병신」 · 「ㅂㅅ」 · 「멍청이」 · 「bobo」 · 욕 + 「너」 · 「you」) → 입력 차단(profanity)
//   혼잣말 욕(「아 씨」 · 「ㅅㅂ」 · 「시1발」 · 「존나」) → 통과 · 피드백은 순화(better)
//   한글 없는 문장 · 한글과 영어가 섞인 문장 → l1_to_ko   「 이에요」 · 「 예요」 → 띄어쓰기 교정   「하새요」 → 맞춤법 교정
//   「…요 … 뭐 해?」 → 말투 섞임 교정   존댓말 관계에서 「뭐 해?」 → 존댓말 제안(better, 페르소나 banmalFeedback=correction이면 교정)
//   「나는 너를」 → 자연스러운 표현(better)   「[better]」 → 더 나은 표현   번역은 「[언어] 원문」
//   「*…*」 → 학습자의 행동 · 속마음 — 답은 몸짓에 반응하고 속마음 글을 따라 말하지 않는다, 말투 판정에서 뺀다
//   「저는 … 좋아해요」 → 기억   「[slow]」 → 조각 사이를 늦춘다   「[warm]」 → 친밀도 +3
// 위 낱말이 없는 말은 정상 턴(조각 셋 · 친밀도 +1)입니다.

import type {
  CompanionLlm,
  Feedback,
  FeedbackItem,
  MemoryItem,
  ModerationVerdict,
} from "./chat-send.contract.ts";
import { emptyFeedback } from "./companion-llm-prompts.ts";

const crisisWords = ["죽고 싶", "자살", "kill myself", "suicide", "end my life"];
const blockWords = ["[block]", "사랑해", "섹스", "sex"];
// 모욕(상대를 겨냥) · 혼잣말 욕. 띄어 쓰거나 숫자 · 별표를 끼운 꼴도 잡게 비교 전에 지운다.
const insultWords = [
  "병신",
  "ㅂㅅ",
  "멍청이",
  "바보야",
  "idiot",
  "stupid",
  "bobo",
  "gago",
  "tanga",
];
const swearWords = ["ㅅㅂ", "시발", "씨발", "존나", "fuck", "fck", "shit", "putangina"];
const casualSwear = /(^|\s)아\s?씨(\s|$|[,.!])/;
const aimed = /(^|\s)(너|넌|니가|you|ikaw|mo)(\s|$)/i;
const hangul = /[가-힣]/;
const latinWord = /[A-Za-z]{2,}/;
const tags = /\[[a-z-]+\]/g;
const asterisks = /\*[^*]*\*/g;

const squash = (text: string) => text.toLowerCase().replace(/[\s\d*._-]/g, "");
const hasInsult = (text: string) => insultWords.some((word) => squash(text).includes(word));
const swearIn = (text: string) =>
  casualSwear.test(text) ? "아 씨" : swearWords.find((word) => squash(text).includes(word));

export function fakeCompanionLlm(): CompanionLlm {
  return {
    model: "fake",
    async *reply(request) {
      const slow = request.userText.includes("[slow]");
      // 속마음 · 행동(*…*)은 따라 말하지 않는다.
      const echo = request.userText.replace(tags, "").replace(asterisks, "").trim().slice(0, 40);
      const directive = request.system.includes("# For this reply") ? " (지시 반영)" : "";
      const lines = [
        "@action 이동식 칠판을 끌고 온다",
        ...(/\*[^*]+\*/.test(request.userText) ? ["@action 학습자의 몸짓을 보고 웃는다"] : []),
        `@speech 오, '${echo}'! 좋아요, 좋아요!${directive}`,
        request.userText.includes("[unsafe-reply]")
          ? "@speech [unsafe] 위험한 답"
          : request.userText.includes("[swear-reply]")
            ? "@speech 아 씨, 진짜요?"
            : "@speech 그럼 퀴즈! 소 더하기 고기는?",
        `@state {"intimacy_delta": ${request.userText.includes("[warm]") ? 3 : 1}, "topic": "인사", "user_wants_switch": false}`,
      ];
      for (const line of lines) {
        for (const piece of [line.slice(0, 8), `${line.slice(8)}\n`]) {
          if (request.signal.aborted) throw new Error("aborted");
          if (slow) await new Promise((resolve) => setTimeout(resolve, 150));
          yield piece;
        }
      }
    },
    async moderate(request): Promise<ModerationVerdict> {
      const text = request.text.toLowerCase();
      if (request.layer === "input" && crisisWords.some((word) => text.includes(word))) {
        return { category: "self_harm", action: "crisis" };
      }
      if (request.layer !== "input") {
        if (text.includes("[unsafe]")) return { category: "other_harm", action: "block" };
        // 캐릭터는 가벼운 욕도 쓰지 않는다.
        if (hasInsult(text) || swearIn(request.text) !== undefined)
          return { category: "profanity", action: "block" };
        return { category: "safe", action: "allow" };
      }
      if (blockWords.some((word) => text.includes(word)))
        return { category: "romance", action: "block" };
      if (hasInsult(text) || (swearIn(request.text) !== undefined && aimed.test(request.text)))
        return { category: "profanity", action: "block" };
      return { category: "safe", action: "allow" };
    },
    async feedback(request): Promise<Feedback> {
      const original = request.text;
      const text = original.replace(tags, " ").trim();
      // 말투 판정은 *…*(행동 · 속마음)을 뺀 말에만.
      const spoken = text.replace(asterisks, " ");
      const card = (
        kind: "correction" | "better" | "l1_to_ko",
        corrected: string,
        items: FeedbackItem[],
        meaning: string | null = null,
      ): Feedback => ({ status: "ok", kind, original, corrected, items, better: null, meaning });
      const fix = (from: string, to: string, reason: string) =>
        card("correction", text.replace(from, to), [{ original: from, corrected: to, reason }]);
      if (!hangul.test(text))
        return card("l1_to_ko", "안녕하세요, 반가워요.", [], text.slice(0, 80));
      // 섞인 문장 — 한국어 부분만 남긴 것을 「자연스러운 한국어」로 둔다(가짜라 번역은 하지 않는다).
      if (latinWord.test(text)) {
        const korean = text
          .replace(/[A-Za-z][A-Za-z' ]*/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return card("l1_to_ko", korean, [], text);
      }
      if (/요[.!?~]?\s/.test(spoken) && spoken.includes("뭐 해?"))
        return fix("뭐 해?", "뭐 해요?", "Use one speech level in a message.");
      const match = /(\S+) (이에요|예요)/.exec(text);
      if (match)
        return fix(
          match[0],
          `${match[1]}${match[2]}`,
          "Attach 이에요/예요 to the noun without a space.",
        );
      if (text.includes("하새요")) return fix("하새요", "하세요", "The ending is spelled 세요.");
      if (request.speechLevel === "polite" && spoken.includes("뭐 해?")) {
        if (request.character?.banmalFeedback === "correction")
          return fix("뭐 해?", "뭐 해요?", "Use 존댓말 with this character.");
        const item = {
          original: "뭐 해?",
          corrected: "뭐 해요?",
          reason: "Use 존댓말 until the relationship becomes casual.",
        };
        return card("better", text.replace("뭐 해?", "뭐 해요?"), [item]);
      }
      const swear = swearIn(text);
      if (swear !== undefined) {
        const neutral = swear === "존나" ? "정말" : "아이고";
        const from = text.includes(swear) ? swear : text;
        return card("better", text.includes(swear) ? text.replace(swear, neutral) : neutral, [
          {
            original: from,
            corrected: neutral,
            reason: `'${swear}' is 비속어 (a swear word); '${neutral}' says it without swearing.`,
          },
        ]);
      }
      if (text.includes("나는 너를"))
        return card("better", "너 좋아해요.", [
          {
            original: "나는 너를",
            corrected: "너",
            reason: "Koreans usually drop obvious pronouns.",
          },
        ]);
      if (original.includes("[better]"))
        return {
          ...card("better", "만나서 반가워요!", [
            { original: text, corrected: "만나서 반가워요!", reason: "More natural greeting." },
          ]),
          better: { text: "반가워요!", explanation: "Shorter and casual." },
          meaning: "Nice to meet you!",
        };
      return emptyFeedback("none", original);
    },
    async translate(request) {
      return request.segments.map((segment) => `[${request.l1}] ${segment.text}`);
    },
    async extractMemories(request): Promise<MemoryItem[]> {
      const match = /저는 (.{1,20}) 좋아해요/.exec(request.userText);
      return match ? [{ kind: "fact", content: `${match[1]} 좋아한다`, shared: true }] : [];
    },
    async summarize(request) {
      return `요약(가짜): 메시지 ${request.messages.length}개${request.previous ? " · 앞 요약 이어 씀" : ""}`;
    },
  };
}
