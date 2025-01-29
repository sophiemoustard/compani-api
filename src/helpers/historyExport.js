const get = require('lodash/get');
const pick = require('lodash/pick');
const { keyBy } = require('lodash');
const {
  NO_DATA,
  NEVER,
  EVENT_TYPE_LIST,
  REPETITION_FREQUENCY_TYPE_LIST,
  CANCELLATION_CONDITION_LIST,
  CANCELLATION_REASON_LIST,
  ABSENCE_TYPE_LIST,
  ABSENCE_NATURE_LIST,
  HOURLY,
  CIVILITY_LIST,
  END_CONTRACT_REASONS,
  SURCHARGES,
  PAYMENT_NATURE_LIST,
  PAYMENT_TYPES_LIST,
  INTERNAL_HOUR,
  INTERVENTION,
  MANUAL_TIME_STAMPING,
  TIMESTAMPING_ACTION_TYPE_LIST,
  MANUAL_TIME_STAMPING_REASONS,
  EVENT_TRANSPORT_MODE_LIST,
  TIME_STAMPING_ACTIONS,
} = require('./constants');
const DatesHelper = require('./dates');
const { CompaniDate } = require('./dates/companiDates');
const { CompaniDuration } = require('./dates/companiDurations');
const UtilsHelper = require('./utils');
const NumbersHelper = require('./numbers');
const DraftPayHelper = require('./draftPay');
const DistanceMatrixHelper = require('./distanceMatrix');
const Event = require('../models/Event');
const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Contract = require('../models/Contract');
const Pay = require('../models/Pay');
const Payment = require('../models/Payment');
const FinalPay = require('../models/FinalPay');
const CourseSlot = require('../models/CourseSlot');
const EventRepository = require('../repositories/EventRepository');
const UserRepository = require('../repositories/UserRepository');

const workingEventExportHeader = [
  'Type',
  'Heure interne',
  'Service',
  'Début planifié',
  'Début horodaté',
  'Type d\'horodatage',
  'Motif',
  'Fin planifiée',
  'Fin horodatée',
  'Type d\'horodatage',
  'Motif',
  'Durée',
  'Répétition',
  'Déplacement véhiculé avec bénéficiaire',
  'Mode de transport spécifique',
  'Équipe',
  'Id Auxiliaire',
  'Auxiliaire - Titre',
  'Auxiliaire - Prénom',
  'Auxiliaire - Nom',
  'A affecter',
  'Id Bénéficiaire',
  'Bénéficiaire - Titre',
  'Bénéficiaire - Nom',
  'Bénéficiaire - Prénom',
  'Divers',
  'Facturé',
  'Annulé',
  'Statut de l\'annulation',
  'Raison de l\'annulation',
];

const getServiceName = (service) => {
  if (!service) return null;

  const lastVersion = UtilsHelper.getLastVersion(service.versions, 'startDate');

  return lastVersion.name;
};

const getMatchingSector = (histories, event) => histories
  .filter(sh => CompaniDate(sh.startDate).isBefore(event.startDate))
  .sort(DatesHelper.descendingSort('startDate'))[0];

const displayDate = (date) => {
  if (!date) return '';

  const dateToFormat = CompaniDate(date).toLocalISO();
  return dateToFormat.replace(/-/g, '/').replace('T', ' ').slice(0, 19);
};

exports.EVENT_PROJECTION_FILEDS = {
  type: 1,
  startDate: 1,
  endDate: 1,
  auxiliary: 1,
  sector: 1,
  customer: 1,
  subscription: 1,
  internalHour: 1,
  address: 1,
  misc: 1,
  repetition: 1,
  isCancelled: 1,
  cancel: 1,
  isBilled: 1,
  transportMode: 1,
  kmDuringEvent: 1,
};

exports.getWorkingEventsForExport = async (startDate, endDate, companyId) => {
  const query = {
    company: companyId,
    type: { $in: [INTERVENTION, INTERNAL_HOUR] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  };

  const events = await Event.find(query, exports.EVENT_PROJECTION_FILEDS)
    .sort({ startDate: -1 })
    .populate({
      path: 'customer',
      select: 'subscriptions identity',
      populate: { path: 'subscriptions', select: 'service', populate: { path: 'service', select: 'versions' } },
    })
    .populate({ path: 'internalHour', select: 'name' })
    .populate({ path: 'sector', select: 'name' })
    .populate({
      path: 'histories',
      match: {
        action: { $in: TIME_STAMPING_ACTIONS },
        company: companyId,
        $or: [{ isCancelled: false }, { isCancelled: { $exists: false } }],
      },
      select: 'update action manualTimeStampingReason',
    })
    .lean();

  return events.map((event) => {
    if (event.type !== INTERVENTION) return event;

    const { subscription, customer } = event;

    return {
      ...event,
      subscription: customer.subscriptions.find(sub => UtilsHelper.areObjectIdsEquals(sub._id, subscription)),
    };
  });
};

exports.exportWorkingEventsHistory = async (startDate, endDate, credentials) => {
  const companyId = get(credentials, 'company._id');
  const events = await exports.getWorkingEventsForExport(startDate, endDate, companyId);
  const auxiliaryIds = [...new Set(events.map(ev => ev.auxiliary))];
  const auxiliaries = keyBy(await UserRepository.getAuxiliariesWithSectorHistory(auxiliaryIds, companyId), '_id');

  const rows = [workingEventExportHeader];

  for (const event of events) {
    let repetition = get(event.repetition, 'frequency');
    repetition = NEVER === repetition ? '' : REPETITION_FREQUENCY_TYPE_LIST[repetition];

    const auxiliary = auxiliaries[event.auxiliary];
    const auxiliarySector = auxiliary ? getMatchingSector(auxiliary.sectorHistory, event) : null;

    const startHourTimeStamping = event.histories.find(history => get(history, 'update.startHour'));
    const endHourTimeStamping = event.histories.find(history => get(history, 'update.endHour'));

    const cells = [
      EVENT_TYPE_LIST[event.type],
      get(event, 'internalHour.name', ''),
      event.subscription ? getServiceName(event.subscription.service) : '',
      displayDate(startHourTimeStamping ? get(startHourTimeStamping, 'update.startHour.from') : event.startDate),
      startHourTimeStamping ? displayDate(get(startHourTimeStamping, 'update.startHour.to')) : '',
      TIMESTAMPING_ACTION_TYPE_LIST[get(startHourTimeStamping, 'action')] || '',
      get(startHourTimeStamping, 'action') === MANUAL_TIME_STAMPING
        ? MANUAL_TIME_STAMPING_REASONS[get(startHourTimeStamping, 'manualTimeStampingReason')] : '',
      displayDate(endHourTimeStamping ? get(endHourTimeStamping, 'update.endHour.from') : event.endDate),
      endHourTimeStamping ? displayDate(get(endHourTimeStamping, 'update.endHour.to')) : '',
      TIMESTAMPING_ACTION_TYPE_LIST[get(endHourTimeStamping, 'action')] || '',
      get(endHourTimeStamping, 'action') === MANUAL_TIME_STAMPING
        ? MANUAL_TIME_STAMPING_REASONS[get(endHourTimeStamping, 'manualTimeStampingReason')] : '',
      UtilsHelper.formatFloatForExport(CompaniDate(event.endDate).oldDiff(event.startDate, 'hours', true).hours),
      repetition || '',
      event.kmDuringEvent ? UtilsHelper.formatFloatForExport(event.kmDuringEvent) : '',
      EVENT_TRANSPORT_MODE_LIST[get(event, 'transportMode')] || '',
      get(event, 'sector.name') || get(auxiliarySector, 'sector.name') || '',
      get(auxiliary, '_id') || '',
      CIVILITY_LIST[get(auxiliary, 'identity.title')] || '',
      get(auxiliary, 'identity.firstname', ''),
      get(auxiliary, 'identity.lastname', '').toUpperCase(),
      event.auxiliary ? 'Non' : 'Oui',
      get(event, 'customer._id', ''),
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
  'Id Auxiliaire',
  'Auxiliaire - Prénom',
  'Auxiliaire - Nom',
  'Auxiliaire - Titre',
  'Équipe',
  'Type',
  'Nature',
  'Début',
  'Fin',
  'Equivalent heures contrat',
  'Prolongation',
  'Absence d\'origine',
  'Divers',
];

exports.formatAbsence = (absence) => {
  const hours = DraftPayHelper.getAbsenceHours(absence, absence.auxiliary.contracts);
  const datetimeFormat = absence.absenceNature === HOURLY ? 'dd/LL/yyyy HH:mm' : 'dd/LL/yyyy';

  return [
    get(absence, 'auxiliary._id') || '',
    get(absence, 'auxiliary.identity.firstname', ''),
    get(absence, 'auxiliary.identity.lastname', '').toUpperCase(),
    CIVILITY_LIST[get(absence, 'auxiliary.identity.title')] || '',
    get(absence, 'auxiliary.sector.name') || '',
    ABSENCE_TYPE_LIST[absence.absence],
    ABSENCE_NATURE_LIST[absence.absenceNature],
    CompaniDate(absence.startDate).format(datetimeFormat),
    CompaniDate(absence.endDate).format(datetimeFormat),
    UtilsHelper.formatFloatForExport(hours),
    absence.extension ? 'oui' : 'non',
    absence.extension ? CompaniDate(absence.extension.startDate).format(datetimeFormat) : '',
    absence.misc || '',
  ];
};

exports.exportAbsencesHistory = async (start, end, credentials) => {
  const events = await EventRepository.getAbsencesForExport(start, end, credentials);

  const rows = [absenceExportHeader];
  for (const event of events) {
    const absenceIsOnOneMonth = CompaniDate(event.startDate).isSame(event.endDate, 'month');
    if (absenceIsOnOneMonth) rows.push(exports.formatAbsence(event));
    else { // split absence by month to ease analytics
      rows.push(exports.formatAbsence({ ...event, endDate: CompaniDate(event.startDate).endOf('month').toISO() }));

      const monthsDiff = CompaniDate(event.endDate).oldDiff(event.startDate, 'months').months;
      for (let i = 1; i <= monthsDiff; i++) {
        const endOfMonth = CompaniDate(event.startDate).oldAdd({ months: i }).endOf('month').toISO();
        rows.push(exports.formatAbsence({
          ...event,
          endDate: CompaniDate(event.endDate).isBefore(endOfMonth) ? event.endDate : endOfMonth,
          startDate: CompaniDate(event.startDate).oldAdd({ months: i }).startOf('month').toISO(),
        }));
      }

      if (CompaniDate(event.startDate).oldAdd({ months: monthsDiff }).endOf('month').isBefore(event.endDate)) {
        rows.push(exports.formatAbsence({
          ...event,
          endDate: event.endDate,
          startDate: CompaniDate(event.startDate).oldAdd({ months: monthsDiff + 1 }).startOf('month').toISO(),
        }));
      }
    }
  }

  return rows;
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
  'Nombre d\'heures',
  'Services',
  'Date de création',
];

const exportBillSubscriptions = (bill) => {
  if (!bill.subscriptions) return '';

  const subscriptions = bill.subscriptions.map(sub => `${sub.service.name} - ${UtilsHelper.formatHour(sub.hours)} `
    + `- ${UtilsHelper.formatPrice(sub.inclTaxes)} TTC`);

  return subscriptions.join('\r\n');
};

const formatRowCommonsForExport = (document) => {
  const customerId = get(document.customer, '_id');
  const customerIdentity = get(document, 'customer.identity') || {};

  const cells = [
    document.number || '',
    document.date ? CompaniDate(document.date).format('dd/LL/yyyy') : '',
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
    const tppId = get(bill.thirdPartyPayer, '_id');
    let hours = 0;

    let totalExclTaxes = 0;
    if (bill.subscriptions) {
      for (const sub of bill.subscriptions) {
        const subExclTaxesWithDiscount = UtilsHelper.computeExclTaxesWithDiscount(
          sub.inclTaxes,
          sub.discount,
          sub.vat
        );

        totalExclTaxes = NumbersHelper.oldAdd(totalExclTaxes, subExclTaxesWithDiscount);
        hours = NumbersHelper.oldAdd(hours, sub.hours);
      }
    }

    if (bill.billingItemList) {
      for (const bi of bill.billingItemList) {
        const biExclTaxesWithDiscount = UtilsHelper.computeExclTaxesWithDiscount(bi.inclTaxes, bi.discount, bi.vat);
        totalExclTaxes = NumbersHelper.oldAdd(totalExclTaxes, biExclTaxesWithDiscount);
      }
    }

    const createdAt = get(bill, 'createdAt', null);
    const cells = [
      'Facture',
      ...formatRowCommonsForExport(bill),
      tppId ? tppId.toHexString() : '',
      get(bill.thirdPartyPayer, 'name') || '',
      UtilsHelper.formatFloatForExport(totalExclTaxes),
      UtilsHelper.formatFloatForExport(bill.netInclTaxes),
      UtilsHelper.formatFloatForExport(hours),
      exportBillSubscriptions(bill),
      createdAt ? CompaniDate(createdAt).format('dd/LL/yyyy') : '',
    ];

    rows.push(cells);
  }

  return rows;
};

const formatCreditNotesForExport = (creditNotes) => {
  const rows = [];

  for (const creditNote of creditNotes) {
    const { exclTaxesCustomer, exclTaxesTpp, inclTaxesCustomer, inclTaxesTpp, thirdPartyPayer, createdAt } = creditNote;
    const totalExclTaxes = parseFloat(NumbersHelper.add(exclTaxesCustomer || 0, exclTaxesTpp || 0));
    const totalInclTaxes = parseFloat(NumbersHelper.add(inclTaxesCustomer || 0, inclTaxesTpp || 0));
    const tppId = get(thirdPartyPayer, '_id');

    const cells = [
      'Avoir',
      ...formatRowCommonsForExport(creditNote),
      tppId ? tppId.toHexString() : '',
      get(thirdPartyPayer, 'name') || '',
      UtilsHelper.formatFloatForExport(totalExclTaxes),
      UtilsHelper.formatFloatForExport(totalInclTaxes),
      '',
      get(creditNote, 'subscription.service.name') || '',
      createdAt ? CompaniDate(createdAt).format('dd/LL/yyyy') : '',
    ];

    rows.push(cells);
  }

  return rows;
};

exports.exportBillsAndCreditNotesHistory = async (startDate, endDate, credentials) => {
  const query = { date: { $lte: endDate, $gte: startDate }, company: get(credentials, 'company._id') };

  const bills = await Bill.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'thirdPartyPayer' })
    .lean();

  const creditNotes = await CreditNote.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'thirdPartyPayer' })
    .lean();

  return [billAndCreditNoteExportHeader, ...formatBillsForExport(bills), ...formatCreditNotesForExport(creditNotes)];
};

const contractExportHeader = [
  'Type',
  'Id Auxiliaire',
  'Titre',
  'Prénom',
  'Nom',
  'Date de début',
  'Date de fin',
  'Taux horaire',
  'Volume horaire hebdomadaire',
];

exports.exportContractHistory = async (startDate, endDate, credentials) => {
  const query = { company: get(credentials, 'company._id'), 'versions.startDate': { $lte: endDate, $gte: startDate } };
  const contracts = await Contract.find(query).populate({ path: 'user', select: 'identity' }).lean();

  const rows = [contractExportHeader];
  for (const contract of contracts) {
    const identity = get(contract, 'user.identity') || {};
    for (let i = 0, l = contract.versions.length; i < l; i++) {
      const version = contract.versions[i];
      if (version.startDate && CompaniDate(version.startDate).isSameOrBetween(startDate, endDate)) {
        rows.push([
          i === 0 ? 'Contrat' : 'Avenant',
          get(contract, 'user._id') || '',
          CIVILITY_LIST[identity.title] || '',
          identity.firstname || '',
          identity.lastname || '',
          version.startDate ? CompaniDate(version.startDate).format('dd/LL/yyyy') : '',
          version.endDate ? CompaniDate(version.endDate).format('dd/LL/yyyy') : '',
          UtilsHelper.formatFloatForExport(version.grossHourlyRate),
          version.weeklyHours || '',
        ]);
      }
    }
  }

  return rows;
};

const payExportHeader = [
  'Id Auxiliaire',
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
  'Heures absences',
  'Heures à travailler',
  'Heures travaillées',
  'Dont exo non majo',
  'Dont exo et majo',
  'Détails des majo exo',
  'Dont non exo et non majo',
  'Dont non exo et majo',
  'Détails des majo non exo',
  'Heures transports',
  'Solde heures',
  'Dont diff mois précédent',
  'Compteur',
  'Heures sup à payer',
  'Heures comp à payer',
  'Mutuelle',
  'Remboursement transport',
  'Km payés',
  'Km parcourus',
  'Frais téléphoniques',
  'Prime',
  'Indemnité',
];

const getHiringDate = (contracts) => {
  if (!contracts || contracts.length === 0) return null;
  if (contracts.length === 1) return contracts[0].startDate;

  return [...contracts].sort(DatesHelper.ascendingSort('startDate'))[0].startDate;
};

const formatLines = (surchargedPlanDetails, planName) => {
  const surcharges = Object.entries(pick(surchargedPlanDetails, Object.keys(SURCHARGES)));
  if (surcharges.length === 0) return null;

  const lines = [planName];
  for (const [surchargeKey, surcharge] of surcharges) {
    lines.push(`${SURCHARGES[surchargeKey]}, ${surcharge.percentage}%, `
      + `${UtilsHelper.formatFloatForExport(surcharge.hours)}h`);
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

exports.formatHoursWithDiff = (pay, key) =>
  UtilsHelper.formatFloatForExport(UtilsHelper.computeHoursWithDiff(pay, key));

exports.exportPayAndFinalPayHistory = async (startDate, endDate, credentials) => {
  const companyId = get(credentials, 'company._id', null);
  const query = {
    endDate: { $lte: CompaniDate(endDate).endOf('month').toDate() },
    startDate: { $gte: CompaniDate(startDate).startOf('month').toDate() },
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
      get(pay, 'auxiliary._id') || '',
      CIVILITY_LIST[get(pay, 'auxiliary.identity.title')] || '',
      get(pay, 'auxiliary.identity.firstname') || '',
      get(pay, 'auxiliary.identity.lastname').toUpperCase() || '',
      get(pay.auxiliary, 'sector.name') || '',
      hiringDate ? CompaniDate(hiringDate).format('dd/LL/yyyy') : '',
      CompaniDate(pay.startDate).format('dd/LL/yyyy'),
      pay.endNotificationDate ? CompaniDate(pay.endNotificationDate).format('dd/LL/yyyy') : '',
      pay.endReason ? END_CONTRACT_REASONS[pay.endReason] : '',
      CompaniDate(pay.endDate).format('dd/LL/yyyy'),
      UtilsHelper.formatFloatForExport(pay.contractHours),
      exports.formatHoursWithDiff(pay, 'absencesHours'),
      exports.formatHoursWithDiff(pay, 'hoursToWork'),
      exports.formatHoursWithDiff(pay, 'workedHours'),
      exports.formatHoursWithDiff(pay, 'notSurchargedAndExempt'),
      exports.formatHoursWithDiff(pay, 'surchargedAndExempt'),
      exports.formatSurchargedDetailsForExport(pay, 'surchargedAndExemptDetails'),
      exports.formatHoursWithDiff(pay, 'notSurchargedAndNotExempt'),
      exports.formatHoursWithDiff(pay, 'surchargedAndNotExempt'),
      exports.formatSurchargedDetailsForExport(pay, 'surchargedAndNotExemptDetails'),
      exports.formatHoursWithDiff(pay, 'paidTransportHours'),
      exports.formatHoursWithDiff(pay, 'hoursBalance'),
      get(pay, 'diff.hoursBalance') ? UtilsHelper.formatFloatForExport(pay.diff.hoursBalance) : '0,00',
      UtilsHelper.formatFloatForExport(pay.hoursCounter),
      UtilsHelper.formatFloatForExport(pay.overtimeHours),
      UtilsHelper.formatFloatForExport(pay.additionalHours),
      pay.mutual ? 'Oui' : 'Non',
      UtilsHelper.formatFloatForExport(pay.transport),
      UtilsHelper.formatFloatForExport(pay.paidKm),
      UtilsHelper.formatFloatForExport(pay.travelledKm),
      UtilsHelper.formatFloatForExport(pay.phoneFees),
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
  const query = { date: { $lte: endDate, $gte: startDate }, company: get(credentials, 'company._id') };

  const payments = await Payment.find(query)
    .sort({ date: 'desc' })
    .populate({ path: 'customer', select: 'identity' })
    .populate({ path: 'thirdPartyPayer' })
    .lean();

  const rows = [paymentExportHeader];

  for (const payment of payments) {
    const customerId = get(payment.customer, '_id');
    const thirdPartyPayerId = get(payment.thirdPartyPayer, '_id');
    const cells = [
      PAYMENT_NATURE_LIST[payment.nature],
      payment.number || '',
      CompaniDate(payment.date).format('dd/LL/yyyy'),
      customerId ? customerId.toHexString() : '',
      CIVILITY_LIST[get(payment, 'customer.identity.title')] || '',
      get(payment, 'customer.identity.lastname', '').toUpperCase(),
      get(payment, 'customer.identity.firstname', ''),
      thirdPartyPayerId ? thirdPartyPayerId.toHexString() : '',
      get(payment.thirdPartyPayer, 'name') || '',
      PAYMENT_TYPES_LIST[payment.type] || '',
      UtilsHelper.formatFloatForExport(payment.netInclTaxes),
    ];

    rows.push(cells);
  }

  return rows;
};

exports.exportTransportsHistory = async (startDate, endDate, credentials) => {
  const rows = [];
  const events = await EventRepository.getEventsByDayAndAuxiliary(
    startDate,
    endDate,
    get(credentials, 'company._id')
  );
  const distanceMatrix = await DistanceMatrixHelper.getDistanceMatrices(credentials);

  const sortedEventsByAuxiliary = events
    .sort((a, b) => (a.auxiliary.identity.lastname).localeCompare(b.auxiliary.identity.lastname));

  for (const group of sortedEventsByAuxiliary) {
    const sortedEventsByDayList = group.eventsByDay.sort((a, b) => DatesHelper.ascendingSort('startDate')(a[0], b[0]));

    for (const eventsGroupedByDay of sortedEventsByDayList) {
      const sortedEvents = [...eventsGroupedByDay].sort(DatesHelper.ascendingSort('startDate'));

      for (let i = 1; i < sortedEvents.length; i++) {
        const {
          duration,
          travelledKm,
          origins,
          destinations,
          transportDuration,
          breakDuration,
          pickTransportDuration,
        } = await DraftPayHelper.getPaidTransportInfo(
          { ...sortedEvents[i], auxiliary: group.auxiliary },
          { ...sortedEvents[i - 1], auxiliary: group.auxiliary },
          distanceMatrix
        );

        rows.push({
          'Id de l\'auxiliaire': get(group, 'auxiliary._id', '').toHexString(),
          'Prénom de l\'auxiliaire': get(group, 'auxiliary.identity.firstname', ''),
          'Nom de l\'auxiliaire': get(group, 'auxiliary.identity.lastname', ''),
          'Heure de départ du trajet': CompaniDate(sortedEvents[i - 1].endDate).format('dd/LL/yyyy HH:mm:ss'),
          'Heure d\'arrivée du trajet': CompaniDate(sortedEvents[i].startDate).format('dd/LL/yyyy HH:mm:ss'),
          'Adresse de départ': origins,
          'Adresse d\'arrivée': destinations,
          Distance: UtilsHelper.formatFloatForExport(travelledKm, 3),
          'Mode de transport': EVENT_TRANSPORT_MODE_LIST[
            get(group, 'auxiliary.administrative.transportInvoice.transportType')
          ],
          'Durée du trajet': UtilsHelper
            .formatFloatForExport(CompaniDuration({ minutes: transportDuration }).asHours(), 4),
          'Durée inter vacation': UtilsHelper
            .formatFloatForExport(CompaniDuration({ minutes: breakDuration }).asHours(), 4),
          'Pause prise en compte': pickTransportDuration ? 'Non' : 'Oui',
          'Durée rémunérée': UtilsHelper
            .formatFloatForExport(CompaniDuration({ minutes: duration }).asHours(), 4),
        });
      }
    }
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};
