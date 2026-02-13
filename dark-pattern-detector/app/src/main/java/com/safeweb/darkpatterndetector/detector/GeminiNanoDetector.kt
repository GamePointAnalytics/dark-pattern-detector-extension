package com.safeweb.darkpatterndetector.detector

import android.content.Context
import android.graphics.Bitmap
import com.google.mlkit.genai.imagedescription.ImageDescriber
import com.google.mlkit.genai.imagedescription.ImageDescriberOptions
import com.google.mlkit.genai.common.FeatureStatus

import com.google.mlkit.genai.imagedescription.ImageDescriptionRequest
import androidx.concurrent.futures.await
import com.google.mlkit.vision.common.InputImage


/**
 * Primary detector using Gemini Nano (on-device via AICore).
 * Processes the screenshot entirely on-device — no network calls.
 */
class GeminiNanoDetector(private val context: Context) {

    private var describer: ImageDescriber? = null

    /**
     * Initialize the ML Kit GenAI image describer.
     */
    private suspend fun getDescriber(): ImageDescriber {
        if (describer != null) return describer!!

        val options = ImageDescriberOptions.Builder(context)
            .build()

        val client = ImageDescriber.getClient(options)
        describer = client
        return client
    }

    /**
     * Analyze a screenshot for dark patterns using Gemini Nano.
     * The bitmap is processed entirely on-device via AICore.
     */
    suspend fun analyze(bitmap: Bitmap): AnalysisResult {
        val startTime = System.currentTimeMillis()

        return try {
            val client = getDescriber()
            val inputImage = InputImage.fromBitmap(bitmap, 0)

            // Get image description from Gemini Nano
            // Note: ImageDescriber uses ListenableFuture, not Task
            val request = ImageDescriptionRequest.builder()
                .setInputImage(inputImage)
                .build()
            
            val result = client.runInference(request).await()
            val description = result.description ?: ""

            // Parse the description for dark pattern indicators
            val patterns = parseDescription(description)
            val elapsed = System.currentTimeMillis() - startTime

            AnalysisResult(
                patterns = patterns,
                modelUsed = "Gemini Nano (on-device)",
                analysisTimeMs = elapsed
            )
        } catch (e: Exception) {
            val elapsed = System.currentTimeMillis() - startTime
            AnalysisResult(
                patterns = emptyList(),
                modelUsed = "Gemini Nano (error: ${e.message})",
                analysisTimeMs = elapsed
            )
        }
    }

    /**
     * Parse the Gemini Nano image description for dark pattern indicators.
     * Looks for keywords and phrases that map to known pattern types.
     */
    private fun parseDescription(description: String): List<DarkPattern> {
        val patterns = mutableListOf<DarkPattern>()
        val lowerDesc = description.lowercase()

        // Map keywords in the description to dark pattern types
        val detectionRules = mapOf(
            PatternType.FAKE_URGENCY to listOf(
                "countdown", "timer", "hurry", "limited time", "ends soon",
                "act now", "expire", "rush", "last chance", "running out"
            ),
            PatternType.FAKE_SCARCITY to listOf(
                "only .* left", "low stock", "sold out", "selling fast",
                "limited quantity", "few remaining", "almost gone"
            ),
            PatternType.FAKE_SOCIAL_PROOF to listOf(
                "people viewing", "people watching", "bought this",
                "in .* carts", "trending", "popular", "bestseller"
            ),
            PatternType.CONFIRMSHAMING to listOf(
                "no thanks", "don't want", "i prefer", "i hate",
                "miss out", "skip", "decline"
            ),
            PatternType.HIDDEN_COSTS to listOf(
                "service fee", "handling fee", "processing fee",
                "convenience fee", "booking fee", "surcharge", "additional charge"
            ),
            PatternType.HIDDEN_SUBSCRIPTION to listOf(
                "free trial", "auto-renew", "automatically renew",
                "recurring", "subscription", "billed monthly", "cancel anytime"
            ),
            PatternType.NAGGING to listOf(
                "complete your profile", "enable notifications",
                "left in your cart", "don't forget", "reminder"
            ),
            PatternType.OBSTRUCTION to listOf(
                "call to cancel", "contact support to cancel",
                "cancellation", "before you go", "lose your benefits"
            ),
            PatternType.PRESELECTION to listOf(
                "pre-checked", "pre-selected", "checked by default",
                "opt-in", "sign me up", "newsletter"
            ),
            PatternType.TRICK_WORDING to listOf(
                "uncheck to", "opt out of not", "double negative",
                "confusing", "misleading language"
            )
        )

        for ((type, keywords) in detectionRules) {
            for (keyword in keywords) {
                val regex = Regex(keyword, RegexOption.IGNORE_CASE)
                if (regex.containsMatchIn(lowerDesc)) {
                    patterns.add(
                        DarkPattern(
                            type = type,
                            description = "Detected ${type.displayName} pattern in screenshot",
                            confidence = 0.75f,
                            matchedText = keyword
                        )
                    )
                    break // One match per type is enough
                }
            }
        }

        return patterns
    }

    companion object {
        /**
         * Check if Gemini Nano is available on this device.
         */
        suspend fun isAvailable(context: Context): Boolean {
            return try {
                val options = ImageDescriberOptions.Builder(context).build()
                val client = ImageDescriber.getClient(options)

                val statusInt = client.checkFeatureStatus().await()
                return statusInt == FeatureStatus.DOWNLOADABLE || statusInt == FeatureStatus.DOWNLOADED
            } catch (e: Exception) {
                false
            }
        }
    }
}
