// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(es, ADR-0162).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedEs: SuggestedFriendsCopy = {
  language: "es",
  rowTitle: "Conoce nuevos amigos",
  seeAll: "Ver todos",
  seeAllLabel: "Ver todos los amigos",
  newLabel: (name) => `${name}, nueva amistad`,
  lockedLabel: (name, episode) => `${name}, se conocerán en el episodio ${episode}`,
  earlyLabel: (name, episode, price) =>
    `${name}, se conocerán en el episodio ${episode} o chatea ya por ${price} monedas`,
  sheetLabel: (name) => `${name}, perfil`,
  newBadge: "NUEVO",
  startChatting: "Empezar a chatear",
  notNow: "Ahora no",
  meetIn: (episode) => `Se conocerán en el episodio ${episode}`,
  lockedInfo: (name) =>
    `Termina la historia para intercambiar números: ${name} te escribirá primero.`,
  chatNow: (price) => `Chatear ya · ${price}`,
  earlyButtonLabel: (price, left) =>
    `Chatear ya por ${price} monedas, oferta limitada${left === null ? "" : `, quedan ${left.days} días y ${left.hours} horas`}`,
  launchSpecial: (name) => `Especial de lanzamiento · conoce antes a ${name}`,
  limited: "LIMITADO",
  limitedUntil: (days, hours) => `LIMITADO · ${days} d ${hours} h`,
  added: (name) => `${name} se agregó a tus chats`,
  addFailed: (name) => `No se pudo agregar a ${name}. Inténtalo de nuevo.`,
  adultAck: {
    title: (name) => `¿Quieres acercarte más a ${name}?`,
    body: (gender) =>
      gender === null
        ? "La charla puede ser más cálida y cercana, como con alguien a quien estás conociendo."
        : gender === "female"
          ? "Puede ser más cálida y cercana contigo, como alguien a quien estás conociendo."
          : "Puede ser más cálido y cercano contigo, como alguien a quien estás conociendo.",
    safe: "Siempre con amabilidad y respeto. Nunca nada explícito.",
    casual: (gender) =>
      `¿Prefieres algo más tranquilo después? ${gender === null ? "Solo dilo." : "Solo díselo."}`,
    confirm: "Me parece bien",
    decline: "Solo amigos por ahora",
  },
  profile: {
    openProfile: (name) => `${name}, ver perfil`,
    voice: {
      hear: "Escuchar voz",
      pause: "Pausar",
      resume: "Continuar",
      unavailable: "Muestra de voz no disponible",
      label: (name) => `Escuchar la voz de ${name}`,
    },
  },
  directory: {
    title: "Buscar amigos",
    back: "Atrás",
    all: "Todos",
    fromStory: "De tu historia",
    sectionStory: "DE TU HISTORIA",
    sectionNew: "NUEVOS AMIGOS",
    chat: "Chatear",
    chatLabel: (name) => `Chatear con ${name}`,
    added: "Agregado",
    addedLabel: (name) => `${name}, ya está en tus chats`,
    earlyLabel: (name, price) => `Conoce antes a ${name} por ${price} monedas`,
    locked: (episode) => `Ep. ${episode}`,
    lockedLabel: (name, episode) => `${name}, se conocerán en el episodio ${episode}`,
    meetIn: (episode) => `Se conocerán en el episodio ${episode}`,
    moreComing: "Pronto llegarán más amigos",
    chipLabel: (label, selected) => (selected ? `${label}, seleccionado` : label),
  },
};
