import { createContext, useContext, type ReactNode } from "@lynx-js/react";

import { defaultMotion, type Motion } from "./motion.contract";

export type MotionProviderProps = {
  readonly motion: Motion;
  readonly children?: ReactNode;
};

const MotionContext = createContext<Motion>(defaultMotion);

/** 하위 컴포넌트에 움직임 정책을 내려 줍니다. DOM 요소를 만들지 않습니다. */
export function MotionProvider(props: MotionProviderProps) {
  return <MotionContext.Provider value={props.motion}>{props.children}</MotionContext.Provider>;
}

/** Provider 밖에서는 `standard`입니다. 던지지 않습니다. */
export function useMotion(): Motion {
  return useContext(MotionContext);
}
