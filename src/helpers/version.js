exports.shouldUpdate = async (query) => {
  const { apiVersion, mobileVersion, appName } = query;
  if (apiVersion) return true;
  if (!appName && process.env.FORMATION_MOBILE_VERSION.includes(mobileVersion)) return false;
  if (appName && process.env[`${appName.toUpperCase()}_MOBILE_VERSION`].includes(mobileVersion)) return false;

  return true;
};
