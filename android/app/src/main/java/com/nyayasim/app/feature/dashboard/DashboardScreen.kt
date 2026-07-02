package com.nyayasim.app.feature.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nyayasim.app.core.designsystem.ChamberHeroCard
import com.nyayasim.app.core.designsystem.SectionHeader
import com.nyayasim.app.core.designsystem.SpotlightAccents
import com.nyayasim.app.core.designsystem.SpotlightCard
import com.nyayasim.app.core.designsystem.StatPill

private fun String.asTitle(): String =
    replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

@Composable
fun DashboardRoute(
    viewModel: DashboardViewModel = hiltViewModel()
) {
    val state = viewModel.uiState.collectAsStateWithLifecycle().value
    DashboardScreen(state = state)
}

@Composable
fun DashboardScreen(state: DashboardUiState) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp),
        verticalArrangement = Arrangement.spacedBy(18.dp)
    ) {
        item {
            SectionHeader(
                eyebrow = "Advocacy Studio",
                title = "NyayaSim Chambers",
                subtitle = "Train like counsel with guided hearings, stronger legal aesthetics, and a native workflow built around Indian courtroom practice.",
                modifier = Modifier.padding(top = 20.dp)
            )
        }

        item {
            ChamberHeroCard(
                title = if (state.aiStatus?.aiEnabled == true) "Bench intelligence is live." else "Offline chamber still ready.",
                subtitle = state.aiStatus?.model?.let { "Powered by $it with local fallback for case practice and study." }
                    ?: "The app will keep serving cached matters and training flows while services reconnect.",
                chips = listOf("Live bench", "Case prep", "Study flow")
            )
        }

        item {
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    StatPill(
                        label = "Readiness",
                        value = if (state.aiStatus?.aiEnabled == true) "91%" else "72%",
                        accent = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    StatPill(
                        label = "Matters",
                        value = state.featuredCases.size.toString().padStart(2, '0'),
                        accent = MaterialTheme.colorScheme.tertiary,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    StatPill(
                        label = "Mode",
                        value = if (state.aiStatus?.aiEnabled == true) "AI" else "OFF",
                        accent = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }

        item {
            Text(
                text = "Featured matters",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
        }

        items(state.featuredCases, key = { it.id }) { case ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.surface,
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(28.dp)
                    )
                    .padding(20.dp)
            ) {
                Text(
                    text = case.caseType.asTitle(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.secondary
                )
                Text(
                    text = case.title,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(top = 10.dp)
                )
                Text(
                    text = "${case.caseNumber} • ${case.court}",
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Text(
                    text = case.summary,
                    style = MaterialTheme.typography.bodyLarge,
                    modifier = Modifier.padding(top = 10.dp)
                )
                Text(
                    text = "${case.caseType.asTitle()} • ${case.difficulty.asTitle()}",
                    modifier = Modifier.padding(top = 10.dp),
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        item {
            Text(
                text = "Today’s focus",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf(
                    "Issue spotting before citations so arguments sound deliberate, not rushed.",
                    "Evidence-first courtroom prep with witness strategy and objection timing.",
                    "Drafting sessions that feel like chambers work rather than a form filler."
                ).forEachIndexed { index, text ->
                    SpotlightCard(
                        title = "Focus ${index + 1}",
                        subtitle = text,
                        accent = SpotlightAccents[index]
                    )
                }
            }
        }
    }
}
