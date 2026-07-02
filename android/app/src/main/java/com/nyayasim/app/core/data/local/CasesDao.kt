package com.nyayasim.app.core.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CasesDao {
    @Query("SELECT * FROM cases ORDER BY title")
    fun observeAll(): Flow<List<CaseEntity>>

    @Query("SELECT COUNT(*) FROM cases")
    suspend fun count(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(cases: List<CaseEntity>)

    @Query("DELETE FROM cases")
    suspend fun clearAll()
}
