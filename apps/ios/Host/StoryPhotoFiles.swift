import Foundation
import ImageIO
import UIKit

/// 사진을 어디서 가져오는가(ADR-0199). 그 밖의 문자열은 `invalid`.
enum StoryPhotoSource: String {
  case camera
  case library
}

/// 내 스토리 사진의 순수 규칙 — 줄일 크기 · 올릴 주소 · 결과 페이로드. `HostTests`가 잰다.
enum StoryPhotoFiles {
  /// 긴 변의 최대 픽셀. 작은 사진은 키우지 않는다.
  static let maxPixelSize = 1600
  static let jpegQuality: CGFloat = 0.8
  /// pick을 시작할 때 이보다 오래된 파일은 지운다.
  static let maxAge: TimeInterval = 24 * 60 * 60
  /// 응답 본문은 앞 64KB만 JS에 넘긴다.
  static let maxBodyBytes = 64 * 1024
  static let connectTimeout: TimeInterval = 15
  static let totalTimeout: TimeInterval = 60

  /// 긴 변이 `maxSide`를 넘으면 비율대로 줄인다(짧은 변은 반올림, 최소 1). 넘지 않으면 그대로.
  static func targetSize(width: Int, height: Int, maxSide: Int = maxPixelSize) -> (Int, Int) {
    let longest = max(width, height)
    guard longest > maxSide, width > 0, height > 0 else { return (width, height) }
    let scale = Double(maxSide) / Double(longest)
    let scaled = { (value: Int) in max(1, Int((Double(value) * scale).rounded())) }
    return width >= height ? (maxSide, scaled(height)) : (scaled(width), maxSide)
  }

  /// `https` + 호스트 있는 주소만. 평문 http · file · data는 거부.
  static func httpsURL(_ string: String) -> URL? {
    guard let url = URL(string: string), url.scheme?.lowercased() == "https",
      let host = url.host, !host.isEmpty
    else { return nil }
    return url
  }

  /// 고르기 결과 — 값은 모두 문자열(ContentFileModule 관례).
  static func pickedPayload(file: URL, width: Int, height: Int, bytes: Int) -> [String: String] {
    [
      "status": "picked",
      "url": file.absoluteString,
      "path": file.path,
      "width": String(width),
      "height": String(height),
      "bytes": String(bytes),
    ]
  }
}

/// 사진 파일을 앱 캐시 `story-photos/`에 줄여 쓰고, 지우고, 올린다. 루트와 `URLSession`을 주입할 수 있어
/// 화면 · 네트워크 없이 HostTests가 잰다. `StoryPhotoModule`은 Lynx 규약과 화면 띄우기만 맡는다.
final class StoryPhotoStore {
  static let shared = StoryPhotoStore(root: defaultRoot)

  /// `Caches/story-photos/` — 올리면 서버에 있고 올리기 전 잠깐만 머무므로 캐시에 둔다(백업 대상 아님).
  static var defaultRoot: URL {
    let base =
      FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first
      ?? FileManager.default.temporaryDirectory
    return base.appendingPathComponent("story-photos", isDirectory: true)
  }

  let root: URL
  private let session: URLSession
  private let fileManager = FileManager.default

  init(root: URL, session: URLSession? = nil) {
    self.root = root
    if let session {
      self.session = session
    } else {
      let configuration = URLSessionConfiguration.ephemeral
      // 요청 간격(연결 · 응답 대기) 15초, 전체 60초.
      configuration.timeoutIntervalForRequest = StoryPhotoFiles.connectTimeout
      configuration.timeoutIntervalForResource = StoryPhotoFiles.totalTimeout
      self.session = URLSession(configuration: configuration)
    }
  }

  // MARK: - 경로 규칙

  /// 정규화한 경로가 루트 바로 아래의 `<이름>.jpg`일 때만 그 파일 주소. `..` 조각 · 하위 폴더 · 다른 확장자는 nil.
  /// `file://` 주소로 와도 받는다. 존재 여부는 보지 않는다.
  func resolve(path: String) -> URL? {
    let raw: String
    if path.hasPrefix("file://") {
      guard let url = URL(string: path), url.isFileURL else { return nil }
      raw = url.path
    } else {
      raw = path
    }
    guard raw.hasPrefix("/") else { return nil }
    if raw.split(separator: "/", omittingEmptySubsequences: false).contains(where: { $0 == ".." }) {
      return nil
    }
    let candidate = URL(fileURLWithPath: raw).standardizedFileURL
    let base = root.standardizedFileURL
    guard candidate.deletingLastPathComponent().path == base.path else { return nil }
    let name = candidate.lastPathComponent
    guard candidate.pathExtension == "jpg", name.count > 4 else { return nil }
    return candidate
  }

  // MARK: - 줄이기

  /// 파일(사진 보관함에서 고른 원본)을 방향 적용 · 긴 변 1600 · JPEG 0.8로 새로 쓴다. 원본 메타데이터(위치 포함)는 싣지 않는다.
  /// 큰 사진도 전체를 풀지 않고 썸네일 경로로 줄여 읽는다.
  func shrink(imageAt source: URL) -> [String: String] {
    guard let imageSource = CGImageSourceCreateWithURL(source as CFURL, nil),
      CGImageSourceGetCount(imageSource) > 0,
      let props = CGImageSourceCopyPropertiesAtIndex(imageSource, 0, nil) as? [CFString: Any],
      let width = props[kCGImagePropertyPixelWidth] as? Int,
      let height = props[kCGImagePropertyPixelHeight] as? Int
    else { return ["status": "failed"] }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: min(StoryPhotoFiles.maxPixelSize, max(width, height)),
    ]
    guard
      let image = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, options as CFDictionary)
    else { return ["status": "failed"] }
    return write(UIImage(cgImage: image))
  }

  /// 카메라가 준 `UIImage`(방향은 객체 속성)를 같은 규칙으로 줄인다. 그리는 동안 방향이 픽셀에 적용된다.
  func shrink(image: UIImage) -> [String: String] {
    let pointWidth = Int((image.size.width * image.scale).rounded())
    let pointHeight = Int((image.size.height * image.scale).rounded())
    guard pointWidth > 0, pointHeight > 0 else { return ["status": "failed"] }
    let (width, height) = StoryPhotoFiles.targetSize(width: pointWidth, height: pointHeight)
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let rendered = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format)
      .image { _ in image.draw(in: CGRect(x: 0, y: 0, width: width, height: height)) }
    return write(rendered)
  }

  /// 새 JPEG로 인코딩해 `<uuid 소문자>.jpg`에 쓴다 — `jpegData`는 원본 EXIF를 싣지 않는다.
  private func write(_ image: UIImage) -> [String: String] {
    guard let cgImage = image.cgImage,
      let data = UIImage(cgImage: cgImage).jpegData(compressionQuality: StoryPhotoFiles.jpegQuality)
    else { return ["status": "failed"] }
    let target = root.appendingPathComponent("\(UUID().uuidString.lowercased()).jpg")
    do {
      try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
      try data.write(to: target, options: .atomic)
    } catch {
      try? fileManager.removeItem(at: target)
      return ["status": "failed"]
    }
    return StoryPhotoFiles.pickedPayload(
      file: target, width: cgImage.width, height: cgImage.height, bytes: data.count)
  }

  // MARK: - 정리

  /// 폴더 안에서 `maxAge`보다 오래된 파일을 지운다. 실패는 조용히 넘긴다.
  func purge(now: Date = Date()) {
    guard
      let names = try? fileManager.contentsOfDirectory(
        at: root, includingPropertiesForKeys: [.contentModificationDateKey])
    else { return }
    for file in names {
      let modified = (try? file.resourceValues(forKeys: [.contentModificationDateKey]))?
        .contentModificationDate
      if let modified, now.timeIntervalSince(modified) > StoryPhotoFiles.maxAge {
        try? fileManager.removeItem(at: file)
      }
    }
  }

  /// 폴더 안 `.jpg`면 지운다. 아니면 무시, 실패해도 조용히.
  func discard(path: String) {
    guard let file = resolve(path: path) else { return }
    try? fileManager.removeItem(at: file)
  }

  // MARK: - 올리기

  /// 파일 바이트를 본문으로 POST한다. `completion`은 **정확히 한 번**, 임의 스레드에서.
  func upload(
    path: String, url: String, headers: [String: String],
    completion: @escaping ([String: String]) -> Void
  ) {
    guard let file = resolve(path: path), let remote = StoryPhotoFiles.httpsURL(url) else {
      completion(["status": "invalid"])
      return
    }
    var isDirectory: ObjCBool = false
    guard fileManager.fileExists(atPath: file.path, isDirectory: &isDirectory),
      !isDirectory.boolValue
    else {
      completion(["status": "missing"])
      return
    }
    var request = URLRequest(url: remote)
    request.httpMethod = "POST"
    for (name, value) in headers where name.lowercased() != "content-type" {
      request.setValue(value, forHTTPHeaderField: name)
    }
    request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")

    let task = session.uploadTask(with: request, fromFile: file) { data, response, error in
      guard error == nil, let http = response as? HTTPURLResponse else {
        completion(["status": "network"])
        return
      }
      let head = (data ?? Data()).prefix(StoryPhotoFiles.maxBodyBytes)
      completion([
        "status": "http",
        "code": String(http.statusCode),
        "body": String(decoding: head, as: UTF8.self),
      ])
    }
    task.resume()
  }
}
