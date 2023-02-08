const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const QuestionnaireHistoriesHelper = require('../../../src/helpers/questionnaireHistories');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');

describe('addQuestionnaireHistory', () => {
  let create;
  let getTraineesCompanyAtCourseRegistration;

  beforeEach(() => {
    create = sinon.stub(QuestionnaireHistory, 'create');
    getTraineesCompanyAtCourseRegistration = sinon
      .stub(CourseHistoriesHelper, 'getTraineesCompanyAtCourseRegistration');
  });

  afterEach(() => {
    create.restore();
    getTraineesCompanyAtCourseRegistration.restore();
  });

  it('should create an questionnaireHistory', async () => {
    const questionnaireId = new ObjectId();
    const company = new ObjectId();
    const userId = new ObjectId();
    const courseId = new ObjectId();
    const questionnaireAnswersList = [{ card: new ObjectId(), answerList: ['blabla'] }];

    getTraineesCompanyAtCourseRegistration.returns([{ company }, { company: new ObjectId() }]);

    await QuestionnaireHistoriesHelper.addQuestionnaireHistory({
      course: courseId,
      user: userId,
      questionnaire: questionnaireId,
      questionnaireAnswersList,
    });

    sinon.assert.calledOnceWithExactly(
      create,
      { course: courseId, user: userId, questionnaire: questionnaireId, questionnaireAnswersList, company }
    );
  });
});
