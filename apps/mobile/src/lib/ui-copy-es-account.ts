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
    confirm: {
      title: "¿Descargar con datos móviles?",
      description:
        "Descargar todos los episodios puede usar muchos datos. También puedes esperar al Wi-Fi.",
      download: "Descargar ahora",
      cancel: "Cancelar",
    },
  },
  sessionOption: {
    "auto-play-audio": "Reproducción automática",
    "show-transcript": "Ver transcripción",
  },
  optionState: { on: "activado", off: "desactivado" },
  action: { "sign-out": "Cerrar sesión", "delete-account": "Eliminar cuenta" },
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
