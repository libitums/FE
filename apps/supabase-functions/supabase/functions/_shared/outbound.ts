import type { Outbound, TimedOutbound } from "./delete-account.contract.ts";

/** 바깥 호출마다 거는 제한 시간입니다. 넘으면 연결 실패와 같습니다. */
export const outboundTimeoutMs = 10_000;

export const timedOutbound: TimedOutbound = (fetchImpl, timeoutMs): Outbound => {
  return async (request) => {
    const init: RequestInit = {
      method: request.method,
      headers: request.headers,
      signal: AbortSignal.timeout(timeoutMs),
    };
    if (request.body !== null) init.body = request.body;
    const response = await fetchImpl(request.url, init);
    return { status: response.status, text: () => response.text() };
  };
};
