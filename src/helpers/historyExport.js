const get = require('lodash/get');
const has = require('lodash/has');
const pick = require('lodash/pick');
const uniqBy = require('lodash/uniqBy');
const moment = require('../extensions/moment');
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
  INTRA,
  ON_SITE,
  REMOTE,
  STEP_TYPES,
  EXPECTATIONS,
  END_OF_COURSE,
  OPEN_QUESTION,
  SURVEY,
  QUESTION_ANSWER,
} = require('./constants');
const DatesHelper = require('./dates');
const { CompaniDate } = require('./dates/companiDates');
const { CompaniDuration } = require('./dates/companiDurations');
const UtilsHelper = require('./utils');
const NumbersHelper = require('./numbers');
const DraftPayHelper = require('./draftPay');
const CourseHelper = require('./courses');
const AttendanceSheet = require('../models/AttendanceSheet');
const DistanceMatrixHelper = require('./distanceMatrix');
const Event = require('../models/Event');
const Bill = require('../models/Bill');
const CreditNote = require('../models/CreditNote');
const Contract = require('../models/Contract');
const CourseSmsHistory = require('../models/CourseSmsHistory');
const CourseSlot = require('../models/CourseSlot');
const Course = require('../models/Course');
const Pay = require('../models/Pay');
const Payment = require('../models/Payment');
const FinalPay = require('../models/FinalPay');
const EventRepository = require('../repositories/EventRepository');
const UserRepository = require('../repositories/UserRepository');
const { TIME_STAMPING_ACTIONS } = require('../models/EventHistory');
const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const Questionnaire = require('../models/Questionnaire');

const NO_DATA = 'Aucune donnée sur la periode selectionnée';

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
  .filter(sh => moment(sh.startDate).isBefore(event.startDate))
  .sort(DatesHelper.descendingSort('startDate'))[0];

const displayDate = (path, timestamp = null, scheduledDate = null) => {
  if (timestamp) return DatesHelper.formatDateAndTime(get(timestamp, path), 'DD MM YYYY hh mm ss');
  if (scheduledDate) return DatesHelper.formatDateAndTime(scheduledDate, 'DD MM YYYY hh mm ss');
  return '';
};

exports.getWorkingEventsForExport = async (startDate, endDate, companyId) => {
  const query = {
    company: companyId,
    type: { $in: [INTERVENTION, INTERNAL_HOUR] },
    $or: [
      { startDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $lte: endDate, $gte: startDate } },
      { endDate: { $gte: endDate }, startDate: { $lte: startDate } },
    ],
  };

  const events = await Event.find(query)
    .sort({ startDate: -1 })
    .populate({ path: 'customer', populate: { path: 'subscriptions', populate: 'service' } })
    .populate('internalHour')
    .populate('sector')
    .populate({ path: 'histories', match: { action: { $in: TIME_STAMPING_ACTIONS }, company: companyId } })
    .lean();

  const eventsWithPopulatedSubscription = events.map((event) => {
    if (event.type !== INTERVENTION) return event;
    const { subscription, customer } = event;
    const customerSubscription = customer.subscriptions.find(sub =>
      UtilsHelper.areObjectIdsEquals(sub._id, subscription));
    return { ...event, subscription: customerSubscription };
  });

  return eventsWithPopulatedSubscription;
};

exports.exportWorkingEventsHistory = async (startDate, endDate, credentials) => {
  const companyId = get(credentials, 'company._id');
  const events = await exports.getWorkingEventsForExport(startDate, endDate, companyId);
  const auxiliaryIds = [...new Set(events.map(ev => ev.auxiliary))];
  const auxiliaries = await UserRepository.getAuxiliariesWithSectorHistory(auxiliaryIds, companyId);

  const rows = [workingEventExportHeader];

  for (const event of events) {
    let repetition = get(event.repetition, 'frequency');
    repetition = NEVER === repetition ? '' : REPETITION_FREQUENCY_TYPE_LIST[repetition];

    const auxiliary = event.auxiliary
      ? auxiliaries.find(aux => aux._id.toHexString() === event.auxiliary.toHexString())
      : null;
    const auxiliarySector = auxiliary ? getMatchingSector(auxiliary.sectorHistory, event) : null;

    const startHourTimeStamping = event.histories.find(history => get(history, 'update.startHour'));
    const endHourTimeStamping = event.histories.find(history => get(history, 'update.endHour'));

    const cells = [
      EVENT_TYPE_LIST[event.type],
      get(event, 'internalHour.name', ''),
      event.subscription ? getServiceName(event.subscription.service) : '',
      displayDate('update.startHour.from', startHourTimeStamping, event.startDate),
      displayDate('update.startHour.to', startHourTimeStamping),
      TIMESTAMPING_ACTION_TYPE_LIST[get(startHourTimeStamping, 'action')] || '',
      get(startHourTimeStamping, 'action') === MANUAL_TIME_STAMPING
        ? MANUAL_TIME_STAMPING_REASONS[get(startHourTimeStamping, 'manualTimeStampingReason')] : '',
      displayDate('update.endHour.from', endHourTimeStamping, event.endDate),
      displayDate('update.endHour.to', endHourTimeStamping),
      TIMESTAMPING_ACTION_TYPE_LIST[get(endHourTimeStamping, 'action')] || '',
      get(endHourTimeStamping, 'action') === MANUAL_TIME_STAMPING
        ? MANUAL_TIME_STAMPING_REASONS[get(endHourTimeStamping, 'manualTimeStampingReason')] : '',
      UtilsHelper.formatFloatForExport(moment(event.endDate).diff(event.startDate, 'h', true)),
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
  const datetimeFormat = absence.absenceNature === HOURLY ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';

  return [
    get(absence, 'auxiliary._id') || '',
    get(absence, 'auxiliary.identity.firstname', ''),
    get(absence, 'auxiliary.identity.lastname', '').toUpperCase(),
    CIVILITY_LIST[get(absence, 'auxiliary.identity.title')] || '',
    get(absence, 'auxiliary.sector.name') || '',
    ABSENCE_TYPE_LIST[absence.absence],
    ABSENCE_NATURE_LIST[absence.absenceNature],
    moment(absence.startDate).format(datetimeFormat),
    moment(absence.endDate).format(datetimeFormat),
    UtilsHelper.formatFloatForExport(hours),
    absence.extension ? 'oui' : 'non',
    absence.extension ? moment(absence.extension.startDate).format(datetimeFormat) : '',
    absence.misc || '',
  ];
};

exports.exportAbsencesHistory = async (start, end, credentials) => {
  const events = await EventRepository.getAbsencesForExport(start, end, credentials);

  const rows = [absenceExportHeader];
  for (const event of events) {
    const absenceIsOnOneMonth = moment(event.startDate).isSame(event.endDate, 'month');
    if (absenceIsOnOneMonth) rows.push(exports.formatAbsence(event));
    else { // split absence by month to ease analytics
      rows.push(exports.formatAbsence({ ...event, endDate: moment(event.startDate).endOf('month').toISOString() }));

      const monthsDiff = moment(event.endDate).diff(event.startDate, 'month');
      for (let i = 1; i <= monthsDiff; i++) {
        const endOfMonth = moment(event.startDate).add(i, 'month').endOf('month').toISOString();
        rows.push(exports.formatAbsence({
          ...event,
          endDate: moment(event.endDate).isBefore(endOfMonth) ? event.endDate : endOfMonth,
          startDate: moment(event.startDate).add(i, 'month').startOf('month').toISOString(),
        }));
      }

      if (moment(event.startDate).add(monthsDiff, 'month').endOf('month').isBefore(event.endDate)) {
        rows.push(exports.formatAbsence({
          ...event,
          endDate: event.endDate,
          startDate: moment(event.startDate).add(monthsDiff + 1, 'month').startOf('month').toISOString(),
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
    const tppId = get(bill.thirdPartyPayer, '_id');
    let hours = 0;

    let totalExclTaxes = 0;
    if (bill.subscriptions) {
      for (const sub of bill.subscriptions) {
        const subExclTaxesWithDiscount = UtilsHelper.computeExclTaxesWithDiscount(sub.exclTaxes, sub.discount, sub.vat);
        totalExclTaxes = NumbersHelper.add(totalExclTaxes, subExclTaxesWithDiscount);
        hours = NumbersHelper.add(hours, sub.hours);
      }
    }

    if (bill.billingItemList) {
      for (const bi of bill.billingItemList) {
        const biExclTaxesWithDiscount = UtilsHelper.computeExclTaxesWithDiscount(bi.exclTaxes, bi.discount, bi.vat);
        totalExclTaxes = NumbersHelper.add(totalExclTaxes, biExclTaxesWithDiscount);
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
      '',
      get(creditNote, 'subscription.service.name') || '',
      createdAt ? moment(createdAt).format('DD/MM/YYYY') : '',
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
      if (version.startDate && moment(version.startDate).isBetween(startDate, endDate, null, '[]')) {
        rows.push([
          i === 0 ? 'Contrat' : 'Avenant',
          get(contract, 'user._id') || '',
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

  return contracts.map(contract => contract.startDate).sort((a, b) => new Date(a) - new Date(b))[0];
};

const formatLines = (surchargedPlanDetails, planName) => {
  const surcharges = Object.entries(pick(surchargedPlanDetails, Object.keys(SURCHARGES)));
  if (surcharges.length === 0) return null;

  const lines = [planName];
  for (const [surchageKey, surcharge] of surcharges) {
    lines.push(`${SURCHARGES[surchageKey]}, ${surcharge.percentage}%, `
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
      get(pay, 'auxiliary._id') || '',
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
      moment(payment.date).format('DD/MM/YYYY'),
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

const getEndOfCourse = (slotsGroupedByDate, slotsToPlan) => {
  if (slotsToPlan.length) return 'à planifier';
  if (slotsGroupedByDate) {
    const lastDate = slotsGroupedByDate.length - 1;
    const lastSlot = slotsGroupedByDate[lastDate].length - 1;
    return CompaniDate(slotsGroupedByDate[lastDate][lastSlot].endDate).format('dd/LL/yyyy HH:mm:ss');
  }
  return '';
};

exports.exportCourseHistory = async (startDate, endDate, credentials) => {
  const slots = await CourseSlot.find({ startDate: { $lte: endDate }, endDate: { $gte: startDate } }).lean();
  const courseIds = slots.map(slot => slot.course);
  const courses = await Course
    .find({ _id: { $in: courseIds } })
    .populate({ path: 'company', select: 'name' })
    .populate({
      path: 'subProgram',
      select: 'name steps program',
      populate: [
        { path: 'program', select: 'name' },
        {
          path: 'steps',
          select: 'type activities',
          populate: { path: 'activities', populate: { path: 'activityHistories' } },
        },
      ],
    })
    .populate({ path: 'trainer', select: 'identity' })
    .populate({ path: 'salesRepresentative', select: 'identity' })
    .populate({ path: 'contact', select: 'identity' })
    .populate({ path: 'slots', populate: 'attendances' })
    .populate({ path: 'slotsToPlan' })
    .populate({ path: 'trainees', select: 'firstMobileConnection' })
    .populate({
      path: 'bills',
      select: 'courseFundingOrganisation company billedAt',
      options: { isVendorUser: has(credentials, 'role.vendor') },
      populate: [{ path: 'courseFundingOrganisation', select: 'name' }, { path: 'company', select: 'name' }],
    })
    .lean();

  const questionnaireHistories = await QuestionnaireHistory
    .find({ course: { $in: courseIds } })
    .populate({ path: 'questionnaire', select: 'type' })
    .lean();

  const smsList = await CourseSmsHistory.find({ course: { $in: courseIds } }).lean();
  const attendanceSheetList = await AttendanceSheet.find({ course: { $in: courseIds } }).lean();

  const rows = [];

  for (const course of courses) {
    const slotsGroupedByDate = CourseHelper.groupSlotsByDate(course.slots);
    const smsCount = smsList.filter(sms => UtilsHelper.areObjectIdsEquals(sms.course, course._id)).length;
    const attendanceSheetsCount = attendanceSheetList
      .filter(attendanceSheet => UtilsHelper.areObjectIdsEquals(attendanceSheet.course, course._id))
      .length;

    const attendances = course.slots.map(slot => slot.attendances).flat();
    const courseTraineeList = course.trainees.map(trainee => trainee._id);
    const subscribedTraineesAttendancesCount = attendances
      .filter(attendance => UtilsHelper.doesArrayIncludeId(courseTraineeList, attendance.trainee))
      .length;
    const unsubscribedTraineesAttendancesCount = attendances.length - subscribedTraineesAttendancesCount;

    const upComingSlotsCount = course.slots.filter(slot => CompaniDate().isBefore(slot.startDate)).length;
    const attendancesToCome = upComingSlotsCount * course.trainees.length;
    const absencesCount = (course.slots.length * course.trainees.length) - subscribedTraineesAttendancesCount
    - attendancesToCome;

    const unsubscribedTraineesCount = uniqBy(attendances.map(a => a.trainee), trainee => trainee.toString())
      .filter(attendanceTrainee => !UtilsHelper.doesArrayIncludeId(courseTraineeList, attendanceTrainee))
      .length;

    const pastSlotsCount = course.slots.length - upComingSlotsCount;

    const expectactionQuestionnaireAnswersCount = questionnaireHistories
      .filter(qh => qh.questionnaire.type === EXPECTATIONS)
      .filter(qh => UtilsHelper.areObjectIdsEquals(qh.course, course._id))
      .length;

    const endQuestionnaireAnswersCount = questionnaireHistories
      .filter(qh => qh.questionnaire.type === END_OF_COURSE)
      .filter(qh => UtilsHelper.areObjectIdsEquals(qh.course, course._id))
      .length;

    const traineeProgressList = course.trainees
      .map(trainee => CourseHelper.getTraineeElearningProgress(trainee._id, course.subProgram.steps))
      .filter(trainee => trainee.progress.eLearning >= 0)
      .map(trainee => trainee.progress.eLearning);
    const combinedElearningProgress = traineeProgressList.reduce((acc, value) => acc + value, 0);
    const payer = course.bills
      .map(bill => get(bill, 'courseFundingOrganisation.name') || get(bill, 'company.name'))
      .toString();
    const isBilled = course.bills.map(bill => (bill.billedAt ? 'Oui' : 'Non')).toString();

    rows.push({
      Identifiant: course._id,
      Type: course.type,
      Payeur: payer || '',
      Structure: course.type === INTRA ? get(course, 'company.name') : '',
      Programme: get(course, 'subProgram.program.name') || '',
      'Sous-Programme': get(course, 'subProgram.name') || '',
      'Infos complémentaires': course.misc,
      Formateur: UtilsHelper.formatIdentity(get(course, 'trainer.identity') || '', 'FL'),
      'Référent Compani': UtilsHelper.formatIdentity(get(course, 'salesRepresentative.identity') || '', 'FL'),
      'Contact pour la formation': UtilsHelper.formatIdentity(get(course, 'contact.identity') || '', 'FL'),
      'Nombre d\'inscrits': get(course, 'trainees.length') || '',
      'Nombre de dates': slotsGroupedByDate.length,
      'Nombre de créneaux': get(course, 'slots.length') || '',
      'Nombre de créneaux à planifier': get(course, 'slotsToPlan.length') || '',
      'Durée Totale': UtilsHelper.getTotalDurationForExport(course.slots),
      'Nombre de SMS envoyés': smsCount,
      'Nombre de personnes connectées à l\'app': course.trainees
        .filter(trainee => trainee.firstMobileConnection).length,
      'Complétion eLearning moyenne': traineeProgressList.length
        ? UtilsHelper.formatFloatForExport(combinedElearningProgress / course.trainees.length)
        : '',
      'Nombre de réponses au questionnaire de recueil des attentes': expectactionQuestionnaireAnswersCount,
      'Nombre de réponses au questionnaire de satisfaction': endQuestionnaireAnswersCount,
      'Début de formation': CompaniDate(slotsGroupedByDate[0][0].startDate).format('dd/LL/yyyy HH:mm:ss') || '',
      'Fin de formation': getEndOfCourse(slotsGroupedByDate, course.slotsToPlan),
      'Nombre de feuilles d\'émargement chargées': attendanceSheetsCount,
      'Nombre de présences': subscribedTraineesAttendancesCount,
      'Nombre d\'absences': absencesCount,
      'Nombre de stagiaires non prévus': unsubscribedTraineesCount,
      'Nombre de présences non prévues': unsubscribedTraineesAttendancesCount,
      Avancement: UtilsHelper.formatFloatForExport(pastSlotsCount / (course.slots.length + course.slotsToPlan.length)),
      Facturée: isBilled,
    });
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};

const getAddress = (slot) => {
  if (get(slot, 'step.type') === ON_SITE) return get(slot, 'address.fullAddress') || '';
  if (get(slot, 'step.type') === REMOTE) return slot.meetingLink || '';

  return '';
};

exports.exportCourseSlotHistory = async (startDate, endDate) => {
  const courseSlots = await CourseSlot.find({ startDate: { $lte: endDate }, endDate: { $gte: startDate } })
    .populate({ path: 'step', select: 'type name' })
    .populate({
      path: 'course',
      select: 'type trainees misc subProgram company',
      populate: [
        { path: 'company', select: 'name' },
        { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
      ],
    })
    .populate({ path: 'attendances' })
    .lean();

  const rows = [];

  for (const slot of courseSlots) {
    const slotDuration = UtilsHelper.getDurationForExport(slot.startDate, slot.endDate);
    const subscribedTraineesAttendancesCount = slot.attendances
      .filter(attendance => UtilsHelper.doesArrayIncludeId(slot.course.trainees, attendance.trainee))
      .length;
    const unsubscribedTraineesAttendancesCount = slot.attendances.length - subscribedTraineesAttendancesCount;

    const absencesCount = slot.course.trainees.length - subscribedTraineesAttendancesCount;

    const courseName = get(slot, 'course.type') === INTRA
      ? `${slot.course.company.name} - ${slot.course.subProgram.program.name} - ${slot.course.misc}`
      : `${slot.course.subProgram.program.name} - ${slot.course.misc}`;

    rows.push({
      'Id Créneau': slot._id,
      'Id Formation': slot.course._id,
      Formation: courseName,
      Étape: get(slot, 'step.name') || '',
      Type: STEP_TYPES[get(slot, 'step.type')] || '',
      'Date de création': CompaniDate(slot.createdAt).format('dd/LL/yyyy HH:mm:ss') || '',
      'Date de début': CompaniDate(slot.startDate).format('dd/LL/yyyy HH:mm:ss') || '',
      'Date de fin': CompaniDate(slot.endDate).format('dd/LL/yyyy HH:mm:ss') || '',
      Durée: slotDuration,
      Adresse: getAddress(slot),
      'Nombre de présences': subscribedTraineesAttendancesCount,
      'Nombre d\'absences': absencesCount,
      'Nombre de présences non prévues': unsubscribedTraineesAttendancesCount,
    });
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
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

const _findAnswerText = (answers, answerId) => {
  const answer = answers.find(qa => UtilsHelper.areObjectIdsEquals(qa._id, answerId));

  return answer ? answer.text : '';
};

const _getAnswerForExport = (questionnaireCard, questionnaireHistoryAnswersList) => {
  const qAnswer = questionnaireHistoryAnswersList
    .find(qa => UtilsHelper.areObjectIdsEquals(qa.card._id, questionnaireCard._id));

  return qAnswer
    ? qAnswer.answerList
      .map(a => (UtilsHelper.isStringedObjectId(a) ? _findAnswerText(qAnswer.card.qcAnswers, a) : a))
      .join()
    : '';
};

exports.exportEndOfCourseQuestionnaireHistory = async (startDate, endDate) => {
  const rows = [];

  const endOfCourseQuestionnaire = await Questionnaire
    .findOne({ type: END_OF_COURSE })
    .populate({ path: 'cards', select: 'question template' })
    .populate({
      path: 'histories',
      match: { createdAt: { $gte: startDate, $lte: endDate } },
      populate: [
        {
          path: 'course',
          select: 'subProgram',
          populate: [
            { path: 'subProgram', select: 'name program', populate: { path: 'program', select: 'name' } },
            { path: 'trainer', select: 'identity' },
          ],
        },
        {
          path: 'user',
          select: 'identity local.email contact.phone company',
          populate: { path: 'company', populate: { path: 'company', select: 'name' } },
        },
        { path: 'questionnaireAnswersList.card', select: 'qcAnswers' },
      ],
    })
    .lean({ virtuals: true });

  for (const qHistory of endOfCourseQuestionnaire.histories) {
    const questionsAnswers = endOfCourseQuestionnaire.cards
      .filter(card => [OPEN_QUESTION, SURVEY, QUESTION_ANSWER].includes(card.template))
      .reduce((acc, card) => ({
        ...acc,
        [card.question]: _getAnswerForExport(card, qHistory.questionnaireAnswersList),
      }), {});

    const row = {
      'Id formation': qHistory.course._id,
      Programme: get(qHistory, 'course.subProgram.program.name') || '',
      'Sous-programme': get(qHistory, 'course.subProgram.name'),
      'Prénom Nom intervenant(e)': UtilsHelper.formatIdentity(get(qHistory, 'course.trainer.identity') || '', 'FL'),
      Structure: get(qHistory, 'user.company.name'),
      'Date de réponse': CompaniDate(qHistory.createdAt).format('dd/LL/yyyy HH:mm:ss'),
      'Prénom Nom répondant(e)': UtilsHelper.formatIdentity(get(qHistory, 'user.identity') || '', 'FL'),
      'Mail répondant(e)': get(qHistory, 'user.local.email'),
      'Numéro de tél répondant(e)': get(qHistory, 'user.contact.phone') || '',
      ...questionsAnswers,
    };

    rows.push(row);
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};
