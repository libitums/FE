// Story 카드의 스페인어 글입니다. `episodes.contract.ts`의 id마다 넷을 채운다 — 빠지면 타입 검사가 짚는다. 앱에 스페인어가 없어 사람이 옮긴다. 번역은 초안 — 원어민 검수 필요.
import type { StoryEpisodeId, StoryEpisodeText } from "../episodes.contract";

export const es: Record<StoryEpisodeId, StoryEpisodeText> = {
  "u10-laundry": {
    when: "Día 3 · Tarde",
    title: "Hacer la colada",
    teaser: "Todos los botones de la lavandería están en coreano.",
    alt: "El letrero iluminado de una lavandería de monedas 24 horas sobre una puerta de cristal, al final de un callejón de hanok bajo la lluvia",
  },
  "u09-subway": {
    when: "Día 3 · Mañana",
    title: "Tomar el metro",
    teaser: "Tres colores, tres flechas, una mañana de lluvia bajo tierra.",
    alt: "La salida 4 con techo de cristal de la estación Jongno 3-ga en una mañana lluviosa, con escaleras que bajan",
  },
  "u08-umbrella": {
    when: "Día 2 · Noche",
    title: "Lluvia repentina",
    teaser:
      "Abres la puerta de la cafetería y te encuentras un aguacero; alguien sale detrás de ti.",
    alt: "Lluvia intensa cayendo de noche sobre un callejón de hanok con farolillos, visto desde debajo de un paraguas oscuro",
  },
  "u07-jaemin": {
    when: "Día 2 · Tarde",
    title: "Asiento equivocado",
    teaser: "El asiento más soleado de la cafetería parece libre. No lo está.",
    alt: "Un paraguas negro largo apoyado en el rincón de un asiento junto a la ventana de una cafetería soleada bajo un cielo despejado",
  },
  "u06-cafe": {
    when: "Día 2 · Mañana",
    title: "Pedir un café",
    teaser: "La cafetería que anoche estaba cerrada tiene las luces encendidas.",
    alt: "Una cafetería en la esquina de un callejón de hanok en una mañana soleada, con el letrero encendido",
  },
  "u05-baekban": {
    when: "Día 1 · Noche",
    title: "Comer a solas",
    teaser: "Un menú escrito a mano, sin fotos, y una pregunta que no esperabas.",
    alt: "Una olla de estofado de kimchi hirviendo con un cuenco de arroz y acompañamientos en la mesa de un restaurante",
  },
  "u04-directions": {
    when: "Día 1 · Noche",
    title: "Encontrar el restaurante",
    teaser: "Dijeron cinco minutos. Ya has pasado dos veces por esta maceta.",
    alt: "Un callejón de hanok con farolillos al atardecer que se divide en varios caminos parecidos",
  },
  "u03-mina": {
    when: "Día 1 · Tarde",
    title: "Conocer a Mina",
    teaser: "Cuatro literas, un mapa dibujado a mano y una pregunta sobre tu nombre.",
    alt: "Una mano sostiene una nota pequeña con un mapa dibujado a mano en un dormitorio lleno de sol",
  },
  "u02-checkin": {
    when: "Día 1 · Tarde",
    title: "Check-in",
    teaser: "La habitación 201 está entreabierta, y ya hay una mochila sobre la cama.",
    alt: "La puerta entreabierta de una habitación de dormitorio con literas y una mochila sobre la cama junto a la ventana",
  },
  "u01-water": {
    when: "Día 1 · Tarde",
    title: "Comprar agua",
    teaser:
      "Con sed, perdido y arrastrando una maleta. La primera tienda que encuentras es diminuta.",
    alt: "Un tranquilo callejón de hanok con luz de tarde visto desde la puerta de una tienda, con una casa de huéspedes más adentro",
  },
  "u00-tutorial": {
    when: "Día 0 · Llegada",
    title: "Tutorial",
    teaser:
      "Tus primeras palabras en coreano están a punto de salir de tu boca. Todavía no las conoces.",
    alt: "Una tienda de conveniencia nocturna como de sueño: un vaso grande de fideos picantes y un gimbap triangular en una mesa junto a la ventana",
  },
};
