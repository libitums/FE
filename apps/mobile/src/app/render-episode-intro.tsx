// 에피소드 서사 표지 route를 화면으로 옮깁니다. `render-screen.tsx`에서 떼어 둔 것은 그
// 파일이 커서이고, `render-roleplay-screen.tsx`와 같은 갈래입니다.

import { EpisodeIntroScreen } from "../screens/episode-intro/EpisodeIntroScreen";
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

export function renderEpisodeIntroScreen(
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
