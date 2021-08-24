const { ObjectID } = require('mongodb');
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
} = require('../../src/helpers/constants');

const rolesList = [
  { _id: new ObjectID(), name: VENDOR_ADMIN, interface: VENDOR },
  { _id: new ObjectID(), name: CLIENT_ADMIN, interface: CLIENT },
  { _id: new ObjectID(), name: COACH, interface: CLIENT },
  { _id: new ObjectID(), name: AUXILIARY, interface: CLIENT },
  { _id: new ObjectID(), name: AUXILIARY_WITHOUT_COMPANY, interface: CLIENT },
  { _id: new ObjectID(), name: PLANNING_REFERENT, interface: CLIENT },
  { _id: new ObjectID(), name: HELPER, interface: CLIENT },
  { _id: new ObjectID(), name: TRAINING_ORGANISATION_MANAGER, interface: VENDOR },
  { _id: new ObjectID(), name: TRAINER, interface: VENDOR },
];

module.exports = { rolesList };
