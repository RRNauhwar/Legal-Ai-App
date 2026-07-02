package com.nyayasim.app.feature.cases;

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
public final class CasesViewModel_Factory implements Factory<CasesViewModel> {
  private final Provider<NyayaSimRepository> repositoryProvider;

  public CasesViewModel_Factory(Provider<NyayaSimRepository> repositoryProvider) {
    this.repositoryProvider = repositoryProvider;
  }

  @Override
  public CasesViewModel get() {
    return newInstance(repositoryProvider.get());
  }

  public static CasesViewModel_Factory create(Provider<NyayaSimRepository> repositoryProvider) {
    return new CasesViewModel_Factory(repositoryProvider);
  }

  public static CasesViewModel newInstance(NyayaSimRepository repository) {
    return new CasesViewModel(repository);
  }
}
