const sinon = require('sinon');
const { expect } = require('expect');
const { ObjectId } = require('mongodb');
const Questionnaire = require('../../../src/models/Questionnaire');
const Course = require('../../../src/models/Course');
const Card = require('../../../src/models/Card');
const QuestionnaireHelper = require('../../../src/helpers/questionnaires');
const CardHelper = require('../../../src/helpers/cards');
const {
  EXPECTATIONS,
  PUBLISHED,
  END_OF_COURSE,
  INTRA,
  TRAINING_ORGANISATION_MANAGER,
  TRAINER,
} = require('../../../src/helpers/constants');
const SinonMongoose = require('../sinonMongoose');
const UtilsMock = require('../../utilsMock');

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
    const credentials = { role: { vendor: { name: TRAINING_ORGANISATION_MANAGER } } };
    const questionnairesList = [{ name: 'test' }, { name: 'test2' }];

    find.returns(SinonMongoose.stubChainedQueries(questionnairesList));

    const result = await QuestionnaireHelper.list(credentials);

    expect(result).toMatchObject(questionnairesList);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find', args: [{}] },
        { query: 'populate', args: [{ path: 'historiesCount', options: { isVendorUser: true } }] },
        { query: 'lean' },
      ]
    );
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
    const questionnaireId = new ObjectId();
    const questionnaire = { _id: questionnaireId, name: 'test' };

    findOne.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const result = await QuestionnaireHelper.getQuestionnaire(questionnaireId);

    expect(result).toMatchObject(questionnaire);
    SinonMongoose.calledOnceWithExactly(
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
    const questionnaireId = new ObjectId();
    const cards = [new ObjectId(), new ObjectId()];
    const questionnaire = { _id: questionnaireId, name: 'test2', cards };

    findOneAndUpdate.returns(SinonMongoose.stubChainedQueries(questionnaire, ['lean']));

    const result = await QuestionnaireHelper.update(questionnaireId, { name: 'test2', cards });

    expect(result).toMatchObject(questionnaire);
    SinonMongoose.calledOnceWithExactly(
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
    const cardId = new ObjectId();
    const payload = { template: 'transition' };
    const questionnaire = { _id: new ObjectId(), name: 'faire du jetski' };

    createCard.returns({ _id: cardId });

    await QuestionnaireHelper.addCard(questionnaire._id, payload);

    sinon.assert.calledOnceWithExactly(createCard, payload);
    sinon.assert.calledOnceWithExactly(updateOne, { _id: questionnaire._id }, { $push: { cards: cardId } });
  });
});

describe('removeCard', () => {
  let findOneAndDeleteCard;
  let updateOne;
  let deleteMedia;
  beforeEach(() => {
    findOneAndDeleteCard = sinon.stub(Card, 'findOneAndDelete');
    updateOne = sinon.stub(Questionnaire, 'updateOne');
    deleteMedia = sinon.stub(CardHelper, 'deleteMedia');
  });
  afterEach(() => {
    findOneAndDeleteCard.restore();
    updateOne.restore();
    deleteMedia.restore();
  });

  it('should remove card without media from questionnaire', async () => {
    const cardId = new ObjectId();

    findOneAndDeleteCard.returns(SinonMongoose.stubChainedQueries(null, ['lean']));

    await QuestionnaireHelper.removeCard(cardId);

    sinon.assert.calledOnceWithExactly(updateOne, { cards: cardId }, { $pull: { cards: cardId } });
    sinon.assert.notCalled(deleteMedia);
    SinonMongoose.calledOnceWithExactly(
      findOneAndDeleteCard,
      [
        { query: 'findOneAndDelete', args: [{ _id: cardId }, { 'media.publicId': 1 }] },
        { query: 'lean' },
      ]
    );
  });

  it('should remove card with media from questionnaire', async () => {
    const cardId = new ObjectId();
    const card = { _id: cardId, media: { publicId: 'publicId' } };

    findOneAndDeleteCard.returns(SinonMongoose.stubChainedQueries(card, ['lean']));

    await QuestionnaireHelper.removeCard(cardId);

    sinon.assert.calledOnceWithExactly(updateOne, { cards: cardId }, { $pull: { cards: cardId } });
    sinon.assert.calledOnceWithExactly(deleteMedia, cardId, 'publicId');
    SinonMongoose.calledOnceWithExactly(
      findOneAndDeleteCard,
      [
        { query: 'findOneAndDelete', args: [{ _id: cardId }, { 'media.publicId': 1 }] },
        { query: 'lean' },
      ]
    );
  });
});

describe('getUserQuestionnaires', () => {
  let findOneQuestionnaire;
  let findOneCourse;
  beforeEach(() => {
    findOneQuestionnaire = sinon.stub(Questionnaire, 'findOne');
    UtilsMock.mockCurrentDate('2021-04-13T15:00:00.000Z');
    findOneCourse = sinon.stub(Course, 'findOne');
  });
  afterEach(() => {
    findOneQuestionnaire.restore();
    UtilsMock.unmockCurrentDate();
    findOneCourse.restore();
  });

  it('should return an empty array if course is strictly e-learning', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = { _id: courseId, format: 'strictly_e_learning' };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOneQuestionnaire);
    SinonMongoose.calledOnceWithExactly(
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
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(null));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if expectations questionnaire is already answered', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = {
      _id: new ObjectId(),
      name: 'test',
      histories: [{ _id: new ObjectId(), course: course._id, user: credentials._id }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return expectations questionnaire if course not started and questionnaire not answered', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = { _id: new ObjectId(), name: 'test', type: 'expectations', histories: [] };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return expectations questionnaire if no slots', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = { _id: courseId, slots: [] };
    const questionnaire = { _id: new ObjectId(), name: 'test', histories: [] };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: EXPECTATIONS, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
  });

  it('should return an empty array if course is started and has slots to plan', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
      slotsToPlan: [{ _id: new ObjectId() }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    UtilsMock.mockCurrentDate('2021-04-23T15:00:00.000Z');
    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOneQuestionnaire);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    UtilsMock.unmockCurrentDate();
  });

  it('should return an empty array if is ended and no end of course questionnaire', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    UtilsMock.mockCurrentDate('2021-04-23T15:00:00.000Z');
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(null));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: END_OF_COURSE, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    UtilsMock.unmockCurrentDate();
  });

  it('should return an empty array if end of course questionnaire is already answered', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') }],
    };
    const questionnaire = {
      _id: new ObjectId(),
      name: 'test',
      histories: [{ _id: new ObjectId(), course: course._id, user: credentials._id }],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    UtilsMock.mockCurrentDate('2021-04-23T15:00:00.000Z');
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: END_OF_COURSE, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    UtilsMock.unmockCurrentDate();
  });

  it('should return end of course questionnaire if last slot is started and questionnaire not answered', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      slots: [{ startDate: new Date('2021-04-23T09:00:00'), endDate: new Date('2021-04-23T11:00:00') }],
    };
    const questionnaire = { _id: new ObjectId(), name: 'test', type: 'end_of_course', histories: [] };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    UtilsMock.mockCurrentDate('2021-04-23T15:00:00.000Z');
    findOneQuestionnaire.returns(SinonMongoose.stubChainedQueries(questionnaire));

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([questionnaire]);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      findOneQuestionnaire,
      [
        { query: 'findOne', args: [{ type: END_OF_COURSE, status: PUBLISHED }, { type: 1, name: 1 }] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: course._id, user: credentials._id },
            options: { requestingOwnInfos: true },
            select: { _id: 1 },
          }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    UtilsMock.unmockCurrentDate();
  });

  it('should return an empty array if first slot is passed but last slot isn\'t', async () => {
    const courseId = new ObjectId();
    const credentials = { _id: new ObjectId() };
    const course = {
      _id: courseId,
      format: 'blended',
      slots: [
        { startDate: new Date('2021-04-20T09:00:00'), endDate: new Date('2021-04-20T11:00:00') },
        { startDate: new Date('2021-04-24T09:00:00'), endDate: new Date('2021-04-24T11:00:00') },
      ],
    };

    findOneCourse.returns(SinonMongoose.stubChainedQueries(course));
    UtilsMock.mockCurrentDate('2021-04-23T15:00:00.000Z');

    const result = await QuestionnaireHelper.getUserQuestionnaires(courseId, credentials);

    expect(result).toMatchObject([]);
    sinon.assert.notCalled(findOneQuestionnaire);
    SinonMongoose.calledOnceWithExactly(
      findOneCourse,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'populate', args: [{ path: 'slots', select: '-__v -createdAt -updatedAt' }] },
        { query: 'populate', args: [{ path: 'slotsToPlan', select: '_id' }] },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
    UtilsMock.unmockCurrentDate();
  });
});

describe('getFollowUp', () => {
  let courseFindOne;
  let questionnaireFindOne;
  const credentials = { role: { vendor: { name: TRAINER } } };

  beforeEach(() => {
    courseFindOne = sinon.stub(Course, 'findOne');
    questionnaireFindOne = sinon.stub(Questionnaire, 'findOne');
  });
  afterEach(() => {
    courseFindOne.restore();
    questionnaireFindOne.restore();
  });

  it('should return follow up for course', async () => {
    const questionnaireId = new ObjectId();
    const courseId = new ObjectId();
    const companyId = new ObjectId();
    const course = {
      _id: courseId,
      companies: [{ name: 'company' }],
      subProgram: { program: { name: 'test' } },
      misc: 'infos',
      type: INTRA,
    };
    const cardsIds = [new ObjectId(), new ObjectId()];
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [
        {
          _id: new ObjectId(),
          course: course._id,
          company: companyId,
          questionnaireAnswersList: [
            {
              card: { _id: cardsIds[0], template: 'open_question', isMandatory: true, question: 'aimes-tu ce test ?' },
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
          _id: new ObjectId(),
          course: course._id,
          company: companyId,
          questionnaireAnswersList: [
            {
              card: {
                _id: cardsIds[0],
                template: 'open_question',
                isMandatory: true,
                question: 'aimes-tu ce test ?',
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

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['select', 'populate', 'lean']));
    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries(questionnaire, ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, courseId, credentials);

    expect(result).toMatchObject({
      course: { programName: 'test', companyName: 'company', misc: 'infos' },
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [
        {
          answers: [
            { answer: 'blabla', course: course._id, traineeCompany: companyId },
            { answer: 'test test', course: course._id, traineeCompany: companyId },
          ],
          isMandatory: true,
          question: 'aimes-tu ce test ?',
          template: 'open_question',
        },
        {
          answers: [
            { answer: '3', course: course._id, traineeCompany: companyId },
            { answer: '2', course: course._id, traineeCompany: companyId },
          ],
          isMandatory: true,
          question: 'combien aimez vous ce test sur une échelle de 1 à 5 ?',
          template: 'survey',
          label: { left: '1', right: '5' },
        },
      ],
    });
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'select', args: ['subProgram companies misc type'] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] }],
        },
        { query: 'populate', args: [{ path: 'companies', select: 'name' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: courseId },
            options: { isVendorUser: true },
            select: '-__v -createdAt -updatedAt',
            populate: [
              { path: 'questionnaireAnswersList.card', select: '-__v -createdAt -updatedAt' },
              {
                path: 'course',
                select: 'trainer subProgram',
                populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return follow up for for all courses', async () => {
    const questionnaireId = new ObjectId();
    const cardsIds = [new ObjectId(), new ObjectId()];
    const companyId = new ObjectId();
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [
        {
          _id: new ObjectId(),
          course: new ObjectId(),
          company: companyId,
          questionnaireAnswersList: [
            {
              card: { _id: cardsIds[0], template: 'open_question', isMandatory: true, question: 'aimes-tu ce test ?' },
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
          _id: new ObjectId(),
          course: new ObjectId(),
          company: companyId,
          questionnaireAnswersList: [
            {
              card: { _id: cardsIds[0], template: 'open_question', isMandatory: true, question: 'aimes-tu ce test ?' },
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

    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries(questionnaire, ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, null, credentials);

    expect(result).toMatchObject({
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [
        {
          answers: [
            { answer: 'blabla', course: questionnaire.histories[0].course },
            { answer: 'test test', course: questionnaire.histories[1].course },
          ],
          isMandatory: true,
          question: 'aimes-tu ce test ?',
          template: 'open_question',
        },
        {
          answers: [
            { answer: '3', course: questionnaire.histories[0].course },
            { answer: '2', course: questionnaire.histories[1].course },
          ],
          isMandatory: true,
          question: 'combien aimez vous ce test sur une échelle de 1 à 5 ?',
          template: 'survey',
          label: { left: '1', right: '5' },
        },
      ],
    });
    SinonMongoose.calledOnceWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: null,
            options: { isVendorUser: true },
            select: '-__v -createdAt -updatedAt',
            populate: [
              { path: 'questionnaireAnswersList.card', select: '-__v -createdAt -updatedAt' },
              {
                path: 'course',
                select: 'trainer subProgram',
                populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array for followUp if answerList is empty', async () => {
    const questionnaireId = new ObjectId();
    const courseId = new ObjectId();
    const companyId = new ObjectId();
    const course = {
      _id: courseId,
      companies: [{ name: 'company' }],
      subProgram: { program: { name: 'test' } },
      misc: 'infos',
      type: INTRA,
    };
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [{
        _id: new ObjectId(),
        course: course._id,
        company: companyId,
        questionnaireAnswersList: [{
          card: { _id: new ObjectId(), template: 'open_question', isMandatory: true, question: 'aimes-tu ce test ?' },
          answerList: [''],
        }],
      }],
    };

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['select', 'populate', 'lean']));
    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries(questionnaire, ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, courseId, credentials);

    expect(result).toMatchObject({
      course: {
        programName: 'test',
        companyName: 'company',
        misc: 'infos',
      },
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [],
    });
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'select', args: ['subProgram companies misc type'] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] }],
        },
        { query: 'populate', args: [{ path: 'companies', select: 'name' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: courseId },
            options: { isVendorUser: true },
            select: '-__v -createdAt -updatedAt',
            populate: [
              { path: 'questionnaireAnswersList.card', select: '-__v -createdAt -updatedAt' },
              {
                path: 'course',
                select: 'trainer subProgram',
                populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array for followUp if histories is empty', async () => {
    const questionnaireId = new ObjectId();
    const courseId = new ObjectId();
    const course = {
      _id: courseId,
      companies: [{ name: 'company' }],
      subProgram: { program: { name: 'test' } },
      misc: 'infos',
      type: INTRA,
    };
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [],
    };

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['select', 'populate', 'lean']));
    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries(questionnaire, ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, courseId, credentials);

    expect(result).toMatchObject({
      course: {
        programName: 'test',
        companyName: 'company',
        misc: 'infos',
      },
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [],
    });
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'select', args: ['subProgram companies misc type'] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] }],
        },
        { query: 'populate', args: [{ path: 'companies', select: 'name' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: courseId },
            options: { isVendorUser: true },
            select: '-__v -createdAt -updatedAt',
            populate: [
              { path: 'questionnaireAnswersList.card', select: '-__v -createdAt -updatedAt' },
              {
                path: 'course',
                select: 'trainer subProgram',
                populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
  });

  it('should return an empty array for followUp if questionnaireAnswersList is empty', async () => {
    const questionnaireId = new ObjectId();
    const courseId = new ObjectId();
    const companyId = new ObjectId();
    const course = {
      _id: courseId,
      companies: [{ name: 'company' }],
      subProgram: { program: { name: 'test' } },
      misc: 'infos',
      type: INTRA,
    };
    const questionnaire = {
      _id: questionnaireId,
      type: EXPECTATIONS,
      name: 'questionnaire',
      histories: [{
        _id: new ObjectId(),
        course: course._id,
        company: companyId,
        questionnaireAnswersList: [],
      }],
    };

    courseFindOne.returns(SinonMongoose.stubChainedQueries(course, ['select', 'populate', 'lean']));
    questionnaireFindOne.returns(SinonMongoose.stubChainedQueries(questionnaire, ['select', 'populate', 'lean']));

    const result = await QuestionnaireHelper.getFollowUp(questionnaireId, courseId, credentials);

    expect(result).toMatchObject({
      course: {
        programName: 'test',
        companyName: 'company',
        misc: 'infos',
      },
      questionnaire: { type: EXPECTATIONS, name: 'questionnaire' },
      followUp: [],
    });
    SinonMongoose.calledOnceWithExactly(
      courseFindOne,
      [
        { query: 'findOne', args: [{ _id: courseId }] },
        { query: 'select', args: ['subProgram companies misc type'] },
        {
          query: 'populate',
          args: [{ path: 'subProgram', select: 'program', populate: [{ path: 'program', select: 'name' }] }],
        },
        { query: 'populate', args: [{ path: 'companies', select: 'name' }] },
        { query: 'lean' },
      ]
    );
    SinonMongoose.calledOnceWithExactly(
      questionnaireFindOne,
      [
        { query: 'findOne', args: [{ _id: questionnaireId }] },
        { query: 'select', args: ['type name'] },
        {
          query: 'populate',
          args: [{
            path: 'histories',
            match: { course: courseId },
            options: { isVendorUser: true },
            select: '-__v -createdAt -updatedAt',
            populate: [
              { path: 'questionnaireAnswersList.card', select: '-__v -createdAt -updatedAt' },
              {
                path: 'course',
                select: 'trainer subProgram',
                populate: { path: 'subProgram', select: 'program', populate: { path: 'program', select: '_id' } },
              },
            ],
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});
