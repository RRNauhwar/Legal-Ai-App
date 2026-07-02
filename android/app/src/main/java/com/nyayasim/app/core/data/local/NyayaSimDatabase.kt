package com.nyayasim.app.core.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [CaseEntity::class],
    version = 1,
    exportSchema = false
)
abstract class NyayaSimDatabase : RoomDatabase() {
    abstract fun casesDao(): CasesDao
}
