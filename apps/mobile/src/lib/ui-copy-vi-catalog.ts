// 베트남어 문구표 구획 — 카탈로그 맵 · 표지 컷.
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogStoryFinalCopy } from "../screens/catalog-story-final/catalog-story-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { CatalogUpdateNoticeCopy } from "../screens/catalog-update/catalog-update-notice.contract";
import type { CultureCardCopy } from "../screens/culture-card/culture-card.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { ReadAloudCopy } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordCopy } from "../screens/speak-word/speak-word.contract";
import type { SyllableBuildCopy } from "../screens/syllable-build/syllable-build.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";

const unavailableTail = {
  pending: "sắp ra mắt",
  update: "cập nhật ứng dụng để mở",
  unavailable: "không khả dụng",
} as const;

export const catalogUpdateNoticeVi: CatalogUpdateNoticeCopy = {
  title: "Này, có nội dung mới! 👀",
  body: "Một vài tập bạn đã hoàn thành vừa có thêm nội dung mới. Đừng lo, tiến độ của bạn vẫn được giữ nguyên.",
  confirm: "Được, mình hiểu rồi",
  dontShowAgain: "Không hiện lại",
  checked: "đã chọn",
  unchecked: "chưa chọn",
};

export const catalogMapVi: CatalogMapCopy = {
  episodeLabel: (ordinal) => `Tập ${ordinal}.`,
  coverTitle: "Giới thiệu tập",
  lessonTitle: (ordinal) => `Bài ${ordinal}`,
  sheetHeading: (unit, title) => `${unit}: “${title}”`,
  finalTitle: "Bài kiểm tra cuối",
  cultureTitle: "Văn hóa",
  storyTitle: "Câu chuyện",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "SẮP RA MẮT",
    update: "CẦN CẬP NHẬT",
    unavailable: "KHÔNG KHẢ DỤNG",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
  comingSoon: {
    title: "Sắp ra mắt",
    body: "Chúng mình đang chuẩn bị câu chuyện tiếp theo.",
    label: (episodeLabel) =>
      `${episodeLabel} Sắp ra mắt. Chúng mình đang chuẩn bị câu chuyện tiếp theo.`,
  },
};

export const catalogCoverVi: CatalogCoverCopy = {
  toggleScript: {
    en: "Hiện phiên âm",
    roman: "Hiện nghĩa",
  },
  nextCut: (ordinal, total) => `Cảnh tiếp theo, ${ordinal} trên ${total}`,
  finishCover: "Kết thúc giới thiệu",
  finishEpilogue: "Kết thúc tập",
  finishStory: "Kết thúc câu chuyện",
  thinking: "đang suy nghĩ",
  episodeStart: "Bắt đầu tập!",
  episodeClear: "Hoàn thành tập!",
  episodeContinue: "Còn tiếp…",
  skipDescription: "Bạn có thể xem lại bất cứ lúc nào từ phần giới thiệu tập.",
};

export const typingVi: TypingCopy = {
  instruction: "Gõ câu bằng tiếng Hàn.",
  answerField: (typed) => `Câu trả lời của bạn: ${typed}`,
  answerFieldEmpty: "Câu trả lời của bạn, trống",
  answerReveal: (answer) => `Đáp án: ${answer}`,
};

export const vocabCardVi: VocabCardCopy = {
  instruction: "Học từ này.",
  badge: "Từ mới",
  gotIt: "Đã hiểu",
  runLabel: (ordinal, total) => `Từ ${ordinal} trên ${total}`,
  pronunciation: (romanization) => `Phát âm: ${romanization}`,
  meaning: (meaning) => `Nghĩa: ${meaning}`,
};

export const cultureCardVi: CultureCardCopy = {
  instruction: "Tìm hiểu cuộc sống ở Hàn Quốc.",
  eyebrow: "VĂN HÓA",
  tapToFlip: "Chạm để lật",
  flipCard: "Lật thẻ",
  nextCard: "Thẻ tiếp theo",
  koreanBodyTitle: "Bằng tiếng Hàn",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `Phát âm: ${romanization}`,
  frontPlace: (position, total) => `Thẻ văn hóa ${position} trên ${total}, mặt trước.`,
  backPlace: (position, total) => `Thẻ văn hóa ${position} trên ${total}, mặt sau.`,
  flipBackHint: "Chạm để lật lại.",
};

// 베트남어는 복수형이 없어 음절 수를 그대로 붙입니다.
export const syllableBuildVi: SyllableBuildCopy = {
  instruction: "Chạm vào các âm tiết để ghép thành từ.",
  meaning: (meaning) => `Nghĩa: ${meaning}`,
  placedTile: (text, position, slotCount) => `${text}, vị trí ${position} trên ${slotCount}`,
  wordEmpty: (slotCount) => `Từ của bạn, trống, ${slotCount} âm tiết`,
  word: (word) => `Từ của bạn: ${word}`,
  usedTile: (text) => `${text}, đã dùng`,
};

export const readAloudVi: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "Bạn đã nói đúng từ." : `Bạn đã nói đúng cả ${total} từ.`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "đầu tiên"을 붙이지 않습니다.
    const lead = matched === 0 ? "" : " đầu tiên";
    return `Bạn đã nói đúng ${matched}${lead} trong ${total} từ.`;
  },
  pronunciation: (romanization) => `Phát âm: ${romanization}`,
};

export const speakWordVi: SpeakWordCopy = {
  instruction: "Nói từ ứng với bức tranh.",
  recognitionUnavailable: "Hiện chưa thể nhận dạng giọng nói. Chạm Bỏ qua để tiếp tục.",
};

export const pairMatchVi: PairMatchCopy = {
  instruction: "Chạm vào một từ, rồi chạm vào nghĩa của nó.",
  progress: (matched, total) => `Đã ghép ${matched} / ${total}`,
  progressLabel: (matched, total) => `Đã ghép ${matched} trên ${total} cặp`,
  selected: (text) => `${text}, đã chọn`,
  matched: (text, ordinal, partner) => `${text}, cặp ${ordinal}, đã ghép với ${partner}`,
  judged: (text, partner) => `${text}, đã ghép với ${partner}`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) =>
    `Đã ghép: ${word}, ${meaning}. ${matched} trên ${total}.`,
  unlinked: (text) => `Chưa ghép: ${text}`,
  missedPairs: (pairs) => `Các cặp đúng: ${pairs}`,
  spokenPair: (word, meaning) => `${word}, ${meaning}.`,
};

export const wordChoicePictureVi: WordChoicePictureCopy = {
  picture: (meaning) => `Hình ảnh: ${meaning}`,
  loading: "Hình ảnh, đang tải",
  unavailable: (meaning) => `Không có hình ảnh. Nghĩa: ${meaning}`,
  unavailableCaption: "Không có hình ảnh",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `Đáp án: ${word}, ${meaning}`
      : `Đáp án: ${word}, ${romanization}, ${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalVi: CatalogFinalCopy = {
  turnProgress: (n, total) => `Lượt ${n} trên ${total}`,
  replyLabel: (reply) => `Câu đáp của bạn: ${reply}`,
  replyEmpty: "Câu đáp của bạn, trống",
  replyHint: (translation) => `Hãy nói: ${translation}`,
  correctAnswer: (answer) => `Đáp án: ${answer}`,
  answerLabel: "Đáp án",
};

export const catalogStoryFinalVi: CatalogStoryFinalCopy = {
  redo: "Làm lại",
  listen: "Nghe",
  nextLetter: "Chữ tiếp theo",
  letterLabel: (ordinal, total, state) =>
    `Chữ ${ordinal} trên ${total}, ${state.kind === "written" ? state.syllable : state.kind === "writing" ? "đang viết" : "trống"}`,
  padLabel: (syllable) => `Khu vực viết. Hãy đồ theo ${syllable}`,
};

export const audioUnavailableVi: AudioUnavailableCopy = {
  label: "Chưa có âm thanh",
};
