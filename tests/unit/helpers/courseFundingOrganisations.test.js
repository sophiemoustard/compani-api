const expect = require('expect');
const sinon = require('sinon');
const { ObjectId } = require('mongodb');
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
  let create;

  beforeEach(() => {
    create = sinon.stub(CourseFundingOrganisation, 'create');
  });

  afterEach(() => {
    create.restore();
  });

  it('should create a course funding organisation', async () => {
    const newOrganisation = { name: 'APA du Val de Marne', address: { fullAddress: '22 rue de Paris, 94000 Créteil' } };
    await CourseFundingOrganisationHelper.create(newOrganisation);

    sinon.assert.calledOnceWithExactly(create, newOrganisation);
  });
});

describe('remove', () => {
  let deleteOne;

  beforeEach(() => {
    deleteOne = sinon.stub(CourseFundingOrganisation, 'deleteOne');
  });

  afterEach(() => {
    deleteOne.restore();
  });

  it('should delete a course funding organisation', async () => {
    const organisationId = new ObjectId();
    await CourseFundingOrganisationHelper.remove({ _id: organisationId });

    sinon.assert.calledOnceWithExactly(deleteOne, { _id: organisationId });
  });
});
