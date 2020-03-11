const sinon = require('sinon');
const expect = require('expect');
const EmailHelper = require('../../../src/helpers/email');
const EmailOptionsHelper = require('../../../src/helpers/emailOptions');
const UserHelper = require('../../../src/helpers/users');
const NodemailerHelper = require('../../../src/helpers/nodemailer');

describe('helperWelcomeEmail', () => {
  let welcomeEmailContent;
  let createPasswordToken;
  let sendMail;
  let sendinBlueTransporter;
  const email = 't@t.com';
  const sentObj = { msg: 'Message sent !' };
  const passwordToken = 'passwordToken';
  const emailContent = 'emailContent';

  beforeEach(() => {
    welcomeEmailContent = sinon.stub(EmailOptionsHelper, 'welcomeEmailContent');
    createPasswordToken = sinon.stub(UserHelper, 'createPasswordToken');
    sendMail = sinon.stub();
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter');
  });

  afterEach(() => {
    welcomeEmailContent.restore();
    createPasswordToken.restore();
    sendinBlueTransporter.restore();
  });

  it('should send a welcoming email to newly registered helper with company trade name', async () => {
    const company = { _id: '1234567890', tradeName: 'Test' };
    createPasswordToken.returns(passwordToken);
    welcomeEmailContent.returns(emailContent);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.helperWelcomeEmail(email, company);

    sinon.assert.calledOnceWithExactly(createPasswordToken, email);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: `${company.tradeName} - Bienvenue dans votre espace Compani`,
        html: emailContent,
      }
    );
    sinon.assert.calledWithExactly(welcomeEmailContent, { passwordToken, companyName: company.tradeName });
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });

  it('should use comapny name if no trade name available', async () => {
    const company = { _id: '1234567890', name: 'Test' };
    createPasswordToken.returns(passwordToken);
    welcomeEmailContent.returns(emailContent);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.helperWelcomeEmail(email, company);

    sinon.assert.calledOnceWithExactly(createPasswordToken, email);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: `${company.name} - Bienvenue dans votre espace Compani`,
        html: emailContent,
      }
    );
    sinon.assert.calledWithExactly(welcomeEmailContent, { passwordToken, companyName: company.name });
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });
});
