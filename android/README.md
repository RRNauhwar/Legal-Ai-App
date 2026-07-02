# NyayaSim Android

Native Android client for NyayaSim built with a current Android stack:

- Kotlin + Jetpack Compose
- Material 3
- Hilt dependency injection
- Room local caching
- Retrofit networking
- Coroutines + Flow
- Navigation Compose
- DataStore preferences

## Structure

```text
android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/nyayasim/app/
│       └── res/
├── gradle/
│   └── libs.versions.toml
├── build.gradle.kts
└── settings.gradle.kts
```

## Open In Android Studio

1. Open the `android/` folder in Android Studio.
2. Let Studio install the Android SDK pieces it asks for.
3. Sync the Gradle project.
4. Run on an emulator or device.

The default backend URL targets the Android emulator host bridge:

- `http://10.0.2.2:3001/`

If you run against a physical device, update `BASE_URL` in `AppModule.kt`.
