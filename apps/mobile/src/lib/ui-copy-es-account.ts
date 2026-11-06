// 스페인어 문구표 구획 — 계정 · 기타(notifications ~ gemPurchase).
// 번역 초안 — 원어민 검수 필요(ADR-0097).

import type { FeedbackCopy } from "./feedback.contract";
import type {
  AppUpdateCopy,
  GemPurchaseCopy,
  NotificationsCopy,
  ProfileCopy,
  SettingsCopy,
} from "./ui-copy-sections.contract";
import type { DownloadSheetCopy } from "./ui-copy-settings.contract";

export const notificationsEs: NotificationsCopy = {
  title: "Notificaciones",
  emptyTitle: "Aún no tienes notificaciones",
  emptyBody: "Te avisaremos aquí cuando haya algo nuevo.",
  deleteLabel: (message) => `${message}, eliminar`,
  destination: {
    "roleplay-list": "Ver juegos de rol",
  },
};

export const settingsEs: SettingsCopy = {
  title: "Ajustes",
  group: { account: "Cuenta", learning: "Aprendizaje", accountActions: "Acciones de la cuenta" },
  nav: {
    profile: "Perfil de usuario",
    "learner-profile": "Nombre y país en las lecciones",
    language: "Idioma",
    download: "Descargas",
    notifications: "Notificaciones",
    feedback: "Enviar comentarios",
    "privacy-policy": "Política de privacidad",
    "terms-of-use": "Términos de uso",
  },
  downloads: {
    title: "Descargas",
    caption: "Elige cuándo se descargan las imágenes y el audio.",
    mobileDataHeading: "Descargar con datos móviles",
    policy: {
      ask: "Preguntar siempre",
      always: "Descargar siempre",
      "wifi-only": "Solo con Wi-Fi",
    },
    offlineHeading: "Sin conexión",
    downloadAll: "Descargar todo para usar sin conexión",
    downloadAllCaption: "Imágenes y audio de todos los episodios, para que aprendas sin conexión.",
    downloadAllStarted: "Descargando en segundo plano. Puedes seguir aprendiendo.",
    downloaded: (size) => `Descargado: ${size}`,
    episodeRow: (n, d, t) => `Episodio ${n}: ${d} de ${t} lecciones`,
    episodeRowComplete: (n) => `Episodio ${n}: completo`,
    downloadRest: (n) => `Descargar el resto del Episodio ${n}`,
    confirm: {
      title: "¿Descargar con datos móviles?",
      description:
        "Descargar todos los episodios puede usar muchos datos. También puedes esperar al Wi-Fi.",
      download: "Descargar ahora",
      cancel: "Cancelar",
      restDescription: (n) =>
        `El resto del Episodio ${n} se descarga con datos móviles. También puedes esperar al Wi-Fi.`,
    },
  },
  sessionOption: {
    "auto-play-audio": "Reproducción automática",
    "show-transcript": "Ver transcripción",
    "show-choice-romanization": "Romanización en las opciones",
  },
  sessionOptionDescription: {
    "show-choice-romanization":
      "Muestra cómo se lee cada respuesta en coreano, en letra pequeña encima.",
  },
  optionState: { on: "activado", off: "desactivado" },
  action: {
    "sign-in": "Iniciar sesión",
    "sign-out": "Cerrar sesión",
    "delete-account": "Eliminar cuenta",
  },
  signOutDialog: { title: "¿Cerrar sesión?", confirm: "Cerrar sesión", cancel: "Seguir conectado" },
  deleteDialog: {
    title: "¿Eliminar tu cuenta?",
    description: "Tu cuenta y tu progreso se eliminarán para siempre. Esto no se puede deshacer.",
    confirm: "Eliminar cuenta",
    cancel: "Conservar cuenta",
  },
  deleteFailure: {
    network: "No pudimos eliminar tu cuenta. Revisa tu conexión e inténtalo de nuevo.",
    other: "No pudimos eliminar tu cuenta. Inténtalo de nuevo.",
  },
  exitAnnouncement: { "signed-out": "Cerraste sesión.", deleted: "Tu cuenta fue eliminada." },
  version: (name, build) => `Versión ${name} (${build})`,
};

export const appUpdateEs: AppUpdateCopy = {
  title: "Actualiza Duru para continuar",
  description:
    "Esta versión de Duru ya no es compatible. Descarga la versión más reciente en la tienda para seguir aprendiendo.",
  update: "Actualizar",
  failure: "No pudimos abrir la tienda. Actualiza Duru desde App Store o Google Play.",
};

export const feedbackEs: FeedbackCopy = {
  title: "Enviar comentarios",
  ratingQuestion: "¿Qué te parece Duru hasta ahora?",
  ratingOption: {
    1: "No me gusta",
    2: "Puede mejorar",
    3: "Está bien",
    4: "Me gusta",
    5: "Me encanta",
  },
  messageLabel: "¿Algo más que quieras contarnos? (opcional)",
  send: "Enviar",
  sent: "¡Gracias! Recibimos tus comentarios.",
  failed: "No pudimos enviar tus comentarios. Inténtalo de nuevo.",
  survey: {
    title: "¿Qué tal este episodio?",
    description: (episodeTitle) => `Terminaste ${episodeTitle}. Cuéntanos qué te pareció.`,
    skip: "Ahora no",
  },
};

export const profileEs: ProfileCopy = {
  notProvided: "Sin datos",
  learningLanguage: "Coreano",
  title: "Perfil de usuario",
  itemLabel: {
    name: "Nombre",
    "learning-language": "Idioma que aprendes",
    email: "Correo electrónico",
    phone: "Número de teléfono",
  },
};

export const gemPurchaseEs: GemPurchaseCopy = {
  packAmount: (count, display) => `${display} ${count === 1 ? "gema" : "gemas"}`,
  balance: (count, display) => `Tienes ${display} ${count === 1 ? "gema" : "gemas"}`,
  paymentMethod: "Método de pago",
  notice: {
    title: "Pagos próximamente",
    description: "Aún no se pueden comprar gemas. Vuelve pronto.",
  },
};

export const downloadSheetEs: DownloadSheetCopy = {
  askTitle: (n) => `¿Descargar el Episodio ${n}?`,
  askDescription:
    "Las imágenes y el audio de este episodio aún no están en tu teléfono. La descarga usa datos móviles.",
  size: (size) => `Unos ${size}`,
  downloadNow: "Descargar ahora",
  onWifi: "Descargar con Wi-Fi",
  wifiOnlyTitle: (n) => `El Episodio ${n} se descarga con Wi-Fi`,
  wifiOnlyDescription:
    "Elegiste Solo con Wi-Fi en Ajustes. Usa datos móviles solo esta vez, abre sin imágenes ni audio o cambia el ajuste.",
  ok: "OK",
  offlineTitle: "Estás sin conexión",
  offlineDescription: (n) =>
    `El Episodio ${n} aún no se ha descargado. Se descargará cuando vuelvas a tener conexión.`,
  openAnyway: "Abrir de todos modos",
  close: "Cerrar",
  askUnitTitle: (l) => `¿Descargar ${l}?`,
  askUnitDescription:
    "Las imágenes y el audio de esta lección aún no están en tu teléfono. La descarga usa datos móviles.",
  rows: {
    common: "Imágenes y audio compartidos",
    allLessons: "Todas las lecciones de este episodio",
    otherLessons: "Otras lecciones",
    status: { done: "En tu teléfono", pending: "Se descarga ahora", wifi: "Con Wi-Fi" },
  },
  askHint: "Se te preguntará cada vez. Cámbialo en Ajustes › Descargas.",
  wifiOnlyUnitTitle: (l) => `${l} se descarga con Wi-Fi`,
  mobileDataOnce: "Usar datos móviles solo esta vez",
  openWithout: "Abrir sin imágenes ni audio",
  changeSetting: "Cambiar ajuste",
  offlineUnitDescription: (l) =>
    `${l} aún no se ha descargado. Se descargará cuando vuelvas a tener conexión.`,
  offlineHint: "Las imágenes se ven de un solo color y se omiten los ejercicios de escucha.",
  allCleared: {
    title: "Terminaste todas las historias de aquí",
    description: "Puede haber episodios nuevos. Conéctate a internet y los buscaremos por ti.",
    offline: "Estás sin conexión",
    lastChecked: (d) =>
      d === null
        ? "Aún no se ha revisado"
        : d === 0
          ? "Última revisión: hoy"
          : d === 1
            ? "Última revisión: ayer"
            : `Última revisión: hace ${d} días`,
    checkNow: "Buscar ahora",
    later: "Más tarde",
    autoNote: "También buscaremos automáticamente cuando vuelvas a tener conexión.",
    offlineHint: "Buscaremos en cuanto tengas conexión.",
  },
};
