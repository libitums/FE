// 스페인어 문구표 구획 — 학습자 프로필(이름 · 나라) 양식.
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { LearnerProfileCopy } from "../components/learner-profile.contract";

export const learnerProfileEs: LearnerProfileCopy = {
  nameLabel: "Tu nombre",
  nameIssue: {
    empty: "Escribe tu nombre.",
    "too-long": "Usa 30 caracteres o menos.",
    "forbidden-character": "El nombre no puede incluir { ni }.",
  },
  countryLabel: "País",
  notSet: "Sin definir",
  countryMissing: "Elige tu país.",
  preview: {
    heading: { example: "Ejemplo", yours: "Tú dirás" },
    label: (kind, ko, en) =>
      `${kind === "example" ? "Oración de ejemplo" : "Tú dirás"}: ${ko} Significado: ${en}`,
  },
  picker: {
    title: "Elige un país",
    back: "Atrás",
    searchLabel: "Buscar países",
    clearSearch: "Borrar búsqueda",
    allCountries: (count) => `${count} países · busca por nombre en inglés`,
    matches: (count) => (count === 1 ? "1 resultado" : `${count} resultados`),
    noMatches: "Sin resultados. Revisa la ortografía o prueba un nombre más corto.",
    noMatchesAnnouncement: "Sin resultados",
    row: (en, ko) => `${en} · ${ko}`,
    countrySet: (en) => `País: ${en}`,
  },
  signup: {
    continue: "Continuar",
    back: "Atrás",
    name: {
      title: "¿Cómo te llamas?",
      caption: "Lo usaremos en las oraciones que practiques",
      helper: "Elegimos uno por ti: quédatelo, cámbialo al azar o escribe el tuyo.",
      shuffle: "Al azar",
      shuffleLabel: "Elegir otro nombre al azar",
      previewHeading: "En una lección sonará así",
    },
    country: {
      title: "¿De dónde eres?",
      caption: "Lo dirás cuando conozcas gente en la historia",
      searchPlaceholder: (count) => `Buscar entre ${count} países`,
      allCountries: (count) => `TODOS LOS PAÍSES · ${count}`,
      jumpTo: (letter) => `Ir a la ${letter}`,
      jumpBar: "Ir a la letra",
    },
  },
  settings: {
    title: "Nombre y país",
    body: "Se usan en las oraciones que practicas. Los cambios se aplican desde la próxima lección que abras.",
    submit: "Guardar",
    saved: "Guardado",
  },
  summary: {
    both: (name, country) => `${name} · ${country}`,
    pending: (summary) =>
      `${summary}. Guardado en este dispositivo. Lo sincronizaremos cuando vuelvas a estar en línea.`,
  },
};
