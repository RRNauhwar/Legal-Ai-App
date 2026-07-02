package com.nyayasim.app.core.domain.repository

import com.nyayasim.app.core.domain.model.CaseSummary
import com.nyayasim.app.core.domain.model.HealthStatus
import kotlinx.coroutines.flow.Flow

interface NyayaSimRepository {
    fun observeCases(): Flow<List<CaseSummary>>
    suspend fun refreshCases()
    suspend fun getHealthStatus(): HealthStatus
}
