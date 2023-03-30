const compact = require('lodash/compact');
const get = require('lodash/get');
const omit = require('lodash/omit');
const keyBy = require('lodash/keyBy');
const mapValues = require('lodash/mapValues');
const GCloudStorageHelper = require('./gCloudStorage');
const DatesUtilsHelper = require('./dates/utils');
const UtilsHelper = require('./utils');
const { E_LEARNING, SHORT_DURATION_H_MM, DD_MM_YYYY, REMOTE, INTRA, COURSE, TRAINEE } = require('./constants');
const { CompaniDate } = require('./dates/companiDates');
const { CompaniDuration } = require('./dates/companiDurations');
const Course = require('../models/Course');
const TrainingContract = require('../models/TrainingContract');
const CourseHistoriesHelper = require('./courseHistories');

exports.create = async (payload) => {
  const course = await Course
    .findOne({ _id: payload.course }, { companies: 1, subProgram: 1 })
    .populate([
      { path: 'companies', select: 'name' },
      { path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] },
    ])
    .lean();

  const programName = course.subProgram.program.name;
  const companyName = course.companies[0].name;

  const fileName = `convention_${programName}_${companyName}`;
  const fileUploaded = await GCloudStorageHelper.uploadCourseFile({
    fileName,
    file: payload.file,
  });

  await TrainingContract.create({ ...omit(payload, 'file'), file: fileUploaded });
};
const computeLiveDuration = (slots, slotsToPlan, steps) => {
  if (slotsToPlan.length) {
    const theoreticalDurationList = steps
      .filter(step => step.type !== E_LEARNING)
      .map(step => step.theoreticalDuration);

    return theoreticalDurationList
      .reduce((acc, duration) => acc.add(duration), CompaniDuration())
      .format(SHORT_DURATION_H_MM);
  }

  return CompaniDuration(UtilsHelper.getISOTotalDuration(slots)).format(SHORT_DURATION_H_MM);
};

const computeElearnigDuration = (steps) => {
  if (!steps.some(step => step.type === E_LEARNING)) return '';

  return steps
    .filter(step => step.type === E_LEARNING)
    .reduce((acc, step) => acc.add(step.theoreticalDuration), CompaniDuration())
    .format(SHORT_DURATION_H_MM);
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

const getLearnersCount = async (course) => {
  if (course.type === INTRA) return course.maxTrainees;

  const traineesCompanyAtCourseRegistration = await CourseHistoriesHelper
    .getCompanyAtCourseRegistrationList({ key: COURSE, value: course._id }, { key: TRAINEE, value: course.trainees });

  const traineesCompany = mapValues(keyBy(traineesCompanyAtCourseRegistration, 'trainee'), 'company');

  return course.trainees
    .filter(trainee => UtilsHelper.areObjectIdsEquals(course.companies[0]._id, traineesCompany[trainee._id])).length;
};

// make sure code is similar to front part in TrainingContractInfoModal
exports.formatCourseForTrainingContract = async (course, vendorCompany, price) => {
  const { companies, subProgram, slots, slotsToPlan, trainer } = course;

  return {
    type: course.type,
    vendorCompany,
    company: { name: companies[0].name, address: companies[0].address.fullAddress },
    programName: subProgram.program.name,
    learningGoals: subProgram.program.learningGoals,
    slotsCount: slots.length + slotsToPlan.length,
    liveDuration: computeLiveDuration(slots, slotsToPlan, subProgram.steps),
    eLearningDuration: computeElearnigDuration(subProgram.steps),
    misc: course.misc,
    learnersCount: await getLearnersCount(course),
    dates: getDates(slots),
    addressList: getAddressList(slots, subProgram.steps),
    trainer: UtilsHelper.formatIdentity(get(trainer, 'identity'), 'FL'),
    price,
  };
};
