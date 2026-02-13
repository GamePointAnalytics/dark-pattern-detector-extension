package com.safeweb.darkpatterndetector.detector

import android.graphics.Rect

/**
 * Represents a single detected dark pattern in a screenshot.
 * All data is ephemeral — held in memory only, never persisted.
 */
data class DarkPattern(
    val type: PatternType,
    val description: String,
    val confidence: Float,
    val matchedText: String = "",
    val region: Rect? = null
)

/**
 * Categories of dark patterns based on deceptive.design taxonomy.
 */
enum class PatternType(val displayName: String, val emoji: String) {
    FAKE_URGENCY("Fake Urgency", "\u23F0"),
    FAKE_SCARCITY("Fake Scarcity", "\uD83D\uDCE6"),
    FAKE_SOCIAL_PROOF("Fake Social Proof", "\uD83D\uDC65"),
    CONFIRMSHAMING("Confirmshaming", "\uD83D\uDE14"),
    HIDDEN_COSTS("Hidden Costs", "\uD83D\uDCB0"),
    HIDDEN_SUBSCRIPTION("Hidden Subscription", "\uD83D\uDD04"),
    NAGGING("Nagging", "\uD83D\uDD14"),
    OBSTRUCTION("Hard to Cancel", "\uD83D\uDEAB"),
    PRESELECTION("Preselection", "\u2611\uFE0F"),
    TRICK_WORDING("Trick Wording", "\uD83D\uDD24"),
    FORCED_ACTION("Forced Action", "\uD83D\uDD12"),
    SNEAKING("Sneaking", "\uD83D\uDC0D"),
    UNKNOWN("Unknown Pattern", "\u26A0\uFE0F");

    companion object {
        /**
         * Fuzzy match a string to a PatternType.
         */
        fun fromString(value: String): PatternType {
            val normalized = value.lowercase().replace(" ", "_").replace("-", "_")
            return entries.firstOrNull { it.name.lowercase() == normalized }
                ?: entries.firstOrNull { normalized.contains(it.name.lowercase().replace("_", "")) }
                ?: UNKNOWN
        }
    }
}

/**
 * Result of analyzing a screenshot.
 */
data class AnalysisResult(
    val patterns: List<DarkPattern>,
    val modelUsed: String,
    val analysisTimeMs: Long
) {
    val patternCount: Int get() = patterns.size
    val isClean: Boolean get() = patterns.isEmpty()
}
