const { deleteNonAuthenticationSeeds } = require('../helpers/authentication');

const populateDB = async () => {
  await deleteNonAuthenticationSeeds();
};

module.exports = {
  populateDB,
};
