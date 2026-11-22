// 미얀마어 문구표 구획 — 학습 활동(listening ~ lessonComplete).
// 번역 초안 — 원어민 검수 필요(ADR-0158 개정).

import type { AssembledHintCopy } from "./ui-copy-assembled-hint";
import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

export const listeningMy: ListeningCopy = {
  instruction: "ဝါကျ၏ အဓိပ္ပာယ်ကို ရွေးပါ။",
  playback: { pause: "ခဏရပ်ရန်", resume: "ဆက်ဖွင့်ရန်", play: "ဖွင့်ရန်" },
  playFromStart: "အစမှ ပြန်ဖွင့်ရန်",
  slow: "နှေးနှေး",
  playAgain: "ပြန်ဖွင့်ရန်",
  stop: "ရပ်ရန်",
};

export const wordChoiceMy: WordChoiceCopy = {
  instruction: "သင့်တော်သော စကားလုံးကို ရွေးပါ။",
  culture: {
    sceneInstruction: "ဘာပြောမလဲ။",
    feedbackTitle: {
      scene: { correct: "ကောင်းလိုက်တာ!", incorrect: "သိပ်မမှန်သေးဘူး" },
      question: { correct: "မှန်ပါတယ်!", incorrect: "သိပ်မမှန်သေးဘူး" },
    },
  },
};

export const sentenceOrderMy: SentenceOrderCopy = {
  instruction: "စကားပြောကို ပြည့်စုံအောင် ဖြည့်ပါ။",
  placedChip: (text, position) => `${text}၊ နေရာ ${position}`,
  dialogueSpeaker: { counterpart: "တစ်ဖက်လူ", me: "သင်" },
  dialogueTurn: (speaker, position, text) => `${speaker}၊ အလှည့် ${position}: ${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}၊ အလှည့် ${position}၊ ဗလာ`,
  dialogueLine: {
    me: (text) => `သင့်စကား: ${text}`,
    counterpart: (text) => `တစ်ဖက်လူ၏ စကား: ${text}`,
  },
};

// iOS에는 미얀마어 화면이 없어 설정 경로는 영어 메뉴 이름으로 적습니다.
export const speakingMy: SpeakingCopy = {
  instruction: "ဤဝါကျကို အသံထွက် ဖတ်ပါ။",
  speak: "ပြောရန်",
  stopSpeaking: "ပြောခြင်း ရပ်ရန်",
  tryAgain: "ထပ်စမ်းရန်",
  dictationDisabled:
    "Siri သို့မဟုတ် Dictation ပိတ်ထားပါသည်။ Settings > General > Keyboard > Enable Dictation တွင် ဖွင့်ပြီး ထပ်စမ်းကြည့်ပါ။",
  tapToContinue: "ဆက်လုပ်ရန် မျက်နှာပြင်ကို နှိပ်ပါ",
  recognitionUnavailable: "ယခု အသံကို မှတ်သား၍ မရပါ။ ဆက်သွားရန် ကျော်ရန်ကို နှိပ်ပါ။",
};

export const assessmentMy: AssessmentCopy = {
  activity: "အကဲဖြတ်ခြင်း",
  verdict: { passed: "အောင်", failed: "မအောင်" },
  itemTitle: (ordinal) => `မေးခွန်း ${ordinal}`,
  announcement: (verdict) => `အကဲဖြတ်ရလဒ်၊ ${verdict === "passed" ? "အောင်" : "မအောင်"}`,
};

// 미얀마어는 복수형이 없어 수를 그대로 붙입니다. 대문자가 없어 영어의 대문자 제목은 보통 글로 둡니다.
export const lessonCompleteMy: LessonCompleteCopy = {
  rewardCoins: (count) => `ဆု၊ ဒင်္ဂါး ${count}`,
  grade: (grade) => `အဆင့် ${grade}`,
  gradeName: (grade) => (grade === "AMAZING" ? "ထူးချွန်" : grade),
  outcome: { passed: "သင်ခန်းစာ ပြီးပါပြီ", failed: "သင်ခန်းစာ မအောင်သေးပါ" },
  mistakes: (count) => (count === 0 ? "အမှား မရှိ" : `အမှား ${count} ခု`),
  skippedSuffix: (count) => (count === 0 ? "" : `၊ ${count} ခု ကျော်ခဲ့`),
  nextLesson: "နောက်သင်ခန်းစာ",
  nextFinal: "နောက်ဆုံးစာမေးပွဲ",
  continueStory: "ဇာတ်လမ်း ဆက်ရန်",
  title: {
    perfect: "အပြည့်အဝ ပြီးပါပြီ!",
    complete: "သင်ခန်းစာ ပြီးပါပြီ!",
    failed: "သင်ခန်းစာ မအောင်သေးပါ",
  },
  subtitle: (mistakeCount) =>
    mistakeCount === 0 ? "ဤသင်ခန်းစာတွင် အမှား တစ်ခုမှ မရှိပါ" : `ဤသင်ခန်းစာတွင် အမှား ${mistakeCount} ခု ရှိခဲ့ပါသည်`,
  streakLabel: (days) => `${days} ရက် ဆက်တိုက်`,
  rewardLabel: (count) => `+ ${count} ဆု`,
  tryAgain: "ထပ်စမ်းရန်",
  review: {
    soClose: "နီးနီးလေး ရှိပြီ!",
    fixedOf: (fixed, total) => `အမှား ${total} ခုအနက် ${fixed} ခု ပြင်ပြီးပါပြီ`,
    dotsLabel: (fixed, total) => `အမှား ${total} ခုအနက် ${fixed} ခု ပြင်ပြီး`,
    neededMore: (count) => `နောက်ထပ် ${count} ခု မှန်ဖို့ လိုပါသေးတယ်။ ဤသင်ခန်းစာကို ပြန်လေ့လာပါ — ဒီတစ်ခါ ပိုလွယ်ပါလိမ့်မယ်။`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideMy: LearningItemGuideCopy = {
  "sentence-order": {
    title: "ဒီတစ်ခါ အပိုင်းတစ်ခုသာ",
    description:
      "များသောအားဖြင့် အပိုင်းများစွာကို အစီအစဉ်တကျ စီရပါတယ်။ ဒီတစ်ခါ တစ်ခုသာ ရှိလို့ ၎င်းကို နှိပ်ပြီး စစ်ဆေးရန်ကို နှိပ်ပါ။",
  },
  "activity-vocab-card": {
    title: "စကားလုံးသစ်",
    description: "စကားလုံးကို နားထောင်ပြီး အဓိပ္ပာယ်ကို ကြည့်ပါ။ အသင့်ဖြစ်ရင် ရှေ့သို့ကို နှိပ်ပါ။",
  },
  "activity-word-choice": {
    title: "တစ်ခု ရွေးပါ",
    description: "သင့်တော်သော အဖြေကို ရွေးပြီး စစ်ဆေးရန်ကို နှိပ်ပါ။",
  },
  "activity-listening": {
    title: "အရင် နားထောင်ပါ",
    description: "ပြန်နားထောင်ရန် စပီကာကို နှိပ်ပါ။ ပြီးရင် ကြားခဲ့တာကို ရွေးပါ။",
  },
  "activity-syllable-build": {
    title: "စကားလုံး ဖွဲ့ပါ",
    description: "ဝဏ္ဏဘလောက်များကို အစီအစဉ်အတိုင်း နှိပ်ပြီး စကားလုံး ဖွဲ့ပါ။ ပြီးရင် စစ်ဆေးရန်ကို နှိပ်ပါ။",
  },
  "activity-sentence-order": {
    title: "အစီအစဉ်တကျ စီပါ",
    description: "အပိုင်းများကို အစီအစဉ်အတိုင်း နှိပ်ပြီး ဝါကျ ဖွဲ့ပါ။ ပြန်ဖယ်ရန် အပိုင်းကို ထပ်နှိပ်ပါ။",
  },
  "activity-culture-card": {
    title: "ယဉ်ကျေးမှု မှတ်စု",
    description: "ကိုရီးယားဘဝအကြောင်း အကြံပြုချက် အတိုလေး။ ဖတ်ပြီးရင် ရှေ့သို့ကို နှိပ်ပါ။",
  },
};

export const assembledHintMy: AssembledHintCopy = {
  button: "အရိပ်အမြွက်",
  title: "အရိပ်အမြွက်",
  close: "ပိတ်ရန်",
  listen: "အဖြေကို နားထောင်ရန်",
  show: "အဖြေကို ပြရန်",
  shown: (answer) => `အဖြေ ပြထားသည်: ${answer}`,
};
