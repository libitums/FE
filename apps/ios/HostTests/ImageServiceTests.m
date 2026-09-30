#import <XCTest/XCTest.h>
#import <Lynx/LynxService.h>
#import <Lynx/LynxURL.h>
#import <SDWebImage/SDWebImage.h>

// Exercise the registered Lynx 4.0.1 adapter against the installed SDWebImage SDK.
@interface ImageServiceTests : XCTestCase
@end

@implementation ImageServiceTests

- (NSURL *)assetWithPrefix:(NSString *)prefix extension:(NSString *)extension {
  NSURL *directory = [[NSBundle mainBundle].resourceURL
      URLByAppendingPathComponent:@"Resource/static/image" isDirectory:YES];
  NSArray<NSURL *> *files = [[NSFileManager defaultManager]
      contentsOfDirectoryAtURL:directory includingPropertiesForKeys:nil options:0 error:nil];
  for (NSURL *file in files) {
    if ([file.lastPathComponent hasPrefix:prefix] && [file.pathExtension isEqual:extension]) {
      return file;
    }
  }
  XCTFail(@"Missing production asset: %@.%@; run pnpm bundle:host first", prefix, extension);
  return nil;
}

- (UIImage *)loadImage:(NSURL *)url {
  id<LynxServiceImageProtocol> service = LynxService(LynxServiceImageProtocol);
  XCTAssertNotNil(service);
  if (!service || !url) return nil;

  LynxURL *request = [LynxURL new];
  request.url = url;
  LynxUIImage *imageUI = [LynxUIImage new];
  XCTestExpectation *loaded = [self expectationWithDescription:@"Lynx image loaded"];
  __block UIImage *result = nil;
  dispatch_block_t cancel = [service loadNewImageFromURL:request
      size:CGSizeMake(240, 240) enableGenericFetcher:NO contextInfo:@{} processors:@[]
      completed:^(UIImage *image, NSError *error, NSURL *imageURL) {
        XCTAssertNil(error);
        XCTAssertNotNil(image);
        XCTAssertEqualObjects(imageURL, url);
        result = image;
        [loaded fulfill];
      } LynxUIImage:imageUI];
  [self waitForExpectations:@[loaded] timeout:10];
  cancel();
  // Keep the Lynx UI alive throughout the asynchronous adapter request.
  XCTAssertNotNil(imageUI);
  return result;
}

- (void)testLoadsBundledPNGThroughLynxService {
  UIImage *image = [self loadImage:[self assetWithPrefix:@"story-character." extension:@"png"]];
  XCTAssertGreaterThan(image.size.width, 0);
  XCTAssertGreaterThan(image.size.height, 0);
}

- (void)testLoadsBundledJPEGThroughLynxService {
  UIImage *image = [self loadImage:[self assetWithPrefix:@"final-cafe." extension:@"jpg"]];
  XCTAssertGreaterThan(image.size.width, 0);
  XCTAssertGreaterThan(image.size.height, 0);
}

- (void)testPlaysBundledAnimatedWebPInLynxImageView {
  id<LynxServiceImageProtocol> service = LynxService(LynxServiceImageProtocol);
  UIImage *image = [self loadImage:[self assetWithPrefix:@"logo-handwriting." extension:@"webp"]];
  XCTAssertTrue([service isAnimatedImage:image]);
  XCTAssertTrue([image isKindOfClass:SDAnimatedImage.class]);
  if (![image isKindOfClass:SDAnimatedImage.class]) return;
  XCTAssertGreaterThan(((SDAnimatedImage *)image).animatedImageFrameCount, 1);

  UIImageView *view = [service imageView];
  XCTAssertTrue([service checkImageType:view]);
  XCTAssertTrue([view isKindOfClass:SDAnimatedImageView.class]);
  if (![view isKindOfClass:SDAnimatedImageView.class]) return;
  UIWindow *window = [[UIWindow alloc] initWithFrame:CGRectMake(0, 0, 240, 240)];
  window.rootViewController = [UIViewController new];
  view.frame = window.bounds;
  [window.rootViewController.view addSubview:view];
  window.hidden = NO;
  [service handleAnimatedImage:image view:view loopCount:0];
  [service resumeImage:view callback:nil];
  NSPredicate *advanced = [NSPredicate predicateWithBlock:^BOOL(id object, NSDictionary *bindings) {
    return ((SDAnimatedImageView *)view).currentFrameIndex > 0;
  }];
  XCTestExpectation *played = [[XCTNSPredicateExpectation alloc] initWithPredicate:advanced object:view];
  [self waitForExpectations:@[played] timeout:10];
  [service pauseImage:view callback:nil];
  XCTAssertFalse(view.isAnimating);
  [service resumeImage:view callback:nil];
  XCTAssertTrue(view.isAnimating);
  [service stopImage:view callback:nil];
  window.hidden = YES;
}

- (void)testLoadsPersistedDiskCacheAfterSourceAndMemoryAreRemoved {
  NSURL *source = [self assetWithPrefix:@"story-character." extension:@"png"];
  NSURL *temporary = [NSURL fileURLWithPath:[NSTemporaryDirectory()
      stringByAppendingPathComponent:[NSUUID.UUID.UUIDString stringByAppendingString:@".png"]]];
  NSError *error = nil;
  XCTAssertTrue([[NSFileManager defaultManager] copyItemAtURL:source toURL:temporary error:&error]);
  XCTAssertNil(error);
  UIImage *original = [self loadImage:temporary];
  SDImageCache *cache = SDImageCache.sharedImageCache;
  NSString *key = [SDWebImageManager.sharedManager cacheKeyForURL:temporary];
  // The synchronous read drains queued disk writes before removing the source.
  XCTAssertGreaterThan([cache diskImageDataForKey:key].length, 0);
  [cache removeImageFromMemoryForKey:key];
  XCTAssertTrue([[NSFileManager defaultManager] removeItemAtURL:temporary error:&error]);
  XCTAssertNil(error);
  XCTAssertNil([cache imageFromMemoryCacheForKey:key]);

  UIImage *cached = [self loadImage:temporary];
  XCTAssertEqual(cached.size.width, original.size.width);
  XCTAssertEqual(cached.size.height, original.size.height);
  [cache removeImageForKey:key withCompletion:nil];
}

@end
