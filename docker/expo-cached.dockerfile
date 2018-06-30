FROM iilab/expo:27.0.0

ARG URL
ARG SDK_VERSION
ARG APK_FILENAME

ENV URL ${URL:-http://localhost:19000}
ENV SDK_VERSION ${SDK_VERSION:-27.0.0}
ENV APK_FILENAME ${APK_FILENAME:-app}
ENV KEYSTORE_PATH ${KEYSTORE_PATH}
ENV KEYSTORE_PASSWORD ${KEYSTORE_PASSWORD}
ENV KEY_ALIAS ${KEY_ALIAS}
ENV KEY_PASSWORD ${KEY_PASSWORD}

RUN apt-get -y install socat

# Temp to avoid rebuilding source container
ADD ./tools-public /src/exponent/tools-public
RUN cd ./tools-public && yarn --pure-lockfile && yarn add /src/xdl/xdl-packaged.tgz && rm -rf /src/xdl

# Make the expo server and react-native packager accessible from localhost

RUN node tools-public/proxy.js & \
    sleep 5 && \
# Preinstall gradle and project dependencies for faster builds
     cd ./tools-public && gulp android-shell-app --url ${URL} --sdkVersion ${SDK_VERSION}

CMD bash -c \
     "node tools-public/proxy.js & \
      sleep 5 && \
      mkdir -p /src/exponent/android-shell-app/app/build/intermediates/assets/prod/release && \
      cd ./tools-public && \
      gulp bundle-assets --projectRoot /src/js --sdkVersion ${SDK_VERSION} --dest /src/exponent/android-shell-app/app/build/intermediates/assets/prod/release && \
      gulp android-shell-app --url ${URL} --sdkVersion ${SDK_VERSION} --keystore ${KEYSTORE_PATH} --alias ${KEY_ALIAS} --keystorePassword ${KEYSTORE_PASSWORD} --keyPassword ${KEY_PASSWORD} && \
      mv /tmp/shell-debug.apk /build/${APK_FILENAME}.apk "
