// 메신저 문구 표의 덧붙는 칸(es) — 대화 설정(ADR-0126) · 선톡 푸시 안내(ADR-0127) · 메신저 탭 접근(ADR-0128).

import type { MessengerChatExtraCopy } from "../screens/messenger-chat/chat-settings.contract";

export const messengerChatExtraEs: MessengerChatExtraCopy = {
  access: {
    signInTitle: "Escríbeles a las personas de tus historias",
    signInBody:
      "Crea una cuenta gratis para chatear en coreano con las personas de tus historias. Tu progreso se conserva.",
    signIn: "Regístrate o inicia sesión",
    comingSoonTitle: "Los chats ya casi llegan",
    comingSoonBody:
      "Primero abrimos los chats a un grupo pequeño. Sigue aprendiendo: pronto podrán escribirte las personas que conoces.",
  },
  pushNotice: { chatUnavailable: "Este chat no está disponible ahora." },
  chatSettings: {
    entryTitle: "Chats",
    entryDescription: "Ideas de respuesta, mensajes de personajes, recuerdos",
    title: "Chats",
    back: "Atrás",
    sectionWhile: "Mientras chateas",
    replyIdeas: "Ideas de respuesta",
    replyIdeasBody: "Muestra 1–2 respuestas sugeridas después de cada mensaje",
    sectionProactive: "Mensajes de personajes",
    proactive: "Te escriben primero",
    sectionAbout: "Sobre ti",
    sharedMemories: "Lo que todos saben de ti",
    sharedMemoriesSummary: (count) =>
      count === 1
        ? "1 recuerdo · compartido por todos los personajes"
        : `${count} recuerdos · compartidos por todos los personajes`,
    footnote: "Cada personaje recuerda sus chats contigo. Abre un chat y toca ☰ para verlo.",
    proactiveSheet: {
      title: "Te escriben primero",
      body: "Si llevas un tiempo sin escribir, un personaje puede empezar la conversación. Nunca cuesta monedas.",
      howOften: "Frecuencia",
      prefs: { off: "Desactivado", daily1: "Una vez al día", daily2: "Dos veces al día" },
      preferredTime: "Hora preferida",
      anyTime: "Cualquier hora",
      hour: (hour) => `${hour}:00`,
      quietNote:
        "No hay mensajes entre las 22:00 y las 8:00 de tu hora. Con dos veces al día, el segundo llega unas 10 horas después.",
      save: "Guardar",
      close: "Cerrar",
    },
    memories: {
      titleShared: "Lo que todos saben de ti",
      titleCharacter: (name) => `Lo que recuerda ${name}`,
      count: (count, cap) => `${count} / ${cap}`,
      fullTitle: "La memoria está llena",
      // Con nombre el verbo va en singular; sin nombre, en plural («Los personajes»).
      fullBody: (name) =>
        `${name === null ? "Los personajes no pueden" : `${name} no puede`} recordar cosas nuevas hasta que borres algunas. Los recuerdos que editaste se conservan.`,
      intro: (name) =>
        `${name === null ? "Todos los personajes los usan" : `${name} los usa`} para que tus chats sean personales. Solo tú ves esta lista. Editar o borrar es gratis.`,
      empty: (name) =>
        `Aún no hay nada. ${name === null ? "Los personajes recordarán" : `${name} recordará`} lo que compartas al chatear.`,
      edited: "Editado",
      edit: "Editar recuerdo",
      delete: "Borrar recuerdo",
      editTitle: "Editar recuerdo",
      editHint: (name) =>
        `${name === null ? "Los personajes lo recordarán" : `${name} lo recordará`} tal como lo escribas.`,
      length: (count, max) => `${count} / ${max}`,
      cancel: "Cancelar",
      save: "Guardar",
      deleteTitle: "¿Borrar este recuerdo?",
      deleteBody: (name) =>
        `${name === null ? "Los personajes dejarán" : `${name} dejará`} de usarlo desde tu próximo mensaje.`,
      deleteConfirm: "Borrar",
      sidebar: (name) => `Lo que recuerda ${name}`,
      sidebarSummary: (count, cap, full) =>
        full ? `${count} / ${cap} · llena` : `${count} / ${cap}`,
    },
    feedback: {
      sidebar: "Estilo de corrección",
      title: "Estilo de corrección",
      body: (name) =>
        `Cómo te ayuda ${name} cuando tu coreano tiene un error. Siempre recibes la tarjeta de corrección; esto cambia cómo responde ${name}.`,
      modes: {
        separate: {
          title: "Solo la tarjeta",
          body: (name) =>
            `${name} sigue conversando. La corrección aparece en ✎ debajo de tu mensaje.`,
        },
        natural: {
          title: "De forma natural en la respuesta",
          body: (name) =>
            `${name} usa la expresión correcta en su respuesta, como lo haría un amigo.`,
        },
        prefix: {
          title: "Señalarlo primero",
          body: (name) => `${name} te corrige brevemente y luego sigue la conversación.`,
        },
      },
      defaultTag: "predeterminado",
      note: "Se aplica a todos los personajes desde tu próximo mensaje.",
      save: "Guardar",
      close: "Cerrar",
    },
  },
  feedback: {
    titles: { correction: "CORRECCIÓN", better: "MÁS NATURAL", l1_to_ko: "EN COREANO" },
    sendCorrected: "Enviar corregido",
    sendInKorean: "Enviar en coreano",
    cardLabel: (title, text, detail) =>
      detail === "" ? `${title}: ${text}` : `${title}: ${text} ${detail}`,
    good: "Buena respuesta",
    bad: "Mala respuesta",
    goodSelected: "Buena respuesta, seleccionado",
    badSelected: "Mala respuesta, seleccionado",
    liked: "Te gustó",
    flagged: "Lo marcaste",
    sheet: {
      title: "¿Qué salió mal?",
      body: (name) => `Elige las que apliquen. Ayuda a que ${name} responda mejor.`,
      reasons: {
        awkward_korean: () => "El coreano no suena natural",
        out_of_character: (name) => `No suena como ${name}`,
        too_hard: () => "Demasiado difícil para mí",
        uncomfortable: () => "Me hizo sentir incómodo",
        other: () => "Otra cosa",
      },
      reportPrompt: "¿Quieres que revisemos este mensaje?",
      report: "Reportar",
      noteLabel: "Cuéntanos más (opcional)",
      notePlaceholder: "Añade una nota",
      send: "Enviar",
      close: "Cerrar",
    },
  },
  remote: {
    noCredits: (name) => `No te quedan créditos para chatear con ${name}.`,
    notAvailable: (name) => `Todavía no puedes chatear con ${name}.`,
    sendFailed: "No se envió el mensaje. Inténtalo de nuevo.",
    replyFailed: (name) => `${name} no puede responder ahora.`,
    cantReply: (name) => `${name} no puede responder a eso. Prueba a decirlo de otra forma.`,
    rateLimited: "Estás enviando demasiado rápido. Espera un momento y vuelve a enviar.",
    updateRequired: "Actualiza la app para seguir chateando.",
    serverError: "Algo salió mal por nuestra parte. Inténtalo más tarde.",
    signedOut: "Se cerró tu sesión, así que este mensaje no se envió.",
    notSent: "No enviado",
    sendAgain: "Enviar de nuevo",
    unsentTitle: "Mensaje no enviado",
    unsentDescription: "Envíalo de nuevo o bórralo.",
    deleteUnsent: "Borrar",
    cancel: "Cancelar",
    recovering: "Recibiendo el resto de la respuesta…",
    stalled: "La respuesta no terminó.",
    refresh: "Actualizar",
    loadFailedTitle: "No se pudo cargar el chat",
    loadFailedBody: "Revisa tu conexión y vuelve a intentarlo.",
    loadFailedNew: "No se pudieron cargar los mensajes nuevos.",
    tryAgain: "Reintentar",
  },
};
