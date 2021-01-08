/* eslint-disable max-len */
const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');

const fsPromises = fs.promises;

const baseWelcomeContent = (customContent, options) => {
  const link = `${process.env.WEBSITE_HOSTNAME}/reset-password/${options.passwordToken.token}`;
  return `<p>Bonjour,</p>
    ${customContent}
    <p>
      Vous pouvez créer votre mot de passe en suivant ce lien: <a href="${link}">${link}</a>.
    </p>
    <p>
      Ce lien expire au bout de 24 heures. Si vous dépassez ce délai, rendez-vous sur
      <a href="${process.env.WEBSITE_HOSTNAME}">${process.env.WEBSITE_HOSTNAME}</a>
      et cliquez sur <i>"C'est ma première connexion”</i>.
    </p>
    <br />
    <p>
      Par la suite, rendez-vous sur
      <a href="${process.env.WEBSITE_HOSTNAME}">${process.env.WEBSITE_HOSTNAME}</a>
      pour vous connecter.
    </p>
    <br />
    <p>Bien cordialement,</p>
    <p>L'équipe ${options.companyName}</p>`;
};

const helperCustomContent = () => `<p>
    Votre espace Compani vous permettra de suivre au quotidien le planning des interventions des auxiliaires
    d’envie chez votre proche, ainsi que les éléments de facturation. Si ça n’est pas déjà fait, nous vous remercions
    également de finaliser votre souscription en remplissant la page “Abonnement”.<p>`;

const trainerCustomContent = () => `<p>Bienvenue chez Compani, nous venons de vous créer votre espace Formateur. :)<p>
    <p>Depuis cet espace, vous pourrez gérer en toute simplicité les formations que vous animez pour Compani.<p>`;

const coachCustomContent = () => `<p>Bienvenue chez Compani.<p>
    <p>Depuis cet espace, vous pourrez gérer en toute simplicité les formations Compani dans votre structure.<p>`;

const forgotPasswordEmail = (passwordToken) => {
  const resetPasswordLink = `${process.env.WEBSITE_HOSTNAME}/reset-password/${passwordToken.token}`;

  return `<p>Bonjour,</p>
    <p>Vous pouvez modifier votre mot de passe en cliquant sur le lien suivant (lien valable une heure) :</p>
    <p><a href="${resetPasswordLink}">${resetPasswordLink}</a></p>
    <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ne pas tenir compte de cet email.</p>
    <p>Bien cordialement,<br>
      L'équipe Compani</p>`;
};

const billEmail = async (companyName) => {
  const content = await fsPromises.readFile(path.join(__dirname, '../data/emails/billDispatch.html'), 'utf8');
  const template = handlebars.compile(content);
  return template({ billLink: `${process.env.WEBSITE_HOSTNAME}/customers/documents`, companyName });
};

const completeBillScriptEmailBody = (sentNb, emails) => {
  let body = `<p>Script correctement exécuté. ${sentNb} emails envoyés.</p>`;
  if (emails.length) {
    body = body.concat(`<p>Facture non envoyée à ${emails.join()}</p>`);
  }
  return body;
};

const completeEventRepScriptEmailBody = (nb, repIds) => {
  let body = `<p>Script correctement exécuté. ${nb} répétitions traitées.</p>`;
  if (repIds.length) {
    body = body.concat(`<p>Répétitions à traiter manuellement ${repIds.join()}</p>`);
  }
  return body;
};

const completeRoleUpdateScriptEmailBody = nb => `<p>Script correctement exécuté. ${nb} role(s) mis à jour.</p>`;

const completeEventConsistencyScriptEmailBody = (eventsWithErrors) => {
  let message = `<p>Script correctement exécuté. ${eventsWithErrors.length} evenements avec erreurs.</p>`;
  for (const event of eventsWithErrors) {
    message += `${event.eventId}: ${event.issuesWithEvent}</br>`;
  }
  return message;
};

const welcomeTraineeContent = () => `<p>Bienvenue sur Compani Formation, l'outil au service du prendre soin,
    nous venons de vous créer votre compte apprenant.</p>
    <p>
    Vous y trouverez de nombreuses formation ludiques pour vous accompagner dans votre quotidien : 
    les troubles cognitif, la communication empathique, gérer la fin de vie et le deuil, et bien d'autres encore... 
    </p>
    <p>
    Nous vous invitons à télécharger l'application Compani Formation sur votre store et
     à cliquer sur “c’est ma première connexion” pour vous créer un mot de passe. 
    </p>
    <br />
    ${GooglePlayAndAppStoreButton()}`;

const GooglePlayAndAppStoreButton = () => `
<table width="100%" cellspacing="0" cellpadding="0">
  <tr>
    <td>
      <table cellspacing="0" cellpadding="0">
        <tr>
          <td>
            <a href="https://play.google.com/store/apps/details?id=com.alenvi.compani&pcampaignid=pcampaignidMKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1" target="_blank" style="display: inline-block; padding-right: 15px">
              <img style="width: 150px" alt='Disponible sur Google Play' src='https://play.google.com/intl/en_us/badges/static/images/badges/fr_badge_web_generic.png' />           
            </a>
          </td>
          <td>
            <a href="https://apps.apple.com/us/app/compani-formation/id1516691161?itsct=apps_box&amp;itscg=30200" target="_blank" style="display: inline-block;">
              <img style="width: 150px" alt='Disponible sur App Store' src='https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/fr-FR?size=250x83&amp;releaseDate=1608249600&h=4a2fd21cde414ce8cf547448de18fdec' />           
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
<p>Google Play et le logo Google Play sont des marques de Google LLC.</p>`;

module.exports = {
  baseWelcomeContent,
  helperCustomContent,
  trainerCustomContent,
  coachCustomContent,
  forgotPasswordEmail,
  billEmail,
  completeBillScriptEmailBody,
  completeEventRepScriptEmailBody,
  completeRoleUpdateScriptEmailBody,
  completeEventConsistencyScriptEmailBody,
  welcomeTraineeContent,
};
