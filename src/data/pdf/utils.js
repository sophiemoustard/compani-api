exports.formatSiret = siret => siret &&
  `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9, 14)}`;
