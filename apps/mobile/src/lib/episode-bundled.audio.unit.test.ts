import { describe, expect, test } from "vitest";

import { catalogRoleplayLinesOf } from "../app/catalog-final-model";
import { bundledCatalogInput } from "./episode-bundled";
import { decodeEpisode } from "./episode-content";
import type { Episode } from "./episode-content";

// `unit` 계층: 새 내장본(2026-10-23.1)을 디코드한 결과에서 음성 id 배치와 최종 테스트 줄 규칙만 봅니다.
// 소리는 컷 · 대화 줄의 `ko`(문장)로 대조해 붙인 42개 id입니다(ADR-0060). 2026-10-23.1판은 대화 모든 줄과
// 바뀐 문장의 컷(u03 통과 뒤 컷 1 등)에 새로 녹음한 id를 붙였습니다.

type EpisodeId = "u01-water" | "u02-checkin" | "u03-mina";
type Area = "prologue" | "dialogue" | "epilogue";

const EPISODE_IDS: readonly EpisodeId[] = ["u01-water", "u02-checkin", "u03-mina"];

/** [에피소드, 자리, 컷 index 또는 대화 seq, 음성 id, 그 자리의 한국어 문장] — 44자리, id 42개. */
const PLACEMENTS: readonly (readonly [EpisodeId, Area, number, string, string])[] = [
  ["u01-water", "prologue", 3, "u01-water/pre-3-v2", "어서 오세요."],
  ["u01-water", "prologue", 4, "u01-water/pre-4", "앗, 지나갈게요."],
  ["u01-water", "prologue", 6, "u01-water/pre-6-v2", "봉투 드릴까요?"],
  ["u01-water", "dialogue", 1, "u01-water/d-01", "봉투 드릴까요?"],
  ["u01-water", "dialogue", 2, "u01-water/d-02", "아니요, 괜찮아요."],
  ["u01-water", "dialogue", 3, "u01-water/d-03", "삼천 원입니다."],
  ["u01-water", "dialogue", 4, "u01-water/d-04", "카드로 할게요."],
  ["u01-water", "dialogue", 5, "u01-water/d-05", "영수증 드릴까요?"],
  ["u01-water", "dialogue", 6, "u01-water/d-06", "아니요, 영수증은 괜찮아요."],
  ["u01-water", "dialogue", 7, "u01-water/d-07", "감사합니다. 안녕히 가세요."],
  ["u01-water", "dialogue", 8, "u01-water/d-08", "따뜻한 물 주세요."],
  ["u01-water", "dialogue", 9, "u01-water/d-09", "네, 여기 있어요."],
  ["u01-water", "epilogue", 3, "u01-water/post-3", "어, 새로 오셨나 봐요?"],
  ["u02-checkin", "prologue", 1, "u02-checkin/pre-1-far", "사장님, 손님 오셨어요!"],
  [
    "u02-checkin",
    "prologue",
    2,
    "u02-checkin/pre-2",
    "마당을 쓸던 사람이 빗자루를 문 옆에 세워 두고 들어온다.",
  ],
  ["u02-checkin", "prologue", 3, "u02-checkin/pre-3", "어서 와요. 많이 걸었나 봐요."],
  ["u02-checkin", "prologue", 5, "u02-checkin/d-01", "이름이 어떻게 되세요?"],
  ["u02-checkin", "dialogue", 1, "u02-checkin/d-01", "이름이 어떻게 되세요?"],
  ["u02-checkin", "dialogue", 3, "u02-checkin/d-03", "네, 여권 좀 보여주세요."],
  ["u02-checkin", "dialogue", 4, "u02-checkin/d-04", "여권 여기 있어요."],
  ["u02-checkin", "dialogue", 5, "u02-checkin/d-05", "며칠 묵으시죠?"],
  ["u02-checkin", "dialogue", 6, "u02-checkin/d-06", "일주일 묵어요."],
  ["u02-checkin", "dialogue", 7, "u02-checkin/d-07", "방은 201호예요."],
  ["u02-checkin", "dialogue", 8, "u02-checkin/d-08", "와이파이 비밀번호가 뭐예요?"],
  ["u02-checkin", "dialogue", 9, "u02-checkin/d-09", "duruduru예요."],
  ["u02-checkin", "dialogue", 10, "u02-checkin/d-10", "체크아웃은 오전 11시 맞죠?"],
  ["u02-checkin", "dialogue", 11, "u02-checkin/d-11", "네 맞아요. 잘 쉬어요."],
  ["u02-checkin", "dialogue", 12, "u02-checkin/d-12", "방이 몇 층이에요?"],
  ["u02-checkin", "dialogue", 13, "u02-checkin/d-13", "삼 층이에요."],
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
  ["u03-mina", "dialogue", 3, "u03-mina/d-03", "저는 미나예요. 창가 쪽 침대 써요."],
  ["u03-mina", "dialogue", 4, "u03-mina/d-04", "미나 씨, 만나서 반가워요."],
  ["u03-mina", "dialogue", 5, "u03-mina/d-05-v2", "네, 저도 반가워요."],
  ["u03-mina", "dialogue", 6, "u03-mina/d-06", "미나 씨는 어느 나라에서 왔어요?"],
  ["u03-mina", "dialogue", 9, "u03-mina/d-09", "저는 이틀 먼저 왔는데 2주 있을 거예요."],
  ["u03-mina", "dialogue", 10, "u03-mina/d-10", "저는 일주일 묵어요."],
  ["u03-mina", "dialogue", 11, "u03-mina/d-11", "우리 친하게 지내요."],
  ["u03-mina", "dialogue", 12, "u03-mina/d-12", "미나 씨, 반가워요. 저는 학생이에요."],
  ["u03-mina", "dialogue", 13, "u03-mina/d-13", "아, 저도 학생이에요."],
  ["u03-mina", "epilogue", 1, "u03-mina/post-1", "여기 식당 가 봐요. 걸어서 오 분이에요."],
  [
    "u03-mina",
    "epilogue",
    3,
    "u03-mina/post-3-v2",
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

  test("BF3. 쓰인 id 집합은 42개이고 에피소드 접두를 가진 서로 다른 값이다", () => {
    const used = new Set(
      EPISODE_IDS.flatMap((id) =>
        locate(decoded(id)).flatMap((f) => (f.audioUrl === undefined ? [] : [f.audioUrl])),
      ),
    );
    expect(used.size).toBe(42);
    expect([...used].sort()).toEqual([...new Set(PLACEMENTS.map(([, , , audio]) => audio))].sort());
  });

  test("BF6. u03 통과 뒤 컷 1은 바뀐 문장으로 다시 녹음한 소리가 있다", () => {
    const found = locate(decoded("u03-mina")).find((entry) => entry.key === "epilogue:1");
    expect(found?.ko).toBe("여기 식당 가 봐요. 걸어서 오 분이에요.");
    expect(found?.audioUrl).toBe("u03-mina/post-1");
  });

  test("BF2. u01 대화는 seq 1 ~ 9 모든 줄에 소리가 있다", () => {
    const dialogue = decoded("u01-water").dialogue;
    expect(dialogue.map((line) => line.seq)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const line of dialogue) {
      expect(line.audioUrl).toBe(`u01-water/d-0${line.seq}`);
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
