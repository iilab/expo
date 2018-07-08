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
# Preinstall gradle and project dependencies for faster builds using dev expo server
RUN socat tcp-listen:19000,reuseaddr,fork tcp:host.docker.internal:19000 & \
    socat tcp-listen:19001,reuseaddr,fork tcp:host.docker.internal:19001 & \
    sleep 5 && \
    cd ./tools-public && gulp android-shell-app --url ${URL} --sdkVersion ${SDK_VERSION}

ADD ./__internal__ /src/exponent/__internal__
ADD ./android /src/exponent/android

CMD bash -c \
     "cd ./tools-public && \
      gulp generate-dynamic-macros \
        --buildConstantsPath ../android/expoview/src/main/java/host/exp/exponent/generated/ExponentBuildConstants.java \
        --platform android && \
      gulp android-shell-app --url ${URL} --sdkVersion ${SDK_VERSION} --keystore ${KEYSTORE_PATH} --alias ${KEY_ALIAS} --keystorePassword ${KEYSTORE_PASSWORD} --keyPassword ${KEY_PASSWORD} && \
      mv /tmp/shell-signed.apk /build/${APK_FILENAME}.apk "
