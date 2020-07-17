const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const CardHelper = require('../../../src/helpers/cards');
const Activity = require('../../../src/models/Activity');
require('sinon-mongoose');

describe('addCard', () => {
  let CardMock;
  let ActivityMock;
  const activity = { _id: new ObjectID(), title: 'faire du jetski' };
  const newCard = { type: 'transition' };

  beforeEach(() => {
    CardMock = sinon.mock(Card);
    ActivityMock = sinon.mock(Activity);
  });

  afterEach(() => {
    CardMock.restore();
    ActivityMock.restore();
  });

  it('should create an transition card', async () => {
    const cardId = new ObjectID();
    ActivityMock.expects('countDocuments').withExactArgs({ _id: activity._id }).returns(1);

    CardMock.expects('create').withExactArgs(newCard).returns({ _id: cardId });

    const returnedActivity = { ...activity, steps: [cardId] };
    ActivityMock.expects('findOneAndUpdate')
      .withExactArgs({ _id: activity._id }, { $push: { cards: cardId } }, { new: true })
      .chain('lean')
      .returns(returnedActivity);

    const result = await CardHelper.addCard(activity._id, newCard);

    expect(result).toMatchObject(returnedActivity);
    CardMock.verify();
    ActivityMock.verify();
  });

  it('should return an error if activity does not exist', async () => {
    try {
      ActivityMock.expects('countDocuments').withExactArgs({ _id: activity._id }).returns(0);

      CardMock.expects('create').never();
      ActivityMock.expects('findOneAndUpdate').never();

      const result = await CardHelper.addCard(activity._id, newCard);

      expect(result).toBeUndefined();
    } catch (e) {
      CardMock.verify();
      ActivityMock.verify();
    }
  });
});

