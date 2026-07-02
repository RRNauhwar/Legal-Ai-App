package com.nyayasim.app.core.data

import com.nyayasim.app.core.data.local.CasesDao
import com.nyayasim.app.core.data.local.offlineSeedCases
import com.nyayasim.app.core.data.remote.NyayaSimApi
import com.nyayasim.app.core.domain.model.CaseSummary
import com.nyayasim.app.core.domain.model.HealthStatus
import com.nyayasim.app.core.domain.repository.NyayaSimRepository
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

@Singleton
class NyayaSimRepositoryImpl @Inject constructor(
    private val api: NyayaSimApi,
    private val casesDao: CasesDao
) : NyayaSimRepository {

    override fun observeCases(): Flow<List<CaseSummary>> {
        return casesDao.observeAll().map { entities -> entities.map { it.toDomain() } }
    }

    override suspend fun refreshCases() {
        runCatching {
            val remoteCases = api.getCases().cases.map { it.toEntity() }
            casesDao.clearAll()
            casesDao.insertAll(remoteCases)
        }.onFailure {
            if (casesDao.count() == 0) {
                casesDao.insertAll(offlineSeedCases)
            }
        }
    }

    override suspend fun getHealthStatus(): HealthStatus {
        return runCatching { api.getHealth().toDomain() }
            .getOrElse { HealthStatus(aiEnabled = false, model = "offline-cache") }
    }
}
