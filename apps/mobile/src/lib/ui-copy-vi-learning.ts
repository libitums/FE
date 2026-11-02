// 베트남어 문구표 구획 — 학습 활동(listening ~ lessonComplete).
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

export const listeningVi: ListeningCopy = {
  instruction: "Chọn nghĩa của câu.",
  playback: { pause: "Tạm dừng", resume: "Tiếp tục", play: "Phát" },
  playFromStart: "Phát từ đầu",
  slow: "Chậm",
  playAgain: "Phát lại",
  stop: "Dừng",
};

export const wordChoiceVi: WordChoiceCopy = {
  instruction: "Chọn từ phù hợp.",
  culture: {
    sceneInstruction: "Bạn sẽ nói gì?",
    feedbackTitle: {
      scene: { correct: "Đáp hay lắm!", incorrect: "Chưa đúng lắm" },
      question: { correct: "Đúng rồi!", incorrect: "Chưa đúng lắm" },
    },
  },
};

export const sentenceOrderVi: SentenceOrderCopy = {
  instruction: "Hoàn thành đoạn hội thoại.",
  placedChip: (text, position) => `${text}, vị trí ${position}`,
  dialogueSpeaker: { counterpart: "Người kia", me: "Bạn" },
  dialogueTurn: (speaker, position, text) => `${speaker}, lượt ${position}: ${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}, lượt ${position}, trống`,
  dialogueLine: {
    me: (text) => `Lời của bạn: ${text}`,
    counterpart: (text) => `Lời của người kia: ${text}`,
  },
};

export const speakingVi: SpeakingCopy = {
  instruction: "Đọc to câu này.",
  speak: "Nói",
  stopSpeaking: "Dừng nói",
  tryAgain: "Thử lại",
  dictationDisabled:
    "Siri hoặc Đọc chính tả đang tắt. Hãy bật trong Cài đặt > Cài đặt chung > Bàn phím > Bật Đọc chính tả, rồi thử lại.",
  tapToContinue: "Chạm vào màn hình để tiếp tục",
  recognitionUnavailable: "Hiện chưa thể nhận dạng giọng nói. Chạm Bỏ qua để tiếp tục.",
};

export const assessmentVi: AssessmentCopy = {
  activity: "Đánh giá",
  verdict: { passed: "Đạt", failed: "Chưa đạt" },
  itemTitle: (ordinal) => `Câu ${ordinal}`,
  announcement: (verdict) => `Kết quả đánh giá, ${verdict === "passed" ? "đạt" : "chưa đạt"}`,
};

// 베트남어는 복수형이 없어 수를 그대로 붙입니다.
export const lessonCompleteVi: LessonCompleteCopy = {
  rewardDiamonds: (count) => `Phần thưởng, ${count} kim cương`,
  grade: (grade) => `Hạng ${grade}`,
  gradeName: (grade) => (grade === "AMAZING" ? "TUYỆT VỜI" : grade),
  outcome: { passed: "Hoàn thành bài học", failed: "Chưa qua bài học" },
  mistakes: (count) => (count === 0 ? "không có lỗi" : `${count} lỗi`),
  skippedSuffix: (count) => (count === 0 ? "" : `, bỏ qua ${count} câu`),
  nextLesson: "Bài tiếp theo",
  nextFinal: "Bài kiểm tra cuối",
  continueStory: "Tiếp tục câu chuyện",
  title: {
    perfect: "BÀI HỌC HOÀN HẢO!",
    complete: "HOÀN THÀNH BÀI HỌC!",
    failed: "CHƯA QUA BÀI HỌC",
  },
  subtitle: (mistakeCount) =>
    mistakeCount === 0
      ? "BẠN KHÔNG MẮC LỖI NÀO TRONG BÀI NÀY"
      : `BẠN MẮC ${mistakeCount} LỖI TRONG BÀI NÀY`,
  streakLabel: (days) => `Chuỗi ${days} ngày`,
  rewardLabel: (count) => `+ ${count} THƯỞNG`,
  tryAgain: "Thử lại",
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideVi: LearningItemGuideCopy = {
  "sentence-order": {
    title: "Lần này chỉ có một mảnh",
    description:
      "Thường bạn sẽ xếp nhiều mảnh theo thứ tự. Lần này chỉ có một mảnh, hãy chạm vào nó rồi chạm Kiểm tra.",
  },
};
