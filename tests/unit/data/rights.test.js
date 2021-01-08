const expect = require('expect');
const { rights } = require('../../../src/data/rights');
const {
  AUXILIARY,
  PLANNING_REFERENT,
  COACH,
  CLIENT_ADMIN,
  TRAINER,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  AUXILIARY_WITHOUT_COMPANY,
} = require('../../../src/helpers/constants');

describe('checking the format of right.js file', () => {
  it('there must be only one right per permission', async () => {
    const permissions = rights.map(right => right.permission);
    const noDuplicatedRights = new Set(permissions).size === permissions.length;

    expect(noDuplicatedRights).toBeTruthy();
  });

  it('a role must have the permissions associated with the role below it (client side)', async () => {
    const auxiliaryWithoutCompanyPermissions = rights
      .filter(right => right.rolesConcerned.includes(AUXILIARY_WITHOUT_COMPANY)).map(right => right.permission);
    const auxiliaryPermissions = rights
      .filter(right => right.rolesConcerned.includes(AUXILIARY)).map(right => right.permission);
    const planningReferentPermissions = rights
      .filter(right => right.rolesConcerned.includes(PLANNING_REFERENT)).map(right => right.permission);
    const coachPermissions = rights
      .filter(right => right.rolesConcerned.includes(COACH)).map(right => right.permission);
    const clientAdminPermissions = rights
      .filter(right => right.rolesConcerned.includes(CLIENT_ADMIN)).map(right => right.permission);

    const arePermissionsIncludedList = [
      auxiliaryWithoutCompanyPermissions.map(permission => auxiliaryPermissions.includes(permission)),
      auxiliaryPermissions.map(permission => planningReferentPermissions.includes(permission)),
      planningReferentPermissions.map(permission => coachPermissions.includes(permission)),
      coachPermissions.map(permission => clientAdminPermissions.includes(permission)),
    ];

    expect(arePermissionsIncludedList.every(value => value)).toBeTruthy();
  });

  it('a role must have the permissions associated with the role below it (vendor side)', async () => {
    const trainerPermissions = rights
      .filter(right => right.rolesConcerned.includes(TRAINER)).map(right => right.permission);
    const trainingOrganisationManagerPermissions = rights
      .filter(right => right.rolesConcerned.includes(TRAINING_ORGANISATION_MANAGER)).map(right => right.permission);
    const vendorAdminPermissions = rights
      .filter(right => right.rolesConcerned.includes(VENDOR_ADMIN)).map(right => right.permission);

    const arePermissionsIncludedList = [
      trainerPermissions.map(permission => trainingOrganisationManagerPermissions.includes(permission)),
      trainingOrganisationManagerPermissions.map(permission => vendorAdminPermissions.includes(permission)),
    ];

    expect(arePermissionsIncludedList.every(value => value)).toBeTruthy();
  });
});
