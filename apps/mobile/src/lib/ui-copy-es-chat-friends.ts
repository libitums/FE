// 추천 친구 문구(es) — 추천 줄 · 프로필 시트 · 성인 확인 대화상자. AI 표시는 방 고지(`safety.aiDisclosure`)와 같은 말 갈래입니다.

import type { FriendsCopy } from "../screens/messenger-chat/chat-friends.contract";

export const messengerChatFriendsEs: FriendsCopy = {
  profileLanguage: "es",
  stripTitle: "Amigos recomendados",
  cardLabel: (name, job) => `${name}, ${job}, ver perfil`,
  addFriend: "Añadir amigo",
  close: "Cerrar",
  openProfile: (name) => `Perfil de ${name}`,
  ageLabel: "Edad",
  jobLabel: "Trabajo",
  mbtiLabel: "MBTI",
  age: (age) => {
    switch (age.kind) {
      case "years":
        return `${age.value} años`;
      case "decade":
        return `${age.value} y tantos`;
      case "range":
        return `${age.from}–${age.to} años`;
    }
  },
  aiLabel: "Personaje de IA. Las respuestas las escribe una IA.",
  adultTitle: "Confirma que eres mayor de edad",
  adultBody: (name) =>
    `${name} puede hablar en un tono romántico, como de pareja. Confirma que eres mayor de edad (18 años o más).`,
  adultConfirm: "Soy mayor de edad",
  adultCancel: "Ahora no",
  unavailable: (name) => `Ahora no puedes chatear con ${name}.`,
};
