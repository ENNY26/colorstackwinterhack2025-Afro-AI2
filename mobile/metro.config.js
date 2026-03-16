// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure Metro only watches the mobile directory
config.projectRoot = __dirname;
config.watchFolders = [__dirname];

// Ignore patterns - don't watch parent directories
config.resolver = {
  ...config.resolver,
  blockList: [
    /.*\/\.\.\/node_modules\/.*/,
    /.*\/\.\.\/server\/.*/,
  ],
};

module.exports = config;
