const path = require('path');
const { load } = require('@expo/env');

// Automatically load environment variables from the single backend .env file
try {
  load(path.resolve(__dirname, '../citylinks-backend'));
} catch (e) {}

// Learn more https://docs.expo.io/guides/customizing-metro

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./app/global.css" });
