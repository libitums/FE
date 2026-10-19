import Foundation

/// 콘텐츠 파일(에피소드 그림 · 소리)을 앱 전용 폴더에 받아 두는 저장소.
///
/// `ContentFileModule`이 얇은 Lynx 껍데기이고, 검사 · 경로 · 원자적 저장은 전부 여기 있다 —
/// 루트와 `URLSession`을 주입할 수 있어 네트워크 없이 HostTests가 잰다.
///
/// 파일 위치는 `Application Support/content-files/`이고 백업에서 뺀다. 받은 파일은 서버에서
/// 다시 받을 수 있으므로 iCloud 용량을 쓰지 않게 한다.
final class ContentFileStore {
  /// 모듈과 오디오 재생기가 함께 쓰는 실제 저장소.
  static let shared = ContentFileStore(root: defaultRoot)

  static var defaultRoot: URL {
    let base =
      FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
      ?? FileManager.default.temporaryDirectory
    return base.appendingPathComponent("content-files", isDirectory: true)
  }

  /// 받는 도중의 파일이 머무는 곳. 대상 경로와 같은 볼륨이라 마지막 이동이 원자적이다.
  private static let tmpName = ".tmp"
  static let requestTimeout: TimeInterval = 60

  let root: URL
  private let session: URLSession
  private let fileManager = FileManager.default

  init(root: URL, session: URLSession? = nil) {
    self.root = root
    if let session {
      self.session = session
    } else {
      let configuration = URLSessionConfiguration.ephemeral
      configuration.timeoutIntervalForRequest = Self.requestTimeout
      self.session = URLSession(configuration: configuration)
    }
  }

  // MARK: - 경로 규칙

  /// 길이 1~256, `/`로 나눈 조각이 모두 비어 있지 않고 `[A-Za-z0-9._-]+`만이며 `.` · `..`이 아니다.
  /// 선두 `/`는 빈 첫 조각이라 같이 걸러진다. 호스트(iOS · Android)가 같은 규칙을 쓴다.
  static func isValid(path: String) -> Bool {
    guard !path.isEmpty, path.utf8.count <= 256 else { return false }
    for segment in path.split(separator: "/", omittingEmptySubsequences: false) {
      if segment.isEmpty || segment == "." || segment == ".." { return false }
      for byte in segment.utf8 where !isAllowed(byte) { return false }
    }
    return true
  }

  private static func isAllowed(_ byte: UInt8) -> Bool {
    switch byte {
    case 0x30...0x39, 0x41...0x5A, 0x61...0x7A, 0x2E, 0x2D, 0x5F: return true
    default: return false
    }
  }

  /// `https` + 호스트 있는 주소만 받는다. 평문 http와 file · data는 거부.
  static func httpsURL(_ string: String) -> URL? {
    guard let url = URL(string: string), url.scheme?.lowercased() == "https",
      let host = url.host, !host.isEmpty
    else { return nil }
    return url
  }

  // MARK: - 받기

  /// 받아서 `path`에 원자적으로 둔다. `completion`은 **정확히 한 번**, 임의 스레드에서 불린다.
  ///
  /// 순서가 임시 파일 → 이동인 이유: 받는 도중 끊겨도 대상 경로에는 이전 파일이 그대로이거나
  /// 아무것도 없다. 반쯤 쓰인 파일이 `fileUrl`에 잡혀 `<image>`가 깨진 그림을 읽는 일이 없다.
  func download(url: String, path: String, completion: @escaping ([String: String]) -> Void) {
    guard let remote = Self.httpsURL(url), Self.isValid(path: path) else {
      completion(["status": "invalid"])
      return
    }
    var request = URLRequest(url: remote)
    request.timeoutInterval = Self.requestTimeout

    let task = session.downloadTask(with: request) { [self] location, response, error in
      if error != nil {
        completion(["status": "network"])
        return
      }
      guard let http = response as? HTTPURLResponse, let location else {
        completion(["status": "network"])
        return
      }
      guard http.statusCode == 200 else {
        completion(["status": "http", "code": String(http.statusCode)])
        return
      }
      completion(commit(downloaded: location, to: path))
    }
    task.resume()
  }

  /// 시스템 임시 위치(핸들러가 끝나면 지워짐)의 파일을 루트 `.tmp`로 옮겼다가 대상으로 보낸다.
  private func commit(downloaded location: URL, to path: String) -> [String: String] {
    let tmpDir = root.appendingPathComponent(Self.tmpName, isDirectory: true)
    let tmp = tmpDir.appendingPathComponent(UUID().uuidString)
    let target = root.appendingPathComponent(path)
    do {
      try prepareRoot()
      try fileManager.createDirectory(at: tmpDir, withIntermediateDirectories: true)
      try fileManager.moveItem(at: location, to: tmp)
      let size = try fileManager.attributesOfItem(atPath: tmp.path)[.size] as? NSNumber
      try fileManager.createDirectory(
        at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
      var isDirectory: ObjCBool = false
      let exists = fileManager.fileExists(atPath: target.path, isDirectory: &isDirectory)
      // 같은 이름의 폴더가 있으면 덮지 않는다 — 경로 충돌로 받아 둔 폴더째 사라지게 두지 않는다.
      if exists && isDirectory.boolValue { throw CocoaError(.fileWriteFileExists) }
      if exists {
        _ = try fileManager.replaceItemAt(target, withItemAt: tmp)
      } else {
        try fileManager.moveItem(at: tmp, to: target)
      }
      return ["status": "saved", "bytes": String(size?.intValue ?? 0)]
    } catch {
      try? fileManager.removeItem(at: tmp)
      return ["status": "io"]
    }
  }

  /// 루트를 만들고 백업에서 뺀다. 이미 있어도 속성은 다시 건다(OS가 되돌릴 수 있다).
  private func prepareRoot() throws {
    try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    var url = root
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try url.setResourceValues(values)
  }

  // MARK: - 조회 · 삭제

  /// 파일이 있으면 `file://` 절대 주소, 없거나 규칙 위반이면 빈 문자열.
  func fileUrl(path: String) -> String {
    guard Self.isValid(path: path) else { return "" }
    let target = root.appendingPathComponent(path)
    var isDirectory: ObjCBool = false
    guard fileManager.fileExists(atPath: target.path, isDirectory: &isDirectory),
      !isDirectory.boolValue
    else { return "" }
    return target.absoluteString
  }

  /// 루트/`prefix`(파일 또는 폴더)를 지운다. 없었어도 `removed`.
  func remove(prefix: String) -> [String: String] {
    guard Self.isValid(path: prefix) else { return ["status": "invalid"] }
    let target = root.appendingPathComponent(prefix)
    guard fileManager.fileExists(atPath: target.path) else { return ["status": "removed"] }
    do {
      try fileManager.removeItem(at: target)
      return ["status": "removed"]
    } catch {
      return ["status": "io"]
    }
  }

  // MARK: - 재생기용

  /// 표준화한 경로가 루트 아래인 `file` 주소인가. 오디오 재생기가 이것만 로컬로 연다.
  /// 심볼릭 링크도 풀어서 비교한다 — 폴더 밖을 가리키는 링크로 빠져나가지 못하게.
  func contains(fileURL url: URL) -> Bool {
    guard url.isFileURL else { return false }
    let base = root.resolvingSymlinksInPath().standardizedFileURL.path
    let candidate = url.resolvingSymlinksInPath().standardizedFileURL.path
    return candidate.hasPrefix(base + "/")
  }
}
