module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.ignoreWarnings = [
        (warning) =>
          typeof warning.message === 'string' &&
          warning.message.includes('@zxing'),
      ];
      return webpackConfig;
    },
  },
};
