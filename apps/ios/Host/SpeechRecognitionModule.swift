import AVFoundation
import Foundation
import Speech

/// 마이크로 소리를 받아 한국어로 읽어 올리는 호스트 네이티브 모듈이다.
/// 호스트의 **다섯째** 모듈이고, 권한을 요구하는 **첫** 모듈이다.
///
/// **탐침이다.** 묻는 것은 「말한 한국어가 글자로 돌아오는가」이고, 이 파일은 그 물음이
/// 지나갈 경로를 연다. 말하기 화면·문항·여정은 범위 밖이다.
///
/// **왜 `AudioPlaybackModule`에 얹지 않는가** (ADR-0017 D3). 그 모듈의 제외 목록이
/// `녹음`을 이름으로 막는다 — *"얹으면 D1의 조건 1을 건너뛰는 첫 사례가 된다"*. ADR-0026
/// D1이 권한 축을 열면서 같은 자리에 *"그 제외는 그대로 산다. 마이크는 별 모듈이다"* 를
/// 다시 적었다. **별 모듈인 것이 결정이다.** 이름도 그 경계를 진다 —
/// `AudioModule`이 아니라 `AudioPlaybackModule`이 재생을 지고, 입력은 여기다.
///
/// **두 게이트를 따로 통과했다.**
/// - **권한 축** (ADR-0026 D1의 입장 조건 다섯) — 마이크가 첫 사례로 이미 적혀 있다.
/// - **모듈 축** (ADR-0017 D1의 입장 조건 셋) — ① 말하기는 이름이 능력이라 소리를 받지
///   못하면 화면이 정체성을 잃는다, ② 스택 안에 대체 경로가 0개다(훑은 자리는 아래
///   「훑은 자리」), ③ 사람이 귀와 눈으로 판정할 수 있다 — 말하고, 레벨이 오르고,
///   글자가 돌아온다.
///
/// **훑은 자리 (대체 경로 0건).** `@lynx-js/types@4.1.0` 전체에 `MediaRecorder` ·
/// `getUserMedia` · `AudioContext` 선언이 0건이고, 등록된 엘리먼트 목록에 `<audio>`도
/// `<video>`도 없다(ADR-0017 D4가 이미 확인한 자리다). 호스트 모듈 표의 어느 행도
/// 입력을 내지 않는다 — 재생 · 저장소 · 발화 · 필기 인식뿐이다. 손글씨가 찾아낸
/// 「권한 없는 우회」에 해당하는 것이 마이크에는 원리적으로 없다: 손글씨는 *사용자가
/// 이미 화면에 그린 것*을 우리가 읽은 것이고, **소리는 화면에 그려지지 않는다.**
///
/// **권한 둘을 따로 답한다.** 마이크와 음성 인식은 **다른 권한**이고 다이얼로그도 둘이다
/// (ADR-0026 D1이 *"음성 인식이 마이크에 딸려 오지 않는다"* 로 명시했다). 한쪽만 거부된
/// 조합이 실재하므로 상태를 한 값으로 뭉치지 않는다 — 화면이 무엇을 되돌리라고 할지가
/// 그 갈림에 달렸다.
///
/// **조회와 요청이 다른 메서드다** (ADR-0026 D5). `getStatus`는 다이얼로그를 띄우지
/// 않고, `requestPermissions`는 **미요청인 권한에만** 묻는다. 거부된 권한에 다시 묻는
/// 것은 사용자 눈에 *아무 일도 안 일어난 것*으로 보이고, 그 자리의 처방은 요청이 아니라
/// 설정 열기다.
///
/// **오디오 세션은 녹음에 필요한 최소만 만진다.** `AVAudioEngine`의 입력 노드는 기본
/// 카테고리(`.soloAmbient`)에서 **소리를 한 프레임도 주지 않는다** — 그 카테고리가 입력을
/// 허용하지 않는다. 그래서 `.record`로 바꾸는 것은 선택이 아니라 이 능력의 전제다.
/// ADR-0017 D3이 막은 「오디오 세션 카테고리 조작」은 **재생 모듈**의 제외 항목이고,
/// 그 근거는 *"시스템 정책을 건드리는 순간 권한·백그라운드 모드에 닿는다"* 였다.
/// 권한 쪽은 ADR-0026이 조건으로 열었고, **백그라운드 모드는 여기서도 열지 않는다** —
/// `UIBackgroundModes`를 넣지 않고 세션을 세션 밖까지 살려 두지 않는다. 세션이 끝나면
/// `setActive(false, options: .notifyOthersOnDeactivation)`로 되돌려 재생 모듈과 다른 앱의
/// 소리가 원래대로 돌아오게 한다.
///
/// **온디바이스 여부를 감추지 않는다.** 아래 「온디바이스」 절을 본다.
@objc(SpeechRecognitionModule)
final class SpeechRecognitionModule: NSObject, LynxModule {
  @objc static var name: String { "SpeechRecognitionModule" }

  /// **메서드는 넷이다.** ADR-0017 D2의 둘째 재검토 트리거가 *"한 모듈의 메서드가
  /// 다섯을 넘는 시점"* 이라 여기는 그 트리거에 닿지 않는다. 넷으로 줄인 자리가 둘 있다.
  ///
  /// - **상태 조회가 하나다.** 권한 상태와 입력 상태를 `getStatus` 하나가 답한다.
  ///   둘 다 *"부수효과 없이 지금을 읽는 것"* 이고, 화면은 녹음 중 이 하나만 폴링하면
  ///   레벨과 권한을 함께 본다.
  /// - **`stop`이 콜백을 갖지 않는다.** `AudioPlaybackModule.stop()`과 같은 모양이다.
  ///   인식 결과는 `start`의 콜백 하나가 **세션이 끝날 때 한 번** 싣고 올라간다 —
  ///   결과를 싣는 자리가 둘이면 어느 쪽이 정본인지 다투게 된다.
  @objc static var methodLookup: [String: String] {
    [
      "getStatus": NSStringFromSelector(#selector(getStatus(_:))),
      "requestPermissions": NSStringFromSelector(#selector(requestPermissions(_:))),
      "start": NSStringFromSelector(#selector(start(_:callback:))),
      "stop": NSStringFromSelector(#selector(stop)),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  // MARK: - 메서드 넷

  /// 지금 상태를 읽는다. **다이얼로그를 띄우지 않고 아무것도 바꾸지 않는다.**
  ///
  /// ADR-0026 D3의 2단계가 읽는 자리다 — 접점이 있다는 것을 JS가 확인한 뒤, 권한이
  /// 미요청인지 허용인지 거부인지를 여기서 읽는다. 녹음 중에는 같은 메서드가 입력 레벨과
  /// 버퍼 수를 함께 답하므로 화면이 「소리가 들어오고 있다」를 그릴 수 있다.
  ///
  /// **`listening`이 두 번째 진실이 아닌 이유.** ADR-0017 D3이 재생 상태 조회를 거부한
  /// 근거는 *"상태를 JS가 콜백으로 들고 있고, 조회를 열면 진실이 둘이 된다"* 였다.
  /// 여기 값들은 **JS가 들고 있을 수 없는 것**이다 — 버퍼가 몇 개 들어왔는지도, 방금
  /// 버퍼의 세기도, 시스템 인터럽트로 세션이 혼자 끝났는지도 네이티브만 안다.
  /// 두 번째 진실이 아니라 **유일한 진실**이라 조회가 열려 있다.
  @objc func getStatus(_ callback: @escaping LynxCallbackBlock) {
    Self.queue.async {
      callback(Self.statusPayload())
    }
  }

  /// 권한을 요청한다. **미요청인 것에만 묻는다** (ADR-0026 D5).
  ///
  /// 순서는 **마이크 다음 음성 인식**이다. 마이크가 ADR-0026 D2의 권한 표에 행으로 선
  /// 것이고, 그것이 거부되면 인식 권한은 쓸 데가 없다 — 읽을 소리가 없기 때문이다.
  /// 거부돼도 멈추지 않고 둘 다 물어 본 뒤 **둘의 최종 상태를 함께** 올린다. 화면이
  /// 「무엇을 되돌려야 하는가」를 조합으로 가려야 하므로 한쪽만 알면 그 판단을 못 한다.
  ///
  /// ⚠ **다이얼로그가 연달아 둘 뜨는 자리**다. ADR-0026의 재검토 조건이 *"한 화면이
  /// 권한을 둘 이상 요구하는 시점"* 을 이름으로 걸어 두었다 — 이 모듈이 그 시점이다.
  ///
  /// 돌려주는 모양은 `getStatus`와 **같다.** 받는 쪽이 모양 하나만 알면 되게 한다.
  @objc func requestPermissions(_ callback: @escaping LynxCallbackBlock) {
    Self.requestMicrophoneIfNeeded {
      Self.requestSpeechIfNeeded {
        Self.queue.async {
          callback(Self.statusPayload())
        }
      }
    }
  }

  /// 녹음과 인식을 시작한다. `callback`은 **세션이 끝날 때 정확히 한 번** 올라간다.
  ///
  /// 「끝날 때」는 셋 중 하나다: `stop()`이 불려 마지막 결과가 확정됐을 때, 인식이 스스로
  /// 오류나 확정으로 끝났을 때, 아예 시작하지 못했을 때. **시작하지 못한 경우에도 같은
  /// 콜백이 같은 모양으로 즉시 올라간다** — 실패를 던지지 않고 `status` 필드로 낸다.
  ///
  /// 인자는 `{ requireOnDevice?: boolean }` 하나다. 생략하면 `true`다 — 기본이 켜짐인
  /// 이유는 아래 「온디바이스」 절에 있다.
  ///
  /// **시작 성공 여부를 즉시 알고 싶으면 `getStatus().listening`을 본다.** 이 콜백은
  /// 시작 확인이 아니라 결과 전달이다.
  @objc func start(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    Self.queue.async {
      Self.begin(args, callback: callback)
    }
  }

  /// 녹음을 멈춘다. 돌고 있지 않으면 아무 일도 하지 않는다.
  ///
  /// **여기서 콜백이 올라가지 않는다.** 멈춘 뒤에도 인식기는 마지막 버퍼를 읽어 결과를
  /// 확정하므로, 결과는 `start`의 콜백이 그 확정 시점에 싣는다.
  @objc func stop() {
    Self.queue.async {
      Self.end()
    }
  }

  // MARK: - 상수

  /// 읽을 언어. 한국어를 읽는 것이 이 탐침의 물음이다.
  private static let localeIdentifier = "ko-KR"

  /// 모든 세션 상태를 만지는 유일한 자리. 모듈 메서드는 JS 스레드에서 불리고 인식
  /// 콜백은 시스템이 고른 큐에서 오는데, 둘이 같은 상태를 만진다. 직렬 큐 하나로 모아
  /// 접근을 줄 세운다 — 그래서 아래 상태에 락이 없다.
  ///
  /// ⚠ **오디오 탭은 이 큐에 오지 않는다.** 탭은 실시간 오디오 스레드에서 돌고, 거기서
  /// 큐로 넘기면 초당 수십 번 디스패치가 쌓인다. 탭이 만지는 것은 `LevelMeter` 하나뿐이고
  /// 그것만 자기 락을 진다.
  private static let queue = DispatchQueue(
    label: "com.libitum.host.speech-recognition",
    qos: .userInitiated
  )

  /// 탭 하나가 가져오는 프레임 수. 16kHz 기준 약 64ms라, 이 값으로 레벨을 갱신하면
  /// 화면이 사람 눈에 끊기지 않는 미터를 그릴 수 있다.
  private static let tapBufferSize: AVAudioFrameCount = 1024

  /// `stop()` 뒤 결과 확정을 기다리는 한도. 이것이 없으면 인식기가 아무 답도 주지 않는
  /// 경로에서 콜백이 **영영 안 올라간다.** 기다리다 못 받으면 그때까지 받은 글자를 싣고
  /// 끝낸다 — 「못 받았다」는 `isFinal`이 `false`인 것으로 드러난다.
  private static let finalizeTimeout: TimeInterval = 3

  // MARK: - 세션 — `queue` 전용 상태

  /// 돌고 있는 세션. `nil`이면 녹음 중이 아니다. **`queue`에서만 읽고 쓴다.**
  private static var session: Session?

  private final class Session {
    let engine = AVAudioEngine()
    let request = SFSpeechAudioBufferRecognitionRequest()
    let meter = LevelMeter()
    let startedAt = Date()
    let requestedOnDevice: Bool
    let supportsOnDevice: Bool
    let requiresOnDevice: Bool

    var task: SFSpeechRecognitionTask?
    /// 올라가지 않은 콜백. **올린 즉시 `nil`이 된다** — 두 번 올라가는 경로를 값 하나로 막는다.
    var callback: LynxCallbackBlock?
    var text = ""
    var isFinal = false
    var error: NSError?
    /// 탭을 걷고 `endAudio()`까지 마쳤는가. `stop()`이 두 번 불려도 한 번만 걷는다.
    var stopping = false

    init(requestedOnDevice: Bool, supportsOnDevice: Bool, callback: @escaping LynxCallbackBlock) {
      self.requestedOnDevice = requestedOnDevice
      self.supportsOnDevice = supportsOnDevice
      // **지원하지 않을 때 켜면 인식이 오류로 끝난다.** 그래서 둘 다 참일 때만 켠다.
      // 요청했는데 켜지지 못한 것은 `requestedOnDevice`와 `requiresOnDevice`가 갈리는
      // 것으로 JS에 그대로 보인다 — 여기서 조용히 뭉개지 않는다.
      self.requiresOnDevice = requestedOnDevice && supportsOnDevice
      self.callback = callback
    }
  }

  /// 입력 버퍼의 세기를 재는 자리. **오디오 스레드와 `queue`가 함께 만지는 유일한
  /// 상태**라 자기 락을 진다.
  private final class LevelMeter {
    private let lock = NSLock()
    private var count = 0
    private var latest = 0.0
    private var peak = 0.0
    private var sum = 0.0

    /// 버퍼 하나를 반영한다. **오디오 스레드에서 불린다.**
    func record(rms: Double, peak bufferPeak: Double) {
      lock.lock()
      count += 1
      latest = rms
      sum += rms
      peak = max(peak, bufferPeak)
      lock.unlock()
    }

    var snapshot: (count: Int, level: Double, peak: Double, average: Double) {
      lock.lock()
      defer { lock.unlock() }
      let average = count == 0 ? 0 : sum / Double(count)
      return (count, latest, peak, average)
    }
  }

  // MARK: - 권한

  /// 마이크 권한. iOS 17부터 `AVAudioSession.recordPermission`이 물러나고 이쪽이 정본이다.
  /// 배포 타깃이 17.4라 분기가 필요 없다.
  ///
  /// **`restricted`가 없다.** 마이크 권한은 셋(미요청·허용·거부)뿐이고, 음성 인식 쪽만
  /// 넷째 값을 갖는다. 없는 값을 흉내 내지 않는다.
  private static func microphoneState() -> String {
    switch AVAudioApplication.shared.recordPermission {
    case .undetermined: return "not-determined"
    case .granted: return "granted"
    case .denied: return "denied"
    @unknown default: return "unknown"
    }
  }

  /// 음성 인식 권한. **마이크와 별개다** — 소리를 받는 것과 그 소리를 글자로 읽는 것은
  /// 다른 권한이고 다이얼로그도 따로 뜬다 (ADR-0026 D1).
  ///
  /// `restricted`를 `denied`로 접지 않는다. 사용자가 되돌릴 수 있는 거부와, 기기 정책이
  /// 막아 **사용자가 되돌릴 수 없는** 제한은 화면이 할 일이 다르다 — 앞엣것은 설정으로
  /// 보내고 뒤엣것은 보낼 곳이 없다 (ADR-0026 D3의 가르는 기준이 *"사용자가 되돌릴 수
  /// 있는가"* 다).
  private static func speechState() -> String {
    switch SFSpeechRecognizer.authorizationStatus() {
    case .notDetermined: return "not-determined"
    case .authorized: return "granted"
    case .denied: return "denied"
    case .restricted: return "restricted"
    @unknown default: return "unknown"
    }
  }

  /// 미요청일 때만 묻는다. 이미 정해진 상태에서 부르면 다이얼로그 없이 그대로 끝난다.
  private static func requestMicrophoneIfNeeded(then next: @escaping () -> Void) {
    guard microphoneState() == "not-determined" else {
      next()
      return
    }
    AVAudioApplication.requestRecordPermission { _ in next() }
  }

  /// 미요청일 때만 묻는다. 마이크가 거부됐더라도 묻는다 — 화면이 **둘의 조합**을 보고
  /// 무엇을 되돌리라고 할지 정하므로, 한쪽을 미요청으로 남겨 두면 그 판단이 흐려진다.
  private static func requestSpeechIfNeeded(then next: @escaping () -> Void) {
    guard speechState() == "not-determined" else {
      next()
      return
    }
    SFSpeechRecognizer.requestAuthorization { _ in next() }
  }

  // MARK: - 세션 시작

  /// **`queue`에서만 부른다.** 콜백을 올리는 자리가 여럿이지만 전부 `finish`를 지나고,
  /// `finish`는 `session.callback`을 비우며 올린다.
  private static func begin(_ args: [String: Any], callback: @escaping LynxCallbackBlock) {
    guard session == nil else {
      callback(resultPayload(status: "already-listening"))
      return
    }

    // 인자는 키 하나이고 그것도 생략할 수 있다. **있는데 모양이 다른 것**만 거른다 —
    // 없는 것과 틀린 것은 다르다.
    let requestedOnDevice: Bool
    switch args["requireOnDevice"] {
    case nil: requestedOnDevice = true
    case let flag as NSNumber: requestedOnDevice = flag.boolValue
    default:
      callback(resultPayload(status: "invalid-arguments"))
      return
    }

    let microphone = microphoneState()
    let speech = speechState()
    guard microphone == "granted", speech == "granted" else {
      // **둘 중 무엇이 막았는지는 페이로드가 문다.** 상태 둘이 각각 실려 올라가므로
      // 화면이 「마이크만 거부」와 「인식만 거부」와 「둘 다」를 갈라 볼 수 있다.
      callback(resultPayload(status: "permission-denied"))
      return
    }

    guard
      let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier)),
      recognizer.isAvailable
    else {
      // 한국어 인식기가 없거나(기기가 그 언어를 모른다) 지금 쓸 수 없다(네트워크 인식만
      // 가능한데 오프라인이다). 요청을 보내지 않는다 — 보내고 빈 결과를 받으면
      // 「인식기가 없었다」와 「듣고도 못 읽었다」가 한 값으로 뭉친다.
      callback(resultPayload(status: "recognizer-unavailable"))
      return
    }

    let current = Session(
      requestedOnDevice: requestedOnDevice,
      supportsOnDevice: recognizer.supportsOnDeviceRecognition,
      callback: callback
    )
    current.request.shouldReportPartialResults = true
    current.request.requiresOnDeviceRecognition = current.requiresOnDevice
    session = current

    do {
      try activateRecordingSession()
      try startEngine(current)
    } catch let error as NSError {
      // 엔진이 시작에서 죽었어도 탭은 이미 걸려 있을 수 있다. 탭을 걷는 절차는
      // `stopCapture` 한 벌이고 `teardown`이 그것을 지나므로 여기서도 그것을 부른다.
      session = nil
      current.error = error
      teardown(current)
      finish(current, status: "audio-failed")
      return
    }

    current.task = recognizer.recognitionTask(with: current.request) { result, error in
      queue.async {
        // 이미 끝난 세션에 늦게 도착한 콜백은 버린다.
        guard session === current else { return }

        if let result {
          current.text = result.bestTranscription.formattedString
          current.isFinal = result.isFinal
        }
        if let error = error as NSError? {
          current.error = error
        }

        guard error != nil || current.isFinal else { return }
        session = nil
        teardown(current)
        // 오류가 왔어도 **그때까지 읽은 글자는 버리지 않는다.** 둘 다 페이로드에 실린다.
        finish(current, status: error == nil ? "recognized" : "recognition-failed")
      }
    }
  }

  /// 녹음에 필요한 **최소한**의 오디오 세션 설정.
  ///
  /// - `.record` — 기본 `.soloAmbient`는 입력을 허용하지 않아 탭에 한 프레임도 오지
  ///   않는다. 재생까지 겸하는 `.playAndRecord`를 쓰지 않는 이유는 이 모듈이 소리를
  ///   내지 않기 때문이다 — 안 쓰는 능력을 여는 것이 「이왕 만든 김에」의 모양이다.
  /// - `.measurement` — 시스템이 얹는 신호 처리(자동 이득·이퀄라이제이션)를 끈다.
  ///   레벨 값이 우리가 받은 소리를 그대로 비추게 하려는 것이고, 그것이 「소리가
  ///   들어오는가」를 판정하는 이 탐침의 물음과 곧장 닿는다.
  /// - 옵션 없음 — `.duckOthers` 같은 것을 붙이면 다른 앱 소리의 정책까지 정하게 된다.
  ///
  /// **백그라운드는 열지 않는다** (ADR-0017 D3 · ADR-0026). `UIBackgroundModes`가 없고,
  /// 세션은 `deactivateRecordingSession()`이 끝나는 즉시 되돌린다.
  private static func activateRecordingSession() throws {
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .measurement, options: [])
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
  }

  /// 세션을 원래대로 돌린다. **실패해도 던지지 않는다** — 되돌리기에 실패한 것이
  /// 인식 결과를 못 올릴 이유가 되지 않는다.
  ///
  /// `.notifyOthersOnDeactivation`은 우리가 비켰다는 것을 다른 앱과 `AudioPlaybackModule`에
  /// 알린다. 이것이 없으면 녹음 뒤 듣기 화면의 소리가 작아진 채로 남는다.
  private static func deactivateRecordingSession() {
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  /// 입력 노드에 탭을 걸고 엔진을 돌린다.
  ///
  /// 포맷을 우리가 만들지 않고 **입력 노드가 주는 것을 그대로** 쓴다. 기기마다 샘플
  /// 레이트와 채널 수가 다르고, 다른 포맷을 들이밀면 엔진이 시작에서 죽는다.
  private static func startEngine(_ current: Session) throws {
    let input = current.engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else {
      throw NSError(
        domain: "com.libitum.host.speech-recognition",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "입력 노드가 쓸 수 있는 포맷을 주지 않았습니다"]
      )
    }

    input.installTap(onBus: 0, bufferSize: tapBufferSize, format: format) { buffer, _ in
      // **실시간 오디오 스레드다.** 여기서 하는 일은 둘뿐이다 — 인식기에 넘기고,
      // 세기를 재는 것. 큐 디스패치도 락 경합도 여기에 들이지 않는다.
      current.request.append(buffer)
      if let measured = measure(buffer) {
        current.meter.record(rms: measured.rms, peak: measured.peak)
      }
    }

    current.engine.prepare()
    try current.engine.start()
  }

  /// 버퍼 하나의 RMS와 최대 진폭을 잰다. 둘 다 `0...1`이다 — 부동소수 PCM 표본이
  /// 그 범위로 정규화돼 오기 때문이다.
  ///
  /// **화면이 쓰는 배율을 여기서 정하지 않는다.** 사람 목소리의 RMS는 보통 0.05 언저리라
  /// 미터로 그리려면 키워야 하는데, 그 배율은 화면의 관심사다. 여기서 곱해 올리면
  /// 「실제로 들어온 값」이 무엇이었는지가 영영 안 보인다.
  private static func measure(_ buffer: AVAudioPCMBuffer) -> (rms: Double, peak: Double)? {
    guard let channels = buffer.floatChannelData else { return nil }
    let frames = Int(buffer.frameLength)
    guard frames > 0 else { return nil }

    let samples = channels[0]
    var sumSquares = 0.0
    var peak = 0.0
    for index in 0 ..< frames {
      let value = Double(samples[index])
      sumSquares += value * value
      peak = max(peak, abs(value))
    }
    return ((sumSquares / Double(frames)).squareRoot(), peak)
  }

  // MARK: - 세션 종료

  /// 녹음을 멈추고 인식기에 「더 없다」를 알린다. **`queue`에서만 부른다.**
  ///
  /// 여기서 세션을 지우지 않는다 — 인식기가 마지막 버퍼를 읽어 결과를 확정할 시간이
  /// 필요하다. 확정이 오면 `recognitionTask` 콜백이 끝내고, 안 오면 아래 타임아웃이 끝낸다.
  private static func end() {
    guard let current = session, !current.stopping else { return }
    stopCapture(current)

    queue.asyncAfter(deadline: .now() + finalizeTimeout) {
      guard session === current else { return }
      session = nil
      current.task?.cancel()
      teardown(current)
      // 글자가 왔든 안 왔든 `"recognized"`다. **「못 읽었다」와 「경로가 안 섰다」는
      // 다른 답이고**, 앞엣것은 인식 품질의 문제, 뒤엣것은 결선의 문제라 다음에 할 일이
      // 완전히 다르다. 확정을 못 받은 것은 `isFinal`이 진다.
      finish(current, status: "recognized")
    }
  }

  /// 엔진·탭·오디오 세션을 걷는다. 여러 번 불려도 안전하다.
  private static func teardown(_ current: Session) {
    stopCapture(current)
    deactivateRecordingSession()
  }

  /// 엔진을 멈추고 탭을 걷고 인식기에 「더 없다」를 알린다. **걷는 절차는 여기 한 벌뿐이다** —
  /// `end()`와 `teardown()`이 함께 지난다. `stopping`이 두 번째 호출을 막는다.
  private static func stopCapture(_ current: Session) {
    guard !current.stopping else { return }
    current.stopping = true
    current.engine.stop()
    current.engine.inputNode.removeTap(onBus: 0)
    current.request.endAudio()
  }

  /// 콜백을 **정확히 한 번** 올린다. 올리는 자리가 여기 하나뿐이고, 올린 즉시 콜백을
  /// 비워 두 번째 호출이 원리적으로 불가능하게 한다.
  private static func finish(_ current: Session, status: String) {
    guard let callback = current.callback else { return }
    current.callback = nil
    callback(resultPayload(status: status, session: current))
  }

  // MARK: - 콜백 페이로드

  /// `getStatus` · `requestPermissions`가 올리는 모양. **둘이 같은 모양을 쓴다.**
  private static func statusPayload() -> [String: Any] {
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))
    // 녹음 중이 아니면 0이다 — 키를 빼지 않는다. 받는 쪽이 모양 하나만 알면 되게 한다.
    //
    // ⚠ **타입을 손으로 못박는다.** `[String: Any]` 리터럴 안에서는 `?? 0`의 `0`이
    // 맥락 타입 `Any`를 타고 `Int`로 굳어, JS 쪽에서 실수가 정수로 건너간다.
    // 여기서 `Double`을 적는 것이 그 자리를 막는 유일한 수단이다.
    let measured: (count: Int, level: Double, peak: Double, average: Double) =
      session?.meter.snapshot ?? (0, 0, 0, 0)

    return [
      "microphone": microphoneState(),
      "speechRecognition": speechState(),
      "recognizerAvailable": recognizer?.isAvailable ?? false,
      "supportsOnDevice": recognizer?.supportsOnDeviceRecognition ?? false,
      "locale": localeIdentifier,
      "listening": session != nil,
      "bufferCount": measured.count,
      "level": measured.level,
      "peakLevel": measured.peak,
    ]
  }

  /// `start`의 콜백이 올리는 모양을 짓는 **유일한 자리**. 시작조차 못 한 경로도 같은
  /// 키 집합으로 올라간다 — 받는 쪽이 모양 하나만 알면 되게 한다.
  ///
  /// ## 온디바이스
  ///
  /// **조용히 서버로 넘어가는 것을 막는 것이 아니라 보이게 하는 것이 여기서 하는 일이다.**
  /// `requiresOnDeviceRecognition`을 켜면 Apple이 네트워크를 쓰지 않는 것을 보장한다.
  /// 끄면 시스템이 **말없이** 서버 인식으로 갈 수 있고, 공개 API 어디에도 「이 결과가
  /// 어디서 처리됐는가」를 사후에 묻는 자리가 없다 — `SFSpeechRecognitionResult`에 그런
  /// 필드가 없다. 그래서 관찰 가능한 유일한 근거는 **우리가 무엇을 켰는가**이고,
  /// 네 필드가 그 경로를 통째로 드러낸다.
  ///
  /// | 필드 | 무엇인가 |
  /// |---|---|
  /// | `requestedOnDevice` | JS가 요청한 값. 생략하면 `true` |
  /// | `supportsOnDevice` | `SFSpeechRecognizer.supportsOnDeviceRecognition` — 이 기기가 이 언어를 온디바이스로 읽을 수 있는가 |
  /// | `requiresOnDevice` | 우리가 실제로 `SFSpeechAudioBufferRecognitionRequest`에 세운 값 |
  /// | `onDevice` | 위의 결론. `requiresOnDevice`가 참일 때만 `"guaranteed"` |
  ///
  /// **`"guaranteed"`가 아닌 것을 `"server"`라고 적지 않는다.** 껐을 때 시스템이 실제로
  /// 서버를 썼는지 온디바이스로 처리했는지는 **우리가 알 수 없다.** 모르는 것을 안다고
  /// 적으면 다음 사람이 그 값을 근거로 네트워크 의존을 판정한다. `"not-guaranteed"`는
  /// *"보장이 없다 — 네트워크로 갔을 수 있다"* 를 정확히 말한다.
  ///
  /// **요청했는데 못 켠 경우가 보인다.** `requestedOnDevice`가 참인데
  /// `supportsOnDevice`가 거짓이면 `requiresOnDevice`가 거짓이고 `onDevice`가
  /// `"not-guaranteed"`다. 세 값이 함께 올라가므로 「요청을 안 했다」와 「요청했는데
  /// 기기가 못 한다」가 갈린다.
  private static func resultPayload(status: String, session current: Session? = nil) -> [String: Any] {
    // 타입을 손으로 못박는 이유는 `statusPayload()`에 적은 그대로다.
    let measured: (count: Int, level: Double, peak: Double, average: Double) =
      current?.meter.snapshot ?? (0, 0, 0, 0)
    let error = current?.error
    let duration: TimeInterval = current.map { Date().timeIntervalSince($0.startedAt) } ?? 0
    let requiresOnDevice = current?.requiresOnDevice ?? false

    return [
      "status": status,
      // **빈 문자열도 유효한 값이다.** 듣고도 아무것도 못 읽은 것은 오류가 아니라
      // 관측이고, 오류로 바꾸면 그 관측이 사라진다.
      "text": current?.text ?? "",
      "isFinal": current?.isFinal ?? false,
      "microphone": microphoneState(),
      "speechRecognition": speechState(),
      "requestedOnDevice": current?.requestedOnDevice ?? false,
      "supportsOnDevice": current?.supportsOnDevice ?? false,
      "requiresOnDevice": requiresOnDevice,
      "onDevice": requiresOnDevice ? "guaranteed" : "not-guaranteed",
      "bufferCount": measured.count,
      "peakLevel": measured.peak,
      "averageLevel": measured.average,
      "durationMs": Int(duration * 1000),
      "errorDomain": error?.domain ?? "",
      "errorCode": error?.code ?? 0,
      "errorMessage": error?.localizedDescription ?? "",
    ]
  }
}
