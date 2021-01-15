exports.shouldUpdate = async (version) => {
  if (version.apiVersion) return false;
  if (process.env.MOBILE_VERSION.includes(version.mobileVersion)) return false;

  return true;
};
