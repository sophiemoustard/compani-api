const sinon = require('sinon');
const { ObjectID } = require('mongodb');
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
    const questionnaireId = new ObjectID();
    const userId = new ObjectID();
    const courseId = new ObjectID();
    const questionnaireAnswersList = [{ card: new ObjectID(), answerList: ['blabla'] }];

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
