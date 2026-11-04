// 일본어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0098).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

export const ticketsJa: TicketsCopy = {
  ticketsLeft: (count) => `残り${String(count)}枚`,
  unlimited: "チケット無制限",
  unlimitedValue: "∞",
  modal: {
    title: (_count) => "残りのチケット",
    nextTicketIn: "次のチケットまで",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `チケット${String(total)}枚中${String(available)}枚が使えます`
        : `チケット${String(total)}枚中${String(available)}枚が使えます。次のチケットまで${nextClock}`,
    slotReady: "使用可",
    message: "レッスン1回につきチケットを1枚使います。\n使ったチケットは1時間で回復します。",
  },
  getMore: "チケットを増やす",
  moreNotice: {
    granted: "チケットを手に入れる方法は近日公開です。今日は無料チケットをどうぞ！",
    notGranted: "チケットを手に入れる方法は近日公開です。",
  },
  outOfTickets: {
    title: "チケットがありません",
    untilNext: "次のチケットまで",
    clockLabel: (clock) => `次のチケットまで${clock}`,
    message: "このレッスンを始めるにはチケットが必要です。\nチケットは1時間で1枚回復します。",
    startLesson: "レッスンを始める",
    backToMap: "マップに戻る",
  },
  startCost: "チケット1枚を使用",
};
