import { describe, expect, test } from "vitest";

import { catalogRoleplayLinesOf } from "../app/catalog-final-model";
import { bundledCatalogInput } from "./episode-bundled";
import { decodeEpisode } from "./episode-content";
import type { Episode } from "./episode-content";

// `unit` 계층: 새 내장본(2026-10-15.1)을 디코드한 결과에서 음성 id 배치와 최종 테스트 줄 규칙만 봅니다.
// 소리는 컷 · 대화 줄의 `ko`(문장)로 대조해 붙인 14개 id입니다(ADR-0060).

type EpisodeId = "u01-water" | "u02-checkin" | "u03-mina";
type Area = "prologue" | "dialogue" | "epilogue";

const EPISODE_IDS: readonly EpisodeId[] = ["u01-water", "u02-checkin", "u03-mina"];

/** [에피소드, 자리, 컷 index 또는 대화 seq, 음성 id, 그 자리의 한국어 문장] — 14개. */
const PLACEMENTS: readonly (readonly [EpisodeId, Area, number, string, string])[] = [
  ["u01-water", "prologue", 3, "u01-water/pre-3", "어서 오세요."],
  ["u01-water", "prologue", 6, "u01-water/d-01", "봉투 드릴까요?"],
  ["u01-water", "dialogue", 1, "u01-water/d-01", "봉투 드릴까요?"],
  ["u01-water", "dialogue", 2, "u01-water/d-02", "아니요, 괜찮아요."],
  ["u01-water", "dialogue", 3, "u01-water/d-03", "삼천 원입니다."],
  ["u01-water", "dialogue", 4, "u01-water/d-04", "카드로 할게요."],
  ["u01-water", "dialogue", 5, "u01-water/d-05", "영수증 드릴까요?"],
  ["u02-checkin", "prologue", 1, "u02-checkin/pre-1", "사장님, 손님 오셨어요!"],
  ["u02-checkin", "prologue", 3, "u02-checkin/pre-3", "어서 와요. 많이 걸었나 봐요."],
  ["u02-checkin", "prologue", 5, "u02-checkin/d-01", "이름이 어떻게 되세요?"],
  ["u02-checkin", "dialogue", 1, "u02-checkin/d-01", "이름이 어떻게 되세요?"],
  ["u02-checkin", "epilogue", 1, "u02-checkin/post-1", "아참, 마루에 올라갈 땐 신발 벗어 주세요."],
  [
    "u03-mina",
    "prologue",
    2,
    "u03-mina/pre-2",
    "아, 캐리어는 침대 밑에 넣으면 돼요. 저도 거기 넣었어요.",
  ],
  ["u03-mina", "prologue", 4, "u03-mina/d-01", "안녕하세요. 이름이 뭐예요?"],
  ["u03-mina", "dialogue", 1, "u03-mina/d-01", "안녕하세요. 이름이 뭐예요?"],
  ["u03-mina", "epilogue", 1, "u03-mina/post-1", "여기 백반집 가 봐요. 걸어서 오 분이에요."],
  [
    "u03-mina",
    "epilogue",
    3,
    "u03-mina/post-3",
    "저는 약속이 있어서요. 맛있었는지 내일 얘기해 줘요!",
  ],
];

function decoded(id: EpisodeId): Episode {
  const result = decodeEpisode(bundledCatalogInput.episodes[id]);
  if (!result.ok) throw new Error(`${id} 디코드 실패`);
  return result.episode;
}

type Located = { readonly key: string; readonly audioUrl: string | undefined; readonly ko: string };

function locate(episode: Episode): Located[] {
  const cutKo = (cut: Episode["prologue"][number]): string =>
    cut.kind === "narration" ? cut.narration.ko : cut.line.ko;
  return [
    ...episode.prologue.map((cut) => ({
      key: `prologue:${cut.index}`,
      audioUrl: cut.audioUrl,
      ko: cutKo(cut),
    })),
    ...episode.dialogue.map((line) => ({
      key: `dialogue:${line.seq}`,
      audioUrl: line.audioUrl,
      ko: line.text.ko,
    })),
    ...episode.epilogue.map((cut) => ({
      key: `epilogue:${cut.index}`,
      audioUrl: cut.audioUrl,
      ko: cutKo(cut),
    })),
  ];
}

describe("새 내장본의 음성 id", () => {
  test.each(EPISODE_IDS)("BF3. %s에서 id가 붙은 자리는 표의 자리뿐이고 id 값이 표와 같다", (id) => {
    const expected = Object.fromEntries(
      PLACEMENTS.filter(([episode]) => episode === id).map(([, area, at, audio]) => [
        `${area}:${at}`,
        audio,
      ]),
    );
    const actual = Object.fromEntries(
      locate(decoded(id)).flatMap((found) =>
        found.audioUrl === undefined ? [] : [[found.key, found.audioUrl]],
      ),
    );
    expect(actual).toEqual(expected);
  });

  test.each(PLACEMENTS)(
    "BF3. %s %s %i의 문장은 %s의 소리와 같은 한국어다",
    (id, area, at, audio, ko) => {
      const found = locate(decoded(id)).find((entry) => entry.key === `${area}:${at}`);
      expect(found?.audioUrl).toBe(audio);
      expect(found?.ko).toBe(ko);
    },
  );

  test("BF3. 쓰인 id 집합은 14개이고 에피소드 접두를 가진 서로 다른 값이다", () => {
    const used = new Set(
      EPISODE_IDS.flatMap((id) =>
        locate(decoded(id)).flatMap((f) => (f.audioUrl === undefined ? [] : [f.audioUrl])),
      ),
    );
    expect(used.size).toBe(14);
    expect([...used].sort()).toEqual([...new Set(PLACEMENTS.map(([, , , audio]) => audio))].sort());
  });

  test("BF2. u01 대화에서 소리가 없는 줄은 seq 6 ~ 9이고 키가 없다", () => {
    const dialogue = decoded("u01-water").dialogue;
    expect(dialogue.map((line) => line.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const line of dialogue.filter((entry) => entry.seq >= 6)) {
      expect("audioUrl" in line).toBe(false);
    }
  });
});

describe("새 내장본의 최종 테스트 줄", () => {
  test.each(EPISODE_IDS)(
    "BF4. %s의 모든 RP 문항이 대화의 상대 줄 · 플레이어 줄과 이어진다",
    (id) => {
      const episode = decoded(id);
      const turns = episode.finalTest.items.flatMap((item) =>
        item.type === "ROLEPLAY_TURN" ? [item] : [],
      );
      expect(turns.length).toBeGreaterThan(0);
      for (const turn of turns) {
        const lines = catalogRoleplayLinesOf(turn.roleplay.lineId, episode.dialogue);
        expect(lines).not.toBeNull();
        expect(lines?.counterpart.text.ko).toBe(turn.context.ko);
        expect(lines?.player.text.ko).toBe(turn.answers[0]?.ko);
      }
    },
  );

  test("BF4. RP 문항은 세 에피소드에 13개다", () => {
    const total = EPISODE_IDS.map((id) => decoded(id).finalTest.items.length);
    expect(total.reduce((sum, count) => sum + count, 0)).toBe(13);
  });
});
