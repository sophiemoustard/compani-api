const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Course = require('../../../src/models/Course');
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
    const newQuestionnaire = { name: 'test', type: 'expectations' };
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
    const questionnairesList = [{ name: 'test' }, { name: 'test2' }];

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
    const questionnaire = { _id: questionnaireId, name: 'test' };

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
    const questionnaire = { _id: questionnaireId, name: 'test2', cards };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries([questionnaire], ['lean']));

    const result = await QuestionnaireHelper.update(questionnaireId, { name: 'test2', cards });

    expect(result).toMatchObject(questionnaire);
    SinonMongoose.calledWithExactly(
      findOneAndUpdate,
      [
        { query: 'findOneAndUpdate', args: [{ _id: questionnaireId }, { $set: { name: 'test2', cards } }] },
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
    const questionnaire = { _id: new ObjectID(), name: 'faire du jetski' };

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
  let nowStub;
  beforeEach(() => {
    findOne = sinon.stub(Questionnaire, 'findOne');
    nowStub = sinon.stub(Date, 'now');
  });
  afterEach(() => {
    findOne.restore();
    nowStub.restore();
  });

  it('should return questionnaire', async () => {
    const course = {
      _id: new ObjectID(),
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const credentials = { _id: new ObjectID() };
    const questionnaire = { _id: new ObjectID(), name: 'test', histories: [] };

    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return questionnaire if no slots', async () => {
    const course = { _id: new ObjectID(), slots: [] };
    const questionnaire = { _id: new ObjectID(), name: 'test', histories: [] };
    const credentials = { _id: new ObjectID() };

    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if questionnaire is already answered', async () => {
    const course = {
      _id: new ObjectID(),
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const credentials = { _id: new ObjectID() };
    const questionnaire = {
      _id: new ObjectID(),
      name: 'test',
      histories: [{ _id: new ObjectID(), course: course._id, user: credentials._id }],
    };

    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return questionnaire if questionnaire is not answered for this course', async () => {
    const course = {
      _id: new ObjectID(),
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const credentials = { _id: new ObjectID() };
    const questionnaire = { _id: new ObjectID(), name: 'test', histories: [] };

    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return questionnaire if questionnaire is not answered by this user', async () => {
    const course = {
      _id: new ObjectID(),
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const credentials = { _id: new ObjectID() };
    const questionnaire = { _id: new ObjectID(), name: 'test', histories: [] };

    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if no questionnaire', async () => {
    const course = {
      _id: new ObjectID(),
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const credentials = { _id: new ObjectID() };

    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOne.returns(SinonMongoose.stubChainedQueries([null]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if first slot is passed', async () => {
    const course = {
      _id: new ObjectID(),
      format: 'blended',
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const credentials = { _id: new ObjectID() };

    nowStub.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOne);
  });

  it('should return an empty array if course is strictly e-learning', async () => {
    const course = { _id: new ObjectID(), format: 'strictly_e_learning' };
    const credentials = { _id: new ObjectID() };

    nowStub.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(course, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOne);
  });
});

describe('getFollowUp', () => {
  let courseFindOne;
  let questionnaireFindOne;
  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
    questionnaireFindOne = sinon.stub(Questionnaire, 'findOne');
  });
  afterEach(() => {
    courseFindOne.restore();
    questionnaireFindOne.restore();
  });

  it('should return follow up', async () => {
    const questionnaireId = new ObjectID();
    const courseId = new ObjectID();
    const course = {
      _id: courseId,
      company: { name: 'company' },
      subProgram: { program: { name: 'test' } },
      misc: 'infos',
    };
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [{
        _id: new ObjectID(),
        course: course._id,
        questionnaireAnswersList: [
          {
            card: {
              _id: new ObjectID(),
              template: 'open_question',
              isMandatory: true,
              question: 'aimez-vous ce test ?',
            },
            answerList: ['blabla'],
          },
          {
            card: {
              _id: new ObjectID(),
              template: 'survey',
              isMandatory: true,
              question: 'combien aimez vous ce test sur une échelle de 1 à 5 ?',
              label: { left: '1', right: '5' },
            },
            answerList: ['3'],
          },
        ],
      }],
    };

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course], ['select', 'populate', 'lean']));
    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries([questionnaire], ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, courseId);

    expect(result).toMatchObject({
      course: {
        programName: 'test',
        companyName: 'company',
        misc: 'infos',
      },
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [
        {
          answers: ['blabla'],
          isMandatory: true,
          question: 'aimez-vous ce test ?',
          template: 'open_question',
        },
        {
          answers: ['3'],
          isMandatory: true,
          question: 'combien aimez vous ce test sur une échelle de 1 à 5 ?',
          template: 'survey',
          label: { left: '1', right: '5' },
        },
      ],
    });
    SinonMongoose.calledWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'select', args: ['subProgram company misc'] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] }],
        },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: courseId },
            populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
          }],
        },
        { query: 'lean' },
      ]
    );
  });
  it('should return an empty array for followUp if answer is empty', async () => {
    const questionnaireId = new ObjectID();
    const courseId = new ObjectID();
    const course = {
      _id: courseId,
      company: { name: 'company' },
      subProgram: { program: { name: 'test' } },
      misc: 'infos',
    };
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [{
        _id: new ObjectID(),
        course: course._id,
        questionnaireAnswersList: [{
          card: { _id: new ObjectID(), template: 'open_question', isMandatory: true, question: 'aimez-vous ce test ?' },
          answerList: [''],
        }],
      }],
    };

    courseFindOne.returns(SinonMongoose.stubChainedQueries([course], ['select', 'populate', 'lean']));
    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries([questionnaire], ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, courseId);

    expect(result).toMatchObject({
      course: {
        programName: 'test',
        companyName: 'company',
        misc: 'infos',
      },
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [],
    });
    SinonMongoose.calledWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'select', args: ['subProgram company misc'] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] }],
        },
        { query: 'populate', args: [{ path: 'company', select: 'name' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: courseId },
            populate: { path: 'questionnaireAnswersList.card', select: '-createdAt -updatedAt' },
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});
