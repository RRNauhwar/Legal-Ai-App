package com.nyayasim.app.di

import android.content.Context
import androidx.room.Room
import com.nyayasim.app.core.data.NyayaSimRepositoryImpl
import com.nyayasim.app.core.data.local.CasesDao
import com.nyayasim.app.core.data.local.NyayaSimDatabase
import com.nyayasim.app.core.data.remote.NyayaSimApi
import com.nyayasim.app.core.domain.repository.NyayaSimRepository
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

private const val BASE_URL = "http://10.0.2.2:3001/"

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        return OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(client)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideApi(retrofit: Retrofit): NyayaSimApi = retrofit.create(NyayaSimApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): NyayaSimDatabase {
        return Room.databaseBuilder(
            context,
            NyayaSimDatabase::class.java,
            "nyayasim.db"
        ).build()
    }

    @Provides
    fun provideCasesDao(database: NyayaSimDatabase): CasesDao = database.casesDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindRepository(
        repository: NyayaSimRepositoryImpl
    ): NyayaSimRepository
}
