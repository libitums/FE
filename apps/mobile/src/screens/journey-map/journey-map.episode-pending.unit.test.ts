import { describe, expect, it } from "vitest";

import {
  episodePendingAccessibilityLabel,
  episodePendingLabel,
  journeyMapItems,
  journeyMapSections,
  journeySteps,
  mapSectionsOf,
} from "./journey-map";
import type {
  JourneyEpisodeId,
  JourneyEpisodes,
  JourneyEpisodeUnits,
  JourneyFilledEpisode,
  JourneyPendingEpisode,
} from "./journey-map";

// `unit` 계층: 순수 함수와 고정 데이터의 값만 봅니다 (ADR-0006 D4).
//
// 이 파일이 지는 한 축은 **준비 중 에피소드**입니다 — 유닛이 아직 없는 에피소드가
// 맵의 구획을 만들지 않고(R2) 앞 구획에 칸으로 붙는다는 것, 그리고 그 칸의 문면입니다.
// 기존 세 갈래(`.messenger` · `.episode-final` · `.visual-novel`)와 같은 이름 규칙입니다.

// 픽스처가 쓰는 최소 유닛 둘입니다. 유닛 목록이 `[표지, ...가운데, 최종]` 튜플이라
// **최소 길이가 둘**이고, 이 파일은 유닛을 읽지 않으므로 그 최소만 채웁니다.
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

const minimalUnits: JourneyEpisodeUnits = [introUnit, finalUnit];

// ⚠ **의도한 캐스트입니다.** `JourneyEpisodeId`가 실데이터의 둘로 닫혀 있어, 픽스처가
// 셋째·넷째 에피소드를 지으려면 타입 밖의 이름이 필요합니다. 제품 코드는 닫힌 union에서
// 타입 안전을 얻고(오타가 `tsc`에 섭니다), 이 케이스가 보는 것은 **에피소드가 여럿일 때의
// 일반성**입니다 — 두 목적이 다르므로 캐스트는 이 경계에만 둡니다. 없는 이름을 union에
// 미리 넣는 것은 더 나쁩니다: 데이터에 없는 것을 타입이 있다고 말하게 됩니다.
// 같은 형태의 선례가 `roleplay-list.unit.test.ts`·`roleplay-premium-items.unit.test.ts`에
// 있습니다.
function filled(id: string, title: string): JourneyFilledEpisode {
  return {
    kind: "filled",
    id: id as JourneyEpisodeId,
    label: `${title} 번호`,
    title,
    units: minimalUnits,
  };
}

function pending(id: string, title: string): JourneyPendingEpisode {
  return { kind: "pending", id: id as JourneyEpisodeId, label: `${title} 번호`, title };
}

describe("실데이터의 구획", () => {
  // **에피소드 하나가 구획 하나**입니다 — 준비 중도 예외가 아닙니다. 머리가 읽히고 그
  // 아래가 가려진 채 서기 때문에 그릴 자리가 있습니다.
  it("[U-S1] 준비 중 에피소드도 자기 구획을 만든다", () => {
    expect(journeyMapSections.map((section) => section.episode.id)).toEqual([
      "tutorial",
      "customs",
    ]);
  });

  it("[U-S2] 준비 중 구획은 유닛이 없고 머리 두 줄만 진다", () => {
    const pendingSection = journeyMapSections[1];

    expect(pendingSection?.episode).toEqual({
      kind: "pending",
      id: "customs",
      label: "Episode 1.",
      title: "Customs.",
    });
    // 가려진 자리에 서는 표식은 **장식**이라 맵 항목이 아닙니다 — 데이터로 만들면
    // 「눌리지도 세어지지도 않는 항목」이 생깁니다.
    expect(pendingSection?.items).toEqual([]);
  });

  // ⚠ **red가 아닙니다 — 파수꾼입니다.** 「고치는 김에 세로 맵을 건드리지 않았는가」를
  // 집니다. 준비 중 에피소드는 맵 항목을 0건 내므로 이 목록이 문자 그대로 같아야 합니다.
  it("[U-S3] 튜토리얼 구획의 항목이 열이고 순서가 그대로다", () => {
    expect(
      journeyMapSections[0]?.items.map((item) =>
        item.kind === "standard" ? `standard:${item.step.id}` : `${item.kind}:${item.id}`,
      ),
    ).toEqual([
      "episode-intro:tutorial-intro",
      "standard:greeting",
      "standard:introduction",
      "standard:ordering",
      "standard:appointment",
      "messenger:appointment-confirmation",
      "phone-call:appointment-confirmation-phone-call",
      "visual-novel:cafe-arrival-visual-novel",
      "standard:directions",
      "episode-final:tutorial-final-test",
    ]);
  });

  // ⚠ 파수꾼입니다. 공허하지 않은 이유: `episode.units`를 판별 없이 펴는 구현은
  // `TS2339`로 **먼저** 서고, 준비 중에서 `[]` 대신 던지는 구현이면 여기서 터집니다.
  it("[U-S4] 준비 중은 평평한 목록에도 0을 기여한다", () => {
    expect(journeySteps).toHaveLength(5);
    expect(journeyMapItems).toHaveLength(10);
  });
});

describe("mapSectionsOf", () => {
  it("[U-S5] 채워진 것 사이에 낀 준비 중도 제자리에 구획을 만든다", () => {
    const episodes: JourneyEpisodes = [filled("a", "A."), pending("b", "B."), filled("c", "C.")];

    const sections = mapSectionsOf(episodes);

    expect(sections.map((section) => section.episode.id)).toEqual(["a", "b", "c"]);
    expect(sections[1]?.items).toEqual([]);
  });

  // 상한이 없다는 것을 집니다 — 「다음 하나만」으로 자르면 둘째가 조용히 사라집니다.
  it("[U-S6] 잇달아 오는 준비 중이 전부 목록 순서대로 선다", () => {
    const episodes: JourneyEpisodes = [filled("a", "A."), pending("b", "B."), pending("c", "C.")];

    const sections = mapSectionsOf(episodes);

    expect(sections.map((section) => section.episode.id)).toEqual(["a", "b", "c"]);
    expect(
      sections.every((section) => section.episode.kind === "pending" || section.items.length > 0),
    ).toBe(true);
  });

  it("[U-S7] 준비 중이 없어도 구조가 같다", () => {
    const episodes: JourneyEpisodes = [filled("a", "A."), filled("b", "B."), filled("c", "C.")];

    const sections = mapSectionsOf(episodes);

    expect(sections.map((section) => section.episode.id)).toEqual(["a", "b", "c"]);
    expect(sections.every((section) => section.items.length > 0)).toBe(true);
  });
});

describe("준비 중 칸의 문면", () => {
  // 에피소드 이름이 영문이라 결을 맞춥니다 — 그 옆에 한글 한 낱말이 서면 두 글자체가
  // 한 덩어리 안에서 부딪힙니다.
  it("[U-N1] 보이는 문구가 영문 「COMING SOON」이다", () => {
    expect(episodePendingLabel).toBe("COMING SOON");
  });

  // ⚠ **보이는 문구와 일부러 다릅니다.** 보이는 쪽은 디자인의 영문이고 듣는 쪽은 이 앱의
  // 말입니다 — 스텝의 `, 잠김`과 같은 부호·같은 자리라, 여기만 영문이면 낭독에서 혼자
  // 튑니다.
  it("[U-N2] 낭독은 한국어로 이름 뒤에 상태를 붙인다", () => {
    expect(episodePendingAccessibilityLabel("Episode 1.", "Customs.")).toBe(
      "Episode 1. Customs., 준비 중",
    );
  });
});
