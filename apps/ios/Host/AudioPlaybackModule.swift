import AVFoundation
import Foundation

/// 오디오 재생. 호스트의 **두 번째** 네이티브 모듈이다 (ADR-0017 D1).
///
/// ADR-0012 D2의 개수 상한(`두 번째 네이티브 모듈 금지`)이 입장 조건 셋으로 바뀌었고
/// 오디오가 셋을 통과했다 — 듣기 화면이 요구하고(`docs/screens.md` 구현 순서 2),
/// 스택 안에 대체 경로가 0개이며(`<audio>`도 `<video>`도 등록돼 있지 않고 웹 오디오도
/// 없다), `docs/e2e/listening.md`가 눈과 귀로 판정한다.
///
/// **메서드는 둘뿐이다** — `play` · `stop` (ADR-0017 D3). 여기 없는 것은 하지 않는
/// 것이다: 일시정지 · 재개 · 시크 · 배속 · 볼륨 · 페이드 · 동시 재생 ·
/// **재생 상태 조회** · 배경 재생 · 잠금화면 컨트롤 · **오디오 세션 카테고리 조작** ·
/// 녹음 · 재생목록 · 프리로드 · 캐시. **넓혀야 할 것 같으면 구현하지 말고 보고한다.**
///
/// **다시듣기는 메서드가 아니다** — `play`를 다시 부르는 것이다. 그래서 이 파일에
/// `replay`라는 이름이 없다.
///
/// **이름이 `AudioModule`이 아닌 이유.** `Audio`는 마이크·녹음을 같은 모듈로 읽히게
/// 한다. D3이 *"녹음. 마이크는 말하기이고 이 모듈에 얹지 않는다"* 를 명시로 막았는데,
/// 이름이 그 경계를 거스르면 다음 사람이 이름을 근거로 얹는다. **이름이 경계를 진다.**
///
/// **오디오 세션을 건드리지 않는다** (D3). `AVAudioSession.setCategory`를 부르지 않고
/// `UIBackgroundModes`도 넣지 않는다. 기본 카테고리는 무음 스위치에 묶인다 — 실기에서
/// 안 들리면 그것은 이 파일의 버그가 아니라 ADR-0017의 재검토 조건이 가리키는 자리다.
@objc(AudioPlaybackModule)
final class AudioPlaybackModule: NSObject, LynxModule {
  @objc static var name: String { "AudioPlaybackModule" }

  @objc static var methodLookup: [String: String] {
    [
      "play": NSStringFromSelector(#selector(play(_:done:))),
      "stop": NSStringFromSelector(#selector(stop)),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  // MARK: - 메인 큐 전용 상태

  // 아래 셋은 **메인 큐에서만** 읽고 쓴다. 모듈 메서드는 JS 스레드(Background Thread
  // Scripting)에서 불리고, AVFoundation 재생 객체를 그 스레드에서 만들거나 만지지
  // 않는다 (계약 §9.2의 스레드 경계). 큐가 하나라 접근이 직렬화되고, 그래서 락이 없다.

  private var player: AVPlayer?
  private var observers: [NSObjectProtocol] = []
  private var pending: PendingDone?

  // MARK: - 메서드 둘

  /// 소스 하나를 **처음부터** 재생한다. 끝나거나 실패하면 `done`을 **한 번** 부른다.
  ///
  /// **동시 재생은 없다** (D3) — 새 `play`가 이전 것을 대체한다. 대체된 재생의 `done`은
  /// **부르지 않는다.** 멈춘 것은 끝난 것이 아니고, JS 쪽(`apps/mobile/src/lib/audio.ts`)은
  /// 그 규약에 기대어 `play` 앞에서 `stop`을 부르지 않는다 — 대체를 여기서 하지 않으면
  /// 소리가 둘 겹친다.
  ///
  /// `done`의 인자는 쓰지 않는다. D3의 `done`은 *끝났다*와 *실패했다*를 구분하지
  /// 않는다 — 구분을 열면 그것이 재생 상태 조회 API의 시작이다. `NSNull()`로 부른다.
  @objc func play(_ source: String, done: @escaping LynxCallbackBlock) {
    let pending = PendingDone(done)

    DispatchQueue.main.async {
      self.teardown()

      guard let url = Self.resolve(source) else {
        // 해석에 실패했다. 재생하지 않고 `done`을 한 번 부른다 — 실패를 조용히
        // 삼키지 않는다. 자산 15개가 번들에 있는 지금 이 경로로 가는 것은 **등록되지
        // 않았거나 이름이 어긋난 `source`뿐이다** (`docs/e2e/listening.md`).
        pending.fire()
        return
      }

      let item = AVPlayerItem(url: url)
      let player = AVPlayer(playerItem: item)
      self.player = player
      self.pending = pending

      // 끝났을 때와 실패했을 때가 `done` 하나로 모인다. 어느 쪽이 먼저 오든
      // `teardown`이 나머지 관찰을 걷고 `PendingDone`이 두 번째를 막는다.
      //
      // **아직 재지 못한 자리**: 항목이 알림 없이 `.failed`로 떨어지는 경로는 이 둘이
      // 잡지 않는다. 이제 `resolve`가 몸통을 가져 여기까지 닿지만, 그 경로를 실제로
      // 밟게 하려면 깨진 자산이 필요하다 — 실기에서 함께 잰다.
      for notification in [
        AVPlayerItem.didPlayToEndTimeNotification,
        AVPlayerItem.failedToPlayToEndTimeNotification,
      ] {
        let token = NotificationCenter.default.addObserver(
          forName: notification,
          object: item,
          queue: .main
        ) { [weak self] _ in
          guard let self, self.player === player else { return }
          self.teardown(firing: pending)
        }
        self.observers.append(token)
      }

      player.play()
    }
  }

  /// 재생 중인 것을 멈춘다. 없으면 아무 일도 하지 않는다.
  ///
  /// 대기 중인 `done`은 **부르지 않고 버린다** — 멈춘 것은 끝난 것이 아니고, 멈춘 쪽은
  /// 부른 자리가 이미 안다 (ADR-0017 D3).
  @objc func stop() {
    DispatchQueue.main.async { self.teardown() }
  }

  // MARK: - 해석 — **번들 리소스 조회 한 줄**

  /// 자산 디렉터리 이름. `.app` 안에서도 같은 이름의 디렉터리로 남는다 —
  /// `project.pbxproj`가 `apps/ios/Host/audio`를 **폴더 참조**(`lastKnownFileType = folder`)로
  /// 넣기 때문이다. 개별 파일 15개를 등록하지 않는 이유는 **조용히 어긋나지 않기
  /// 위해서다**: 파일이 늘거나 줄 때 폴더 참조는 그대로 따라오지만, 개별 등록은
  /// 빠뜨려도 **빌드가 성공하고 JS 검사도 전부 green인데 그 문항만 소리가 안 난다.**
  private static let audioSubdirectory = "audio"

  /// **확장자를 아는 자리가 여기 하나다.** `audioSource`는 확장자를 지지 않는다 —
  /// 계약(§9.4)이 그렇게 고정했고 `listening.unit.test.ts`가 15개 값의 불변식으로
  /// 강제한다(확장자·스킴·구분자 없음). 데이터가 지는 것은 **안정적 식별자** 하나뿐이고,
  /// 그것을 파일로 옮기는 규약(`<audioSource>.m4a`)은 **호스트의 것**이다.
  /// 형식이 바뀌면 고칠 자리도 이 한 줄이다.
  private static let audioFileExtension = "m4a"

  /// `source`를 재생할 것으로 옮기는 **유일한 자리**.
  ///
  /// **번들 리소스 조회다.** `apps/ios/Host/audio/<source>.m4a`가 `.app` 안
  /// `audio/<source>.m4a`로 복사돼 있고, 파일 이름이 `audioSource` 값과 **정확히 같다.**
  /// 그래서 이 몸통은 추측이 아니라 사실 위에 서 있다 — 그것이 이 자리를 비워 뒀던
  /// 이유가 없어진 지점이다.
  ///
  /// **보류는 그대로 열려 있다.** `docs/adr/README.md` 보류 표의 「오디오 자산의
  /// 출처·형식」 행은 **실제 문항 오디오의 공급 경로**를 묻는다. 지금 번들에 있는 것은
  /// `tooling/audio/generate.sh`가 macOS `say`로 만든 **테스트 자산**이고, 테스트 자산이
  /// 있다는 것과 컨텐츠 공급 경로가 정해졌다는 것은 다르다. 원격 컨텐츠가 오면 이
  /// 함수에 **분기가 하나 는다** — 번들에 없으면 원격으로 가는 형태이고, 반환 타입이
  /// `URL?`인 것이 정확히 그 여지를 위한 것이다 (`URL`은 번들 파일 URL과 원격 URL을
  /// 둘 다 담는다. 그래서 재생 수단도 `AVPlayer`다 — `AVAudioPlayer`는 로컬만 받는다).
  ///
  /// `nil`을 돌려주면 `play`는 재생하지 않고 `done`을 한 번 부른다. 등록되지 않았거나
  /// 이름이 어긋난 `source`가 그 경로로 간다.
  private static func resolve(_ source: String) -> URL? {
    Bundle.main.url(
      forResource: source,
      withExtension: audioFileExtension,
      subdirectory: audioSubdirectory
    )
  }

  // MARK: - 정리

  /// 재생 중인 것을 걷는다. **메인 큐에서만 부른다.**
  ///
  /// `firing`에 넘긴 것이 있으면 걷은 **뒤에** 한 번 부른다. 순서가 뒤집히면 `done`
  /// 안에서 곧바로 온 다음 `play`를 이 정리가 도로 지운다.
  ///
  /// 대기 중이던 다른 `done`은 버린다 — 멈추거나 대체된 재생은 끝난 것이 아니다.
  ///
  /// `AVPlayer`에는 `stop`이 없어서 `pause` 뒤에 참조를 버린다. **일시정지 기능이
  /// 아니다** (D3의 제외 목록) — 재개할 대상 자체를 여기서 없앤다.
  private func teardown(firing pending: PendingDone? = nil) {
    for token in observers {
      NotificationCenter.default.removeObserver(token)
    }
    observers.removeAll()
    player?.pause()
    player = nil
    self.pending = nil
    pending?.fire()
  }
}

/// `done`을 **정확히 한 번만** 통과시킨다.
///
/// 두 알림이 겹쳐 오든, 알림과 정리가 엇갈리든 위로는 한 번만 올라간다. JS 쪽
/// (`apps/mobile/src/lib/audio.ts`)의 세대 가드가 이 한 번을 전제로 서 있다.
///
/// **메인 큐에서만 쓴다** — 그래서 락이 없다.
private final class PendingDone {
  private var done: LynxCallbackBlock?

  init(_ done: @escaping LynxCallbackBlock) {
    self.done = done
  }

  /// 인자는 쓰지 않는다 — 끝난 것과 실패한 것을 구분하지 않는다 (ADR-0017 D3).
  func fire() {
    let done = self.done
    self.done = nil
    done?(NSNull())
  }
}
