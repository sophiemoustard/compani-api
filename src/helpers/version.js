exports.shouldUpdate = async (version) => {
  if (version.apiVersion) return true;
  if (process.env.MOBILE_VERSION.includes(version.mobileVersion)) return false;

  return true;
};
