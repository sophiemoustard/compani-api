const sinon = require('sinon');
const { ObjectId } = require('mongodb');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const QuestionnaireHistoriesHelper = require('../../../src/helpers/questionnaireHistories');
const CourseHistoriesHelper = require('../../../src/helpers/courseHistories');
const { COURSE, TRAINEE } = require('../../../src/helpers/constants');

describe('addQuestionnaireHistory', () => {
  let create;
  let getCompanyAtCourseRegistrationList;

  beforeEach(() => {
    create = sinon.stub(QuestionnaireHistory, 'create');
    getCompanyAtCourseRegistrationList = sinon
      .stub(CourseHistoriesHelper, 'getCompanyAtCourseRegistrationList');
  });

  afterEach(() => {
    create.restore();
    getCompanyAtCourseRegistrationList.restore();
  });

  it('should create an questionnaireHistory', async () => {
    const questionnaireId = new ObjectId();
    const company = new ObjectId();
    const userId = new ObjectId();
    const courseId = new ObjectId();
    const questionnaireAnswersList = [{ card: new ObjectId(), answerList: ['blabla'] }];

    getCompanyAtCourseRegistrationList.returns([{ company }, { company: new ObjectId() }]);

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
    sinon.assert.calledOnceWithExactly(
      getCompanyAtCourseRegistrationList,
      { key: COURSE, value: courseId },
      { key: TRAINEE, value: [userId] }
    );
  });
});
