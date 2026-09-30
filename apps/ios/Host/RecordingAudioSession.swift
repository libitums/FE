import AVFoundation

/// 녹음 동안만 공유 오디오 세션을 빌린다. SpeechRecognitionModule의 직렬 큐 전용이다.
/// 비활성화는 카테고리를 되돌리지 않으므로, 녹음 전 설정을 별도로 복원해야 한다.
final class RecordingAudioSession {
  private let session: RecordingAudioSessionClient
  private var previous: Configuration?

  init(session: RecordingAudioSessionClient = AVAudioSession.sharedInstance()) {
    self.session = session
  }

  func activate() throws {
    guard previous == nil else { return }
    previous = Configuration(
      category: session.category, mode: session.mode, options: session.categoryOptions
    )
    do {
      try session.setCategory(.record, mode: .measurement, options: [])
      try session.setActive(true, options: [])
    } catch {
      // 카테고리 변경 뒤 활성화가 실패해도 녹음 전 설정을 남긴다.
      restore()
      throw error
    }
  }

  /// 엔진과 입력 탭을 멈춘 뒤 호출한다. 늦은 인식 결과가 재생 중 세션을 다시 끄지 않게
  /// 복원은 한 번만 한다. 비활성화 실패와 무관하게 카테고리 복원도 시도한다.
  func restore() {
    guard let previous else { return }
    self.previous = nil
    do {
      try session.setActive(false, options: .notifyOthersOnDeactivation)
    } catch {
      NSLog("Recording audio session deactivation failed: %@", String(describing: error))
    }
    do {
      try session.setCategory(previous.category, mode: previous.mode, options: previous.options)
    } catch {
      NSLog("Recording audio session configuration restore failed: %@", String(describing: error))
    }
  }

  private struct Configuration {
    let category: AVAudioSession.Category
    let mode: AVAudioSession.Mode
    let options: AVAudioSession.CategoryOptions
  }
}

/// OS 호출 실패도 권한 다이얼로그 없이 회귀 검증할 수 있게 하는 네이티브 경계다.
protocol RecordingAudioSessionClient: AnyObject {
  var category: AVAudioSession.Category { get }
  var mode: AVAudioSession.Mode { get }
  var categoryOptions: AVAudioSession.CategoryOptions { get }
  func setCategory(
    _ category: AVAudioSession.Category,
    mode: AVAudioSession.Mode,
    options: AVAudioSession.CategoryOptions
  ) throws
  func setActive(_ active: Bool, options: AVAudioSession.SetActiveOptions) throws
}

extension AVAudioSession: RecordingAudioSessionClient {}
