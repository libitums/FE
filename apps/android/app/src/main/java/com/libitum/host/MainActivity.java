package com.libitum.host;

import android.app.Activity;
import android.os.Bundle;
import com.lynx.tasm.LynxBooleanOption;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.LynxViewBuilder;
import com.lynx.xelement.XElementBehaviors;

public final class MainActivity extends Activity {
  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    boolean bundled = !BuildConfig.DEBUG;
    String override = getIntent().getStringExtra("bundle-url");
    String templateUrl = HostPaths.template(BuildConfig.DEBUG, override);
    LynxViewBuilder builder = new LynxViewBuilder();
    builder.setTemplateProvider(new AndroidTemplateProvider(this));
    builder.setMediaResourceFetcher(new BundledMediaFetcher(bundled, templateUrl));
    builder.setEnableGenericResourceFetcher(LynxBooleanOption.TRUE);
    builder.setFontScale(getResources().getConfiguration().fontScale);
    builder.addBehaviors(new XElementBehaviors().create());
    builder.registerModule("StorageModule", StorageModule.class);
    LynxView lynxView = builder.build(this);
    setContentView(lynxView);
    lynxView.renderTemplateUrl(templateUrl, "");
  }
}
