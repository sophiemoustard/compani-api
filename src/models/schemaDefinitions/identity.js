const { MISTER, MRS, COUPLE } = require('../../helpers/constants');

const CIVILITY_OPTIONS = [MISTER, MRS, COUPLE];

module.exports.CIVILITY_OPTIONS = CIVILITY_OPTIONS;
module.exports.identitySchemaDefinition = {
  title: { type: String, enum: CIVILITY_OPTIONS },
  firstname: String,
  lastname: { type: String, required: true },
  birthDate: Date,
};
