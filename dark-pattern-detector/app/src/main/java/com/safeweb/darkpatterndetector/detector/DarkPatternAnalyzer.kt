package com.safeweb.darkpatterndetector.detector

import android.content.Context
import android.graphics.Bitmap

/**
 * Orchestrator that selects the best available detection engine.
 * Tries Gemini Nano first (best accuracy), falls back to OCR + regex.
 * All processing is 100% on-device.
 */
class DarkPatternAnalyzer(private val context: Context) {

    /**
     * Analyze a screenshot for dark patterns.
     * The bitmap is never persisted — held in memory only.
     *
     * @param bitmap The screenshot to analyze (in-memory only)
     * @return Analysis results (ephemeral, discarded when user navigates away)
     */
    suspend fun analyze(bitmap: Bitmap): AnalysisResult {
        // Try Gemini Nano first (best accuracy, multimodal)
        return if (GeminiNanoDetector.isAvailable(context)) {
            val result = GeminiNanoDetector(context).analyze(bitmap)
            // If Gemini Nano found patterns, return them
            // If it ran successfully but found nothing, we trust it (better than OCR fallback)
            if (result.patterns.isNotEmpty()) {
                result
            } else if (result.modelUsed.contains("error")) {
                // Gemini Nano errored, fall back entirely
                OcrFallbackDetector(context).analyze(bitmap)
            } else {
                // Gemini Nano ran but found nothing — trust it
                result
            }
        } else {
            // Gemini Nano not available, use OCR fallback
            OcrFallbackDetector(context).analyze(bitmap)
        }
    }
}
