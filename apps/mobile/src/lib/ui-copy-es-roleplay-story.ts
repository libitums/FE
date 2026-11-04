// 스페인어 문구표 구획 — 에피소드 롤플레이(미리보기 · 말하기 대화).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { RoleplayStoryCopy } from "../screens/roleplay-story/roleplay-story.contract";

export const roleplayStoryEs: RoleplayStoryCopy = {
  lineCount: (count) => `${String(count)} ${count === 1 ? "frase" : "frases"}`,
  withCounterpart: (name) => `con ${name}`,
  previewBody: (name) => `Actúa esta escena con ${name}. Responde cada frase en voz alta.`,
  start: "Empezar juego de rol",
  lineProgress: (ordinal, total) => `Frase ${String(ordinal)} / ${String(total)}`,
  me: "Yo",
  speak: "Hablar",
  stop: "Detener",
  listening: "Escuchando… Toca de nuevo cuando termines.",
  showHint: "Ver pista",
  hint: (translation) => `Di: ${translation}`,
  cantSpeak: "No puedo hablar ahora",
  great: "¡Muy bien!",
  notQuite: "Casi",
  youSaid: (heard) => `Dijiste: ${heard}`,
  heardNothing: "No te escuché bien.",
  unavailable: "Hablar no está disponible ahora. Puedes omitir esta frase.",
  blocked:
    "Permite el micrófono y el reconocimiento de voz para esta app en Ajustes, u omite esta frase.",
  permissionTitle: "Activa el micrófono",
  permissionBody:
    "El juego de rol es hablado. Permite el micrófono y el reconocimiento de voz para esta app en Ajustes.",
  openSettings: "Abrir Ajustes",
  notNow: "Ahora no",
  unsupportedTitle: "Hablar no está disponible",
  unsupportedBody:
    "El reconocimiento de voz no está disponible en este dispositivo ahora. Aun así puedes reproducir la escena y omitir cada frase.",
  startAnyway: "Empezar igual",
  retryHeard: "No te escuché bien. Toca el micrófono e inténtalo de nuevo.",
  playAgain: "Jugar de nuevo",
};
