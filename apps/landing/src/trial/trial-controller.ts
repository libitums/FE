// 체험판 DOM 결선입니다 — 클릭 → 리듀서 → DOM 반영 → 소리 · 말하기 · 이벤트.
// 판정 · 전이는 리듀서만 정하고, 여기는 행동을 보내고 파생(음성 단서 · 효과음 · 이벤트)을 부작용으로 옮깁니다.

import type { TrialPageData } from "../components/trial/trial-components.contract";
import { currentCutOf, applyTrialState } from "./trial-dom";
import { currentTurnOf } from "./trial-dom-turn";
import { trialEventsOf, trialStoreClickOf } from "./trial-events";
import { initialTrialState, reduceTrial } from "./trial-machine";
import type { TrialAction, TrialState } from "./trial-machine.contract";
import { createTrialMotion } from "./trial-motion";
import type { InitTrial, ReadTrialModel, SpeechOutcome } from "./trial-ports.contract";
import { stepVoiceUrls } from "./trial-prefetch";
import { trialSfxOf, trialVoiceCueOf } from "./trial-view";

type ButtonHandler = (button: HTMLElement) => void;

/** 체험판을 붙입니다. 처음 상태를 그리고, 루트 하나의 클릭 위임으로 모든 버튼을 받습니다. */
export const initTrial: InitTrial = (deps) => {
  const { root, model, copy, audio, speech, send, reducedMotion } = deps;
  const motion = createTrialMotion(root, reducedMotion);
  let state: TrialState = initialTrialState(speech.support);
  let voiceKey: string | null = null;
  /** 듣기 차례 번호 — 멈춘 뒤 늦게 온 결과는 번호가 달라 버립니다. */
  let listenTurn = 0;
  let disposed = false;

  root.setAttribute("data-motion", reducedMotion ? "reduced" : "full");
  applyTrialState({ root, model, copy, prev: null, next: state });

  function playCue(): void {
    const cue = trialVoiceCueOf(state, model);
    const key = cue?.key ?? null;
    if (key === voiceKey) return;
    voiceKey = key;
    audio.stopVoice();
    if (cue !== null) void audio.playVoice(cue.url);
  }

  function dispatch(action: TrialAction): void {
    if (disposed) return;
    const prev = state;
    const next = reduceTrial(prev, action, model);
    if (next === prev) return;
    state = next;
    applyTrialState({ root, model, copy, prev, next });
    motion.afterTransition(prev, next);
    const cut = currentCutOf(root, next);
    if (cut !== null && (prev.step !== next.step || prev.cutIndex !== next.cutIndex)) {
      const url = trialVoiceCueOf(next, model)?.url ?? null;
      motion.revealCut(cut, url === null ? null : (audio.voiceLengthMs?.(url) ?? null));
    }
    const sfx = trialSfxOf(prev, next, action);
    if (sfx !== null) audio.playSfx(sfx);
    playCue();
    if (prev.step !== next.step) audio.prefetch(stepVoiceUrls(model, next.step));
    for (const event of trialEventsOf(prev, next, action)) send(event);
  }

  function setJudging(on: boolean): void {
    const turn = currentTurnOf(root, state);
    if (turn === null) return;
    if (on) turn.setAttribute("data-judging", "true");
    else turn.removeAttribute("data-judging");
  }

  async function listen(): Promise<void> {
    dispatch({ type: "speak" });
    if (state.step !== "roleplay" || state.roleplay.turn.phase !== "listening") return;
    listenTurn += 1;
    const mine = listenTurn;
    let outcome: SpeechOutcome;
    try {
      outcome = await speech.listen();
    } catch {
      outcome = { kind: "failed", reason: "unavailable" };
    }
    if (mine !== listenTurn || disposed) return;
    setJudging(false);
    dispatch(
      outcome.kind === "heard"
        ? { type: "heard", alternatives: outcome.alternatives }
        : { type: "speech-failed", reason: outcome.reason },
    );
  }

  const listening = () => state.step === "roleplay" && state.roleplay.turn.phase === "listening";

  /** 듣는 중이면 인식을 버리고(늦은 결과 무시) 준비로 되돌립니다. */
  function abandonListening(): void {
    if (!listening()) return;
    listenTurn += 1;
    speech.abort();
    setJudging(false);
    dispatch({ type: "speech-failed", reason: "aborted" });
  }

  const urlOf = (value: string | null | undefined) => {
    if (value) void audio.playVoice(value);
  };

  const handlers: Record<string, ButtonHandler> = {
    "trial-start-button": (button) => {
      if (state.step !== "start" || (button as HTMLButtonElement).disabled) return;
      audio.unlock();
      dispatch({ type: "start" });
    },
    "trial-cuts-next": () => {
      if (!motion.completeReveal()) dispatch({ type: "next" });
    },
    "trial-vocab-next": () => dispatch({ type: "next" }),
    "trial-vocab-listen": () => urlOf(model.vocab.audioUrl),
    "trial-vocab-example-listen": () => urlOf(model.vocab.exampleAudioUrl),
    "trial-choice-listen": () =>
      urlOf(state.step === "image-match" ? model.imageMatch.audioUrl : model.replySelect.audioUrl),
    "trial-option": (button) =>
      dispatch({ type: "choose", optionIndex: Number(button.getAttribute("data-option-index")) }),
    "trial-choice-next": () => dispatch({ type: "next" }),
    "trial-culture-flip": () => dispatch({ type: "flip" }),
    "trial-culture-next": () => dispatch({ type: "next" }),
    "trial-turn-replay": () =>
      urlOf(model.roleplay.turns[state.roleplay.turn.index]?.counterpartAudioUrl),
    "trial-turn-speak": () => {
      if (listening()) {
        setJudging(true);
        speech.stop();
      } else void listen();
    },
    "trial-turn-hint-button": () => dispatch({ type: "hint" }),
    "trial-turn-cant-speak": () => {
      abandonListening();
      dispatch({ type: "cant-speak" });
    },
    "trial-turn-retry": () => dispatch({ type: "retry" }),
    "trial-tile": (button) =>
      dispatch({ type: "toggle-tile", tileIndex: Number(button.getAttribute("data-tile-index")) }),
    "trial-turn-check": () => dispatch({ type: "check" }),
    "trial-turn-next": () => dispatch({ type: "next" }),
  };

  function onClick(event: Event): void {
    const target = event.target as Element | null;
    const store = target?.closest<HTMLElement>("[data-trial-store]");
    if (store) {
      const click = trialStoreClickOf(store.getAttribute("data-trial-store") ?? undefined);
      if (click !== null) send(click);
      return;
    }
    const button = target?.closest<HTMLElement>("button[data-testid]");
    if (!button || !root.contains(button)) return;
    handlers[button.getAttribute("data-testid") ?? ""]?.(button);
  }

  root.addEventListener("click", onClick);
  return {
    dispose: () => {
      disposed = true;
      root.removeEventListener("click", onClick);
      if (listening()) speech.abort();
      motion.dispose();
      audio.stopVoice();
    },
  };
};

/** 페이지 JSON(`#trial-model`)을 읽습니다. 없거나 깨졌으면 null. */
export const readTrialModel: ReadTrialModel = (doc) => {
  const text = doc.getElementById("trial-model")?.textContent;
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Partial<TrialPageData> | null;
    if (data === null || typeof data !== "object" || !data.model || !data.copy) return null;
    return data as TrialPageData;
  } catch {
    return null;
  }
};
