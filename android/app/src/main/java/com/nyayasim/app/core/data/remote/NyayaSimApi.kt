package com.nyayasim.app.core.data.remote

import retrofit2.http.GET

interface NyayaSimApi {
    @GET("api/cases")
    suspend fun getCases(): CasesResponse

    @GET("api/health")
    suspend fun getHealth(): HealthResponse
}
