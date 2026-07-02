package com.nyayasim.app.feature.study

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
import com.nyayasim.app.core.domain.model.StudyModule
import com.nyayasim.app.core.designsystem.SectionHeader

private val modules = listOf(
    StudyModule("IPC Sprint", "Criminal law issue-spotting and recall", 12),
    StudyModule("Constitution Lab", "Rights analysis with proportionality drills", 8),
    StudyModule("Evidence Workshop", "Objections, admissibility, and witness strategy", 10),
    StudyModule("Drafting Desk", "Petitions, FIRs, and applications", 9)
)

@Composable
fun StudyRoute() {
    StudyScreen()
}

@Composable
fun StudyScreen() {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            SectionHeader(
                eyebrow = "Doctrine Lab",
                title = "Learning Assistant",
                subtitle = "Study tracks shaped around recall, argument rhythm, and procedural confidence instead of flat topic lists."
            )
        }

        items(modules) { module ->
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
                    text = module.title,
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = module.subtitle,
                    modifier = Modifier.padding(top = 8.dp),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                )
                Text(
                    text = "${module.topicCount} guided topics",
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.padding(top = 14.dp)
                )
            }
        }
    }
}
