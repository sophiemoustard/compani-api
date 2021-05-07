const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const QuestionnaireHelper = require('../../../src/helpers/questionnaires');
const CardHelper = require('../../../src/helpers/cards');
const { EXPECTATIONS, PUBLISHED, END_OF_COURSE } = require('../../../src/helpers/constants');
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
  let findOneCard;
  let updateOne;
  let deleteMedia;
  beforeEach(() => {
    removeCard = sinon.stub(CardHelper, 'removeCard');
    findOneCard = sinon.stub(Card, 'findOne');
    updateOne = sinon.stub(Questionnaire, 'updateOne');
    deleteMedia = sinon.stub(CardHelper, 'deleteMedia');
  });
  afterEach(() => {
    removeCard.restore();
    findOneCard.restore();
    updateOne.restore();
    deleteMedia.restore();
  });

  it('should remove card without media from questionnaire', async () => {
    const cardId = new ObjectID();

    findOneCard.returns(SinonMongoose.stubChainedQueries([null], ['lean']));

    await QuestionnaireHelper.removeCard(cardId);

    sinon.assert.calledOnceWithExactly(updateOne, { cards: cardId }, { $pull: { cards: cardId } });
    sinon.assert.calledOnceWithExactly(removeCard, cardId);
    sinon.assert.notCalled(deleteMedia);
    SinonMongoose.calledWithExactly(
      findOneCard,
      [
        { query: 'findOne', args: [{ _id: cardId, 'media.publicId': { $exists: true } }, { 'media.publicId': 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should remove card with media from questionnaire', async () => {
    const cardId = new ObjectID();
    const card = { _id: cardId, media: { publicId: 'publicId' } };

    findOneCard.returns(SinonMongoose.stubChainedQueries([card], ['lean']));

    await QuestionnaireHelper.removeCard(cardId);

    sinon.assert.calledOnceWithExactly(updateOne, { cards: cardId }, { $pull: { cards: cardId } });
    sinon.assert.calledOnceWithExactly(removeCard, cardId);
    sinon.assert.calledOnceWithExactly(deleteMedia, cardId, 'publicId');
    SinonMongoose.calledWithExactly(
      findOneCard,
      [
        { query: 'findOne', args: [{ _id: cardId, 'media.publicId': { $exists: true } }, { 'media.publicId': 1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('getUserQuestionnaires', () => {
  let findOneQuestionnaire;
  let nowStub;
  let findOneCourse;
  beforeEach(() => {
    findOneQuestionnaire = sinon.stub(Questionnaire, 'findOne');
    nowStub = sinon.stub(Date, 'now');
    findOneCourse = sinon.stub(Course, 'findOne');
  });
  afterEach(() => {
    findOneQuestionnaire.restore();
    nowStub.restore();
    findOneCourse.restore();
  });

  it('should return an empty array if course is strictly e-learning', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = { _id: courseId, format: 'strictly_e_learning' };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-13T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOneQuestionnaire);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if not started and no expectations questionnaire', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([null]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if expectations questionnaire is already answered', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = {
      _id: new ObjectID(),
      name: 'test',
      histories: [{ _id: new ObjectID(), course: course._id, user: credentials._id }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return expectations questionnaire if course not started and questionnaire not answered', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = { _id: new ObjectID(), name: 'test', type: 'expectations', histories: [] };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return expectations questionnaire if no slots', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = { _id: courseId, slots: [] };
    const questionnaire = { _id: new ObjectID(), name: 'test', histories: [] };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-13T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if course is started and has slots to plan', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
      slotsToPlan: [{ _id: new ObjectID() }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOneQuestionnaire);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if is ended and no end of course questionnaire', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-23T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([null]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: END_OF_COURSE, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if end of course questionnaire is already answered', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = {
      _id: new ObjectID(),
      name: 'test',
      histories: [{ _id: new ObjectID(), course: course._id, user: credentials._id }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-23T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: END_OF_COURSE, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return end of course questionnaire if course ended and questionnaire not answered', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = { _id: new ObjectID(), name: 'test', type: 'end_of_course', histories: [] };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-23T15:00:00'));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries([questionnaire]));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: END_OF_COURSE, status: PUBLISHED }, { type: 1, name: 1 }] },
        { query: 'populate', args: [{ path: 'histories', match: { course: course._id, user: credentials._id } }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if first slot is passed but last slot isn\'t', async () => {
    const courseId = new ObjectID();
    const credentials = { _id: new ObjectID() };
    const course = {
      _id: courseId,
      format: 'blended',
      slots: [
        { startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') },
        { startDate: new Date('2021-04-24T09:00:00'), endDate: new Date('2021-04-24T11:00:00') },
      ],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries([course]));
    nowStub.returns(new Date('2021-04-23T15:00:00'));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOneQuestionnaire);
    SinonMongoose.calledWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
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
    const cardsIds = [new ObjectID(), new ObjectID()];
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [
        {
          _id: new ObjectID(),
          course: course._id,
          questionnaireAnswersList: [
            {
              card: {
                _id: cardsIds[0],
                template: 'open_question',
                isMandatory: true,
                question: 'aimez-vous ce test ?',
              },
              answerList: ['blabla'],
            },
            {
              card: {
                _id: cardsIds[1],
                template: 'survey',
                isMandatory: true,
                question: 'combien aimez vous ce test sur une échelle de 1 à 5 ?',
                label: { left: '1', right: '5' },
              },
              answerList: ['3'],
            },
          ],
        },
        {
          _id: new ObjectID(),
          course: course._id,
          questionnaireAnswersList: [
            {
              card: {
                _id: cardsIds[0],
                template: 'open_question',
                isMandatory: true,
                question: 'aimez-vous ce test ?',
              },
              answerList: ['test test'],
            },
            {
              card: {
                _id: cardsIds[1],
                template: 'survey',
                isMandatory: true,
                question: 'combien aimez vous ce test sur une échelle de 1 à 5 ?',
                label: { left: '1', right: '5' },
              },
              answerList: ['2'],
            },
          ],
        },
      ],
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
          answers: ['blabla', 'test test'],
          isMandatory: true,
          question: 'aimez-vous ce test ?',
          template: 'open_question',
        },
        {
          answers: ['3', '2'],
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

  it('should return an empty array for followUp if answerList is empty', async () => {
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

  it('should return an empty array for followUp if histories is empty', async () => {
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
      histories: [],
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

  it('should return an empty array for followUp if questionnaireAnswersList is empty', async () => {
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
        questionnaireAnswersList: [],
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
