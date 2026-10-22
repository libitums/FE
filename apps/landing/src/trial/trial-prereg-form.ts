// 완료 화면 사전 등록 폼의 DOM 결선 — 제출 → 형식 → 보내기 → 상태 · 초점 · 이벤트.
// 상태 전이는 순수 `reducePrereg`가 정하고 여기는 그리기만 합니다. 이메일은 접점(`port.submit`)에만 넘기고
// 이벤트 · 낭독 · 로그에 싣지 않습니다.

import type { TrialScriptCopy } from "../components/trial/trial-components.contract";
import { trialPreregEventOf } from "./trial-events";
import type { SendEvent } from "./trial-ports.contract";
import { isValidEmail, normalizeEmail, reducePrereg } from "./trial-prereg";
import type {
  PreregLocale,
  PreregOutcome,
  PreregStatus,
  TrialPreregPort,
} from "./trial-prereg.contract";

export type TrialPreregFormDeps = {
  readonly root: HTMLElement;
  readonly copy: TrialScriptCopy;
  readonly port: TrialPreregPort | null;
  readonly locale: PreregLocale;
  readonly send: SendEvent;
};

const byId = <T extends Element>(scope: ParentNode, id: string) =>
  scope.querySelector<T>(`[data-testid="${id}"]`);

/** 폼을 붙이고 떼는 함수를 돌려줍니다. 폼이 없으면 아무 일도 없습니다. */
export function bindTrialPrereg(deps: TrialPreregFormDeps): () => void {
  const { root, copy, port, locale, send } = deps;
  const form = byId<HTMLFormElement>(root, "trial-prereg");
  if (form === null) return () => undefined;
  const input = byId<HTMLInputElement>(form, "trial-prereg-email");
  const error = byId<HTMLElement>(form, "trial-prereg-error");
  const button = byId<HTMLElement>(form, "trial-prereg-submit");
  const status = byId<HTMLElement>(form, "trial-prereg-status");
  const message = status?.querySelector<HTMLElement>("[data-prereg-message]") ?? null;
  let state: PreregStatus =
    form.getAttribute("data-state") === "unavailable" ? "unavailable" : "idle";
  let disposed = false;

  const buttonLabel = (current: PreregStatus) =>
    current === "sending"
      ? copy.preregSending
      : current === "failed"
        ? copy.preregRetry
        : copy.preregSubmit;

  function render(): void {
    form?.setAttribute("data-state", state);
    if (state === "unavailable") return;
    const invalid = state === "invalid";
    if (error !== null) error.hidden = !invalid;
    if (invalid) input?.setAttribute("aria-invalid", "true");
    else input?.removeAttribute("aria-invalid");
    if (button !== null) {
      button.textContent = buttonLabel(state);
      if (state === "sending") button.setAttribute("aria-disabled", "true");
      else button.removeAttribute("aria-disabled");
    }
    if (message !== null) {
      message.textContent =
        state === "done" ? copy.preregDone : state === "failed" ? copy.preregFailed : "";
    }
  }

  function settle(outcome: PreregOutcome, report: boolean): void {
    if (disposed) return;
    state = reducePrereg(state, { type: "result", outcome });
    render();
    if (report) send(trialPreregEventOf(outcome));
    if (state === "done") status?.focus();
  }

  async function onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const email = normalizeEmail(input?.value ?? "");
    const next = reducePrereg(state, { type: "submit", valid: isValidEmail(email) });
    if (next === state && state !== "invalid") return;
    state = next;
    render();
    if (state === "invalid") {
      input?.focus();
      return;
    }
    if (state !== "sending") return;
    // 보낼 곳이 없으면(어댑터를 만들 수 없는 브라우저) 요청 없이 실패로 안내합니다 — 이벤트도 없습니다.
    if (port === null) {
      settle("failed", false);
      return;
    }
    let outcome: PreregOutcome;
    try {
      outcome = await port.submit(email, locale);
    } catch {
      outcome = "failed";
    }
    settle(outcome, true);
  }

  const listener = (event: Event) => void onSubmit(event);
  form.addEventListener("submit", listener);
  return () => {
    disposed = true;
    form.removeEventListener("submit", listener);
  };
}
