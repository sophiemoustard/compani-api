const get = require('lodash/get');
const uniqBy = require('lodash/uniqBy');
const groupBy = require('lodash/groupBy');
const {
  NO_DATA,
  INTRA,
  ON_SITE,
  REMOTE,
  STEP_TYPES,
  EXPECTATIONS,
  END_OF_COURSE,
  OPEN_QUESTION,
  SURVEY,
  QUESTION_ANSWER,
  TRAINING_ORGANISATION_MANAGER,
  VENDOR_ADMIN,
  BILLING_DOCUMENTS,
  CREDIT_NOTE,
  BILL,
  PAYMENT_TYPES_LIST,
  PAYMENT_NATURE_LIST,
  DD_MM_YYYY,
  HH_MM_SS,
} = require('./constants');
const { CompaniDate } = require('./dates/companiDates');
const UtilsHelper = require('./utils');
const NumbersHelper = require('./numbers');
const CourseBillHelper = require('./courseBills');
const CourseHelper = require('./courses');
const AttendanceSheet = require('../models/AttendanceSheet');
const CourseSmsHistory = require('../models/CourseSmsHistory');
const CourseSlot = require('../models/CourseSlot');
const CourseBill = require('../models/CourseBill');
const CourseRepository = require('../repositories/CourseRepository');
const QuestionnaireHistory = require('../models/QuestionnaireHistory');
const Questionnaire = require('../models/Questionnaire');
const CoursePayment = require('../models/CoursePayment');

const getEndOfCourse = (slotsGroupedByDate, slotsToPlan) => {
  if (slotsToPlan.length) return 'à planifier';
  if (slotsGroupedByDate.length) {
    const lastDate = slotsGroupedByDate.length - 1;
    const lastSlot = slotsGroupedByDate[lastDate].length - 1;
    return CompaniDate(slotsGroupedByDate[lastDate][lastSlot].endDate).format(`${DD_MM_YYYY} ${HH_MM_SS}`);
  }
  return '';
};

const getStartOfCourse = slotsGroupedByDate => (slotsGroupedByDate.length
  ? CompaniDate(slotsGroupedByDate[0][0].startDate).format(`${DD_MM_YYYY} ${HH_MM_SS}`)
  : '');

const isSlotInInterval = (slot, startDate, endDate) => CompaniDate(slot.startDate).isAfter(startDate) &&
  CompaniDate(slot.endDate).isBefore(endDate);

const getAttendancesCountInfos = (course) => {
  const attendances = course.slots.map(slot => slot.attendances).flat();
  const courseTraineeList = course.trainees.map(trainee => trainee._id);
  const subscribedAttendances = attendances
    .filter(attendance => UtilsHelper.doesArrayIncludeId(courseTraineeList, attendance.trainee))
    .length;

  const upComingSlots = course.slots.filter(slot => CompaniDate().isBefore(slot.startDate)).length;
  const attendancesToCome = upComingSlots * course.trainees.length;

  const unsubscribedTrainees = uniqBy(attendances.map(a => a.trainee), trainee => trainee.toString())
    .filter(attendanceTrainee => !UtilsHelper.doesArrayIncludeId(courseTraineeList, attendanceTrainee))
    .length;

  return {
    subscribedAttendances,
    unsubscribedAttendances: attendances.length - subscribedAttendances,
    absences: (course.slots.length * course.trainees.length) - subscribedAttendances - attendancesToCome,
    unsubscribedTrainees,
    pastSlots: course.slots.length - upComingSlots,
  };
};

const getBillsInfos = (course) => {
  const courseBillsWithoutCreditNote = course.bills.filter(bill => !bill.courseCreditNote);
  const payerList = [...new Set(courseBillsWithoutCreditNote.map(bill => get(bill, 'payer.name')))].toString();
  const validatedBillList = courseBillsWithoutCreditNote.filter(bill => bill.billedAt);
  const computedAmounts = validatedBillList.map(bill => CourseBillHelper.computeAmounts(bill));
  const amountsInfos = validatedBillList.length
    ? {
      netInclTaxes: computedAmounts.map(amount => amount.netInclTaxes).reduce((acc, value) => acc + value, 0),
      paid: computedAmounts.map(amount => amount.paid).reduce((acc, value) => acc + value, 0),
      total: computedAmounts.map(amount => amount.total).reduce((acc, value) => acc + value, 0),
    }
    : { netInclTaxes: '', paid: '', total: '' };

  if (course.type === INTRA) {
    const billsCountForExport = `${validatedBillList.length} sur ${course.expectedBillsCount}`;
    const isBilled = !!course.expectedBillsCount && validatedBillList.length === course.expectedBillsCount;

    return { isBilled, billsCountForExport, payerList, ...amountsInfos };
  }

  const mainFeesCount = validatedBillList.map(bill => bill.mainFee.count).reduce((acc, value) => acc + value, 0);
  const billsCountForExport = `${mainFeesCount} sur ${course.trainees.length}`;
  const isBilled = mainFeesCount === course.trainees.length;

  return { isBilled, billsCountForExport, payerList, ...amountsInfos };
};

const getProgress = (pastSlots, course) =>
  UtilsHelper.formatFloatForExport(pastSlots / (course.slots.length + course.slotsToPlan.length));

exports.exportCourseHistory = async (startDate, endDate, credentials) => {
  const courses = await CourseRepository.findCoursesForExport(startDate, endDate, credentials);

  const filteredCourses = courses
    .filter(course => !course.slots.length || course.slots.some(slot => isSlotInInterval(slot, startDate, endDate)));

  const courseIds = filteredCourses.map(course => course._id);
  const [questionnaireHistories, smsList, attendanceSheetList] = await Promise.all([
    QuestionnaireHistory
      .find({ course: { $in: courseIds }, select: 'course questionnaire' })
      .populate({ path: 'questionnaire', select: 'type' })
      .lean(),
    CourseSmsHistory.find({ course: { $in: courseIds }, select: 'course' }).lean(),
    AttendanceSheet.find({ course: { $in: courseIds }, select: 'course' }).lean(),
  ]);

  const rows = [];
  const groupedSms = groupBy(smsList, 'course');
  const grouppedAttendanceSheets = groupBy(attendanceSheetList, 'course');
  const groupedCourseQuestionnaireHistories = groupBy(questionnaireHistories, 'course');

  for (const course of filteredCourses) {
    const slotsGroupedByDate = CourseHelper.groupSlotsByDate(course.slots);
    const smsCount = (groupedSms[course._id] || []).length;
    const attendanceSheets = (grouppedAttendanceSheets[course._id] || []).length;
    const {
      subscribedAttendances,
      unsubscribedAttendances,
      absences,
      unsubscribedTrainees,
      pastSlots,
    } = getAttendancesCountInfos(course);

    const courseQuestionnaireHistories = groupedCourseQuestionnaireHistories[course._id] || [];
    const expectactionQuestionnaireAnswers = courseQuestionnaireHistories
      .filter(qh => qh.questionnaire.type === EXPECTATIONS)
      .length;
    const endQuestionnaireAnswers = courseQuestionnaireHistories
      .filter(qh => qh.questionnaire.type === END_OF_COURSE)
      .length;

    const traineeProgressList = course.trainees
      .map(trainee => CourseHelper.getTraineeElearningProgress(trainee._id, course.subProgram.steps))
      .filter(trainee => trainee.progress.eLearning >= 0)
      .map(trainee => trainee.progress.eLearning);
    const combinedElearningProgress = traineeProgressList.reduce((acc, value) => acc + value, 0);

    const { isBilled, billsCountForExport, payerList, netInclTaxes, paid, total } = getBillsInfos(course);

    rows.push({
      Identifiant: course._id,
      Type: course.type,
      Payeur: payerList || '',
      Structure: course.type === INTRA ? get(course, 'companies[0].name') : '',
      Programme: get(course, 'subProgram.program.name') || '',
      'Sous-Programme': get(course, 'subProgram.name') || '',
      'Infos complémentaires': course.misc,
      Formateur: UtilsHelper.formatIdentity(get(course, 'trainer.identity') || '', 'FL'),
      'Référent Compani': UtilsHelper.formatIdentity(get(course, 'salesRepresentative.identity') || '', 'FL'),
      'Contact pour la formation': UtilsHelper.formatIdentity(get(course, 'contact.identity') || '', 'FL'),
      'Nombre d\'inscrits': get(course, 'trainees.length'),
      'Nombre de dates': slotsGroupedByDate.length,
      'Nombre de créneaux': get(course, 'slots.length'),
      'Nombre de créneaux à planifier': get(course, 'slotsToPlan.length'),
      'Durée Totale': UtilsHelper.getTotalDurationForExport(course.slots),
      'Nombre de SMS envoyés': smsCount,
      'Nombre de personnes connectées à l\'app': course.trainees
        .filter(trainee => trainee.firstMobileConnection).length,
      'Complétion eLearning moyenne': traineeProgressList.length
        ? UtilsHelper.formatFloatForExport(combinedElearningProgress / course.trainees.length)
        : '',
      'Nombre de réponses au questionnaire de recueil des attentes': expectactionQuestionnaireAnswers,
      'Nombre de réponses au questionnaire de satisfaction': endQuestionnaireAnswers,
      'Date de démarrage souhaitée': course.estimatedStartDate
        ? CompaniDate(course.estimatedStartDate).format(DD_MM_YYYY)
        : '',
      'Début de formation': getStartOfCourse(slotsGroupedByDate),
      'Fin de formation': getEndOfCourse(slotsGroupedByDate, course.slotsToPlan),
      'Nombre de feuilles d\'émargement chargées': attendanceSheets,
      'Nombre de présences': subscribedAttendances,
      'Nombre d\'absences': absences,
      'Nombre de stagiaires non prévus': unsubscribedTrainees,
      'Nombre de présences non prévues': unsubscribedAttendances,
      Avancement: getProgress(pastSlots, course),
      'Nombre de factures': billsCountForExport,
      Facturée: isBilled ? 'Oui' : 'Non',
      'Montant facturé': UtilsHelper.formatFloatForExport(netInclTaxes),
      'Montant réglé': UtilsHelper.formatFloatForExport(paid),
      Solde: UtilsHelper.formatFloatForExport(total),
    });
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};

const getAddress = (slot) => {
  if (get(slot, 'step.type') === ON_SITE) return get(slot, 'address.fullAddress') || '';
  if (get(slot, 'step.type') === REMOTE) return slot.meetingLink || '';

  return '';
};

const composeCourseName = (course) => {
  const companyName = course.type === INTRA ? `${course.companies[0].name} - ` : '';
  const misc = course.misc ? ` - ${course.misc}` : '';

  return companyName + course.subProgram.program.name + misc;
};

exports.exportCourseSlotHistory = async (startDate, endDate) => {
  const courseSlots = await CourseSlot.find({ startDate: { $lte: endDate }, endDate: { $gte: startDate } })
    .populate({ path: 'step', select: 'type name' })
    .populate({
      path: 'course',
      select: 'type trainees misc subProgram companies',
      populate: [
        { path: 'companies', select: 'name' },
        { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
      ],
    })
    .populate({ path: 'attendances' })
    .lean();

  const rows = [];

  for (const slot of courseSlots) {
    const slotDuration = UtilsHelper.getDurationForExport(slot.startDate, slot.endDate);
    const subscribedAttendances = slot.attendances
      .filter(attendance => UtilsHelper.doesArrayIncludeId(slot.course.trainees, attendance.trainee))
      .length;

    rows.push({
      'Id Créneau': slot._id,
      'Id Formation': slot.course._id,
      Formation: composeCourseName(slot.course),
      Étape: get(slot, 'step.name') || '',
      Type: STEP_TYPES[get(slot, 'step.type')] || '',
      'Date de création': CompaniDate(slot.createdAt).format(`${DD_MM_YYYY} ${HH_MM_SS}`) || '',
      'Date de début': CompaniDate(slot.startDate).format(`${DD_MM_YYYY} ${HH_MM_SS}`) || '',
      'Date de fin': CompaniDate(slot.endDate).format(`${DD_MM_YYYY} ${HH_MM_SS}`) || '',
      Durée: slotDuration,
      Adresse: getAddress(slot),
      'Nombre de présences': subscribedAttendances,
      'Nombre d\'absences': slot.course.trainees.length - subscribedAttendances,
      'Nombre de présences non prévues': slot.attendances.length - subscribedAttendances,
    });
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
      'Date de réponse': CompaniDate(qHistory.createdAt).format(`${DD_MM_YYYY} ${HH_MM_SS}`),
      'Prénom Nom répondant(e)': UtilsHelper.formatIdentity(get(qHistory, 'user.identity') || '', 'FL'),
      'Mail répondant(e)': get(qHistory, 'user.local.email'),
      'Numéro de tél répondant(e)': get(qHistory, 'user.contact.phone') || '',
      ...questionsAnswers,
    };

    rows.push(row);
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};

exports.exportCourseBillAndCreditNoteHistory = async (startDate, endDate, credentials) => {
  const isVendorUser = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(credentials, 'role.vendor.name'));
  const courseBills = await CourseBill
    .find({ billedAt: { $lte: endDate, $gte: startDate } })
    .populate(
      {
        path: 'course',
        select: 'subProgram misc type',
        populate: [
          { path: 'subProgram', select: 'program', populate: { path: 'program', select: 'name' } },
          { path: 'slots', select: 'startDate' },
          { path: 'slotsToPlan', select: '_id' },
        ],
      }
    )
    .populate({ path: 'company', select: 'name' })
    .populate({ path: 'payer.company', select: 'name' })
    .populate({ path: 'payer.fundingOrganisation', select: 'name' })
    .populate({ path: 'courseCreditNote', select: 'number date', options: { isVendorUser } })
    .populate({ path: 'coursePayments', select: 'netInclTaxes nature', options: { isVendorUser } })
    .setOptions({ isVendorUser })
    .lean();

  const rows = [];
  for (const bill of courseBills) {
    const { netInclTaxes, paid, total } = CourseBillHelper.computeAmounts(bill);
    const upComingSlots = bill.course.slots.filter(slot => CompaniDate().isBefore(slot.startDate)).length;
    const pastSlots = bill.course.slots.length - upComingSlots;
    const companyName = bill.course.type === INTRA ? `${bill.company.name} - ` : '';
    const misc = bill.course.misc ? ` - ${bill.course.misc}` : '';
    const courseName = `${companyName}${bill.course.subProgram.program.name}${misc}`;
    const commonInfos = {
      'Id formation': bill.course._id,
      Formation: courseName,
      Structure: bill.company.name,
      Payeur: bill.payer.name,
      'Montant TTC': UtilsHelper.formatFloatForExport(netInclTaxes),
    };

    const formattedBill = {
      Nature: BILLING_DOCUMENTS[BILL],
      Identifiant: bill.number,
      Date: CompaniDate(bill.billedAt).format(DD_MM_YYYY),
      ...commonInfos,
      'Montant réglé': bill.courseCreditNote
        ? UtilsHelper.formatFloatForExport(NumbersHelper.subtract(paid, netInclTaxes))
        : UtilsHelper.formatFloatForExport(paid),
      Avoir: get(bill, 'courseCreditNote.number') || '',
      'Montant soldé': bill.courseCreditNote ? UtilsHelper.formatFloatForExport(netInclTaxes) : '',
      Solde: UtilsHelper.formatFloatForExport(total),
      Avancement: getProgress(pastSlots, bill.course),
    };

    rows.push(formattedBill);

    if (bill.courseCreditNote) {
      const formattedCreditNote = {
        Nature: BILLING_DOCUMENTS[CREDIT_NOTE],
        Identifiant: bill.courseCreditNote.number,
        Date: CompaniDate(bill.courseCreditNote.date).format(DD_MM_YYYY),
        ...commonInfos,
        'Montant réglé': '',
        Avoir: '',
        'Montant soldé': '',
        Solde: '',
      };

      rows.push(formattedCreditNote);
    }
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};

exports.exportCoursePaymentHistory = async (startDate, endDate, credentials) => {
  const isVendorUser = [TRAINING_ORGANISATION_MANAGER, VENDOR_ADMIN].includes(get(credentials, 'role.vendor.name'));
  const paymentList = await CoursePayment.find(
    { date: { $lte: endDate, $gte: startDate } },
    { nature: 1, number: 1, date: 1, courseBill: 1, type: 1, netInclTaxes: 1 }
  )
    .populate({ path: 'courseBill', option: { isVendorUser }, select: 'number' })
    .setOptions({ isVendorUser })
    .lean();

  const rows = [];
  for (const payment of paymentList) {
    rows.push({
      Nature: PAYMENT_NATURE_LIST[payment.nature],
      Identifiant: payment.number,
      Date: CompaniDate(payment.date).format(DD_MM_YYYY),
      'Facture associée': payment.courseBill.number,
      'Moyen de paiement': PAYMENT_TYPES_LIST[payment.type],
      Montant: UtilsHelper.formatFloatForExport(payment.netInclTaxes),
    });
  }

  return rows.length ? [Object.keys(rows[0]), ...rows.map(d => Object.values(d))] : [[NO_DATA]];
};
