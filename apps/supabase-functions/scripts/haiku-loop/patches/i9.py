"""9차 개선(i9) — 실데이터 정적(i8): 작은 모델이 대표 놀이를 지어내다 틀린다(「구이 + 고기 = 소고기구이!」 · 「하루미는 두 글자」 · 부산말이 아닌 말을
부산말로). 놀이를 지어내게 하지 말고 검증된 재료(덕수쌤 합성어 · 해준 부산말)를 프롬프트에 쥐여 준다 — `companion-persona-kits.ts`."""
import pathlib
root = pathlib.Path(__file__).resolve().parents[3] / "supabase/functions/_shared"
(root / "companion-persona-kits.ts").write_text('''// 인물의 대표 놀이 재료(2026-11-28 Haiku 평가 루프 i9). 작은 모델이 놀이 재료를 지어내다 틀리는 것(엉터리 합성어 · 부산말이 아닌 말)을 막으려고,
// 사람이 확인한 재료만 프롬프트 앞부분(캐시)에 싣는다. 인물 id가 없거나 표에 없으면 빈 글.

const kits: Readonly<Record<string, string>> = {
  duksu: `- Your word game — use only these checked word families (or a word you are completely sure of), give a hint and let the learner answer, never put the answer in the question:
  소 + 고기 = 소고기 · 돼지 + 고기 = 돼지고기 · 닭 + 고기 = 닭고기 · 불 + 고기 = 불고기 · 물 + 고기 = 물고기 (a fish, not meat)
  김 + 밥 = 김밥 · 비빔 + 밥 = 비빔밥 · 볶음 + 밥 = 볶음밥 · 눈 + 사람 = 눈사람 · 노래 + 방 = 노래방 · 빵 + 집 = 빵집 · 꽃 + 집 = 꽃집 · 한국 + 어 = 한국어`,
  haejun: `- Busan phrases you may teach (one at a time, always with the standard form; never call any other expression Busan dialect):
  뭐 하노? = 뭐 해? · 밥 묵었나? = 밥 먹었어? · 맞나? = 그래? 정말? · 억수로 = 엄청, 아주 · 고마 = 그만 · 단디 해라 = 조심해, 잘 챙겨`,
};

export function kitSection(characterId: string | undefined): string {
  const kit = characterId === undefined ? undefined : kits[characterId];
  return kit === undefined ? "" : `${kit}\\n`;
}
''')
p = root / "companion-prompt.ts"; s = p.read_text()
a = '''import { examplesFor, examplesSection } from "./companion-persona-examples.ts";'''
assert a in s; s = s.replace(a, a + '''\nimport { kitSection } from "./companion-persona-kits.ts";''')
a = '''${examplesSection(examplesFor(input.characterId, persona), persona.name)}'''
assert a in s; s = s.replace(a, a + '''${kitSection(input.characterId)}''')
p.write_text(s)
print("i9 applied")
