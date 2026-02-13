package com.safeweb.darkpatterndetector.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView

import androidx.core.view.WindowCompat

// Color palette
val SafeGreen = Color(0xFF4CAF50)
val SafeGreenDark = Color(0xFF2E7D32)
val WarningAmber = Color(0xFFFFA726)
val DangerRed = Color(0xFFEF5350)
val SurfaceDark = Color(0xFF121212)
val SurfaceVariantDark = Color(0xFF1E1E2E)
val OnSurfaceDark = Color(0xFFE0E0E0)
val CardDark = Color(0xFF252538)
val AccentBlue = Color(0xFF42A5F5)

private val DarkColorScheme = darkColorScheme(
    primary = SafeGreen,
    secondary = AccentBlue,
    tertiary = WarningAmber,
    error = DangerRed,
    background = SurfaceDark,
    surface = SurfaceVariantDark,
    surfaceVariant = CardDark,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = OnSurfaceDark,
    onSurface = OnSurfaceDark,
    onSurfaceVariant = Color(0xFFB0B0B0),
)

private val LightColorScheme = lightColorScheme(
    primary = SafeGreenDark,
    secondary = Color(0xFF1976D2),
    tertiary = Color(0xFFF57C00),
    error = Color(0xFFD32F2F),
    background = Color(0xFFF5F5F5),
    surface = Color.White,
    surfaceVariant = Color(0xFFF0F0F0),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onBackground = Color(0xFF1C1C1C),
    onSurface = Color(0xFF1C1C1C),
    onSurfaceVariant = Color(0xFF666666),
)

@Composable
fun DarkPatternDetectorTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
