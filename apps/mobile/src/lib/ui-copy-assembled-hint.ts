// 조립 문항(음절 조립 · 문장 조립) 힌트 문구입니다(ADR-0153). 다섯 언어를 한 곳에 둡니다 — 번역 초안, 원어민 검수 필요.

export type AssembledHintCopy = {
  /** 창고 위 버튼 이름입니다. */
  readonly button: string;
  /** 시트 제목입니다. */
  readonly title: string;
  readonly close: string;
  /** 정답 소리를 한 번 들려 주는 줄입니다. */
  readonly listen: string;
  /** 칸 · 답 줄에 정답을 흐리게 까는 줄입니다. */
  readonly show: string;
  /** 정답을 깐 뒤 그 칸 줄의 낭독 이름입니다. */
  readonly shown: (answer: string) => string;
};

export const assembledHintEn: AssembledHintCopy = {
  button: "Hint",
  title: "Hint",
  close: "Close",
  listen: "Hear the answer",
  show: "Show the answer",
  shown: (answer) => `Answer shown: ${answer}`,
};

export const assembledHintVi: AssembledHintCopy = {
  button: "Gợi ý",
  title: "Gợi ý",
  close: "Đóng",
  listen: "Nghe đáp án",
  show: "Xem đáp án",
  shown: (answer) => `Đã hiện đáp án: ${answer}`,
};

export const assembledHintId: AssembledHintCopy = {
  button: "Petunjuk",
  title: "Petunjuk",
  close: "Tutup",
  listen: "Dengarkan jawaban",
  show: "Tampilkan jawaban",
  shown: (answer) => `Jawaban ditampilkan: ${answer}`,
};

export const assembledHintEs: AssembledHintCopy = {
  button: "Pista",
  title: "Pista",
  close: "Cerrar",
  listen: "Escuchar la respuesta",
  show: "Ver la respuesta",
  shown: (answer) => `Respuesta mostrada: ${answer}`,
};

export const assembledHintJa: AssembledHintCopy = {
  button: "ヒント",
  title: "ヒント",
  close: "閉じる",
  listen: "答えを聞く",
  show: "答えを見る",
  shown: (answer) => `答えを表示しました: ${answer}`,
};
