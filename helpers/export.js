const moment = require('moment');
const get = require('lodash/get');
const {
  NEVER,
  EVENT_TYPE_LIST,
  REPETITION_FREQUENCY_TYPE_LIST,
  CANCELLATION_CONDITION_LIST,
  CANCELLATION_REASON_LIST,
  ABSENCE_TYPE_LIST,
  ABSENCE_NATURE_LIST,
  HOURLY,
} = require('./constants');
const UtilsHelper = require('./utils');
const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Contract = require('../models/Contract');
const Customer = require('../models/Customer');
const EventRepository = require('../repositories/EventRepository');

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
      get(event, 'auxiliary.identity.title', ''),
      get(event, 'auxiliary.identity.firstname', ''),
      get(event, 'auxiliary.identity.lastname', '').toUpperCase(),
      event.auxiliary ? 'Non' : 'Oui',
      get(event, 'customer.identity.title', ''),
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

exports.exportAbsencesHistory = async (startDate, endDate) => {
  const events = await EventRepository.getAbsencesForExport(startDate, endDate);

  const rows = [absenceExportHeader];
  for (const event of events) {
    const datetimeFormat = event.absenceNature === HOURLY ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';
    const cells = [
      ABSENCE_TYPE_LIST[event.absence],
      ABSENCE_NATURE_LIST[event.absenceNature],
      moment(event.startDate).format(datetimeFormat),
      moment(event.endDate).format(datetimeFormat),
      get(event.sector, 'name') || '',
      get(event, 'auxiliary.identity.title', ''),
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
    customerIdentity.title || '',
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
          identity.title || '',
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
  'Email',
  'Titre',
  'Nom',
  'Prenom',
  'Date de naissance',
  'Adresse',
  'Environnement',
  'Objectifs',
  'Autres',
  'Référente',
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

exports.exportCustomers = async () => {
  const customers = await Customer.find().populate('subscriptions.service').lean();
  const rows = [customerExportHeader];

  for (const cus of customers) {
    const birthDate = get(cus, 'identity.birthDate');
    const lastname = get(cus, 'identity.lastname');
    const mandates = get(cus, 'payment.mandates') || [];
    const lastMandate = UtilsHelper.getLastVersion(mandates, 'createdAt') || {};
    const signedAt = lastMandate.signedAt ? moment(lastMandate.signedAt).format('DD/MM/YYYY') : '';
    const subscriptionsCount = get(cus, 'subscriptions.length') || 0;

    const cells = [
      cus.email || '',
      get(cus, 'identity.title') || '',
      lastname ? lastname.toUpperCase() : '',
      get(cus, 'identity.firstname') || '',
      birthDate ? moment(birthDate).format('DD/MM/YYYY') : '',
      get(cus, 'contact.address.fullAddress') || '',
      get(cus, 'followUp.environment') || '',
      get(cus, 'followUp.objectives') || '',
      get(cus, 'followUp.misc') || '',
      get(cus, 'followUp.referent') || '',
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
