import { describe, expect, it } from "vitest";

import type {
  JourneyEpisodeId,
  JourneyMapItem,
  JourneyMapSection,
  JourneyStep,
} from "../journey-map/journey-map";
import {
  findRoleplaySection,
  premiumRoleplayAccessibilityLabel,
  premiumRoleplayLock,
  premiumRoleplayNotice,
  roleplayFormLabel,
  roleplayItemAccessibilityLabel,
  roleplayItemsFrom,
  roleplaySectionAccessibilityLabel,
  roleplaySectionsFrom,
} from "./roleplay-list";
import type {
  PremiumRoleplayItem,
  RoleplayEpisodeId,
  RoleplayItem,
  RoleplaySection,
} from "./roleplay-list.contract";

// fixture는 `JourneyMapItem`(type import)으로 이 파일 안에서 짓습니다 — 여정 폴더의
// **값**을 가져오지 않습니다(code.md 「import」). 실제 데이터 순서는 integration I1이
// 봅니다.

function standardStep(id: JourneyStep["id"]): JourneyMapItem {
  return { kind: "standard", step: { id, title: `스텝 ${id}`, description: `설명 ${id}` } };
}

const messengerItem: JourneyMapItem = {
  kind: "messenger",
  id: "appointment-confirmation",
  title: "약속 확인 메시지",
};

const phoneCallItem: JourneyMapItem = {
  kind: "phone-call",
  id: "appointment-confirmation-phone-call",
  title: "약속 확인 전화",
};

const visualNovelItem: JourneyMapItem = {
  kind: "visual-novel",
  id: "cafe-arrival-visual-novel",
  title: "카페에 도착한 지민",
};

const episodeIntroItem: JourneyMapItem = {
  kind: "episode-intro",
  id: "tutorial-intro",
  title: "에피소드 표지",
};

describe("roleplayItemsFrom", () => {
  it("R1. standard·special·phone-call·visual-novel·standard 입력에서 셋을 뽑고 form 순서·필드가 정확하다", () => {
    const input: readonly JourneyMapItem[] = [
      standardStep("greeting"),
      messengerItem,
      phoneCallItem,
      visualNovelItem,
      standardStep("directions"),
    ];

    const result = roleplayItemsFrom(input);

    expect(result).toHaveLength(3);
    expect(result.map((item) => item.form)).toEqual(["messenger", "phone-call", "visual-novel"]);
    expect(result[0]).toEqual({
      form: "messenger",
      unitId: "appointment-confirmation",
      title: "약속 확인 메시지",
    });
    expect(result[1]).toEqual({
      form: "phone-call",
      unitId: "appointment-confirmation-phone-call",
      title: "약속 확인 전화",
    });
    expect(result[2]).toEqual({
      form: "visual-novel",
      unitId: "cafe-arrival-visual-novel",
      title: "카페에 도착한 지민",
    });
    // 필드가 form·unitId·title뿐입니다 — toEqual이 초과 필드를 잡습니다.
    for (const item of result) {
      expect(Object.keys(item).sort()).toEqual(["form", "title", "unitId"]);
    }
  });

  it("R2. 입력 순서를 보존한다 — 비주얼 노벨이 메신저보다 앞선 fixture에서 출력도 그 순서다", () => {
    const input: readonly JourneyMapItem[] = [visualNovelItem, phoneCallItem, messengerItem];

    const result = roleplayItemsFrom(input);

    expect(result.map((item) => item.form)).toEqual(["visual-novel", "phone-call", "messenger"]);
  });

  it("R3. 일반 스텝만 있는 입력은 빈 배열을 낸다", () => {
    const input: readonly JourneyMapItem[] = [
      standardStep("greeting"),
      standardStep("introduction"),
      standardStep("ordering"),
    ];

    expect(roleplayItemsFrom(input)).toEqual([]);
  });

  // ⚠ **red가 아닙니다 — 회귀 파수꾼입니다.** 「빈 배열이 정답인 케이스」는 구현이
  // 없어도 초록입니다. 무엇을 지는가만 적습니다: 롤플레이는 **다시 연습하는 자리**이고,
  // 서사를 다시 보는 것은 연습이 아닙니다. 최종 테스트와 같은 판단입니다 — 그쪽은
  // 풀어서 에피소드를 끝내는 시험이라 다시 여는 자리가 아닙니다.
  it("[R-I1] 표지 항목은 롤플레이 항목을 0건 낸다", () => {
    expect(roleplayItemsFrom([episodeIntroItem])).toEqual([]);

    // 사이에 껴 있어도 앞뒤가 그대로 이어집니다 — 끝에 두면 slice로도 통과합니다.
    const input: readonly JourneyMapItem[] = [messengerItem, episodeIntroItem, visualNovelItem];

    expect(roleplayItemsFrom(input).map((item) => item.form)).toEqual([
      "messenger",
      "visual-novel",
    ]);
  });

  // R6 — roleplayItemsFrom 몫입니다. 같은 문구의 다른 R6는 roleplayItemAccessibilityLabel
  // 몫입니다.
  it("R6. 같은 입력을 두 번 불러도 같은 값이고 입력 배열이 변하지 않는다", () => {
    const input: readonly JourneyMapItem[] = [messengerItem, phoneCallItem, visualNovelItem];
    const snapshot = [...input];

    const first = roleplayItemsFrom(input);
    const second = roleplayItemsFrom(input);

    expect(first).toEqual(second);
    expect(input).toEqual(snapshot);
  });
});

describe("roleplayFormLabel", () => {
  it("R4. 세 형태 각각을 한국어 낱말로 사상한다", () => {
    expect(roleplayFormLabel("messenger")).toBe("메신저");
    expect(roleplayFormLabel("phone-call")).toBe("전화");
    expect(roleplayFormLabel("visual-novel")).toBe("비주얼 노벨");
  });
});

describe("roleplayItemAccessibilityLabel", () => {
  const fixtures: readonly RoleplayItem[] = [
    { form: "messenger", unitId: "appointment-confirmation", title: "약속 확인 메시지" },
    {
      form: "phone-call",
      unitId: "appointment-confirmation-phone-call",
      title: "약속 확인 전화",
    },
    { form: "visual-novel", unitId: "cafe-arrival-visual-novel", title: "카페에 도착한 지민" },
  ];

  it("R5. 세 fixture 항목 각각 `${title}, ${formLabel}`이고 완료됨·잠김을 포함하지 않는다", () => {
    expect(roleplayItemAccessibilityLabel(fixtures[0])).toBe("약속 확인 메시지, 메신저");
    expect(roleplayItemAccessibilityLabel(fixtures[1])).toBe("약속 확인 전화, 전화");
    expect(roleplayItemAccessibilityLabel(fixtures[2])).toBe("카페에 도착한 지민, 비주얼 노벨");

    for (const item of fixtures) {
      const label = roleplayItemAccessibilityLabel(item);
      expect(label).not.toContain("완료됨");
      expect(label).not.toContain("잠김");
    }
  });

  // R6 — roleplayItemAccessibilityLabel 몫입니다.
  it("R6. 같은 항목을 두 번 불러도 같은 값이다", () => {
    for (const item of fixtures) {
      expect(roleplayItemAccessibilityLabel(item)).toBe(roleplayItemAccessibilityLabel(item));
    }
  });
});

describe("roleplayItemAccessibilityLabel — 잠김", () => {
  it("R7. 잠긴 항목은 이름 뒤에 잠김이 붙는다", () => {
    expect(
      roleplayItemAccessibilityLabel(
        { form: "messenger", unitId: "appointment-confirmation", title: "약속 확인 메시지" },
        true,
      ),
    ).toBe("약속 확인 메시지, 메신저, 잠김");
  });
});

// 에피소드 유닛 목록의 **최소**입니다(`JourneyEpisodeUnits` = `[표지, ...가운데, 최종]`).
// 이 변환은 `units`를 읽지 않지만 타입이 최소 둘을 요구하므로 그 둘만 채웁니다 — 읽는
// 것은 이름 셋과 맵 항목입니다.
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

// 구획 fixture입니다.
//
// ⚠ **`id`의 캐스트는 의도한 것입니다.** `JourneyEpisodeId`는 오늘 데이터에 있는
// `"tutorial"` 하나로 닫혀 있고, 제품 코드는 그 닫힘에서 타입 안전을 얻습니다(에피소드
// id의 오타가 `tsc`에 섭니다). 아래 케이스들이 보는 것은 **다른 것** — 「에피소드가
// 여럿일 때 구획이 여럿 선다」는 일반성이고, 오늘 데이터에 에피소드가 하나뿐이라
// 그것을 보려면 아직 없는 에피소드를 일부러 지어내야 합니다. 두 목적이 다르므로
// 캐스트는 **이 픽스처 경계에만** 두고 제품 코드로 넘기지 않습니다. 없는 에피소드
// 이름을 union에 미리 넣는 것은 더 나쁩니다 — 데이터에 없는 것을 타입이 있다고 말하게
// 됩니다.
function journeySection(
  id: string,
  label: string,
  title: string,
  items: readonly JourneyMapItem[],
): JourneyMapSection {
  return {
    episode: { id: id as JourneyEpisodeId, label, title, units: [introUnit, finalUnit] },
    items,
  };
}

const tutorial = journeySection("tutorial", "Episode 0.", "Tutorial.", [
  standardStep("greeting"),
  messengerItem,
  phoneCallItem,
]);
const cafe = journeySection("cafe", "Episode 1.", "Cafe.", [
  standardStep("ordering"),
  visualNovelItem,
]);
const stepsOnly = journeySection("steps-only", "Episode 2.", "Steps.", [
  standardStep("directions"),
]);

describe("roleplaySectionsFrom", () => {
  it("S1. 에피소드마다 구획 하나를 내고 이름 셋과 롤플레이 항목을 옮긴다", () => {
    expect(roleplaySectionsFrom([tutorial], () => true)).toEqual([
      {
        episodeId: "tutorial",
        label: "Episode 0.",
        title: "Tutorial.",
        unlocked: true,
        items: [
          { form: "messenger", unitId: "appointment-confirmation", title: "약속 확인 메시지" },
          {
            form: "phone-call",
            unitId: "appointment-confirmation-phone-call",
            title: "약속 확인 전화",
          },
        ],
        premiumItems: [],
      },
    ]);
  });

  it("S2. 에피소드의 항목이 전부 끝났을 때만 열린다 — 일반 스텝도 센다", () => {
    const allButStep = (item: JourneyMapItem) => item.kind !== "standard";

    expect(roleplaySectionsFrom([tutorial], allButStep)[0]?.unlocked).toBe(false);
    expect(roleplaySectionsFrom([tutorial], () => true)[0]?.unlocked).toBe(true);
    expect(roleplaySectionsFrom([tutorial], () => false)[0]?.unlocked).toBe(false);
  });

  it("S3. 롤플레이 항목 하나만 안 끝나도 잠긴다", () => {
    const allButPhoneCall = (item: JourneyMapItem) => item.kind !== "phone-call";

    expect(roleplaySectionsFrom([tutorial], allButPhoneCall)[0]?.unlocked).toBe(false);
  });

  it("S4. 에피소드는 서로 따로 열린다 — 앞 에피소드만 끝났으면 앞만 열린다", () => {
    const tutorialItems = new Set(tutorial.items);

    const sections = roleplaySectionsFrom([tutorial, cafe], (item) => tutorialItems.has(item));

    expect(sections.map((section) => [section.episodeId, section.unlocked])).toEqual([
      ["tutorial", true],
      ["cafe", false],
    ]);
  });

  it("S5. 롤플레이 항목이 없는 에피소드는 구획을 만들지 않는다", () => {
    const sections = roleplaySectionsFrom([tutorial, stepsOnly, cafe], () => true);

    expect(sections.map((section) => section.episodeId)).toEqual(["tutorial", "cafe"]);
  });

  it("S6. 입력 순서를 보존하고 입력을 변형하지 않는다", () => {
    const input = [cafe, tutorial];

    const sections = roleplaySectionsFrom(input, () => false);

    expect(sections.map((section) => section.episodeId)).toEqual(["cafe", "tutorial"]);
    expect(input).toEqual([cafe, tutorial]);
  });

  it("S7. 에피소드가 없으면 빈 배열이다", () => {
    expect(roleplaySectionsFrom([], () => true)).toEqual([]);
  });
});

const openSection: RoleplaySection = {
  episodeId: "tutorial",
  label: "Episode 0.",
  title: "Tutorial.",
  unlocked: true,
  items: [],
  premiumItems: [],
};
// ⚠ `"cafe"`의 캐스트는 위 `journeySection`과 같은 이유입니다 — 「구획이 여럿일 때
// id로 고른다」를 보려면 둘째 에피소드가 있어야 하는데, 오늘 데이터에는 없습니다.
const lockedSection: RoleplaySection = {
  ...openSection,
  episodeId: "cafe" as RoleplayEpisodeId,
  unlocked: false,
};

describe("findRoleplaySection", () => {
  it("F1. 그 id의 구획을 돌려준다", () => {
    expect(findRoleplaySection([openSection, lockedSection], "cafe" as RoleplayEpisodeId)).toBe(
      lockedSection,
    );
  });

  // ⚠ 「없는 id」는 닫힌 union으로 **표현할 수 없는** 입력입니다 — 그래서 캐스트로
  // 짓습니다. 이 함수는 목록에서 찾는 총함수라 타입 밖의 값이 와도 던지지 않아야
  // 하고, 그것을 보는 케이스가 이것입니다.
  it("F2. 없는 id면 undefined다", () => {
    expect(findRoleplaySection([openSection], "unknown" as RoleplayEpisodeId)).toBeUndefined();
  });
});

describe("roleplaySectionAccessibilityLabel", () => {
  it("A1. 열린 구획은 두 줄을 이어 읽는다", () => {
    expect(roleplaySectionAccessibilityLabel(openSection)).toBe("Episode 0. Tutorial.");
  });

  it("A2. 잠긴 구획은 잠김과 여는 조건까지 말한다", () => {
    expect(roleplaySectionAccessibilityLabel(lockedSection)).toBe(
      "Episode 0. Tutorial., 잠김, 여정에서 이 에피소드를 끝내면 열립니다",
    );
  });
});

const wrongOrder: PremiumRoleplayItem = {
  id: "premium-wrong-order",
  title: "주문이 잘못 나왔어요",
  situation: "카페 직원에게 정중하게 말하기",
};

describe("roleplaySectionsFrom — 결제 롤플레이", () => {
  const premiumFor = (episodeId: string) => (episodeId === "tutorial" ? [wrongOrder] : []);

  it("P1. 에피소드마다 그 에피소드의 결제 롤플레이를 싣는다", () => {
    const sections = roleplaySectionsFrom([tutorial, cafe], () => true, premiumFor);

    expect(sections.map((section) => [section.episodeId, section.premiumItems])).toEqual([
      ["tutorial", [wrongOrder]],
      ["cafe", []],
    ]);
  });

  it("P2. 조회 함수를 주지 않으면 결제 롤플레이는 빈 목록이다", () => {
    expect(roleplaySectionsFrom([tutorial], () => true)[0]?.premiumItems).toEqual([]);
  });

  it("P3. 기본 롤플레이가 없어도 결제 롤플레이가 있으면 구획이 선다", () => {
    const sections = roleplaySectionsFrom(
      [stepsOnly],
      () => true,
      () => [wrongOrder],
    );

    expect(sections.map((section) => section.episodeId)).toEqual(["steps-only"]);
    expect(sections[0]?.items).toEqual([]);
  });

  it("P4. 결제 롤플레이는 해금 판정에 끼지 않는다 — 여정의 항목만 센다", () => {
    expect(roleplaySectionsFrom([tutorial], () => true, premiumFor)[0]?.unlocked).toBe(true);
    expect(roleplaySectionsFrom([tutorial], () => false, premiumFor)[0]?.unlocked).toBe(false);
  });
});

describe("premiumRoleplayLock", () => {
  it("L1. 에피소드를 끝내지 않았으면 에피소드 잠김이다", () => {
    expect(premiumRoleplayLock(lockedSection)).toBe("episode");
  });

  it("L2. 에피소드를 끝냈으면 결제 잠김이다", () => {
    expect(premiumRoleplayLock(openSection)).toBe("payment");
  });
});

describe("premiumRoleplayAccessibilityLabel", () => {
  it("A3. 에피소드 잠김은 잠김으로 읽는다", () => {
    expect(premiumRoleplayAccessibilityLabel(wrongOrder, "episode")).toBe(
      "주문이 잘못 나왔어요, 카페 직원에게 정중하게 말하기, 잠김",
    );
  });

  it("A4. 결제 잠김은 잠김이 아니라 플러스 전용으로 읽는다 — 여는 방법이 다르다", () => {
    expect(premiumRoleplayAccessibilityLabel(wrongOrder, "payment")).toBe(
      "주문이 잘못 나왔어요, 카페 직원에게 정중하게 말하기, 플러스 전용",
    );
  });
});

describe("premiumRoleplayNotice", () => {
  it("N1. 누른 항목의 제목을 싣고 준비 중임을 말한다", () => {
    expect(premiumRoleplayNotice(wrongOrder)).toBe(
      "「주문이 잘못 나왔어요」 롤플레이는 플러스 전용이에요. 플러스는 아직 준비 중이에요.",
    );
  });
});
