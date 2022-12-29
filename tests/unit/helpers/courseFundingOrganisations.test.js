const { expect } = require('expect');
const sinon = require('sinon');
const has = require('lodash/has');
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
    const credentials = { role: { vendor: 'training_organisation_manager' } };
    const courseFundingOrganisations = [
      { name: 'APA du Val de Marne', address: { fullAddress: '22 rue de Paris, 94000 Créteil' }, courseBillCount: 2 },
      {
        name: 'APA des Hauts de Seine',
        address: { fullAddress: '22 rue de Paris, 92000 Nanterre' },
        courseBillCount: 0,
      },
    ];
    find.returns(SinonMongoose.stubChainedQueries(courseFundingOrganisations));

    const result = await CourseFundingOrganisationHelper.list(credentials);

    expect(result).toBe(courseFundingOrganisations);
    SinonMongoose.calledOnceWithExactly(
      find,
      [
        { query: 'find' },
        {
          query: 'populate',
          args: [{ path: 'courseBillCount', options: { isVendorUser: has(credentials, 'role.vendor') } }],
        },
        { query: 'lean', args: [{ virtuals: true }] },
      ]
    );
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
