const { FORMATION } = require('./constants');

exports.shouldUpdate = async (query) => {
  const { apiVersion, mobileVersion, appName } = query;
  if (apiVersion) return true;
  if ((!appName || appName === FORMATION) && process.env.FORMATION_MOBILE_VERSION.includes(mobileVersion)) return false;
  if (process.env[`${appName.toUpperCase()}_MOBILE_VERSION`].includes(mobileVersion)) return false;

  return true;
};
