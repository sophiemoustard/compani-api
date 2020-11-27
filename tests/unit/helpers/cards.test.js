const sinon = require('sinon');
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
  let formatFileName;
  beforeEach(() => {
    updateOneStub = sinon.stub(Card, 'updateOne');
    uploadMediaStub = sinon.stub(GCloudStorageHelper, 'uploadProgramMedia');
    formatFileName = sinon.stub(GCloudStorageHelper, 'formatFileName');
  });
  afterEach(() => {
    updateOneStub.restore();
    uploadMediaStub.restore();
    formatFileName.restore();
  });

  it('should upload image', async () => {
    uploadMediaStub.returns({
      publicId: 'jesuisunsupernomdefichier',
      link: 'https://storage.googleapis.com/BucketKFC/myMedia',
    });
    formatFileName.returns('jesuisunsupernomdefichier');

    const cardId = new ObjectID();
    const payload = { file: new ArrayBuffer(32), fileName: 'illustration' };

    await CardHelper.uploadMedia(cardId, payload);

    sinon.assert.calledOnceWithExactly(formatFileName, 'illustration');
    sinon.assert.calledOnceWithExactly(uploadMediaStub, { fileName: 'jesuisunsupernomdefichier', file: payload.file });
    sinon.assert.calledWithExactly(
      updateOneStub,
      { _id: cardId },
      {
        $set: flat({
          media: { publicId: 'jesuisunsupernomdefichier', link: 'https://storage.googleapis.com/BucketKFC/myMedia' },
        }),
      }
    );
  });
});

describe('deleteMedia', () => {
  let updateOne;
  let deleteMedia;
  beforeEach(() => {
    updateOne = sinon.stub(Card, 'updateOne');
    deleteMedia = sinon.stub(GCloudStorageHelper, 'deleteMedia');
  });
  afterEach(() => {
    updateOne.restore();
    deleteMedia.restore();
  });

  it('should do nothing as publicId is not set', async () => {
    const cardId = new ObjectID();
    await CardHelper.deleteMedia(cardId, '');

    sinon.assert.notCalled(updateOne);
    sinon.assert.notCalled(deleteMedia);
  });

  it('should update card and delete media', async () => {
    const cardId = new ObjectID();
    await CardHelper.deleteMedia(cardId, 'publicId');

    sinon.assert.calledOnceWithExactly(
      updateOne,
      { _id: cardId },
      { $unset: { 'media.publicId': '', 'media.link': '' } }
    );
    sinon.assert.calledOnceWithExactly(deleteMedia, 'publicId');
  });
});
