// 메신저 서버 사진 · 음성 문구(es, ADR-0146 「앱 연결」).

import type { ChatMediaCopy } from "../screens/messenger-chat/chat-media.contract";

export const messengerChatMediaEs: ChatMediaCopy = {
  notice: (notice, media, name, until) => {
    const photo = media === "photo";
    switch (notice) {
      case "blocked":
        return photo
          ? `${name} no pudo compartir esa escena. Te devolvimos tus Yeopjeon.`
          : `${name} no pudo grabar ese mensaje. Te devolvimos tus Yeopjeon.`;
      case "failed":
        return photo
          ? "La foto no llegó. Te devolvimos tus Yeopjeon."
          : "El mensaje de voz no llegó. Te devolvimos tus Yeopjeon.";
      case "limit":
        return until === null
          ? "Llegaste al límite de hoy. Inténtalo más tarde."
          : `Llegaste al límite de hoy. Inténtalo después de las ${until}.`;
      case "busy":
        return photo
          ? `${name} todavía está con otra foto.`
          : `${name} todavía está grabando otro mensaje de voz.`;
      case "no-coins":
        return "No tienes suficientes Yeopjeon. Consigue más para pedirlo de nuevo.";
      case "not-eligible":
        return photo
          ? "Este mensaje no se puede convertir en foto."
          : "Este mensaje no se puede convertir en mensaje de voz.";
      case "unavailable":
        return "Las fotos y los mensajes de voz no están disponibles ahora.";
      case "sample-gift":
        return photo
          ? "¡Esa corrió por mi cuenta! La próxima Snapshot usa tus Yeopjeon."
          : "¡Ese corrió por mi cuenta! El próximo Nota de voz usa tus Yeopjeon.";
      default:
        return "No se pudo enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo.";
    }
  },
  hint: (availability, _media, name) => {
    switch (availability) {
      case "pending":
        return `${name} todavía está en ello`;
      case "done":
        return "Ya enviado para este mensaje";
      default:
        return `Disponible después del próximo mensaje de ${name}`;
    }
  },
  aiLabel: "Generado por IA",
  voiceLabel: (name, ko, en) =>
    en === "" ? `${name}: mensaje de voz, ${ko}` : `${name}: mensaje de voz, ${ko}, ${en}`,
  listVoice: "Mensaje de voz",
};
