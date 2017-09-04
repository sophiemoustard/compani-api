/* API DOCUMENTATION for apidoc.js - Ogust - Services */

/**
 * @api {get} /api/ogust/services Get all services
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getAll
 * @apiGroup Ogust_Services
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} isRange="false" If true will retrieve services by range (slotToAdd, slotToSub and intervalType need to be set then)
 * @apiParam {String} isDate="false" If true will retrieve services by date (startDate and endDate need to be set then)
 * @apiParam {String} slotToSub Offset needed when isRange is true
 * @apiParam {String} slotToAdd Offset needed when isRange is true
 * @apiParam {String} intervalType Type of interval (weeks, days) needed when isRange is true
 * @apiParam {String} [startDate] Start date needed when isDate is true
 * @apiParam {String} [endDate] End date needed when isDate is true
 * @apiParam {String} [status="@!=|N"] Status of the service
 * @apiParam {String} [type="I"] Type of the service
 * @apiParam {String} [nbPerPage="100"] Number of records per page
 * @apiParam {String} [pageNum="1"] Page number
 *
 * @apiExample {http} Example usage:
 *    api/ogust/services?isDate=true&startDate=201708040000&endDate=201708040000
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.servicesRaw List of all services.
 * @apiSuccess {String} data.servicesRaw.status Response status from Ogust.
 * @apiSuccess {Object} data.servicesRaw.array_service Object containing pagination options and list of services.
 * @apiSuccess {Object} data.servicesRaw.array_service.pagination List of the paginations options.
 * @apiSuccess {Number} data.servicesRaw.array_service.pagination.count Total Number of records.
 * @apiSuccess {String} data.servicesRaw.array_service.pagination.nbperpage Number of records per page.
 * @apiSuccess {String} data.servicesRaw.array_service.pagination.pageNum Page number.
 * @apiSuccess {Object} data.servicesRaw.array_service.result Object containing all services within range or date specified.
 *
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Services Ogust reçus avec succès.",
 *         "data": {
 *             "servicesRaw": {
 *                 "status": "OK",
 *                 "array_service": {
 *                     "pagination": {
 *                         "count": 2,
 *                         "nbperpage": "100",
 *                         "pagenum": "1"
 *                     },
 *                     "result": {
 *                         "0": {
 *                             "id_service": "471894706",
 *                             "rates": "0",
 *                             "id_employee": "149720105",
 *                             "id_customer": "386180649",
 *                             "product_level": "212960568",
 *                             "start_date": "201708050930",
 *                             "end_date": "201708051230",
 *                             "status": "R",
 *                             "id_repetition": "0",
 *                             "type": "I",
 *                             "comment": "",
 *                             "alert": "N",
 *                             "invoice": "0",
 *                             "distance": "0.00",
 *                             "distance_charged": "N",
 *                             "journey_time": "0",
 *                             "fees_amount": "0.00",
 *                             "fees_amount_charged": "N",
 *                             "mode": "P",
 *                             "pay_slip": "0",
 *                             "contract": "0",
 *                             "billing_amount": "1.00",
 *                             "billing_amount_unit": "H",
 *                             "validate_date_C": null,
 *                             "validate_comment_C": null,
 *                             "validate_date_I": null,
 *                             "validate_comment_I": null,
 *                             "insert_service": "Gestionnaire",
 *                             "initiative": "Intervenant"
 *                         },
 *                         "1": {
 *                             "id_service": "471894706",
 *                             "rates": "0",
 *                             "id_employee": "149720105",
 *                             "id_customer": "386180649",
 *                             "product_level": "212960568",
 *                             "start_date": "201708050930",
 *                             "end_date": "201708051230",
 *                             "status": "R",
 *                             "id_repetition": "0",
 *                             "type": "I",
 *                             "comment": "",
 *                             "alert": "N",
 *                             "invoice": "0",
 *                             "distance": "0.00",
 *                             "distance_charged": "N",
 *                             "journey_time": "0",
 *                             "fees_amount": "0.00",
 *                             "fees_amount_charged": "N",
 *                             "mode": "P",
 *                             "pay_slip": "0",
 *                             "contract": "0",
 *                             "billing_amount": "1.00",
 *                             "billing_amount_unit": "H",
 *                             "validate_date_C": null,
 *                             "validate_comment_C": null,
 *                             "validate_date_I": null,
 *                             "validate_comment_I": null,
 *                             "insert_service": "Gestionnaire",
 *                             "initiative": "Intervenant"
 *                         },
 *                     }
 *                 }
 *             }
 *         }
 *      }
 *
 * @apiUse MissingParametersError
 * @apiUse ServicesNotFoundError
 * @apiUse UnexpectedBehaviorError
 */


/**
 * @api {get} /api/ogust/services/:id Get service by id
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getById
 * @apiGroup Ogust_Services
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of service
 * @apiParam {String} [status="@!=|N"] Status of the service
 * @apiParam {String} [type="I"] Type of the service
 *
 * @apiExample {http} Example usage:
 *    api/ogust/services/485739287
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.servicesRaw
 * @apiSuccess {String} data.servicesRaw.status Response status from Ogust.
 * @apiSuccess {String} data.servicesRaw.service Object containing service details.
 * @apiSuccess {Object} data.servicesRaw.service.id_employee Employee id linked to the intervention.
 * @apiSuccess {String} data.servicesRaw.service.id_customer Customer id linked to the intervention.
 * @apiSuccess {String} data.servicesRaw.service.start_date Intervention start date (YYYYMMDDHHMM).
 * @apiSuccess {String} data.servicesRaw.service.end_date Intervention end date (YYYYMMDDHHMM).
 *
 * @apiSuccessExample Success-Response:
 *      HTTP/1.1 200 OK
 *       {
 *          "success": true,
 *          "message": "Service Ogust reçu avec succès.",
 *          "data": {
 *              "servicesRaw": {
 *                  "status": "OK",
 *                  "service": {
 *                      "id_service": "365985829",
 *                      "rates": "0",
 *                      "id_employee": "496453101",
 *                      "id_customer": "657346169",
 *                      "product_level": "607604715",
 *                      "start_date": "201509191730",
 *                      "end_date": "201712191930",
 *                      "status": "R",
 *                      "id_repetition": "821834230",
 *                      "type": "I",
 *                      "comment": "",
 *                      "alert": "N",
 *                      "invoice": "754343834",
 *                      "distance": "0.00",
 *                      "distance_charged": "N",
 *                      "journey_time": "0",
 *                      "fees_amount": "0.00",
 *                      "fees_amount_charged": "N",
 *                      "mode": "P",
 *                      "pay_slip": "433560893",
 *                      "contract": "0",
 *                      "billing_amount": "1.00",
 *                      "billing_amount_unit": "H",
 *                      "validate_date_C": null,
 *                      "validate_comment_C": null,
 *                      "validate_date_I": null,
 *                      "validate_comment_I": null,
 *                      "insert_service": "Gestionnaire",
 *                      "initiative": "Intervenant"
 *                  }
 *              }
 *          }
 *      }
 *
 * @apiUse MissingParametersError
 * @apiUse ServiceNotFoundError
 * @apiUse UnexpectedBehaviorError
 */
