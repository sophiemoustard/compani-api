const { checkUserCompanySeeds } = require('./userCompany');

exports.checkSeeds = async () => {
  let seedsAreCorrect = true;
  seedsAreCorrect = seedsAreCorrect && await checkUserCompanySeeds();

  return seedsAreCorrect;
};
