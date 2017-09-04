/* API DOCUMENTATION for apidoc.js - Facebook */

/**
 * @api {get} /api/facebook/whitelistedDomains Get domains whitelisted for a facebook page
 * @apiVersion 1.0.0
 * @apiPermission none
 * @apiName getWhitelistedDomains
 * @apiGroup Facebook
 *
 * @apiParam {String} access_token Facebook page token
 *
 * @apiExample {http} Example usage:
 *    api/ogust/facebook/whitelistedDomains?access_token=26deb39664b6eb2df8f7b501429418d5fb6d12b4c5e08ea7d4a918ad39a608cd
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object[]} data.data List of whitelisted domains.
 * @apiSuccess {String} data.data.whitelisted_domains Whitelisted domains.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Domains whitelistés Facebook récupérés avec succès.",
 *         "data": {
 *             "data": [
 *                 {
 *                     "whitelisted_domains": [
 *                         "https://370v9v0b.ngrok.io/"
 *                     ]
 *                 }
 *             ]
 *         }
 *     }
 *
 * @apiUse facebookNoTokenError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {post} /api/facebook/whitelistedDomains Get domains whitelisted for a facebook page
 * @apiVersion 1.0.0
 * @apiPermission none
 * @apiName postWhitelistedDomains
 * @apiGroup Facebook
 *
 * @apiParam {String} access_token Facebook page token
 * @apiParam {Array} whitelisted_domains List of domains to whitelist
 *
 * @apiExample {http} Example usage:
 *    api/ogust/facebook/whitelistedDomains?access_token=26deb39664b6eb2df8f7b501429418d5fb6d12b4c5e08ea7d4a918ad39a608cd
 *    // body
 *    {
 *       "whitelisted_domains": ["http://itibimuh.sk/rasev"]
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {String} data.result Status of the request.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Domaine(s) whitelisté(s) ajoutés avec succès.",
 *         "data": {
 *             "result": "success"
 *         }
 *     }
 *
 * @apiUse facebookNoTokenError
 * @apiUse MissingParametersError
 * @apiUse UnexpectedBehaviorError
 */
