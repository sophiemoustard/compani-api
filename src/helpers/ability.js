
const get = require('lodash/get');
const { Ability, AbilityBuilder } = require('@casl/ability');
const { roleBasedAccessControl } = require('./rbac');

exports.defineAbilitiesFor = (user) => {
  const { can, rules } = new AbilityBuilder();
  const clientRole = get(user, 'role.client.name');
  const rightsArray = roleBasedAccessControl[clientRole];

  rightsArray.forEach((elem) => {
    if (elem.options) {
      const options = JSON.parse(elem.options.request, (key, value) => {
        if (value === 'userField') return user[elem.options.userField];
        return value;
      });

      can(elem.right, elem.model, options);
    } else can(elem.right, elem.model);
  });

  return new Ability(rules);
};
