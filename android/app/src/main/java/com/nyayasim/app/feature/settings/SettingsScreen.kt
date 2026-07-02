package com.nyayasim.app.feature.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nyayasim.app.core.designsystem.SectionHeader

@Composable
fun SettingsRoute(
    viewModel: SettingsViewModel = hiltViewModel()
) {
    val state = viewModel.uiState.collectAsStateWithLifecycle().value
    SettingsScreen(
        state = state,
        onDarkThemeChange = viewModel::setDarkTheme,
        onDynamicColorChange = viewModel::setDynamicColor
    )
}

@Composable
fun SettingsScreen(
    state: com.nyayasim.app.core.data.local.UserSettings,
    onDarkThemeChange: (Boolean) -> Unit,
    onDynamicColorChange: (Boolean) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        SectionHeader(
            eyebrow = "Atmosphere",
            title = "Settings",
            subtitle = "Tune the app’s chamber mood and visual behavior so the product feels deliberate on your device."
        )

        SettingToggle(
            title = "Dark chamber theme",
            subtitle = "Keeps the app in a rich dark look inspired by courtroom interiors.",
            checked = state.useDarkTheme,
            onCheckedChange = onDarkThemeChange
        )
        HorizontalDivider()
        SettingToggle(
            title = "Dynamic color",
            subtitle = "Use Android 12+ wallpaper-adaptive accents when available.",
            checked = state.useDynamicColor,
            onCheckedChange = onDynamicColorChange
        )

        Text(
            text = "Backend target: http://10.0.2.2:3001/",
            color = MaterialTheme.colorScheme.secondary
        )
    }
}

@Composable
private fun SettingToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(text = title, style = MaterialTheme.typography.titleLarge)
            Text(text = subtitle, modifier = Modifier.padding(top = 4.dp))
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange
        )
    }
}
