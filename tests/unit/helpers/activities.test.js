const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Step = require('../../../src/models/Step');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
const ActivityHelper = require('../../../src/helpers/activities');
const SinonMongoose = require('../sinonMongoose');

describe('getActivity', () => {
  let findOne;

  beforeEach(() => {
    findOne = sinon.stub(Activity, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return the requested activity - with checkSinon and stubChainedQueries', async () => {
    findOne.returns(SinonMongoose.stubChainedQueries([{ _id: 'skusku' }]));

    const activity = { _id: new ObjectID() };

    const result = await ActivityHelper.getActivity(activity._id);

    const chainedPayload = [
      { query: '', args: [{ _id: activity._id }] },
      { query: 'populate', args: [{ path: 'cards', select: '-__v -createdAt -updatedAt' }] },
      {
        query: 'populate',
        args: [{
          path: 'steps',
          select: '_id -activities',
          populate:
          { path: 'subProgram', select: '_id -steps', populate: { path: 'program', select: 'name -subPrograms' } },
        }],
      },
      { query: 'lean', args: [{ virtuals: true }] },
    ];

    SinonMongoose.calledWithExactly(findOne, chainedPayload);
    expect(result).toMatchObject({ _id: 'skusku' });
  });
});

describe('updateActivity', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Activity, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update an activity\'s name', async () => {
    const activity = { _id: new ObjectID(), name: 'faire du pedalo' };
    const payload = { name: 'faire dodo' };

    await ActivityHelper.updateActivity(activity._id, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: activity._id }, { $set: payload });
  });
});

describe('addActivity', () => {
  let StepMock;
  let ActivityMock;
  let CardMock;

  beforeEach(() => {
    StepMock = sinon.mock(Step);
    ActivityMock = sinon.mock(Activity);
    CardMock = sinon.mock(Card);
  });

  afterEach(() => {
    StepMock.restore();
    ActivityMock.restore();
    CardMock.restore();
  });

  const step = { _id: new ObjectID(), name: 'step' };
  it('should create an activity', async () => {
    const newActivity = { name: 'c\'est une étape !' };
    const activityId = new ObjectID();

    ActivityMock.expects('create').withExactArgs(newActivity).returns({ _id: activityId });

    StepMock.expects('updateOne').withExactArgs({ _id: step._id }, { $push: { activities: activityId } });

    await ActivityHelper.addActivity(step._id, newActivity);

    StepMock.verify();
    ActivityMock.verify();
  });

  it('should duplicate an activity', async () => {
    const activity = {
      _id: new ObjectID(),
      name: 'danser',
      type: 'quiz',
      cards: [
        { _id: new ObjectID(), template: 'transition', title: 'coucou' },
        { _id: new ObjectID(), template: 'title_text', title: 'ok' },
      ],
    };
    const newActivity = {
      ...activity,
      _id: new ObjectID(),
      cards: activity.cards.map(c => ({ ...c, _id: new ObjectID() })),
    };
    const getActivityStub = sinon.stub(ActivityHelper, 'getActivity').returns(activity);

    CardMock.expects('insertMany')
      .withExactArgs(activity.cards.map(a => ({ ...a, _id: sinon.match(ObjectID) })));

    ActivityMock.expects('create').returns({ _id: newActivity._id });

    StepMock.expects('updateOne').withExactArgs({ _id: step._id }, { $push: { activities: newActivity._id } });

    await ActivityHelper.addActivity(step._id, { activityId: activity._id });

    StepMock.verify();
    ActivityMock.verify();
    CardMock.verify();

    sinon.assert.calledWithExactly(getActivityStub, activity._id);
    getActivityStub.restore();
  });
});

describe('detachActivity', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Step, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should detach activity', async () => {
    const stepId = new ObjectID();
    const activityId = new ObjectID();

    await ActivityHelper.detachActivity(stepId, activityId);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: stepId }, { $pull: { activities: activityId } });
  });
});
