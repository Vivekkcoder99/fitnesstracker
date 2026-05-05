// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Alias react-native-maps to a web-safe stub so the web bundler
// doesn't try to resolve native-only modules (MapMarkerNativeComponent, etc.)
config.resolver = config.resolver || {};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'react-native-maps' ||
      moduleName.startsWith('react-native-maps/'))
  ) {
    return {
      filePath: require.resolve('./src/stubs/ReactNativeMapsStub.js'),
      type: 'sourceFile',
    };
  }
  // Fall back to the default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
