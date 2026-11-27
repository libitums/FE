// 영어 문구표입니다. 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).

import { micPermissionEn } from "./ui-copy-mic-permission";
import { languageDownloadEn } from "./ui-copy-language-download";
import { adTicketEn } from "./ui-copy-ad-ticket";
import { moreCopy } from "./ui-copy-more";
import { authFailureEn } from "./auth-failure";
import { rankingCopy } from "./ui-copy-ranking";
import { signupRewardCopy } from "./ui-copy-signup-reward";
import { assembledHintEn } from "./ui-copy-assembled-hint";
import type { UiCopy } from "./ui-copy.contract";
import {
  audioUnavailableEn,
  sentenceReplayEn,
  catalogCoverEn,
  catalogFinalEn,
  catalogStoryFinalEn,
  catalogMapEn,
  catalogUpdateNoticeEn,
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
  appUpdateEn,
  feedbackEn,
  coinShopEn,
  notificationsEn,
  profileEn,
  settingsEn,
  downloadSheetEn,
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
import {
  journeyEntryEn,
  languageSelectEn,
  loginEn,
  onboardingEn,
  verificationCodeEn,
} from "./ui-copy-en-entry";
import { messengerChatEn } from "./ui-copy-en-chat";
import { learnerProfileEn } from "./ui-copy-en-profile";
import { ticketsEn } from "./ui-copy-en-tickets";
import { plansCopy } from "./ui-copy-plans";
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
  assembledHint: assembledHintEn,
  speaking: speakingEn,
  micPermission: micPermissionEn,
  adTicket: adTicketEn,
  learningItemGuide: learningItemGuideEn,
  assessment: assessmentEn,
  lessonComplete: lessonCompleteEn,
  episodeIntro: episodeIntroEn,
  messenger: messengerEn,
  visualNovel: visualNovelEn,
  roleplay: roleplayEn,
  notifications: notificationsEn,
  settings: settingsEn,
  downloadSheet: downloadSheetEn,
  languageDownload: languageDownloadEn,
  profile: profileEn,
  feedback: feedbackEn,
  coinShop: coinShopEn,
  catalogMap: catalogMapEn,
  catalogUpdateNotice: catalogUpdateNoticeEn,
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
  catalogStoryFinal: catalogStoryFinalEn,
  audioUnavailable: audioUnavailableEn,
  sentenceReplay: sentenceReplayEn,
  learnerProfile: learnerProfileEn,
  progressLoad: progressLoadEn,
  splash: splashEn,
  specialUnitMap: specialUnitMapEn,
  tickets: ticketsEn,
  plans: plansCopy.en,
  roleplayStory: roleplayStoryEn,
  appUpdate: appUpdateEn,
  storyMessenger: storyMessengerEn,
  messengerChat: messengerChatEn,
  storyIntro: storyIntroEn,
  storyCall: storyCallEn,
  onboarding: onboardingEn,
  languageSelect: languageSelectEn,
  journeyEntry: journeyEntryEn,
  login: loginEn,
  verificationCode: verificationCodeEn,
  authFailure: authFailureEn,
  more: moreCopy.en,
  ranking: rankingCopy.en,
  signupReward: signupRewardCopy.en,
};
