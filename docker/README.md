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

Cache the gradle download and maven dependencies by doing a first run on the project.

```bash
exp start --offline --no-dev --minify ~/.content/build/@apprentice/mobile
ln -s ~/.content/build/@apprentice/mobile js
docker build --build-arg URL=http://192.168.179.104:19000 --build-arg SDK_VERSION=27.0.0 -t iilab/expo-cached:27.0.0 -f docker/expo-cached.dockerfile .
docker push iilab/expo-cached:27.0.0
```

## Manual APK creation instructions with Docker

Here are instructions to create an unsigned APK with the tooling I have
packaged inside a docker image.

 1. First install Docker [https://docs.docker.com/docker-for-mac/install/][]

 1. Then make sure that you set Docker to minimum 4GB memory (Docker icon >
 Preferences > Advanced).

 1. Update the lesson project with the latest version of the mobile packages:
```bash
cd ~/.content/packages/activist-apprentice-course-template
npm i --save contentascode-mobile@0.1.4
npm i --save metalsmith-contentascode-mobile@0.0.10
```

 1. Commit and push the updated project to gitlab in order for the project to
be published to expo:
```bash
git add .
git commit -m "Updated mobile packages"
git push
```

 1. Generate the mobile project:
```bash
cd ~/workspace # (change this to where your content as code workspace is located)
apprentice start --no-watch mobile
```

 1. Then on the command line:
```bash
cd ~/.content/build/@apprentice/mobile
docker run -v $(pwd):/src/exponent/js -v $(pwd)/tmp:/tmp iilab/expo-cached:27.0.0 --url https://exp.host/${PROJECT} --sdkVersion 27.0.0"
```

After this you should have an apk called `shell-debug.apk` inside the
`~/.content/build/@apprentice/mobile/tmp` folder. You can drag and drop this
into RepoMaker.
