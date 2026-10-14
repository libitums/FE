/** 비지 않은 읽기 전용 배열입니다. */
export type NonEmpty<T> = readonly [T, ...T[]];
