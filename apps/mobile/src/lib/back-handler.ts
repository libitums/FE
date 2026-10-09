// 뒤로가기 핸들러 스택입니다(순수 · React 없음). 층(`layer`) > 화면(`screen`) 순이고
// 같은 단에서는 나중에 등록된 것이 이깁니다.

export type BackHandler = () => void;
export type BackHandlerLevel = "screen" | "layer";
/** 등록 한 건입니다. 스택은 부를 때 `current`를 읽습니다 — 자리는 그대로 두고 함수만 최신으로 갈 수 있습니다. */
export type BackHandlerEntry = { current: BackHandler };
export type BackHandlerStack = {
  /** 등록하고 해제 함수를 돌려줍니다. 해제는 여러 번 불러도 한 번만 듭니다. */
  readonly add: (level: BackHandlerLevel, entry: BackHandlerEntry) => () => void;
  /** 가장 위 한 건을 부르고 `true`. 비어 있으면 아무것도 안 부르고 `false`. */
  readonly runTop: () => boolean;
};

type Record_ = { readonly level: BackHandlerLevel; readonly entry: BackHandlerEntry };

export function createBackHandlerStack(): BackHandlerStack {
  // 등록 순서대로 쌓습니다. 등록마다 새 레코드라 같은 entry를 두 번 넣어도 해제가 서로 섞이지 않습니다.
  let records: readonly Record_[] = [];

  function top(): BackHandlerEntry | undefined {
    for (const level of ["layer", "screen"] as const) {
      for (let index = records.length - 1; index >= 0; index -= 1) {
        const record = records[index];
        if (record !== undefined && record.level === level) {
          return record.entry;
        }
      }
    }
    return undefined;
  }

  return {
    add: (level, entry) => {
      const record: Record_ = { level, entry };
      records = [...records, record];
      return () => {
        records = records.filter((candidate) => candidate !== record);
      };
    },
    runTop: () => {
      const entry = top();
      if (entry === undefined) {
        return false;
      }
      // 던지면 그대로 올라갑니다 — 호스트 무응답 폴백이 받습니다.
      entry.current();
      return true;
    },
  };
}

/** 앱이 쓰는 하나뿐인 스택입니다. */
export const backHandlers: BackHandlerStack = createBackHandlerStack();
