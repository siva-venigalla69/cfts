# Frontend Development and Deployment Guide

This guide provides all the necessary steps to get the React Native frontend for the Design Gallery app up and running, connected to your backend, and deployed to Android.

## 1. Backend and Frontend Integration

For the frontend application to communicate with your backend API, you must configure the base URL to point to your deployed Cloudflare Worker.

### Steps:
1.  **Get your Cloudflare Worker URL**: Make sure your backend API is deployed to Cloudflare and you have the public URL. It will look something like `https://your-app-name.your-username.workers.dev`.
2.  **Configure the frontend API client**:
    *   Open the file `frontend/DesignGalleryApp/src/api/apiClient.ts`.
    *   Locate the `baseURL` property.
    *   Replace the placeholder URL with your actual Cloudflare Worker URL. Make sure to append `/api` at the end if your routes are configured that way.

    ```typescript
    // src/api/apiClient.ts
    const apiClient = axios.create({
      baseURL: 'https://your-app-name.your-username.workers.dev/api', // <-- Replace with your deployed Cloudflare URL!
      // ...
    });
    ```
Since your API is on a public URL, you do not need to worry about using a special IP address for the Android Emulator. The public URL will work directly.

## 2. Running the App on Android

### Prerequisites:
*   [Android Studio](https://developer.android.com/studio) installed.
*   An Android Virtual Device (AVD) configured, or a physical Android device with USB debugging enabled.
*   The Metro bundler, which comes with React Native.

### Steps:
1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend/DesignGalleryApp
    ```
2.  **Start the Metro bundler**:
    ```bash
    npx react-native start
    ```
    Keep this terminal window open. It bundles your JavaScript code.

3.  **Run the app on Android**:
    *   Open a **new** terminal window in the same directory (`frontend/DesignGalleryApp`).
    *   Make sure your Android emulator is running or your physical device is connected.
    *   Run the following command:
        ```bash
        npx react-native run-android
        ```

This command will build the Android app (`.apk`), install it on your emulator or device, and launch it. The app will automatically connect to the Metro bundler to load your JavaScript code.

## 3. Building for Production and Deployment

When you are ready to deploy your app to the Google Play Store or for direct installation, you need to create a production-ready, standalone APK or AAB file.

### 1. Generating a Signing Key
You must sign your app with a private key. If you don't have one, you can generate one using `keytool` (which is part of the Java JDK).

```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```
This will prompt you for passwords and other information. It will generate a file named `my-release-key.keystore`.

**IMPORTANT**: Keep this file private and secure! If you lose it, you will not be able to publish updates to your app.

### 2. Setting up Gradle Variables
1.  Move the `my-release-key.keystore` file into the `frontend/DesignGalleryApp/android/app` directory.
2.  Open the file `~/.gradle/gradle.properties` (or create it if it doesn't exist). Add the following lines (replace with your actual passwords and alias):

    ```properties
    MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
    MYAPP_RELEASE_KEY_ALIAS=my-key-alias
    MYAPP_RELEASE_STORE_PASSWORD=your_store_password
    MYAPP_RELEASE_KEY_PASSWORD=your_key_password
    ```
    This keeps your passwords out of the project's source code.

### 3. Configuring Gradle for Signing
Edit `frontend/DesignGalleryApp/android/app/build.gradle` and add the signing configuration:

```groovy
// ... other config
android {
    // ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            // ...
            signingConfig signingConfigs.release
        }
    }
}
//...
```

### 4. Building the Release App
1.  **Navigate to the android directory**:
    ```bash
    cd frontend/DesignGalleryApp/android
    ```
2.  **Clean the previous build**:
    ```bash
    ./gradlew clean
    ```
3.  **Build the AAB (Android App Bundle - Recommended for Play Store)**:
    ```bash
    ./gradlew bundleRelease
    ```
    The generated AAB will be at `android/app/build/outputs/bundle/release/app-release.aab`.

4.  **Build the APK (for direct installation)**:
    ```bash
    ./gradlew assembleRelease
    ```
    The generated APK will be at `android/app/build/outputs/apk/release/app-release.apk`.

You can now take the `.aab` file and upload it to the Google Play Console, or install the `.apk` file directly on a device. 