const compact = require('lodash/compact');
const get = require('lodash/get');
const DatesUtilsHelper = require('./dates/utils');
const UtilsHelper = require('./utils');
const { E_LEARNING, SHORT_DURATION_H_MM, DD_MM_YYYY, REMOTE } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');
const { CompaniDuration } = require('./dates/companiDurations');

const computeLiveDuration = (slots, slotsToPlan, steps) => {
  if (slotsToPlan.length) {
    const theoreticalDurationList = steps
      .filter(step => step.type !== E_LEARNING)
      .map(step => step.theoreticalDuration);

    return theoreticalDurationList
      .reduce((acc, duration) => acc.add(duration), CompaniDuration())
      .format(SHORT_DURATION_H_MM);
  }
  const slotsDuration = CompaniDuration(UtilsHelper.getISOTotalDuration(slots));

  return CompaniDuration(slotsDuration).format(SHORT_DURATION_H_MM);
};

const computeElearnigDuration = (steps) => {
  if (!steps.some(step => step.type === E_LEARNING)) return '';
  const elearningDuration = steps
    .filter(step => step.type === E_LEARNING)
    .reduce((acc, step) => acc.add(step.theoreticalDuration), CompaniDuration())
    .toISO();

  return CompaniDuration(elearningDuration).format(SHORT_DURATION_H_MM);
};

const getDates = (slots) => {
  const slotDatesWithDuplicate = slots
    .sort(DatesUtilsHelper.ascendingSortBy('startDate'))
    .map(slot => CompaniDate(slot.startDate).format(DD_MM_YYYY));

  return [...new Set(slotDatesWithDuplicate)];
};

const getAddressList = (slots, steps) => {
  const hasRemoteSteps = steps.some(step => step.type === REMOTE);

  const fullAddressList = compact(slots.map(slot => get(slot, 'address.fullAddress')));
  const uniqFullAddressList = [...new Set(fullAddressList)];
  if (uniqFullAddressList.length <= 2) {
    return hasRemoteSteps
      ? [...uniqFullAddressList, 'Cette formation contient des créneaux en distanciel']
      : uniqFullAddressList;
  }

  const cityList = compact(slots.map(slot => get(slot, 'address.city')));
  const uniqCityList = [...new Set(cityList)];

  return hasRemoteSteps
    ? [...uniqCityList, 'Cette formation contient des créneaux en distanciel']
    : uniqCityList;
};

// make sure code is similar to front part in TrainingContractInfoModal
exports.formatCourseForTrainingContract = (course, vendorCompany, price) => {
  const { companies, subProgram, slots, slotsToPlan, trainer } = course;

  return {
    vendorCompany,
    company: { name: companies[0].name, address: companies[0].address.fullAddress },
    programName: subProgram.program.name,
    learningGoals: subProgram.program.learningGoals,
    slotsCount: slots.length + slotsToPlan.length,
    liveDuration: computeLiveDuration(slots, slotsToPlan, subProgram.steps),
    eLearningDuration: computeElearnigDuration(subProgram.steps),
    misc: course.misc,
    learnersCount: course.maxTrainees,
    dates: getDates(slots),
    addressList: getAddressList(slots, subProgram.steps),
    trainer: UtilsHelper.formatIdentity(get(trainer, 'identity'), 'FL'),
    price,
  };
};
