package com.nyayasim.app.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.FolderOpen
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.nyayasim.app.feature.cases.CasesRoute
import com.nyayasim.app.feature.dashboard.DashboardRoute
import com.nyayasim.app.feature.settings.SettingsRoute
import com.nyayasim.app.feature.study.StudyRoute

private data class TopLevelDestination(
    val route: String,
    val label: String,
    val icon: @Composable () -> Unit
)

@Composable
fun NyayaSimApp() {
    val navController = rememberNavController()
    val backStackEntry = navController.currentBackStackEntryAsState().value
    val currentRoute = backStackEntry?.destination?.route

    val destinations = listOf(
        TopLevelDestination("dashboard", "Chambers") { Icon(Icons.Outlined.Dashboard, contentDescription = null) },
        TopLevelDestination("cases", "Cases") { Icon(Icons.Outlined.FolderOpen, contentDescription = null) },
        TopLevelDestination("study", "Study") { Icon(Icons.Outlined.MenuBook, contentDescription = null) },
        TopLevelDestination("settings", "Settings") { Icon(Icons.Outlined.Settings, contentDescription = null) }
    )

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = androidx.compose.material3.MaterialTheme.colorScheme.surface,
                tonalElevation = 0.dp
            ) {
                destinations.forEach { destination ->
                    NavigationBarItem(
                        selected = currentRoute == destination.route,
                        onClick = {
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = destination.icon,
                        label = { Text(destination.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = androidx.compose.material3.MaterialTheme.colorScheme.onPrimary,
                            selectedTextColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurface,
                            indicatorColor = androidx.compose.material3.MaterialTheme.colorScheme.primary.copy(alpha = 0.8f),
                            unselectedIconColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                            unselectedTextColor = androidx.compose.material3.MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f)
                        )
                    )
                }
            }
        }
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = "dashboard",
            modifier = Modifier.padding(padding)
        ) {
            composable("dashboard") { DashboardRoute() }
            composable("cases") { CasesRoute() }
            composable("study") { StudyRoute() }
            composable("settings") { SettingsRoute() }
        }
    }
}
