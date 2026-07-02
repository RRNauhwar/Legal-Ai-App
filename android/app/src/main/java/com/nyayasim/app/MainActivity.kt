package com.nyayasim.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nyayasim.app.core.designsystem.theme.NyayaSimTheme
import com.nyayasim.app.feature.settings.SettingsViewModel
import com.nyayasim.app.navigation.NyayaSimApp
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            val settingsViewModel: SettingsViewModel = hiltViewModel()
            val settings by settingsViewModel.uiState.collectAsStateWithLifecycle()

            NyayaSimTheme(
                darkTheme = settings.useDarkTheme,
                dynamicColor = settings.useDynamicColor
            ) {
                NyayaSimApp()
            }
        }
    }
}
