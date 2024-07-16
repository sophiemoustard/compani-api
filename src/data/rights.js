/* eslint-disable max-len */
const {
  AUXILIARY,
  COACH,
  PLANNING_REFERENT,
  CLIENT_ADMIN,
  VENDOR_ADMIN,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
  ERP,
  HOLDING_ADMIN,
} = require('../helpers/constants');

const rights = [
  { permission: 'attendances:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER], description: 'Uploader et supprimer des feuilles d\'émargement' },
  { permission: 'attendances:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER, CLIENT_ADMIN, COACH, HOLDING_ADMIN], description: 'Consulter et télécharger des feuilles d\'émargement' },
  { permission: 'bills:read', rolesConcerned: [CLIENT_ADMIN, COACH], subscription: ERP, description: 'Consulter les informations de facturation' },
  { permission: 'companies:create', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Créer une entreprise' },
  { permission: 'companies:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Editer les informations de la compagnie' },
  { permission: 'companies:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, CLIENT_ADMIN, HOLDING_ADMIN], description: 'Consulter les données des organisations' },
  { permission: 'companylinkrequests:edit', rolesConcerned: [CLIENT_ADMIN, COACH], description: 'Consulter les demandes de rattachement à la structure' },
  { permission: 'vendorcompanies:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, COACH, CLIENT_ADMIN], description: 'Consulter les infos de configuration générale des formations' },
  { permission: 'vendorcompanies:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Éditer les infos de configuration générale des formations' },
  { permission: 'coursebills:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, CLIENT_ADMIN, HOLDING_ADMIN], description: 'Consulter les informations de facturation' },
  { permission: 'coursebills:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Editer une facture ou un avoir' },
  { permission: 'courses:create', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Créer une formation' },
  { permission: 'courses:edit', rolesConcerned: [CLIENT_ADMIN, COACH, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER, HOLDING_ADMIN], description: 'Editer les formations' },
  { permission: 'courses:read', rolesConcerned: [CLIENT_ADMIN, COACH, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER, HOLDING_ADMIN], description: 'Consulter les données des formations' },
  { permission: 'email:send', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER, CLIENT_ADMIN, COACH], description: 'Envoyer un email' },
  { permission: 'exports:edit', rolesConcerned: [CLIENT_ADMIN, COACH], description: 'Exports' },
  { permission: 'exports:read', rolesConcerned: [CLIENT_ADMIN, COACH, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], subscription: ERP, description: 'Exporter des données' },
  { permission: 'holdings:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Créer et modifier une société mère' },
  { permission: 'holdings:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER], description: 'Consulter la liste des sociétés mères' },
  { permission: 'programs:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Editer les programmes' },
  { permission: 'programs:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Consulter les données des programmes' },
  { permission: 'questionnaires:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Editer les questionnaires' },
  { permission: 'questionnaires:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER], description: 'Consulter les données des questionnaires' },
  { permission: 'questionnairehistories:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER], description: 'Editer les historiques de questionnaire' },
  { permission: 'roles:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, CLIENT_ADMIN, COACH], description: 'Consulter les roles' },
  { permission: 'taxcertificates:read', rolesConcerned: [CLIENT_ADMIN, COACH], subscription: ERP, description: 'Consulter une attestation fiscale' },
  { permission: 'trainermissions:edit', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Créer et éditer les ordres de mission' },
  { permission: 'trainermissions:read', rolesConcerned: [VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Récupérer les ordres de mission' },
  { permission: 'trainingcontracts:read', rolesConcerned: [CLIENT_ADMIN, COACH, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER], description: 'Récupérer les conventions de formation' },
  { permission: 'users:edit', rolesConcerned: [CLIENT_ADMIN, COACH, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER, HOLDING_ADMIN], description: 'Editer un(e) utilisateur(rice)' },
  { permission: 'users:exist', rolesConcerned: [CLIENT_ADMIN, COACH, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER], description: 'Verifier si un email existe déjà en base' },
  { permission: 'users:list', rolesConcerned: [CLIENT_ADMIN, COACH, AUXILIARY, PLANNING_REFERENT, VENDOR_ADMIN, TRAINING_ORGANISATION_MANAGER, TRAINER, HOLDING_ADMIN], description: 'Accéder à la liste des utilisateurs' },
];

module.exports = { rights };
