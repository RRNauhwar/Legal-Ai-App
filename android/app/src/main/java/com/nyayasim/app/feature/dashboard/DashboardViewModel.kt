package com.nyayasim.app.feature.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nyayasim.app.core.domain.model.CaseSummary
import com.nyayasim.app.core.domain.model.HealthStatus
import com.nyayasim.app.core.domain.repository.NyayaSimRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class DashboardUiState(
    val aiStatus: HealthStatus? = null,
    val featuredCases: List<CaseSummary> = emptyList(),
    val isRefreshing: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    repository: NyayaSimRepository
) : ViewModel() {

    private val refreshing = MutableStateFlow(false)
    private val healthState = MutableStateFlow<HealthStatus?>(null)
    private val errorState = MutableStateFlow<String?>(null)

    val uiState: StateFlow<DashboardUiState> = combine(
        repository.observeCases(),
        refreshing,
        healthState,
        errorState
    ) { cases, isRefreshing, health, error ->
        DashboardUiState(
            aiStatus = health,
            featuredCases = cases.take(3),
            isRefreshing = isRefreshing,
            errorMessage = error
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = DashboardUiState(isRefreshing = true)
    )

    init {
        viewModelScope.launch {
            refreshing.value = true
            try {
                repository.refreshCases()
                healthState.value = repository.getHealthStatus()
                errorState.value = null
            } catch (error: Exception) {
                errorState.value = "Showing cached training data while the backend is unavailable."
            } finally {
                refreshing.value = false
            }
        }
    }
}
