#!/bin/bash
# Rebuilds the nine vendor-maven AARs: Lynx 4.0.1 and Fresco 2.3.0 from their upstream tags with 16 KB page
# alignment (see README.md and docs: android-release-config). A human runs this when refreshing the AARs;
# neither `pnpm verify` nor a Gradle build calls it. It needs the network (GitHub, Lynx dependencies, Maven Central).
#
# Required environment:
#   ANDROID_HOME     Android SDK (platform 36 and NDK 28.2.13676358 are used from it)
#   JAVA11_HOME      a JDK 11 (Lynx 4.0.1's Gradle build refuses newer JDKs)
#   CMAKE_3198_DIR   an extracted cmake-3.19.8-macos-universal directory (contains CMake.app).
#                    3.19.8 is the last CMake with the server mode Lynx's old AGP needs that also runs on Apple Silicon.
# Optional:
#   WORK             scratch directory, default ${TMPDIR:-/tmp}/duru-native-16kb (clones, dependencies ~1 GB, build output)
#   NDK_28           default $ANDROID_HOME/ndk/28.2.13676358
# Also needed on PATH: git, git-lfs, ninja, python3, node (22), curl, unzip, zip.
#
# Same libraries are not guaranteed bit for bit (build paths, build-id); the check at the end (step 6) is the contract.
set -eu

HERE="$(cd "$(dirname "$0")" && pwd -P)"
ROOT="$(cd "$HERE/../../.." && pwd -P)"
: "${ANDROID_HOME:?ANDROID_HOME is required}"
: "${JAVA11_HOME:?JAVA11_HOME is required (a JDK 11)}"
: "${CMAKE_3198_DIR:?CMAKE_3198_DIR is required (extracted cmake-3.19.8-macos-universal)}"
WORK="${WORK:-${TMPDIR:-/tmp}/duru-native-16kb}"
NDK_28="${NDK_28:-$ANDROID_HOME/ndk/28.2.13676358}"
STRIP="$NDK_28/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-strip"
LYNX="$WORK/lynx"
FRESCO="$WORK/fresco"
UPSTREAM="$WORK/upstream"
OUT="$WORK/aars"
MAVEN="https://repo1.maven.org/maven2"
# Upstream commits the tags must resolve to (checked with ls-remote --tags; Fresco's v2.3.0 is an annotated tag, so this is the ^{} commit).
LYNX_COMMIT=53f070c8ce50a1661e7f6db248af9c2b04b29d81     # lynx-family/lynx 4.0.1
FRESCO_COMMIT=bbc795aa96852cd61ea88fd38b8ee3328eb3803e   # facebook/fresco v2.3.0
# SHA-256 of the upstream Maven Central files this script repacks. Each was computed from the download and its SHA-1 matched
# Central's .sha1 file. Paths are relative to $MAVEN.
UPSTREAM_SHA256="
2567a47ed510d8dbd6096ea2db38db5841b32f124e23a7771dc3f50260801873  com/facebook/fresco/animated-gif/2.3.0/animated-gif-2.3.0.aar
3f74aa676270b1aceae12f1fe00a7d2642f6f945ae45a8f61b003e77a02466ae  com/facebook/fresco/animated-gif/2.3.0/animated-gif-2.3.0.pom
8da164e7cd0062970c5f9d61695d6dc170c25814903c1c4af7794be8640fb306  com/facebook/fresco/imagepipeline-native/2.3.0/imagepipeline-native-2.3.0.aar
5993cd7fedee74408ed5683c9a657132460c9f5b639e4a2fdd6caa7514b88246  com/facebook/fresco/imagepipeline-native/2.3.0/imagepipeline-native-2.3.0.pom
f5c4c46ae2d40fc9eefca162fb217067b59e4139fa10165498da8d6b80cf8002  com/facebook/fresco/nativeimagefilters/2.3.0/nativeimagefilters-2.3.0.aar
997c2dae4619101612eae10b1d277a01ef4be9a2f0df07f1b0b9b9c53097b00a  com/facebook/fresco/nativeimagefilters/2.3.0/nativeimagefilters-2.3.0.pom
4ae8a5a6f43a6e84eedb348be9b982bec4d05653f8d399c62356d63cdd57c540  com/facebook/fresco/nativeimagetranscoder/2.3.0/nativeimagetranscoder-2.3.0.aar
c0d39668eaef1708e6c860b123cc0de5aeeccb423c200994e33a9d7b5756da10  com/facebook/fresco/nativeimagetranscoder/2.3.0/nativeimagetranscoder-2.3.0.pom
3663127ff8833316df966af6ea981c9d1dddbd220f4287808d89f2317551e031  com/facebook/fresco/webpsupport/2.3.0/webpsupport-2.3.0.aar
5dd704f5605c5ca6c4fe9c20bb8034ac550cb91546abab7cea5e1ef9644a4700  com/facebook/fresco/webpsupport/2.3.0/webpsupport-2.3.0.pom
f0a25469da4f7d3f204630a571d265586b521b889f9a34f45301f8be05464c86  org/lynxsdk/lynx/lynx-base/4.0.1/lynx-base-4.0.1.aar
a5bb3e1a4ad2c9265cf199236d4f0088c68d68fa4bda2278c584de6df13b71a8  org/lynxsdk/lynx/lynx-base/4.0.1/lynx-base-4.0.1.pom
206ba0465a79206389e4a95809d64540c4efdb1fd597d6873101fee18b05b45c  org/lynxsdk/lynx/lynx-trace/4.0.1/lynx-trace-4.0.1.aar
d0f77870f5cdc1631185998fbafaedd97d043c82bfb8b49ba4077615c44af937  org/lynxsdk/lynx/lynx-trace/4.0.1/lynx-trace-4.0.1.pom
e04d7b62a8ecb9255b7993cbbae93abca3196949a1c7c23477618ec07cc557e2  org/lynxsdk/lynx/lynx/4.0.1/lynx-4.0.1.aar
3109576663f1203430b537ed5cb75b420e7e310155ec52ed4afbd0e5c57d7acb  org/lynxsdk/lynx/lynx/4.0.1/lynx-4.0.1.pom
2cbc7bfa919333e923832f2a0ca31b2e2e8a74d32298d21565cfed0dcbbb707e  org/lynxsdk/lynx/service-api/4.0.1/service-api-4.0.1.aar
dbf14c6d41db120b094ef34de76eba35d8e8b7a7ee388296ec0a51ea54c40e1d  org/lynxsdk/lynx/service-api/4.0.1/service-api-4.0.1.pom
"

for need in "$NDK_28/ndk-build" "$STRIP" "$CMAKE_3198_DIR/CMake.app/Contents/bin/cmake" "$JAVA11_HOME/bin/java"; do
  [ -e "$need" ] || { echo "missing: $need" >&2; exit 1; }
done
mkdir -p "$WORK"
export ANDROID_HOME

echo "== 1. upstream sources"
[ -d "$LYNX/.git" ] || git clone --depth 1 --branch 4.0.1 https://github.com/lynx-family/lynx.git "$LYNX"
[ -d "$FRESCO/.git" ] || git clone --depth 1 --branch v2.3.0 https://github.com/facebook/fresco.git "$FRESCO"
pin_check() { # <repo> <expected commit>
  actual="$(git -C "$1" rev-parse HEAD)"
  [ "$actual" = "$2" ] || { echo "$1 is at $actual, expected pinned commit $2" >&2; exit 1; }
}
pin_check "$LYNX" "$LYNX_COMMIT"
pin_check "$FRESCO" "$FRESCO_COMMIT"

echo "== 2. patches"
apply_patch() { # <repo> <patch>
  if git -C "$1" apply --check "$2" 2>/dev/null; then
    git -C "$1" apply "$2"
  elif git -C "$1" apply --check -R "$2" 2>/dev/null; then
    echo "already applied: $2"
  else
    echo "patch does not apply: $2" >&2
    exit 1
  fi
}
apply_patch "$LYNX" "$HERE/patches/lynx-4.0.1.patch"
apply_patch "$FRESCO" "$HERE/patches/fresco-2.3.0.patch"

echo "== 3. Lynx native libraries"
(
  cd "$LYNX"
  # hab sync fetches the pinned toolchain and third_party sources (llvm, gn, ninja, boringssl, ...).
  # envsetup.sh reads unset variables, so it cannot run under `set -u`.
  set +u
  # shellcheck disable=SC1091
  source tools/envsetup.sh
  set -u
  tools/hab sync .
  JAVA_HOME="$JAVA11_HOME" PATH="$JAVA11_HOME/bin:$PATH" python3 tools/android_tools/prepare_android_build.py
  # hab put an x86_64-only CMake here; Lynx's Gradle build must use 3.19.8 universal instead.
  rm -rf buildtools/cmake
  ln -s "$CMAKE_3198_DIR/CMake.app/Contents" buildtools/cmake
  cat > platform/android/local.properties <<EOF
sdk.dir=$ANDROID_HOME
ndk.dir=$NDK_28
cmake.dir=$LYNX/buildtools/cmake
EOF
  cd platform/android
  JAVA_HOME="$JAVA11_HOME" PATH="$JAVA11_HOME/bin:$PATH" ./gradlew \
    :LynxBase:externalNativeBuildNoasanRelease :LynxTrace:externalNativeBuildNoasanRelease \
    :ServiceAPI:externalNativeBuildNoasanRelease :LynxAndroid:externalNativeBuildNoasanRelease \
    --console=plain --no-daemon
)

echo "== 4. Fresco native libraries"
(
  cd "$FRESCO"
  cat > local.properties <<EOF
sdk.dir=$ANDROID_HOME
ndk.command=$NDK_28/ndk-build
EOF
  JAVA_HOME="$JAVA11_HOME" ./gradlew :animated-gif:fetchNativeDeps :static-webp:fetchNativeDeps \
    :native-imagetranscoder:fetchNativeDeps --console=plain
  JAVA_HOME="$JAVA11_HOME" ./gradlew :animated-gif:ndk_build_gifimage :static-webp:ndk_build_static-webp \
    :native-imagetranscoder:ndk_build_native-imagetranscoder :native-filters:ndk_build_native-filters \
    :imagepipeline-native:ndk_build_imagepipeline --console=plain --no-daemon
)

echo "== 5. repack upstream AARs with the rebuilt 64-bit libraries"
rm -rf "$UPSTREAM" "$OUT"
mkdir -p "$UPSTREAM" "$OUT"
LYNX_OBJ="build/intermediates/cmake/noasanRelease/obj"
# group|artifact|version|source directory (before /<abi>/)|libraries
MODULES="
org.lynxsdk.lynx|lynx|4.0.1|$LYNX/platform/android/lynx_android/$LYNX_OBJ|liblynx.so liblynx_v8_bridge.so
org.lynxsdk.lynx|lynx-base|4.0.1|$LYNX/base/platform/android/$LYNX_OBJ|liblynxbase.so
org.lynxsdk.lynx|lynx-trace|4.0.1|$LYNX/base/trace/android/$LYNX_OBJ|liblynxtrace.so
org.lynxsdk.lynx|service-api|4.0.1|$LYNX/platform/android/service_api/$LYNX_OBJ|liblynx_service_api.so
com.facebook.fresco|animated-gif|2.3.0|$FRESCO/animated-gif/build/gifimage|libgifimage.so
com.facebook.fresco|imagepipeline-native|2.3.0|$FRESCO/imagepipeline-native/build/imagepipeline|libimagepipeline.so
com.facebook.fresco|nativeimagefilters|2.3.0|$FRESCO/native-filters/build/native-filters|libnative-filters.so
com.facebook.fresco|nativeimagetranscoder|2.3.0|$FRESCO/native-imagetranscoder/build/native-imagetranscoder|libnative-imagetranscoder.so
com.facebook.fresco|webpsupport|2.3.0|$FRESCO/static-webp/build/static-webp|libstatic-webp.so
"
echo "$MODULES" | while IFS='|' read -r group artifact version srcdir libs; do
  [ -n "$group" ] || continue
  path="$(echo "$group" | tr . /)/$artifact/$version"
  name="$artifact-$version"
  mkdir -p "$UPSTREAM/$path" "$OUT/$path"
  curl -fsSL "$MAVEN/$path/$name.aar" -o "$UPSTREAM/$path/$name.aar"
  curl -fsSL "$MAVEN/$path/$name.pom" -o "$UPSTREAM/$path/$name.pom"
  for ext in aar pom; do
    want="$(echo "$UPSTREAM_SHA256" | awk -v p="$path/$name.$ext" '$2 == p { print $1 }')"
    [ -n "$want" ] || { echo "no pinned sha256 for $path/$name.$ext" >&2; exit 1; }
    got="$(shasum -a 256 "$UPSTREAM/$path/$name.$ext" | awk '{ print $1 }')"
    [ "$got" = "$want" ] || { echo "upstream $path/$name.$ext sha256 $got, expected $want" >&2; exit 1; }
  done
  unpacked="$WORK/unpack/$name"
  rm -rf "$unpacked" && mkdir -p "$unpacked"
  unzip -q "$UPSTREAM/$path/$name.aar" -d "$unpacked"
  for abi in arm64-v8a x86_64; do
    for lib in $libs; do
      target="$unpacked/jni/$abi/$lib"
      [ -f "$target" ] || { echo "upstream $name has no jni/$abi/$lib" >&2; exit 1; }
      [ -f "$srcdir/$abi/$lib" ] || { echo "build output missing: $srcdir/$abi/$lib" >&2; exit 1; }
      cp "$srcdir/$abi/$lib" "$target"
      "$STRIP" --strip-unneeded "$target"
    done
  done
  (cd "$unpacked" && zip -X -r -q "$OUT/$path/$name.aar" .)
  cp "$UPSTREAM/$path/$name.pom" "$OUT/$path/$name.pom"
done

echo "== 6. alignment check"
# shellcheck disable=SC2046
node "$ROOT/devtools/android-bundle/elf-page-alignment.mjs" $(find "$OUT" -name '*.aar' | sort)

echo "== 7. install into vendor-maven"
for group_dir in org com; do
  rm -rf "$HERE/$group_dir"
done
cp -R "$OUT/org" "$OUT/com" "$HERE/"
(cd "$HERE" && find com org -type f \( -name '*.aar' -o -name '*.pom' \) | LC_ALL=C sort | xargs shasum -a 256 > SHA256SUMS)
cat "$HERE/SHA256SUMS"
echo "Done. If the patches changed, refresh them with: git -C $LYNX diff > patches/lynx-4.0.1.patch (same for Fresco)."
