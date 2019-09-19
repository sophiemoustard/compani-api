const welcomeEmailContent = receiver => (
  `<p>Bonjour,</p>
  <p>Votre espace Compani vous permettra de suivre au quotidien le planning des interventions des auxiliaires d’envie chez votre proche, ainsi 
  que les éléments de facturation. Si ça n’est pas déjà fait, nous vous remercions également de finaliser votre souscription en remplissant la page 
  “Abonnement”.<p>
  <p>Voici le lien pour vous connecter : <a href="${process.env.WEBSITE_HOSTNAME}">${process.env.WEBSITE_HOSTNAME}</a></p>
  <p>Vos identifiants pour y accéder :</p>
  <ul>
  <li>login : ${receiver.email}</li>
  <li>mot de passe : ${receiver.password}</li>
  </ul>
  <p>Nous vous recommandons de modifier votre mot de passe lors de votre première connexion.</p>
  <p>Bien cordialement,</p>
  <p>L'équipe Alenvi</p>
  <img src="https://res.cloudinary.com/alenvi/image/upload/c_scale,w_183/v1507124345/images/business/alenvi_logo_complet_full.png" alt="Logo Alenvi">`
);

const forgetPasswordEmail = resetPassword => (
  `<p>Bonjour,</p>
  <p>Vous pouvez modifier votre mot de passe en cliquant sur le lien suivant (lien valable une heure) :</p>
  <p><a href="${process.env.WEBSITE_HOSTNAME}/resetPassword/${resetPassword.token}">${process.env.WEBSITE_HOSTNAME}/resetPassword/${resetPassword.token}</a></p>
  <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ne pas tenir compte de cet email.</p>
  <p>Bien cordialement,<br>
    L'équipe Compani</p>`
);

const invoiceEmail = () => (
  `<p>Bonjour,</p>
  <p>Une nouvelle facture Alenvi est disponible dans votre espace Compani.<br>
    Pour y accéder, veuillez cliquer sur le bouton ci-dessous.</p>
  <a style="-webkit-appearance: button; -moz-appearance: button; appearance: button; text-decoration: none; background-color: #e2007a!important; color: #fff!important; cursor: pointer;" href="${process.env.WEBSITE_HOSTNAME}/customers/documents">Accéder à la facture</a>
  </button>
  <p>L'équipe Compani</p>`
);

const completeBillScriptEmailBody = (sentNb, emails) => {
  let body = `<p>Script correctement exécuté. ${sentNb} emails envoyés.</p>`;
  if (emails.length) {
    body = body.concat(`<p>Facture non envoyée à ${emails.join()}</p>`);
  }
  return body;
};

module.exports = {
  welcomeEmailContent,
  forgetPasswordEmail,
  invoiceEmail,
  completeBillScriptEmailBody,
};
