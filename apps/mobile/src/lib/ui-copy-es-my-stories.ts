// 내 스토리 문구(es, ADR-0179).

import type { MyStoriesCopy } from "../screens/messenger-chat/my-stories-copy.contract";

const replies = (count: number) => (count === 1 ? "1 respuesta" : `${count} respuestas`);
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];

const LIVE = "ACTIVA";

export const myStoriesEs: MyStoriesCopy = {
  language: "es",
  row: {
    create: "Nueva",
    createLabel: "Crear una historia nueva",
    mine: "Tu historia",
    mineLabel: (count, unseen) =>
      `Tu historia, ${replies(count)}${unseen ? ", respuestas nuevas" : ""}`,
  },
  guide: {
    title: "Comparte una palabra en coreano",
    body: "Tus amigos de aquí te responderán: cada historia es una pequeña práctica de coreano.",
    steps: [
      {
        title: "Elige una palabra o una tarjeta de lección",
        body: "De tus palabras guardadas o de tus lecciones.",
      },
      {
        title: "Tus amigos responden a lo largo del día",
        body: "Usan tu palabra. Toca Responder para seguir la conversación.",
      },
      {
        title: "Solo tus amigos de duru la ven",
        body: "Nadie más la ve. Bórrala cuando quieras en Ajustes › Mis historias.",
      },
    ],
    start: "Crear mi primera historia",
    later: "Ahora no",
    stepLabel: (n, title, body) => `${n}. ${title}. ${body}`,
  },
  composer: {
    title: "Nueva historia",
    close: "Cerrar",
    tabsLabel: "Qué compartir",
    tab: (kind) => (kind === "word" ? "Palabras" : "Tarjetas"),
    wordsTitle: "Elige una palabra guardada",
    wordCount: (count) => (count === 1 ? "1 palabra" : `${count} palabras`),
    all: "Todas",
    emptyWords: "Aún no tienes palabras guardadas. Aquí aparecen las palabras de tus lecciones.",
    emptyCards: "Termina una lección para compartir sus tarjetas.",
    chipLabel: (label, on) => `${label}${on ? ", seleccionado" : ""}`,
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", seleccionada" : ""}`,
    share: (ko) => `Crear una tarjeta con ${ko}`,
    shareCard: "Compartir la tarjeta",
    posting: "Compartiendo…",
    dailyLimit: "Ya compartiste suficientes historias hoy. Vuelve a intentarlo mañana.",
    failed: "No se pudo compartir tu historia. Inténtalo de nuevo.",
  },
  viewer: {
    yourStory: "Tu historia",
    kindLabel: (kind) => (kind === "word" ? "Tarjeta de palabra" : "Tarjeta de lección"),
    cardTag: (kind) => (kind === "word" ? "MI PALABRA DEL DÍA" : "TARJETA DE LECCIÓN"),
    close: "Cerrar",
    options: "Opciones de la historia",
    delete: "Borrar historia",
    repliesTitle: "Tus amigos usaron tu palabra",
    waiting: "Tus amigos responderán a lo largo del día.",
    hidden: "Tus amigos la vieron durante 24 horas. Ahora solo la ves tú.",
    answer: (name) => `Responder a ${name}`,
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  remove: {
    title: "¿Borrar esta historia?",
    body: (count) =>
      `Se borrarán tu tarjeta y ${replies(count)} de tus amigos. En los chats quedará la nota «Historia borrada». No se puede deshacer.`,
    allTitle: "¿Borrar todas las historias?",
    allBody:
      "Se borrarán todas tus historias y las respuestas de tus amigos. En los chats quedará la nota «Historia borrada». No se puede deshacer.",
    confirm: "Borrar",
    cancel: "Cancelar",
    failed: "No se pudo borrar. Inténtalo de nuevo.",
  },
  archive: {
    entryTitle: "Mis historias",
    entryDescription: "Palabras y tarjetas que compartiste",
    title: "Mis historias",
    back: "Volver a Ajustes",
    keep: "Guardar mis historias después de 24 horas",
    keepBody: "Tus amigos ven una historia durante 24 horas. Este archivo solo lo ves tú.",
    count: (count) => (count === 1 ? "1 historia" : `${count} historias`),
    newest: "Más recientes primero",
    live: LIVE,
    tileMeta: (date, count) => `${date} · ${replies(count)}`,
    tileLabel: (ko, meaning, date, count, live) =>
      `${ko}, ${meaning}, ${date}, ${replies(count)}${live ? `, ${LIVE}` : ""}`,
    deleteOne: (date) => `Borrar la historia del ${date}`,
    deleteToday: "Borrar la historia de hoy",
    deleteAll: "Borrar todas las historias",
    deleteAllNote: "Tus tarjetas y las respuestas de tus amigos se borran de nuestros servidores.",
    empty: "Aún no hay historias. Toca + encima de tus chats para compartir una palabra.",
    today: "Hoy",
    date: (month, day) => `${day} ${MONTHS[month - 1] ?? month}`,
  },
  quote: {
    mine: "Respondiste sobre tu historia",
    replyingMine: "Respondiendo sobre tu historia",
    deleted: "Historia borrada",
    deletedLabel: "Respuesta a una historia borrada",
  },
};
