package com.nyayasim.app.core.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.nyayasim.app.core.domain.model.CaseSummary

@Entity(tableName = "cases")
data class CaseEntity(
    @PrimaryKey val id: String,
    val title: String,
    val summary: String,
    val caseNumber: String,
    val caseType: String,
    val difficulty: String,
    val court: String
) {
    fun toDomain(): CaseSummary = CaseSummary(
        id = id,
        title = title,
        summary = summary,
        caseNumber = caseNumber,
        caseType = caseType,
        difficulty = difficulty,
        court = court
    )
}
