# ProGuard rules for Dark Pattern Detector
-keepattributes Signature
-keepattributes *Annotation*

# ML Kit
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**

# Coil
-dontwarn io.coil.**
