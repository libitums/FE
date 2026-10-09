// 적응형 아이콘 전경 PNG를 만든다 — 원본 전체를 108dp 캔버스의 80dp로 줄여 가운데 두고 사방을 투명으로 둔다.
// 원본이 바뀌면 사람이 이 스크립트로 다시 만든다. ImageMagick · Pillow가 없는 맥에서 돈다.
//
// 실행(저장소 루트에서):
//   swift apps/android/tools/generate-launcher-foreground.swift \
//     apps/ios/Host/Assets.xcassets/AppIcon.appiconset/AppIcon.png \
//     apps/android/app/src/main/res
//
// 밀도별 캔버스 px: mdpi 108 · hdpi 162 · xhdpi 216 · xxhdpi 324 · xxxhdpi 432. 그림은 캔버스의 80/108.
import CoreGraphics
import Foundation
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write(
    Data("usage: swift generate-launcher-foreground.swift <source.png> <res dir>\n".utf8))
  exit(2)
}
guard let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[1]) as CFURL, nil),
  let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
else {
  FileHandle.standardError.write(Data("cannot read \(args[1])\n".utf8))
  exit(1)
}

let densities: [(String, Int)] = [
  ("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432),
]
for (density, canvas) in densities {
  let art = canvas * 80 / 108
  let margin = (canvas - art) / 2
  guard
    let context = CGContext(
      data: nil, width: canvas, height: canvas, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpace(name: CGColorSpace.sRGB)!,
      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  else { exit(1) }
  context.clear(CGRect(x: 0, y: 0, width: canvas, height: canvas))
  context.interpolationQuality = .high
  context.draw(image, in: CGRect(x: margin, y: margin, width: art, height: art))
  guard let output = context.makeImage() else { exit(1) }
  let directory = URL(fileURLWithPath: args[2]).appendingPathComponent("mipmap-\(density)")
  try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  let url = directory.appendingPathComponent("ic_launcher_foreground.png")
  guard
    let destination = CGImageDestinationCreateWithURL(
      url as CFURL, UTType.png.identifier as CFString, 1, nil)
  else { exit(1) }
  CGImageDestinationAddImage(destination, output, nil)
  guard CGImageDestinationFinalize(destination) else { exit(1) }
  print("\(density): canvas \(canvas)px, art \(art)px, margin \(margin)px -> \(url.path)")
}
