const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Card = require('../../../src/models/Card');
const QuestionnaireHelper = require('../../../src/helpers/questionnaires');
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

    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire], ['lean']));

    const result = await QuestionnaireHelper.getQuestionnaire(questionnaireId);

    expect(result).toMatchObject(questionnaire);
    SinonMongoose.calledWithExactly(
      findOne,
      [{ query: 'findOne', args: [{ _id: questionnaireId }] }, { query: 'lean' }]
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
    createCard = sinon.stub(Card, 'create');
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

    sinon.assert.calledWithExactly(createCard, payload);
    sinon.assert.calledWithExactly(updateOne, { _id: questionnaire._id }, { $push: { cards: cardId } });
  });
});
