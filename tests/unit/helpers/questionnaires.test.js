const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const QuestionnaireHelper = require('../../../src/helpers/questionnaires');
const CardHelper = require('../../../src/helpers/cards');
const { EXPECTATIONS, PUBLISHED } = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(Questionnaire, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create questionnaire', async () => {
    const newQuestionnaire = { title: 'test', type: 'expectations' };
    await QuestionnaireHelper.create(newQuestionnaire);

    sinon.assert.calledOnceWithExactly(create, newQuestionnaire);
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(Questionnaire, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return questionnaires', async () => {
    const questionnairesList = [{ title: 'test' }, { title: 'test2' }];

    find.returns(SinonMongoose.stubChainedQueries([questionnairesList], ['lean']));

    const result = await QuestionnaireHelper.list();

    expect(result).toMatchObject(questionnairesList);
    SinonMongoose.calledWithExactly(find, [{ query: 'find' }, { query: 'lean' }]);
  });
});

describe('getQuestionnaire', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(Questionnaire, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should return questionnaire', async () => {
    const questionnaireId = new ObjectID();
    const questionnaire = { _id: questionnaireId, title: 'test' };

    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getQuestionnaire(questionnaireId);

    expect(result).toMatchObject(questionnaire);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'populate', args: [{ path: 'cards', select: '-__v -createdAt -updatedAt' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });
});

describe('editQuestionnaire', () => {
  let findOneAndUpdate;
  beforeEach(() => {
    findOneAndUpdate = sinon.stub(Questionnaire, 'findOneAndUpdate');
  });
  afterEach(() => {
    findOneAndUpdate.restore();
  });

  it('should update questionnaire', async () => {
    const questionnaireId = new ObjectID();
    const cards = [new ObjectID(), new ObjectID()];
    const questionnaire = { _id: questionnaireId, title: 'test2', cards };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([questionnaire], ['lean']));

    const result = await QuestionnaireHelper.update(questionnaireId, { title: 'test2', cards });

    expect(result).toMatchObject(questionnaire);
    SinonMongoose.calledWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: questionnaireId }, { $set: { title: 'test2', cards } }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('addCard', () => {
  let createCard;
  let updateOne;
  beforeEach(() => {
    createCard = sinon.stub(CardHelper, 'createCard');
    updateOne = sinon.stub(Questionnaire, 'updateOne');
  });
  afterEach(() => {
    createCard.restore();
    updateOne.restore();
  });

  it('should add card to questionnaire', async () => {
    const cardId = new ObjectID();
    const payload = { template: 'transition' };
    const questionnaire = { _id: new ObjectID(), title: 'faire du jetski' };

    createCard.returns({ _id: cardId });

    await QuestionnaireHelper.addCard(questionnaire._id, payload);

    sinon.assert.calledOnceWithExactly(createCard, payload);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: questionnaire._id }, { $push: { cards: cardId } });
  });
});

describe('removeCard', () => {
  let removeCard;
  let updateOne;
  beforeEach(() => {
    removeCard = sinon.stub(CardHelper, 'removeCard');
    updateOne = sinon.stub(Questionnaire, 'updateOne');
  });
  afterEach(() => {
    removeCard.restore();
    updateOne.restore();
  });

  it('should remove card from questionnaire', async () => {
    const cardId = new ObjectID();

    await QuestionnaireHelper.removeCard(cardId);

    sinon.assert.calledOnceWithExactly(updateOne, { cards: cardId }, { $pull: { cards: cardId } });
    sinon.assert.calledOnceWithExactly(removeCard, cardId);
  });
});

describe('getUserQuestionnaires', () => {
  let findOne;
  let fakeDate;
  beforeEach(() => {
    findOne = sinon.stub(Questionnaire, 'findOne');
    fakeDate = sinon.stub(Date, 'now');
  });
  afterEach(() => {
    findOne.restore();
    fakeDate.restore();
  });

  it('should return questionnaire', async () => {
    const course = {
      _id: new ObjectID(),
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = { _id: new ObjectID(), title: 'test' };

    fakeDate.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire], ['lean']));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, title: 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array if first slot is passed', async () => {
    const course = {
      _id: new ObjectID(),
      format: 'blended',
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };

    fakeDate.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOne);
  });

  it('should return an empty array if no slots', async () => {
    const course = { _id: new ObjectID(), format: 'blended', slots: [] };

    fakeDate.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOne);
  });

  it('should return an empty array if course is strictly e-learning', async () => {
    const course = { _id: new ObjectID(), format: 'strictly_e_learning' };

    fakeDate.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOne);
  });
});
