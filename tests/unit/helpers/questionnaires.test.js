const sinon = require('sinon');
const expect = require('expect');
const Questionnaire = require('../../../src/models/Questionnaire');
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

    find.returns(SinonMongoose.stubChainedQueries([questionnairesList]));

    const result = await QuestionnaireHelper.list();
    expect(result).toMatchObject(questionnairesList);
    SinonMongoose.calledWithExactly(find, [{ query: 'find' }, { query: 'lean' }]);
  });
});
