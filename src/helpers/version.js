exports.shouldUpdate = async (version) => {
  if (version.apiVersion) {
    const majorApiVersion = Number(process.env.API_VERSION);
    return majorApiVersion > version.apiVersion;
  }
  if (process.env.MOBILE_VERSION.includes(version.mobileVersion)) return false;

  return true;
};
