// 스페인어 문구표 구획 — common · shell · journeyMap · learningShell.
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type {
  CommonCopy,
  JourneyMapCopy,
  LearningShellCopy,
  ShellCopy,
} from "./ui-copy-sections.contract";
import type { ProgressLoadCopy } from "../screens/journey-map/journey-map-load.contract";
import type { SplashCopy } from "../screens/splash/splash.contract";
import type { SpecialUnitMapCopy } from "../screens/journey-map/journey-special-unit.contract";

// 스페인어 복수형: 1이면 단수, 그 밖은 복수입니다.
const n = (count: number, one: string, other: string): string =>
  `${count} ${count === 1 ? one : other}`;

export const commonEs: CommonCopy = {
  exitTo: { journey: "Volver al mapa", roleplay: "Volver a la lista" },
  backToSettings: "Volver a Ajustes",
  back: "Atrás",
  answerResult: { correct: "Correcto", incorrect: "Incorrecto" },
  answerResultSuffix: { correct: "correcto", incorrect: "incorrecto" },
  resultAnnouncement: (result) => `Resultado, ${result === "correct" ? "correcto" : "incorrecto"}`,
  allQuestionsDone: "Preguntas completadas",
  seeResults: "Ver resultados",
  next: "Siguiente",
  continue: "Continuar",
  check: "Comprobar",
  ok: "OK",
  close: "Cerrar",
  skip: "Omitir",
  listening: "Escuchando",
  send: "Enviar",
  sendWithText: (text) => `Enviar, ${text}`,
  me: "Yo",
  delete: "Borrar",
  startOver: "Empezar de nuevo",
  blank: "en blanco",
  selected: (label) => `${label}, seleccionado`,
  locked: (label) => `${label}, bloqueado`,
  stepTitle: (ordinal, activity) => `Paso ${ordinal} · ${activity}`,
  count: {
    streakDays: (days) => `Racha de ${n(days, "día", "días")}`,
    trophies: (count) => n(count, "trofeo", "trofeos"),
    gems: (count) => n(count, "gema", "gemas"),
    diamonds: (count) => n(count, "diamante", "diamantes"),
  },
};

export const shellEs: ShellCopy = {
  tabs: { journey: "Viaje", roleplay: "Juego de rol", settings: "Ajustes" },
  notifications: "Notificaciones",
  errorBoundary: { title: "Algo salió mal", retry: "Reintentar" },
};

export const journeyMapEs: JourneyMapCopy = {
  start: "Empezar",
  activityCount: (completed, total) =>
    `${completed}/${total} ${total === 1 ? "actividad" : "actividades"}`,
  activityProgressLabel: (completed, total) =>
    `${completed} de ${n(total, "actividad", "actividades")} hechas`,
  // 설명 줄: 끝의 마침표를 떼고, 번호는 두 자리로 채웁니다.
  episodeUnitLabel: (episodeLabel, unit) =>
    `${String(episodeLabel).replace(/\.$/, "")}, unidad ${String(unit).padStart(2, "0")}`,
  statModal: {
    streakHero: (days) => `Racha de ${n(days, "día", "días")}`,
    episodesClearedHero: (count) =>
      `${n(count, "episodio", "episodios")} ${count === 1 ? "completado" : "completados"}`,
    slotProgress: (completed, total) => `${completed} de ${total} completados`,
    kind: {
      streak: {
        title: "días de racha",
        message: "¡Increíble! ¡Vuelve mañana para mantener tu racha!",
      },
      trophy: {
        title: "¡Episodio completado!",
        // Figma 원문은 "…to clear chapter"입니다. 제목(Episode Clear!)과 용어를 맞추고 관사 ·
        // 문장 부호를 보태 고쳤습니다(PR #124 리뷰). Figma 쪽 반영이 뒤따라야 합니다.
        message: "¡Increíble! ¡Vuelve mañana para completar el siguiente episodio!",
      },
    },
    continue: "Continuar →",
    // 요일 약칭은 디자인 표기 그대로입니다.
    weekdays: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
  },
};

export const learningShellEs: LearningShellCopy = {
  exitLesson: "Salir de la lección",
  formLabels: {
    listening: "Comprensión",
    "sentence-order": "Ordenar",
    "word-choice": "Elegir palabra",
    culture: "Cultura",
    speaking: "Hablar",
    writing: "Escritura",
    typing: "Escribir",
    "vocab-card": "Palabras nuevas",
    "pair-match": "Unir parejas",
    "culture-card": "Cultura",
    "syllable-build": "Deletrear",
    "read-aloud": "Hablar",
    "speak-word": "Hablar",
  },
  progressLabel: (ordinal, total) => `Lección ${String(ordinal)} / ${String(total)}`,
  cultureQuizLabel: "Quiz de cultura",
  completionDescription: "Respira. Estás listo para el siguiente paso.",
  completedQuestions: (count) =>
    `${count} de ${n(count, "pregunta", "preguntas")} ${count === 1 ? "completada" : "completadas"}`,
  // 완료 카드(시안 A)의 활동 타일 낭독 이름과, 숫자 타일의 보이는 이름(대문자 — 결과 화면 `PERFECT LESSON`과 같은 갈래)입니다.
  completedActivities: (count) =>
    `${n(count, "actividad", "actividades")} ${count === 1 ? "completada" : "completadas"}`,
  completionStats: {
    questions: "PREGUNTAS",
    activities: "ACTIVIDADES",
  },
  leaveDialog: {
    title: "¿Salir de esta lección?",
    description: "Tus respuestas no se guardarán y la próxima vez empezarás de nuevo.",
    leave: "Salir",
    stay: "Seguir",
  },
  headerNoQuestions: (formLabel) => `${formLabel}, sin preguntas`,
  headerQuestionOf: (formLabel, ordinal, count) => `${formLabel}, pregunta ${ordinal} de ${count}`,
  review: {
    intro: (count) => `Corrijamos ${n(count, "error", "errores")}`,
    remaining: (count) => `${count === 1 ? "Falta" : "Faltan"} ${count} para aprobar`,
    unlocked: "¡Ya puedes aprobar!",
    progress: (ordinal, total) => `Repaso ${ordinal} / ${total}`,
    headerOf: (formLabel, ordinal, total) => `${formLabel}, repaso ${ordinal} de ${total}`,
    formSuffix: " · reintenta",
    fixed: "¡Corregido!",
    missed: "Casi",
    missedLine: "No te preocupes — sigue adelante.",
  },
};

export const specialUnitMapEs: SpecialUnitMapCopy = {
  eyebrow: "ESPECIAL",
  accessibilityLabel: (name) => `especial, ${name}`,
};

export const progressLoadEs: ProgressLoadCopy = {
  loading: "Cargando tu progreso…",
  loadingAnnouncement: "Cargando tu progreso",
  failed: "No pudimos cargar tu progreso.",
  retry: "Reintentar",
};

export const splashEs: SplashCopy = {
  updating: "Actualizando episodios",
  updatingLabel: (percent) => `Actualizando episodios, ${percent}%`,
};
