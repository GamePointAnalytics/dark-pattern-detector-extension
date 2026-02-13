package com.safeweb.darkpatterndetector

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Parcelable
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safeweb.darkpatterndetector.ui.screens.AnalyzingScreen
import com.safeweb.darkpatterndetector.ui.screens.ResultsScreen
import com.safeweb.darkpatterndetector.ui.theme.DarkPatternDetectorTheme

/**
 * Activity that receives shared screenshots from other apps.
 *
 * When a user takes a screenshot and taps Share → Dark Pattern Detector,
 * this activity receives the image, analyzes it on-device, and shows results.
 *
 * The image is held in memory only — never written to disk.
 * When the user taps "Done", the bitmap is discarded and the activity finishes.
 */
class ShareReceiverActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Extract the shared image URI
        val imageUri = extractImageUri(intent)
        if (imageUri == null) {
            Toast.makeText(this, "Could not load shared image", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setContent {
            DarkPatternDetectorTheme {
                val viewModel: AnalysisViewModel = viewModel()
                val uiState by viewModel.uiState.collectAsState()

                // Start analysis immediately when the activity opens
                // Use LaunchedEffect to ensure this only runs once per imageUri
                androidx.compose.runtime.LaunchedEffect(imageUri) {
                    if (uiState is AnalysisViewModel.UiState.Idle) {
                        viewModel.analyzeFromUri(this@ShareReceiverActivity, imageUri)
                    }
                }

                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    when (val state = uiState) {
                        is AnalysisViewModel.UiState.Idle,
                        is AnalysisViewModel.UiState.Analyzing -> {
                            AnalyzingScreen(modifier = Modifier.padding(innerPadding))
                        }

                        is AnalysisViewModel.UiState.Results -> {
                            ResultsScreen(
                                result = state.result,
                                screenshotBitmap = state.screenshotBitmap,
                                onDismiss = {
                                    viewModel.reset()
                                    finish() // Close the activity, return to previous app
                                },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }

                        is AnalysisViewModel.UiState.Error -> {
                            Toast.makeText(
                                this@ShareReceiverActivity,
                                state.message,
                                Toast.LENGTH_LONG
                            ).show()
                            finish()
                        }
                    }
                }
            }
        }
    }

    /**
     * Extract the image URI from the share intent.
     */
    private fun extractImageUri(intent: Intent?): Uri? {
        if (intent?.action != Intent.ACTION_SEND) return null
        if (intent.type?.startsWith("image/") != true) return null

        return if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri
        }
    }
}
