# Docker

## Build this custom expo fork

```bash
docker build -t iilab/android:24.1.1 -f docker/android.dockerfile .
docker push iilab/android:24.1.1
```

TODO: Rebuild with new build.gradle and MainApplication.java

```bash
docker build -t iilab/expo:27.0.0 -f docker/expo.dockerfile .
docker push iilab/expo:27.0.0
```

Cache the gradle download and maven dependencies by doing a first run on the project using the dev expo server.

```bash
exp start --offline --no-dev --minify ~/.content/build/@apprentice/mobile
docker build -t iilab/expo-cached:27.0.0 -f docker/expo-cached.dockerfile .
docker push iilab/expo-cached:27.0.0
```

## Manual APK creation instructions with Docker

Here are instructions to create a signed APK with the apprentice CLI and using Docker under the hood.

### Prerequisites

Make sure you have up to date tools:
- `npm i -g docsmith@beta`
- `npm i -g exp`

Update the lesson project with the latest version of the mobile packages:
```bash
cd ~/.content/packages/activist-apprentice-course-template
npm i --save contentascode-mobile@0.2.1
npm i --save metalsmith-contentascode-mobile@0.0.10
```

### Initial Setup

These instructions only need to be followed the first time an APK is generated.

 1. First install Docker [https://docs.docker.com/docker-for-mac/install/][]

 1. Then make sure that you set Docker to minimum 4GB memory (Docker icon >
 Preferences > Advanced).

 1. Create a keystore and key to sign your application.
    - Read the following [about managing your signing keys](https://developer.android.com/studio/publish/app-signing#self-manage) and [securing them](https://developer.android.com/studio/publish/app-signing#secure-key).
    - We use docker to wrap the [recommended instructions to create a keystore from the command line](https://developer.android.com/studio/publish/app-signing#signing-manually), feel free to change `my-keystore` and `my-key-alias`, as well as other options if needed.
```bash
cd ~/workspace # Or another secure place to store your keystore
docker run -it -v $(pwd)/keys:/keys iilab/android:24.1.1 bash -c "keytool -genkey -v -keystore /keys/my-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias"
```

### Build APK

 1. Either:
  - Commit and push the updated project to gitlab in order for the project to
be published to expo (check that the pipelines on gitlab finish successfully):
```bash
git add .
git commit -m "Updated contentascode mobile packages"
git push
```
  - Or publish directly from your local development computer with
```bash
cd ~/.content/build/@apprentice/mobile
exp publish
```

 1. Build the mobile project APK (replacing the project url with yours):
```bash
cd ~/workspace # (change this to where your content as code workspace is located)
apprentice build mobile --project @iilab/safely-securely-producing-media --keystore_path $(pwd)/keys/my-keystore.jks --key_alias my-key-alias mobile # This launches the docker based apk creation
```

You will be prompted to enter your keystore and key alias passwords.

On first run, the `apprentice build mobile` command will download the docker container which can take a while.

After this you should have an apk called `safely-securing-producing-media.apk` inside the `build` folder in your workspace. You can drag and drop this
into RepoMaker.
