import { describe, expect, it } from "vitest";

import type { JourneyEpisode, JourneyMapItem, JourneyMapSection } from "../journey-map/journey-map";
import { completeEpisodeIntroUnit, episodeOfIntroUnit } from "./episode-intro";
import type { EpisodeIntroUnitId } from "./episode-intro.contract";

// `unit` 계층: 순수 함수의 입출력만 봅니다 (ADR-0006 D4). 구획은 이 파일 안에서 짓습니다
// — 여정 폴더의 **값**을 가져오지 않습니다(code.md 「import」).
//
// ⟨개정⟩ `sectionOfTarget` · `hasSeenEpisodeIntro` · `markEpisodeIntroSeen`을 지는 케이스가
// 사라졌습니다. 세 함수가 이번에 없어집니다 — 표지가 스스로 유닛이 되면서 **가로채는
// 게이트가 걷혔고**, 그래서 「넘긴 뒤 열 유닛」(`EpisodeIntroTarget`)도 「봤다」는 어휘도
// 설 자리가 없습니다. 「봤다」는 「끝냈다」가 되어 다른 특별 유닛 넷과 한 낱말로 읽힙니다.

// 표지 유닛과 최종 테스트 유닛입니다. 에피소드의 유닛 목록은 `[표지, ...가운데, 최종]`
// 튜플이라 **최소 길이가 둘**입니다 — 아래 픽스처가 그 최소를 채웁니다.
const introUnit = {
  kind: "special",
  id: "tutorial-intro",
  title: "에피소드 표지",
  screen: "episode-intro",
} as const;

const finalUnit = {
  kind: "special",
  id: "tutorial-final-test",
  title: "최종 테스트",
  screen: "episode-final",
} as const;

// ⚠ `units`는 이 함수가 보지 않습니다 — 찾는 축은 구획의 **맵 항목**(`items`)입니다.
// 타입이 요구하는 최소 튜플만 채우고, 갈림은 `items`로만 줍니다.
function section(title: string, items: readonly JourneyMapItem[]): JourneyMapSection {
  return {
    episode: { id: "tutorial", label: "Episode 0.", title, units: [introUnit, finalUnit] },
    items,
  };
}

const introItem: JourneyMapItem = {
  kind: "episode-intro",
  id: "tutorial-intro",
  title: "에피소드 표지",
};

// 표지 항목이 **없는** 구획입니다. 첫 자리에 두어, 구획을 훑지 않고 `sections[0]`을
// 돌려주는 구현이 통과하지 않게 합니다.
const withoutIntro = section("표지 없는 구획", [
  { kind: "standard", step: { id: "ordering", title: "주문하기", description: "" } },
  { kind: "messenger", id: "appointment-confirmation", title: "약속 확인 메시지" },
]);

const withIntro = section("Tutorial.", [
  introItem,
  { kind: "standard", step: { id: "greeting", title: "첫 인사", description: "" } },
]);

const sections: readonly JourneyMapSection[] = [withoutIntro, withIntro];

describe("episodeOfIntroUnit", () => {
  it("[EI-U1] 그 표지 유닛이 속한 에피소드를 돌려준다", () => {
    const episode: JourneyEpisode = episodeOfIntroUnit(sections, "tutorial-intro");

    expect(episode).toBe(withIntro.episode);
    // 구획이 아니라 **에피소드**를 돌려줍니다 — 표지 화면이 쓰는 것은 머리 두 줄
    // (`label` · `title`)이고, 맵 항목 목록이 아닙니다.
    expect(episode.label).toBe("Episode 0.");
    expect(episode.title).toBe("Tutorial.");
  });

  // ⚠ **red가 아닙니다 — 회귀 파수꾼입니다.** 「무조건 던지는」 스텁도 이 케이스를
  // 통과합니다. 무엇을 지는가만 적습니다: 표지 route는 맵의 표지 항목을 누른 데서만
  // 오므로, 어느 구획에도 없다면 **데이터 오류**이고 값으로 표현할 수 있는 상태가
  // 아닙니다. `undefined`를 돌려주면 그 판단이 소비자에게 흩어집니다.
  it("[EI-U2] 어느 구획에도 없는 표지 유닛이면 던진다", () => {
    // 문면까지 겁니다 — 인자 없는 `toThrow()`는 **어떤 오류든** 통과시켜, 구현이
    // 엉뚱한 곳에서 터져도 초록이 됩니다. 「무조건 던지는 스텁도 통과한다」는 이
    // 케이스에서 특히 그렇습니다.
    expect(() => episodeOfIntroUnit([], "tutorial-intro")).toThrow(
      "어느 에피소드에도 없는 표지 유닛입니다: tutorial-intro",
    );
    expect(() => episodeOfIntroUnit([withoutIntro], "tutorial-intro")).toThrow(
      "어느 에피소드에도 없는 표지 유닛입니다: tutorial-intro",
    );
  });
});

describe("completeEpisodeIntroUnit", () => {
  it("[EI-U3] 끝낸 표지를 더하고 입력을 변형하지 않는다", () => {
    const ids: readonly EpisodeIntroUnitId[] = [];

    expect(completeEpisodeIntroUnit(ids, "tutorial-intro")).toEqual(["tutorial-intro"]);
    expect(ids).toEqual([]);
  });

  // 멱등입니다. **같은 참조**인 것까지 답니다 — 새 배열을 내면 값이 같아도 아래로
  // 내려가는 참조가 바뀌어 다시 그릴 이유가 없는 화면이 다시 그려집니다.
  // `completeMessengerUnit`과 같은 형태입니다.
  it("[EI-U3] 이미 있으면 같은 참조를 돌려준다", () => {
    const ids: readonly EpisodeIntroUnitId[] = ["tutorial-intro"];

    expect(completeEpisodeIntroUnit(ids, "tutorial-intro")).toBe(ids);
    expect(
      completeEpisodeIntroUnit(completeEpisodeIntroUnit(ids, "tutorial-intro"), "tutorial-intro"),
    ).toBe(ids);
  });
});
