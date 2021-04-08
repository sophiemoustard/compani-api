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
  let create;
  let updateOne;
  let insertMany;
  let getActivity;
  beforeEach(() => {
    create = sinon.stub(Activity, 'create');
    updateOne = sinon.stub(Step, 'updateOne');
    insertMany = sinon.stub(Card, 'insertMany');
    getActivity = sinon.stub(ActivityHelper, 'getActivity');
  });
  afterEach(() => {
    create.restore();
    updateOne.restore();
    insertMany.restore();
    getActivity.restore();
  });

  it('should create an activity', async () => {
    const stepId = new ObjectID();
    const newActivity = { name: 'c\'est une activité !' };
    const createdActivityId = new ObjectID();
    create.returns({ _id: createdActivityId });

    await ActivityHelper.addActivity(stepId, newActivity);

    sinon.assert.calledOnceWithExactly(create, newActivity);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: stepId }, { $push: { activities: createdActivityId } });
    sinon.assert.notCalled(insertMany);
    sinon.assert.notCalled(getActivity);
  });

  it('should duplicate an activity', async () => {
    const stepId = new ObjectID();
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
    getActivity.returns(activity);
    const cards = activity.cards.map(a => ({ ...a, _id: sinon.match(ObjectID) }));
    create.returns({ _id: newActivity._id });

    await ActivityHelper.addActivity(stepId, { activityId: activity._id });

    sinon.assert.calledOnceWithExactly(getActivity, activity._id);
    sinon.assert.calledOnceWithExactly(insertMany, cards);
    sinon.assert.calledOnceWithExactly(create, {
      name: activity.name,
      type: activity.type,
      cards: cards.map(c => c._id),
    });
    sinon.assert.calledOnceWithExactly(updateOne, { _id: stepId }, { $push: { activities: newActivity._id } });
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

describe('addCard', () => {
  let createCard;
  let updateOne;
  beforeEach(() => {
    createCard = sinon.stub(Card, 'create');
    updateOne = sinon.stub(Activity, 'updateOne');
  });
  afterEach(() => {
    createCard.restore();
    updateOne.restore();
  });

  it('should add card to activity', async () => {
    const cardId = new ObjectID();
    const payload = { template: 'transition' };
    const activity = { _id: new ObjectID(), name: 'faire du jetski' };

    createCard.returns({ _id: cardId });

    await ActivityHelper.addCard(activity._id, payload);

    sinon.assert.calledWithExactly(createCard, payload);
    sinon.assert.calledWithExactly(updateOne, { _id: activity._id }, { $push: { cards: cardId } });
  });
});
