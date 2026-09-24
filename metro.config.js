const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Treat .bin files as raw assets so fluid table JSON files
// are NOT inlined into the JS bundle (they load on-demand).
config.resolver.assetExts.push('bin');

module.exports = config;
