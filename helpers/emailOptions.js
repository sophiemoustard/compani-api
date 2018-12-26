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

const welcomeAuxiliaryEmailContent = () => (
  `<p>Bienvenue chez Alenvi,</p>
  <p>Ton compte a bien été créé.<br>
    Tu peux t'y connecter à tout moment en suivant ce lien:</p>
  <p><a href="${process.env.WEBSITE_HOSTNAME}/login">${process.env.WEBSITE_HOSTNAME}</a></p>
  <p>Merci et à bientôt,<br>
    L'équipe Alenvi</p>`
);

const forgetPasswordEmail = resetPassword => (
  `<p>Bonjour,</p>
  <p>Vous pouvez modifier votre mot de passe en cliquant sur le lien suivant (lien valable une heure) :</p>
  <p><a href="${process.env.WEBSITE_HOSTNAME}/resetPassword/${resetPassword.token}">${process.env.WEBSITE_HOSTNAME}/resetPassword/${resetPassword.token}</a></p>
  <p>Si vous n'êtes pas à l'origine de cette demande, veuillez ne pas tenir compte de cet email.</p>
  <p>Bien cordialement,<br>
    L'équipe Compani</p>`
);

module.exports = {
  welcomeEmailContent,
  welcomeAuxiliaryEmailContent,
  forgetPasswordEmail,
};
