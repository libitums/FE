package com.libitum.host;

/** {@code ChatStreamModule}의 제한 값. iOS {@code ChatStreamLimits}와 같다. */
public final class ChatStreamLimits {
  /** 응답 머리가 이 안에 오지 않으면 timeout-connect. */
  public static final long CONNECT_TIMEOUT_MS = 10_000;
  /** 머리 뒤 바이트가 이만큼 끊기면 timeout-idle. 서버는 15초마다 ping을 보낸다. */
  public static final long IDLE_TIMEOUT_MS = 30_000;
  /** 2xx가 아닌 응답의 본문은 여기까지만 싣는다. */
  public static final int ERROR_BODY_BYTES = 65_536;

  private ChatStreamLimits() {}
}
