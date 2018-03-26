const docusign = require('docusign-esign');
const path = require('path');
const async = require('async');

const integratorKey = '81bb7011-331d-421f-ae0a-56dfb973d414'; // Integrator Key associated with your DocuSign Integration
const email = 'jctrebalag@gmail.com'; // Email for your DocuSign Account
const password = "-'6heb#uqM8mVx?G"; // Password for your DocuSign Account
const docusignEnv = 'demo'; // DocuSign Environment generally demo for testing purposes
const fullName = 'jc'; // Recipient's Full Name
const recipientEmail = 'jean-christophe@alenvi.io'; // Recipient's Email
const templateId = '47786a9e-367c-4b9c-aab6-a86107b3d1ed'; // ID of the Template you want to create the Envelope with
const baseUrl = `https://${docusignEnv}.docusign.net/restapi`;
const userId = 'f5bd3aa1-1d37-4b4f-88d5-a5b09862f02e';
const oAuthBaseUrl = 'account-d.docusign.com'; // use account.docusign.com for Live/Production
const redirectURI = 'https://www.docusign.com/api';
const privateKeyFilename = 'docusign_private_key.txt';

const apiClient = new docusign.ApiClient();

async.waterfall([
  function initApiClient(next) {
    apiClient.setBasePath(baseUrl);
    // assign the api client to the Configuration object
    docusign.Configuration.default.setDefaultApiClient(apiClient);

    // IMPORTANT NOTE:
    // the first time you ask for a JWT access token, you should grant access by making the following call
    // get DocuSign OAuth authorization url:
    const oauthLoginUrl = apiClient.getJWTUri(integratorKey, redirectURI, oAuthBaseUrl);
    // open DocuSign OAuth authorization url in the browser, login and grant access
    console.log(oauthLoginUrl);
    // END OF NOTE

    // configure the ApiClient to asynchronously get an access to token and store it
    apiClient.configureJWTAuthorizationFlow(path.resolve(__dirname, privateKeyFilename), oAuthBaseUrl, integratorKey, userId, 3600, (err, res) => {
      if (err) {
        return next(err);
      }
      next(null, res);
    });
  },

  function login(res, next) {
    // login call available off the AuthenticationApi
    const authApi = new docusign.AuthenticationApi();

    // login has some optional parameters we can set
    const loginOps = {};
    loginOps.apiPassword = 'true';
    loginOps.includeAccountIdGuid = 'true';
    authApi.login(loginOps, (err, loginInfo, response) => {
      if (err) {
        return next(err);
      }
      if (loginInfo) {
        // list of user account(s)
        // note that a given user may be a member of multiple accounts
        const loginAccounts = loginInfo.loginAccounts;
        console.log(`LoginInformation: ${JSON.stringify(loginAccounts)}`);
        const loginAccount = loginAccounts[0];
        const accountId = loginAccount.accountId;
        const loginBaseUrl = loginAccount.baseUrl;
        const accountDomain = loginBaseUrl.split('/v2');

        // below code required for production, no effect in demo (same domain)
        apiClient.setBasePath(accountDomain[0]);
        docusign.Configuration.default.setDefaultApiClient(apiClient);
        console.log('TYPE', typeof next);
        next(null, loginAccount);
      }
    });
  },

  function sendTemplate(loginAccount, next) {
    // create a new envelope object that we will manage the signature request through
    const envDef = new docusign.EnvelopeDefinition();
    envDef.emailSubject = 'Please sign this document sent from Node SDK';
    envDef.templateId = templateId;

    // create a template role with a valid templateId and roleName and assign signer info
    const tRole = new docusign.TemplateRole();
    tRole.roleName = 'Auxiliaire';
    tRole.name = fullName;
    tRole.email = recipientEmail;

    // create a list of template roles and add our newly created role
    const templateRolesList = [];
    templateRolesList.push(tRole);

    // assign template role(s) to the envelope
    envDef.templateRoles = templateRolesList;

    // send the envelope by setting |status| to 'sent'. To save as a draft set to 'created'
    envDef.status = 'sent';

    // use the |accountId| we retrieved through the Login API to create the Envelope
    const accountId = loginAccount.accountId;

    // instantiate a new EnvelopesApi object
    const envelopesApi = new docusign.EnvelopesApi();

    // call the createEnvelope() API
    envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDef }, (err, envelopeSummary, response) => {
      if (err) {
        return next(err);
      }
      console.log(`EnvelopeSummary: ${JSON.stringify(envelopeSummary)}`);
      next(null);
    });
  }

], (error) => {
  if (error) {
    console.log('Error: ', error);
    process.exit(1);
  }
  process.exit();
});
