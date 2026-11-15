// 앨범 · 사진 속 내 모습 · 다시 만들기 문구(es, ADR-0150).

import type { ChatAlbumCopy } from "../screens/messenger-chat/chat-album.contract";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

export const messengerChatAlbumEs: ChatAlbumCopy = {
  sidebarRow: "Álbum",
  sidebarDescription: "Fotos y mensajes de voz",
  title: (name) => `Álbum de ${name}`,
  back: "Atrás",
  tabs: { all: "Todo", photos: "Fotos", voice: "Voz" },
  day: (day) =>
    day.kind === "today"
      ? "Hoy"
      : day.kind === "yesterday"
        ? "Ayer"
        : `${day.day} ${MONTHS[day.month - 1] ?? ""}`,
  drawing: "Dibujando…",
  recording: "Grabando…",
  versions: (count) => `${count} versiones`,
  version: (index, count) => `Versión ${index} de ${count}`,
  pastChat: "De un chat anterior",
  keepNote: "Las fotos y los mensajes de voz se quedan aquí aunque borres el chat.",
  empty: (name) => `Las fotos y los mensajes de voz de ${name} aparecerán aquí.`,
  loadFailed: "No se pudo cargar el álbum.",
  tryAgain: "Reintentar",
  more: "Ver más",
  photoLabel: (name, line) => (line === "" ? `Foto de ${name}` : `Foto de ${name}, ${line}`),
  voiceLabel: (name, line) =>
    line === "" ? `Mensaje de voz de ${name}` : `Mensaje de voz de ${name}, ${line}`,
  viewerTitle: (name, day) => `${name} · ${day}`,
  fromChat: "De tu chat",
  close: "Cerrar",
  redraw: (price) => `Redibujar · ${price}`,
  recordAgain: (price) => `Grabar de nuevo · ${price}`,
  play: "Reproducir",
  pause: "Pausar",
  redrawTitle: "¿Redibujar esta foto?",
  redrawBody: (name) => `${name} volverá a dibujar este momento. Conservarás las dos fotos en tu álbum.`,
  recordTitle: "¿Grabar de nuevo?",
  recordBody: (name) => `${name} volverá a decir esta frase en una nueva toma.`,
  confirmRedraw: (price) => `Redibujar por ${price} Yeopjeon`,
  confirmRecord: (price) => `Grabar por ${price} Yeopjeon`,
  balance: (coins) => `Tienes ${coins} Yeopjeon`,
  getCoins: "Conseguir Yeopjeon",
  cancel: "Cancelar",
  refused: (notice, media, name) => {
    const photo = media === "photo";
    switch (notice) {
      case "no-coins":
        return "No tienes suficientes Yeopjeon.";
      case "busy":
        return photo
          ? `${name} todavía está con otra foto.`
          : `${name} todavía está grabando otro mensaje de voz.`;
      case "limit":
        return "Llegaste al límite de hoy. Inténtalo más tarde.";
      case "not-eligible":
        return photo ? "Esta foto no se puede redibujar." : "Este mensaje de voz no se puede volver a grabar.";
      default:
        return "No se pudo enviar tu solicitud. Inténtalo de nuevo.";
    }
  },
  selfSection: "Sobre ti",
  selfRow: "Tú en las fotos",
  selfTitle: "Tú en las fotos",
  selfBody: "Cuando un personaje te envía una foto, puedes aparecer en ella. Nunca dibujamos tu cara.",
  selfAsk: "¿Cómo quieres aparecer?",
  selfAskNote: "Siempre de espaldas, nunca tu cara. Puedes cambiarlo en Ajustes › Chats.",
  selfOptions: {
    female: { title: "Mujer", body: "De espaldas" },
    male: { title: "Hombre", body: "De espaldas" },
    hidden: { title: "Solo manos", body: "Solo tus manos o tu hombro" },
  },
  save: "Guardar",
};
