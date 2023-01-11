const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const UserCompany = require('../../../src/models/UserCompany');
const ActivityHistoryHelper = require('../../../src/helpers/activityHistories');
const SinonMongoose = require('../sinonMongoose');

describe('addActivityHistory', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(ActivityHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create an activityHistory', async () => {
    const activityId = new ObjectId();
    const userId = new ObjectId();
    const questionnaireAnswersList = [{ card: new ObjectId(), answerList: ['blabla'] }];

    await ActivityHistoryHelper.addActivityHistory({ user: userId, activity: activityId, questionnaireAnswersList });

    sinon.assert.calledOnceWithExactly(
      create,
      { user: userId, activity: activityId, questionnaireAnswersList }
    );
  });
});

describe('list', () => {
  let findUserCompanies;
  let findHistories;
  beforeEach(() => {
    findHistories = sinon.stub(ActivityHistory, 'find');
    findUserCompanies = sinon.stub(UserCompany, 'find');
  });
  afterEach(() => {
    findHistories.restore();
    findUserCompanies.restore();
  });

  it('should return a list of histories', async () => {
    const companyId = new ObjectId();
    const query = { startDate: '2020-12-10T23:00:00', endDate: '2021-01-10T23:00:00' };
    const firstUserId = new ObjectId();
    const secondUserId = new ObjectId();
    const activityHistories = [
      {
        user: firstUserId,
        activity: {
          steps: [
            {
              subPrograms: [{
                program: { name: 'une incroyable découverte' },
                courses: [{ misc: 'groupe 1', format: 'strictly_e_learning', trainees: [firstUserId] }],
              }],
            },
            { name: 'step without subprogram', subPrograms: [] },
          ],
        },
      },
      { user: firstUserId, activity: { steps: [] } },
      {
        user: secondUserId,
        activity: {
          steps: [{
            subPrograms: [{
              program: { name: 'une rencontre sensationnelle' },
              courses: [{ misc: 'groupe 2', format: 'strictly_e_learning', trainees: [new ObjectId()] }],
            }],
          }],
        },
      }];
    const filteredActivityHistories = {
      user: firstUserId,
      activity: {
        steps: [{
          subPrograms: [{
            program: { name: 'une incroyable découverte' },
            courses: [{ misc: 'groupe 1', format: 'strictly_e_learning', trainees: [firstUserId] }],
          }],
        }],
      },
    };

    findUserCompanies.returns(
      SinonMongoose.stubChainedQueries([{ user: firstUserId }, { user: secondUserId }], ['lean'])
    );
    findHistories.returns(SinonMongoose.stubChainedQueries(activityHistories));

    const result = await ActivityHistoryHelper.list(query, { company: { _id: companyId } });

    expect(result).toEqual([filteredActivityHistories]);
    SinonMongoose.calledOnceWithExactly(
      findUserCompanies,
      [{ query: 'find', args: [{ company: companyId }, { user: 1 }] }, { query: 'lean' }]
    );
    SinonMongoose.calledOnceWithExactly(
      findHistories,
      [
        {
          query: 'find',
          args: [{
            date: { $lte: new Date('2021-01-10T23:00:00'), $gte: new Date('2020-12-10T23:00:00') },
            user: { $in: [firstUserId, secondUserId] },
          }],
        },
        {
          query: 'populate',
          args: [{
            path: 'activity',
            select: '_id',
            populate: {
              path: 'steps',
              select: '_id',
              populate: {
                path: 'subPrograms',
                select: '_id',
                populate: [
                  { path: 'courses', select: 'misc format trainees', match: { format: 'strictly_e_learning' } },
                  { path: 'program', select: 'name' }],
              },
            },
          }],
        },
        { query: 'populate', args: [{ path: 'user', select: '_id identity picture' }] },
        { query: 'lean' },
      ]
    );
  });
});
