// 미얀마어 문구표입니다(ADR-0158 개정 2026-11-20 — 화면 문구를 번들에 싣는다). 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).
// 요금제 · 상점 문구(`ui-copy-my-plans.ts`) · 연속 학습 보상(`streakRewardMy`) · 조립 힌트(`assembledHintMy`)도 구획 파일이 집니다.
// 번역 초안 — 원어민 검수 필요.

import type { UiCopy } from "./ui-copy.contract";
import { moreCopy } from "./ui-copy-more";
import { rankingCopy } from "./ui-copy-ranking";
import { signupRewardCopy } from "./ui-copy-signup-reward";
import {
  audioUnavailableMy,
  catalogCoverMy,
  catalogFinalMy,
  catalogStoryFinalMy,
  catalogMapMy,
  catalogUpdateNoticeMy,
  cultureCardMy,
  pairMatchMy,
  readAloudMy,
  speakWordMy,
  syllableBuildMy,
  typingMy,
  vocabCardMy,
  wordChoicePictureMy,
} from "./ui-copy-my-catalog";
import {
  appUpdateMy,
  feedbackMy,
  coinShopMy,
  notificationsMy,
  profileMy,
  settingsMy,
  downloadSheetMy,
} from "./ui-copy-my-account";
import {
  assembledHintMy,
  assessmentMy,
  learningItemGuideMy,
  lessonCompleteMy,
  listeningMy,
  sentenceOrderMy,
  speakingMy,
  wordChoiceMy,
} from "./ui-copy-my-learning";
import {
  journeyEntryMy,
  languageSelectMy,
  loginMy,
  onboardingMy,
  verificationCodeMy,
  authFailureMy,
} from "./ui-copy-my-entry";
import { messengerChatMy } from "./ui-copy-my-chat";
import { learnerProfileMy } from "./ui-copy-my-profile";
import { ticketsMy } from "./ui-copy-my-tickets";
import { plansMy } from "./ui-copy-my-plans";
import { roleplayStoryMy } from "./ui-copy-my-roleplay-story";
import {
  commonMy,
  journeyMapMy,
  learningShellMy,
  progressLoadMy,
  shellMy,
  specialUnitMapMy,
  splashMy,
} from "./ui-copy-my-shell";
import {
  episodeIntroMy,
  messengerMy,
  roleplayMy,
  storyCallMy,
  storyIntroMy,
  storyMessengerMy,
  visualNovelMy,
} from "./ui-copy-my-story";

export const uiCopyMy: UiCopy = {
  common: commonMy,
  shell: shellMy,
  journeyMap: journeyMapMy,
  learningShell: learningShellMy,
  listening: listeningMy,
  wordChoice: wordChoiceMy,
  sentenceOrder: sentenceOrderMy,
  assembledHint: assembledHintMy,
  speaking: speakingMy,
  learningItemGuide: learningItemGuideMy,
  assessment: assessmentMy,
  lessonComplete: lessonCompleteMy,
  episodeIntro: episodeIntroMy,
  messenger: messengerMy,
  visualNovel: visualNovelMy,
  roleplay: roleplayMy,
  notifications: notificationsMy,
  settings: settingsMy,
  downloadSheet: downloadSheetMy,
  profile: profileMy,
  feedback: feedbackMy,
  coinShop: coinShopMy,
  catalogMap: catalogMapMy,
  catalogUpdateNotice: catalogUpdateNoticeMy,
  catalogCover: catalogCoverMy,
  typing: typingMy,
  vocabCard: vocabCardMy,
  pairMatch: pairMatchMy,
  cultureCard: cultureCardMy,
  readAloud: readAloudMy,
  speakWord: speakWordMy,
  syllableBuild: syllableBuildMy,
  wordChoicePicture: wordChoicePictureMy,
  catalogFinal: catalogFinalMy,
  catalogStoryFinal: catalogStoryFinalMy,
  audioUnavailable: audioUnavailableMy,
  learnerProfile: learnerProfileMy,
  progressLoad: progressLoadMy,
  splash: splashMy,
  specialUnitMap: specialUnitMapMy,
  tickets: ticketsMy,
  plans: plansMy,
  roleplayStory: roleplayStoryMy,
  appUpdate: appUpdateMy,
  storyMessenger: storyMessengerMy,
  messengerChat: messengerChatMy,
  storyIntro: storyIntroMy,
  storyCall: storyCallMy,
  onboarding: onboardingMy,
  languageSelect: languageSelectMy,
  journeyEntry: journeyEntryMy,
  login: loginMy,
  verificationCode: verificationCodeMy,
  authFailure: authFailureMy,
  more: moreCopy.my,
  ranking: rankingCopy.my,
  signupReward: signupRewardCopy.my,
};
