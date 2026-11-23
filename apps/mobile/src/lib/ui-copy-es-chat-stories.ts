// 친구 스토리 줄 · 보기 · 대화 인용 문구(es, ADR-0177).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesEs: FriendStoriesCopy = {
  language: "es",
  rowTitle: "Historias",
  watchAll: "Ver todas",
  watchAllLabel: "Ver todas las historias",
  age: (age) =>
    age.unit === "now" ? "ahora" : age.unit === "m" ? `${age.value} min` : `${age.value} h`,
  seen: "Vista",
  newBadge: "Nueva",
  friendLabel: (name, age, seen) => `Historia de ${name}, ${age}${seen ? ", vista" : ", nueva"}`,
  unmetLabel: (name) => `Historia de ${name}, nuevo amigo`,
  findFriends: "Buscar amigos",
  findFriendsLabel: "Buscar amigos",
  listPreview: (line) => `Nueva historia · ${line}`,
  listRowLabel: (name, line) => `${name}, nueva historia: ${line}. Abre la historia`,
  viewer: {
    label: (name) => `Historia de ${name}`,
    progress: (index, count) => `Historia ${index} de ${count}`,
    pause: "Pausar",
    play: "Reproducir",
    close: "Cerrar",
    previous: "Historia anterior",
    next: "Historia siguiente",
    photoLabel: (name) => `Foto de ${name}`,
    saveWord: (ko, meaning) => `${ko} · ${meaning} — Guardar palabra`,
    saveWordLabel: (ko, meaning) => `Guardar ${ko}, ${meaning}, en Mis palabras`,
    saved: (ko) => `${ko} guardada en Mis palabras`,
    freeReply: "La primera respuesta es gratis",
    replyPlaceholder: (name) => `Responder a ${name}…`,
    replyChipLabel: (text) => `Responder: ${text}`,
    newFriend: "NUEVO AMIGO",
    addAndReply: "Agregar y responder",
    seeHowToMeet: "Cómo conocerle",
  },
  reply: {
    caption: (name) => `Respondiste a la historia de ${name}`,
    storyMeta: (age) => (age === null ? "Historia" : `Historia · ${age}`),
    replying: (name) => `Respondiendo a la historia de ${name}`,
    removeQuote: "Quitar historia",
    quoteLabel: (name, line) => `Historia de ${name}: ${line}`,
  },
};
