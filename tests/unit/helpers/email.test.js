const sinon = require('sinon');
const expect = require('expect');
const { ObjectID } = require('mongodb');
const EmailHelper = require('../../../src/helpers/email');
const EmailOptionsHelper = require('../../../src/helpers/emailOptions');
const UserHelper = require('../../../src/helpers/users');
const NodemailerHelper = require('../../../src/helpers/nodemailer');

describe('sendWelcome', () => {
  let trainerWelcomeEmail;
  let helperWelcomeEmail;
  const email = 't@t.com';
  const companyId = new ObjectID();

  beforeEach(() => {
    trainerWelcomeEmail = sinon.stub(EmailHelper, 'trainerWelcomeEmail');
    helperWelcomeEmail = sinon.stub(EmailHelper, 'helperWelcomeEmail');
  });
  afterEach(() => {
    trainerWelcomeEmail.restore();
    helperWelcomeEmail.restore();
  });

  it('should send email to trainer', async () => {
    trainerWelcomeEmail.returns();

    await EmailHelper.sendWelcome('trainer', email);

    sinon.assert.calledWithExactly(trainerWelcomeEmail, email);
    sinon.assert.notCalled(helperWelcomeEmail);
  });

  it('should send email to helper', async () => {
    trainerWelcomeEmail.returns();

    await EmailHelper.sendWelcome('helper', email, companyId);

    sinon.assert.calledWithExactly(helperWelcomeEmail, email, companyId);
    sinon.assert.notCalled(trainerWelcomeEmail);
  });
});

describe('helperWelcomeEmail', () => {
  let helperWelcomeEmailContent;
  let createPasswordToken;
  let sendMail;
  let sendinBlueTransporter;
  const email = 't@t.com';
  const sentObj = { msg: 'Message sent !' };
  const passwordToken = 'passwordToken';
  const emailContent = 'emailContent';

  beforeEach(() => {
    helperWelcomeEmailContent = sinon.stub(EmailOptionsHelper, 'helperWelcomeEmailContent');
    createPasswordToken = sinon.stub(UserHelper, 'createPasswordToken');
    sendMail = sinon.stub();
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter');
  });

  afterEach(() => {
    helperWelcomeEmailContent.restore();
    createPasswordToken.restore();
    sendinBlueTransporter.restore();
  });

  it('should send a welcoming email to newly registered helper with company trade name', async () => {
    const company = { _id: '1234567890', tradeName: 'Test' };
    createPasswordToken.returns(passwordToken);
    helperWelcomeEmailContent.returns(emailContent);
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
    sinon.assert.calledWithExactly(helperWelcomeEmailContent, { passwordToken, companyName: company.tradeName });
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });

  it('should use comapny name if no trade name available', async () => {
    const company = { _id: '1234567890', name: 'Test' };
    createPasswordToken.returns(passwordToken);
    helperWelcomeEmailContent.returns(emailContent);
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
    sinon.assert.calledWithExactly(helperWelcomeEmailContent, { passwordToken, companyName: company.name });
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });
});

describe('trainerWelcomeEmail', () => {
  let trainerWelcomeEmailContent;
  let createPasswordToken;
  let sendMail;
  let sendinBlueTransporter;
  const email = 't@t.com';
  const sentObj = { msg: 'Message sent !' };
  const passwordToken = 'passwordToken';
  const emailContent = 'emailContent';

  beforeEach(() => {
    trainerWelcomeEmailContent = sinon.stub(EmailOptionsHelper, 'trainerWelcomeEmailContent');
    createPasswordToken = sinon.stub(UserHelper, 'createPasswordToken');
    sendMail = sinon.stub();
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter');
  });

  afterEach(() => {
    trainerWelcomeEmailContent.restore();
    createPasswordToken.restore();
    sendinBlueTransporter.restore();
  });

  it('should send a welcoming email to newly registered trainer', async () => {
    createPasswordToken.returns(passwordToken);
    trainerWelcomeEmailContent.returns(emailContent);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.trainerWelcomeEmail(email);

    sinon.assert.calledOnceWithExactly(createPasswordToken, email);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'Alenvi - Bienvenue dans votre espace Formateur !',
        html: emailContent,
      }
    );
    sinon.assert.calledWithExactly(trainerWelcomeEmailContent, { passwordToken });
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    expect(result).toMatchObject(sentObj);
  });
});
