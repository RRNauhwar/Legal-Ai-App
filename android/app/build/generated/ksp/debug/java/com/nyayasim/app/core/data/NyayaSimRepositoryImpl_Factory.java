package com.nyayasim.app.core.data;

import com.nyayasim.app.core.data.local.CasesDao;
import com.nyayasim.app.core.data.remote.NyayaSimApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
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
public final class NyayaSimRepositoryImpl_Factory implements Factory<NyayaSimRepositoryImpl> {
  private final Provider<NyayaSimApi> apiProvider;

  private final Provider<CasesDao> casesDaoProvider;

  public NyayaSimRepositoryImpl_Factory(Provider<NyayaSimApi> apiProvider,
      Provider<CasesDao> casesDaoProvider) {
    this.apiProvider = apiProvider;
    this.casesDaoProvider = casesDaoProvider;
  }

  @Override
  public NyayaSimRepositoryImpl get() {
    return newInstance(apiProvider.get(), casesDaoProvider.get());
  }

  public static NyayaSimRepositoryImpl_Factory create(Provider<NyayaSimApi> apiProvider,
      Provider<CasesDao> casesDaoProvider) {
    return new NyayaSimRepositoryImpl_Factory(apiProvider, casesDaoProvider);
  }

  public static NyayaSimRepositoryImpl newInstance(NyayaSimApi api, CasesDao casesDao) {
    return new NyayaSimRepositoryImpl(api, casesDao);
  }
}
