exports.clean = (obj) => {
  for (const k in obj) {
    if (obj[k] === null || obj[k] === undefined || obj[k] === '' || obj[k] === {} || obj[k] === []) {
      delete obj[k];
    }
  }
  return obj;
};
