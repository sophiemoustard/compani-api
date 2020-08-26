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
  const transitionId = cardsList[0]._id;
  const fillTheGapId = cardsList[5]._id;
  const orderTheSequenceId = cardsList[8]._id;
  const singleChoiceQuestionId = cardsList[7]._id;
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
      {
        template: 'fill_the_gaps',
        payload: {
          text: 'Un texte à remplir par <trou>l\'apprenant -e</trou>.',
          falsyAnswers: ['le papa', 'la maman', 'le papi'],
          explanation: 'c\'est evidement la mamie qui remplit le texte',
        },
        id: fillTheGapId,
      },
      {
        template: 'order_the_sequence',
        payload: {
          question: 'Que faire dans cette situation ?',
          orderedAnswers: ['rien', 'des trucs', 'ou pas'],
          explanation: 'en fait on doit faire ça',
        },
        id: orderTheSequenceId,
      },
      {
        template: 'single_choice_question',
        payload: {
          question: 'Que faire dans cette situation ?',
          qcuGoodAnswer: 'plein de trucs',
          falsyAnswers: ['rien', 'des trucs', 'ou pas'],
          explanation: 'en fait on doit faire ça',
        },
        id: singleChoiceQuestionId,
      },
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

    it('should return a 400 if title is equal to \'\' on transition card', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${transitionId.toHexString()}`,
        payload: { name: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    describe('Fill the gaps', () => {
      const requests = [
        { msg: 'valid text', payload: { text: 'on truc <trou>b\'ien -èï</trou>propre' }, passing: true },
        { msg: 'no tagging', payload: { text: 'du text sans balise' } },
        { msg: 'single open tag', payload: { text: 'lalalalal <trou>lili</trou> djsfbjdsfbdjsf<trou>' } },
        { msg: 'single closing tag', payload: { text: 'lalalalal <trou>lili</trou> djsfbjdsfbdjsf</trou>' } },
        { msg: 'conflicting tags', payload: { text: 'lalaal <trou>l<trou>ili</trou> djsfbjdsfbd</trou>' } },
        { msg: 'long content', payload: { text: 'lalalalal <trou> rgtrgtghtgtrgtrgtrgtili</trou> djsfbjdsfbd' } },
        { msg: 'wrong character in content', payload: { text: 'lalalalal <trou>?</trou> djsfbjdsfbd' } },
        { msg: 'valid answers', payload: { falsyAnswers: ['la maman', 'le tonton'] }, passing: true },
        { msg: 'remove one of the 2 existing answers', payload: { falsyAnswers: ['la maman'] } },
        { msg: 'long answer', payload: { falsyAnswers: ['la maman', 'more then 15 characters'] } },
        { msg: 'wrong character in answer', payload: { falsyAnswers: ['la maman', 'c\'est tout.'] } },
        { msg: 'spaces around answer', payload: { text: 'on truc <trou> test</trou>propre' } },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.passing ? '200' : '400'} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${fillTheGapId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(request.passing ? 200 : 400);
        });
      });
    });

    describe('Order the sequence', () => {
      const requests = [
        { msg: 'valid ordered answers', payload: { orderedAnswers: ['en fait si', 'a ouai, non'] }, passing: true },
        { msg: 'remove one of the 2 existing ordered answers', payload: { orderedAnswers: ['en fait si'] } },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.passing ? '200' : '400'} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${orderTheSequenceId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(request.passing ? 200 : 400);
        });
      });
    });

    describe('single choice question', () => {
      const requests = [
        { msg: 'valid answers', payload: { falsyAnswers: ['toto'] }, code: 200 },
        { msg: 'missing falsyAnswer', payload: { falsyAnswers: [] }, code: 400 },
        { msg: 'too many answer', payload: { falsyAnswers: ['toto', 'toto', 'toto', 'toto'] }, code: 400 },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${singleChoiceQuestionId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          expect(response.statusCode).toBe(request.code);
        });
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
          method: 'PUT',
          payload,
          url: `/cards/${transitionId.toHexString()}`,
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
