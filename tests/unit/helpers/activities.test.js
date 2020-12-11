const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Step = require('../../../src/models/Step');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
const ActivityHelper = require('../../../src/helpers/activities');
const { checkSinon, chainedMongoose } = require('../utils');

describe('getActivity', () => {
  // let ActivityMock;

  // beforeEach(() => {
  //   ActivityMock = sinon.mock(Activity);
  // });

  // afterEach(() => {
  //   ActivityMock.restore();
  // });

  // it('should return the requested activity', async () => {
  //   const activity = { _id: new ObjectID() };

  //   ActivityMock.expects('findOne')
  //     .withExactArgs({ _id: activity._id })
  //     .chain('populate')
  //     .withExactArgs({ path: 'cards', select: '-__v -createdAt -updatedAt' })
  //     .chain('populate')
  //     .withExactArgs({
  //       path: 'steps',
  //       select: '_id -activities',
  //       populate: {
  //         path: 'subProgram',
  //         select: '_id -steps',
  //         populate: { path: 'program', select: 'name -subPrograms' },
  //       },
  //     })
  //     .chain('lean')
  //     .once()
  //     .returns(activity);

  //   const result = await ActivityHelper.getActivity(activity._id);
  //   expect(result).toMatchObject(activity);
  // });

  // ------- STACKOVERFLOW -------
  // https://stackoverflow.com/questions/37948135/how-do-i-stub-a-chain-of-methods-in-sinon
  let ActivityStub;

  it('should return the requested activity', async () => {
    ActivityStub = sinon.stub(Activity, 'findOne').returns({
      populate: sinon.stub().returnsThis(),
      lean: sinon.stub().returns({ _id: 'skusku' }),
    });

    const activity = { _id: new ObjectID() };

    const result = await ActivityHelper.getActivity(activity._id);

    expect(result).toMatchObject({ _id: 'skusku' });
    sinon.assert.calledWithExactly(ActivityStub, { _id: activity._id });
    sinon.assert.calledWithExactly(
      ActivityStub.getCall(0).returnValue.populate,
      { path: 'cards', select: '-__v -createdAt -updatedAt' }
    );
    sinon.assert.calledWithExactly(
      ActivityStub.getCall(0).returnValue.populate.getCall(0).returnValue.populate,
      {
        path: 'steps',
        select: '_id -activities',
        populate:
          { path: 'subProgram', select: '_id -steps', populate: { path: 'program', select: 'name -subPrograms' } },
      }
    );
    sinon.assert.calledWithExactly(
      ActivityStub.getCall(0).returnValue.populate.getCall(0).returnValue.populate.getCall(0).returnValue.lean,
      { virtuals: true }
    );
    ActivityStub.restore();
  });

  it('should return the requested activity - with checkSinon and chainedMongoose', async () => {
    ActivityStub = sinon.stub(Activity, 'findOne').returns(chainedMongoose([{ _id: 'skusku' }]));

    const activity = { _id: new ObjectID() };

    const result = await ActivityHelper.getActivity(activity._id);

    const skusku = [
      { query: '', arg: { _id: activity._id } },
      { query: 'populate', arg: { path: 'cards', select: '-__v -createdAt -updatedAt' } },
      {
        query: 'populate',
        arg: {
          path: 'steps',
          select: '_id -activities',
          populate:
          { path: 'subProgram', select: '_id -steps', populate: { path: 'program', select: 'name -subPrograms' } },
        },
      },
      { query: 'lean', arg: { virtuals: true } },
    ];

    checkSinon(ActivityStub, skusku);
    expect(result).toMatchObject({ _id: 'skusku' });
    ActivityStub.restore();
  });

  // ------- MEDIUM -------
  // https://medium.com/@tehvicke/integration-and-unit-testing-with-jest-in-nodejs-and-mongoose-bd41c61c9fbc
  // let ActivityMock;

  // beforeEach(() => {
  //   ActivityMock = sinon.stub(Activity, 'findOne').callsFake(() => ({
  //     populate: sinon.stub().callsFake(() => ({
  //       populate: sinon.stub().callsFake(() => ({
  //         lean: sinon.stub().returns({ _id: 'skusku' }),
  //       })),
  //     })),
  //   }));
  // });

  // afterEach(() => {
  //   ActivityMock.restore();
  // });

  // it('should return the requested activity', async () => {
  //   const activity = { _id: new ObjectID() };

  //   const result = await ActivityHelper.getActivity(activity._id);

  //   console.log(ActivityMock.getCall(0).returnValue.populate());
  //   expect(result).toMatchObject({ _id: 'skusku' });
  //   sinon.assert.calledWithExactly(ActivityMock, { _id: activity._id });
  //   sinon.assert.calledWithExactly(
  //     ActivityMock.getCall(0).returnValue.populate,
  //     { path: 'cards', select: '-__v -createdAt -updatedAt' }
  //   );
  //   sinon.assert.calledWithExactly(
  //     ActivityMock.getCall(0).returnValue.populate.getCall(0).returnValue.populate,
  //     {
  //       path: 'steps',
  //       select: '_id -activities',
  //       populate:
  //         { path: 'subProgram', select: '_id -steps', populate: { path: 'program', select: 'name -subPrograms' } },
  //     }
  //   );
  //   sinon.assert.calledWithExactly(
  //     ActivityMock.getCall(0).returnValue.populate.getCall(0).returnValue.populate.getCall(0).returnValue.lean,
  //     { virtuals: true }
  //   );
  // });

  // https://stackoverflow.com/questions/27847377/using-sinon-to-stub-chained-mongoose-calls
  // 3ème commentaire -> ne donne rien
  // 1er commentaire -> même code que notre solution mais en moins lisible

  // https://github.com/sinonjs/sinon/issues/92
  // NECECSSITE DE STUB CHAQUE FONCTION (FINDONE, POPULATE, LEAN) PUIS DE FAIRE UN CALLRIGHTAFTER + CALLEDWITHEXACTLY
  // JE N'AI PAS REUSSI A STUB POPULATE NI LEAN
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

describe('detachActivity', () => {
  let StepMock;

  beforeEach(() => {
    StepMock = sinon.mock(Step);
  });

  afterEach(() => {
    StepMock.restore();
  });

  it('should detach activity', async () => {
    const stepId = new ObjectID();
    const activityId = new ObjectID();

    StepMock.expects('updateOne').withExactArgs({ _id: stepId }, { $pull: { activities: activityId } });

    await ActivityHelper.detachActivity(stepId, activityId);

    StepMock.verify();
  });
});
