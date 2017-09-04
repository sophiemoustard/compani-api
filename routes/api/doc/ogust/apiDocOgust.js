/* API DOCUMENTATION for apidoc.js - Ogust */

/**
 * @api {get} /api/ogust/token Get ogust token
 * @apiVersion 1.0.0
 * @apiPermission User
 * @apiName get
 * @apiGroup Ogust
 *
 * @apiHeader {String} x-access-token User access-token from Alenvi
 *
 * @apiExample {http} Example usage:
 *    api/ogust/token
 *    // header
 *    {
 *       "x-access-token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1MDMwNTIwNDYsImV4cCI6MTUzNDU4ODA0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.KbNoaDFRo7ElOrYNrXqzAUZCAR3vwh2aL5awcyVwpQ0"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data List of all users.
 * @apiSuccess {String} data.status Response status from Ogust.
 * @apiSuccess {String} data.token Token from Ogust.
 * @apiSuccess {String} data.expireDate Expiration date of token from Ogust.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Token Ogust reçu avec succès.",
 *         "data": {
 *             "status": "OK",
 *             "token": "94KYPZ83P260W871H1793FCSIZF118KZ7F592N14",
 *             "expireDate": "2017-08-10T14:12:00+02:00"
 *         }
 *     }
 *
 * @apiUse OgustGetTokenFailedError
 */
