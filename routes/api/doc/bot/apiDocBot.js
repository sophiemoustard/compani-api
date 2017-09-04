/* API DOCUMENTATION for apidoc.js - Bot */
/**
 * @api {get} /api/bot/authorize Authorize authentication by Facebook
 * @apiVersion 1.0.0
 * @apiPermission none
 * @apiName authorize
 * @apiGroup Bot
 *
 * @apiParam {String} email User email.
 * @apiParam {String} password User password.
 * @apiParam {String} redirect_uri Redirect uri provided by Facebook.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 302 Found
 *
 * @apiUse MissingParametersError
 * @apiUse UserAuthFailedError
 * @apiUse UserAuthNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/bot/user/:_id Get User information
 * @apiVersion 1.0.0
 * @apiPermission none
 * @apiName getUserByParamId
 * @apiGroup Bot
 *
 * @apiParam {Number} _id Unique Id of the user.
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Utilisateur trouvé avec succès.",
 *       "data": {
 *           "user": {
 *               "firstname": "John",
 *               "lastname": "Doe",
 *               "_id": "5842k1aeff1r07ce01405042",
 *               "local.email": "test@test.com",
 *               "role": "auxiliary",
 *               "employee_id": 609710104,
 *               "sector": "1n*"
 *           }
 *       }
 *     }
 *
 * @apiUse UserNotFoundError
 */
