// 스페인어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

export const ticketsEs: TicketsCopy = {
  ticketsLeft: (count) =>
    count === 1 ? "Te queda 1 boleto" : `Te quedan ${String(count)} boletos`,
  unlimited: "Boletos ilimitados",
  unlimitedValue: "∞",
  modal: {
    title: (count) => (count === 1 ? "boleto restante" : "boletos restantes"),
    nextTicketIn: "Siguiente boleto en",
    slotsLabel: (available, total, nextClock) =>
      nextClock === null
        ? `${String(available)} de ${String(total)} boletos listos`
        : `${String(available)} de ${String(total)} boletos listos. Siguiente boleto en ${nextClock}`,
    slotReady: "Listo",
    message: "Cada lección usa un boleto.\nUn boleto usado se recarga en 1 hora.",
  },
  getMore: "Conseguir más boletos",
  moreNotice: {
    granted: "Pronto habrá más formas de conseguir boletos. ¡Aquí tienes uno gratis por hoy!",
    notGranted: "Pronto habrá más formas de conseguir boletos.",
  },
  outOfTickets: {
    title: "Sin boletos",
    untilNext: "para tu siguiente boleto",
    clockLabel: (clock) => `${clock} para tu siguiente boleto`,
    message: "Necesitas un boleto para empezar esta lección.\nCada boleto se recarga en 1 hora.",
    startLesson: "Empezar lección",
    backToMap: "Volver al mapa",
  },
  startCost: "Usa 1 boleto",
};
