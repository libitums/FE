import { describe, expect, it } from "vitest";

import type { JourneyMapItem, JourneyMapSection, JourneyStep } from "../journey-map/journey-map";
import {
  findRoleplaySection,
  roleplayFormLabel,
  roleplayItemAccessibilityLabel,
  roleplayItemsFrom,
  roleplaySectionAccessibilityLabel,
  roleplaySectionsFrom,
} from "./roleplay-list";
import type { RoleplayItem, RoleplaySection } from "./roleplay-list.contract";

// fixture는 `JourneyMapItem`(type import)으로 이 파일 안에서 짓습니다 — 여정 폴더의
// **값**을 가져오지 않습니다(code.md 「import」). 실제 데이터 순서는 integration I1이
// 봅니다.

function standardStep(id: JourneyStep["id"]): JourneyMapItem {
  return { kind: "standard", step: { id, title: `스텝 ${id}`, description: `설명 ${id}` } };
}

const messengerItem: JourneyMapItem = {
  kind: "special",
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

// 구획 fixture입니다. 에피소드의 `units`는 이 변환이 읽지 않으므로 비워 둡니다 — 읽는
// 것은 이름 셋과 맵 항목입니다.
function journeySection(
  id: string,
  label: string,
  title: string,
  items: readonly JourneyMapItem[],
): JourneyMapSection {
  return { episode: { id, label, title, units: [] }, items };
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
};
const lockedSection: RoleplaySection = { ...openSection, episodeId: "cafe", unlocked: false };

describe("findRoleplaySection", () => {
  it("F1. 그 id의 구획을 돌려준다", () => {
    expect(findRoleplaySection([openSection, lockedSection], "cafe")).toBe(lockedSection);
  });

  it("F2. 없는 id면 undefined다", () => {
    expect(findRoleplaySection([openSection], "unknown")).toBeUndefined();
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
