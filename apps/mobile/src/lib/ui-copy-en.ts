// 영어 문구표입니다. 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).

import type { UiCopy } from "./ui-copy.contract";
import {
  audioUnavailableEn,
  catalogCoverEn,
  catalogFinalEn,
  catalogMapEn,
  cultureCardEn,
  pairMatchEn,
  readAloudEn,
  speakWordEn,
  syllableBuildEn,
  typingEn,
  vocabCardEn,
  wordChoicePictureEn,
} from "./ui-copy-en-catalog";
import {
  feedbackEn,
  gemPurchaseEn,
  notificationsEn,
  profileEn,
  settingsEn,
} from "./ui-copy-en-account";
import {
  assessmentEn,
  learningItemGuideEn,
  lessonCompleteEn,
  listeningEn,
  sentenceOrderEn,
  speakingEn,
  wordChoiceEn,
} from "./ui-copy-en-learning";
import { learnerProfileEn } from "./ui-copy-en-profile";
import { ticketsEn } from "./ui-copy-en-tickets";
import { roleplayStoryEn } from "./ui-copy-en-roleplay-story";
import {
  commonEn,
  journeyMapEn,
  learningShellEn,
  progressLoadEn,
  shellEn,
  specialUnitMapEn,
  splashEn,
} from "./ui-copy-en-shell";
import {
  episodeIntroEn,
  messengerEn,
  roleplayEn,
  storyCallEn,
  storyIntroEn,
  storyMessengerEn,
  visualNovelEn,
} from "./ui-copy-en-story";

export const uiCopyEn: UiCopy = {
  common: commonEn,
  shell: shellEn,
  journeyMap: journeyMapEn,
  learningShell: learningShellEn,
  listening: listeningEn,
  wordChoice: wordChoiceEn,
  sentenceOrder: sentenceOrderEn,
  speaking: speakingEn,
  learningItemGuide: learningItemGuideEn,
  assessment: assessmentEn,
  lessonComplete: lessonCompleteEn,
  episodeIntro: episodeIntroEn,
  messenger: messengerEn,
  visualNovel: visualNovelEn,
  roleplay: roleplayEn,
  notifications: notificationsEn,
  settings: settingsEn,
  profile: profileEn,
  feedback: feedbackEn,
  gemPurchase: gemPurchaseEn,
  catalogMap: catalogMapEn,
  catalogCover: catalogCoverEn,
  typing: typingEn,
  vocabCard: vocabCardEn,
  pairMatch: pairMatchEn,
  cultureCard: cultureCardEn,
  readAloud: readAloudEn,
  speakWord: speakWordEn,
  syllableBuild: syllableBuildEn,
  wordChoicePicture: wordChoicePictureEn,
  catalogFinal: catalogFinalEn,
  audioUnavailable: audioUnavailableEn,
  learnerProfile: learnerProfileEn,
  progressLoad: progressLoadEn,
  splash: splashEn,
  specialUnitMap: specialUnitMapEn,
  tickets: ticketsEn,
  roleplayStory: roleplayStoryEn,
  storyMessenger: storyMessengerEn,
  storyIntro: storyIntroEn,
  storyCall: storyCallEn,
};
