const sinon = require('sinon');
const { expect } = require('expect');
const Boom = require('@hapi/boom');
const EmailHelper = require('../../../src/helpers/email');
const EmailOptionsHelper = require('../../../src/helpers/emailOptions');
const AuthenticationHelper = require('../../../src/helpers/authentication');
const NodemailerHelper = require('../../../src/helpers/nodemailer');
const translate = require('../../../src/helpers/translate');

const { language } = translate;

describe('sendWelcome', () => {
  let trainerCustomContent;
  let helperCustomContent;
  let coachCustomContent;
  let baseWelcomeContent;
  let createPasswordToken;
  let sendinBlueTransporter;
  let sendMail;
  let welcomeTraineeContent;

  const email = 't@t.com';
  const helperWelcomeCustomText = 'content for helper';
  const coachWelcomeCustomText = 'content for coach';
  const baseWelcomeText = 'base content';
  const passwordToken = 'passwordToken';
  const sentObj = { msg: 'Message sent !' };

  beforeEach(() => {
    trainerCustomContent = sinon.stub(EmailOptionsHelper, 'trainerCustomContent');
    helperCustomContent = sinon.stub(EmailOptionsHelper, 'helperCustomContent');
    coachCustomContent = sinon.stub(EmailOptionsHelper, 'coachCustomContent');
    baseWelcomeContent = sinon.stub(EmailOptionsHelper, 'baseWelcomeContent');
    createPasswordToken = sinon.stub(AuthenticationHelper, 'createPasswordToken');
    sendinBlueTransporter = sinon.stub(NodemailerHelper, 'sendinBlueTransporter');
    sendMail = sinon.stub();
    welcomeTraineeContent = sinon.stub(EmailOptionsHelper, 'welcomeTraineeContent');
  });
  afterEach(() => {
    trainerCustomContent.restore();
    helperCustomContent.restore();
    coachCustomContent.restore();
    baseWelcomeContent.restore();
    createPasswordToken.restore();
    sendinBlueTransporter.restore();
    welcomeTraineeContent.restore();
  });

  it('should send email to trainer', async () => {
    const trainerWelcomeCustomText = 'content for trainer';

    createPasswordToken.returns(passwordToken);
    trainerCustomContent.returns(trainerWelcomeCustomText);
    baseWelcomeContent.returns(baseWelcomeText);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.sendWelcome('trainer', email);

    expect(result).toEqual(sentObj);
    sinon.assert.calledWithExactly(trainerCustomContent);
    sinon.assert.calledWithExactly(
      baseWelcomeContent,
      trainerWelcomeCustomText,
      { passwordToken, companyName: 'Compani' }
    );
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'Bienvenue dans votre espace Compani',
        html: baseWelcomeText,
      }
    );
    sinon.assert.notCalled(helperCustomContent);
    sinon.assert.notCalled(coachCustomContent);
    sinon.assert.notCalled(welcomeTraineeContent);
  });

  it('should send email to helper with company trade name', async () => {
    createPasswordToken.returns(passwordToken);
    helperCustomContent.returns(helperWelcomeCustomText);
    baseWelcomeContent.returns(baseWelcomeText);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.sendWelcome('helper', email, { tradeName: 'test', name: 'ok' });

    expect(result).toEqual(sentObj);
    sinon.assert.calledWithExactly(helperCustomContent);
    sinon.assert.calledWithExactly(
      baseWelcomeContent,
      helperWelcomeCustomText,
      { passwordToken, companyName: 'ok' }
    );
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'ok - Bienvenue dans votre espace Compani',
        html: baseWelcomeText,
      }
    );
    sinon.assert.notCalled(trainerCustomContent);
    sinon.assert.notCalled(coachCustomContent);
    sinon.assert.notCalled(welcomeTraineeContent);
  });

  it('should send email to helper even if no trade name and use company name', async () => {
    createPasswordToken.returns(passwordToken);
    helperCustomContent.returns(helperWelcomeCustomText);
    baseWelcomeContent.returns(baseWelcomeText);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.sendWelcome('helper', email, { name: 'ok' });

    expect(result).toEqual(sentObj);
    sinon.assert.calledWithExactly(helperCustomContent);
    sinon.assert.calledWithExactly(
      baseWelcomeContent,
      helperWelcomeCustomText,
      { passwordToken, companyName: 'ok' }
    );
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'ok - Bienvenue dans votre espace Compani',
        html: baseWelcomeText,
      }
    );
    sinon.assert.notCalled(trainerCustomContent);
    sinon.assert.notCalled(coachCustomContent);
    sinon.assert.notCalled(welcomeTraineeContent);
  });

  it('should send email to coach', async () => {
    createPasswordToken.returns(passwordToken);
    coachCustomContent.returns(coachWelcomeCustomText);
    baseWelcomeContent.returns(baseWelcomeText);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.sendWelcome('coach', email);

    expect(result).toEqual(sentObj);
    sinon.assert.calledWithExactly(coachCustomContent);
    sinon.assert.calledWithExactly(
      baseWelcomeContent,
      coachWelcomeCustomText,
      { passwordToken, companyName: 'Compani' }
    );
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'Bienvenue dans votre espace Compani',
        html: baseWelcomeText,
      }
    );
    sinon.assert.notCalled(helperCustomContent);
    sinon.assert.notCalled(trainerCustomContent);
    sinon.assert.notCalled(welcomeTraineeContent);
  });

  it('should send email to coach', async () => {
    createPasswordToken.returns(passwordToken);
    coachCustomContent.returns(coachWelcomeCustomText);
    baseWelcomeContent.returns(baseWelcomeText);
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.sendWelcome('client_admin', email);

    expect(result).toEqual(sentObj);
    sinon.assert.calledWithExactly(coachCustomContent);
    sinon.assert.calledWithExactly(
      baseWelcomeContent,
      coachWelcomeCustomText,
      { passwordToken, companyName: 'Compani' }
    );
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'Bienvenue dans votre espace Compani',
        html: baseWelcomeText,
      }
    );
    sinon.assert.notCalled(helperCustomContent);
    sinon.assert.notCalled(trainerCustomContent);
    sinon.assert.notCalled(welcomeTraineeContent);
  });

  it('should send email to trainee', async () => {
    welcomeTraineeContent.returns('Bonjour à tous et passez une bonne journée');
    sendinBlueTransporter.returns({ sendMail });
    sendMail.returns(sentObj);

    const result = await EmailHelper.sendWelcome('trainee', email);

    expect(result).toEqual(sentObj);
    sinon.assert.calledOnceWithExactly(welcomeTraineeContent);
    sinon.assert.calledWithExactly(sendinBlueTransporter);
    sinon.assert.calledOnceWithExactly(
      sendMail,
      {
        from: 'Compani <nepasrepondre@compani.fr>',
        to: email,
        subject: 'Bienvenue dans votre espace Compani',
        html: 'Bonjour à tous et passez une bonne journée',
      }
    );
    sinon.assert.notCalled(helperCustomContent);
    sinon.assert.notCalled(trainerCustomContent);
    sinon.assert.notCalled(coachCustomContent);
  });

  it('should send 424 if email sending fails', async () => {
    try {
      welcomeTraineeContent.returns('Bonjour à tous et passez une bonne journée');

      await EmailHelper.sendWelcome('trainee', email);
    } catch (e) {
      expect(e).toEqual(Boom.failedDependency(translate[language].emailNotSent));
    } finally {
      sinon.assert.calledOnceWithExactly(welcomeTraineeContent);
      sinon.assert.calledWithExactly(sendinBlueTransporter);
      sinon.assert.notCalled(sendMail);
      sinon.assert.notCalled(helperCustomContent);
      sinon.assert.notCalled(trainerCustomContent);
      sinon.assert.notCalled(coachCustomContent);
    }
  });
});
