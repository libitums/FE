// 대만 중국어(번체, zh-TW) 문구표입니다(ADR-0185 — 화면 문구를 번들에 싣는다). 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).
// 요금제 · 상점 문구(`ui-copy-zh-tw-plans.ts`) · 연속 학습 보상(`streakRewardZhTw`) · 조립 힌트(`assembledHintZhTw`)도 구획 파일이 집니다.
// 번역 초안 — 원어민 검수 필요.

import type { UiCopy } from "./ui-copy.contract";
import { moreCopy } from "./ui-copy-more";
import { rankingCopy } from "./ui-copy-ranking";
import { signupRewardCopy } from "./ui-copy-signup-reward";
import {
  audioUnavailableZhTw,
  sentenceReplayZhTw,
  catalogCoverZhTw,
  catalogFinalZhTw,
  catalogStoryFinalZhTw,
  catalogMapZhTw,
  catalogUpdateNoticeZhTw,
  cultureCardZhTw,
  pairMatchZhTw,
  readAloudZhTw,
  speakWordZhTw,
  syllableBuildZhTw,
  typingZhTw,
  vocabCardZhTw,
  wordChoicePictureZhTw,
} from "./ui-copy-zh-tw-catalog";
import {
  appUpdateZhTw,
  feedbackZhTw,
  coinShopZhTw,
  notificationsZhTw,
  profileZhTw,
  settingsZhTw,
  downloadSheetZhTw,
} from "./ui-copy-zh-tw-account";
import {
  assembledHintZhTw,
  assessmentZhTw,
  learningItemGuideZhTw,
  lessonCompleteZhTw,
  listeningZhTw,
  sentenceOrderZhTw,
  speakingZhTw,
  wordChoiceZhTw,
} from "./ui-copy-zh-tw-learning";
import {
  journeyEntryZhTw,
  languageSelectZhTw,
  loginZhTw,
  onboardingZhTw,
  verificationCodeZhTw,
  authFailureZhTw,
} from "./ui-copy-zh-tw-entry";
import { messengerChatZhTw } from "./ui-copy-zh-tw-chat";
import { learnerProfileZhTw } from "./ui-copy-zh-tw-profile";
import { ticketsZhTw } from "./ui-copy-zh-tw-tickets";
import { plansZhTw } from "./ui-copy-zh-tw-plans";
import { roleplayStoryZhTw } from "./ui-copy-zh-tw-roleplay-story";
import {
  commonZhTw,
  journeyMapZhTw,
  learningShellZhTw,
  progressLoadZhTw,
  shellZhTw,
  specialUnitMapZhTw,
  splashZhTw,
} from "./ui-copy-zh-tw-shell";
import {
  episodeIntroZhTw,
  messengerZhTw,
  roleplayZhTw,
  storyCallZhTw,
  storyIntroZhTw,
  storyMessengerZhTw,
  visualNovelZhTw,
} from "./ui-copy-zh-tw-story";

export const uiCopyZhTw: UiCopy = {
  common: commonZhTw,
  shell: shellZhTw,
  journeyMap: journeyMapZhTw,
  learningShell: learningShellZhTw,
  listening: listeningZhTw,
  wordChoice: wordChoiceZhTw,
  sentenceOrder: sentenceOrderZhTw,
  assembledHint: assembledHintZhTw,
  speaking: speakingZhTw,
  learningItemGuide: learningItemGuideZhTw,
  assessment: assessmentZhTw,
  lessonComplete: lessonCompleteZhTw,
  episodeIntro: episodeIntroZhTw,
  messenger: messengerZhTw,
  visualNovel: visualNovelZhTw,
  roleplay: roleplayZhTw,
  notifications: notificationsZhTw,
  settings: settingsZhTw,
  downloadSheet: downloadSheetZhTw,
  profile: profileZhTw,
  feedback: feedbackZhTw,
  coinShop: coinShopZhTw,
  catalogMap: catalogMapZhTw,
  catalogUpdateNotice: catalogUpdateNoticeZhTw,
  catalogCover: catalogCoverZhTw,
  typing: typingZhTw,
  vocabCard: vocabCardZhTw,
  pairMatch: pairMatchZhTw,
  cultureCard: cultureCardZhTw,
  readAloud: readAloudZhTw,
  speakWord: speakWordZhTw,
  syllableBuild: syllableBuildZhTw,
  wordChoicePicture: wordChoicePictureZhTw,
  catalogFinal: catalogFinalZhTw,
  catalogStoryFinal: catalogStoryFinalZhTw,
  audioUnavailable: audioUnavailableZhTw,
  sentenceReplay: sentenceReplayZhTw,
  learnerProfile: learnerProfileZhTw,
  progressLoad: progressLoadZhTw,
  splash: splashZhTw,
  specialUnitMap: specialUnitMapZhTw,
  tickets: ticketsZhTw,
  plans: plansZhTw,
  roleplayStory: roleplayStoryZhTw,
  appUpdate: appUpdateZhTw,
  storyMessenger: storyMessengerZhTw,
  messengerChat: messengerChatZhTw,
  storyIntro: storyIntroZhTw,
  storyCall: storyCallZhTw,
  onboarding: onboardingZhTw,
  languageSelect: languageSelectZhTw,
  journeyEntry: journeyEntryZhTw,
  login: loginZhTw,
  verificationCode: verificationCodeZhTw,
  authFailure: authFailureZhTw,
  more: moreCopy["zh-TW"],
  ranking: rankingCopy["zh-TW"],
  signupReward: signupRewardCopy["zh-TW"],
};
