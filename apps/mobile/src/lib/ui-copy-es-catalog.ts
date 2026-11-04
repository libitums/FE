// 스페인어 문구표 구획 — 카탈로그 맵 · 표지 컷.
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { AudioUnavailableCopy } from "../components/audio-unavailable.contract";
import type { CatalogCoverCopy } from "../screens/catalog-cover/catalog-cover.contract";
import type { CatalogFinalCopy } from "../screens/catalog-final/catalog-final.contract";
import type { CatalogStoryFinalCopy } from "../screens/catalog-story-final/catalog-story-final.contract";
import type { CatalogMapCopy } from "../screens/journey-map/catalog-map.contract";
import type { CatalogUpdateNoticeCopy } from "../screens/catalog-update/catalog-update-notice.contract";
import type { CultureCardCopy } from "../screens/culture-card/culture-card.contract";
import type { PairMatchCopy } from "../screens/pair-match/pair-match.contract";
import type { ReadAloudCopy } from "../screens/read-aloud/read-aloud.contract";
import type { SpeakWordCopy } from "../screens/speak-word/speak-word.contract";
import type { SyllableBuildCopy } from "../screens/syllable-build/syllable-build.contract";
import type { TypingCopy } from "../screens/typing/typing.contract";
import type { VocabCardCopy } from "../screens/vocab-card/vocab-card.contract";
import type { WordChoicePictureCopy } from "../screens/word-choice/word-choice-picture";

const unavailableTail = {
  pending: "próximamente",
  update: "actualiza la app para abrirlo",
  unavailable: "no disponible",
} as const;

export const catalogUpdateNoticeEs: CatalogUpdateNoticeCopy = {
  title: "¡Psst, hay algo nuevo! 👀",
  body: "Algunos episodios que completaste tienen contenido nuevo. Tranqui, tu progreso está a salvo.",
  confirm: "¡Genial, entendido!",
  dontShowAgain: "No volver a mostrar",
  checked: "marcado",
  unchecked: "sin marcar",
};

export const catalogMapEs: CatalogMapCopy = {
  episodeLabel: (ordinal) => `Episodio ${ordinal}.`,
  coverTitle: "Intro del episodio",
  lessonTitle: (ordinal) => `Lección ${ordinal}`,
  sheetHeading: (unit, title) => `${unit}: “${title}”`,
  finalTitle: "Prueba final",
  cultureTitle: "Cultura",
  storyTitle: "Historia",
  nodeLabel: (label, title) => `${label} ${title}`,
  caption: {
    pending: "PRÓXIMAMENTE",
    update: "ACTUALIZACIÓN NECESARIA",
    unavailable: "NO DISPONIBLE",
  },
  unavailableSection: (label, title, kind) => `${label} ${title}, ${unavailableTail[kind]}`,
  comingSoon: {
    title: "Próximamente",
    body: "Estamos preparando la próxima historia.",
    label: (episodeLabel) =>
      `${episodeLabel} Próximamente. Estamos preparando la próxima historia.`,
  },
};

export const catalogCoverEs: CatalogCoverCopy = {
  toggleScript: {
    en: "Ver romanización",
    roman: "Ver significado",
  },
  nextCut: (ordinal, total) => `Siguiente escena, ${ordinal} de ${total}`,
  finishCover: "Terminar intro",
  finishEpilogue: "Terminar episodio",
  finishStory: "Terminar historia",
  thinking: "pensando",
  episodeStart: "¡Comienza el episodio!",
  episodeClear: "¡Episodio completado!",
  episodeContinue: "Continuará…",
  skipDescription: "Puedes volver a verlo cuando quieras desde la intro del episodio.",
};

export const typingEs: TypingCopy = {
  instruction: "Escribe la oración en coreano.",
  answerField: (typed) => `Tu respuesta: ${typed}`,
  answerFieldEmpty: "Tu respuesta, vacía",
  answerReveal: (answer) => `Respuesta: ${answer}`,
};

export const vocabCardEs: VocabCardCopy = {
  instruction: "Aprende esta palabra.",
  badge: "Palabra nueva",
  gotIt: "Entendido",
  runLabel: (ordinal, total) => `Palabra ${ordinal} de ${total}`,
  pronunciation: (romanization) => `Pronunciación: ${romanization}`,
  meaning: (meaning) => `Significado: ${meaning}`,
};

export const cultureCardEs: CultureCardCopy = {
  instruction: "Conoce la vida en Corea.",
  eyebrow: "CULTURA",
  tapToFlip: "Toca para girar",
  flipCard: "Girar tarjeta",
  nextCard: "Siguiente tarjeta",
  koreanBodyTitle: "En coreano",
  counter: (position, total) => `${position} / ${total}`,
  pronunciation: (romanization) => `Pronunciación: ${romanization}`,
  frontPlace: (position, total) => `Tarjeta de cultura ${position} de ${total}, frente.`,
  backPlace: (position, total) => `Tarjeta de cultura ${position} de ${total}, reverso.`,
  flipBackHint: "Toca para volver a girar.",
};

export const syllableBuildEs: SyllableBuildCopy = {
  instruction: "Toca las sílabas para formar la palabra.",
  meaning: (meaning) => `Significado: ${meaning}`,
  placedTile: (text, position, slotCount) => `${text}, posición ${position} de ${slotCount}`,
  wordEmpty: (slotCount) =>
    `Tu palabra, vacía, ${slotCount} ${slotCount === 1 ? "sílaba" : "sílabas"}`,
  word: (word) => `Tu palabra: ${word}`,
  usedTile: (text) => `${text}, usada`,
};

export const readAloudEs: ReadAloudCopy = {
  matched: (matched, total) => {
    if (matched === total) {
      return total === 1 ? "Dijiste la palabra." : `Dijiste las ${total} palabras.`;
    }
    // 앞에서부터 이어 맞은 수입니다 — 0이면 "primeras"를 붙이지 않습니다.
    const lead = matched === 0 ? "" : matched === 1 ? "la primera " : "las primeras ";
    const unit = total === 1 ? "palabra" : "palabras";
    return `Dijiste ${lead}${matched} de ${total} ${unit}.`;
  },
  pronunciation: (romanization) => `Pronunciación: ${romanization}`,
};

export const speakWordEs: SpeakWordCopy = {
  instruction: "Di la palabra de la imagen.",
  recognitionUnavailable:
    "El reconocimiento de voz no está disponible ahora. Toca Omitir para continuar.",
};

export const pairMatchEs: PairMatchCopy = {
  instruction: "Toca una palabra y luego su significado.",
  progress: (matched, total) => `${matched} / ${total} unidas`,
  progressLabel: (matched, total) => `${matched} de ${total} parejas unidas`,
  selected: (text) => `${text}, seleccionada`,
  matched: (text, ordinal, partner) => `${text}, pareja ${ordinal}, unida con ${partner}`,
  judged: (text, partner) => `${text}, unida con ${partner}`,
  answerPair: (word, meaning) => `${word} = ${meaning}`,
  linked: (word, meaning, matched, total) => `Unidas: ${word}, ${meaning}. ${matched} de ${total}.`,
  unlinked: (text) => `Sin unir: ${text}`,
  missedPairs: (pairs) => `Parejas correctas: ${pairs}`,
  spokenPair: (word, meaning) => `${word}, ${meaning}.`,
};

export const wordChoicePictureEs: WordChoicePictureCopy = {
  picture: (meaning) => `Imagen: ${meaning}`,
  loading: "Imagen, cargando",
  unavailable: (meaning) => `Imagen no disponible. Significado: ${meaning}`,
  unavailableCaption: "Imagen no disponible",
  answer: (word, romanization, meaning) =>
    romanization === null
      ? `Respuesta: ${word}, ${meaning}`
      : `Respuesta: ${word}, ${romanization}, ${meaning}`,
  answerSubline: (romanization, meaning) =>
    romanization === null ? meaning : `${romanization} · ${meaning}`,
};

export const catalogFinalEs: CatalogFinalCopy = {
  turnProgress: (n, total) => `Turno ${n} de ${total}`,
  replyLabel: (reply) => `Tu respuesta: ${reply}`,
  replyEmpty: "Tu respuesta, vacía",
  replyHint: (translation) => `Di: ${translation}`,
  correctAnswer: (answer) => `Respuesta: ${answer}`,
  answerLabel: "Respuesta",
};

export const catalogStoryFinalEs: CatalogStoryFinalCopy = {
  redo: "Rehacer",
  listen: "Escuchar",
  nextLetter: "Siguiente letra",
  letterLabel: (ordinal, total, state) =>
    `Letra ${ordinal} de ${total}, ${state.kind === "written" ? state.syllable : state.kind === "writing" ? "escribiendo" : "vacía"}`,
  padLabel: (syllable) => `Área de escritura. Traza ${syllable}`,
};

export const audioUnavailableEs: AudioUnavailableCopy = {
  label: "Audio aún no disponible",
};
