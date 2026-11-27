// 인도네시아어 문구표입니다(ADR-0093). 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).
// 번역 초안 — 원어민 검수 필요.

import { micPermissionId } from "./ui-copy-mic-permission";
import { moreCopy } from "./ui-copy-more";
import { rankingCopy } from "./ui-copy-ranking";
import { signupRewardCopy } from "./ui-copy-signup-reward";
import { assembledHintId } from "./ui-copy-assembled-hint";
import type { UiCopy } from "./ui-copy.contract";
import {
  audioUnavailableId,
  sentenceReplayId,
  catalogCoverId,
  catalogFinalId,
  catalogStoryFinalId,
  catalogMapId,
  catalogUpdateNoticeId,
  cultureCardId,
  pairMatchId,
  readAloudId,
  speakWordId,
  syllableBuildId,
  typingId,
  vocabCardId,
  wordChoicePictureId,
} from "./ui-copy-id-catalog";
import {
  appUpdateId,
  feedbackId,
  coinShopId,
  notificationsId,
  profileId,
  settingsId,
  downloadSheetId,
} from "./ui-copy-id-account";
import {
  assessmentId,
  learningItemGuideId,
  lessonCompleteId,
  listeningId,
  sentenceOrderId,
  speakingId,
  wordChoiceId,
} from "./ui-copy-id-learning";
import {
  journeyEntryId,
  languageSelectId,
  loginId,
  onboardingId,
  verificationCodeId,
  authFailureId,
} from "./ui-copy-id-entry";
import { messengerChatId } from "./ui-copy-id-chat";
import { learnerProfileId } from "./ui-copy-id-profile";
import { ticketsId } from "./ui-copy-id-tickets";
import { plansCopy } from "./ui-copy-plans";
import { roleplayStoryId } from "./ui-copy-id-roleplay-story";
import {
  commonId,
  journeyMapId,
  learningShellId,
  progressLoadId,
  shellId,
  specialUnitMapId,
  splashId,
} from "./ui-copy-id-shell";
import {
  episodeIntroId,
  messengerId,
  roleplayId,
  storyCallId,
  storyIntroId,
  storyMessengerId,
  visualNovelId,
} from "./ui-copy-id-story";

export const uiCopyId: UiCopy = {
  common: commonId,
  shell: shellId,
  journeyMap: journeyMapId,
  learningShell: learningShellId,
  listening: listeningId,
  wordChoice: wordChoiceId,
  sentenceOrder: sentenceOrderId,
  assembledHint: assembledHintId,
  speaking: speakingId,
  micPermission: micPermissionId,
  learningItemGuide: learningItemGuideId,
  assessment: assessmentId,
  lessonComplete: lessonCompleteId,
  episodeIntro: episodeIntroId,
  messenger: messengerId,
  visualNovel: visualNovelId,
  roleplay: roleplayId,
  notifications: notificationsId,
  settings: settingsId,
  downloadSheet: downloadSheetId,
  profile: profileId,
  feedback: feedbackId,
  coinShop: coinShopId,
  catalogMap: catalogMapId,
  catalogUpdateNotice: catalogUpdateNoticeId,
  catalogCover: catalogCoverId,
  typing: typingId,
  vocabCard: vocabCardId,
  pairMatch: pairMatchId,
  cultureCard: cultureCardId,
  readAloud: readAloudId,
  speakWord: speakWordId,
  syllableBuild: syllableBuildId,
  wordChoicePicture: wordChoicePictureId,
  catalogFinal: catalogFinalId,
  catalogStoryFinal: catalogStoryFinalId,
  audioUnavailable: audioUnavailableId,
  sentenceReplay: sentenceReplayId,
  learnerProfile: learnerProfileId,
  progressLoad: progressLoadId,
  splash: splashId,
  specialUnitMap: specialUnitMapId,
  tickets: ticketsId,
  plans: plansCopy.id,
  roleplayStory: roleplayStoryId,
  appUpdate: appUpdateId,
  storyMessenger: storyMessengerId,
  messengerChat: messengerChatId,
  storyIntro: storyIntroId,
  storyCall: storyCallId,
  onboarding: onboardingId,
  languageSelect: languageSelectId,
  journeyEntry: journeyEntryId,
  login: loginId,
  verificationCode: verificationCodeId,
  authFailure: authFailureId,
  more: moreCopy.id,
  ranking: rankingCopy.id,
  signupReward: signupRewardCopy.id,
};
