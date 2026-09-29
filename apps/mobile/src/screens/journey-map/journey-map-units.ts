// 여정의 **고정 데이터와 파생**을 소유합니다 — 유닛 목록 · 에피소드 목록과
// `journeyUnits`·`journeyMapItems`·`journeySteps`·`journeyMapSections`·
// `initialCompletedStepCount`입니다. 타입은 `journey-map-types.ts`가 집니다.
//
// 배럴이 타입도 함께 내보내도록 여기서 재수출합니다 — 소비자가 타입과 값을 어느
// 파일에서 가져올지 고르지 않아도 되게 합니다.
//
// UI를 import하지 않습니다 — 화면 폴더 안에 있지만 화면 컴포넌트를 참조하지 않는
// 순수 모듈입니다.

import type {
  JourneyEpisode,
  JourneyEpisodes,
  JourneyEpisodeUnits,
  JourneyMapItem,
  JourneyMapSection,
  JourneyStep,
  JourneyUnit,
} from "./journey-map-types";

export type * from "./journey-map-types";

const tutorialUnits: JourneyEpisodeUnits = [
  // 에피소드의 첫 자리는 표지입니다 — 학습의 당위성을 주는 서사가 여기서 열리고,
  // 이것을 끝내야 그 에피소드의 나머지가 열립니다(`mapItemStatus`의 표지 게이트).
  // 전에는 유닛을 처음 여는 순간 결선이 가로채 표지를 띄웠습니다. 이제 표지가 스스로
  // 항목이라, 순서를 지는 자리가 **가로채기에서 맵의 잠김 파생으로** 옮겨 갔습니다.
  {
    kind: "special",
    id: "tutorial-intro",
    title: "에피소드 표지",
    screen: "episode-intro",
  },
  {
    kind: "standard",
    steps: [
      { id: "greeting", title: "첫 인사", description: "카페에서 처음 인사를 나눈다" },
      { id: "introduction", title: "이름 묻기", description: "상대의 이름을 묻고 자기를 소개한다" },
      { id: "ordering", title: "주문하기", description: "카페에서 마실 것을 주문한다" },
      { id: "appointment", title: "약속 잡기", description: "다음에 만날 날짜와 시간을 정한다" },
    ],
  },
  {
    kind: "special",
    id: "appointment-confirmation",
    title: "약속 확인 메시지",
    screen: "messenger",
  },
  {
    kind: "special",
    id: "appointment-confirmation-phone-call",
    title: "약속 확인 전화",
    screen: "phone-call",
  },
  {
    kind: "special",
    id: "cafe-arrival-visual-novel",
    title: "카페에 도착한 지민",
    screen: "visual-novel",
  },
  {
    kind: "standard",
    steps: [{ id: "directions", title: "길 묻기", description: "약속 장소까지 가는 길을 묻는다" }],
  },
  // 에피소드의 마지막은 최종 테스트입니다 — 서사와 에피소드에서 배운 표현을 모아 풀고
  // 에피소드를 끝냅니다. 같은 에피소드의 다른 항목을 모두 끝내야 열립니다(`mapItemStatus`).
  {
    kind: "special",
    id: "tutorial-final-test",
    title: "최종 테스트",
    screen: "episode-final",
  },
];

// 에피소드 목록입니다. **맵의 세로 줄 순서가 이 목록과 그 안 유닛 순서입니다.**
//
// ⚠ **이음매입니다** — 오늘 에피소드가 하나뿐인 것은 전사(轉寫)입니다. 지금 있는 컨텐츠
// (카페에서 지민을 만나는 줄기)를 튜토리얼로 두기로 한 판단이고(2026-09-26), 둘째부터는
// 컨텐츠가 오는 대로 늡니다. 「여정이 에피소드 하나다」라고 정해진 것이 아닙니다.
//
// 번호가 0인 것은 이 에피소드가 본편이 아니라 사용법을 익히는 자리이기 때문입니다.
const journeyEpisodes: JourneyEpisodes = [
  { kind: "filled", id: "tutorial", label: "Episode 0.", title: "Tutorial.", units: tutorialUnits },
];

// 모든 에피소드의 유닛을 목록 순서대로 이어 냅니다. 에피소드 경계를 모르는 소비자
// (스텝 파생 · 맵 항목 파생)가 이것을 씁니다.
// 준비 중 에피소드는 유닛이 없으므로 아무것도 보태지 않습니다 — 그래서 이 목록의 값이
// 준비 중 에피소드가 늘어도 **문자 그대로 같습니다**(`journeySteps`·`journeyMapItems`도
// 함께 그렇습니다).
const journeyUnits: readonly JourneyUnit[] = journeyEpisodes.flatMap((episode) =>
  episode.kind === "filled" ? episode.units : [],
);

// 특별 유닛 화면이 늘면 `default`의 `never` 대입이 컴파일 단계에서 섭니다(`render-screen.tsx`와
// 같은 형태입니다). 예전에는 마지막 갈래가 조건 없는 나머지여서 새 화면이 조용히 비주얼
// 노벨로 그려졌습니다.
function mapItemsOf(units: readonly JourneyUnit[]): readonly JourneyMapItem[] {
  return units.flatMap<JourneyMapItem>((unit) => {
    if (unit.kind === "standard") {
      return unit.steps.map((step) => ({ kind: "standard", step }) as const);
    }
    switch (unit.screen) {
      case "episode-intro": {
        return [{ kind: "episode-intro", id: unit.id, title: unit.title } as const];
      }
      case "messenger": {
        return [{ kind: "messenger", id: unit.id, title: unit.title } as const];
      }
      case "phone-call": {
        return [{ kind: "phone-call", id: unit.id, title: unit.title } as const];
      }
      case "visual-novel": {
        return [{ kind: "visual-novel", id: unit.id, title: unit.title } as const];
      }
      case "episode-final": {
        return [{ kind: "episode-final", id: unit.id, title: unit.title } as const];
      }
      default: {
        const exhaustive: never = unit;
        return exhaustive;
      }
    }
  });
}

export const journeyMapItems: readonly JourneyMapItem[] = mapItemsOf(journeyUnits);

/**
 * 유닛 목록에서 일반 유닛의 스텝만 목록 순서대로 이어 냅니다. 특별 유닛의 기여는
 * 0입니다.
 *
 * 던지지 않는 총함수입니다 — `kind`가 닫힌 판별자라 방어 분기도 `undefined` 반환도
 * 없습니다. 목록을 인자로 받는 것은 `findStep(steps, id)`와 같은 형태이고, 그래서 이
 * 함수는 픽스처로 검사됩니다.
 */
export function standardUnitSteps(units: readonly JourneyUnit[]): readonly JourneyStep[] {
  return units.flatMap((unit) => (unit.kind === "standard" ? unit.steps : []));
}

// 맵이 그리는 스텝들입니다. **유닛 목록에서 파생합니다** — 스텝을 따로 나열하면 유닛
// 목록과 그 나열이 어긋날 자리가 생깁니다(`journeyStepOrdinal`이 서수를 따로 안 적는
// 것과 같은 논리, ADR-0007 D3).
//
// ⟨정정 2026-09-29⟩ 여기 *"오늘 특별 유닛이 0건이기 때문"* 이라고 적혀 있었는데
// **거짓이 된 지 오래였습니다**(특별 유닛이 다섯입니다). 값이 파생 전과 같은 진짜 이유는
// `standardUnitSteps`가 특별 유닛의 기여를 0으로 두기 때문이고, 그것은 개수와 무관합니다.
export const journeySteps: readonly JourneyStep[] = standardUnitSteps(journeyUnits);

/**
 * 에피소드 목록을 맵의 구획으로 옮깁니다. **준비 중 에피소드는 구획을 만들지 않고**, 바로
 * 앞 채워진 에피소드의 `pendingNext`에 목록 순서대로 붙습니다.
 *
 * 던지지 않는 총함수입니다 — 인자의 첫 자리가 `JourneyFilledEpisode`로 닫혀 있어 붙을
 * 자리가 없는 준비 중 에피소드가 **타입에 없습니다.**
 *
 * **상한을 두지 않습니다** — 잇달아 오는 준비 중 전부가 한 구획에 붙습니다. 「다음 하나만」
 * 으로 자르면 데이터에 둘을 적었을 때 하나가 조용히 사라집니다.
 *
 * 목록을 인자로 받는 것은 `standardUnitSteps(units)`와 같은 형태이고, 그래서 이 함수는
 * **픽스처로 검사됩니다** — 오늘 데이터에는 「채워진 것 사이에 낀 준비 중」도 「준비 중
 * 둘」도 없습니다.
 */
export function mapSectionsOf(episodes: JourneyEpisodes): readonly JourneyMapSection[] {
  const sections: JourneyMapSection[] = [];
  for (const episode of episodes) {
    if (episode.kind === "filled") {
      sections.push({ episode, items: mapItemsOf(episode.units), pendingNext: [] });
      continue;
    }
    // 첫 자리가 `filled`로 닫혀 있어(`JourneyEpisodes`) 여기 닿을 때 `sections`가 비어 있을
    // 수 없습니다 — 그래서 방어 분기가 없습니다.
    const last = sections[sections.length - 1] as JourneyMapSection;
    sections[sections.length - 1] = { ...last, pendingNext: [...last.pendingNext, episode] };
  }
  return sections;
}

// 맵이 그리는 구획입니다. `journeyMapItems`와 같은 변환을 에피소드 안에서 돌립니다 —
// 두 곳이 갈리면 헤더 아래 유닛과 평평한 목록이 어긋나므로, 변환을 함수 하나로 두고
// 양쪽이 그것을 부릅니다.
export const journeyMapSections: readonly JourneyMapSection[] = mapSectionsOf(journeyEpisodes);

// 진행의 진실의 출처는 이제 App의 상태이고, 이 상수는 그 **씨앗**입니다 — 값(2)은
// 그대로이고 이름만 역할이 좁아진 것을 반영합니다. 옛 이름(`completedStepCount`)을
// 남기지 않습니다: 남기면 다른 모듈이 그것을 읽고 낡은 진행을 보면서도 통과합니다.
export const initialCompletedStepCount = 2;
