// 여정 도메인 타입과 고정 데이터를 소유합니다 — 유닛·스텝·맵 항목 타입과
// `journeyUnits`·`journeyMapItems`·`journeySteps`·`initialCompletedStepCount`입니다.
// UI를 import하지 않습니다 — 화면 폴더 안에 있지만 화면 컴포넌트를 참조하지 않는
// 순수 모듈입니다.

import type { MessengerConversation, MessengerUnitId } from "../messenger/messenger.contract";
import type {
  PhoneCallJourneyUnitContract,
  PhoneCallJourneyMapItemContract,
} from "../phone-call/phone-call.contract";
import type {
  VisualNovelJourneyMapItemContract,
  VisualNovelJourneyUnitContract,
} from "../visual-novel/visual-novel.contract";

export type JourneyStepId = "greeting" | "introduction" | "ordering" | "appointment" | "directions";

export type JourneyStepStatus = "done" | "current" | "locked";

export type JourneyStep = {
  readonly id: JourneyStepId;
  readonly title: string;
  readonly description: string;
};

/**
 * 여정의 한 마디입니다. **유형이 유닛을 따라갑니다**(`docs/screens.md` 「유닛」).
 *
 * 판별 union이고 옵셔널 필드가 없습니다 — `steps?`를 두면 「스텝이 없을 수도 있는
 * 유닛」이 타입에 생기고 그 분기를 소비자 전부가 지게 됩니다(`docs/conventions/code.md`
 * 「임시 입력값의 이음매」의 「옵셔널 금지」).
 *
 * **특별 유닛은 스텝을 갖지 않습니다** — 기본 학습형은 일반 유닛에서만 돌기
 * 때문입니다. 그래서 `learningFormByStep`의 정의역이 「일반 유닛의 스텝 전부」로
 * 좁혀지고, 그 좁힘을 `Record`의 키가 집니다.
 *
 * **`special`이 오늘 아무 필드도 지지 않는 것은 판단입니다** — 그 항목이 무엇을
 * 지고 갈지는 그 유닛으로 가는 화면이 정합니다. 지금 필드를 정하면 화면 없이 그
 * 모양이 굳습니다.
 */
export type JourneyUnit =
  | { readonly kind: "standard"; readonly steps: readonly JourneyStep[] }
  | {
      readonly kind: "special";
      readonly id: MessengerUnitId;
      readonly title: "약속 확인 메시지";
      readonly screen: "messenger";
    }
  | PhoneCallJourneyUnitContract
  | VisualNovelJourneyUnitContract;

/** 여정 맵이 그리는 항목입니다 — 표준 스텝 또는 특별 유닛 항목(메신저·전화·비주얼 노벨)입니다. */
export type JourneyMapItem =
  | { readonly kind: "standard"; readonly step: JourneyStep }
  | {
      readonly kind: "special";
      readonly id: MessengerUnitId;
      readonly title: MessengerConversation["title"];
    }
  | Omit<PhoneCallJourneyMapItemContract, "status">
  | Omit<VisualNovelJourneyMapItemContract, "status">;

// 여정의 유닛 목록입니다. **맵의 세로 줄 순서가 이 목록의 순서입니다.**
//
// ⚠ **이음매입니다**(`docs/conventions/code.md` 「임시 입력값의 이음매」).
//
// **무엇이 임시인가** — 이 목록에 특별 유닛 항목이 **0건인 것**이 임시입니다. 왼쪽의
// `kind`와 오른쪽의 타입은 임시가 아닙니다. `culture-quiz.ts`의 문항 표가 「빈 것이
// 임시다」라고 적은 것과 같은 종류이고, `culture.ts`의 서사 표(「차 있는데도
// 임시」)와 반대입니다.
//
// **왜 빈 채로 둘 수 있나** — 목록이라 원소 0을 표현할 수 있습니다. `Record<K, union>`이
// 빈 값을 못 갖는 것과 갈리는 자리입니다.
//
// **이 목록이 배정 근거가 아닙니다** — 오늘 항목이 일반 유닛 하나인 것은 전사(轉寫)입니다.
// 유닛 경계가 맵에도 문서에도 그려진 적이 없어 경계를 하나로 옮긴 것이지, 「여정이
// 유닛 하나다」라고 정해진 것이 아닙니다.
//
// **무엇이 막고 있나** — 어느 유닛이 특별한지는 컨텐츠 판단이고, 특별 유닛이 열 화면은
// 아직 정해지지 않았습니다. 갈 곳은 `docs/adr/README.md` 보류 표의 「특별 유닛의 구성과
// 컨텐츠」 행입니다.
//
// **값이 오는 날 무엇이 바뀌나** — 이 목록에 항목이 늘고, 그 항목이 지는 필드와 맵의
// 노드 컴포넌트가 함께 늘어납니다. ⚠ **여기서만 앞선 이음매들과 갈립니다** —
// `learningFormByStep`·`cultureNarrativeByStep`이 *"형태는 한 글자도 안 바뀝니다"* 라고
// 적을 수 있었던 것은 그 표의 타입이 이미 완성돼 있었기 때문입니다. 이 목록은 특별
// 변형이 **필드를 얻으면서** 옵니다. 그 문장을 여기 복사하지 않습니다.
const journeyUnits: readonly JourneyUnit[] = [
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
];

export const journeyMapItems: readonly JourneyMapItem[] = journeyUnits.flatMap<JourneyMapItem>(
  (unit) =>
    unit.kind === "standard"
      ? unit.steps.map((step) => ({ kind: "standard", step }) as const)
      : unit.screen === "messenger"
        ? [{ kind: "special", id: unit.id, title: unit.title } as const]
        : unit.screen === "phone-call"
          ? [{ kind: "phone-call", id: unit.id, title: unit.title } as const]
          : [{ kind: "visual-novel", id: unit.id, title: unit.title } as const],
);

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
// 타입도 값도 순서도 파생 전과 문자 그대로 같습니다 — 오늘 특별 유닛이 0건이기
// 때문입니다.
export const journeySteps: readonly JourneyStep[] = standardUnitSteps(journeyUnits);

// 진행의 진실의 출처는 이제 App의 상태이고, 이 상수는 그 **씨앗**입니다 — 값(2)은
// 그대로이고 이름만 역할이 좁아진 것을 반영합니다. 옛 이름(`completedStepCount`)을
// 남기지 않습니다: 남기면 다른 모듈이 그것을 읽고 낡은 진행을 보면서도 통과합니다.
export const initialCompletedStepCount = 2;
