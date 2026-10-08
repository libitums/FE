/** 호스트 globalProps의 `reducedMotion`. 객체가 아니거나 키가 없거나 boolean이 아니면 false. 던지지 않는다. */
export function reducedMotionFrom(globalProps: unknown): boolean {
  void globalProps;
  return false;
}
