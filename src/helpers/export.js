const moment = require('moment');
const get = require('lodash/get');
const has = require('lodash/has');
const {
  NEVER,
  EVENT_TYPE_LIST,
  REPETITION_FREQUENCY_TYPE_LIST,
  CANCELLATION_CONDITION_LIST,
  CANCELLATION_REASON_LIST,
  ABSENCE_TYPE_LIST,
  ABSENCE_NATURE_LIST,
  HOURLY,
  CIVILITY_LIST,
} = require('./constants');
const UtilsHelper = require('./utils');
const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Contract = require('../models/Contract');
const Customer = require('../models/Customer');
const Role = require('../models/Role');
const User = require('../models/User');
const EventRepository = require('../repositories/EventRepository');
const { nationalities } = require('../data/nationalities.js');
const { countries } = require('../data/countries');
const { HELPER, AUXILIARY, PLANNING_REFERENT } = require('./constants.js');

const workingEventExportHeader = [
  'Type',
  'Heure interne',
  'Service',
  'Début',
  'Fin',
  'Durée',
  'Répétition',
  'Équipe',
  'Auxiliaire - Titre',
  'Auxiliaire - Prénom',
  'Auxiliaire - Nom',
  'A affecter',
  'Bénéficiaire - Titre',
  'Bénéficiaire - Nom',
  'Bénéficiaire - Prénom',
  'Divers',
  'Facturé',
  'Annulé',
  "Statut de l'annulation",
  "Raison de l'annulation",
];

const getServiceName = (service) => {
  if (!service) return;

  const lastVersion = UtilsHelper.getLastVersion(service.versions, 'startDate');

  return lastVersion.name;
};

exports.exportWorkingEventsHistory = async (startDate, endDate) => {
  const events = await EventRepository.getWorkingEventsForExport(startDate, endDate);

  const rows = [workingEventExportHeader];
  for (const event of events) {
    let repetition = get(event.repetition, 'frequency');
    repetition = NEVER === repetition ? '' : REPETITION_FREQUENCY_TYPE_LIST[repetition];

    const cells = [
      EVENT_TYPE_LIST[event.type],
      get(event, 'internalHour.name', ''),
      event.subscription ? getServiceName(event.subscription.service) : '',
      moment(event.startDate).format('DD/MM/YYYY HH:mm'),
      moment(event.endDate).format('DD/MM/YYYY HH:mm'),
      UtilsHelper.formatFloatForExport(moment(event.endDate).diff(event.startDate, 'h', true)),
      repetition || '',
      get(event.sector, 'name') || '',
      CIVILITY_LIST[get(event, 'auxiliary.identity.title')] || '',
      get(event, 'auxiliary.identity.firstname', ''),
      get(event, 'auxiliary.identity.lastname', '').toUpperCase(),
      event.auxiliary ? 'Non' : 'Oui',
      CIVILITY_LIST[get(event, 'customer.identity.title')] || '',
      get(event, 'customer.identity.lastname', '').toUpperCase(),
      get(event, 'customer.identity.firstname', ''),
      event.misc || '',
      event.isBilled ? 'Oui' : 'Non',
      event.isCancelled ? 'Oui' : 'Non',
      CANCELLATION_CONDITION_LIST[get(event, 'cancel.condition')] || '',
      CANCELLATION_REASON_LIST[get(event, 'cancel.reason')] || '',
    ];

    rows.push(cells);
  }

  return rows;
};

const absenceExportHeader = [
  'Type',
  'Nature',
  'Début',
  'Fin',
  'Équipe',
  'Auxiliaire - Titre',
  'Auxiliaire - Prénom',
  'Auxiliaire - Nom',
  'Divers',
];

exports.exportAbsencesHistory = async (startDate, endDate, credentials) => {
  const events = await EventRepository.getAbsencesForExport(startDate, endDate, credentials);

  const rows = [absenceExportHeader];
  for (const event of events) {
    const datetimeFormat = event.absenceNature === HOURLY ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';
    const cells = [
      ABSENCE_TYPE_LIST[event.absence],
      ABSENCE_NATURE_LIST[event.absenceNature],
      moment(event.startDate).format(datetimeFormat),
      moment(event.endDate).format(datetimeFormat),
      get(event.sector, 'name') || '',
      CIVILITY_LIST[get(event, 'auxiliary.identity.title')] || '',
      get(event, 'auxiliary.identity.firstname', ''),
      get(event, 'auxiliary.identity.lastname', '').toUpperCase(),
      event.misc || '',
    ];

    rows.push(cells);
  }

  return rows;
};

const exportBillSubscribtions = (bill) => {
  if (!bill.subscriptions) return '';

  const subscriptions = bill.subscriptions.map(sub =>
    `${sub.service.name} - ${sub.hours} heures - ${UtilsHelper.formatPrice(sub.inclTaxes)} TTC`);

  return subscriptions.join('\r\n');
};

const billAndCreditNoteExportHeader = [
  'Nature',
  'Identifiant',
  'Date',
  'Id Bénéficiaire',
  'Titre',
  'Nom',
  'Prénom',
  'Id tiers payeur',
  'Tiers payeur',
  'Montant HT en €',
  'Montant TTC en €',
  'Services',
];

const formatRowCommonsForExport = (document) => {
  const customerId = get(document.customer, '_id');
  const customerIdentity = get(document, 'customer.identity') || {};

  const cells = [
    document.number || '',
    document.date ? moment(document.date).format('DD/MM/YYYY') : '',
    customerId ? customerId.toHexString() : '',
    CIVILITY_LIST[customerIdentity.title] || '',
    (customerIdentity.lastname || '').toUpperCase(),
    customerIdentity.firstname || '',
  ];

  return cells;
};

const formatBillsForExport = (bills) => {
  const rows = [];

  for (const bill of bills) {
    const clientId = get(bill.client, '_id');
    let totalExclTaxesFormatted = '';

    if (bill.subscriptions != null) {
      let totalExclTaxes = 0;
      for (const sub of bill.subscriptions) {
        totalExclTaxes += sub.exclTaxes;
      }
      totalExclTaxesFormatted = UtilsHelper.formatFloatForExport(totalExclTaxes);
    }

    const cells = [
      'Facture',
      ...formatRowCommonsForExport(bill),
      clientId ? clientId.toHexString() : '',
      get(bill.client, 'name') || '',
      totalExclTaxesFormatted,
      UtilsHelper.formatFloatForExport(bill.netInclTaxes),
      exportBillSubscribtions(bill),
    ];

    rows.push(cells);
  }

  return rows;
};

const formatCreditNotesForExport = (creditNotes) => {
  const rows = [];

  for (const creditNote of creditNotes) {
    const totalExclTaxes = (creditNote.exclTaxesCustomer || 0) + (creditNote.exclTaxesTpp || 0);
    const totalInclTaxes = (creditNote.inclTaxesCustomer || 0) + (creditNote.inclTaxesTpp || 0);
    const tppId = get(creditNote.thirdPartyPayer, '_id');

    const cells = [
      'Avoir',
      ...formatRowCommonsForExport(creditNote),
      tppId ? tppId.toHexString() : '',
      get(creditNote.thirdPartyPayer, 'name') || '',
      UtilsHelper.formatFloatForExport(totalExclTaxes),
      UtilsHelper.formatFloatForExport(totalInclTaxes),
      get(creditNote, 'subscription.service.name') || '',
    ];

    rows.push(cells);
  }

  return rows;
};

exports.exportBillsAndCreditNotesHistory = async (startDate, endDate) => {
  const query = {
    date: { $lte: endDate, $gte: startDate },
  };

  const bills = await Bill.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'client' })
    .lean();

  const creditNotes = await CreditNote.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'thirdPartyPayer' })
    .lean();

  const rows = [billAndCreditNoteExportHeader];

  rows.push(...formatBillsForExport(bills));
  rows.push(...formatCreditNotesForExport(creditNotes));

  return rows;
};

const contractExportHeader = [
  'Type',
  'Titre',
  'Prénom',
  'Nom',
  'Date de début',
  'Date de fin',
  'Taux horaire',
  'Volume horaire hebdomadaire',
];

exports.exportContractHistory = async (startDate, endDate) => {
  const query = {
    'versions.startDate': { $lte: endDate, $gte: startDate },
  };

  const contracts = await Contract.find(query).populate({ path: 'user', select: 'identity' }).lean();
  const rows = [contractExportHeader];
  for (const contract of contracts) {
    const identity = get(contract, 'user.identity') || {};
    for (let i = 0, l = contract.versions.length; i < l; i++) {
      const version = contract.versions[i];
      if (version.startDate && moment(version.startDate).isBetween(startDate, endDate, null, '[]')) {
        rows.push([
          i === 0 ? 'Contrat' : 'Avenant',
          CIVILITY_LIST[identity.title] || '',
          identity.firstname || '',
          identity.lastname || '',
          version.startDate ? moment(version.startDate).format('DD/MM/YYYY') : '',
          version.endDate ? moment(version.endDate).format('DD/MM/YYYY') : '',
          UtilsHelper.formatFloatForExport(version.grossHourlyRate),
          version.weeklyHours || '',
        ]);
      }
    }
  }

  return rows;
};

const getServicesNameList = (subscriptions) => {
  let list = `${UtilsHelper.getLastVersion(subscriptions[0].service.versions, 'startDate').name}`;
  if (subscriptions.length > 1) {
    for (const sub of subscriptions.slice(1)) {
      list = list.concat(`\r\n ${UtilsHelper.getLastVersion(sub.service.versions, 'startDate').name}`);
    }
  }
  return list;
};

const customerExportHeader = [
  'Titre',
  'Nom',
  'Prenom',
  'Date de naissance',
  'Adresse',
  '1ère intervention',
  'Auxiliaire référent',
  'Environnement',
  'Objectifs',
  'Autres',
  'Nom associé au compte bancaire',
  'IBAN',
  'BIC',
  'RUM',
  'Date de signature du mandat',
  'Nombre de souscriptions',
  'Souscriptions',
  'Nombre de financements',
  'Date de création',
];

const formatIdentity = person => `${person.firstname} ${person.lastname}`;

exports.exportCustomers = async () => {
  const customers = await Customer.find()
    .populate('subscriptions.service')
    .populate({ path: 'firstIntervention', select: 'startDate' })
    .populate({ path: 'referent', select: 'identity.firstname identity.lastname' })
    .lean();
  const rows = [customerExportHeader];

  for (const cus of customers) {
    const birthDate = get(cus, 'identity.birthDate');
    const lastname = get(cus, 'identity.lastname');
    const mandates = get(cus, 'payment.mandates') || [];
    const lastMandate = UtilsHelper.getLastVersion(mandates, 'createdAt') || {};
    const signedAt = lastMandate.signedAt ? moment(lastMandate.signedAt).format('DD/MM/YYYY') : '';
    const subscriptionsCount = get(cus, 'subscriptions.length') || 0;
    const firstIntervention = get(cus, 'firstIntervention.startDate');

    const cells = [
      CIVILITY_LIST[get(cus, 'identity.title')] || '',
      lastname ? lastname.toUpperCase() : '',
      get(cus, 'identity.firstname') || '',
      birthDate ? moment(birthDate).format('DD/MM/YYYY') : '',
      get(cus, 'contact.primaryAddress.fullAddress') || '',
      firstIntervention ? moment(firstIntervention).format('DD/MM/YYYY') : '',
      has(cus, 'referent.identity') ? formatIdentity(get(cus, 'referent.identity')) : '',
      get(cus, 'followUp.environment') || '',
      get(cus, 'followUp.objectives') || '',
      get(cus, 'followUp.misc') || '',
      get(cus, 'payment.bankAccountOwner') || '',
      get(cus, 'payment.iban') || '',
      get(cus, 'payment.bic') || '',
      lastMandate.rum || '',
      signedAt,
      subscriptionsCount,
      subscriptionsCount ? getServicesNameList(cus.subscriptions) : '',
      get(cus, 'fundings.length') || 0,
      cus.createdAt ? moment(cus.createdAt).format('DD/MM/YYYY') : '',
    ];

    rows.push(cells);
  }

  return rows;
};

const auxiliaryExportHeader = [
  'Email',
  'Équipe',
  'Titre',
  'Nom',
  'Prénom',
  'Date de naissance',
  'Pays de naissance',
  'Departement de naissance',
  'Ville de naissance',
  'Nationalité',
  'N° de sécurité sociale',
  'Addresse',
  'Téléphone',
  'Nombre de contracts',
  'Date d\'inactivité',
  'Date de création',
];

exports.exportAuxiliaries = async (credentials) => {
  const roles = await Role.find({ name: { $in: [AUXILIARY, PLANNING_REFERENT] } });
  const roleIds = roles.map(role => role._id);
  const auxiliaries = await User
    .find({ role: { $in: roleIds } })
    .populate({ path: 'sector', match: { company: credentials.company._id } });
  const data = [auxiliaryExportHeader];

  for (const aux of auxiliaries) {
    const nationality = get(aux, 'identity.nationality');
    const lastname = get(aux, 'identity.lastname');
    const birthDate = get(aux, 'identity.birthDate');
    const address = get(aux, 'contact.address.fullAddress');
    const birthCountry = get(aux, 'identity.birthCountry');
    const { contracts, inactivityDate, createdAt } = aux;

    data.push([
      get(aux, 'local.email') || '',
      get(aux, 'sector.name') || '',
      CIVILITY_LIST[get(aux, 'identity.title')] || '',
      lastname ? lastname.toUpperCase() : '',
      get(aux, 'identity.firstname') || '',
      birthDate ? moment(birthDate).format('DD/MM/YYYY') : '',
      countries[birthCountry] || '',
      get(aux, 'identity.birthState') || '',
      get(aux, 'identity.birthCity') || '',
      nationality ? nationalities[nationality] : '',
      get(aux, 'identity.socialSecurityNumber') || '',
      address || '',
      get(aux, 'contact.phone') || '',
      contracts ? contracts.length : 0,
      inactivityDate ? moment(inactivityDate).format('DD/MM/YYYY') : '',
      createdAt ? moment(createdAt).format('DD/MM/YYYY') : '',
    ]);
  }

  return data;
};

const helperExportHeader = [
  'Email',
  'Aidant - Nom',
  'Aidant - Prénom',
  'Bénéficiaire - Titre',
  'Bénéficiaire - Nom',
  'Bénéficiaire - Prénom',
  'Bénéficiaire - Rue',
  'Bénéficiaire - Code postal',
  'Bénéficiaire - Ville',
  'Bénéficiaire - Statut',
  'Date de création',
];

exports.exportHelpers = async () => {
  const role = await Role.findOne({ name: HELPER });
  const helpers = await User.find({ role: role._id }).populate({
    path: 'customers',
    populate: { path: 'firstIntervention', select: 'startDate' },
  });
  const data = [helperExportHeader];

  for (const hel of helpers) {
    const customer = hel.customers && hel.customers[0];
    const status = get(customer, 'firstIntervention', null)
      ? 'Actif'
      : 'Inactif';

    data.push([
      get(hel, 'local.email', ''),
      get(hel, 'identity.lastname', '').toUpperCase(),
      get(hel, 'identity.firstname', ''),
      CIVILITY_LIST[get(customer, 'identity.title')] || '',
      get(customer, 'identity.lastname', '').toUpperCase(),
      get(customer, 'identity.firstname', ''),
      get(customer, 'contact.primaryAddress.street', ''),
      get(customer, 'contact.primaryAddress.zipCode', ''),
      get(customer, 'contact.primaryAddress.city', ''),
      status,
      hel.createdAt ? moment(hel.createdAt).format('DD/MM/YYYY') : '',
    ]);
  }

  return data;
};
