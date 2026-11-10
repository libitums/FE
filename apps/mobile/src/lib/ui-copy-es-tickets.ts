// 스페인어 문구표 구획 — 학습 티켓(머리 칩 모달 · 티켓 없음 대화상자 · 말풍선 태그 · 결과 줄).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { TicketsCopy } from "../screens/tickets/tickets.contract";

const monthsEs = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

export const ticketsEs: TicketsCopy = {
  ticketsLeft: (count) =>
    count === 1 ? "Te queda 1 boleto" : `Te quedan ${String(count)} boletos`,
  unlimited: "Boletos ilimitados",
  unlimitedLine: "Sin usar boleto · Ilimitado",
  noTicketNeeded: "No se necesita boleto",
  unlimitedModal: {
    guestPass: "PASE DE INVITADO",
    guestMessage: "Todas las lecciones y los roleplays\nestán abiertos en esta cuenta.",
    gotIt: "Entendido",
    renewsOn: "Se renueva el",
    endsOn: "Termina el",
    memberSince: (date) => `Miembro desde el ${date}`,
    endsDate: (date) => `Termina el ${date}`,
    daysLeft: (days) => (days === 1 ? "Queda 1 día" : `Quedan ${String(days)} días`),
    dayProgress: (left, total) => `${String(left)} de ${String(total)} días`,
    activeMessage: "Empieza cualquier lección sin boleto.",
    endingMessage: "Después, las lecciones vuelven a usar boletos.\nConservas todo tu progreso.",
    manage: "Gestionar suscripción",
    keep: "Mantener ilimitado",
    date: (d) => `${String(d.day)} de ${monthsEs[d.month - 1] ?? ""} de ${String(d.year)}`,
    shortDate: (d) => `${String(d.day)} de ${monthsEs[d.month - 1] ?? ""}`,
    intro: {
      title: "Pasa a ilimitado",
      benefitMessages: "Sin límite diario de mensajes de chat",
      benefitLessons: "Empieza cualquier lección sin ticket",
      comingSoon: "Próximamente",
      comingSoonNote:
        "Los planes ilimitados aún no están a la venta. Te avisaremos cuando lo estén.",
    },
  },
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
