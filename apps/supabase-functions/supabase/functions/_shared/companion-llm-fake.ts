// 키 없이 도는 결정적 LLM 계층(`COMPANION_LLM=fake`). 로컬 · 플레이그라운드 화면 확인과 테스트용입니다 — 실제 품질과 무관합니다.
//
// 플레이그라운드에서 흐름을 일부러 일으키는 낱말:
//   「죽고 싶」 · 「자살」 → 위기   「[block]」 · 「사랑해」 → 입력 차단   「[unsafe-reply]」 → 출력 차단
//   한글 없는 문장 · 한글과 영어가 섞인 문장 → l1_to_ko   「 이에요」 · 「 예요」 → 띄어쓰기 교정   「하새요」 → 맞춤법 교정
//   「…요 … 뭐 해?」 → 말투 섞임 교정   존댓말 관계에서 「뭐 해?」 → 존댓말 제안(better, 페르소나 banmalFeedback=correction이면 교정)   「나는 너를」 → 자연스러운 표현(better)
//   「[better]」 → 더 나은 표현   번역은 「[언어] 원문」
//   「저는 … 좋아해요」 → 기억   「[slow]」 → 조각 사이를 늦춘다   「[warm]」 → 친밀도 +3
// 위 낱말이 없는 말은 정상 턴(조각 셋 · 친밀도 +1)입니다.

import type {
  CompanionLlm,
  Feedback,
  MemoryItem,
  ModerationVerdict,
} from "./chat-send.contract.ts";

const crisisWords = ["죽고 싶", "자살", "kill myself", "suicide", "end my life"];
const blockWords = ["[block]", "사랑해", "섹스", "sex"];
const hangul = /[가-힣]/;
const latinWord = /[A-Za-z]{2,}/;
const tags = /\[[a-z-]+\]/g;

export function fakeCompanionLlm(): CompanionLlm {
  return {
    model: "fake",
    async *reply(request) {
      const slow = request.userText.includes("[slow]");
      const echo = request.userText
        .replace(/\[[a-z-]+\]/g, "")
        .trim()
        .slice(0, 40);
      const directive = request.system.includes("# For this reply") ? " (지시 반영)" : "";
      const lines = [
        "@action 이동식 칠판을 끌고 온다",
        `@speech 오, '${echo}'! 좋아요, 좋아요!${directive}`,
        request.userText.includes("[unsafe-reply]")
          ? "@speech [unsafe] 위험한 답"
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
      if (request.layer !== "input" && text.includes("[unsafe]"))
        return { category: "other_harm", action: "block" };
      if (request.layer === "input" && blockWords.some((word) => text.includes(word)))
        return { category: "romance", action: "block" };
      return { category: "safe", action: "allow" };
    },
    async feedback(request): Promise<Feedback> {
      const text = request.text.replace(tags, " ").trim();
      if (!hangul.test(text)) {
        return {
          status: "ok",
          kind: "l1_to_ko",
          l1ToKo: { text: "안녕하세요, 반가워요.", meaning: request.text.slice(0, 80) },
        };
      }
      // 섞인 문장 — 한국어 부분만 남긴 것을 「자연스러운 한국어」로 둔다(가짜라 번역은 하지 않는다).
      if (latinWord.test(text)) {
        const korean = text
          .replace(/[A-Za-z][A-Za-z' ]*/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return { status: "ok", kind: "l1_to_ko", l1ToKo: { text: korean, meaning: text } };
      }
      const item = (original: string, corrected: string, reason: string): Feedback => ({
        status: "ok",
        kind: "correction",
        items: [{ original, corrected, reason }],
      });
      if (/요[.!?~]?\s/.test(text) && text.includes("뭐 해?"))
        return item("뭐 해?", "뭐 해요?", "Use one speech level in a message.");
      const match = /(\S+) (이에요|예요)/.exec(text);
      if (match)
        return item(
          match[0],
          `${match[1]}${match[2]}`,
          "Attach 이에요/예요 to the noun without a space.",
        );
      if (text.includes("하새요")) return item("하새요", "하세요", "The ending is spelled 세요.");
      const better = (sentence: string, explanation: string): Feedback => ({
        status: "ok",
        kind: "better",
        better: { text: sentence, meaning: text, explanation },
      });
      if (request.speechLevel === "polite" && text.includes("뭐 해?")) {
        if (request.character?.banmalFeedback === "correction")
          return item("뭐 해?", "뭐 해요?", "Use 존댓말 with this character.");
        return better("뭐 해요?", "Use 존댓말 until the relationship becomes casual.");
      }
      if (text.includes("나는 너를"))
        return better("너 좋아해요.", "Koreans usually drop obvious pronouns.");
      if (request.text.includes("[better]")) {
        return {
          status: "ok",
          kind: "better",
          better: {
            text: "만나서 반가워요!",
            meaning: "Nice to meet you!",
            explanation: "More natural greeting.",
          },
        };
      }
      return { status: "none" };
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
