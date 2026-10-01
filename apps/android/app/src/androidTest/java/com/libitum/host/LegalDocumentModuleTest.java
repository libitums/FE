package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class LegalDocumentModuleTest {
  @Test public void namesResolveOnlyToTheTwoApprovedHttpsDestinations() {
    assertEquals(
        "https://gregarious-pharaoh-bb6.notion.site/DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402",
        LegalDocumentUrls.forName("privacy-policy"));
    assertEquals(
        "https://gregarious-pharaoh-bb6.notion.site/DURU-Term-of-Use-3eb0c2540c0180ef9072f0b447b3b468",
        LegalDocumentUrls.forName("terms-of-use"));
    assertNull(LegalDocumentUrls.forName("https://example.org"));
    assertNull(LegalDocumentUrls.forName("privacy-policy/extra"));
    assertNull(LegalDocumentUrls.forName(null));
  }

  @Test public void invalidDocumentCallsBackWithoutOpeningBrowser() {
    LegalDocumentModule module = new LegalDocumentModule(
        InstrumentationRegistry.getInstrumentation().getTargetContext(), null);
    JavaOnlyMap args = new JavaOnlyMap();
    args.putString("document", "https://example.org");
    AtomicReference<Object> received = new AtomicReference<>();
    module.open(args, values -> received.set(values[0]));
    assertEquals("invalid-arguments", ((JavaOnlyMap) received.get()).getString("status"));
    args.putInt("document", 4);
    module.open(args, values -> received.set(values[0]));
    assertEquals("invalid-arguments", ((JavaOnlyMap) received.get()).getString("status"));
    args.putString("document", "terms-of-use");
    module.open(args, values -> received.set(values[0]));
    assertEquals("failed", ((JavaOnlyMap) received.get()).getString("status"));
  }
}
