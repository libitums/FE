import { vi } from "vitest";
import { act, fireEvent, screen } from "@lynx-js/react/testing-library";

import type { CatalogProgress } from "../../lib/catalog-progress";
import type { EpisodeFinalUnitId } from "../episode-final/episode-final.contract";
import type { EpisodeIntroUnitId } from "../episode-intro/episode-intro.contract";
import type { MessengerUnitId } from "../messenger/messenger.contract";
import type { PhoneCallUnitId } from "../phone-call/phone-call.contract";
import type { VisualNovelUnitId } from "../visual-novel/visual-novel.contract";
import { JourneyMapScreen } from "./JourneyMapScreen";
import { journeySteps } from "./journey-map";
import type { CatalogMapSection, JourneyMapCatalogProps } from "./catalog-map.contract";

// ui 계층 공용 대역입니다 — 호스트의 질의(`createSelectorQuery`)는 jsdom에 없으므로 여기서 세웁니다.
// 재는 값은 각 테스트가 정하고, 화면이 그 값으로 무엇을 하는지만 단언합니다.

export type Invocation = {
  readonly selector: string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
};

export type Rect = {
  readonly top: number;
  readonly height: number;
  readonly left?: number;
  readonly width?: number;
};

export type HostStub = {
  /** 선택자별 잰 값입니다. 표에 없으면 호스트가 값을 못 준 것처럼 답합니다. */
  readonly rects: Record<string, Rect>;
  /** 참을 주는 선택자의 `boundingClientRect` 답을 미룹니다. */
  defer: (selector: string) => boolean;
  readonly calls: Invocation[];
  /** 지금까지 쌓인 모든 호출 가운데 `boundingClientRect`가 아닌 것입니다. */
  readonly actions: () => Invocation[];
  readonly scrollTos: () => Invocation[];
  readonly scrollIntoViews: () => Invocation[];
  /** 잰 선택자 목록입니다(호출 순서). */
  readonly measured: () => string[];
  /** 미뤄 둔 답을 한꺼번에 줍니다. */
  readonly flush: () => void;
  /** 스크롤 상자에 스크롤 이벤트를 보냅니다. */
  readonly scroll: (scrollTop: number) => void;
};

export function stubHost(
  options: { measurable?: boolean; rects?: Record<string, Rect> } = {},
): HostStub {
  const measurable = options.measurable ?? true;
  const calls: Invocation[] = [];
  const rects: Record<string, Rect> = { ...options.rects };
  const pending: (() => void)[] = [];
  // 스크롤 이벤트의 대상은 요소가 아니라 NodesRef입니다 — 대역을 세우기 전에 진짜 질의를 쥐어 둡니다.
  const realQuery = lynx.createSelectorQuery.bind(lynx);

  const stub: HostStub = {
    rects,
    defer: () => false,
    calls,
    actions: () => calls.filter((call) => call.method !== "boundingClientRect"),
    scrollTos: () => calls.filter((call) => call.method === "scrollTo"),
    scrollIntoViews: () => calls.filter((call) => call.method === "scrollIntoView"),
    measured: () =>
      calls.filter((call) => call.method === "boundingClientRect").map((call) => call.selector),
    flush: () => {
      act(() => {
        pending.splice(0).forEach((answer) => answer());
      });
    },
    scroll: (scrollTop) => {
      const ref = realQuery().select("#journey-map-screen-scroll");
      act(() => {
        fireEvent.scroll(ref as unknown as Element, { detail: { scrollTop } });
      });
    },
  };

  vi.spyOn(lynx, "createSelectorQuery").mockImplementation(
    () =>
      ({
        select: (selector: string) => ({
          invoke: (invokeOptions: {
            method: string;
            params?: Record<string, unknown>;
            success?: (res: unknown) => void;
            fail?: (res: unknown) => void;
          }) => ({
            exec: () => {
              calls.push({
                selector,
                method: invokeOptions.method,
                ...(invokeOptions.params === undefined ? {} : { params: invokeOptions.params }),
              });
              if (invokeOptions.method !== "boundingClientRect") {
                return;
              }
              const answer = () => {
                if (measurable) {
                  invokeOptions.success?.(rects[selector]);
                } else {
                  invokeOptions.fail?.({ code: 5 });
                }
              };
              if (stub.defer(selector)) {
                pending.push(answer);
              } else {
                answer();
              }
            },
          }),
        }),
      }) as unknown as ReturnType<typeof lynx.createSelectorQuery>,
  );
  return stub;
}

/** 맵 상자에 터치 시작을 보냅니다 — 사용자가 맵을 손댄 것입니다. */
export function touchMap(): void {
  act(() => {
    fireEvent.touchstart(screen.getByTestId("journey-map-screen-map"), {});
  });
}

export type TutorialProgressProps = {
  readonly completedStepCount: number;
  readonly completedEpisodeIntroIds: readonly EpisodeIntroUnitId[];
  readonly completedMessengerUnitIds: readonly MessengerUnitId[];
  readonly completedPhoneCallUnitIds: readonly PhoneCallUnitId[];
  readonly completedVisualNovelUnitIds: readonly VisualNovelUnitId[];
  readonly completedEpisodeFinalIds: readonly EpisodeFinalUnitId[];
};

export const noProgress: TutorialProgressProps = {
  completedStepCount: 0,
  completedEpisodeIntroIds: [],
  completedMessengerUnitIds: [],
  completedPhoneCallUnitIds: [],
  completedVisualNovelUnitIds: [],
  completedEpisodeFinalIds: [],
};

/** 표지 + 스텝 둘 완료 — 다음 유닛은 `ordering`입니다. */
export const twoStepsDone: TutorialProgressProps = {
  ...noProgress,
  completedStepCount: 2,
  completedEpisodeIntroIds: ["tutorial-intro"],
};

/** 표지 + 스텝 셋 완료 — 다음 유닛은 `appointment`입니다. */
export const threeStepsDone: TutorialProgressProps = { ...twoStepsDone, completedStepCount: 3 };

/** 튜토리얼 전부 완료 — 마지막 완료는 `tutorial-final-test`입니다. */
export const tutorialAllDone: TutorialProgressProps = {
  completedStepCount: journeySteps.length,
  completedEpisodeIntroIds: ["tutorial-intro"],
  completedMessengerUnitIds: ["appointment-confirmation"],
  completedPhoneCallUnitIds: ["appointment-confirmation-phone-call"],
  completedVisualNovelUnitIds: ["cafe-arrival-visual-novel"],
  completedEpisodeFinalIds: ["tutorial-final-test"],
};

export const catalogLessonKeys = ["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];

// 제목은 한 낱말로 둡니다 — 머리 카드가 긴 제목을 줄로 나누므로 텍스트 노드가 하나여야 `getByText`가 집습니다.
export const catalogReadySections: readonly CatalogMapSection[] = [
  ready("u01-water", 1, "Alley"),
  ready("u02-checkin", 2, "Lobby"),
  ready("u03-mina", 3, "Dorm"),
];

function ready(episodeId: string, ordinal: number, title: string): CatalogMapSection {
  return {
    kind: "catalog-ready",
    episodeId,
    ordinal,
    title,
    lessonKeys: catalogLessonKeys,
    finalKey: "RP",
    completionKeys: ["RP"],
  };
}

export function catalogProps(
  options: { sections?: readonly CatalogMapSection[]; progress?: CatalogProgress } = {},
): JourneyMapCatalogProps {
  return {
    sections: options.sections ?? catalogReadySections,
    progress: options.progress ?? {},
    onStartCover: vi.fn<(episodeId: string) => void>(),
    onStartUnit: vi.fn<(episodeId: string, unitKey: string) => void>(),
  };
}

export function mapScreen(
  options: { progress?: TutorialProgressProps; catalog?: JourneyMapCatalogProps } = {},
) {
  const progress = options.progress ?? noProgress;
  return (
    <JourneyMapScreen
      completedStepCount={progress.completedStepCount}
      onStartStep={() => {}}
      completedEpisodeIntroIds={progress.completedEpisodeIntroIds}
      onStartEpisodeIntroUnit={() => {}}
      completedMessengerUnitIds={progress.completedMessengerUnitIds}
      onStartMessengerUnit={() => {}}
      completedPhoneCallUnitIds={progress.completedPhoneCallUnitIds}
      onStartPhoneCallUnit={() => {}}
      completedVisualNovelUnitIds={progress.completedVisualNovelUnitIds}
      onStartVisualNovelUnit={() => {}}
      completedEpisodeFinalIds={progress.completedEpisodeFinalIds}
      onStartEpisodeFinal={() => {}}
      {...(options.catalog === undefined ? {} : { catalog: options.catalog })}
    />
  );
}

// 말풍선이 재는 선택자 둘 · 자동 스크롤이 재는 선택자 셋의 공통 값입니다.
export const scrollSelector = "#journey-map-screen-scroll";
