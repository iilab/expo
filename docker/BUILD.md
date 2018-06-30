# Expo Build Architecture

The `expo` repo builds the expo client by default.

I see 2 main approaches to building from the local js project:

  - ~~Replace the Kernel code by the Js code.~~ Probably not viable, as it will require to basically rerun the `runShellAppModificationsAsync` procedure. ~~It's still worth looking into more because of the possibility to serve the project with auto-reload while modifying the expo code.~~ This already works via the `./android/app/expo.gradle` include which is uncommented in `./android/app/build.gradle` when building a detached/shell app. It runs:

    - `exp prepare-detached-build`
    - this runs `prepareDetachedBuildAsync` in `xdl/src/detach/Detach.js`
    - which sets `DEVELOPMENT_URL = "${devUrl}";` in `generated/DetachBuildConstants.java`

  - The `gulp android-shell-app` script requires the published manifest and bundle but this can be changed and made optional. Note that this would potentially remove a feature, since the notion of published release and releaseChannel would be ignored in favor of the locally available code and for instance manual switch via git tags. We could:

    - ~~Pass a `--local $PATH` argument. Either:~~
    - ~~Run the local dev server and download the manifest and bundle from there. This could make optimal reuse of the `prepare-detached-build` script and of the existing manifest and bundle downloading functionality in `createAndroidShellAppAsync`.~~
    - ~~Generate the manifest and bundle statically, and modify the `createAndroidShellAppAsync` to use these files.~~
    - Launch the `exp` server `--offline` and pass this url to the `gulp android-shell-app` script.

It's unclear which approach will work best. I'm trying to:
  - Modify the `tools-public/gulpfile.js` in order to add the code (as it's not exported from `xdl` and not sufficiently modular as of know) that will:
    - Prepare the build by modifying the `app.json` to include the `bundledAssets` key. By:
      - Runing the forked `bundle-assets` command.
    - Run the build with `gulp android-shell-app`

## Terminology

  - Detached: has `ios`/`android` folders.
  - ShellApp:
  - Kernel: expo development client

## Generate Dynamic Macros

This seems to be only useful when building the expo client. It generates
constants for: `android/expoview/src/main/java/host/exp/exponent/generated/ExponentBuildConstants.java`

## Create Shell App

`createAndroidShellAppAsync` is the main script and has as args:

```js
{
  url,
  sdkVersion,
  releaseChannel,
  privateConfigFile,
  configuration,
  keystore,
  alias,
  keystorePassword,
  keyPassword,
  outputFile,
}
```

It runs:

  - `getManifestAsync` downloads the manifest.

  - Can override build configuration with a privateConfigFile...

  - creates a configuration context (reader monad)

  - `copyInitialShellAppFilesAsync`

    - Copies the `/android` folder to the `/android-shell-app` folder.

  - `runShellAppModificationsAsync`: Customizes the shell app with context

    - Embeds the manifest
    - Download `shell-app.bundle` from the `bundleUrl`

  - `buildShellAppAsync`

## Update Android Shell App

Will I need `updateAndroidShellAppAsync` ? Probably later, for now keeping this
immutable and rebuild each time is preferable.

This fetches the manifest and downloads the `shell-app.bundle` from the `bundleUrl`.

## Bundling Assets for Offline start

There is a dependency on Expo's infrastructure to bundle assets... :/

When serving the manifest and code locally, there is a missing `bundledAssets` key on the manifest. The `exp publish` command is what pushes the assets to Expo's Cloudfront account. Then, a gradle script runs `exp bundle-assets --dest PATH` which fetches the bundledAssets from the CDN and copies them to the android or iOS code base:

  - destination for android should be `$buildDir/intermediates/assets/$targetPath` (set in line 44 of `android/app/expo.gradle`)

  - the code is in `xdl` in `bundleAssetsAsync()` of `src/detach/Detach.js`

  - It reuses the key `exp.android.publishManifestPath` (which is used to publish the manifest while `publishBundlePath` is used to publish the JS bundle).
    - `exp.android.publishManifestPath` is set in `src/detach/AndroidShellApp.js` line 1209 in `addDetachedConfigToExp()` itself called in `detachAsync()` in `src/detach/Detach.js`

  - `bundleAssertsAsync()` then uses the bundled manifest to grab the `bundledAssets` array and calls `src/detach/AssetBundle.js` which downloads the assets to the destination.

  - ~~Then in the Android code, the HTTP calls are intercepted and pointed to the local assets in `android/expoview/src/main/java/host/exp/exponent/network/ExponentNetwork.java`~~ That's legacy code for sdk 24 which has been changed. The `android/expoview/src/main/java/abi25_0_0/host/exp/exponent/modules/api/FileSystemModule.java` 

  - Now the manifest served by `exp start` is pointing to `localhost:19001` so we could either:
    - Add a small modifying proxy that does JSON transformations
    - Find what `xdl` utility expo.io is using to serve their manifests once they are published
    - Hack `xdl` `createAndroidShellAppAsync` to not depend on `url` parameter, or do a transformation pass.

Approaches:

  - Modify `exp start` so that it bundles and serves assets.
  - Using `xdl` as a library, make a small JS script which reuses the publish and bundling code.

\_fetchAndUploadAssetsAsync
