// 내 스토리 문구(vi, ADR-0194).

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
    next: "Tin tiếp theo",
    nextLabel: (time) => `Tin tiếp theo mở lúc ${time}`,
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
        title: "Bạn bè trả lời trong vòng một giờ",
        body: "Phản hồi hiện trong cuộc trò chuyện với từng người bạn.",
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
    windowUsed: (time) =>
      time === null
        ? "Bạn đã chia sẻ tin cho khung giờ này."
        : `Bạn đã chia sẻ tin cho khung giờ này. Tin tiếp theo mở lúc ${time}.`,
    failed: "Không chia sẻ được tin. Hãy thử lại.",
  },
  viewer: {
    yourStory: "Tin của bạn",
    kindLabel: (kind) => (kind === "word" ? "Thẻ từ" : "Thẻ bài học"),
    textLabel: "Tin chữ",
    cardTag: (kind) => (kind === "word" ? "TỪ CỦA TÔI HÔM NAY" : "THẺ BÀI HỌC"),
    close: "Đóng",
    options: "Tùy chọn tin",
    delete: "Xóa tin",
    replied: (count) => (count === 0 ? "Chưa có phản hồi" : `${count} người bạn đã trả lời`),
    seenBy: (count) => `${count} người đã xem`,
    seenByLabel: (count) => `${count} người bạn đã xem`,
    openChat: "Mở trò chuyện",
    openChatLabel: (name) => `Mở trò chuyện với ${name}`,
    saved: "Phản hồi được lưu trong cuộc trò chuyện với từng người bạn.",
    waiting: "Bạn bè thường trả lời trong vòng một giờ.",
    waitingBody:
      "Chúng tôi sẽ báo cho bạn. Phản hồi hiện ở đây và trong cuộc trò chuyện với từng người bạn.",
    noFriendsTitle: "Thêm bạn để nhận phản hồi",
    noFriendsBody: "Hãy trò chuyện với ai đó trước — rồi họ sẽ thấy tin của bạn.",
    findFriends: "Tìm bạn",
    hidden: "Bạn bè đã xem tin này trong 24 giờ. Giờ chỉ mình bạn thấy.",
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  window: {
    title: (slot) =>
      `Bạn đã chia sẻ tin ${slot === "morning" ? "sáng" : slot === "day" ? "chiều" : "tối"} nay`,
    body: (time) => `Mỗi buổi sáng, chiều và tối một tin. Tin tiếp theo mở lúc ${time}.`,
    slot: (slot) => (slot === "morning" ? "Sáng" : slot === "day" ? "Chiều" : "Tối"),
    range: (start, end) => `${start} – ${end}`,
    time: (hour, minute) => `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    shared: "Đã chia sẻ",
    missed: "Đã bỏ lỡ",
    open: "Đang mở",
    opens: (time) => `Mở lúc ${time}`,
    slotLabel: (slot, range, state) => `${slot}, ${range}, ${state}`,
    ok: "Đã hiểu",
    close: "Đóng",
  },
  start: {
    title: "Tin mới",
    close: "Đóng",
    camera: "Máy ảnh",
    background: "Nền",
    recent: "Ảnh gần đây",
  },
  editor: {
    label: "Chỉnh sửa tin",
    back: "Quay lại",
    colors: "Màu nền",
    color: (background) =>
      background === "orange"
        ? "Cam"
        : background === "green"
          ? "Xanh lá"
          : background === "blue"
            ? "Xanh dương"
            : "Tím",
    colorLabel: (name, on) => `${name}${on ? ", đã chọn" : ""}`,
    text: "Chữ",
    words: "Từ",
    cards: "Thẻ",
    share: "Chia sẻ với bạn bè",
    posting: "Đang chia sẻ…",
    hintOne: "Thêm một từ hoặc thẻ để chia sẻ.",
    hintMove: "Kéo để di chuyển, chụm hai ngón để đổi cỡ.",
    stickerLabel: (ko, meaning) => `${ko}, ${meaning}`,
    remove: (ko) => `Xóa ${ko}`,
    textBlocked: "Không thể chia sẻ đoạn chữ này. Hãy thử từ khác.",
  },
  textEntry: {
    label: "Chữ trên tin, tiếng Hàn hoặc tiếng Anh",
    help: "Tiếng Hàn hay tiếng Anh — chúng tôi giúp bạn",
    done: "Xong",
    colors: "Màu chữ",
    color: (textColor) =>
      textColor === "brown"
        ? "Nâu"
        : textColor === "black"
          ? "Đen"
          : textColor === "white"
            ? "Trắng"
            : "Cam",
    colorLabel: (name, on) => `${name}${on ? ", đã chọn" : ""}`,
    editLabel: (ko) => `Sửa chữ: ${ko}`,
  },
  add: {
    title: "Thêm vào tin",
    hint: "Chạm vào một từ để đặt. Tối đa 8 trong một tin.",
    hintOne: "Chạm vào một từ để đặt.",
  },
  quiz: {
    free: "Trả lời câu đố miễn phí",
    freeAnswer: "Miễn phí · trả lời câu đố",
    lastTry: "Miễn phí · lần cuối",
    correct: (name) => `Chính xác! Bạn và ${name} thân hơn rồi`,
    gift: (name, word) => `Quà giọng nói · ${name} nói “${word}”`,
  },
  remove: {
    title: "Xóa tin này?",
    body: (count) =>
      `Thẻ của bạn và ${replies(count)} trên thẻ sẽ bị xóa. Tin nhắn trong các cuộc trò chuyện vẫn còn, kèm ghi chú “Tin đã xóa”. Bạn không thể hoàn tác.`,
    allTitle: "Xóa tất cả tin?",
    allBody:
      "Tất cả tin của bạn và phản hồi trên đó sẽ bị xóa. Tin nhắn trong các cuộc trò chuyện vẫn còn, kèm ghi chú “Tin đã xóa”. Bạn không thể hoàn tác.",
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
    deleteAllNote: "Thẻ của bạn và phản hồi trên đó được xóa khỏi máy chủ của chúng tôi.",
    empty: "Chưa có tin nào. Chạm + phía trên các cuộc trò chuyện để chia sẻ một từ.",
    today: "Hôm nay",
    date: (month, day) => `${day}/${month}`,
  },
  quote: {
    mine: "Bạn đã trả lời về tin của mình",
    reacted: "Đã trả lời tin của bạn",
    deleted: "Tin đã xóa",
    deletedLabel: "Trả lời một tin đã xóa",
  },
};
