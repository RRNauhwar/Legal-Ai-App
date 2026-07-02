package com.nyayasim.app.core.data.remote

import com.nyayasim.app.core.data.local.CaseEntity
import com.nyayasim.app.core.domain.model.HealthStatus

data class CasesResponse(
    val success: Boolean,
    val cases: List<CaseDto>
)

data class CaseDto(
    val id: String,
    val title: String,
    val summary: String,
    val caseNumber: String,
    val caseType: String,
    val difficulty: String,
    val court: String
) {
    fun toEntity(): CaseEntity = CaseEntity(
        id = id,
        title = title,
        summary = summary,
        caseNumber = caseNumber,
        caseType = caseType,
        difficulty = difficulty,
        court = court
    )
}

data class HealthResponse(
    val ok: Boolean,
    val model: String,
    val aiEnabled: Boolean
) {
    fun toDomain(): HealthStatus = HealthStatus(
        aiEnabled = aiEnabled,
        model = model
    )
}
