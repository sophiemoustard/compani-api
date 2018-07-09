const { ObjectID } = require('mongodb');
const expect = require('expect');

const app = require('../server');
const { populateUsers, getToken, userList } = require('./seed/usersSeed');
const { populateRoles } = require('./seed/rolesSeed');
const { populateMessagesToBot, messagePayload, messagesList } = require('./seed/messageToBotSeed');
const MessageToBot = require('../models/MessageToBot');

describe('NODE ENV', () => {
  it("should be 'test'", () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('MESSAGE TO BOT ROUTES', () => {
  let token = null;
  beforeEach(populateRoles);
  beforeEach(populateUsers);
  beforeEach(populateMessagesToBot);
  beforeEach(async () => {
    token = await getToken();
  });

  describe('POST /messageToBot', () => {
    it('should create a message', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/messageToBot',
        payload: messagePayload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.message).toEqual(expect.objectContaining({
        _id: expect.any(Object),
        senderId: messagePayload.senderId,
        content: messagePayload.content,
        sectors: expect.arrayContaining([messagePayload.sectors])
      }));

      const message = await MessageToBot.findById(res.result.data.message._id);
      expect(message.content).toBe(messagePayload.content);
      expect(message.senderId).toEqual(messagePayload.senderId);
      expect(message.sectors).toEqual(expect.arrayContaining([messagePayload.sectors]));
    });

    const missingParams = [{
      name: 'content',
      payload: {
        senderId: new ObjectID(),
        sectors: '1z*'
      }
    }, {
      name: 'senderId',
      payload: {
        content: 'TEST',
        sectors: '1z*'
      }
    }, {
      name: 'sectors',
      payload: {
        content: 'TEST',
        senderId: new ObjectID()
      }
    }];
    missingParams.forEach((param) => {
      it(`should return a 400 error if '${param.name}' is missing`, async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/messageToBot',
          payload: param.payload,
          headers: { 'x-access-token': token }
        });
        expect(res.statusCode).toBe(400);
      });
    });
  });

  describe('PUT /messageToBot/{_id}/recipient', () => {
    it('should update message adding recipient', async () => {
      const payload = {
        recipientId: userList[3]._id,
        success: true
      };
      const res = await app.inject({
        method: 'PUT',
        url: `/messageToBot/${messagesList[0]._id}/recipient`,
        payload,
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.message).toEqual(expect.objectContaining({
        recipients: expect.arrayContaining([
          expect.objectContaining({
            id: payload.recipientId.toHexString(),
            success: payload.success
          })
        ])
      }));
      const message = await MessageToBot.findById(messagesList[0]._id);
      expect(message.recipients).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: payload.recipientId.toHexString(),
          success: payload.success
        })
      ]));
    });

    it("should provide a default (false) for 'success' key", async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/messageToBot/${messagesList[0]._id}/recipient`,
        payload: { recipientId: userList[3]._id },
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      const message = await MessageToBot.findById(messagesList[0]._id);
      expect(message.recipients).toEqual(expect.arrayContaining([
        expect.objectContaining({ success: false })
      ]));
    });

    it('should return a 400 error if recipientId is missing', async () => {
      const res = await app.inject({
        method: 'PUT',
        url: `/messageToBot/${messagesList[0]._id}/recipient`,
        payload: { success: true },
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /messageToBot/{_id}', () => {
    it('should return a message', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/messageToBot/${messagesList[0]._id}`,
        payload: { success: true },
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(200);
      expect(res.result.data.message).toEqual(expect.objectContaining({
        content: messagesList[0].content,
        sectors: expect.arrayContaining([messagesList[0].sectors])
      }));
    });

    it('should return a 404 error if id does not exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/messageToBot/${new ObjectID()}`,
        payload: { success: true },
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(404);
    });

    it('should return a 400 error if id is not valid', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/messageToBot/123456',
        payload: { success: true },
        headers: { 'x-access-token': token }
      });
      expect(res.statusCode).toBe(400);
    });
  });
});
