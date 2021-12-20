const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const QuestionnaireHistoryHelper = require('../../../src/helpers/questionnaireHistories');

describe('addQuestionnaireHistory', () => {
  let create;

  beforeEach(() => {
    create = sinon.stub(QuestionnaireHistory, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create an questionnaireHistory', async () => {
    const questionnaireId = new ObjectId();
    const userId = new ObjectId();
    const courseId = new ObjectId();
    const questionnaireAnswersList = [{ card: new ObjectId(), answerList: ['blabla'] }];

    await QuestionnaireHistoryHelper.addQuestionnaireHistory({
      course: courseId,
      user: userId,
      questionnaire: questionnaireId,
      questionnaireAnswersList,
    });

    sinon.assert.calledOnceWithExactly(
      create,
      { course: courseId, user: userId, questionnaire: questionnaireId, questionnaireAnswersList }
    );
  });
});
