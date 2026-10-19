// 콘텐츠 받기 실행기입니다. 신호(연결 · 포그라운드 복귀)는 짧은 사이에 겹쳐 올 수 있습니다 — 받기가 둘 동시에
// 돌면 같은 파일을 두 번 받고 같은 키를 두 번 씁니다. 그래서 한 번에 하나만 돌고, 도는 중에 온 요청은 몇 개든
// 끝난 뒤 **한 번**으로 모읍니다(그 사이에 서버가 바뀌었을 수 있어 버리지는 않습니다). 던지지 않습니다.

export type SyncRunner = {
  /** 받기를 요청합니다. 돌고 있으면 끝난 뒤 한 번 더 돌도록 적어 둡니다. 지금 요청한 차례가 끝나면 풀립니다. */
  readonly request: () => Promise<void>;
};

export function createSyncRunner(task: () => Promise<void>): SyncRunner {
  let running: Promise<void> | null = null;
  let again = false;

  const loop = async (): Promise<void> => {
    do {
      again = false;
      try {
        await task();
      } catch {
        // 일 하나의 실패는 실행기를 멈추지 않습니다 — 다음 신호에 다시 돕니다.
      }
    } while (again);
    running = null;
  };

  return {
    request: () => {
      if (running !== null) {
        again = true;
        return running;
      }
      running = loop();
      return running;
    },
  };
}
