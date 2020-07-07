const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Module = require('../../../src/models/Module');
const Activity = require('../../../src/models/Activity');
const ActivityHelper = require('../../../src/helpers/activities');
require('sinon-mongoose');

describe('addActivity', () => {
  let ModuleMock;
  let ActivityMock;

  beforeEach(() => {
    ModuleMock = sinon.mock(Module);
    ActivityMock = sinon.mock(Activity);
  });

  afterEach(() => {
    ModuleMock.restore();
    ActivityMock.restore();
  });

  const module = { _id: new ObjectID(), title: 'module' };
  it('should create an activity', async () => {
    const newActivity = { title: 'c\'est un module !' };
    const activityId = new ObjectID();
    ActivityMock.expects('create').withExactArgs(newActivity).returns({ _id: activityId });

    const returnedModule = { ...module, modules: [activityId] };
    ModuleMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: module._id }, { $push: { activities: activityId } }, { new: true })
      .chain('lean')
      .returns(returnedModule);

    const result = await ActivityHelper.addActivity(module._id, newActivity);

    expect(result).toMatchObject(returnedModule);
    ModuleMock.verify();
    ActivityMock.verify();
  });
});

