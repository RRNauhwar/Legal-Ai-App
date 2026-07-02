package com.nyayasim.app.feature.cases

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nyayasim.app.core.domain.model.CaseSummary
import com.nyayasim.app.core.domain.repository.NyayaSimRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CasesUiState(
    val cases: List<CaseSummary> = emptyList()
)

@HiltViewModel
class CasesViewModel @Inject constructor(
    private val repository: NyayaSimRepository
) : ViewModel() {
    val uiState: StateFlow<CasesUiState> = repository.observeCases()
        .map { CasesUiState(cases = it) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = CasesUiState()
        )

    init {
        viewModelScope.launch {
            repository.refreshCases()
        }
    }
}
