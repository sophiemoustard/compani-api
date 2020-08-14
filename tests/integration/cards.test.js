const expect = require('expect');
const GetStream = require('get-stream');
const sinon = require('sinon');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const app = require('../../server');
const Card = require('../../src/models/Card');
const CloudinaryHelper = require('../../src/helpers/cloudinary');
const { populateDB, cardsList } = require('./seed/cardsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CARDS ROUTES - PUT /cards/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const cardId = cardsList[0]._id;
  const payload = {
    title: 'rigoler',
    text: 'c\'est bien',
    media: { publicId: '12345', link: '0987654' },
    backText: 'text verso',
  };

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    const cards = [
      { template: 'transition', payload: { title: 'transition' }, id: cardsList[0]._id },
      {
        template: 'title_text_media',
        payload: { title: 'TTM', text: 'test', media: { link: 'lien', publicId: 'id' } },
        id: cardsList[1]._id,
      },
      { template: 'title_text', payload: { title: 'titre', text: 'this is a text' }, id: cardsList[2]._id },
      {
        template: 'text_media',
        payload: { text: 'still a text', media: { link: '123', publicId: '456' } },
        id: cardsList[3]._id,
      },
      { template: 'flashcard', payload: { backText: 'verso', text: 'this is a text' }, id: cardsList[4]._id },
    ];

    cards.forEach((card) => {
      it(`should update a ${card.template} card`, async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/cards/${card.id.toHexString()}`,
          payload: card.payload,
          headers: { 'x-access-token': authToken },
        });

        const cardUpdated = await Card.findById(card.id).lean();

        expect(response.statusCode).toBe(200);

        const expectedObject = omit(card.payload, ['media']);
        if (card.payload.media) expectedObject.media = expect.objectContaining(card.payload.media);
        expect(cardUpdated).toEqual(expect.objectContaining(expectedObject));
      });
    });

    it('should return a 400 if title is equal to \'\' ', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${cardId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/cards/${cardId.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('POST /cards/:id/cloudinary/upload', () => {
  let authToken;
  let form;
  let addImageStub;
  const card = cardsList[0];
  const docPayload = { fileName: 'title_text_media', file: 'true' };
  beforeEach(() => {
    form = generateFormData(docPayload);
    addImageStub = sinon.stub(CloudinaryHelper, 'addImage')
      .returns({ public_id: 'abcdefgh', secure_url: 'https://alenvi.io' });
  });
  afterEach(() => {
    addImageStub.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add a card media', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${card._id}/cloudinary/upload`,
        payload: await GetStream(form),
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      const cardWithMedia = { ...card, media: { publicId: 'abcdefgh', link: 'https://alenvi.io' } };
      const cardUpdated = await Card.findById(card._id, { name: 1, media: 1 }).lean();

      expect(response.statusCode).toBe(200);
      expect(cardUpdated).toMatchObject(pick(cardWithMedia, ['_id', 'name', 'media']));
      sinon.assert.calledOnce(addImageStub);
    });

    const wrongParams = ['file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const invalidForm = generateFormData(omit(docPayload, param));
        const response = await app.inject({
          method: 'POST',
          url: `/cards/${card._id}/cloudinary/upload`,
          payload: await GetStream(invalidForm),
          headers: { ...invalidForm.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'auxiliary', expectedCode: 403 },
      { name: 'auxiliary_without_company', expectedCode: 403 },
      { name: 'coach', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'training_organisation_manager', expectedCode: 200 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/cards/${card._id}/cloudinary/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
