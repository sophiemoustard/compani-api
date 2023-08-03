const { expect } = require('expect');
const sinon = require('sinon');
const omit = require('lodash/omit');
const { ObjectId } = require('mongodb');
const app = require('../../server');
const Card = require('../../src/models/Card');
const GCloudStorageHelper = require('../../src/helpers/gCloudStorage');
const { populateDB, cardsList } = require('./seed/cardsSeed');
const { getToken } = require('./helpers/authentication');
const { generateFormData, getStream } = require('./utils');

describe('NODE ENV', () => {
  it('should be \'test\'', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('CARDS ROUTES - PUT /cards/{_id}', () => {
  let authToken;
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    const cards = [
      { template: 'transition', payload: { title: 'transition' }, id: transitionId },
      {
        template: 'title_text_media',
        payload: { title: 'TTM', text: 'title_text_media', media: { type: 'video', link: 'lien', publicId: 'id' } },
        id: cardsList[1]._id,
      },
      { template: 'title_text', payload: { title: 'titre', text: 'this is a text' }, id: cardsList[2]._id },
      {
        template: 'text_media',
        payload: { text: 'still a text', media: { type: 'audio', link: '123', publicId: '456' } },
        id: cardsList[3]._id,
      },
      { template: 'flashcard', payload: { backText: 'verso', text: 'this is a text' }, id: cardsList[4]._id },
      {
        template: 'fill_the_gaps',
        payload: {
          gappedText: 'Un texte à remplir par <trou>l\'apprenant -e</trou>.',
          explanation: 'c\'est evidement la mamie qui remplit le texte',
          canSwitchAnswers: true,
        },
        id: fillTheGapId,
      },
      {
        template: 'order_the_sequence',
        payload: { question: 'Que faire dans cette situation ?', explanation: 'en fait on doit faire ça' },
        id: orderTheSequenceId,
      },
      {
        template: 'single_choice_question',
        payload: {
          question: 'Que faire dans cette situation ?',
          qcuGoodAnswer: 'plein de trucs',
          explanation: 'en fait on doit faire ça',
        },
        id: singleChoiceQuestionId,
      },
      {
        template: 'multiple_choice_question',
        payload: { question: 'Que faire dans cette situation ?', explanation: 'en fait on doit faire ça' },
        id: multipleChoiceQuestionId,
      },
      {
        template: 'survey',
        payload: { question: 'Sur une échelle de 1 à 10 ?', label: { left: '1', right: '10' }, isMandatory: true },
        id: surveyId,
      },
      {
        template: 'open_question',
        payload: { question: 'Quelque chose à ajouter ?', isMandatory: false },
        id: openQuestionId,
      },
      {
        template: 'question_answer',
        payload: {
          isQuestionAnswerMultipleChoiced: true,
          question: 'Que faire dans cette situation ?',
          isMandatory: true,
        },
        id: questionAnswerId,
      },
    ];

    cards.forEach((card) => {
      it(`should update a ${card.template} card`, async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/cards/${card.id}`,
          payload: card.payload,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(200);

        const cardUpdated = await Card.findById(card.id).lean({ virtuals: true });
        expect(cardUpdated).toEqual(expect.objectContaining({ isValid: true, ...card.payload }));
      });
    });

    it('should return a 400 if title is equal to \'\' on transition card', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${transitionId}`,
        payload: { name: '' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 403 when provide a useless canSwitchAnswers field on a non-FillTheGap card', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${transitionId}`,
        payload: { canSwitchAnswers: false },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return a 403 when provide a useless isMandatory field on a non-Questionnaire card', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${transitionId}`,
        payload: { isMandatory: false },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    describe('Fill the gaps', () => {
      const requests = [
        { msg: 'valid gappedText', payload: { gappedText: 'on truc <trou>b\'ien -èï</trou>propre' }, code: 200 },
        { msg: 'no tagging', payload: { gappedText: 'du text sans balise' }, code: 400 },
        { msg: 'single open tag', payload: { gappedText: 'lalalalal <trou>lili</trou> djsfbjdsfb<trou>' }, code: 400 },
        { msg: 'single closing tag', payload: { gappedText: 'lalalalal <trou>lili</trou> djsfbjd</trou>' }, code: 400 },
        { msg: 'conflicting tags', payload: { gappedText: 'lalaal <trou>l<trou>ili</trou> djsfbd</trou>' }, code: 400 },
        { msg: 'long content', payload: { gappedText: 'al <trou> rgtrgtghtgtrgtrgtrgtili</trou> djssfbd' }, code: 400 },
        { msg: 'wrong character in content', payload: { gappedText: 'lalalalal <trou>?</trou> djsfbsfbd' }, code: 400 },
        { msg: 'line break in content', payload: { gappedText: 'lalalalal <trou>bfh\nee</trou> djsfsfbd' }, code: 400 },
        { msg: 'spaces around answer', payload: { gappedText: 'on truc <trou> test</trou>propre' }, code: 400 },
      ];

      requests.forEach((request) => {
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${fillTheGapId}`,
            payload: request.payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(request.code);
        });
      });
    });

    describe('Order the sequence', () => {
      const requests = [
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
        it(`should return a ${request.code} if ${request.msg}`, async () => {
          const response = await app.inject({
            method: 'PUT',
            url: `/cards/${orderTheSequenceId}`,
            payload: request.payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(request.code);
        });
      });
    });

    describe('Single choice question', () => {
      const requests = [
        { msg: 'valid good answer', payload: { qcuGoodAnswer: 'c\'est le S' }, code: 200 },
        { msg: 'missing good answer', payload: { qcuGoodAnswer: '' }, code: 400 },
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
            url: `/cards/${singleChoiceQuestionId}`,
            payload: request.payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(request.code);
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
            url: `/cards/${surveyId}`,
            payload: request.payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(request.code);
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
            url: `/cards/${flashCardId}`,
            payload: request.payload,
            headers: { Cookie: `alenvi_token=${authToken}` },
          });

          expect(response.statusCode).toBe(request.code);
        });
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload,
          url: `/cards/${transitionId}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - POST /cards/{_id}/answer', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add a qcAnswer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${cardsList[11]._id}/answers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.countDocuments({
        _id: cardsList[11]._id,
        qcAnswers: { $size: cardsList[11].qcAnswers.length + 1 },
      });
      expect(cardUpdated).toEqual(1);
    });

    it('should add an ordered answer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${cardsList[16]._id}/answers`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.countDocuments({
        _id: cardsList[16]._id,
        orderedAnswers: { $size: cardsList[16].orderedAnswers.length + 1 },
      });
      expect(cardUpdated).toEqual(1);
    });

    it('should add an falsy gap answer', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${cardsList[5]._id}/answers`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.countDocuments({
        _id: cardsList[5]._id,
        falsyGapAnswers: { $size: cardsList[5].falsyGapAnswers.length + 1 },
      });
      expect(cardUpdated).toEqual(1);
    });

    it('should return 404 if invalid card id', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${(new ObjectId())}/answers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    const templates = [
      { name: 'question_answer', card: cardsList[12] },
      { name: 'single_choice_question', card: cardsList[7] },
      { name: 'multiple_choice_question', card: cardsList[6] },
      { name: 'order_the_sequence', card: cardsList[8] },
      { name: 'fill_the_gaps', card: cardsList[17] },
    ];
    templates.forEach((template) => {
      it(`should return 403 if ${template.name} with already max answers`, async () => {
        const response = await app.inject({
          method: 'POST',
          url: `/cards/${template.card._id}/answers`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 403 if card activity is published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${cardsList[13]._id}/answers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if card questionnaire is published', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${cardsList[6]._id}/answers`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'POST',
          url: `/cards/${cardsList[11]._id}/answers`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - PUT /cards/{_id}/answers/{answerId}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should update a qc answer', async () => {
      const card = cardsList[11];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { text: 'je suis un texte' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.countDocuments({
        _id: card._id,
        qcAnswers: { _id: card.qcAnswers[0]._id, text: 'je suis un texte' },
      });
      expect(cardUpdated).toEqual(1);
    });

    it('should update an ordered answer', async () => {
      const card = cardsList[8];
      const answer = card.orderedAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { text: 'je suis un texte' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card.countDocuments({
        _id: card._id,
        orderedAnswers: { _id: card.orderedAnswers[0]._id, text: 'je suis un texte' },
      });
      expect(cardUpdated).toEqual(1);
    });

    it('should return 400 if text is null', async () => {
      const card = cardsList[6];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { text: '', correct: true },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if text is too long', async () => {
      const card = cardsList[11];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { text: 'Je suis un text vraiment vraiment vraiment tres tres tres tres tres long', correct: true },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if correct is null', async () => {
      const card = cardsList[6];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { correct: null, text: 'Avery' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if payload is empty', async () => {
      const card = cardsList[6];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: {},
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 if invalid card id', async () => {
      const card = cardsList[11];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${(new ObjectId())}/answers/${answer._id}`,
        payload: { text: 'je suis un texte' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if answer is not in card', async () => {
      const card = cardsList[11];
      const otherQACard = cardsList[12];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${otherQACard.qcAnswers[0]._id}`,
        payload: { text: 'je suis un texte' },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return a 400 if field correct is given and template isn\'t qcm', async () => {
      const card = cardsList[11];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { correct: false },
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return a 400 if fill the gaps and text has invalid char', async () => {
      const card = cardsList[5];
      const answer = card.falsyGapAnswers[0];

      const response = await app.inject({
        method: 'PUT',
        url: `/cards/${card._id}/answers/${answer._id}`,
        payload: { text: 'invalid char: c\'est tout' },
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const card = cardsList[11];
    const answer = card.qcAnswers[0];
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'PUT',
          payload: { text: 'je suis un texte' },
          url: `/cards/${card._id}/answers/${answer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - DELETE /cards/{_id}/answers/{answerId}', () => {
  let authToken;
  beforeEach(populateDB);

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete a qcAnswer', async () => {
      const card = cardsList[12];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id}/answers/${answer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card
        .countDocuments({ _id: card._id, qcAnswers: [card.qcAnswers[1], card.qcAnswers[2], card.qcAnswers[3]] });
      expect(cardUpdated).toEqual(1);
    });

    it('should delete an ordered answer', async () => {
      const card = cardsList[8];
      const answer = card.orderedAnswers[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id}/answers/${answer._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card
        .countDocuments({ _id: card._id, orderedAnswers: [card.orderedAnswers[1], card.orderedAnswers[2]] });
      expect(cardUpdated).toEqual(1);
    });

    it('should delete a falsy gap answer', async () => {
      const card = cardsList[17];
      const answer = card.falsyGapAnswers[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id}/answers/${answer._id}`,
        headers: { 'x-access-token': authToken },
      });

      expect(response.statusCode).toBe(200);

      const falsyGapAnswers = [
        card.falsyGapAnswers[1],
        card.falsyGapAnswers[2],
        card.falsyGapAnswers[3],
        card.falsyGapAnswers[4],
        card.falsyGapAnswers[5],
      ];
      const cardUpdated = await Card.countDocuments({ _id: card._id, falsyGapAnswers });
      expect(cardUpdated).toEqual(1);
    });

    it('should return 400 if cardId is missing', async () => {
      const card = cardsList[12];
      const answer = card.qcAnswers[0];

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${null}/answers/${answer._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 if answerId is missing', async () => {
      const card = cardsList[12];

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${card._id}/answers/${null}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 403 if card is in published activity', async () => {
      const publishedCard = cardsList[13];
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${publishedCard._id}/answers/${publishedCard.qcAnswers[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 if card is in published questionnaire', async () => {
      const publishedCard = cardsList[6];
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${publishedCard._id}/answers/${publishedCard.qcAnswers[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(403);
    });

    const templates = [
      { name: 'question_answer', card: cardsList[11], key: 'qcAnswers' },
      { name: 'single_choice_question', card: cardsList[14], key: 'qcAnswers' },
      { name: 'multiple_choice_question', card: cardsList[15], key: 'qcAnswers' },
      { name: 'order_the_sequence', card: cardsList[16], key: 'orderedAnswers' },
      { name: 'fill_the_gaps', card: cardsList[5], key: 'falsyGapAnswers' },
    ];
    templates.forEach((template) => {
      it(`should return 403 if ${template.name} with already min answers`, async () => {
        const answers = template.card[`${template.key}`];
        const response = await app.inject({
          method: 'DELETE',
          url: `/cards/${template.card._id}/answers/${answers[0]._id}`,
          headers: { 'x-access-token': authToken },
        });

        expect(response.statusCode).toBe(403);
      });
    });

    it('should return 400 if card has 2 or less answers', async () => {
      const oneQuestionCard = cardsList[11];
      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${oneQuestionCard._id}
          /answers/${oneQuestionCard.qcAnswers[0]._id}`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Other roles', () => {
    const card = cardsList[12];
    const answer = card.qcAnswers[0];
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];

    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/cards/${card._id}/answers/${answer._id}`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});

describe('CARDS ROUTES - POST /cards/:id/upload', () => {
  let authToken;
  let uploadProgramMediaStub;
  beforeEach(() => {
    uploadProgramMediaStub = sinon.stub(GCloudStorageHelper, 'uploadProgramMedia');
  });
  afterEach(() => {
    uploadProgramMediaStub.restore();
  });

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should add a card media', async () => {
      const form = generateFormData({ fileName: 'title_text_media', file: 'true' });
      uploadProgramMediaStub.returns({ link: 'https://gcp/BucketKFC/my', publicId: 'media-ttm' });

      const payload = await getStream(form);
      const response = await app.inject({
        method: 'POST',
        url: `/cards/${cardsList[0]._id}/upload`,
        payload,
        headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);

      const cardUpdated = await Card
        .countDocuments({ _id: cardsList[0]._id, media: { link: 'https://gcp/BucketKFC/my', publicId: 'media-ttm' } });
      expect(cardUpdated).toEqual(1);
      sinon.assert.calledOnceWithExactly(uploadProgramMediaStub, { fileName: 'title_text_media', file: 'true' });
    });

    const wrongParams = ['file', 'fileName'];
    wrongParams.forEach((param) => {
      it(`should return a 400 error if missing '${param}' parameter`, async () => {
        const invalidForm = generateFormData(omit({ fileName: 'title_text_media', file: 'true' }, param));
        const response = await app.inject({
          method: 'POST',
          url: `/cards/${cardsList[0]._id}/upload`,
          payload: await getStream(invalidForm),
          headers: { ...invalidForm.getHeaders(), Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        const form = generateFormData({ fileName: 'title_text_media', file: 'true' });
        authToken = await getToken(role.name);
        uploadProgramMediaStub.returns({ link: 'https://gcp/BucketKFC/my', publicId: 'media-ttm' });

        const response = await app.inject({
          method: 'POST',
          url: `/cards/${cardsList[0]._id}/upload`,
          payload: await getStream(form),
          headers: { ...form.getHeaders(), Cookie: `alenvi_token=${authToken}` },
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

  describe('TRAINING_ORGANISATION_MANAGER', () => {
    beforeEach(populateDB);
    beforeEach(async () => {
      authToken = await getToken('training_organisation_manager');
    });

    it('should delete a card media', async () => {
      const imageExistsBeforeUpdate = await Card
        .countDocuments({ _id: cardsList[1]._id, 'media.publicId': { $exists: true } });

      const response = await app.inject({
        method: 'DELETE',
        url: `/cards/${cardsList[1]._id}/upload`,
        headers: { Cookie: `alenvi_token=${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      sinon.assert.calledOnceWithExactly(deleteProgramMediaStub, 'publicId');

      const isPictureDeleted = await Card
        .countDocuments({ _id: cardsList[1]._id, 'media.publicId': { $exists: false } });
      expect(imageExistsBeforeUpdate).toBeTruthy();
      expect(isPictureDeleted).toBeTruthy();
    });
  });

  describe('Other roles', () => {
    const roles = [
      { name: 'helper', expectedCode: 403 },
      { name: 'planning_referent', expectedCode: 403 },
      { name: 'client_admin', expectedCode: 403 },
      { name: 'trainer', expectedCode: 403 },
    ];
    roles.forEach((role) => {
      it(`should return ${role.expectedCode} as user is ${role.name}`, async () => {
        authToken = await getToken(role.name);
        const response = await app.inject({
          method: 'DELETE',
          url: `/cards/${cardsList[1]._id}/upload`,
          headers: { Cookie: `alenvi_token=${authToken}` },
        });

        expect(response.statusCode).toBe(role.expectedCode);
      });
    });
  });
});
