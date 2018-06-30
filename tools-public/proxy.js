const http = require('http');
const httpProxy = require('http-proxy');
const modifyResponse = require('node-http-proxy-json');

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

// Proxy and transform development manifest
const proxy = httpProxy.createProxyServer({
  // target: 'http://host.docker.internal:19000'
  target: 'http://localhost:19000'
});

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

// Listen for the `proxyRes` event on `proxy`.
proxy.on('proxyRes', async function(proxyRes, req, res) {
  modifyResponse(res, proxyRes, async function(body) {
    // modify urls
    // body.splash.imageUrl = 'assets://asset_6cc36c0f0bd5f6f4788a9e14e9637f11';
    // body.iconUrl = 'assets://asset_6cc36c0f0bd5f6f4788a9e14e9637f11';
    // body.bundleUrl = 'assets://shell-app-bundle.js';
    // const result = JSON.parse(JSON.stringify(body).replace('http://localhost:19000', ));

    const projectRoot = '/src/js';
    let exp = body;

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

    return exp; // return value can be a promise
  });
});

// Create your server and then proxies the request
const server = http
  .createServer(function(req, res) {
    proxy.web(req, res);
  })
  .listen(19002);

// Proxy react packager
const reactProxy = httpProxy.createProxyServer({
  // target: 'http://host.docker.internal:19001'
  target: 'http://localhost:19001'
});

const reactServer = http
  .createServer(function(req, res) {
    reactProxy.web(req, res);
  })
  .listen(19003);
