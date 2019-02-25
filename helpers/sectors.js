const populateSector = (user) => {
  if (user.sector && user.company && user.company.auxiliariesConfig && user.company.auxiliariesConfig.sectors) {
    user.sector = user.company.auxiliariesConfig.sectors.find(sector => sector._id.toHexString() === user.sector.toHexString());
    return user;
  }
  return user;
};

module.exports = { populateSector };
