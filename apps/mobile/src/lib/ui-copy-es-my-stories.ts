// 내 스토리 문구(es, ADR-0194).

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
    next: "Próxima historia",
    nextLabel: (time) => `La próxima historia se abre a las ${time}`,
  },
  guide: {
    title: "Comparte una palabra en coreano",
    body: "Tus amigos de aquí te responderán: cada historia es una pequeña práctica de coreano.",
    steps: [
      { title: "Elige una palabra", body: "De tus palabras guardadas." },
      {
        title: "Tus amigos responden en una hora",
        body: "Sus respuestas aparecen en el chat de cada amigo.",
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
    emptyWords: "Aún no tienes palabras guardadas. Aquí aparecen las palabras de tus lecciones.",
    choiceLabel: (ko, meaning, selected) => `${ko}, ${meaning}${selected ? ", seleccionada" : ""}`,
    posting: "Compartiendo…",
    dailyLimit: "Ya compartiste suficientes historias hoy. Vuelve a intentarlo mañana.",
    windowUsed: (time) =>
      time === null
        ? "Ya compartiste una historia en esta parte del día."
        : `Ya compartiste una historia en esta parte del día. La próxima se abre a las ${time}.`,
    failed: "No se pudo compartir tu historia. Inténtalo de nuevo.",
  },
  viewer: {
    yourStory: "Tu historia",
    kindLabel: (kind) => (kind === "word" ? "Tarjeta de palabra" : "Tarjeta de lección"),
    textLabel: "Historia de texto",
    cardTag: (kind) => (kind === "word" ? "MI PALABRA DEL DÍA" : "TARJETA DE LECCIÓN"),
    close: "Cerrar",
    options: "Opciones de la historia",
    delete: "Borrar historia",
    replied: (count) =>
      count === 0
        ? "Aún no hay respuestas"
        : count === 1
          ? "1 amigo respondió"
          : `${count} amigos respondieron`,
    seenBy: (count) => `Visto por ${count}`,
    seenByLabel: (count) => (count === 1 ? "Visto por 1 amigo" : `Visto por ${count} amigos`),
    openChat: "Abrir chat",
    openChatLabel: (name) => `Abrir chat con ${name}`,
    saved: "Las respuestas se guardan en el chat de cada amigo.",
    waiting: "Tus amigos suelen responder en menos de una hora.",
    waitingBody: "Te avisaremos. Las respuestas aparecen aquí y en el chat de cada amigo.",
    noFriendsTitle: "Agrega un amigo para recibir respuestas",
    noFriendsBody: "Primero chatea con alguien; luego verá tus historias.",
    findFriends: "Buscar amigos",
    hidden: "Tus amigos la vieron durante 24 horas. Ahora solo la ves tú.",
    reactionLabel: (name, text, meaning) => `${name}: ${text}${meaning ? `. ${meaning}` : ""}`,
  },
  window: {
    title: (slot) =>
      slot === "morning"
        ? "Ya compartiste la historia de esta mañana"
        : slot === "day"
          ? "Ya compartiste la historia de esta tarde"
          : "Ya compartiste la historia de esta noche",
    body: (time) =>
      `Una historia por la mañana, otra por la tarde y otra por la noche. La próxima se abre a las ${time}.`,
    slot: (slot) => (slot === "morning" ? "Mañana" : slot === "day" ? "Tarde" : "Noche"),
    range: (start, end) => `${start} – ${end}`,
    time: (hour, minute) => `${hour}:${String(minute).padStart(2, "0")}`,
    shared: "Compartida",
    missed: "No compartida",
    open: "Abierta ahora",
    opens: (time) => `Se abre a las ${time}`,
    slotLabel: (slot, range, state) => `${slot}, ${range}, ${state}`,
    ok: "Aceptar",
    close: "Cerrar",
  },
  start: {
    title: "Nueva historia",
    close: "Cerrar",
    camera: "Cámara",
    background: "Fondo",
    recent: "Fotos recientes",
  },
  editor: {
    label: "Editor de historia",
    back: "Atrás",
    colors: "Color de fondo",
    color: (background) =>
      background === "orange"
        ? "Naranja"
        : background === "green"
          ? "Verde"
          : background === "blue"
            ? "Azul"
            : "Morado",
    colorLabel: (name, on) => `${name}${on ? ", seleccionado" : ""}`,
    text: "Texto",
    words: "Palabras",
    share: "Compartir con amigos",
    posting: "Compartiendo…",
    hintOne: "Agrega una palabra para compartirla.",
    hintMove: "Arrastra para mover y pellizca para cambiar el tamaño.",
    stickerLabel: (ko, meaning) => `${ko}, ${meaning}`,
    remove: (ko) => `Quitar ${ko}`,
    textBlocked: "Este texto no se puede compartir. Prueba con otras palabras.",
  },
  textEntry: {
    label: "Texto de la historia, en coreano o inglés",
    help: "Coreano o inglés: te ayudamos",
    done: "Listo",
    colors: "Color del texto",
    color: (textColor) =>
      textColor === "brown"
        ? "Marrón"
        : textColor === "black"
          ? "Negro"
          : textColor === "white"
            ? "Blanco"
            : "Naranja",
    colorLabel: (name, on) => `${name}${on ? ", seleccionado" : ""}`,
    editLabel: (ko) => `Editar texto: ${ko}`,
  },
  add: {
    title: "Agregar una palabra",
    hint: "Toca una palabra para colocarla. Hasta 8 por historia.",
    hintOne: "Toca una palabra para colocarla.",
  },
  quiz: {
    free: "La respuesta del quiz es gratis",
    freeAnswer: "Gratis · respuesta del quiz",
    lastTry: "Gratis · último intento",
    correct: (name) => `¡Correcto! Tú y ${name} ahora son más cercanos`,
  },
  remove: {
    title: "¿Borrar esta historia?",
    body: (count) =>
      `Se borrarán tu tarjeta y las respuestas que tiene (${replies(count)}). Los mensajes de tus chats se quedan, con la nota «Historia borrada». No se puede deshacer.`,
    allTitle: "¿Borrar todas las historias?",
    allBody:
      "Se borrarán todas tus historias y sus respuestas. Los mensajes de tus chats se quedan, con la nota «Historia borrada». No se puede deshacer.",
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
    deleteAllNote: "Tus tarjetas y sus respuestas se borran de nuestros servidores.",
    empty: "Aún no hay historias. Toca + encima de tus chats para compartir una palabra.",
    today: "Hoy",
    date: (month, day) => `${day} ${MONTHS[month - 1] ?? month}`,
  },
  quote: {
    mine: "Respondiste sobre tu historia",
    reacted: "Respondió a tu historia",
    deleted: "Historia borrada",
    deletedLabel: "Respuesta a una historia borrada",
  },
};
