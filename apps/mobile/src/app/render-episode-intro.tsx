// 에피소드 서사 route 셋(표지 · 서사 통화 · 학습 완료)을 화면으로 옮깁니다. `render-screen.tsx`에서 떼어 둔 것은 그
// 파일이 커서이고, `render-roleplay-screen.tsx`와 같은 갈래입니다.

import { EpisodeIntroScreen } from "../screens/episode-intro/EpisodeIntroScreen";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { PrologueCallScreen } from "../screens/episode-intro/PrologueCallScreen";
import { prologueCallFor } from "../screens/episode-intro/prologue-call";
// 튜토리얼 통화 상대(지민)의 얼굴입니다. 비주얼 노벨의 임시 그림을 그대로 씁니다 — 같은
// 인물이고, 같은 파일이라 번들에 두 번 실리지 않습니다. 화면 폴더끼리는 값을 주고받을 수
// 없어(`code.md` 「import」) 이 결선 자리가 가져와 내립니다.
import jiminPortrait from "../screens/visual-novel/assets/temporary/character-jimin-smile.png";
import { journeyMapSections } from "../screens/journey-map/journey-map";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

// 표지 route의 에피소드를 찾습니다. 없으면 던집니다 — 이 route를 쌓는 자리는 맵의
// 구획에서 에피소드를 찾아 온 결선 하나뿐입니다.
function findEpisode(episodeId: string) {
  const section = journeyMapSections.find((candidate) => candidate.episode.id === episodeId);
  if (section === undefined) {
    throw new Error(`맵에 없는 에피소드입니다: ${episodeId}`);
  }
  return section.episode;
}

function renderEpisodeIntroScreen(
  screen: Extract<Screen, { name: "episode-intro" }>,
  wiring: ScreenWiring,
) {
  const episode = findEpisode(screen.episodeId);
  return (
    <EpisodeIntroScreen
      insets={wiring.safeAreaInsets}
      label={episode.label}
      title={episode.title}
      onBack={wiring.onExitEpisodeIntro}
      onSkip={() => wiring.onSkipEpisodeIntro(screen.episodeId, screen.target)}
      onNext={() => wiring.onNextEpisodeIntro(screen.episodeId, screen.target)}
    />
  );
}

function renderPrologueCallScreen(
  screen: Extract<Screen, { name: "episode-prologue-call" }>,
  wiring: ScreenWiring,
) {
  const episode = findEpisode(screen.episodeId);
  // 없으면 던집니다 — 이 route를 쌓는 자리(`onNextEpisodeIntro`)가 통화가 있을 때만
  // 쌓습니다.
  const call = prologueCallFor(screen.episodeId);
  if (call === undefined) {
    throw new Error(`서사 통화가 없는 에피소드입니다: ${screen.episodeId}`);
  }
  return (
    <PrologueCallScreen
      insets={wiring.safeAreaInsets}
      episodeLabel={episode.label}
      call={call}
      callerPortrait={jiminPortrait}
      onComplete={() => wiring.onCompletePrologueCall(screen.episodeId)}
      onBack={wiring.onExitEpisodeIntro}
    />
  );
}

// 서사 통화를 마친 뒤의 학습 완료 화면입니다. 판정할 결과가 없어 결과는 빈 목록이고
// 판정은 늘 통과입니다 — 그래서 늘 실수 없음(PERFECT LESSON)이고 다시 하기가 없습니다. 지표 셋과 보상은 평가를 통과했을 때와 같은
// 값(규칙이 없어 0 · 임시값)입니다.
function renderPrologueCompleteScreen(
  screen: Extract<Screen, { name: "episode-prologue-complete" }>,
  wiring: ScreenWiring,
) {
  return (
    <LessonCompleteScreen
      results={[]}
      verdict="passed"
      streakDays={0}
      trophyCount={0}
      diamondCount={0}
      reward={lessonRewardPlaceholder}
      onExit={() => wiring.onExitPrologueComplete(screen.episodeId)}
    />
  );
}

type EpisodeIntroFlowScreen = Extract<
  Screen,
  { name: "episode-intro" | "episode-prologue-call" | "episode-prologue-complete" }
>;

export function renderEpisodeIntroFlow(screen: EpisodeIntroFlowScreen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "episode-intro":
      return renderEpisodeIntroScreen(screen, wiring);
    case "episode-prologue-call":
      return renderPrologueCallScreen(screen, wiring);
    case "episode-prologue-complete":
      return renderPrologueCompleteScreen(screen, wiring);
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
