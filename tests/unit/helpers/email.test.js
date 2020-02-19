const sinon = require('sinon');
const expect = require('expect');
const EmailHelper = require('../../../src/helpers/email');
const EmailOptionsHelper = require('../../../src/helpers/emailOptions');
const NodemailerHelper = require('../../../src/helpers/nodemailer');

describe('helperWelcomeEmail', () => {
  let EmailOptionsHelperStub;
  let sendinBlueTransporter;
  const receiver = { email: 't@t.com', password: 'mdp' };
  const sentObj = { msg: 'Message sent !' };

  beforeEach(() => {
    EmailOptionsHelperStub = sinon.stub(EmailOptionsHelper, 'welcomeEmailContent');
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter')
      .returns({ sendMail: sinon.stub().returns(sentObj) });
  });

  afterEach(() => {
    EmailOptionsHelperStub.restore();
    sendinBlueTransporter.restore();
  });

  it('should send a welcoming email to newly registered helper with company trade name', async () => {
    const company = { _id: '1234567890', tradeName: 'Test' };

    const result = await EmailHelper.helperWelcomeEmail(receiver, company);

    sinon.assert.calledWithExactly(EmailOptionsHelperStub, receiver, company.tradeName);
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });

  it('should use comapny name if no trade name available', async () => {
    const company = { _id: '1234567890', name: 'Test' };

    const result = await EmailHelper.helperWelcomeEmail(receiver, company);

    sinon.assert.calledWithExactly(EmailOptionsHelperStub, receiver, company.name);
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });
});
