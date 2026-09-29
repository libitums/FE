// 에피소드 표지 route 넷(표지 · 서사 · 서사 통화 · 학습 완료)을 화면으로 옮깁니다. `render-screen.tsx`에서 떼어 둔 것은 그
// 파일이 커서이고, `render-roleplay-screen.tsx`와 같은 갈래입니다.

import { EpisodeIntroScreen } from "../screens/episode-intro/EpisodeIntroScreen";
import { EpisodeNarrativeScreen } from "../screens/episode-narrative/EpisodeNarrativeScreen";
import { LessonCompleteScreen } from "../screens/lesson-complete/LessonCompleteScreen";
import { lessonRewardPlaceholder } from "../screens/lesson-complete/lesson-complete";
import { PrologueCallScreen } from "../screens/episode-intro/PrologueCallScreen";
import { PrologueChatScreen } from "../screens/episode-intro/PrologueChatScreen";
import type { EpisodeIntroUnitId } from "../screens/episode-intro/episode-intro.contract";
// 튜토리얼 통화 상대(지민)의 얼굴입니다. 비주얼 노벨의 임시 그림을 그대로 씁니다 — 같은
// 인물이고, 같은 파일이라 번들에 두 번 실리지 않습니다. 화면 폴더끼리는 값을 주고받을 수
// 없어(`code.md` 「import」) 이 결선 자리가 가져와 내립니다.
import jiminPortrait from "../screens/visual-novel/assets/temporary/character-jimin-smile.png";
import { episodeOfIntroUnit } from "../screens/episode-intro/episode-intro";
import { journeyMapSections } from "../screens/journey-map/journey-map";
import type { Screen } from "./nav-state";
import type { ScreenWiring } from "./screen-wiring";

// route가 싣는 것은 **표지 유닛 id 하나**이고, 에피소드는 거기서 파생합니다 — 없으면
// 던집니다(`episodeOfIntroUnit`). 이 route를 쌓는 자리는 맵의 표지 항목 하나뿐입니다.
function episodeOf(unitId: EpisodeIntroUnitId) {
  return episodeOfIntroUnit(journeyMapSections, unitId);
}

function renderEpisodeIntroScreen(
  screen: Extract<Screen, { name: "episode-intro" }>,
  wiring: ScreenWiring,
) {
  const episode = episodeOf(screen.unitId);
  return (
    <EpisodeIntroScreen
      insets={wiring.safeAreaInsets}
      label={episode.label}
      title={episode.title}
      onBack={wiring.onExitEpisodeIntro}
      onSkip={() => wiring.onSkipEpisodeIntro(screen.unitId)}
      onNext={() => wiring.onNextEpisodeIntro(screen.unitId)}
    />
  );
}

// 서사 전개 route를 에피소드의 형식(통화 · 메신저 · 비주얼 노벨)에 맞는 화면으로 옮깁니다.
function renderPrologueScreen(
  screen: Extract<Screen, { name: "episode-prologue" }>,
  wiring: ScreenWiring,
) {
  const episode = episodeOf(screen.unitId);
  // 없으면 던집니다 — 이 route를 쌓는 자리(`onNextEpisodeIntro`)가 서사가 있을 때만
  // 쌓습니다.
  const prologue = wiring.episodePrologueFor(episode.id);
  if (prologue === undefined) {
    throw new Error(`서사가 없는 에피소드입니다: ${episode.id}`);
  }
  const onComplete = () => wiring.onCompletePrologue(screen.unitId);
  switch (prologue.kind) {
    case "call":
      return (
        <PrologueCallScreen
          key={screen.unitId}
          insets={wiring.safeAreaInsets}
          episodeLabel={episode.label}
          call={prologue.call}
          callerPortrait={jiminPortrait}
          onComplete={onComplete}
          onBack={wiring.onExitEpisodeIntro}
        />
      );
    case "messenger":
      return (
        <PrologueChatScreen
          key={screen.unitId}
          insets={wiring.safeAreaInsets}
          episodeLabel={episode.label}
          chat={prologue.chat}
          onComplete={onComplete}
          onBack={wiring.onExitEpisodeIntro}
        />
      );
    case "visual-novel":
      return (
        // 표지 유닛이 바뀌면 새 인스턴스로 섭니다 — 장면 번호(화면 로컬)가 앞 에피소드에서
        // 이어지지 않게 합니다.
        <EpisodeNarrativeScreen
          key={screen.unitId}
          insets={wiring.safeAreaInsets}
          label={episode.label}
          narrative={prologue.narrative}
          onFinish={onComplete}
          onExit={wiring.onExitEpisodeIntro}
        />
      );
    default: {
      const exhaustive: never = prologue;
      return exhaustive;
    }
  }
}

// 표지를 마친 뒤의 학습 완료 화면입니다. **`Skip`과 `Next` 두 경로에서 옵니다**(D5) —
// 화면은 그 둘을 구별하지 않습니다(spec §2.5). 판정할 결과가 없어 결과는 빈 목록이고
// 판정은 늘 통과이며, 건너뛴 **문항**도 0입니다 — 서사에는 문항이 없어 건너뛸 문항도
// 없습니다(spec §2.8.2b). 그래서 늘 만점(PERFECT LESSON)이고 다시 하기가 없습니다.
// 지표와 보상은 평가를 통과했을 때와 같은 값(연속 · 트로피는 규칙이 없어 0, 젬은 전역
// 머리와 같은 값, 보상은 임시값)입니다.
function renderPrologueCompleteScreen(
  screen: Extract<Screen, { name: "episode-prologue-complete" }>,
  wiring: ScreenWiring,
) {
  return (
    <LessonCompleteScreen
      results={[]}
      skippedCount={0}
      verdict="passed"
      streakDays={0}
      trophyCount={0}
      diamondCount={wiring.gemCount}
      reward={lessonRewardPlaceholder}
      onExit={() => wiring.onExitPrologueComplete(screen.unitId)}
    />
  );
}

type EpisodeIntroFlowScreen = Extract<
  Screen,
  {
    name: "episode-intro" | "episode-prologue" | "episode-prologue-complete";
  }
>;

export function renderEpisodeIntroFlow(screen: EpisodeIntroFlowScreen, wiring: ScreenWiring) {
  switch (screen.name) {
    case "episode-intro":
      return renderEpisodeIntroScreen(screen, wiring);
    case "episode-prologue":
      return renderPrologueScreen(screen, wiring);
    case "episode-prologue-complete":
      return renderPrologueCompleteScreen(screen, wiring);
    default: {
      const exhaustive: never = screen;
      return exhaustive;
    }
  }
}
