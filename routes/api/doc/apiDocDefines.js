/* API DEFINES for apidoc.js */
/**
 * @apiDefine UnexpectedBehaviorError
 *
 * @apiError (Error 500) UnexpectedBehavior There is an unexpected behavior from the server.
 *
 * @apiErrorExample Error500-Response:
 *    HTTP/1.1 500 Internal Server Error
 *    {
 *      "success": false,
 *      "error": "Unexpected behavior."
 *    {
 *
 */

/**
 * @apiDefine ForbiddenError
 *
 * @apiError Forbidden The user doesn't have the rights to perform the request.
 *
 * @apiErrorExample Error403-Response:
 *    HTTP/1.1 403 Forbidden
 *    {
 *      "success": false,
 *      "error": "Forbidden."
 *    }
 *
 */

/**
 * @apiDefine TokenNotFoundError
 *
 * @apiError TokenNotFound There is no token provided.
 *
 * @apiErrorExample Error401-Response:
 *    HTTP/1.1 401 Unauthorized
 *    {
 *      "success": false,
 *      "error": "Please provide a token."
 *    }
 *
 */

/**
 * @apiDefine TokenAuthFailedError
 *
 * @apiError TokenAuthFailed Failed to authenticate token.
 *
 * @apiErrorExample Error401-Response:
 *    HTTP/1.1 401 Unauthorized
 *    {
 *      "success": false,
 *      "error": "Failed to authenticate token."
 *    }
 *
 */

/**
 * @apiDefine TokenExpiredError
 *
 * @apiError TokenExpired The token is no longer valid.
 *
 * @apiErrorExample Error401-Response:
 *    HTTP/1.1 401 Unauthorized
 *    {
 *      "success": false,
 *      "error": "Token is expired."
 *    }
 *
 */

/**
 * @apiDefine MissingParametersError
 *
 * @apiError MissingParameters Missing mandatory parameters to run the operation.
 *
 * @apiErrorExample Error400-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "success": false,
 *      "error": "Missing parameters :("
 *    }
 *
 */

/**
 * @apiDefine UserNotFoundError
 *
 * @apiError UserNotFound User doesn't exist.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "User doesn't exist."
 *    }
 */

/**
 * @apiDefine UserShowAllNotFoundError
 *
 * @apiError UserShowAllNotFound User not found.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "There are no users."
 *    }
 */

/**
 * @apiDefine UserEmailExistsError
 *
 * @apiError UserEmailExists User email already exists.
 *
 * @apiErrorExample Error409-Response:
 *    HTTP/1.1 409 Conflict
 *    {
 *      "success": false,
 *      "error": "User already exists."
 *    }
 */

/**
 * @apiDefine InvalidEmailError
 *
 * @apiError InvalidEmail Email is not valid.
 *
 * @apiErrorExample Error400-Response:
 *    HTTP/1.1 400 Bad Request
 *    {
 *      "success": false,
 *      "error": "Email is not valid."
 *    }
 */

/**
 * @apiDefine UserAuthNotFoundError
 *
 * @apiError UserAuthNotFound  The authentication failed because the user was not found.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "Authentication failed because the user was not found."
 *    }
 */

/**
 * @apiDefine UserAuthFailedError
 *
 * @apiError UserAuthFailed  The email address or password entered is not valid.
 *
 * @apiErrorExample Error401-Response:
 *    HTTP/1.1 401 Unauthorized
 *    {
 *      "success": false,
 *      "error": "The email address or password you entered is not valid."
 *    }
 */

/**
 * @apiDefine OgustGetTokenFailedError
 *
 * @apiError OgustGetTokenFailed Ogust Token retrieving failed.
 *
 * @apiErrorExample Error500-Response:
 *    HTTP/1.1 500 Internal Server Error
 *    {
 *      "success": false,
 *      "error": "Ogust Token retrieving failed."
 *    }
 */

/**
 * @apiDefine ServicesNotFoundError
 *
 * @apiError ServicesNotFound Ogust Services not found.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "Ogust Services not found."
 *    }
 */

/**
 * @apiDefine ServiceNotFoundError
 *
 * @apiError ServiceNotFound Ogust Service not found.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "Ogust Service not found."
 *    }
 */

/**
 * @apiDefine SalariesNotFoundError
 *
 * @apiError SalariesNotFound Ogust employee\'s salaries not found.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "Ogust employee\'s salaries not found."
 *    }
 */

/**
 * @apiDefine thirdPartyInfoNotFoundError
 *
 * @apiError thirdPartyInfoNotFound Ogust customer\'s third party information not found.
 *
 * @apiErrorExample Error404-Response:
 *    HTTP/1.1 404 Not Found
 *    {
 *      "success": false,
 *      "error": "Ogust third party information not found."
 *    }
 */

/**
 * @apiDefine facebookNoTokenError
 *
 * @apiError facebookNoToken Facebook token not provided.
 *
 * @apiErrorExample Error400-Response:
 *    HTTP/1.1 400 Not Found
 *    {
 *      "success": false,
 *      "error": "Facebook Token not provided."
 *    }
 */
