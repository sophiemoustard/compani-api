const {
  CLIENT_ADMIN,
  COACH,
  PLANNING_REFERENT,
  AUXILIARY,
  HELPER,
  VENDOR_ADMIN,
  TRAINER,
  TRAINING_ORGANISATION_MANAGER,
  AUXILIARY_WITHOUT_COMPANY,
} = require('./constants');

const coachRights = [
  { right: 'update', model: 'CustomerClass', subscription: 'erp' },
];
const clientAdminRights = [
  ...coachRights,
];
const auxiliaryRights = [
  { right: 'update', model: 'CustomerClass', subscription: 'erp' },
];
const auxiliaryWithoutCompanyRights = [
];
const planningReferentRights = [...auxiliaryRights];
const helperRights = [
  {
    right: 'update',
    model: 'CustomerClass',
    subscription: 'erp',
    options: { request: '{ "_id": { "$in": "userField" } }', userField: 'customers' },
  },
];
const vendorAdminRights = [];
const trainingOrgnaisationManagerRights = [];
const trainerRights = [];

exports.roleBasedAccessControl = {
  [CLIENT_ADMIN]: clientAdminRights,
  [COACH]: coachRights,
  [AUXILIARY_WITHOUT_COMPANY]: auxiliaryWithoutCompanyRights,
  [AUXILIARY]: auxiliaryRights,
  [PLANNING_REFERENT]: planningReferentRights,
  [HELPER]: helperRights,
  [VENDOR_ADMIN]: vendorAdminRights,
  [TRAINING_ORGANISATION_MANAGER]: trainingOrgnaisationManagerRights,
  [TRAINER]: trainerRights,
};
