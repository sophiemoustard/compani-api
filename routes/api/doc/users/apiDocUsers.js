/* API DOCUMENTATION for apidoc.js - Users */
/**
 * @api {post} /api/users/authenticate Authenticate an User
 * @apiVersion 1.0.0
 * @apiPermission none
 * @apiName authenticate
 * @apiGroup User
 *
 * @apiParam {String} email Email of the User.
 * @apiParam {String} password Password of the User.
 *
 * @apiExample {http} Example usage:
 *    api/users/authenticate
 *    // body
 *    {
 *       "email": "ruif@dulup.tn",
 *       "password": "test"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data User token with expiration and information
 * @apiSuccess {String} data.token User token
 * @apiSuccess {Object} data.user User information
 * @apiSuccess {String} data.user._id User id
 * @apiSuccess {String} data.user.updatedAt User update date
 * @apiSuccess {String} data.user.createdAt User creation date
 * @apiSuccess {String} data.user.firstname User firstname
 * @apiSuccess {String} data.user.lastname User lastname
 * @apiSuccess {String} data.user.employee_id User Ogust id
 * @apiSuccess {String} data.user.sector User Ogust sector
 * @apiSuccess {String} data.user.__v Internal revision of document set by Mongoose
 * @apiSuccess {String} data.user.role User role
 * @apiSuccess {Object} data.user.local User local information
 * @apiSuccess {String} data.user.local.email User local email
 * @apiSuccess {String} data.user.local.password User local password
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *    {
 *      "success": true,
 *      "message": "User authenticated successfully.",
 *      "data": {
 *                  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmaXJzdG5hbWUiOiJBZG1pbiIsImxhc3RuYW1lIjoiQWRtaW4iLCJfaWQiOiI1OTQ3ZDhlZDgyZWI2NzliZTQ4NTJkNjciLCJsb2NhbC5lbWFpbCI6ImFkbWluQGFsZW52aS5pbyIsInJvbGUiOiJhZG1pbiIsImVtcGxveWVlX2lkIjoxLCJzZWN0b3IiOiIqIiwiaWF0IjoxNTAyMjY3OTc3LCJleHAiOjE1MDIzNTQzNzd9.hgunCJnGMNAmHbqxvEU4Rk0iNm-j6fXRDbuHNGyaNmE",
 *        "user": {
 *            "_id": "5997d8ed85eg679be4852v67",
 *            "updatedAt": "2017-06-19T14:00:13.733Z",
 *            "createdAt": "2017-06-19T14:00:13.733Z",
 *            "firstname": "Jean",
 *            "lastname": "Dupont",
 *            "employee_id": 97,
 *            "sector": "*",
 *            "__v": 0,
 *            "role": "admin",
 *            "local": {
 *                "email": "jean.dupont@alenvi.io",
 *                "password": "$2a$10$Rar57oH9pewhd/93tyT6f.O5cgiASa.h2msVsCwPn8q/R2mm6LHoS"
 *            }
 *        }
 *      }
 *     }
 *
 * @apiUse MissingParametersError
 * @apiUse UserAuthFailedError
 * @apiUse UserAuthNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/users/ Get all users
 * @apiVersion 1.0.0
 * @apiPermission User
 * @apiName showAll
 * @apiGroup User
 *
 * @apiHeader {String} x-access-token User access-token from Alenvi
 *
 * @apiExample {http} Example usage:
 *    api/users
 *    // header
 *    {
 *       "x-access-token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1MDMwNTIwNDYsImV4cCI6MTUzNDU4ODA0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.KbNoaDFRo7ElOrYNrXqzAUZCAR3vwh2aL5awcyVwpQ0"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data List of all users.
 * @apiSuccess {Object} data Users information
 * @apiSuccess {Object[]} data.user Users information
 * @apiSuccess {String} data.users._id User id
 * @apiSuccess {String} data.users.updatedAt User update date
 * @apiSuccess {String} data.users.createdAt User creation date
 * @apiSuccess {String} data.users.firstname User firstname
 * @apiSuccess {String} data.users.lastname User lastname
 * @apiSuccess {String} data.users.employee_id User Ogust id
 * @apiSuccess {String} data.users.sector User Ogust sector
 * @apiSuccess {String} data.users.__v Internal revision of document set by Mongoose
 * @apiSuccess {String} data.users.role User role
 * @apiSuccess {Object} data.users.facebook User Facebook information
 * @apiSuccess {String} data.users.facebook.facebookId User Facebook id
 * @apiSuccess {Object} data.users.local User local information
 * @apiSuccess {String} data.users.local.email User local email
 * @apiSuccess {String} data.users.local.password User local password
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "success": true,
 *         "message": "Utilisateurs trouvés avec succès.",
 *         "data": {
 *             "users": [
 *                 {
 *                     "_id": "5842k1aeff6r07ce01405642",
 *                     "__v": 0,
 *                     "createdAt": "2017-06-19T13:29:16.872Z",
 *                     "sector": "1m*",
 *                     "lastname": "Doe",
 *                     "firstname": "John",
 *                     "updatedAt": "2017-06-21T00:25:21.537Z",
 *                     "employee_id": 497607720,
 *                     "role": "auxiliary",
 *                     "facebook": {
 *                         "facebookId": "304018628931254"
 *                     },
 *                     "local": {
 *                         "email": "john.doe@gmail.com",
 *                         "password": "$3a$10$Qgzj3i6xazSuxslbK6YKn.Cdrptm6esqkldDyAyMznqLlg/YUsIbG"
 *                     }
 *                 },
 *                 {
 *                       "_id": "6842k1aefm6r07ce01405647",
 *                     "__v": 0,
 *                     "createdAt": "2017-06-19T13:29:16.872Z",
 *                     "sector": "1m*",
 *                     "lastname": "Doe",
 *                     "firstname": "Jane",
 *                     "updatedAt": "2017-06-21T00:25:21.537Z",
 *                     "employee_id": 497607720,
 *                     "role": "auxiliary",
 *                     "facebook": {
 *                         "facebookId": "304018628931250"
 *                     },
 *                     "local": {
 *                         "email": "jane.doe@gmail.com",
 *                         "password": "$3a$10$Qgzj3i6xazSuxslbK6YKn.Cdrptm6esqkldDyAyMznqLlg/YUsIbG"
 *                     }
 *                 },
 *             ]
 *         }
 *       }
 *
 * @apiUse MissingParametersError
 * @apiUse UserAuthFailedError
 * @apiUse UserAuthNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/users/:_id Show an user by ID
 * @apiVersion 1.0.0
 * @apiPermission User
 * @apiName show
 * @apiGroup User
 *
 * @apiParam {String} _id Unique id of the User.
 *
 * @apiHeader {String} x-access-token User access-token from Alenvi
 *
 * @apiExample {http} Example usage:
 *    api/users/507f1f77bcf86cd799439011
 *    // header
 *    {
 *       "x-access-token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1MDMwNTIwNDYsImV4cCI6MTUzNDU4ODA0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.KbNoaDFRo7ElOrYNrXqzAUZCAR3vwh2aL5awcyVwpQ0"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data User information
 * @apiSuccess {Object} data.user User information
 * @apiSuccess {String} data.user._id User id
 * @apiSuccess {String} data.user.updatedAt User update date
 * @apiSuccess {String} data.user.createdAt User creation date
 * @apiSuccess {String} data.user.firstname User firstname
 * @apiSuccess {String} data.user.lastname User lastname
 * @apiSuccess {String} data.user.employee_id User Ogust id
 * @apiSuccess {String} data.user.sector User Ogust sector
 * @apiSuccess {String} data.user.__v Internal revision of document set by Mongoose
 * @apiSuccess {String} data.user.role User role
 * @apiSuccess {Object} data.user.facebook User Facebook information
 * @apiSuccess {String} data.user.facebook.facebookId User Facebook id
 * @apiSuccess {Object} data.user.local User local information
 * @apiSuccess {String} data.user.local.email User local email
 * @apiSuccess {String} data.user.local.password User local password
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *    {
 *        "success": true,
 *        "message": "Utilisateur trouvé avec succès.",
 *        "data": {
 *            "user": {
 *                "_id": "6842k1aefm6r07ce01405647",
 *                "__v": 0,
 *                "createdAt": "2017-06-19T13:29:16.872Z",
 *                "sector": "1k*",
 *                "lastname": "Doe",
 *                "firstname": "John",
 *                "updatedAt": "2017-06-21T00:25:21.537Z",
 *                "employee_id": 547017476,
 *                "role": "auxiliary",
 *                "facebook": {
 *                    "facebookId": "402068626903294"
 *                },
 *                "local": {
 *                    "email": "john.doe@gmail.com",
 *                    "password": "$5h$93$Auzj7i0xnoSqfgkbK6BKc.Fdrpom7esukldDoAzPznwLpg/YMsIbG"
 *                }
 *            }
 *        }
 *     }
 *
 * @apiUse UserNotFoundError
 */

/**
 * @api {post} /api/users Create a new user
 * @apiVersion 1.0.0
 * @apiPermission none
 * @apiName create
 * @apiGroup User
 *
 * @apiParam {String} email Email of the User.
 * @apiParam {String} password Password of the User.
 * @apiParam {String} role Role of the User.
 * @apiParam {String} [firstname] Firstname of the User.
 * @apiParam {String} [lastname] Lastname of the User.
 * @apiParam {String} [employee_id] Ogust employee id of the User.
 * @apiParam {String} [customer_id] Ogust customer id of the User.
 * @apiParam {String} [sector] Sector of the User.
 * @apiParam {String} [facebookId] Facebook id of the User.
 * @apiParam {String} [facebookEmail] Facebook email of the User.
 * @apiParam {String} [slackId] Slack id of the User.
 * @apiParam {String} [slackEmail] Slack email of the User.
 *
 * @apiExample {http} Example usage:
 *    api/users
 *    // body
 *    {
 *       "firstname": "Ina"
 *       "lastname": "Bell"
 *       "email": "jureko@lo.it"
 *       "password": "&x^uQHbN"
 *       "employee_id": "374950284"
 *       "role": "user"
 *       "sector": "1c*"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data User information
 * @apiSuccess {Object} data.user User information
 * @apiSuccess {String} data.user.__v Internal revision of document set by Mongoose
 * @apiSuccess {String} data.user.updatedAt User update date
 * @apiSuccess {String} data.user.createdAt User creation date
 * @apiSuccess {String} data.user.firstname User firstname
 * @apiSuccess {String} data.user.lastname User lastname
 * @apiSuccess {String} data.user.employee_id User Ogust id
 * @apiSuccess {String} data.user.sector User Ogust sector
 * @apiSuccess {String} data.user._id User id
 * @apiSuccess {String} data.user.role User role
 * @apiSuccess {Object} data.user.local User local information
 * @apiSuccess {String} data.user.local.email User local email
 * @apiSuccess {String} data.user.local.password User local password
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "success": true,
 *         "message": "Utilisateur enregistré avec succès.",
 *         "data": {
 *             "user": {
 *                 "__v": 0,
 *                 "updatedAt": "2017-08-10T07:31:32.262Z",
 *                 "createdAt": "2017-08-10T07:31:32.262Z",
 *                 "firstname": "Test",
 *                 "lastname": "Doc",
 *                 "employee_id": 708320360,
 *                 "sector": "1m*",
 *                 "_id": "6842k1aefm6r07ce01405647",
 *                 "role": "auxiliary",
 *                 "local": {
 *                     "email": "test@gmail.com",
 *                     "password": "$5h$93$Auzj7i0xnoSqfgkbK6BKc.Fdrpom7esukldDoAzPznwLpg/YMsIbG"
 *                 }
 *             }
 *         }
 *      }
 *
 * @apiUse MissingParametersError
 * @apiUse InvalidEmailError
 * @apiUse UserEmailExistsError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {put} /api/users/:_id Update an user by id
 * @apiVersion 1.0.0
 * @apiPermission admin
 * @apiName update
 * @apiGroup User
 *
 * @apiHeader {String} x-access-token User access-token from Alenvi
 *
 * @apiParam {String} _id Unique id of the User.
 * @apiParam {String} email Email of the User.
 * @apiParam {String} password Password of the User.
 * @apiParam {String} role Role of the User.
 * @apiParam {String} [firstname] Firstname of the User.
 * @apiParam {String} [lastname] Lastname of the User.
 * @apiParam {String} [employee_id] Ogust employee id of the User.
 * @apiParam {String} [customer_id] Ogust customer id of the User.
 * @apiParam {String} [sector] Sector of the User.
 * @apiParam {String} [facebookId] Facebook id of the User.
 * @apiParam {String} [facebookEmail] Facebook email of the User.
 * @apiParam {String} [slackId] Slack id of the User.
 * @apiParam {String} [slackEmail] Slack email of the User.
 *
 * @apiExample {http} Example usage:
 *    api/users/507f1f77bcf86cd799439011
 *    // header
 *    {
 *       "x-access-token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1MDMwNTIwNDYsImV4cCI6MTUzNDU4ODA0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.KbNoaDFRo7ElOrYNrXqzAUZCAR3vwh2aL5awcyVwpQ0"
 *    }
 *
 *    // body
 *    {
 *       "firstname": "Ina"
 *       "lastname": "Bell"
 *       "email": "jureko@lo.it"
 *       "password": "&x^uQHbN"
 *       "employee_id": "374950284"
 *       "role": "user"
 *       "sector": "1c*"
 *       "facebookId": "1293093798150144"
 *    }
 *
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data User information
 * @apiSuccess {Object} data.user User information
 * @apiSuccess {String} data.user._id User id
 * @apiSuccess {String} data.user.updatedAt User update date
 * @apiSuccess {String} data.user.createdAt User creation date
 * @apiSuccess {String} data.user.firstname User firstname
 * @apiSuccess {String} data.user.lastname User lastname
 * @apiSuccess {String} data.user.employee_id User Ogust id
 * @apiSuccess {String} data.user.sector User Ogust sector
 * @apiSuccess {String} data.user.__v Internal revision of document set by Mongoose
 * @apiSuccess {String} data.user.role User role
 * @apiSuccess {Object} data.user.local User local information
 * @apiSuccess {String} data.user.local.email User local email
 * @apiSuccess {String} data.user.local.password User local password
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "success": true,
 *         "message": "Utilisateur modifié avec succès.",
 *         "data": {
 *             "user": {
 *                 "_id": "6842k1aefm6r07ce01405647",
 *                 "updatedAt": "2017-08-10T07:31:32.262Z",
 *                 "createdAt": "2017-08-10T07:31:32.262Z",
 *                 "firstname": "Test",
 *                 "lastname": "Doc",
 *                 "employee_id": 708320360,
 *                 "sector": "1m*",
 *                 "__v": 0,
 *                 "role": "auxiliary",
 *                 "local": {
 *                     "email": "test@gmail.com",
 *                     "password": "$5h$93$Auzj7i0xnoSqfgkbK6BKc.Fdrpom7esukldDoAzPznwLpg/YMsIbG"
 *                 }
 *             }
 *         }
 *      }
 *
 * @apiUse ForbiddenError
 * @apiUse UserEmailExistsError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {delete} /api/users/:_id Delete an user by id
 * @apiVersion 1.0.0
 * @apiPermission admin
 * @apiName delete
 * @apiGroup User
 *
 * @apiHeader {String} x-access-token User access-token from Alenvi
 *
 * @apiParam {String} _id Unique id of the User.
 *
 * @apiExample {http} Example usage:
 *    api/users/507f1f77bcf86cd799439011
 *    // header
 *    {
 *       "x-access-token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE1MDMwNTIwNDYsImV4cCI6MTUzNDU4ODA0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSIsIlN1cm5hbWUiOiJSb2NrZXQiLCJFbWFpbCI6Impyb2NrZXRAZXhhbXBsZS5jb20iLCJSb2xlIjpbIk1hbmFnZXIiLCJQcm9qZWN0IEFkbWluaXN0cmF0b3IiXX0.KbNoaDFRo7ElOrYNrXqzAUZCAR3vwh2aL5awcyVwpQ0"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *         "success": true,
 *         "message": "Utilisateur supprimé avec succès."
 *     }
 *
 * @apiUse ForbiddenError
 * @apiUse UnexpectedBehaviorError
 */
