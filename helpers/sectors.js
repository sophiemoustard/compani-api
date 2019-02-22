const populateSector = (userSectorId, company) => {
  if (company.auxiliariesConfig && company.auxiliariesConfig.sectors) {
    return company.auxiliariesConfig.sectors.find(sector => sector._id.toHexString() === userSectorId.toHexString());
  }
  return userSectorId;
};

module.exports = { populateSector };
