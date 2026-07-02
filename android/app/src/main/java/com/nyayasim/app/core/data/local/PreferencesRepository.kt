package com.nyayasim.app.core.data.local

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "settings")

data class UserSettings(
    val useDarkTheme: Boolean = true,
    val useDynamicColor: Boolean = true
)

@Singleton
class PreferencesRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val DarkTheme = booleanPreferencesKey("dark_theme")
        val DynamicColor = booleanPreferencesKey("dynamic_color")
    }

    val settings: Flow<UserSettings> = context.settingsDataStore.data.map { prefs ->
        UserSettings(
            useDarkTheme = prefs[Keys.DarkTheme] ?: true,
            useDynamicColor = prefs[Keys.DynamicColor] ?: true
        )
    }

    suspend fun setDarkTheme(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.DarkTheme] = enabled }
    }

    suspend fun setDynamicColor(enabled: Boolean) {
        context.settingsDataStore.edit { it[Keys.DynamicColor] = enabled }
    }
}
