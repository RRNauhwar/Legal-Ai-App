package com.nyayasim.app.feature.dashboard;

import com.nyayasim.app.core.domain.repository.NyayaSimRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
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
public final class DashboardViewModel_Factory implements Factory<DashboardViewModel> {
  private final Provider<NyayaSimRepository> repositoryProvider;

  public DashboardViewModel_Factory(Provider<NyayaSimRepository> repositoryProvider) {
    this.repositoryProvider = repositoryProvider;
  }

  @Override
  public DashboardViewModel get() {
    return newInstance(repositoryProvider.get());
  }

  public static DashboardViewModel_Factory create(Provider<NyayaSimRepository> repositoryProvider) {
    return new DashboardViewModel_Factory(repositoryProvider);
  }

  public static DashboardViewModel newInstance(NyayaSimRepository repository) {
    return new DashboardViewModel(repository);
  }
}
