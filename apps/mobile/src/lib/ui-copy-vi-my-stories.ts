// 내 스토리 문구(vi, ADR-0179).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";

const replies = (count: number) => `${count} phản hồi`;

const LIVE = "ĐANG HIỆN";

export const myStoriesVi: MyStoriesCopy = {
  language: "vi",
  row: {
    create: "Mới",
    createLabel: "Tạo tin mới",
    mine: "Tin của bạn",
    mineLabel: (count, unseen) =>
      `Tin của bạn, ${replies(count)}${unseen ? ", có phản hồi mới" : ""}`,
  },
  guide: {
    title: "Chia sẻ một từ tiếng Hàn",
    body: "Bạn bè ở đây sẽ trả lời — mỗi tin là một lần luyện tiếng Hàn nho nhỏ.",
    steps: [
      {
        title: "Chọn một từ hoặc một thẻ bài học",
        body: "Từ những từ bạn đã lưu hoặc từ bài học của bạn.",
      },
      {
        title: "Bạn bè trả lời trong ngày",
        body: "Họ dùng từ của bạn. Chạm Trả lời để tiếp tục trò chuyện.",
      },
      {
        title: "Chỉ bạn bè trên duru mới thấy",
        body: "Người khác không bao giờ thấy. Xóa bất cứ lúc nào trong Cài đặt › Tin của tôi.",
      },
    ],
    start: "Tạo tin đầu tiên",
    later: "Để sau",
    stepLabel: (n, title, body) => `${n}. ${title}. ${body}`,
  },
  composer: {
    title: "Tin mới",
    close: "Đóng",
    tabsLabel: "Chia sẻ gì",
    tab: (kind) => (kind === "word" ? "Từ của tôi" : "Thẻ bài học"),
    wordsTitle: "Chọn một từ bạn đã lưu",
    wordCount: (count) => `${count} từ`,
    all: "Tất cả",
    emptyWords: "Bạn chưa lưu từ nào. Các từ trong bài học sẽ hiện ở đây.",
    emptyCards: "Học xong một bài để chia sẻ các thẻ của bài đó.",
    chipLabel: (label, on) => `${label}${on ? ", đã chọn" : ""}`,
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", đã chọn" : ""}`,
    share: (ko) => `Tạo thẻ với ${ko}`,
    shareCard: "Chia sẻ thẻ",
    posting: "Đang chia sẻ…",
    dailyLimit: "Hôm nay bạn đã chia sẻ đủ tin rồi. Hãy thử lại vào ngày mai.",
    failed: "Không chia sẻ được tin. Hãy thử lại.",
  },
  viewer: {
    yourStory: "Tin của bạn",
    kindLabel: (kind) => (kind === "word" ? "Thẻ từ" : "Thẻ bài học"),
    cardTag: (kind) => (kind === "word" ? "TỪ CỦA TÔI HÔM NAY" : "THẺ BÀI HỌC"),
    close: "Đóng",
    options: "Tùy chọn tin",
    delete: "Xóa tin",
    repliesTitle: "Bạn bè đã dùng từ của bạn",
    waiting: "Bạn bè sẽ trả lời trong ngày.",
    hidden: "Bạn bè đã xem tin này trong 24 giờ. Giờ chỉ mình bạn thấy.",
    answer: (name) => `Trả lời ${name}`,
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  remove: {
    title: "Xóa tin này?",
    body: (count) =>
      `Thẻ của bạn và ${replies(count)} từ bạn bè sẽ bị xóa. Cuộc trò chuyện vẫn giữ ghi chú “Tin đã xóa”. Bạn không thể hoàn tác.`,
    allTitle: "Xóa tất cả tin?",
    allBody:
      "Tất cả tin của bạn và phản hồi của bạn bè sẽ bị xóa. Cuộc trò chuyện vẫn giữ ghi chú “Tin đã xóa”. Bạn không thể hoàn tác.",
    confirm: "Xóa",
    cancel: "Hủy",
    failed: "Không xóa được. Hãy thử lại.",
  },
  archive: {
    entryTitle: "Tin của tôi",
    entryDescription: "Những từ và thẻ bạn đã chia sẻ",
    title: "Tin của tôi",
    back: "Về Cài đặt",
    keep: "Giữ tin của tôi sau 24 giờ",
    keepBody: "Bạn bè thấy tin trong 24 giờ. Chỉ mình bạn thấy kho lưu trữ này.",
    count: (count) => `${count} tin`,
    newest: "Mới nhất trước",
    live: LIVE,
    tileMeta: (date, count) => `${date} · ${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko}, ${meaning}, ${date}, ${replies(count)}${live ? `, ${LIVE}` : ""}`,
    deleteOne: (date) => `Xóa tin ngày ${date}`,
    deleteToday: "Xóa tin hôm nay",
    deleteAll: "Xóa tất cả tin",
    deleteAllNote: "Thẻ của bạn và phản hồi của bạn bè sẽ bị xóa khỏi máy chủ của chúng tôi.",
    empty: "Chưa có tin nào. Chạm + phía trên các cuộc trò chuyện để chia sẻ một từ.",
    today: "Hôm nay",
    date: (month, day) => `${day}/${month}`,
  },
  quote: {
    mine: "Bạn đã trả lời về tin của mình",
    replyingMine: "Đang trả lời về tin của mình",
    deleted: "Tin đã xóa",
    deletedLabel: "Trả lời một tin đã xóa",
  },
};
