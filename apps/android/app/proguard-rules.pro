# R8 missing-class report (AGP missing_rules.txt): optional classes Lynx references but this app does not ship.
-dontwarn com.google.gson.Gson
-dontwarn com.google.gson.JsonSyntaxException
-dontwarn com.lynx.markdown.IMarkdownEventListener
-dontwarn com.lynx.markdown.IResourceLoader
-dontwarn com.lynx.markdown.Markdown
-dontwarn com.lynx.markdown.MarkdownValuePack
-dontwarn com.lynx.markdown.ServalMarkdownView
# lynx-base / lynx-trace AARs ship no consumer rules; their native code looks these up by name over JNI.
-keepclasseswithmembers class * { @com.lynx.base.CalledByNative <methods>; }
-keepclasseswithmembers class * { @com.lynx.trace.CalledByNative <methods>; }
