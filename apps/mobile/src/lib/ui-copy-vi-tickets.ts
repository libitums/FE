// 베트남어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0091 D3).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

export const ticketsVi: TicketsCopy = {
  ticketsLeft: (count) => `Còn ${String(count)} vé`,
  unlimited: "Vé không giới hạn",
  unlimitedLine: "Không dùng vé · Không giới hạn",
  noTicketNeeded: "Không cần vé",
  unlimitedModal: {
    guestPass: "THẺ KHÁCH",
    guestMessage: "Mọi bài học và nhập vai đều mở\ntrên tài khoản này.",
    gotIt: "Đã hiểu",
    renewsOn: "Gia hạn vào",
    endsOn: "Kết thúc vào",
    memberSince: (date) => `Thành viên từ ${date}`,
    endsDate: (date) => `Kết thúc ${date}`,
    daysLeft: (days) => `Còn ${String(days)} ngày`,
    dayProgress: (left, total) => `${String(left)}/${String(total)} ngày`,
    activeMessage: "Bắt đầu mọi bài học mà không cần vé.",
    endingMessage: "Sau đó, bài học sẽ dùng vé trở lại.\nTiến độ của bạn vẫn được giữ nguyên.",
    manage: "Quản lý gói đăng ký",
    keep: "Tiếp tục không giới hạn",
    date: (d) => `${String(d.day)} tháng ${String(d.month)}, ${String(d.year)}`,
    shortDate: (d) => `${String(d.day)} tháng ${String(d.month)}`,
  },
  modal: {
    title: () => "vé còn lại",
    nextTicketIn: "Vé tiếp theo sau",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `${String(available)}/${String(total)} vé sẵn sàng`
        : `${String(available)}/${String(total)} vé sẵn sàng. Vé tiếp theo sau ${nextClock}`,
    slotReady: "Sẵn sàng",
    message: "Mỗi bài học dùng một vé.\nVé đã dùng sẽ được hồi lại sau 1 giờ.",
  },
  getMore: "Nhận thêm vé",
  moreNotice: {
    granted: "Sắp có thêm cách nhận vé. Tặng bạn một vé miễn phí hôm nay!",
    notGranted: "Sắp có thêm cách nhận vé.",
  },
  outOfTickets: {
    title: "Hết vé",
    untilNext: "đến vé tiếp theo",
    clockLabel: (clock) => `Còn ${clock} đến vé tiếp theo`,
    message: "Bạn cần một vé để bắt đầu bài học này.\nMỗi vé sẽ được hồi lại sau 1 giờ.",
    startLesson: "Bắt đầu bài học",
    backToMap: "Về bản đồ",
  },
  startCost: "Dùng 1 vé",
};
