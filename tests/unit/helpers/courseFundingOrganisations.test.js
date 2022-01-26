const expect = require('expect');
const sinon = require('sinon');
const CourseFundingOrganisation = require('../../../src/models/CourseFundingOrganisation');
const CourseFundingOrganisationHelper = require('../../../src/helpers/courseFundingOrganisations');
const SinonMongoose = require('../sinonMongoose');

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(CourseFundingOrganisation, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should return all course funding organisations', async () => {
    const courseFundingOrganisations = [
      { name: 'APA du Val de Marne', address: { fullAddress: '22 rue de Paris, 94000 Créteil' } },
      { name: 'APA des Hauts de Seine', address: { fullAddress: '22 rue de Paris, 92000 Nanterre' } },
    ];
    find.returns(SinonMongoose.stubChainedQueries(courseFundingOrganisations, ['lean']));

    const result = await CourseFundingOrganisationHelper.list();

    expect(result).toBe(courseFundingOrganisations);
    SinonMongoose.calledOnceWithExactly(find, [{ query: 'find' }, { query: 'lean' }]);
  });
});

describe('create', () => {
  let save;
  beforeEach(() => {
    save = sinon.stub(CourseFundingOrganisation.prototype, 'save').returnsThis();
  });
  afterEach(() => {
    save.restore();
  });

  it('should create a course funding organisation', async () => {
    const newOrganisation = { name: 'APA du Val de Marne', address: { fullAddress: '22 rue de Paris, 94000 Créteil' } };
    const result = await CourseFundingOrganisationHelper.create(newOrganisation);

    expect(result).toMatchObject(newOrganisation);
  });
});
