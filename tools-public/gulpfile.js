// Copyright 2015-present 650 Industries. All rights reserved.
'use strict';

const assert = require('assert');
const fs = require('fs');
const { ensureDir, copy } = require('fs-extra');
const gulp = require('gulp');
const shell = require('gulp-shell');
const minimist = require('minimist');
const path = require('path');
const _ = require('lodash');
const {
  IosClient,
  IosIcons,
  IosShellApp,
  AndroidShellApp,
  AndroidKeystore,
  IosKeychain,
  IosIPABuilder: createIPABuilder,
  Project,
  ExpSchema
} = require('xdl');

const md5hex = require('md5hex');
const minimatch = require('minimatch');

const { startReactNativeServer } = require('./react-native-tasks');
const {
  generateDynamicMacrosAsync,
  cleanupDynamicMacrosAsync,
  runFabricIOSAsync
} = require('./generate-dynamic-macros');
const logger = require('./logger');

const ptool = './ptool';
const _projects = './_projects';

const argv = minimist(process.argv.slice(2));

/**
 * Reads a _projects file and returns the project paths in it.
 */
function pathsFromProjectsFile(projectsFile) {
  let projectPaths = [];
  let text = fs.readFileSync(projectsFile, 'utf8');
  let regex = /\nproject=([^\n]*)/gm;
  let match;
  while ((match = regex.exec(text))) {
    projectPaths.push(match[1]);
  }
  return projectPaths;
}

function generateDynamicMacrosWithArguments() {
  if (!argv.buildConstantsPath) {
    throw new Error('Must run with `--buildConstantsPath BUILD_CONSTANTS_PATH`');
  }

  if (!argv.platform) {
    throw new Error('Must run with `--platform PLATFORM`');
  }

  if (argv.platform === 'ios' && !argv.infoPlistPath) {
    throw new Error('iOS must run with `--infoPlistPath INFO_PLIST_PATH`');
  }

  return generateDynamicMacrosAsync(argv);
}

function cleanupDynamicMacrosWithArguments() {
  if (argv.platform === 'ios' && !argv.infoPlistPath) {
    throw new Error('iOS must run with `--infoPlistPath INFO_PLIST_PATH`');
  }

  return cleanupDynamicMacrosAsync(argv);
}

function runFabricIOSWithArguments() {
  if (!argv.fabricPath || !argv.iosPath) {
    throw new Error('Must run with `--fabricPath` and `--iosPath`');
  }

  return runFabricIOSAsync(argv);
}

function createAndroidShellAppWithArguments() {
  validateArgv({
    url: 'Must run with `--url MANIFEST_URL`',
    sdkVersion: 'Must run with `--sdkVersion SDK_VERSION`'
  });

  return AndroidShellApp.createAndroidShellAppAsync(argv);
}

function updateAndroidShellAppWithArguments() {
  validateArgv({
    url: 'Must run with `--url MANIFEST_URL`',
    sdkVersion: 'Must run with `--sdkVersion SDK_VERSION`'
  });

  return AndroidShellApp.updateAndroidShellAppAsync(argv);
}

function createAndroidKeystoreWithArguments() {
  validateArgv({
    keystorePassword: 'Must run with `--keystorePassword KEYSTORE_PASSWORD`',
    keyPassword: 'Must run with `--keyPassword KEY_PASSWORD`',
    keystoreFilename: 'Must run with `--keystoreFilename KEYSTORE_FILENAME`',
    keystoreAlias: 'Must run with `--keystoreAlias KEYSTORE_ALIAS`',
    androidPackage: 'Must run with `--androidPackage ANDROID_PACKAGE`'
  });

  return AndroidKeystore.createKeystore(argv);
}

function createIOSShellAppWithArguments() {
  const { resizeIconWithSharpAsync, getImageDimensionsWithSharpAsync } = require('./image-helpers');
  logger.info({ buildPhase: 'icons setup' }, 'IosIcons: setting image functions to alternative sharp implementations');
  IosIcons.setResizeImageFunction(resizeIconWithSharpAsync);
  IosIcons.setGetImageDimensionsFunction(getImageDimensionsWithSharpAsync);

  if (argv.action === 'build') {
    return IosShellApp.buildAndCopyArtifactAsync(argv);
  } else if (argv.action === 'configure') {
    return IosShellApp.configureAndCopyArchiveAsync(argv);
  } else if (argv.action === 'create-workspace') {
    return IosShellApp.createTurtleWorkspaceAsync(argv);
  } else {
    throw new Error(`Unsupported action '${argv.action}'.`);
  }
}

function buildIOSClientWithArguments() {
  const { type, configuration, verbose } = argv;
  return IosClient.buildAsync(type, configuration, verbose);
}

function configureIOSClientBundleWithArguments() {
  const { archivePath, bundleId, appleTeamId } = argv;
  return IosClient.configureBundleAsync(archivePath, bundleId, appleTeamId);
}

function createIOSKeychainWithArguments() {
  validateArgv({
    appUUID: 'Must run with `--appUUID APP_UUID`'
  });

  return IosKeychain.createKeychain(argv.appUUID);
}

function importCertIntoIOSKeychainWithArguments() {
  validateArgv({
    keychainPath: 'Must run with `--keychainPath KEYCHAIN_PATH`',
    certPath: 'Must run with `--certPath CERTIFICATE_PATH`',
    certPassword: 'Must run with `--certPassword CERTIFICATE_PASSWORD`'
  });

  return IosKeychain.importIntoKeychain(argv);
}

function deleteIOSKeychainWithArguments() {
  validateArgv({
    keychainPath: 'Must run with `--keychainPath KEYCHAIN_PATH`',
    appUUID: 'Must run with `--appUUID APP_UUID`'
  });

  return IosKeychain.deleteKeychain({ path: argv.keychainPath, appUUID: argv.appUUID });
}

function buildAndSignIpaWithArguments() {
  validateArgv({
    keychainPath: 'Must run with `--keychainPath KEYCHAIN_PATH`',
    provisioningProfilePath: 'Must run with `--provisioningProfilePath PROVISIONING_PROFILE_PATH`',
    appUUID: 'Must run with `--appUUID APP_UUID`',
    certPath: 'Must run with `--certPath CERT_PATH`',
    certPassword: 'Must run with `--certPassword CERT_PASSWORD`',
    teamID: 'Must run with `--teamID TEAM_ID`',
    bundleIdentifier: 'Must run with `--bundleIdentifier BUNDLE_IDENTIFIER`'
  });

  const builder = createIPABuilder(argv);
  return builder.build();
}

function validateArgv(errors) {
  Object.keys(errors).forEach(fieldName => {
    if (!(fieldName in argv)) {
      throw new Error(errors[fieldName]);
    }
  });
}

async function _resolveManifestAssets(projectRoot, manifest, resolver, strict = false) {
  try {
    // Asset fields that the user has set
    const assetSchemas = (await ExpSchema.getAssetSchemasAsync(manifest.sdkVersion)).filter(({ fieldPath }) =>
      _.get(manifest, fieldPath)
    );

    // Get the URLs
    const urls = await Promise.all(
      assetSchemas.map(async ({ fieldPath }) => {
        const pathOrURL = _.get(manifest, fieldPath);
        if (pathOrURL.match(/^https?:\/\/(.*)$/)) {
          // It's a remote URL
          return pathOrURL;
        } else if (fs.existsSync(path.resolve(projectRoot, pathOrURL))) {
          return await resolver(pathOrURL);
        } else {
          const err = new Error('Could not resolve local asset.');
          // $FlowFixMe
          err.localAssetPath = pathOrURL;
          // $FlowFixMe
          err.manifestField = fieldPath;
          throw err;
        }
      })
    );

    // Set the corresponding URL fields
    assetSchemas.forEach(({ fieldPath }, index) => _.set(manifest, fieldPath + 'Url', urls[index]));
  } catch (e) {
    console.error(e);
    if (e.localAssetPath) {
      console.log(
        'expo',
        `Unable to resolve asset "${e.localAssetPath}" from "${e.manifestField}" in your app/exp.json.`
      );
    } else {
      console.log('expo', `Warning: Unable to resolve manifest assets. Icons might not work. ${e.message}.`);
    }

    if (strict) {
      throw new Error('Resolving assets failed.');
    }
  }
}

// async function _writeArtifactSafelyAsync(projectRoot, keyName, artifactPath, artifact) {
//   const pathToWrite = path.resolve(projectRoot, artifactPath);
//   if (!fs.existsSync(path.dirname(pathToWrite))) {
//     logger.global.warn(`app.json specifies ${keyName}: ${pathToWrite}, but that directory does not exist.`);
//   } else {
//     await fs.writeFile(pathToWrite, artifact);
//   }
// }

async function bundleAsync(assets, dest, oldFormat = false) {
  if (!assets) {
    return;
  }

  await ensureDir(dest);

  const batches = _.chunk(assets, 5);
  for (const batch of batches) {
    await Promise.all(
      batch.map(async ({ files, fileHashes }) => {
        files.forEach(async (file, i) => {
          await copy(
            file,
            // For sdk24 the runtime expects only the hash as the filename.
            path.join(dest, fileHash[i])
          );
        });
      })
    );
  }
}

async function androidBundleAssets() {
  if (argv.platform === 'android' && !argv.dest) {
    throw new Error('Must run with `--dest PATH`');
  }

  if (!argv.projectRoot) {
    throw new Error('Missing argument `--projectRoot PATH`');
  }
  if (!argv.sdkVersion) {
    throw new Error('Missing argument `--sdkVersion PATH`');
  }
  const projectRoot = argv.projectRoot;

  let { expo: exp, ...rest } = JSON.parse(fs.readFileSync(projectRoot + '/app.json'));
  const manifestAssets = [];
  await _resolveManifestAssets(
    projectRoot,
    exp,
    async assetPath => {
      const absolutePath = path.resolve(projectRoot, assetPath);
      const contents = fs.readFileSync(absolutePath);
      const hash = md5hex(contents);
      manifestAssets.push({ files: [absolutePath], fileHashes: [hash] });
      return 'assets://asset_' + hash;
    },
    true
  );

  const assets = manifestAssets;

  if (exp.assetBundlePatterns) {
    const fullPatterns = exp.assetBundlePatterns.map(p => path.join(projectRoot, p));
    // The assets returned by the RN packager has duplicates so make sure we
    // only bundle each once.
    const bundledAssets = new Set();
    for (const asset of assets) {
      const file = asset.files && asset.files[0];
      if (file && fullPatterns.some(p => minimatch(file, p))) {
        asset.fileHashes.forEach(hash => bundledAssets.add('asset_' + hash + (asset.type ? '.' + asset.type : '')));
      }
    }
    exp.bundledAssets = [...bundledAssets];
    delete exp.assetBundlePatterns;
  }

  console.log('exp', exp);
  fs.writeFileSync(projectRoot + '/app.json', JSON.stringify({ expo: exp, ...rest }, true, 2));
  console.log('manifestAssets', manifestAssets);

  await bundleAsync(manifestAssets, argv.dest);

  // Return async/await as promise to Gulp.
  // return _writeArtifactSafelyAsync(argv[0], 'android.publishBundlePath', exp.android.publishBundlePath, androidBundle);
}

let watcher = null;

gulp.task('watch', function(done) {
  assert(!watcher, 'gulp is already watching the Xcode projects');
  let projectPaths = pathsFromProjectsFile(_projects);
  let pbxprojPaths = projectPaths.map(function(projectPath) {
    return path.join('..', projectPath, 'project.pbxproj');
  });
  watcher = gulp.watch(pbxprojPaths, gulp.series('ptool:pause-watch'));
  done();
});

gulp.task('watch:stop', function(done) {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  done();
});

// Shell app (android)
gulp.task('android-shell-app', createAndroidShellAppWithArguments);
gulp.task('update-android-shell-app', updateAndroidShellAppWithArguments);
gulp.task('android:create-keystore', createAndroidKeystoreWithArguments);

// iOS
gulp.task('ios-shell-app', createIOSShellAppWithArguments);
gulp.task('build-ios-client', buildIOSClientWithArguments);
gulp.task('ios:configure-client-bundle', configureIOSClientBundleWithArguments);
gulp.task('ios:create-keychain', createIOSKeychainWithArguments);
gulp.task('ios:import-cert-into-keychain', importCertIntoIOSKeychainWithArguments);
gulp.task('ios:delete-keychain', deleteIOSKeychainWithArguments);
gulp.task('ios:build-and-sign-ipa', buildAndSignIpaWithArguments);

gulp.task('ptool', shell.task([`${ptool} ${_projects}`]));
gulp.task('ptool:watch', gulp.series('ptool', 'watch'));
gulp.task('ptool:pause-watch', gulp.series('watch:stop', 'ptool', 'watch'));

gulp.task('react-native-server', startReactNativeServer);

gulp.task('generate-dynamic-macros', generateDynamicMacrosWithArguments);
gulp.task('cleanup-dynamic-macros', cleanupDynamicMacrosWithArguments);
gulp.task('run-fabric-ios', runFabricIOSWithArguments);

// Fork

gulp.task('bundle-assets', androidBundleAssets);
