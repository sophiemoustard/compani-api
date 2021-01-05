exports.checkUpdate = async (apiVersion) => {
  const majorApiVersion = process.env.API_VERSION.replace(/\.[0-9]+\.[0-9]+$/, '');
  return majorApiVersion > apiVersion;
};
