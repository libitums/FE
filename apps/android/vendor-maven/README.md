# vendor-maven — 16 KB 페이지로 다시 빌드한 Lynx · Fresco AAR

Play는 64비트 네이티브 라이브러리가 16 KB 페이지를 지원하기를 요구한다. 이 저장소가 쓰는 Lynx 4.0.1과 Fresco 2.3.0의 상류 AAR은
`.so`의 `GNU_RELRO` 끝이 16 KB 경계가 아니라서 16 KB 기기에서 호환성 경고가 뜬다(LOAD 정렬만 맞아서는 부족하다). 상위 버전(Lynx 4.0.2 · 4.0.3 · 4.1.0,
Fresco 3.x)도 이를 풀지 못하거나 Fresco 3은 Lynx 4.0.1과 이진 호환되지 않는다. 그래서 **같은 버전을 상류 태그에서 16 KB로 다시 빌드한 AAR 9개**를 여기 둔다.

`apps/android/settings.gradle`의 `exclusiveContent`가 이 9개 모듈만 이 디렉터리(Maven 배치)에서 찾게 한다. 좌표는 상류와 같다(`4.0.1` · `2.3.0`),
`build.gradle`의 의존 선언은 바뀌지 않았다. 나머지 모든 의존은 평소대로 `google()` · `mavenCentral()`에서 온다.

## 무엇이 들어 있나

| 상류 | 태그 | 모듈 (AAR + POM) | 라이선스 |
|---|---|---|---|
| [Lynx](https://github.com/lynx-family/lynx) | `4.0.1` | `org.lynxsdk.lynx:lynx` · `lynx-base` · `lynx-trace` · `service-api` | Apache-2.0 (`LYNX-LICENSE` · `LYNX-NOTICE`) |
| [Fresco](https://github.com/facebook/fresco) | `v2.3.0` | `com.facebook.fresco:animated-gif` · `imagepipeline-native` · `nativeimagefilters` · `nativeimagetranscoder` · `webpsupport` | MIT (`FRESCO-LICENSE`) |

각 AAR은 Maven Central의 상류 AAR에서 **64비트 `.so` 20개만** 바꾼 것이다(`jni/arm64-v8a/` · `jni/x86_64/`).
Java 클래스 · 리소스 · 매니페스트 · 32비트 `.so`(`jni/armeabi-v7a/` 등) · POM은 상류 그대로다.

| AAR | 바뀐 라이브러리 (두 ABI 모두) |
|---|---|
| `lynx` | `liblynx.so` · `liblynx_v8_bridge.so` |
| `lynx-base` | `liblynxbase.so` |
| `lynx-trace` | `liblynxtrace.so` |
| `service-api` | `liblynx_service_api.so` |
| `animated-gif` | `libgifimage.so` |
| `imagepipeline-native` | `libimagepipeline.so` |
| `nativeimagefilters` | `libnative-filters.so` |
| `nativeimagetranscoder` | `libnative-imagetranscoder.so` |
| `webpsupport` | `libstatic-webp.so` |

`liblynx.so`는 상류도 정렬돼 있지만 서로 링크하는 Lynx 라이브러리의 툴체인을 섞지 않으려고 같은 빌드로 함께 바꿨다.

## 소스 변경 고지 (Apache-2.0 §4)

상류 소스에 적용한 변경은 `patches/`의 `git diff`가 정본이다(`git apply`로 적용).

- `patches/lynx-4.0.1.patch` — `platform/android/BUILD.gn`의 링크 옵션에 `-Wl,-z,common-page-size=16384` 추가(`max-page-size=16384`는 상류에 이미 있다),
  NDK `21.1.6352462` → `28.2.13676358`(`tools/envsetup.sh` · `tools/env.sh` · `platform/android/gradle.properties`), `CMAKE_VERSION` `3.18.1` → `3.19.8`,
  `abiList` `arm64-v8a` → `arm64-v8a,x86_64`.
- `patches/fresco-2.3.0.patch` — 네이티브 5개 모듈의 `Application.mk`: `APP_LDFLAGS`에 `-Wl,-z,max-page-size=16384 -Wl,-z,common-page-size=16384`,
  `APP_ABI`를 `arm64-v8a x86_64`로. 루트 `build.gradle`에서 종료된 Bintray · android-maven 플러그인을 빼고 `release.gradle`을 주석 한 줄로(게시 작업을 쓰지 않는다).

## 갱신 · 다시 만들기

```sh
export ANDROID_HOME=~/Library/Android/sdk
export JAVA11_HOME=<JDK 11 Home>                       # Lynx 4.0.1의 Gradle 5.6.4가 JDK 11을 요구한다
export CMAKE_3198_DIR=<cmake-3.19.8-macos-universal>   # 풀어 둔 디렉터리(CMake.app이 든)
apps/android/vendor-maven/rebuild.sh
```

`rebuild.sh`는 저장소 밖 작업 디렉터리(`WORK`, 기본 `${TMPDIR}/duru-native-16kb`)에 상류를 받아 패치하고 빌드해 AAR을 이 디렉터리에 다시 쓴다.
`pnpm verify`나 Gradle 빌드는 이 스크립트를 부르지 않는다. 사람이 갱신할 때 한 번 돈다. 같은 비트가 나오는 것은 아니고(빌드 경로 · build-id) 같은 판정을 통과하는 동등물이 나온다.

검증된 도구(2026-10-05, macOS arm64): Temurin JDK 11.0.32.1+1 · CMake 3.19.8(macos-universal) · Android NDK 28.2.13676358 · Ninja 1.13.2 · Git LFS 3.8.0.
이 도구들은 시스템에 설치하지 않고 작업 디렉터리에 받아서 쓴다. 전체 1회 약 7분(Lynx 6분, 의존 내려받기 약 1 GB 포함).
CMake 3.19.8을 쓰는 이유: Lynx의 옛 AGP가 CMake 서버 모드를 요구하고, 서버 모드가 있는 마지막 Apple Silicon 지원 판이다. Lynx가 `hab sync`로 받는 `buildtools/cmake`는 x86_64 전용이라 스크립트가 지우고 이 판으로 바꾼다.

## 체크섬

`SHA256SUMS`는 이 디렉터리의 AAR 9개와 POM 9개의 SHA-256이다(`shasum -a 256` 형식, 이 디렉터리 기준 상대 경로, 정렬). `rebuild.sh`가 끝에서 다시 쓴다.
확인은 `cd apps/android/vendor-maven && shasum -a 256 -c SHA256SUMS`이고, `devtools/android-bundle/release-config.integration.test.mjs`(VM4)가 같은 대조를 네트워크 없이 하며
목록에 없는 `.aar` · `.pom`이 끼어들면 실패한다. `rebuild.sh`는 소스 태그가 가리키는 커밋 SHA(Lynx `53f070c8…`, Fresco `bbc795aa…`)와 받은 상류 AAR · POM의 SHA-256을 고정값과 대조하고, 다르면 멈춘다.
POM 9개는 Maven Central의 상류 파일과 바이트 단위로 같다.

## 판정

```sh
node devtools/android-bundle/elf-page-alignment.mjs $(find apps/android/vendor-maven -name '*.aar')
```

기준: 64비트 ELF의 모든 `PT_LOAD`가 `p_align ≥ 0x4000` · `p_offset ≡ p_vaddr (mod 0x4000)`, `PT_GNU_RELRO` 끝이 0x4000의 배수. 같은 규칙이
`app/native-alignment.gradle`(APK · AAB 빌드 게이트)과 `devtools/android-bundle/release-config.integration.test.mjs`(VM1)에도 있다.

## 지울 수 있을 때

상류 Lynx · Fresco가 이 판정을 통과하는 `.so`를 내면(위 CLI로 확인) 이 디렉터리와 `settings.gradle`의 `exclusiveContent`를 지운다. Lynx · Fresco 버전을 올릴 때는 이 디렉터리를 다시 만들어야 한다.
