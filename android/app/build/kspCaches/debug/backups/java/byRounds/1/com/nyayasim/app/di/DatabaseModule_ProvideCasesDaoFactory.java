package com.nyayasim.app.di;

import com.nyayasim.app.core.data.local.CasesDao;
import com.nyayasim.app.core.data.local.NyayaSimDatabase;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava",
    "cast",
    "deprecation"
})
public final class DatabaseModule_ProvideCasesDaoFactory implements Factory<CasesDao> {
  private final Provider<NyayaSimDatabase> databaseProvider;

  public DatabaseModule_ProvideCasesDaoFactory(Provider<NyayaSimDatabase> databaseProvider) {
    this.databaseProvider = databaseProvider;
  }

  @Override
  public CasesDao get() {
    return provideCasesDao(databaseProvider.get());
  }

  public static DatabaseModule_ProvideCasesDaoFactory create(
      Provider<NyayaSimDatabase> databaseProvider) {
    return new DatabaseModule_ProvideCasesDaoFactory(databaseProvider);
  }

  public static CasesDao provideCasesDao(NyayaSimDatabase database) {
    return Preconditions.checkNotNullFromProvides(DatabaseModule.INSTANCE.provideCasesDao(database));
  }
}
