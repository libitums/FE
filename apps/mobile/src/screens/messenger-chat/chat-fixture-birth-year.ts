// 출처의 생년(ADR-0125)입니다 — 기기에 적고, 서버 방이면 서버 프로필에 보내고 읽습니다. 던지지 않습니다.
//
// - 시작: 기기에 적힌 값(계정마다) → 씨앗 → unasked. 다시 켜도 생년 시트를 다시 띄우지 않습니다.
// - 서버 방: 처음에 `companion_load_profile`을 읽어 서버 생년이 있으면 그 값으로(다른 기기 · 재설치), 서버가 비었는데 기기에
//   생년이 있으면(지난 저장 실패) 다시 보냅니다. 읽는 동안 학습자가 고른 값이 이깁니다.
// - 고르면 기기에 적고 서버에 보냅니다. 건너뛰기는 없습니다(2026-11-27) — 옛 앱의 건너뜀 기록은 적힌 것 없음으로 읽어 다시 묻습니다.

import { nextBirthYear, UNASKED } from "./chat-fixture-safety";
import type { ChatProfileRemote } from "./chat-remote.contract";
import type { ChatBirthYear } from "./chat-source.contract";

/** 생년의 기기 저장입니다 — 앱은 기기 저장소(계정마다), 테스트는 메모리. */
export type BirthYearStore = {
  readonly read: () => ChatBirthYear | null;
  readonly write: (value: ChatBirthYear) => void;
};

export type BirthYearDeps = {
  readonly seed: ChatBirthYear | undefined;
  readonly store?: BirthYearStore;
  readonly profile?: ChatProfileRemote;
  /** 값이 바뀌면 부릅니다(출처가 스냅샷을 비우고 알립니다). */
  readonly onChange: () => void;
  readonly disposed: () => boolean;
};

function readStored(store: BirthYearStore | undefined): ChatBirthYear | null {
  try {
    const value = store?.read() ?? null;
    return value?.kind === "unasked" ? null : value;
  } catch {
    return null;
  }
}

export type BirthYearState = {
  readonly current: () => ChatBirthYear;
  readonly set: (year: number) => void;
};

/** 출처 선택지에서 생년 상태를 만듭니다 — 기기 저장(`birthYearStore`) · 서버 프로필(`remote.profile`). */
export function sourceBirthYear(
  seed: ChatBirthYear | undefined,
  options: {
    readonly birthYearStore?: BirthYearStore;
    readonly remote?: { readonly profile?: ChatProfileRemote };
  },
  disposed: () => boolean,
  onChange: () => void,
): BirthYearState {
  const { birthYearStore: store, remote } = options;
  return birthYearState({ seed, store, profile: remote?.profile, onChange, disposed });
}

export function birthYearState(deps: BirthYearDeps): BirthYearState {
  const { store, profile } = deps;
  let value = readStored(store) ?? deps.seed ?? UNASKED;
  let picked = false;

  const send = (year: number) => {
    void profile?.saveBirthYear(year).catch(() => false);
  };
  const write = (next: ChatBirthYear) => {
    try {
      store?.write(next);
    } catch {
      // 기기 저장 실패 — 다음 실행에 서버 값으로 맞추거나 한 번 더 물을 뿐입니다.
    }
  };

  void profile
    ?.load()
    .then((loaded) => {
      if (deps.disposed() || picked || loaded === null) return;
      if (loaded.birthYear === null) {
        if (value.kind === "set") send(value.year);
        return;
      }
      if (value.kind === "set" && value.year === loaded.birthYear) return;
      value = { kind: "set", year: loaded.birthYear };
      write(value);
      deps.onChange();
    })
    .catch(() => undefined);

  return {
    current: () => value,
    set: (year) => {
      const next = nextBirthYear(value, year);
      if (deps.disposed() || next === value) return;
      picked = true;
      value = next;
      write(next);
      if (next.kind === "set") send(next.year);
      deps.onChange();
    },
  };
}
