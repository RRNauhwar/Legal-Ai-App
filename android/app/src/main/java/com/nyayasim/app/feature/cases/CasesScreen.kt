package com.nyayasim.app.feature.cases

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import com.nyayasim.app.core.designsystem.SectionHeader

@Composable
fun CasesRoute(
    viewModel: CasesViewModel = hiltViewModel()
) {
    val state = viewModel.uiState.collectAsStateWithLifecycle().value
    CasesScreen(state)
}

@Composable
fun CasesScreen(state: CasesUiState) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            SectionHeader(
                eyebrow = "Matter Archive",
                title = "Case Library",
                subtitle = "A denser, more editorial view of criminal, civil, and constitutional files cached locally for reliable access."
            )
        }

        items(state.cases, key = { it.id }) { case ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.surface,
                        shape = androidx.compose.foundation.shape.RoundedCornerShape(26.dp)
                    )
                    .padding(18.dp)
            ) {
                Text(
                    text = "${case.caseType.uppercase()} • ${case.difficulty.uppercase()}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.secondary
                )
                Text(
                    text = case.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 10.dp)
                )
                Text(
                    text = case.summary,
                    modifier = Modifier.padding(top = 10.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.82f)
                )
                Text(
                    text = "${case.caseNumber} • ${case.court}",
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(top = 14.dp)
                )
            }
        }
    }
}
