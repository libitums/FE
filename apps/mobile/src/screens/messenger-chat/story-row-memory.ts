// 스토리 줄의 마지막 모습(ADR-0178 「다시 읽기」) — 탭을 오가면 목록이 다시 마운트돼 상태가 비므로, 계정마다 마지막으로 보인 값을 실행 동안 들고 있다가
// 첫 프레임에 그립니다. 다시 읽기는 뒤에서 하고 끝나면 바꿉니다(줄이 비었다가 서며 밀리지 않게).

/** 마지막으로 보인 값 — 없으면 null. */
export type LastShown<T> = {
  readonly read: () => T | null;
  readonly keep: (value: T) => void;
};

/** 계정마다 하나 — 다른 계정으로 바꾸면 앞 계정의 줄이 서지 않습니다. */
export function accountMemory<T>(accountKey: () => string): LastShown<T> {
  const byAccount = new Map<string, T>();
  return {
    read: () => byAccount.get(accountKey()) ?? null,
    keep: (value) => {
      byAccount.set(accountKey(), value);
    },
  };
}
