// 롤플레이 미션(ADR-0177) 문구 가운데 2026-11-23 서버 계약 뒤 더한 칸 — 계속하기 / 끝내기 · 성공 뒤 그만두기 · 음성(서버 받아 적기) ·
// 리포트 새 구역. 영어는 파이프라인 문서 §5.7 · §6.5 · §10.3의 확정 문구이고(`voice.transcribing`만 문서에 없어 새로 씀), 나머지 언어는
// 번역 초안입니다 — 원어민 검수 필요. 인도네시아어 · 베트남어 · 태국어 · 미얀마어는 `-extra-more.ts`가 집니다.

export type MissionExtraCopy = {
  /** 필수 목표를 이룬 뒤 판이 열려 있을 때의 「미션 성공」 카드 · 입력 줄 위 끝내기 · 위 띠의 성공 표시. */
  readonly success: {
    readonly title: string;
    readonly body: string;
    readonly keepGoing: string;
    readonly finish: string;
    readonly mark: string;
  };
  /** 필수 달성 뒤 그만두기 대화상자 — 그만두기 = 끝내기(채점 · 리포트). */
  readonly quitSuccess: { readonly title: string; readonly body: string; readonly confirm: string };
  readonly voice: {
    readonly transcribing: string;
    readonly heardCheck: string;
    readonly heardNotKorean: string;
    readonly sayAgain: string;
    readonly tooShort: string;
    readonly notHeard: string;
    readonly busy: string;
    readonly serverDown: string;
    readonly micDenied: string;
    readonly maxLength: string;
    readonly replay: string;
    readonly hintListen: string;
  };
  readonly report: {
    readonly scoreParts: string;
    readonly partTask: string;
    readonly partAccuracy: string;
    readonly partExpression: string;
    readonly partHints: string;
    readonly tips: string;
    readonly focus: string;
    readonly strengths: string;
    readonly better: string;
    readonly nextStep: string;
  };
};

export const missionExtraEn: MissionExtraCopy = {
  success: {
    title: "Mission success!",
    body: "You've done the required goals. Keep talking to try the optional ones, or finish now to see your report.",
    keepGoing: "Keep going",
    finish: "Finish",
    mark: "Mission success",
  },
  quitSuccess: {
    title: "Finish this mission?",
    body: "You've done the required goals, so we'll score your conversation and show your report.",
    confirm: "Finish",
  },
  voice: {
    transcribing: "Transcribing…",
    heardCheck: "Did I hear that right?",
    heardNotKorean: "That didn't sound like Korean. Try again?",
    sayAgain: "Say it again",
    tooShort: "Hold on a bit longer and try again.",
    notHeard: "We couldn't hear you. Try again or type.",
    busy: "Too many requests right now. Try again in a moment.",
    serverDown: "Speech recognition isn't responding. Try again or type.",
    micDenied: "Allow microphone access in Settings to speak.",
    maxLength: "Recording stops after 30 seconds.",
    replay: "Play again",
    hintListen: "Listen",
  },
  report: {
    scoreParts: "How your score adds up",
    partTask: "Goals",
    partAccuracy: "Accuracy",
    partExpression: "Target expressions",
    partHints: "Hints",
    tips: "You could have said",
    focus: "Key corrections",
    strengths: "What went well",
    better: "Sounds more natural",
    nextStep: "Next challenge",
  },
};

export const missionExtraEs: MissionExtraCopy = {
  success: {
    title: "¡Misión superada!",
    body: "Ya cumpliste los objetivos obligatorios. Sigue hablando para intentar los opcionales o termina ahora para ver tu informe.",
    keepGoing: "Seguir",
    finish: "Terminar",
    mark: "Misión superada",
  },
  quitSuccess: {
    title: "¿Terminar esta misión?",
    body: "Ya cumpliste los objetivos obligatorios, así que puntuaremos tu conversación y te mostraremos el informe.",
    confirm: "Terminar",
  },
  voice: {
    transcribing: "Transcribiendo…",
    heardCheck: "¿Te entendí bien?",
    heardNotKorean: "No sonó a coreano. ¿Lo intentas otra vez?",
    sayAgain: "Decirlo otra vez",
    tooShort: "Habla un poco más y vuelve a intentarlo.",
    notHeard: "No pudimos oírte. Inténtalo de nuevo o escribe.",
    busy: "Hay demasiadas solicitudes ahora. Inténtalo en un momento.",
    serverDown: "El reconocimiento de voz no responde. Inténtalo de nuevo o escribe.",
    micDenied: "Permite el acceso al micrófono en Ajustes para hablar.",
    maxLength: "La grabación se detiene a los 30 segundos.",
    replay: "Escuchar otra vez",
    hintListen: "Escuchar",
  },
  report: {
    scoreParts: "Cómo se suma tu puntuación",
    partTask: "Objetivos",
    partAccuracy: "Precisión",
    partExpression: "Expresiones meta",
    partHints: "Pistas",
    tips: "Podrías haber dicho",
    focus: "Correcciones clave",
    strengths: "Lo que hiciste bien",
    better: "Suena más natural",
    nextStep: "Próximo reto",
  },
};

export const missionExtraJa: MissionExtraCopy = {
  success: {
    title: "ミッション成功!",
    body: "必須の目標を達成しました。会話を続けて任意の目標に挑戦するか、今すぐ終えてレポートを見ましょう。",
    keepGoing: "続ける",
    finish: "終える",
    mark: "ミッション成功",
  },
  quitSuccess: {
    title: "このミッションを終えますか?",
    body: "必須の目標を達成したので、会話を採点してレポートを表示します。",
    confirm: "終える",
  },
  voice: {
    transcribing: "文字に起こしています…",
    heardCheck: "聞き取りは合っていますか?",
    heardNotKorean: "韓国語に聞こえませんでした。もう一度話しますか?",
    sayAgain: "もう一度話す",
    tooShort: "もう少し長く話して、もう一度試してください。",
    notHeard: "声が聞き取れませんでした。もう一度話すか、入力してください。",
    busy: "ただいま混み合っています。少し待ってからもう一度試してください。",
    serverDown: "音声認識が応答していません。もう一度話すか、入力してください。",
    micDenied: "話すには、設定でマイクへのアクセスを許可してください。",
    maxLength: "録音は30秒で止まります。",
    replay: "もう一度聞く",
    hintListen: "聞く",
  },
  report: {
    scoreParts: "スコアの内訳",
    partTask: "目標",
    partAccuracy: "正確さ",
    partExpression: "目標表現",
    partHints: "ヒント",
    tips: "こう言えばよかった",
    focus: "大事な直し",
    strengths: "よかったところ",
    better: "もっと自然な言い方",
    nextStep: "次のチャレンジ",
  },
};
