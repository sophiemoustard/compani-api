/* eslint-disable max-len */
const MONTH_VALIDATION = /^([0]{1}[1-9]{1}|[1]{1}[0-2]{1})-[2]{1}[0]{1}[0-9]{2}$/;
const PHONE_VALIDATION = /^[0]{1}[1-9]{1}[0-9]{8}$/;
const SIRET_VALIDATION = /^\d{14}$/;
const IBAN_VALIDATION = /FR\d{12}[0-9A-Z]{11}\d{2}$/;
const BIC_VALIDATION = /([a-zA-Z]{4})([a-zA-Z]{2})(([2-9a-zA-Z]{1})([0-9a-np-zA-NP-Z]{1}))((([0-9a-wy-zA-WY-Z]{1})([0-9a-zA-Z]{2}))|([xX]{3})|)/;
module.exports = {
  MONTH_VALIDATION,
  PHONE_VALIDATION,
  SIRET_VALIDATION,
  IBAN_VALIDATION,
  BIC_VALIDATION,
};
