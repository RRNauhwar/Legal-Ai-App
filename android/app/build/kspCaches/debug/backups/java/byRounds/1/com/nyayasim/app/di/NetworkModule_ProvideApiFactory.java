package com.nyayasim.app.di;

import com.nyayasim.app.core.data.remote.NyayaSimApi;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;
import retrofit2.Retrofit;

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
public final class NetworkModule_ProvideApiFactory implements Factory<NyayaSimApi> {
  private final Provider<Retrofit> retrofitProvider;

  public NetworkModule_ProvideApiFactory(Provider<Retrofit> retrofitProvider) {
    this.retrofitProvider = retrofitProvider;
  }

  @Override
  public NyayaSimApi get() {
    return provideApi(retrofitProvider.get());
  }

  public static NetworkModule_ProvideApiFactory create(Provider<Retrofit> retrofitProvider) {
    return new NetworkModule_ProvideApiFactory(retrofitProvider);
  }

  public static NyayaSimApi provideApi(Retrofit retrofit) {
    return Preconditions.checkNotNullFromProvides(NetworkModule.INSTANCE.provideApi(retrofit));
  }
}
