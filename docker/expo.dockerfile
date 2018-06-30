# From https://github.com/expo/expo/blob/master/android/.ci/android-base.Rockerfile

FROM iilab/android:24.1.1

RUN apt remove -y cmdtest && apt-get update && apt-get install apt-transport-https
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
  echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
  apt update && \
  apt install -y yarn --no-install-recommends && \
  apt-get clean

## Build XDL
# ADD ../dev/xdl /src/xdl
RUN mkdir -p /src
RUN cd /src && git clone https://github.com/expo/xdl.git
RUN cd /src/xdl && \
  ls -la && \
  yarn && \
  gulp build && \
  cp `npm pack` xdl-packaged.tgz

# Use Docker caching
RUN mkdir -p /src/exponent

WORKDIR /src/exponent
# ADD ./tools /src/exponent/tools
# RUN cd ./tools && yarn --pure-lockfile

ADD ./tools-public /src/exponent/tools-public
RUN cd ./tools-public && yarn --pure-lockfile && yarn add /src/xdl/xdl-packaged.tgz && rm -rf /src/xdl

# Copy relevant files

ADD ./__internal__ /src/exponent/__internal__
ADD ./template-files /src/exponent/template-files
ADD ./android /src/exponent/android
ADD ./cpp /src/exponent/cpp
ADD ./package.json /src/exponent/package.json
ADD ./dev-home-config.json /src/exponent/dev-home-config.json

ENV SHELL_APP_BUILDER 1

# Generate dynamic macros
RUN mkdir -p ./android/expoview/src/main/java/host/exp/exponent/generated/
RUN cd ./tools-public && \
  gulp generate-dynamic-macros \
    --buildConstantsPath ../android/expoview/src/main/java/host/exp/exponent/generated/ExponentBuildConstants.java \
    --platform android

ENV TURTLE_WORKING_DIR_PATH /src/exponent

CMD gulp android-shell-app
