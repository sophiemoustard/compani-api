const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const PartnerOrganization = require('../../../src/models/PartnerOrganization');
const Partner = require('../../../src/models/Partner');
const PartnerOrganizationsHelper = require('../../../src/helpers/partnerOrganizations');
const SinonMongoose = require('../sinonMongoose');

describe('create', () => {
  let create;
  beforeEach(() => {
    create = sinon.stub(PartnerOrganization, 'create');
  });
  afterEach(() => {
    create.restore();
  });

  it('should create partner organization', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const payload = {
      name: 'Etchebest Corporation',
      phone: '0123456789',
      email: 'sku@alenvi.io',
      address: {
        fullAddress: '24 avenue Daumesnil 75012 Paris',
        zipCode: '75012',
        city: 'Paris',
        street: '24 avenue Daumesnil',
        location: { type: 'Point', coordinates: [2.377133, 48.801389] },
      },
    };

    await PartnerOrganizationsHelper.create(payload, credentials);

    sinon.assert.calledOnceWithExactly(
      create,
      {
        name: 'Etchebest Corporation',
        phone: '0123456789',
        email: 'sku@alenvi.io',
        address: {
          fullAddress: '24 avenue Daumesnil 75012 Paris',
          zipCode: '75012',
          city: 'Paris',
          street: '24 avenue Daumesnil',
          location: { type: 'Point', coordinates: [2.377133, 48.801389] },
        },
        company: credentials.company._id,
      }
    );
  });
});

describe('list', () => {
  let find;
  beforeEach(() => {
    find = sinon.stub(PartnerOrganization, 'find');
  });
  afterEach(() => {
    find.restore();
  });

  it('should list partner organizations from my company', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const partnerOrganizationId = new ObjectID();

    find.returns(
      SinonMongoose.stubChainedQueries(
        [[{ _id: partnerOrganizationId, name: 'skusku', partners: [] }]],
        ['populate', 'lean']
      )
    );

    const result = await PartnerOrganizationsHelper.list(credentials);

    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        {
          query: 'populate',
          args: [
            {
              path: 'partners',
              match: { company: credentials.company._id },
              populate: { path: 'customerPartners', match: { prescriber: true, company: credentials.company._id } },
            },
          ],
        },
        { query: 'lean' },
      ]
    );

    expect(result).toEqual(
      [{ _id: partnerOrganizationId, name: 'skusku', partners: [], prescribedCustomersCount: 0 }]
    );
  });

  it('should list partner organizations and the number of customers prescribed by each partner', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const partnerOrganizationIds = [new ObjectID(), new ObjectID()];
    const partnersIds = [new ObjectID()];
    const customerPartnersIds = [new ObjectID()];

    const partnerOrganizations = [
      { _id: partnerOrganizationIds[0], name: 'skusku', company: credentials.company._id, partners: [] },
      {
        _id: partnerOrganizationIds[1],
        name: 'Super structure',
        partners: [
          {
            _id: partnersIds[0],
            identity: { firstname: 'Partenaire', lastname: 'prescripteur' },
            company: credentials.company._id,
            phone: '0987654321',
            email: 'partenaire.agathe@gmail.com',
            job: 'Psychologue',
            customerPartners: [
              {
                _id: customerPartnersIds[0],
                identity: { firstname: 'Agathe', lastname: 'The power' },
                company: credentials.company._id,
                prescriber: true,
              },
            ],
          },
        ],
      },
    ];

    find.returns(SinonMongoose.stubChainedQueries([partnerOrganizations], ['populate', 'lean']));

    const result = await PartnerOrganizationsHelper.list(credentials);

    SinonMongoose.calledWithExactly(
      find,
      [
        { query: 'find', args: [{ company: credentials.company._id }] },
        {
          query: 'populate',
          args: [
            {
              path: 'partners',
              match: { company: credentials.company._id },
              populate: { path: 'customerPartners', match: { prescriber: true, company: credentials.company._id } },
            },
          ],
        },
        { query: 'lean' },
      ]
    );

    expect(result).toEqual(
      [
        {
          _id: partnerOrganizationIds[0],
          company: credentials.company._id,
          name: 'skusku',
          partners: [],
          prescribedCustomersCount: 0,
        },
        {
          _id: partnerOrganizationIds[1],
          name: 'Super structure',
          partners: [
            {
              _id: partnersIds[0],
              identity: { firstname: 'Partenaire', lastname: 'prescripteur' },
              company: credentials.company._id,
              phone: '0987654321',
              email: 'partenaire.agathe@gmail.com',
              job: 'Psychologue',
              customerPartners: [
                {
                  _id: customerPartnersIds[0],
                  identity: { firstname: 'Agathe', lastname: 'The power' },
                  company: credentials.company._id,
                  prescriber: true,
                },
              ],
            },
          ],
          prescribedCustomersCount: 1,
        },
      ]
    );
  });
});

describe('getPartnerOrganization', () => {
  let findOne;
  beforeEach(() => {
    findOne = sinon.stub(PartnerOrganization, 'findOne');
  });
  afterEach(() => {
    findOne.restore();
  });

  it('should update a partner organizations', async () => {
    const partnerOrganizationId = new ObjectID();
    const credentials = { company: { _id: new ObjectID() } };

    findOne.returns(SinonMongoose.stubChainedQueries([[{ _id: partnerOrganizationId, name: 'skusku' }]]));

    await PartnerOrganizationsHelper.getPartnerOrganization(partnerOrganizationId, credentials);

    SinonMongoose.calledWithExactly(
      findOne,
      [
        { query: 'findOne', args: [{ _id: partnerOrganizationId, company: credentials.company._id }] },
        {
          query: 'populate',
          args: [{
            path: 'partners',
            match: { company: credentials.company._id },
            select: 'identity phone email job',
            populate: {
              path: 'customerPartners',
              match: { prescriber: true, company: credentials.company._id },
              populate: { path: 'customer', select: 'identity createdAt' },
            },
          }],
        },
        { query: 'lean' },
      ]
    );
  });
});

describe('update', () => {
  let updateOne;
  beforeEach(() => {
    updateOne = sinon.stub(PartnerOrganization, 'updateOne');
  });
  afterEach(() => {
    updateOne.restore();
  });

  it('should update a partner organizations', async () => {
    const payload = { name: 'skusku' };
    const partnerOrganizationId = new ObjectID();

    await PartnerOrganizationsHelper.update(partnerOrganizationId, payload);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: partnerOrganizationId }, { $set: { name: 'skusku' } });
  });
});

describe('createPartner', () => {
  let updateOne;
  let createPartner;
  beforeEach(() => {
    updateOne = sinon.stub(PartnerOrganization, 'updateOne');
    createPartner = sinon.stub(Partner, 'create');
  });
  afterEach(() => {
    updateOne.restore();
    createPartner.restore();
  });

  it('should update a partner and add it to partnerOrganization', async () => {
    const credentials = { company: { _id: new ObjectID() } };
    const payload = { identity: { firstname: 'Manon', lastname: 'Palindrome' } };
    const partnerOrganizationId = new ObjectID();
    const partner = { _id: new ObjectID() };

    createPartner.returns(partner);

    await PartnerOrganizationsHelper.createPartner(partnerOrganizationId, payload, credentials);

    sinon.assert.calledOnceWithExactly(updateOne, { _id: partnerOrganizationId }, { $push: { partners: partner._id } });
    sinon.assert.calledOnceWithExactly(
      createPartner,
      {
        identity: { firstname: 'Manon', lastname: 'Palindrome' },
        partnerOrganization: partnerOrganizationId,
        company: credentials.company._id,
      }
    );
  });
});
