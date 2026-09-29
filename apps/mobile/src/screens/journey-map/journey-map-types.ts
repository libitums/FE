// 여정 도메인의 **타입만** 소유합니다 — 스텝 · 유닛 · 맵 항목 · 에피소드 · 구획입니다.
// 값 선언이 0건이라 이 파일은 의존 그래프의 **바닥**에 있고, 데이터와 파생을 지는
// `journey-map-units.ts`가 여기를 가져다 씁니다.
//
// ⟨2026-09-29⟩ 타입을 뗀 것은 `journey-map-units.ts`가 300줄 상한에 닿았기 때문이지만,
// 자른 자리는 크기가 아니라 **축**입니다 — 타입은 화면 계약만 보고 데이터를 안 보므로
// 한 방향으로만 의존합니다. 크기로 자르면 다음 사람이 새 타입을 어디 둘지 모릅니다.

import type {
  EpisodeFinalJourneyMapItemContract,
  EpisodeFinalJourneyUnitContract,
} from "../episode-final/episode-final.contract";
import type {
  EpisodeIntroJourneyMapItemContract,
  EpisodeIntroJourneyUnitContract,
} from "../episode-intro/episode-intro.contract";
import type {
  MessengerJourneyMapItemContract,
  MessengerJourneyUnitContract,
} from "../messenger/messenger.contract";
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
  | EpisodeIntroJourneyUnitContract
  | MessengerJourneyUnitContract
  | PhoneCallJourneyUnitContract
  | VisualNovelJourneyUnitContract
  | EpisodeFinalJourneyUnitContract;

/** 여정 맵이 그리는 항목입니다 — 표준 스텝 또는 특별 유닛 항목(표지·메신저·전화·비주얼 노벨·최종 테스트)입니다. */
export type JourneyMapItem =
  | { readonly kind: "standard"; readonly step: JourneyStep }
  | EpisodeIntroJourneyMapItemContract
  | MessengerJourneyMapItemContract
  | Omit<PhoneCallJourneyMapItemContract, "status">
  | Omit<VisualNovelJourneyMapItemContract, "status">
  | EpisodeFinalJourneyMapItemContract;

/**
 * 맵 항목 하나가 줄에서 어떤 상태로 서는가입니다. **항목이 지지 않고 파생이 냅니다** —
 * 항목에 적으면 진행과 어긋날 자리가 생깁니다(ADR-0007 D3).
 *
 * 어휘를 하나로 합친 것은 `locked`가 이제 **모든 항목 종류에 올 수 있기** 때문입니다 —
 * 전에는 잠김이 스텝 노드와 최종 테스트 둘에만 있어 종류마다 다른 타입을 썼습니다.
 * 잠김을 실제로 내는 파생은 `mapItemStatus`입니다(`journey-map-progress.ts`).
 */
export type JourneyMapItemStatus = "locked" | "available" | "completed";

/**
 * 에피소드를 가려내는 이름입니다.
 *
 * 유닛 id가 전부 닫힌 union인데 여기만 열려 있었습니다. 닫으면 에피소드 id의 오타가
 * 컴파일에 섭니다 — `"tutoria1"`을 쓰면 `TS2322`이고, 가까운 이름이 있으면
 * `TS2820`(`Did you mean …?`)입니다.
 *
 * ⟨2026-09-29⟩ **`customs`가 늘었습니다.** 전에 이 자리가 *"아직 없는 에피소드 이름을
 * 미리 넣지 않습니다"* 라고 적었는데, 그것은 **유닛이 없는 에피소드를 표현할 방법이
 * 없었을 때**의 규칙입니다. 이제 `JourneyPendingEpisode`가 그것을 지므로, 이름을 미리
 * 적는 것이 「데이터에 없는 값」이 아니라 **「아직 유닛이 없는 에피소드」라는 실재하는
 * 상태**가 됩니다.
 */
export type JourneyEpisodeId = "tutorial" | "customs";

/**
 * 에피소드 **가운데**에 올 수 있는 유닛입니다. 표지도 최종 테스트도 여기 올 수
 * 없습니다 — 그 둘은 자리가 정해져 있고, 자리가 정해진 것이 가운데에 또 서면
 * 「첫/마지막」이 뜻을 잃습니다.
 */
export type JourneyMiddleUnit = Exclude<
  JourneyUnit,
  EpisodeIntroJourneyUnitContract | EpisodeFinalJourneyUnitContract
>;

/**
 * 에피소드의 유닛 목록입니다. 첫 자리가 표지, 마지막 자리가 최종 테스트이고 **가운데는
 * 규칙이 없습니다** — 일반 학습과 서사 연계 학습을 유닛마다 자유롭게 섞습니다.
 *
 * 데이터 순서가 아니라 **타입**이 그 둘을 집니다. 순서로만 두면 최종 테스트를 가운데
 * 둬도 컴파일도 런타임도 통과합니다.
 *
 * 따라오는 것은 **최소 길이 둘**입니다(표지 + 최종). 그것이 도메인과 맞습니다 — 서사
 * 없는 에피소드도, 최종 테스트 없는 에피소드도 사용자 발화에 없습니다.
 */
export type JourneyEpisodeUnits = readonly [
  EpisodeIntroJourneyUnitContract,
  ...JourneyMiddleUnit[],
  EpisodeFinalJourneyUnitContract,
];

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
/**
 * 유닛을 묶는 한 덩어리입니다. 맵은 에피소드마다 위에 헤더를 세우고 그 아래에 그
 * 에피소드의 유닛을 줄로 세웁니다.
 *
 * `label`과 `title`이 갈려 있는 것은 디자인이 두 줄로 그리기 때문입니다 — 위가
 * 「Episode 0.」, 아래가 이름입니다. 한 문자열로 합치면 두 줄의 타이포가 서로 달라
 * 다시 쪼개야 합니다.
 */
export type JourneyFilledEpisode = {
  readonly kind: "filled";
  readonly id: JourneyEpisodeId;
  readonly label: string;
  readonly title: string;
  readonly units: JourneyEpisodeUnits;
};

/**
 * 아직 유닛이 없는 에피소드입니다. **`units` 필드가 아예 없습니다** — 없는 것을 빈 것으로
 * 표현하지 않습니다. `units: []`로 두면 「모든 에피소드는 표지와 최종을 갖는다」가 타입에
 * 적혀 있는데 값은 아니게 되고, 유닛을 읽는 자리마다 **빈 배열 확인을 잊을 수 있는**
 * 분기가 생깁니다.
 *
 * `label`과 `title`은 **있습니다.** 다음 이야기를 *보는* 것이 이 칸의 목적이라, 이름을
 * 못 보여 주면 칸이 아무것도 말하지 않습니다.
 */
export type JourneyPendingEpisode = {
  readonly kind: "pending";
  readonly id: JourneyEpisodeId;
  readonly label: string;
  readonly title: string;
};

/**
 * 에피소드의 **두 모양**입니다. 가르는 것은 진행이 아니라 **구조**입니다 — 유닛을 가진
 * 에피소드와 아직 유닛이 없는 에피소드는 **필드가 다릅니다.**
 *
 * 판별자를 `status`가 아니라 `kind`로 둔 것은 판단입니다. 이 저장소에서 `*Status`는 전부
 * **파생이 내는 표시 상태**이고 데이터가 지지 않습니다(ADR-0007 D3 —
 * `JourneyMapItemStatus`·`JourneyStepStatus`가 그렇습니다). 여기서 가르는 것은 표시가
 * 아니라 **어떤 필드가 존재하는가**라, `JourneyUnit.kind`·`JourneyMapItem.kind`와 같은
 * 축입니다.
 */
export type JourneyEpisode = JourneyFilledEpisode | JourneyPendingEpisode;

/**
 * 에피소드 목록입니다. **첫 자리는 반드시 채워진 에피소드**입니다.
 *
 * 왜 타입이 지나 — 준비 중 에피소드는 세로 줄에 구획을 만들지 않고 **앞선 채워진
 * 에피소드의 헤더 자리에** 칸으로 붙습니다. 목록이 준비 중으로 시작하면 그 칸에 **붙을
 * 자리가 없어** 파생이 값을 조용히 버리거나 던져야 합니다. 첫 자리를 타입이 지면 파생이
 * **총함수**가 되고 방어 분기가 0이 됩니다.
 *
 * `JourneyEpisodeUnits`가 첫/마지막을 지는 것과 같은 형태입니다 — 자리가 정해진 것은
 * 순서가 아니라 타입이 집니다.
 *
 * ⚠ **막지 못하는 것을 숨기지 않습니다.** 이 타입은 「준비 중이 채워진 것 사이에 낀」
 * 배치를 **막지 않습니다** — 그것은 표현 가능하고, 파생은 그 경우 앞 구획에 붙입니다.
 * 막을 이유가 없습니다: 「이 에피소드 다음은 아직이고 그 다음은 있다」가 뜻이 되는
 * 상태입니다.
 */
export type JourneyEpisodes = readonly [JourneyFilledEpisode, ...JourneyEpisode[]];

/**
 * 맵이 한 덩어리로 그리는 것입니다 — 에피소드 하나와 그 에피소드가 줄에 세우는 항목들입니다.
 *
 * **준비 중 에피소드도 구획을 만듭니다.** 머리(번호·이름)는 읽히고, 그 아래 유닛 자리가
 * 안개에 가려진 채 섭니다 — 「더 있는데 아직 준비 중」을 그 모양이 말합니다. 그래서
 * `episode`가 union인 채로 남고, 가르는 일은 화면이 `kind`로 합니다.
 *
 * `items`가 준비 중 구획에서는 **언제나 빈 목록**입니다. 가려진 자리에 서는 것은 **장식**
 * 이지 맵 항목이 아닙니다 — 누를 수도 없고 진행에 세어지지도 않으므로 데이터로 만들면
 * 「세어지지 않는 항목」이라는 표현 불가능한 상태가 생깁니다.
 */
export type JourneyMapSection = {
  readonly episode: JourneyEpisode;
  readonly items: readonly JourneyMapItem[];
};
