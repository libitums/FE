import UIKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  private var performanceCapture: LynxPerformanceCapture?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // WebP 디코더는 Podfile에 들어 있지만(LynxService/Image) 등록하지 않으면 쓰이지 않는다.
    // 등록이 없으면 `<image>`가 WebP를 받아 캐시까지 해 놓고 **아무것도 그리지 않는다** —
    // 오류 이벤트도 없다. Explorer는 이 등록을 스스로 하므로 개발 루프에서는 드러나지 않는다.
    // 스플래시 로고 애니메이션(animated WebP)이 이것에 기대고 있다.
    SDImageCodersManager.shared.addCoder(SDImageWebPCoder.shared)

    let environment = LynxEnv.sharedInstance()
    performanceCapture = LynxPerformanceCapture.makeIfEnabled(
      arguments: ProcessInfo.processInfo.arguments
    )
    if let performanceCapture {
      // 전역 dispatcher에 LynxView가 생기기 전에 등록해야 첫 loadBundle을 놓치지 않는다.
      environment.lifecycleDispatcher.addLifecycleClient(performanceCapture)
    }
    return true
  }
}

/// `--performance-capture`로 명시적으로 실행한 개발 세션만 로컬 NDJSON을 쓴다.
/// Performance와 memory callback은 reporter thread에서 오므로 UIKit을 만지지 않고,
/// 파일 쓰기와 snapshot 순번은 하나의 직렬 큐에서만 변경한다.
private final class LynxPerformanceCapture: NSObject, LynxViewLifecycleV2 {
  private static let launchFlag = "--performance-capture"
  private static let memoryTimeoutMs: Int64 = 5_000
  private static let navigationPrefix = "libitum:navigation:"

  private let captureURL: URL
  private let fileHandle: FileHandle
  private let writeQueue = DispatchQueue(label: "com.libitum.performance-capture")
  private let timestampFormatter: ISO8601DateFormatter
  private var didRequestInitialMemory = false
  private var navigationSnapshotCounts: [String: Int] = [:]

  static func makeIfEnabled(arguments: [String]) -> LynxPerformanceCapture? {
    guard arguments.contains(launchFlag) else { return nil }

    do {
      let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("LynxPerformance", isDirectory: true)
      try FileManager.default.createDirectory(
        at: directory,
        withIntermediateDirectories: true
      )
      let captureURL = directory.appendingPathComponent("capture.ndjson", isDirectory: false)
      try Data().write(to: captureURL, options: .atomic)
      let fileHandle = try FileHandle(forWritingTo: captureURL)
      return LynxPerformanceCapture(captureURL: captureURL, fileHandle: fileHandle)
    } catch {
      NSLog("[LynxPerformance] capture unavailable: %@", error.localizedDescription)
      return nil
    }
  }

  private init(captureURL: URL, fileHandle: FileHandle) {
    self.captureURL = captureURL
    self.fileHandle = fileHandle
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    timestampFormatter = formatter

    super.init()
    NSLog("[LynxPerformance] capture enabled: %@", captureURL.path)
  }

  deinit {
    try? fileHandle.close()
  }

  @objc func onPerformanceEvent(_ entry: LynxPerformanceEntry) {
    let entryDictionary = entry.toDictionary()
    writeQueue.async { [weak self] in
      guard let self else { return }
      appendRecord([
        "source": "performance",
        "capturedAt": timestamp(),
        "entry": entryDictionary,
      ])
      requestMemoryIfNeeded(after: entryDictionary)
    }
  }

  private func requestMemoryIfNeeded(after entry: [AnyHashable: Any]) {
    let entryType = entry["entryType"] as? String
    let name = entry["name"] as? String

    let isInitialLoad = (entryType == "pipeline" && name == "loadBundle") ||
      (entryType == "metric" && name == "fcp")
    if isInitialLoad {
      if !didRequestInitialMemory {
        didRequestInitialMemory = true
        requestMemory(label: "after-initial-load")
      }
      // 최초 트리에 들어간 timing flag는 사용자 내비게이션이 아니므로 중복 snapshot을 만들지 않는다.
      return
    }

    guard entryType == "pipeline",
          let identifier = entry["identifier"] as? String,
          identifier.hasPrefix(Self.navigationPrefix)
    else { return }

    let tab = String(identifier.dropFirst(Self.navigationPrefix.count))
    guard !tab.isEmpty else { return }
    let run = (navigationSnapshotCounts[tab] ?? 0) + 1
    navigationSnapshotCounts[tab] = run
    requestMemory(label: "after-navigation-\(tab)-\(String(format: "%02d", run))")
  }

  private func requestMemory(label: String) {
    LynxMemoryUsageQuery.sharedInstance().queryLynxGlobalMemoryUsageAsync(
      { [weak self] result in
        self?.writeQueue.async { [weak self] in
          self?.appendMemoryRecord(label: label, result: result)
        }
      },
      timeoutMs: Self.memoryTimeoutMs
    )
  }

  private func appendMemoryRecord(label: String, result: LynxGlobalMemoryUsageResult) {
    appendRecord([
      "source": "memory",
      "capturedAt": timestamp(),
      "label": label,
      "result": [
        "collectionStatus": result.collectionStatus.rawValue,
        "collectionDurationMs": result.collectionDurationMs,
        "collectionTimeoutMs": result.collectionTimeoutMs,
        "expectedInstanceCount": result.expectedInstanceCount,
        "completedInstanceCount": result.completedInstanceCount,
        "totalBytes": result.totalBytes,
        "elementBytes": result.elementBytes,
        "viewBytes": result.viewBytes,
        "mainThreadRuntimeBytes": result.mainThreadRuntimeBytes,
        "backgroundThreadRuntimeBytes": result.backgroundThreadRuntimeBytes,
        "appBytes": result.appBytes,
        "ratioToApp": result.ratioToApp,
        "elementNodeCount": result.elementNodeCount,
      ],
    ])
  }

  private func timestamp() -> String {
    timestampFormatter.string(from: Date())
  }

  private func appendRecord(_ record: [String: Any]) {
    do {
      var data = try JSONSerialization.data(withJSONObject: record, options: [.sortedKeys])
      data.append(0x0A)
      try fileHandle.write(contentsOf: data)
    } catch {
      NSLog("[LynxPerformance] record write failed: %@", error.localizedDescription)
    }
  }
}
