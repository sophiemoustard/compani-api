
const { Ability, AbilityBuilder } = require('@casl/ability');
const { CLIENT_ADMIN } = require('./constants');

exports.defineAbilitiesFor = (clientRole) => {
  const { can, rules } = new AbilityBuilder();

  if (clientRole !== CLIENT_ADMIN) can('update', 'customers');

  return new Ability(rules);
};
