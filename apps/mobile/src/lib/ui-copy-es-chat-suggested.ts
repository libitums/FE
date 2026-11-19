// 추천 친구 줄 · 프로필 시트 · 친구 찾기 문구(es, ADR-0162).

import type { SuggestedFriendsCopy } from "../screens/messenger-chat/suggested-friends.contract";

export const messengerChatSuggestedEs: SuggestedFriendsCopy = {
  language: "es",
  rowTitle: "Conoce nuevos amigos",
  seeAll: "Ver todos",
  seeAllLabel: "Ver todos los amigos",
  earlyTag: (price) => `ANTES · ${price}`,
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
