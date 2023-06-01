const { ObjectId } = require('mongodb');
const {
  VENDOR_ADMIN,
  CLIENT_ADMIN,
  CLIENT,
  TRAINER,
  TRAINING_ORGANISATION_MANAGER,
  HELPER,
  AUXILIARY_WITHOUT_COMPANY,
  VENDOR,
  AUXILIARY,
  PLANNING_REFERENT,
  COACH,
  HOLDING_ADMIN,
  HOLDING,
} = require('../../src/helpers/constants');

const rolesList = [
  { _id: new ObjectId(), name: VENDOR_ADMIN, interface: VENDOR },
  { _id: new ObjectId(), name: CLIENT_ADMIN, interface: CLIENT },
  { _id: new ObjectId(), name: COACH, interface: CLIENT },
  { _id: new ObjectId(), name: AUXILIARY, interface: CLIENT },
  { _id: new ObjectId(), name: AUXILIARY_WITHOUT_COMPANY, interface: CLIENT },
  { _id: new ObjectId(), name: PLANNING_REFERENT, interface: CLIENT },
  { _id: new ObjectId(), name: HELPER, interface: CLIENT },
  { _id: new ObjectId(), name: TRAINING_ORGANISATION_MANAGER, interface: VENDOR },
  { _id: new ObjectId(), name: TRAINER, interface: VENDOR },
  { _id: new ObjectId(), name: HOLDING_ADMIN, interface: HOLDING },
];

const trainerRoleId = rolesList.find(r => r.name === TRAINER)._id;
const vendorAdminRoleId = rolesList.find(r => r.name === VENDOR_ADMIN)._id;
const helperRoleId = rolesList.find(r => r.name === HELPER)._id;
const auxiliaryRoleId = rolesList.find(r => r.name === AUXILIARY)._id;
const planningReferentRoleId = rolesList.find(r => r.name === PLANNING_REFERENT)._id;
const coachRoleId = rolesList.find(r => r.name === COACH)._id;
const auxiliaryWithoutCompanyRoleId = rolesList.find(r => r.name === AUXILIARY_WITHOUT_COMPANY)._id;
const clientAdminRoleId = rolesList.find(r => r.name === CLIENT_ADMIN)._id;
const trainingOrganisationManagerRoleId = rolesList.find(r => r.name === TRAINING_ORGANISATION_MANAGER)._id;
const holdingAdminRoleId = rolesList.find(r => r.name === HOLDING_ADMIN)._id;

module.exports = {
  rolesList,
  trainerRoleId,
  vendorAdminRoleId,
  helperRoleId,
  auxiliaryRoleId,
  planningReferentRoleId,
  coachRoleId,
  auxiliaryWithoutCompanyRoleId,
  clientAdminRoleId,
  trainingOrganisationManagerRoleId,
  holdingAdminRoleId,
};
