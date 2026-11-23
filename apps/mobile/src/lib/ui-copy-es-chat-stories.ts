// 친구 스토리 줄 · 보기 · 대화 인용 문구(es, ADR-0178).

import type { FriendStoriesCopy } from "../screens/messenger-chat/friend-stories.contract";

export const messengerChatStoriesEs: FriendStoriesCopy = {
  language: "es",
  // 낭독 조각 잇기 — 언어마다 구분자(감사 다국어 minor 9).
  listSeparator: ", ",
  labelSeparator: ": ",
  rowTitle: "Historias",
  watchAll: "Ver todas",
  watchAllLabel: "Ver todas las historias",
  age: (age) =>
    age.unit === "now" ? "ahora" : age.unit === "m" ? `${age.value} min` : `${age.value} h`,
  seen: "Vista",
  newBadge: "Nueva",
  friendLabel: (name, age, seen) => `Historia de ${name}, ${age}${seen ? ", vista" : ", nueva"}`,
  unmetLabel: (name) => `Historia de ${name}, nueva amistad`,
  findFriends: "Buscar", // 줄 칸(76px)에 맞게 짧게 — 낭독은 findFriendsLabel(친구 찾기 제목 그대로)
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
    newFriend: "NUEVA AMISTAD",
    addAndReply: "Agregar y responder",
    seeHowToMeet: "Ver cómo conocerse",
  },
  reply: {
    caption: (name) => `Respondiste a la historia de ${name}`,
    storyMeta: (age) => (age === null ? "Historia" : `Historia · ${age}`),
    replying: (name) => `Respondiendo a la historia de ${name}`,
    removeQuote: "Quitar cita",
  },
};
