// 스페인어 문구표 구획 — 학습 활동(listening ~ lessonComplete).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type {
  AssessmentCopy,
  LessonCompleteCopy,
  ListeningCopy,
  SentenceOrderCopy,
  SpeakingCopy,
  WordChoiceCopy,
} from "./ui-copy-sections.contract";
import type { LearningItemGuideCopy } from "./learning-item-guide.contract";

// 스페인어 복수형: 1이면 단수, 그 밖은 복수입니다.
const n = (count: number, one: string, other: string): string =>
  `${count} ${count === 1 ? one : other}`;

export const listeningEs: ListeningCopy = {
  instruction: "Elige qué significa la oración.",
  playback: { pause: "Pausar", resume: "Reanudar", play: "Reproducir" },
  playFromStart: "Reproducir desde el inicio",
  slow: "Lento",
  playAgain: "Repetir",
  stop: "Detener",
};

export const wordChoiceEs: WordChoiceCopy = {
  instruction: "Elige la palabra correcta.",
  culture: {
    sceneInstruction: "¿Qué dices?",
    feedbackTitle: {
      scene: { correct: "¡Buena respuesta!", incorrect: "Casi" },
      question: { correct: "¡Correcto!", incorrect: "Casi" },
    },
  },
};

export const sentenceOrderEs: SentenceOrderCopy = {
  instruction: "Completa la conversación.",
  placedChip: (text, position) => `${text}, posición ${position}`,
  dialogueSpeaker: { counterpart: "Compañero", me: "Tú" },
  dialogueTurn: (speaker, position, text) => `${speaker}, turno ${position}: ${text}`,
  dialogueEmptyTurn: (speaker, position) => `${speaker}, turno ${position}, vacío`,
  dialogueLine: {
    me: (text) => `Tu frase: ${text}`,
    counterpart: (text) => `Frase de tu compañero: ${text}`,
  },
};

export const speakingEs: SpeakingCopy = {
  instruction: "Lee la oración en voz alta.",
  speak: "Hablar",
  stopSpeaking: "Dejar de hablar",
  tryAgain: "Reintentar",
  dictationDisabled:
    "Siri o Dictado está desactivado. Activa Ajustes > General > Teclado > Activar Dictado e inténtalo de nuevo.",
  tapToContinue: "Toca la pantalla para continuar",
  recognitionUnavailable:
    "El reconocimiento de voz no está disponible ahora. Toca Omitir para continuar.",
};

export const assessmentEs: AssessmentCopy = {
  activity: "Evaluación",
  verdict: { passed: "Aprobado", failed: "No aprobado" },
  itemTitle: (ordinal) => `Pregunta ${ordinal}`,
  announcement: (verdict) =>
    `Resultado de la evaluación, ${verdict === "passed" ? "aprobado" : "no aprobado"}`,
};

export const lessonCompleteEs: LessonCompleteCopy = {
  rewardDiamonds: (count) => `Recompensa, ${n(count, "diamante", "diamantes")}`,
  grade: (grade) => `Nota ${grade}`,
  gradeName: (grade) => grade,
  outcome: { passed: "Lección completada", failed: "Lección no aprobada" },
  mistakes: (count) => (count === 0 ? "sin errores" : n(count, "error", "errores")),
  skippedSuffix: (count) =>
    count === 0 ? "" : `, ${n(count, "pregunta omitida", "preguntas omitidas")}`,
  nextLesson: "Siguiente lección",
  nextFinal: "Prueba final",
  continueStory: "Seguir historia",
  title: {
    perfect: "¡LECCIÓN PERFECTA!",
    complete: "¡LECCIÓN COMPLETADA!",
    failed: "LECCIÓN NO SUPERADA",
  },
  subtitle: (mistakeCount) =>
    mistakeCount === 0
      ? "NO TUVISTE ERRORES EN ESTA LECCIÓN"
      : `TUVISTE ${mistakeCount} ${mistakeCount === 1 ? "ERROR" : "ERRORES"} EN ESTA LECCIÓN`,
  streakLabel: (days) => `Racha de ${days} ${days === 1 ? "día" : "días"}`,
  rewardLabel: (count) => `+ ${count} DE RECOMPENSA`,
  tryAgain: "Reintentar",
  review: {
    soClose: "¡CASI LO LOGRAS!",
    fixedOf: (fixed, total) =>
      `CORREGISTE ${fixed} DE ${total} ${total === 1 ? "ERROR" : "ERRORES"}`,
    dotsLabel: (fixed, total) => `Corregiste ${fixed} de ${n(total, "error", "errores")}`,
    neededMore: (count) =>
      `Te ${count === 1 ? "faltó" : "faltaron"} ${n(count, "respuesta correcta", "respuestas correctas")}. Repite la lección — ahora te será más fácil.`,
  },
};

// 학습 문항 안내 문구입니다. 닫는 법 줄은 `episodeIntro.guide.continue`를 씁니다.
export const learningItemGuideEs: LearningItemGuideCopy = {
  "sentence-order": {
    title: "Esta vez, solo una pieza",
    description:
      "Normalmente ordenas varias piezas. Aquí solo hay una: tócala y luego toca Comprobar.",
  },
  "activity-vocab-card": {
    title: "Palabra nueva",
    description: "Escucha la palabra y mira su significado. Toca Siguiente cuando estés listo.",
  },
  "activity-word-choice": {
    title: "Elige una",
    description: "Elige la respuesta correcta y toca Comprobar.",
  },
  "activity-listening": {
    title: "Primero escucha",
    description: "Toca el altavoz para escucharlo otra vez. Luego elige lo que oíste.",
  },
  "activity-syllable-build": {
    title: "Forma la palabra",
    description:
      "Toca los bloques de sílabas en orden para formar la palabra. Luego toca Comprobar.",
  },
  "activity-sentence-order": {
    title: "Ponlo en orden",
    description:
      "Toca las piezas en orden para formar la frase. Toca una pieza otra vez para quitarla.",
  },
  "activity-culture-card": {
    title: "Nota cultural",
    description: "Un consejo breve sobre la vida en Corea. Léelo y toca Siguiente.",
  },
};
