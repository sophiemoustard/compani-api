const moment = require('moment');
const get = require('lodash/get');
const has = require('lodash/has');
const pick = require('lodash/pick');
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
  HELPER,
  AUXILIARY,
  PLANNING_REFERENT,
  COMPANY_CONTRACT,
  END_CONTRACT_REASONS,
  SURCHARGES,
  PAYMENT_NATURE_LIST,
  PAYMENT_TYPES_LIST,
} = require('./constants');
const UtilsHelper = require('./utils');
const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Contract = require('../models/Contract');
const Customer = require('../models/Customer');
const Role = require('../models/Role');
const User = require('../models/User');
const SectorHistory = require('../models/SectorHistory');
const Pay = require('../models/Pay');
const Payment = require('../models/Payment');
const FinalPay = require('../models/FinalPay');
const EventRepository = require('../repositories/EventRepository');
const { nationalities } = require('../data/nationalities.js');
const { countries } = require('../data/countries');

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

exports.exportWorkingEventsHistory = async (startDate, endDate, credentials) => {
  const companyId = get(credentials, 'company._id');
  const events = await EventRepository.getWorkingEventsForExport(startDate, endDate, companyId);

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
      get(event, 'sector.name') || get(event, 'auxiliary.sector.name') || '',
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
      get(event, 'auxiliary.sector.name') || '',
      CIVILITY_LIST[get(event, 'auxiliary.identity.title')] || '',
      get(event, 'auxiliary.identity.firstname', ''),
      get(event, 'auxiliary.identity.lastname', '').toUpperCase(),
      event.misc || '',
    ];

    rows.push(cells);
  }

  return rows;
};

const exportBillSubscriptions = (bill) => {
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
  'Date de création',
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

    const createdAt = get(bill, 'createdAt', null);
    const cells = [
      'Facture',
      ...formatRowCommonsForExport(bill),
      clientId ? clientId.toHexString() : '',
      get(bill.client, 'name') || '',
      totalExclTaxesFormatted,
      UtilsHelper.formatFloatForExport(bill.netInclTaxes),
      exportBillSubscriptions(bill),
      createdAt ? moment(createdAt).format('DD/MM/YYYY') : '',
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

    const createdAt = get(creditNote, 'createdAt', null);
    const cells = [
      'Avoir',
      ...formatRowCommonsForExport(creditNote),
      tppId ? tppId.toHexString() : '',
      get(creditNote.thirdPartyPayer, 'name') || '',
      UtilsHelper.formatFloatForExport(totalExclTaxes),
      UtilsHelper.formatFloatForExport(totalInclTaxes),
      get(creditNote, 'subscription.service.name') || '',
      createdAt ? moment(createdAt).format('DD/MM/YYYY') : '',
    ];

    rows.push(cells);
  }

  return rows;
};

exports.exportBillsAndCreditNotesHistory = async (startDate, endDate, credentials) => {
  const query = {
    date: { $lte: endDate, $gte: startDate },
    company: get(credentials, 'company._id', null),
  };

  const bills = await Bill.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate('client')
    .lean();

  const creditNotes = await CreditNote.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate('thirdPartyPayer')
    .lean();

  const rows = [billAndCreditNoteExportHeader];

  rows.push(...formatBillsForExport(bills));
  rows.push(...formatCreditNotesForExport(creditNotes));

  return rows;
};

const contractExportHeader = [
  'Type',
  'Id de l\'auxiliaire',
  'Titre',
  'Prénom',
  'Nom',
  'Date de début',
  'Date de fin',
  'Taux horaire',
  'Volume horaire hebdomadaire',
];

exports.exportContractHistory = async (startDate, endDate, credentials) => {
  const query = {
    company: get(credentials, 'company._id', null),
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
          get(contract, 'user._id', ''),
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
  'Statut',
];

const formatIdentity = person => `${person.firstname} ${person.lastname}`;

exports.exportCustomers = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const customers = await Customer.find({ company: companyId })
    .populate({ path: 'subscriptions.service' })
  // need the match as it is a virtual populate
    .populate({ path: 'firstIntervention', select: 'startDate', match: { company: companyId } })
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
      firstIntervention ? 'Actif' : 'Inactif',
    ];

    rows.push(cells);
  }

  return rows;
};

const auxiliaryExportHeader = [
  'Email',
  'Équipe',
  'Id de l\'auxiliaire',
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
  'Établissement',
  'Date de début de contrat prestataire',
  'Date de fin de contrat prestataire',
  'Date d\'inactivité',
  'Date de création',
];

const getDataForAuxiliariesExport = (aux, contractsLength, contract) => {
  const nationality = get(aux, 'identity.nationality');
  const lastname = get(aux, 'identity.lastname');
  const birthDate = get(aux, 'identity.birthDate');
  const address = get(aux, 'contact.address.fullAddress');
  const birthCountry = get(aux, 'identity.birthCountry');
  const { inactivityDate, createdAt } = aux;

  return [
    get(aux, 'local.email') || '',
    get(aux, 'sector.name') || '',
    aux._id,
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
    contractsLength,
    get(aux, 'establishment.name') || '',
    get(contract, 'startDate', null) ? moment(contract.startDate).format('DD/MM/YYYY') : '',
    get(contract, 'endDate', null) ? moment(contract.endDate).format('DD/MM/YYYY') : '',
    inactivityDate ? moment(inactivityDate).format('DD/MM/YYYY') : '',
    createdAt ? moment(createdAt).format('DD/MM/YYYY') : '',
  ];
};

exports.exportAuxiliaries = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const roles = await Role.find({ name: { $in: [AUXILIARY, PLANNING_REFERENT] } }).lean();
  const roleIds = roles.map(role => role._id);
  const auxiliaries = await User
    .find({ role: { $in: roleIds }, company: companyId })
    .populate({ path: 'sector', select: '_id sector', match: { company: companyId } })
    .populate({ path: 'contracts', match: { status: COMPANY_CONTRACT } })
    .populate({ path: 'establishment', select: 'name', match: { company: companyId } })
    .lean({ autopopulate: true, virtuals: true });
  const data = [auxiliaryExportHeader];

  for (const aux of auxiliaries) {
    const { contracts } = aux;
    if (contracts && contracts.length) {
      for (const contract of contracts) {
        data.push(getDataForAuxiliariesExport(aux, contracts.length, contract));
      }
    } else {
      data.push(getDataForAuxiliariesExport(aux, 0));
    }
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

exports.exportHelpers = async (credentials) => {
  const role = await Role.findOne({ name: HELPER }).lean();
  const companyId = get(credentials, 'company._id', null);
  const helpers = await User
    .find({ role: role._id, company: companyId })
    .populate({
      path: 'customers',
      populate: { path: 'firstIntervention', select: 'startDate', match: { company: companyId } },
    })
    .lean();
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

const sectorExportHeader = [
  'Equipe',
  'Id de l\'auxiliaire',
  'Nom',
  'Prénom',
  'Date d\'arrivée dans l\'équipe',
  'Date de départ de l\'équipe',
];

exports.exportSectors = async (credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const sectorHistories = await SectorHistory
    .find({ company: companyId, startDate: { $exists: true } })
    .populate({ path: 'sector', select: '_id name' })
    .populate({ path: 'auxiliary', select: '_id identity.firstname identity.lastname' })
    .lean();
  const data = [sectorExportHeader];

  for (const sectorHistory of sectorHistories) {
    data.push([
      get(sectorHistory, 'sector.name', null) || '',
      get(sectorHistory, 'auxiliary._id', null) || '',
      get(sectorHistory, 'auxiliary.identity.lastname', null) || '',
      get(sectorHistory, 'auxiliary.identity.firstname', null) || '',
      moment(sectorHistory.startDate).format('DD/MM/YYYY'),
      sectorHistory.endDate ? moment(sectorHistory.endDate).format('DD/MM/YYYY') : '',
    ]);
  }

  return data;
};

const payExportHeader = [
  'Titre',
  'Prénom',
  'Nom',
  'Equipe',
  'Date d\'embauche',
  'Début',
  'Date de notif',
  'Motif',
  'Fin',
  'Heures contrat',
  'Heures à travailler',
  'Heures travaillées',
  'Dont exo non majo',
  'Dont exo et majo',
  'Détails des majo exo',
  'Dont non exo et non majo',
  'Dont non exo et majo',
  'Détails des majo non exo',
  'Solde heures',
  'Dont diff mois précédent',
  'Compteur',
  'Heures sup à payer',
  'Heures comp à payer',
  'Mutuelle',
  'Transport',
  'Autres frais',
  'Prime',
  'Indemnité',
];

const getHiringDate = (contracts) => {
  if (!contracts || contracts.length === 0) return;
  if (contracts.length === 1) return contracts[0].startDate;

  return contracts.map(contract => contract.startDate).sort((a, b) => new Date(a) - new Date(b))[0];
};

const formatLines = (surchargedPlanDetails, planName) => {
  const surcharges = Object.entries(pick(surchargedPlanDetails, Object.keys(SURCHARGES)));
  if (surcharges.length === 0) return;

  const lines = [planName];
  for (const [surchageKey, surcharge] of surcharges) {
    lines.push(`${SURCHARGES[surchageKey]}, ${surcharge.percentage}%, ${UtilsHelper.formatFloatForExport(surcharge.hours)}h`);
  }

  return lines.join('\r\n');
};

exports.formatSurchargedDetailsForExport = (pay, key) => {
  if (!pay || (!pay[key] && (!pay.diff || !pay.diff[key]))) return '';

  const formattedPlans = [];
  if (pay[key]) {
    for (const surchargedPlanDetails of pay[key]) {
      const lines = formatLines(surchargedPlanDetails, surchargedPlanDetails.planName);
      if (lines) formattedPlans.push(lines);
    }
  }
  if (pay.diff && pay.diff[key]) {
    for (const surchargedPlanDetails of pay.diff[key]) {
      const lines = formatLines(surchargedPlanDetails, `${surchargedPlanDetails.planName} (M-1)`);
      if (lines) formattedPlans.push(lines);
    }
  }

  return formattedPlans.join('\r\n\r\n');
};

exports.formatHoursWithDiff = (pay, key) => {
  let hours = pay[key];
  if (pay.diff && pay.diff[key]) hours += pay.diff[key];

  return UtilsHelper.formatFloatForExport(hours);
};

exports.exportPayAndFinalPayHistory = async (startDate, endDate, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = {
    endDate: { $lte: moment(endDate).endOf('M').toDate() },
    startDate: { $gte: moment(startDate).startOf('M').toDate() },
    company: companyId,
  };

  const pays = await Pay.find(query)
    .sort({ startDate: 'desc' })
    .populate({
      path: 'auxiliary',
      select: 'identity sector contracts',
      populate: [
        { path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } },
        { path: 'contracts' },
      ],
    })
    .lean({ autopopulate: true, virtuals: true });

  const finalPays = await FinalPay.find(query)
    .sort({ startDate: 'desc' })
    .populate({
      path: 'auxiliary',
      select: 'identity sector contracts',
      populate: [
        { path: 'sector', select: '_id sector', match: { company: get(credentials, 'company._id', null) } },
        { path: 'contracts' },
      ],
    })
    .lean({ autopopulate: true, virtuals: true });

  const rows = [payExportHeader];
  const paysAndFinalPay = [...pays, ...finalPays];
  for (const pay of paysAndFinalPay) {
    const hiringDate = getHiringDate(pay.auxiliary.contracts);
    const cells = [
      CIVILITY_LIST[get(pay, 'auxiliary.identity.title')] || '',
      get(pay, 'auxiliary.identity.firstname') || '',
      get(pay, 'auxiliary.identity.lastname').toUpperCase() || '',
      get(pay.auxiliary, 'sector.name') || '',
      hiringDate ? moment(hiringDate).format('DD/MM/YYYY') : '',
      moment(pay.startDate).format('DD/MM/YYYY'),
      pay.endNotificationDate ? moment(pay.endNotificationDate).format('DD/MM/YYYY') : '',
      pay.endReason ? END_CONTRACT_REASONS[pay.endReason] : '',
      moment(pay.endDate).format('DD/MM/YYYY'),
      UtilsHelper.formatFloatForExport(pay.contractHours),
      exports.formatHoursWithDiff(pay, 'hoursToWork'),
      exports.formatHoursWithDiff(pay, 'workedHours'),
      exports.formatHoursWithDiff(pay, 'notSurchargedAndExempt'),
      exports.formatHoursWithDiff(pay, 'surchargedAndExempt'),
      exports.formatSurchargedDetailsForExport(pay, 'surchargedAndExemptDetails'),
      exports.formatHoursWithDiff(pay, 'notSurchargedAndNotExempt'),
      exports.formatHoursWithDiff(pay, 'surchargedAndNotExempt'),
      exports.formatSurchargedDetailsForExport(pay, 'surchargedAndNotExemptDetails'),
      exports.formatHoursWithDiff(pay, 'hoursBalance'),
      get(pay, 'diff.hoursBalance') ? UtilsHelper.formatFloatForExport(pay.diff.hoursBalance) : '0,00',
      UtilsHelper.formatFloatForExport(pay.hoursCounter),
      UtilsHelper.formatFloatForExport(pay.overtimeHours),
      UtilsHelper.formatFloatForExport(pay.additionalHours),
      pay.mutual ? 'Oui' : 'Non',
      UtilsHelper.formatFloatForExport(pay.transport),
      UtilsHelper.formatFloatForExport(pay.otherFees),
      UtilsHelper.formatFloatForExport(pay.bonus),
      pay.compensation ? UtilsHelper.formatFloatForExport(pay.compensation) : '0,00',
    ];

    rows.push(cells);
  }

  return rows;
};

const paymentExportHeader = [
  'Nature',
  'Identifiant',
  'Date',
  'Id Bénéficiaire',
  'Titre',
  'Nom',
  'Prénom',
  'Id tiers payeur',
  'Tiers payeur',
  'Moyen de paiement',
  'Montant TTC en €',
];

exports.exportPaymentsHistory = async (startDate, endDate, credentials) => {
  const query = {
    date: { $lte: endDate, $gte: startDate },
    company: get(credentials, 'company._id'),
  };

  const payments = await Payment.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'client' })
    .lean();

  const rows = [paymentExportHeader];

  for (const payment of payments) {
    const customerId = get(payment.customer, '_id');
    const clientId = get(payment.client, '_id');
    const cells = [
      PAYMENT_NATURE_LIST[payment.nature],
      payment.number || '',
      moment(payment.date).format('DD/MM/YYYY'),
      customerId ? customerId.toHexString() : '',
      CIVILITY_LIST[get(payment, 'customer.identity.title')] || '',
      get(payment, 'customer.identity.lastname', '').toUpperCase(),
      get(payment, 'customer.identity.firstname', ''),
      clientId ? clientId.toHexString() : '',
      get(payment.client, 'name') || '',
      PAYMENT_TYPES_LIST[payment.type] || '',
      UtilsHelper.formatFloatForExport(payment.netInclTaxes),
    ];

    rows.push(cells);
  }

  return rows;
};
