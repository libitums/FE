package com.libitum.host;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/** Private notification tap entry point. */
public final class PushNotificationTapActivity extends Activity {
  @Override protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    PushOpenedStore.store(this, getIntent().getStringExtra("target"));
    Intent main = new Intent(this, MainActivity.class);
    main.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    startActivity(main);
    finish();
  }
}
