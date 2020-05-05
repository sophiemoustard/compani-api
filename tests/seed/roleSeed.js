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
  { _id: new ObjectID(), description: 'Consulter la liste des programmes', permission: 'programs:read' },
  { _id: new ObjectID(), description: 'Editer une programme', permission: 'programs:edit' },
  { _id: new ObjectID(), description: 'Consulter la liste des formations', permission: 'courses:read' },
  { _id: new ObjectID(), description: 'Editer une formation', permission: 'courses:edit' },
  { _id: new ObjectID(), description: 'Créer une formation', permission: 'courses:create' },
  { _id: new ObjectID(), description: 'Envoyer un sms', permission: 'sms:send' },
];
const vendorAdminRights = [
  'companies:create',
  'companies:edit',
  'users:edit',
  'users:list',
  'companies:read',
  'programs:read',
  'programs:edit',
  'courses:read',
  'courses:edit',
  'courses:create',
];
const trainingOrganisationManagerRights = [
  'companies:create',
  'companies:edit',
  'users:edit',
  'users:list',
  'companies:read',
  'programs:read',
  'programs:edit',
  'courses:read',
  'courses:edit',
  'courses:create',
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
  'events:read',
  'events:edit',
  'customers:create',
  'customers:read',
  'customers:edit',
  'customers:administrative:edit',
  'roles:read',
  'paydocuments:edit',
  'taxcertificates:read',
  'taxcertificates:edit',
  'establishments:edit',
  'establishments:read',
  'sms:send',
];
const coachRights = [
  'config:read',
  'bills:read',
  'payments:edit',
  'pay:read',
  'contracts:edit',
  'exports:read',
  'users:list',
  'users:edit',
  'events:edit',
  'events:read',
  'customers:create',
  'customers:read',
  'customers:edit',
  'customers:administrative:edit',
  'roles:read',
  'paydocuments:edit',
  'taxcertificates:read',
  'taxcertificates:edit',
  'establishments:read',
  'sms:send',
];
const auxiliaryRights = [
  'config:read',
  'pay:read',
  'users:list',
  'events:read',
  'events:edit',
  'customers:read',
  'customers:edit',
];
const planningReferentRights = [...auxiliaryRights, 'events:edit'];
const helperRights = [];
const auxiliaryWithoutCompanyRights = [];
const trainerRights = [
  'courses:edit',
];

const rolesList = [
  {
    _id: new ObjectID(),
    name: VENDOR_ADMIN,
    interface: VENDOR,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: vendorAdminRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: CLIENT_ADMIN,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: clientAdminRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: COACH,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: coachRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: AUXILIARY,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: auxiliaryRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: AUXILIARY_WITHOUT_COMPANY,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: auxiliaryWithoutCompanyRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: PLANNING_REFERENT,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: planningReferentRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: HELPER,
    interface: CLIENT,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: helperRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: TRAINING_ORGANISATION_MANAGER,
    interface: VENDOR,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: trainingOrganisationManagerRights.includes(right.permission),
    })),
  },
  {
    _id: new ObjectID(),
    name: TRAINER,
    interface: VENDOR,
    rights: rightsList.map(right => ({
      right_id: right._id,
      hasAccess: trainerRights.includes(right.permission),
    })),
  },
];

module.exports = { rolesList, rightsList };
