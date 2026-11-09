// 스페인어 문구표 구획 — 이야기 · 롤플레이(episodeIntro ~ roleplay).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type {
  EpisodeIntroCopy,
  MessengerCopy,
  RoleplayCopy,
  VisualNovelCopy,
} from "./ui-copy-sections.contract";
import type { StoryCallCopy } from "../screens/story-call/story-call.contract";
import type { StoryIntroCopy } from "../screens/story-intro/story-intro.contract";
import type { StoryMessengerCopy } from "../screens/story-messenger/story-messenger.contract";

export const episodeIntroEs: EpisodeIntroCopy = {
  guide: {
    map: "¡Toca para empezar tu lección!",
    continue: "Toca en cualquier lugar para continuar",
  },
  skipDialog: {
    title: "¿Omitir la historia?",
    description: "Si la omites, la historia de este episodio no volverá a aparecer.",
    skip: "Omitir",
    keepWatching: "Seguir viendo",
  },
};

export const messengerEs: MessengerCopy = {
  keyboard: {
    shift: "Mayúsculas",
    shiftOn: "Mayúsculas, activado",
    backspace: "Borrar",
    period: "Punto",
    space: "Espacio",
    questionMark: "Signo de interrogación",
  },
};

export const visualNovelEs: VisualNovelCopy = {
  sceneProgress: (ordinal, total) => `Escena ${ordinal} / ${total}`,
};

export const roleplayEs: RoleplayCopy = {
  title: "Juego de rol",
  form: { story: "Juego de rol" },
  viewAll: "Ver todo",
  viewAllLabel: (sectionLabel) => `Ver todo, ${sectionLabel}`,
  plus: "Plus",
  plusTagline: "Practica situaciones parecidas",
  plusSectionLabel: (sectionLabel) =>
    `${sectionLabel} Juego de rol Plus, practica situaciones parecidas a este episodio`,
  plusDialogTitle: "Juego de rol Plus",
  lockedSection: (name) =>
    `${name}, bloqueado, termina este episodio en tu viaje para desbloquearlo`,
  premiumLock: { episode: "bloqueado", payment: "Solo Plus" },
  premiumNotice: (itemTitle) =>
    `“${itemTitle}” es un juego de rol Plus. Plus aún no está disponible.`,
};

export const storyMessengerEs: StoryMessengerCopy = {
  back: "Volver al mapa",
  typing: (speaker) => `${speaker} está escribiendo`,
  replyTitle: "¿Cómo respondes?",
  closeReply: "Cerrar",
  send: "Enviar",
  composerPlaceholder: "Mensaje",
  finish: "Terminar historia",
};

export const storyIntroEs: StoryIntroCopy = {
  overline: (ordinal) => `HISTORIA · EPISODIO ${ordinal}`,
  back: "Volver al mapa",
  skip: "Omitir",
  start: "Empezar",
  skipDialog: {
    title: "¿Omitir la historia?",
    description: "Puedes volver a verla cuando quieras desde el mapa.",
    skip: "Omitir",
    keepWatching: "Seguir viendo",
  },
};

export const storyCallEs: StoryCallCopy = {
  incoming: "Llamada entrante",
  answer: "Contestar",
  connecting: "Conectando…",
  callEnded: (clock) => `Llamada finalizada · ${clock}`,
  me: "Yo",
  mute: "Silenciar",
  speaker: "Altavoz",
  end: "Colgar",
  back: "Volver al mapa",
  finish: "Terminar historia",
};
