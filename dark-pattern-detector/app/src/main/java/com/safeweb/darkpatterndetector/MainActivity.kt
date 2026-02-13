package com.safeweb.darkpatterndetector

import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.safeweb.darkpatterndetector.ui.screens.AnalyzingScreen
import com.safeweb.darkpatterndetector.ui.screens.HomeScreen
import com.safeweb.darkpatterndetector.ui.screens.ResultsScreen
import com.safeweb.darkpatterndetector.ui.theme.DarkPatternDetectorTheme

/**
 * Main entry point for the app.
 * Shows the home screen with instructions and gallery import.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            DarkPatternDetectorTheme {
                val viewModel: AnalysisViewModel = viewModel()
                val uiState by viewModel.uiState.collectAsState()

                // Gallery image picker
                val galleryLauncher = rememberLauncherForActivityResult(
                    contract = ActivityResultContracts.GetContent()
                ) { uri: Uri? ->
                    uri?.let { viewModel.analyzeFromUri(this@MainActivity, it) }
                }

                Scaffold(modifier = Modifier.fillMaxSize()) { innerPadding ->
                    when (val state = uiState) {
                        is AnalysisViewModel.UiState.Idle -> {
                            HomeScreen(
                                onImportFromGallery = { galleryLauncher.launch("image/*") },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }

                        is AnalysisViewModel.UiState.Analyzing -> {
                            AnalyzingScreen(modifier = Modifier.padding(innerPadding))
                        }

                        is AnalysisViewModel.UiState.Results -> {
                            ResultsScreen(
                                result = state.result,
                                screenshotBitmap = state.screenshotBitmap,
                                onDismiss = { viewModel.reset() },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }

                        is AnalysisViewModel.UiState.Error -> {
                            HomeScreen(
                                onImportFromGallery = { galleryLauncher.launch("image/*") },
                                modifier = Modifier.padding(innerPadding)
                            )
                        }
                    }
                }
            }
        }
    }
}
