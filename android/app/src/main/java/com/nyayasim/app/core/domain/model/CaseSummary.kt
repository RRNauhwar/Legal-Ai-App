package com.nyayasim.app.core.domain.model

data class CaseSummary(
    val id: String,
    val title: String,
    val summary: String,
    val caseNumber: String,
    val caseType: String,
    val difficulty: String,
    val court: String
)
