exports.getLastVersion = (versions, dateKey) => {
  if (!Array.isArray(versions)) throw new Error('versions must be an array !');
  if (typeof dateKey !== 'string') throw new Error('sortKey must be a string !');
  if (versions.length === 0) return null;
  return versions.sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))[0];
};
