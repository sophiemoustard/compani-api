
const { ObjectID } = require('mongodb');
const uuidv4 = require('uuid/v4');
const Role = require('../src/models/Role');
const Right = require('../src/models/Right');
const User = require('../src/models/User');
const Company = require('../src/models/Company');
const Sector = require('../src/models/Sector');
const SectorHistory = require('../src/models/SectorHistory');
const {
  CLIENT,
  CLIENT_ADMIN,
} = require('../src/helpers/constants');

const rightsList = [
  { _id: new ObjectID(), description: 'Edit config', permission: 'config:edit' },
  { _id: new ObjectID(), description: 'Read config', permission: 'config:read' },
  { _id: new ObjectID(), description: 'Edit billing info', permission: 'bills:edit' },
  { _id: new ObjectID(), description: 'Read billing info', permission: 'bills:read' },
  { _id: new ObjectID(), description: 'Edit payment info', permission: 'payments:edit' },
  { _id: new ObjectID(), description: 'Create payment list', permission: 'payments:list:create' },
  { _id: new ObjectID(), description: 'Edit pay info', permission: 'pay:edit' },
  { _id: new ObjectID(), description: 'Read pay info', permission: 'pay:read' },
  { _id: new ObjectID(), description: 'Editer la liste de contrats', permission: 'contracts:edit' },
  { _id: new ObjectID(), description: 'Exporter des données', permission: 'exports:read' },
  { _id: new ObjectID(), description: 'Lister les utilisateurs', permission: 'users:list', name: 'users-list' },
  { _id: new ObjectID(), description: 'Editer un utilisateur', permission: 'users:edit', name: 'users-edit' },
  { _id: new ObjectID(), description: 'Editer un évènement', permission: 'events:edit', name: 'events-edit' },
  { _id: new ObjectID(), description: 'Consulter les évènements', permission: 'events:read', name: 'events-read' },
  { _id: new ObjectID(), description: 'Editer son évènement', permission: 'events:own:edit', name: 'events-own-edit' },
  { _id: new ObjectID(), description: 'Créer ou supprimer des bénéficiaires', permission: 'customers:create' },
  { _id: new ObjectID(), description: 'Consulter les données de bénéficiaires', permission: 'customers:read' },
  { _id: new ObjectID(), description: 'Editer les données de bénéficiaires', permission: 'customers:edit' },
  {
    _id: new ObjectID(),
    description: 'Editer les données administratives de bénéficiaires',
    permission: 'customers:administrative:edit',
  },
  { _id: new ObjectID(), description: 'Editer les informations de la compagnie', permission: 'companies:edit' },
  { _id: new ObjectID(), description: 'Consulter les roles', permission: 'roles:read' },
  { _id: new ObjectID(), description: 'Editer les documents de paie', permission: 'paydocuments:edit' },
  { _id: new ObjectID(), description: 'Créer une entreprise', permission: 'companies:create' },
  { _id: new ObjectID(), description: 'Consulter les attestions fiscales', permission: 'taxcertificates:read' },
  { _id: new ObjectID(), description: 'Éditer une attestion fiscale', permission: 'taxcertificates:edit' },
  { _id: new ObjectID(), description: 'Editer un établissement', permission: 'establishments:edit' },
  { _id: new ObjectID(), description: 'Consulter la liste des établissements', permission: 'establishments:read' },
  { _id: new ObjectID(), description: 'Consulter la liste des structures', permission: 'companies:read' },
  { _id: new ObjectID(), description: 'Consulter la liste des formations', permission: 'courses:read' },
  { _id: new ObjectID(), description: 'Editer une formation', permission: 'courses:edit' },
];

const clientAdminRights = [
  'config:edit',
  'config:read',
  'bills:edit',
  'bills:read',
  'payments:edit',
  'payments:list:create',
  'pay:edit',
  'pay:read',
  'contracts:edit',
  'exports:read',
  'users:list',
  'users:edit',
  'events:edit',
  'events:read',
  'events:own:edit',
  'customers:create',
  'customers:read',
  'customers:edit',
  'customers:administrative:edit',
  'companies:edit',
  'roles:read',
  'paydocuments:edit',
  'taxcertificates:read',
  'taxcertificates:edit',
  'establishments:edit',
  'establishments:read',
];

const rolesList = [
  {
    _id: new ObjectID(),
    name: CLIENT_ADMIN,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: clientAdminRights.includes(right.permission),
    })),
  },
];

const authCompany = {
  _id: new ObjectID(),
  name: 'Test SAS',
  tradeName: 'Test',
  prefixNumber: 101,
  iban: '1234',
  bic: '5678',
  ics: '9876',
  folderId: '0987654321',
  directDebitsFolderId: '1234567890',
  customersFolderId: 'mnbvcxz',
  auxiliariesFolderId: 'iuytre',
  customersConfig: {
    billingPeriod: 'two_weeks',
  },
};

const userList = [
  {
    _id: new ObjectID(),
    identity: { firstname: 'client_admin', lastname: 'Chef' },
    refreshToken: uuidv4(),
    local: { email: 'admin@alenvi.io', password: '123456' },
    role: { client: rolesList.find(role => role.name === CLIENT_ADMIN)._id },
    company: authCompany._id,
  },
];

const seedDb = async () => {
  await Role.deleteMany({});
  await Right.deleteMany({});
  await User.deleteMany({});
  await Company.deleteMany({});
  await Sector.deleteMany({});
  await SectorHistory.deleteMany({});

  await new Company(authCompany).save();
  await Right.insertMany(rightsList);
  await Role.insertMany(rolesList);
  for (let i = 0; i < userList.length; i++) {
    await (new User(userList[i])).save();
  }
};


module.exports = { seedDb };

