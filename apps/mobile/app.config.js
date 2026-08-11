module.exports = ({ config }) => {
  const isProd = process.env.APP_ENV === 'production';
  return {
    ...config,
    name: isProd ? "Finwerse" : "Finwerse (Staging)",
    scheme: isProd ? "com.finwerse.mobile" : "com.finwerse.mobile.staging",
    ios: {
      ...config.ios,
      bundleIdentifier: isProd ? "com.finwerse.mobile" : "com.finwerse.mobile.staging",
    },
    android: {
      ...config.android,
      package: isProd ? "com.finwerse.mobile" : "com.finwerse.mobile.staging",
    },
  };
};
