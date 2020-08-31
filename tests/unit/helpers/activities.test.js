const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Step = require('../../../src/models/Step');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
const ActivityHelper = require('../../../src/helpers/activities');
require('sinon-mongoose');

describe('getActivity', () => {
  let ActivityMock;

  beforeEach(() => {
    ActivityMock = sinon.mock(Activity);
  });

  afterEach(() => {
    ActivityMock.restore();
  });

  it('should return the requested activity', async () => {
    const activity = { _id: new ObjectID() };

    ActivityMock.expects('findOne')
      .withExactArgs({ _id: activity._id })
      .chain('populate')
      .withExactArgs({ path: 'cards', select: '-__v -createdAt -updatedAt' })
      .chain('lean')
      .once()
      .returns(activity);

    const result = await ActivityHelper.getActivity(activity._id);
    expect(result).toMatchObject(activity);
  });
});

describe('updateActivity', () => {
  let ActivityMock;

  beforeEach(() => {
    ActivityMock = sinon.mock(Activity);
  });

  afterEach(() => {
    ActivityMock.restore();
  });

  it('should update an activity\'s name', async () => {
    const activity = { _id: new ObjectID(), name: 'faire du pedalo' };
    const payload = { name: 'faire dodo' };

    ActivityMock.expects('updateOne')
      .withExactArgs({ _id: activity._id }, { $set: payload })
      .once();

    await ActivityHelper.updateActivity(activity._id, payload);

    ActivityMock.verify();
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
