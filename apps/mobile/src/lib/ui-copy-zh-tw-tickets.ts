// 대만 중국어(번체, zh-TW) 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄) 덩어리(ADR-0185).
// 번역 초안 — 원어민 검수 필요(ADR-0185).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

// 날짜는 달 이름 표 없이 숫자로 씁니다(Android PrimJS에 날짜 서식 API가 없음).
export const ticketsZhTw: TicketsCopy = {
  ticketsLeft: (count) => `剩下${String(count)}張票券`,
  unlimited: "無限票券",
  unlimitedLine: "未使用票券 · 無限",
  noTicketNeeded: "不需要票券",
  unlimitedModal: {
    guestPass: "訪客通行證",
    guestMessage: "這個帳號可使用\n所有課程和角色扮演。",
    gotIt: "知道了",
    renewsOn: "續訂日期",
    endsOn: "結束日期",
    memberSince: (date) => `自${date}起成為會員`,
    endsDate: (date) => `${date}結束`,
    daysLeft: (days) => `剩下${String(days)}天`,
    dayProgress: (left, total) => `剩下${String(left)}天，共${String(total)}天`,
    hoursLeft: (hours) => `剩下${String(hours)}小時`,
    hourProgress: (left, total) => `剩下${String(left)}小時，共${String(total)}小時`,
    activeMessage: "不需要票券就能開始任何課程。",
    endingMessage: "之後，課程將再次使用票券。\n你的學習進度會全部保留。",
    manage: "管理訂閱",
    keep: "繼續使用無限方案",
    date: (d) => `${String(d.year)}年${String(d.month)}月${String(d.day)}日`,
    shortDate: (d) => `${String(d.month)}月${String(d.day)}日`,
  },
  modal: {
    title: () => "剩餘票券",
    nextTicketIn: "下一張票券",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `${String(total)}張票券中有${String(available)}張可用`
        : `${String(total)}張票券中有${String(available)}張可用。下一張票券還要 ${nextClock}`,
    slotReady: "可用",
    message: "每堂課使用一張票券。\n用掉的票券會在1小時後恢復。",
  },
  getMore: "取得1張票券",
  getMoreLabel: (price) => `用${String(price)}枚錢幣取得1張票券`,
  moreNotice: {
    bought: "已加入1張票券。",
    short: (more) => `錢幣不足，還需要${String(more)}枚。`,
    full: "你的票券已經滿了。",
    signIn: "登入後即可使用錢幣。",
    failed: "無法取得票券。請再試一次。",
  },
  outOfTickets: {
    title: "票券用完了",
    untilNext: "後恢復下一張票券",
    clockLabel: (clock) => `${clock}後恢復下一張票券`,
    message: "開始這堂課需要一張票券。\n每張票券會在1小時後恢復。",
    startLesson: "開始課程",
    backToMap: "返回地圖",
  },
  startCost: "使用1張票券",
};
