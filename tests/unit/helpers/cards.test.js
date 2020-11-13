const sinon = require('sinon');
const moment = require('moment');
const { fn: momentProto } = require('moment');
const flat = require('flat');
const { ObjectID } = require('mongodb');
const Card = require('../../../src/models/Card');
const Activity = require('../../../src/models/Activity');
const CardHelper = require('../../../src/helpers/cards');
const GCloudStorageHelper = require('../../../src/helpers/gCloudStorage');
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

    CardMock.expects('create').withExactArgs(newCard).returns({ _id: cardId });

    ActivityMock.expects('updateOne').withExactArgs({ _id: activity._id }, { $push: { cards: cardId } });

    await CardHelper.addCard(activity._id, newCard);

    CardMock.verify();
    ActivityMock.verify();
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

describe('addCardAnswer', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Card, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should add card answer', async () => {
    const cardId = new ObjectID();
    await CardHelper.addCardAnswer(cardId);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: cardId }, { $push: { questionAnswers: { text: '' } } });
  });
});

describe('updateCardAnswer', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Card, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update card answer', async () => {
    const params = { _id: new ObjectID(), answerId: new ObjectID() };
    await CardHelper.updateCardAnswer(params, { text: 'test text' });
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: params._id, 'questionAnswers._id': params.answerId },
      { $set: { 'questionAnswers.$.text': 'test text' } }
    );
  });
});

describe('deleteCardAnswer', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(Card, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should add card answer', async () => {
    const params = { _id: new ObjectID(), answerId: new ObjectID() };
    await CardHelper.deleteCardAnswer(params);
    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: params._id },
      { $pull: { questionAnswers: { _id: params.answerId } } }
    );
  });
});

describe('removeCard', () => {
  let updateOneActivity;
  let deleteOneCard;
  beforeEach(() => {
    updateOneActivity = sinon.stub(Activity, 'updateOne');
    deleteOneCard = sinon.stub(Card, 'deleteOne');
  });
  afterEach(() => {
    updateOneActivity.restore();
    deleteOneCard.restore();
  });

  it('should delete card', async () => {
    const cardId = new ObjectID();
    await CardHelper.removeCard(cardId);
    sinon.assert.calledOnceWithExactly(updateOneActivity, { cards: cardId }, { $pull: { cards: cardId } });
    sinon.assert.calledOnceWithExactly(deleteOneCard, { _id: cardId });
  });
});

describe('uploadMedia', () => {
  let updateOneStub;
  let uploadMediaStub;
  let momentFormat;
  beforeEach(() => {
    updateOneStub = sinon.stub(Card, 'updateOne');
    uploadMediaStub = sinon.stub(GCloudStorageHelper, 'uploadMedia');
    momentFormat = sinon.stub(momentProto, 'format');
  });
  afterEach(() => {
    updateOneStub.restore();
    uploadMediaStub.restore();
    momentFormat.restore();
  });

  it('should upload image', async () => {
    momentFormat.returns('2020_06_25_05_45_12');
    uploadMediaStub.returns('https://storage.googleapis.com/BucketKFC/myMedia');

    const cardId = new ObjectID();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };
    const publicId = `${payload.fileName}-2020_06_25_05_45_12`;

    await CardHelper.uploadMedia(cardId, payload);

    sinon.assert.calledOnceWithExactly(uploadMediaStub, { fileName: publicId, file: payload.file });
    sinon.assert.calledWithExactly(
      updateOneStub,
      { _id: cardId },
      { $set: flat({ media: { publicId, link: 'https://storage.googleapis.com/BucketKFC/myMedia' } }) }
    );
  });
});
