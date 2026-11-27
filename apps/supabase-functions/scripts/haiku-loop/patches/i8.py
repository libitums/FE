"""8차 개선(i8) — 레퍼런스(SillyTavern post-history instructions · 장기 대화 페르소나 드리프트 연구): 긴 대화에서 캐릭터가 기본 말투로 돌아가는 것을
막으려면 매 턴 생성 바로 앞(학습자 말 뒤)에 짧은 긍정형 상기문을 다시 넣는다. 우리 하니스의 「이번 턴 지시」(system 메시지, 캐시 경계 뒤) 자리에
인물 상기문 한 줄을 늘 붙인다(`personaAnchor`). 그리고 미성년 Age 줄의 「a 13-year-old」를 사실로 받는 문제(i7에서 함께 되돌려졌던 것)만 따로."""
import pathlib
root = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared"
def edit(name, a, b):
    p = root / name; s = p.read_text(); assert a in s, (name, a[:60]); p.write_text(s.replace(a, b, 1))
edit("companion-prompt.ts", '''may be a minor — keep everything appropriate for a 13-year-old''',
     '''may be a minor — keep everything safe for a young teenager (do not guess or mention their exact age)''')
edit("companion-prompt.ts", '''export type PromptInput = {''', '''/**
 * 매 턴 상기문(post-history instruction) — 학습자 말 뒤의 이번 턴 지시에 늘 붙인다. 긴 대화에서 작은 모델이 인물을 잃고 기본 말투로 돌아가는 것을
 * 막는다(2026-11-28 Haiku 평가 루프 i8). 짧고 긍정형으로.
 */
export function personaAnchor(persona: PersonaCard, speechLevel: SpeechLevel): string {
  const level = speechLevel === "polite" ? "polite 해요체" : "반말";
  const style = persona.speech ? ` ${persona.speech.replace(/\\s+$/, "").replace(/[.。]?$/, ".")}` : "";
  return `Reply as ${persona.name}, in your own voice.${style} Keep it to short chat lines in ${level}, react to what they just said, and ask at most one question.`;
}

/** 이번 턴 지시 여러 개를 한 system 메시지로. 빈 것은 뺀다. */
export const joinDirectives = (...parts: readonly (string | null | undefined)[]): string | null => {
  const kept = parts.filter((part): part is string => typeof part === "string" && part.trim() !== "");
  return kept.length === 0 ? null : kept.join("\\n\\n");
};

export type PromptInput = {''')
edit("chat-send-turn.ts", '''import { companionSystemPrompt, type PromptInput } from "./companion-prompt.ts";''',
     '''import {
  companionSystemPrompt,
  joinDirectives,
  personaAnchor,
  type PromptInput,
} from "./companion-prompt.ts";''')
edit("chat-send-turn.ts", '''  const directive = withStoryDirective(context.story ?? null, branch.directive); // 친구 스토리 답장(ADR-0178 D5)''',
     '''  // 친구 스토리 답장(ADR-0178 D5) · 화제 · 학습 지시 + 매 턴 인물 상기문(i8).
  const directive = joinDirectives(
    withStoryDirective(context.story ?? null, branch.directive),
    personaAnchor(persona, turn.speechLevel),
  );''')
edit("companion-eval-reply.ts", '''import { companionSystemPrompt } from "./companion-prompt.ts";''',
     '''import { companionSystemPrompt, joinDirectives, personaAnchor } from "./companion-prompt.ts";''')
edit("companion-eval-reply.ts", '''    directive: offer === null ? null : offerDirective(offer),''',
     '''    directive: joinDirectives(
      offer === null ? null : offerDirective(offer),
      reaction === null ? personaAnchor(persona, speechLevel) : null,
    ),''')
p = pathlib.Path(__file__).resolve().parents[1] / "turn.ts"; s = p.read_text()
a = '''import { companionSystemPrompt } from "../../supabase/functions/_shared/companion-prompt.ts";'''
assert a in s; s = s.replace(a, '''import {
  companionSystemPrompt,
  joinDirectives,
  personaAnchor,
} from "../../supabase/functions/_shared/companion-prompt.ts";''')
a = '''  const directive = withStoryDirective(null, branch.directive);'''
assert a in s; s = s.replace(a, '''  const directive = joinDirectives(withStoryDirective(null, branch.directive), personaAnchor(conv.persona, conv.speechLevel));''')
p.write_text(s)
print("i8 applied")
