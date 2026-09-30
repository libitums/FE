// 영어 문구표입니다. 값은 구획 파일에서 모읍니다(파일마다 300줄 아래).

import type { UiCopy } from "./ui-copy.contract";
import {
  feedbackEn,
  gemPurchaseEn,
  notificationsEn,
  profileEn,
  settingsEn,
} from "./ui-copy-en-account";
import {
  assessmentEn,
  cultureEn,
  cultureQuizEn,
  lessonCompleteEn,
  listeningEn,
  sentenceOrderEn,
  speakingEn,
  wordChoiceEn,
  writingEn,
} from "./ui-copy-en-learning";
import { commonEn, journeyMapEn, learningShellEn, shellEn } from "./ui-copy-en-shell";
import {
  episodeFinalEn,
  episodeIntroEn,
  episodeNarrativeEn,
  messengerEn,
  phoneCallEn,
  roleplayEn,
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
  writing: writingEn,
  culture: cultureEn,
  cultureQuiz: cultureQuizEn,
  assessment: assessmentEn,
  lessonComplete: lessonCompleteEn,
  episodeIntro: episodeIntroEn,
  episodeNarrative: episodeNarrativeEn,
  episodeFinal: episodeFinalEn,
  messenger: messengerEn,
  phoneCall: phoneCallEn,
  visualNovel: visualNovelEn,
  roleplay: roleplayEn,
  notifications: notificationsEn,
  settings: settingsEn,
  profile: profileEn,
  feedback: feedbackEn,
  gemPurchase: gemPurchaseEn,
};
