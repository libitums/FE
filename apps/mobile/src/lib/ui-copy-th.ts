// 태국어 문구표입니다(ADR-0158 개정 2026-11-20 — 화면 문구를 번들에 싣는다). 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).
// 요금제 · 상점 문구(`ui-copy-th-plans.ts`) · 연속 학습 보상(`streakRewardTh`) · 조립 힌트(`assembledHintTh`)도 구획 파일이 집니다.
// 번역 초안 — 원어민 검수 필요.

import type { UiCopy } from "./ui-copy.contract";
import { moreCopy } from "./ui-copy-more";
import { rankingCopy } from "./ui-copy-ranking";
import { signupRewardCopy } from "./ui-copy-signup-reward";
import {
  audioUnavailableTh,
  sentenceReplayTh,
  catalogCoverTh,
  catalogFinalTh,
  catalogStoryFinalTh,
  catalogMapTh,
  catalogUpdateNoticeTh,
  cultureCardTh,
  pairMatchTh,
  readAloudTh,
  speakWordTh,
  syllableBuildTh,
  typingTh,
  vocabCardTh,
  wordChoicePictureTh,
} from "./ui-copy-th-catalog";
import {
  appUpdateTh,
  feedbackTh,
  coinShopTh,
  notificationsTh,
  profileTh,
  settingsTh,
  downloadSheetTh,
} from "./ui-copy-th-account";
import {
  assembledHintTh,
  assessmentTh,
  learningItemGuideTh,
  lessonCompleteTh,
  listeningTh,
  sentenceOrderTh,
  speakingTh,
  wordChoiceTh,
} from "./ui-copy-th-learning";
import {
  journeyEntryTh,
  languageSelectTh,
  loginTh,
  onboardingTh,
  verificationCodeTh,
  authFailureTh,
} from "./ui-copy-th-entry";
import { messengerChatTh } from "./ui-copy-th-chat";
import { learnerProfileTh } from "./ui-copy-th-profile";
import { ticketsTh } from "./ui-copy-th-tickets";
import { plansTh } from "./ui-copy-th-plans";
import { roleplayStoryTh } from "./ui-copy-th-roleplay-story";
import {
  commonTh,
  journeyMapTh,
  learningShellTh,
  progressLoadTh,
  shellTh,
  specialUnitMapTh,
  splashTh,
} from "./ui-copy-th-shell";
import {
  episodeIntroTh,
  messengerTh,
  roleplayTh,
  storyCallTh,
  storyIntroTh,
  storyMessengerTh,
  visualNovelTh,
} from "./ui-copy-th-story";

export const uiCopyTh: UiCopy = {
  common: commonTh,
  shell: shellTh,
  journeyMap: journeyMapTh,
  learningShell: learningShellTh,
  listening: listeningTh,
  wordChoice: wordChoiceTh,
  sentenceOrder: sentenceOrderTh,
  assembledHint: assembledHintTh,
  speaking: speakingTh,
  learningItemGuide: learningItemGuideTh,
  assessment: assessmentTh,
  lessonComplete: lessonCompleteTh,
  episodeIntro: episodeIntroTh,
  messenger: messengerTh,
  visualNovel: visualNovelTh,
  roleplay: roleplayTh,
  notifications: notificationsTh,
  settings: settingsTh,
  downloadSheet: downloadSheetTh,
  profile: profileTh,
  feedback: feedbackTh,
  coinShop: coinShopTh,
  catalogMap: catalogMapTh,
  catalogUpdateNotice: catalogUpdateNoticeTh,
  catalogCover: catalogCoverTh,
  typing: typingTh,
  vocabCard: vocabCardTh,
  pairMatch: pairMatchTh,
  cultureCard: cultureCardTh,
  readAloud: readAloudTh,
  speakWord: speakWordTh,
  syllableBuild: syllableBuildTh,
  wordChoicePicture: wordChoicePictureTh,
  catalogFinal: catalogFinalTh,
  catalogStoryFinal: catalogStoryFinalTh,
  audioUnavailable: audioUnavailableTh,
  sentenceReplay: sentenceReplayTh,
  learnerProfile: learnerProfileTh,
  progressLoad: progressLoadTh,
  splash: splashTh,
  specialUnitMap: specialUnitMapTh,
  tickets: ticketsTh,
  plans: plansTh,
  roleplayStory: roleplayStoryTh,
  appUpdate: appUpdateTh,
  storyMessenger: storyMessengerTh,
  messengerChat: messengerChatTh,
  storyIntro: storyIntroTh,
  storyCall: storyCallTh,
  onboarding: onboardingTh,
  languageSelect: languageSelectTh,
  journeyEntry: journeyEntryTh,
  login: loginTh,
  verificationCode: verificationCodeTh,
  authFailure: authFailureTh,
  more: moreCopy.th,
  ranking: rankingCopy.th,
  signupReward: signupRewardCopy.th,
};
