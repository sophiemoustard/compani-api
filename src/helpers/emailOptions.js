const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');

const fsPromises = fs.promises;

const welcomeEmailContent = (options) => {
  const createPasswordLink = `${process.env.WEBSITE_HOSTNAME}/reset-password/${options.passwordToken.token}`;
  return `<p>Bonjour,</p>
    <p>Votre espace Compani vous permettra de suivre au quotidien le planning des interventions des auxiliaires 
    d’envie chez votre proche, ainsi que les éléments de facturation. Si ça n’est pas déjà fait, nous vous remercions 
    également de finaliser votre souscription en remplissant la page “Abonnement”.<p>
    <p>Vous pouvez créer votre mot de passe en suivant ce lien <a href="${createPasswordLink}">${createPasswordLink}</a>.</p>
    <p>Ce lien est valable 24heures.</p>
    <p>Par la suite, voici le lien pour vous connecter : <a href="${process.env.WEBSITE_HOSTNAME}">${process.env.WEBSITE_HOSTNAME}</a></p>
    <br />
    <p>Bien cordialement,</p>
    <p>L'équipe ${options.companyName}</p>`;
};

const forgetPasswordEmail = passwordToken => (
  `<p>Bonjour,</p>
  <p>Vous pouvez modifier votre mot de passe en cliquant sur le lien suivant (lien valable une heure) :</p>
  <p><a href="${process.env.WEBSITE_HOSTNAME}/resetPassword/${passwordToken.token}">${process.env.WEBSITE_HOSTNAME}/resetPassword/${passwordToken.token}</a></p>
  <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ne pas tenir compte de cet email.</p>
  <p>Bien cordialement,<br>
    L'équipe Compani</p>`
);

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

module.exports = {
  welcomeEmailContent,
  forgetPasswordEmail,
  billEmail,
  completeBillScriptEmailBody,
  completeEventRepScriptEmailBody,
  completeRoleUpdateScriptEmailBody,
};
