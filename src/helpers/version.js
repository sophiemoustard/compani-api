exports.checkUpdate = async (version) => {
  if (version.apiVersion) {
    const majorApiVersion = process.env.API_VERSION.replace(/\.[0-9]+\.[0-9]+$/, '');
    return majorApiVersion > version.apiVersion;
  }
  if (process.env.MOBILE_VERSION.includes(version.mobileVersion)) return false;

  return true;
};
