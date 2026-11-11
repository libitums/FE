import Foundation

/// SSE 응답 바이트를 빈 줄 경계에서 잘라 이벤트 블록 하나씩 UTF-8 문자열로 푼다. 경계는 ASCII라서 한글 같은
/// 다바이트 글자가 조각 사이에서 갈려도 블록 안에 온전히 모인 뒤에 풀린다. 앱 JS에는 `TextDecoder`가 없다.
/// 줄 끝은 `\n` · `\r\n` · `\r`(SSE 규칙). 블록 끝의 줄바꿈은 싣지 않는다.
struct SseEventSplitter {
  private var buffer: [UInt8] = []

  mutating func push(_ data: Data) -> [String] {
    buffer.append(contentsOf: data)
    var blocks: [String] = []
    var blockStart = 0
    var lineStart = 0
    var contentEnd = 0
    var i = 0
    scan: while i < buffer.count {
      let byte = buffer[i]
      guard byte == 0x0A || byte == 0x0D else {
        i += 1
        continue
      }
      var length = 1
      if byte == 0x0D {
        if i + 1 < buffer.count {
          if buffer[i + 1] == 0x0A { length = 2 }
        } else if i != lineStart {
          // 내용 줄 끝의 `\r`이 마지막 바이트면 `\r\n`인지 다음 조각을 봐야 안다.
          break scan
        }
      }
      if i == lineStart {
        if lineStart > blockStart { blocks.append(Self.decode(buffer[blockStart..<contentEnd])) }
        blockStart = i + length
      } else {
        contentEnd = i
      }
      i += length
      lineStart = i
    }
    buffer.removeFirst(blockStart)
    return blocks
  }

  /// 스트림이 끝날 때 남은 블록(빈 줄 없이 끝난 것)을 낸다.
  mutating func finish() -> [String] {
    defer { buffer.removeAll() }
    var end = buffer.count
    while end > 0, buffer[end - 1] == 0x0A || buffer[end - 1] == 0x0D { end -= 1 }
    var start = 0
    while start < end, buffer[start] == 0x0A || buffer[start] == 0x0D { start += 1 }
    return start < end ? [Self.decode(buffer[start..<end])] : []
  }

  private static func decode(_ bytes: ArraySlice<UInt8>) -> String {
    String(decoding: bytes, as: UTF8.self)
  }
}

enum ChatStreamLimits {
  /// 응답 머리가 이 안에 오지 않으면 `timeout-connect`.
  static let connectTimeout: TimeInterval = 10
  /// 머리 뒤 바이트가 이만큼 끊기면 `timeout-idle`. 서버는 15초마다 ping을 보낸다.
  static let idleTimeout: TimeInterval = 30
  /// 2xx가 아닌 응답의 본문은 여기까지만 싣는다.
  static let errorBodyBytes = 65_536
}

/// 모듈이 JS로 올리는 전역 이벤트의 출구. `ViewController`가 `lynxView.sendGlobalEvent`로 잇는다.
/// 늘 메인 큐에서 부른다.
enum ChatStreamEvents {
  static var sink: ((String, [Any]) -> Void)?

  static func send(_ name: String, _ args: [Any]) {
    DispatchQueue.main.async { sink?(name, args) }
  }
}

/// 열린 스트림들. 상태는 전부 `queue`(URLSession 델리게이트 큐) 위에서만 바뀐다.
final class ChatStreamSessions: NSObject, URLSessionDataDelegate {
  static let shared = ChatStreamSessions()

  private final class Stream {
    let id: String
    var splitter = SseEventSplitter()
    var seq = 0
    var status: Int?
    var errorBody = Data()
    var ended = false
    var connectTimer: DispatchWorkItem?

    init(id: String) { self.id = id }
  }

  private let queue: OperationQueue = {
    let queue = OperationQueue()
    queue.name = "libitum.chat-stream"
    queue.maxConcurrentOperationCount = 1
    return queue
  }()
  private lazy var session: URLSession = {
    let configuration = URLSessionConfiguration.default
    configuration.timeoutIntervalForRequest = ChatStreamLimits.idleTimeout
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    return URLSession(configuration: configuration, delegate: self, delegateQueue: queue)
  }()
  private var streams: [Int: Stream] = [:]
  private var tasks: [String: URLSessionDataTask] = [:]

  func open(streamId: String, url: String, headers: [String: String], body: String) {
    queue.addOperation { [self] in
      guard let target = URL(string: url), tasks[streamId] == nil else {
        Self.end(streamId, "network", "invalid-request")
        return
      }
      var request = URLRequest(url: target)
      request.httpMethod = "POST"
      for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }
      // 두 플랫폼이 같은 요청을 보내도록 본문 형식과 받을 형식은 JS 값 위에 고정한다(Android와 같다).
      request.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
      request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
      request.httpBody = Data(body.utf8)
      let task = session.dataTask(with: request)
      let stream = Stream(id: streamId)
      streams[task.taskIdentifier] = stream
      tasks[streamId] = task
      let timer = DispatchWorkItem { [weak self] in
        self?.queue.addOperation {
          // 이미 실행 중인 타이머는 `cancel()`로 못 멈춘다 — 그 사이 머리가 왔으면 끝내지 않는다.
          guard let self, let stream = self.streams[task.taskIdentifier], !stream.ended,
            stream.status == nil
          else { return }
          self.finish(task, "timeout-connect", nil, cancel: true)
        }
      }
      stream.connectTimer = timer
      DispatchQueue.global().asyncAfter(deadline: .now() + ChatStreamLimits.connectTimeout, execute: timer)
      task.resume()
    }
  }

  func cancel(streamId: String) {
    queue.addOperation { [self] in
      guard let task = tasks[streamId] else { return }
      finish(task, "cancelled", nil, cancel: true)
    }
  }

  func urlSession(
    _ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse,
    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
  ) {
    guard let stream = streams[dataTask.taskIdentifier], !stream.ended else {
      completionHandler(.cancel)
      return
    }
    stream.connectTimer?.cancel()
    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    stream.status = status
    Self.send("chatStreamOpen", [stream.id, status])
    completionHandler(.allow)
  }

  func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
    guard let stream = streams[dataTask.taskIdentifier], !stream.ended else { return }
    if Self.isSuccess(stream.status) {
      emit(stream, stream.splitter.push(data))
    } else {
      let room = ChatStreamLimits.errorBodyBytes - stream.errorBody.count
      if room > 0 { stream.errorBody.append(data.prefix(room)) }
      // 상한에 닿으면 나머지를 받지 않고 끝낸다(Android와 같다).
      if stream.errorBody.count >= ChatStreamLimits.errorBodyBytes {
        finish(
          dataTask, "http-error", String(decoding: stream.errorBody, as: UTF8.self), cancel: true)
      }
    }
  }

  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard let stream = streams[task.taskIdentifier], !stream.ended else {
      forget(task)
      return
    }
    if let error = error as NSError? {
      let timedOut = error.domain == NSURLErrorDomain && error.code == NSURLErrorTimedOut
      let reason = timedOut ? (stream.status == nil ? "timeout-connect" : "timeout-idle") : "network"
      finish(task, reason, nil, cancel: false)
    } else if Self.isSuccess(stream.status) {
      emit(stream, stream.splitter.finish())
      finish(task, "complete", nil, cancel: false)
    } else {
      finish(task, "http-error", String(decoding: stream.errorBody, as: UTF8.self), cancel: false)
    }
  }

  private func emit(_ stream: Stream, _ blocks: [String]) {
    for block in blocks {
      Self.send("chatStreamEvent", [stream.id, stream.seq, block])
      stream.seq += 1
    }
  }

  /// 스트림마다 정확히 한 번 `chatStreamEnd`를 보낸다.
  private func finish(_ task: URLSessionTask, _ reason: String, _ detail: String?, cancel: Bool) {
    guard let stream = streams[task.taskIdentifier], !stream.ended else { return }
    stream.ended = true
    stream.connectTimer?.cancel()
    if cancel { task.cancel() }
    Self.end(stream.id, reason, detail)
    forget(task)
  }

  private func forget(_ task: URLSessionTask) {
    if let stream = streams.removeValue(forKey: task.taskIdentifier) { tasks[stream.id] = nil }
  }

  private static func isSuccess(_ status: Int?) -> Bool {
    guard let status else { return false }
    return (200..<300).contains(status)
  }

  private static func end(_ streamId: String, _ reason: String, _ detail: String?) {
    send("chatStreamEnd", [streamId, reason, detail ?? NSNull()])
  }

  private static func send(_ name: String, _ args: [Any]) { ChatStreamEvents.send(name, args) }
}

/// 자유 대화 답을 SSE 블록 단위로 받는 호스트 모듈이다. `lynx.fetch`의 스트리밍은 iOS에서 본문을 잃는다.
/// 결과는 콜백이 아니라 전역 이벤트 셋(`chatStreamOpen` · `chatStreamEvent` · `chatStreamEnd`)으로만 온다.
@objc(ChatStreamModule)
final class ChatStreamModule: NSObject, LynxModule {
  @objc static var name: String { "ChatStreamModule" }

  @objc static var methodLookup: [String: String] {
    [
      "open": NSStringFromSelector(#selector(open(_:url:headers:body:))),
      "cancel": NSStringFromSelector(#selector(cancel(_:))),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func open(_ streamId: String, url: String, headers: NSDictionary, body: String) {
    var pairs: [String: String] = [:]
    for case let (name as String, value as String) in headers { pairs[name] = value }
    ChatStreamSessions.shared.open(streamId: streamId, url: url, headers: pairs, body: body)
  }

  @objc func cancel(_ streamId: String) {
    ChatStreamSessions.shared.cancel(streamId: streamId)
  }
}
