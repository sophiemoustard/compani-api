const sinon = require('sinon');
const flat = require('flat');
const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
const CardHelper = require('../../../src/helpers/cards');
const CloudinaryHelper = require('../../../src/helpers/cloudinary');
require('sinon-mongoose');

describe('addCard', () => {
  let CardMock;
  let ActivityMock;
  const activity = { _id: new ObjectID(), name: 'faire du jetski' };
  const newCard = { template: 'transition' };

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

    ActivityMock.expects('updateOne').withExactArgs({ _id: activity._id }, { $push: { cards: cardId } });

    await CardHelper.addCard(activity._id, newCard);

    CardMock.verify();
    ActivityMock.verify();
  });

  it('should return an error if activity does not exist', async () => {
    try {
      ActivityMock.expects('countDocuments').withExactArgs({ _id: activity._id }).returns(0);

      CardMock.expects('create').never();
      ActivityMock.expects('updateOne').never();

      await CardHelper.addCard(activity._id, newCard);
    } catch (e) {
      CardMock.verify();
      ActivityMock.verify();
    }
  });
});

describe('updateCard', () => {
  let updateOne;
  const cardId = new ObjectID();
  const payload = { title: 'transition' };

  beforeEach(() => {
    updateOne = sinon.stub(Card, 'updateOne');
  });

  afterEach(() => {
    updateOne.restore();
  });

  it('should update card', async () => {
    await CardHelper.updateCard(cardId, payload);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: cardId }, { $set: payload });
  });
});

describe('uploadMedia', () => {
  let updateOneStub;
  let addImageStub;
  beforeEach(() => {
    updateOneStub = sinon.stub(Card, 'updateOne');
    addImageStub = sinon.stub(CloudinaryHelper, 'addImage')
      .returns({ public_id: 'azertyuiop', secure_url: 'https://compani.io' });
  });
  afterEach(() => {
    updateOneStub.restore();
    addImageStub.restore();
  });

  it('should upload image', async () => {
    const cardId = new ObjectID();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };
    const cardUpdatePayload = {
      media: {
        publicId: 'azertyuiop',
        link: 'https://compani.io',
      },
    };

    await CardHelper.uploadMedia(cardId, payload);
    sinon.assert.calledOnce(addImageStub);
    sinon.assert.calledWithExactly(updateOneStub, { _id: cardId }, { $set: flat(cardUpdatePayload) });
  });
});
