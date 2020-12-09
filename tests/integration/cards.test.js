const expect = require('expect');
const { fn: momentProto } = require('moment');
const GetStream = require('get-stream');
const sinon = require('sinon');
const omit = require('lodash/omit');
const { ObjectID } = require('mongodb');
const app = require('../../server');
const Card = require('../../src/models/Card');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const { populateDB, cardsList, activitiesList } = require('./seed/cardsSeed');
const { getToken } = require('./seed/authenticationSeed');
const { generateFormData } = require('./utils');
const Activity = require('../../src/models/Activity');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CARDS ROUTES - PUT /cards/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const transitionId = cardsList[0]._id;
  const flashCardId = cardsList[4]._id;
  const fillTheGapId = cardsList[5]._id;
  const orderTheSequenceId = cardsList[8]._id;
  const singleChoiceQuestionId = cardsList[7]._id;
  const multipleChoiceQuestionId = cardsList[6]._id;
  const surveyId = cardsList[9]._id;
  const openQuestionId = cardsList[10]._id;
  const questionAnswerId = cardsList[11]._id;
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
      { template: 'transition', payload: { title: 'transition' }, id: transitionId },
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
          gappedText: 'Un texte à remplir par <trou>l\'apprenant -e</trou>.',
          falsyGapAnswers: ['le papa', 'la maman', 'le papi'],
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
          qcAnswers: [
            { _id: new ObjectID(), text: 'rien' },
            { _id: new ObjectID(), text: 'des trucs' },
            { _id: new ObjectID(), text: 'ou pas' },
          ],
          explanation: 'en fait on doit faire ça',
        },
        id: singleChoiceQuestionId,
      },
      {
        template: 'multiple_choice_question',
        payload: {
          question: 'Que faire dans cette situation ?',
          qcAnswers: [
            { _id: new ObjectID(), text: 'un truc', correct: true },
            { _id: new ObjectID(), text: 'rien', correct: false },
          ],
          explanation: 'en fait on doit faire ça',
        },
        id: multipleChoiceQuestionId,
      },
      {
        template: 'survey',
        payload: {
          question: 'Sur une échelle de 1 à 10 ?',
          label: { left: '1', right: '10' },
        },
        id: surveyId,
      },
      { template: 'open_question', payload: { question: 'Quelque chose à ajouter ?' }, id: openQuestionId },
      {
        template: 'question_answer',
        payload: {
          isQuestionAnswerMultipleChoiced: true,
          question: 'Que faire dans cette situation ?',
        },
        id: questionAnswerId,
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

        expect(response.statusCode).toBe(200);

        const cardUpdated = await Card.findById(card.id).lean({ virtuals: true });
        expect(cardUpdated).toEqual(expect.objectContaining({ isValid: true }));

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
        { msg: 'valid gappedText', payload: { gappedText: 'on truc <trou>b\'ien -èï</trou>propre' }, passing: true },
        { msg: 'no tagging', payload: { gappedText: 'du text sans balise' } },
        { msg: 'single open tag', payload: { gappedText: 'lalalalal <trou>lili</trou> djsfbjdsfbdjsf<trou>' } },
        { msg: 'single closing tag', payload: { gappedText: 'lalalalal <trou>lili</trou> djsfbjdsfbdjsf</trou>' } },
        { msg: 'conflicting tags', payload: { gappedText: 'lalaal <trou>l<trou>ili</trou> djsfbjdsfbd</trou>' } },
        { msg: 'long content', payload: { gappedText: 'lalalalal <trou> rgtrgtghtgtrgtrgtrgtili</trou> djsfbjdsfbd' } },
        { msg: 'wrong character in content', payload: { gappedText: 'lalalalal <trou>?</trou> djsfbjdsfbd' } },
        { msg: 'line break in content', payload: { gappedText: 'lalalalal <trou>bfh\nee</trou> djsfbjdsfbd' } },
        { msg: 'valid answers', payload: { falsyGapAnswers: ['la maman', 'le tonton'] }, passing: true },
        { msg: 'remove one of the 2 existing answers', payload: { falsyGapAnswers: ['la maman'] } },
        { msg: 'long answer', payload: { falsyGapAnswers: ['la maman', 'more then 15 characters'] } },
        { msg: 'wrong character in answer', payload: { falsyGapAnswers: ['la maman', 'c\'est tout.'] } },
        { msg: 'spaces around answer', payload: { gappedText: 'on truc <trou> test</trou>propre' } },
        { msg: 'too many falsy answers', payload: { falsyGapAnswers: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] } },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.passing ? '200' : '400'} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${fillTheGapId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          const cardUpdated = await Card.findById(fillTheGapId).lean({ virtuals: true });

          expect(response.statusCode).toBe(request.passing ? 200 : 400);
          expect(cardUpdated).toEqual(expect.objectContaining({ isValid: false }));
        });
      });
    });

    describe('Order the sequence', () => {
      const requests = [
        {
          msg: 'valid ordered answers',
          payload: { orderedAnswers: ['en fait si', 'a ouai, non'], question: 'ya quoi ???' },
          passing: true,
        },
        { msg: 'remove one of the 2 existing ordered answers', payload: { orderedAnswers: ['en fait si'] } },
        {
          msg: 'too many chars in question',
          payload: {
            question: 'asdfghjklzasdfghjklzasdfghjklzasdfghjklzasdvdvdvfghjklzasdfghjklzbtrbtrbtrhtrhthtvfdbbfbggbfdb'
              + 'frehuvbierhigvobreipvberuipvbejripvbehriovbehrovhreuogvregcfhergjvrebgjoiprebgjirepbghjrieghroegvroe',
          },
          code: 400,
        },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.passing ? '200' : '400'} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${orderTheSequenceId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          const cardUpdated = await Card.findById(orderTheSequenceId).lean({ virtuals: true });

          expect(response.statusCode).toBe(request.passing ? 200 : 400);
          expect(cardUpdated).toEqual(expect.objectContaining({ isValid: false }));
        });
      });
    });

    describe('Single choice question', () => {
      const requests = [
        {
          msg: 'valid answers',
          payload: { qcAnswers: [{ text: 'toto' }], qcuGoodAnswer: 'c\'est le S' },
          code: 200,
        },
        { msg: 'missing qcAnswers', payload: { qcAnswers: [{ text: '' }] }, code: 400 },
        {
          msg: 'too many chars in falsy answers',
          payload: {
            qcAnswers: [{ text: 'eeeeeyuiolkjhgfdasdfghjklzasdfghjklzasdfghjklzasdfghjklzasdvdvdvfghjklzasdfghjklz' }],
          },
          code: 200, // A GÉRER ?
        },
        {
          msg: 'too many chars in good answer',
          payload: {
            qcuGoodAnswer: 'eeeeeyuiolkjhgfdasdfghjklzasdfghjklzasdfghjklzasdfghjklzasdvdvdvfghjklzasdfghjklz',
          },
          code: 400,
        },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${singleChoiceQuestionId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          const cardUpdated = await Card.findById(singleChoiceQuestionId).lean({ virtuals: true });

          expect(response.statusCode).toBe(request.code);
          expect(cardUpdated).toEqual(expect.objectContaining({ isValid: false }));
        });
      });
    });

    describe('Multiple choice question', () => {
      const requests = [
        {
          msg: 'valid answers',
          payload: { qcAnswers: [{ text: 'vie', correct: true }, { text: 'gique', correct: false }] },
          code: 200,
        },
        { msg: 'missing label', payload: { qcAnswers: [{ correct: true }] }, code: 400 },
        { msg: 'missing correct', payload: { qcAnswers: [{ text: 'et la bête' }] }, code: 400 },
        {
          msg: 'missing correct answer',
          payload: { qcAnswers: [{ text: 'époque', correct: false }, { text: 'et le clochard', correct: false }] },
          code: 400,
        },
        {
          msg: 'too many chars in answer',
          payload: {
            qcAnswers: [
              {
                text: 'eeeeeyuiolkjhgfdasdfghjklzasdfghjklzasdfghjklzasdfghjklzasdvdvdvfghjklzasdfghjklz',
                correct: true,
              },
              { text: 'bleue', correct: false },
            ],
          },
          code: 200, // A GÉRER ?
        },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${multipleChoiceQuestionId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          const cardUpdated = await Card.findById(multipleChoiceQuestionId).lean({ virtuals: true });

          expect(response.statusCode).toBe(request.code);
          expect(cardUpdated).toEqual(expect.objectContaining({ isValid: false }));
        });
      });
    });

    describe('Survey', () => {
      const requests = [
        { msg: 'Left label is too long', payload: { label: { left: 'Je suis un très long message' } }, code: 400 },
        { msg: 'Right label is too long', payload: { label: { right: 'Je suis un très long message' } }, code: 400 },
        { msg: 'Unset left label', payload: { label: { left: '' } }, code: 200 },
        { msg: 'Unset right label', payload: { label: { right: '' } }, code: 200 },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${surveyId.toHexString()}`,
            payload: request.payload,
            headers: { 'x-access-token': authToken },
          });

          const cardUpdated = await Card.findById(surveyId).lean({ virtuals: true });

          expect(response.statusCode).toBe(request.code);
          expect(cardUpdated).toEqual(expect.objectContaining({ isValid: false }));
        });
      });
    });

    describe('Flashcard', () => {
      const veryLongText = 'la maladie d\'Alzheimer a été décrite en 1907 par un médecin allemand. Son nom ? la maladie'
       + 'd\'Alzheimer a été décrite en 1907 par un médecin allemand. Son nom ? la maladie d\'Alzheimer a été décrite'
       + ' en1907 par un médecin allemand. Son nom ? la maladie d\'Alzheimer a été décrite en 1907 par un médecin'
       + ' allemand. Son nom ? la maladie d\'Alzheimer a été décrite en 1907 par un médecin allemand. Son nom ? la '
       + 'maladie d\'Alzheimer a été décrite en 1907 par un médecin allemand. Son nom ? la maladie d\'Alzheimer a été '
       + 'décrite en 1907 par un médecin allemand. Son nom ?';
      const requests = [
        { msg: 'Text is too long', payload: { text: veryLongText }, code: 400 },
        { msg: 'Back text is too long', payload: { backText: veryLongText }, code: 400 },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${flashCardId.toHexString()}`,
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

describe('CARDS ROUTES - POST /cards/{_id}/answer', () => {
  let authToken = null;
  beforeEach(populateDB);

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add an answer', async () => {
      const card = cardsList[11];
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${card._id.toHexString()}/answers`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.findById(card._id).lean();
      expect(cardUpdated.qcAnswers.length).toEqual(card.qcAnswers.length + 1);
    });

    it('should return 404 if invalid card id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${(new ObjectID()).toHexString()}/answers`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if too many answers', async () => {
      const card = cardsList[12];
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${card._id.toHexString()}/answers`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if card activity is published', async () => {
      const card = cardsList[13];
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${card._id.toHexString()}/answers`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const card = cardsList[11];
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
          url: `/cards/${card._id.toHexString()}/answers`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - PUT /cards/{_id}/answers/{answerId}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const card = cardsList[11];
  const answer = card.qcAnswers[0];

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should update an answer', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id.toHexString()}/answers/${answer._id.toHexString()}`,
        payload: { text: 'je suis un texte' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.findById(card._id).lean();
      expect(cardUpdated).toEqual(expect.objectContaining({
        ...card,
        qcAnswers: [
          { _id: card.qcAnswers[0]._id, text: 'je suis un texte' },
          card.qcAnswers[1],
        ],
      }));
    });

    it('should return 400 if text is missing', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id.toHexString()}/answers/${answer._id.toHexString()}`,
        payload: { text: '' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if invalid card id', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${(new ObjectID()).toHexString()}/answers/${answer._id.toHexString()}`,
        payload: { text: 'je suis un texte' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if answer is not in card', async () => {
      const otherQACard = cardsList[12];
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id.toHexString()}/answers/${otherQACard.qcAnswers[0]._id.toHexString()}`,
        payload: { text: 'je suis un texte' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
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
          payload: { text: 'je suis un texte' },
          url: `/cards/${card._id.toHexString()}/answers/${answer._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - DELETE /cards/{_id}/answers/{answerId}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const card = cardsList[12];
  const answer = card.qcAnswers[0];

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete an answer', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id.toHexString()}/answers/${answer._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.findById(card._id).lean();
      expect(cardUpdated).toEqual(expect.objectContaining({
        ...card,
        qcAnswers: [
          card.qcAnswers[1],
          card.qcAnswers[2],
          card.qcAnswers[3],
        ],
      }));
    });

    it('should return 400 if cardId is missing', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${null}/answers/${answer._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if answerId is missing', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id.toHexString()}/answers/${null}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if invalid card id', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${(new ObjectID()).toHexString()}/answers/${answer._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if answer is not in card', async () => {
      const otherQACard = cardsList[11];
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id.toHexString()}/answers/${otherQACard.qcAnswers[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if card is in published activity', async () => {
      const publishedCard = cardsList[13];
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${publishedCard._id.toHexString()}/answers/${publishedCard.qcAnswers[0]._id.toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 400 if card has 2 or less answers', async () => {
      const oneQuestionCard = cardsList[11];
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${oneQuestionCard._id.toHexString()}
          /answers/${oneQuestionCard.qcAnswers[0]._id.toHexString()}`,
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
          method: 'DELETE',
          url: `/cards/${card._id.toHexString()}/answers/${answer._id.toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - DELETE /cards/{_id}', () => {
  let authToken = null;
  beforeEach(populateDB);
  const draftActivity = activitiesList.find(activity => activity.status === 'draft');
  const publishedActivity = activitiesList.find(activity => activity.status === 'published');

  describe('VENDOR_ADMIN', () => {
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete card', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${draftActivity.cards[0].toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardDeleted = await Card.findById(cardsList[0]._id).lean();
      expect(cardDeleted).toBeNull();

      const activity = await Activity.findById(draftActivity._id).lean();
      expect(activity.cards.length).toEqual(draftActivity.cards.length - 1);
      expect(activity.cards.includes(draftActivity.cards[0])).toBeFalsy();
    });

    it('should return 404 if card not found', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${(new ObjectID()).toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 if activity is published', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${publishedActivity.cards[0].toHexString()}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(403);
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
          method: 'DELETE',
          url: `/cards/${draftActivity.cards[0].toHexString()}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - POST /cards/:id/upload', () => {
  let authToken;
  let uploadProgramMediaStub;
  let momentFormat;
  beforeEach(() => {
    uploadProgramMediaStub = sinon.stub(GCloudStorageHelper, 'uploadProgramMedia');
    momentFormat = sinon.stub(momentProto, 'format');
  });
  afterEach(() => {
    uploadProgramMediaStub.restore();
    momentFormat.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should add a card media', async () => {
      const card = cardsList[0];
      const form = generateFormData({ fileName: 'title_text_media', file: 'true' });
      momentFormat.returns('20200625054512');
      uploadProgramMediaStub.returns({
        link: 'https://storage.googleapis.com/BucketKFC/myMedia',
        publicId: 'media-titletextmedia-20200625054512',
      });

      const payload = await GetStream(form);
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${card._id}/upload`,
        payload,
        headers: { ...form.getHeaders(), 'x-access-token': authToken },
      });

      const cardUpdated = await Card.findById(card._id).lean();

      expect(response.statusCode).toBe(200);
      expect(cardUpdated).toMatchObject({
        _id: card._id,
        media: {
          link: 'https://storage.googleapis.com/BucketKFC/myMedia',
          publicId: 'media-titletextmedia-20200625054512',
        },
      });
      sinon.assert.calledOnceWithExactly(uploadProgramMediaStub, { fileName: 'title_text_media', file: 'true' });
    });

    const wrongParams = ['file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const card = cardsList[0];
        const invalidForm = generateFormData(omit({ fileName: 'title_text_media', file: 'true' }, param));
        const response = await app.inject({
          method: 'POST',
          url: `/cards/${card._id}/upload`,
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
        const card = cardsList[0];
        const form = generateFormData({ fileName: 'title_text_media', file: 'true' });
        authToken = await getToken(role.name);
        uploadProgramMediaStub.returns({
          link: 'https://storage.googleapis.com/BucketKFC/myMedia',
          publicId: 'media-titletextmedia-20200625054512',
        });

        const response = await app.inject({
          method: 'POST',
          url: `/cards/${card._id}/upload`,
          payload: await GetStream(form),
          headers: { ...form.getHeaders(), 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - DELETE /cards/:id/upload', () => {
  let authToken;
  let deleteProgramMediaStub;
  beforeEach(() => {
    deleteProgramMediaStub = sinon.stub(GCloudStorageHelper, 'deleteProgramMedia');
  });
  afterEach(() => {
    deleteProgramMediaStub.restore();
  });

  describe('VENDOR_ADMIN', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('vendor_admin');
    });

    it('should delete a card media', async () => {
      const card = cardsList[1];
      const imageExistsBeforeUpdate = await Card
        .countDocuments({ _id: card._id, 'media.publicId': { $exists: true } });

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id}/upload`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(deleteProgramMediaStub, 'publicId');

      const isPictureDeleted = await Card.countDocuments({ _id: card._id, 'media.publicId': { $exists: false } });
      expect(imageExistsBeforeUpdate).toBeTruthy();
      expect(isPictureDeleted).toBeTruthy();
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
        const card = cardsList[1];
        const response = await app.inject({
          method: 'DELETE',
          url: `/cards/${card._id}/upload`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
