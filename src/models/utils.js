const MONTH_VALIDATION = /^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/;
const PHONE_VALIDATION = /^[0]{1}[1-9]{1}[0-9]{8}$/;
// eslint-disable-next-line no-misleading-character-class
const ESTABLISHMENT_NAME_VALIDATION = /^[a-zA-Z0-9éèêëâàäöôûüîïç°2!#$%&'()*+,\-./:;<=>?@ ]{1,32}$/;
const SIRET_VALIDATION = /^\d{14}$/;

module.exports = {
  MONTH_VALIDATION,
  PHONE_VALIDATION,
  ESTABLISHMENT_NAME_VALIDATION,
  SIRET_VALIDATION,
};
