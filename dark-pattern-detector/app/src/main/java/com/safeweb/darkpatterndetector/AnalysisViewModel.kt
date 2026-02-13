package com.safeweb.darkpatterndetector

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.safeweb.darkpatterndetector.detector.AnalysisResult
import com.safeweb.darkpatterndetector.detector.DarkPatternAnalyzer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import android.content.Context
import java.io.InputStream

/**
 * ViewModel for the analysis flow.
 * Manages the screenshot bitmap (in-memory only) and analysis state.
 */
class AnalysisViewModel : ViewModel() {

    sealed class UiState {
        data object Idle : UiState()
        data object Analyzing : UiState()
        data class Results(
            val result: AnalysisResult,
            val screenshotBitmap: Bitmap
        ) : UiState()
        data class Error(val message: String) : UiState()
    }

    private val _uiState = MutableStateFlow<UiState>(UiState.Idle)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    // Hold the bitmap in memory only — never persisted
    private var currentBitmap: Bitmap? = null

    /**
     * Load a bitmap from a content URI and start analysis.
     * The bitmap is held in memory only — never written to disk.
     */
    fun analyzeFromUri(context: Context, uri: Uri) {
        viewModelScope.launch {
            _uiState.value = UiState.Analyzing

            try {
                // Load bitmap from URI into memory
                val bitmap = loadBitmap(context, uri)
                if (bitmap == null) {
                    _uiState.value = UiState.Error("Could not load image")
                    return@launch
                }

                currentBitmap = bitmap
                analyzeInternal(context, bitmap)
            } catch (e: Exception) {
                _uiState.value = UiState.Error("Error: ${e.message}")
            }
        }
    }

    /**
     * Analyze an already-loaded bitmap.
     */
    fun analyzeBitmap(context: Context, bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.value = UiState.Analyzing
            currentBitmap = bitmap
            analyzeInternal(context, bitmap)
        }
    }

    private suspend fun analyzeInternal(context: Context, bitmap: Bitmap) {
        try {
            val analyzer = DarkPatternAnalyzer(context)
            val result = analyzer.analyze(bitmap)

            _uiState.value = UiState.Results(
                result = result,
                screenshotBitmap = bitmap
            )
        } catch (e: Exception) {
            _uiState.value = UiState.Error("Analysis failed: ${e.message}")
        }
    }

    /**
     * Reset to idle state and discard the bitmap from memory.
     */
    fun reset() {
        currentBitmap?.recycle()
        currentBitmap = null
        _uiState.value = UiState.Idle
    }

    override fun onCleared() {
        super.onCleared()
        // Ensure bitmap is cleaned up when ViewModel is destroyed
        currentBitmap?.recycle()
        currentBitmap = null
    }

    private suspend fun loadBitmap(context: Context, uri: Uri): Bitmap? {
        return try {
            kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                val inputStream: InputStream? = context.contentResolver.openInputStream(uri)
                inputStream?.use { stream ->
                    BitmapFactory.decodeStream(stream)
                }
            }
        } catch (e: Exception) {
            null
        }
    }
}
