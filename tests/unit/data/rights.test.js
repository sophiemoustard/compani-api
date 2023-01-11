const { expect } = require('expect');
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

  it('an auxiliary must have the permissions associated with an auxiliary without company', async () => {
    const auxiliaryWithoutCompanyPermissions = rights
      .filter(right => right.rolesConcerned.includes(AUXILIARY_WITHOUT_COMPANY))
      .map(right => right.permission);
    const auxiliaryPermissions = rights
      .filter(right => right.rolesConcerned.includes(AUXILIARY))
      .map(right => right.permission);

    const arePermissionsIncluded = auxiliaryWithoutCompanyPermissions
      .map(permission => auxiliaryPermissions.includes(permission))
      .every(value => value);

    expect(arePermissionsIncluded).toBeTruthy();
  });

  it('a planing referent must have the permissions associated with an auxiliary', async () => {
    const auxiliaryPermissions = rights
      .filter(right => right.rolesConcerned.includes(AUXILIARY))
      .map(right => right.permission);
    const planningReferentPermissions = rights
      .filter(right => right.rolesConcerned.includes(PLANNING_REFERENT))
      .map(right => right.permission);

    const arePermissionsIncluded = auxiliaryPermissions
      .map(permission => planningReferentPermissions.includes(permission))
      .every(value => value);

    expect(arePermissionsIncluded).toBeTruthy();
  });

  it('a client admin must have the permissions associated with a coach', async () => {
    const coachPermissions = rights
      .filter(right => right.rolesConcerned.includes(COACH))
      .map(right => right.permission);
    const clientAdminPermissions = rights
      .filter(right => right.rolesConcerned.includes(CLIENT_ADMIN))
      .map(right => right.permission);

    const arePermissionsIncluded = coachPermissions
      .map(permission => clientAdminPermissions.includes(permission))
      .every(value => value);

    expect(arePermissionsIncluded).toBeTruthy();
  });

  it('a ROF must have the permissions associated with a trainer', async () => {
    const trainerPermissions = rights
      .filter(right => right.rolesConcerned.includes(TRAINER))
      .map(right => right.permission);
    const trainingOrganisationManagerPermissions = rights
      .filter(right => right.rolesConcerned.includes(TRAINING_ORGANISATION_MANAGER))
      .map(right => right.permission);

    const arePermissionsIncluded = trainerPermissions
      .map(permission => trainingOrganisationManagerPermissions.includes(permission))
      .every(value => value);

    expect(arePermissionsIncluded).toBeTruthy();
  });

  it('a vendor admin must have the permissions associated with a ROF', async () => {
    const trainingOrganisationManagerPermissions = rights
      .filter(right => right.rolesConcerned.includes(TRAINING_ORGANISATION_MANAGER))
      .map(right => right.permission);
    const vendorAdminPermissions = rights
      .filter(right => right.rolesConcerned.includes(VENDOR_ADMIN))
      .map(right => right.permission);

    const arePermissionsIncluded = trainingOrganisationManagerPermissions
      .map(permission => vendorAdminPermissions.includes(permission))
      .every(value => value);

    expect(arePermissionsIncluded).toBeTruthy();
  });
});
