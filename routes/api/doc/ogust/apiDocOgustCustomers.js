/* API DOCUMENTATION for apidoc.js - Ogust - Customers */

/**
 * @api {get} /api/ogust/customers Get all customers
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getAll
 * @apiGroup Ogust_Customers
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} [status="A"] Employee status
 * @apiParam {String} [nature="S"] Employee nature
 * @apiParam {Number} [nbperpage=50] Number of records per page
 * @apiParam {Number} [pagenum=1] Page number
 *
 * @apiExample {http} Example usage:
 *    api/ogust/customers?status=A&nature=S
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data List of all customers from Ogust.
 * @apiSuccess {Object} data.users Object containing customers information.
 * @apiSuccess {String} data.users.status Response status from Ogust.
 * @apiSuccess {Object} data.users.array_customer Object containing pagination options and list of all employees
 * @apiSuccess {Object} data.users.array_customer.pagination List of the paginations options
 * @apiSuccess {Number} data.users.array_customer.pagination.count Total Number of records
 * @apiSuccess {Number} data.users.array_customer.pagination.nbperpage Number of records per page
 * @apiSuccess {Number} data.users.array_customer.pagination.pageNum Page number
 * @apiSuccess {Object} data.users.array_customer.result Object containing all the information about employees
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *          "success": true,
 *          "message": "Utilisateurs trouvés avec succès.",
 *          "data": {
 *              "users": {
 *                  "status": "OK",
 *                  "array_customer": {
 *                      "pagination": {
 *                          "count": 2,
 *                          "nbperpage": 50,
 *                          "pagenum": 1
 *                      },
 *                      "result": {
 *                          "0": {
 *                              "id_customer": "344563872",
 *                              "mode": "0",
 *                              "code": "CLI17039",
 *                              "type": "C",
 *                              "title": "Mme et M.",
 *                              "last_name": "Reeves",
 *                              "maiden_name": null,
 *                              "first_name": "Matilda",
 *                              "language": "fr-FR",
 *                              "rms_number": null,
 *                              "status": "A",
 *                              "email": "hu@repmif.ai",
 *                              "landline": null,
 *                              "mobile_phone": null,
 *                              "fax": null,
 *                              "skype_id": null,
 *                              "origin": "370767",
 *                              "method_of_payment": "355064",
 *                              "door_code": "3957",
 *                              "urssaf_code": null,
 *                              "social_insurance_number": null,
 *                              "intercom_code": null,
 *                              "allocation_number": null,
 *                              "caf_attached": null,
 *                              "accounting_account": "713VAYT1",
 *                              "sector": "1b*",
 *                              "date_of_birth": null,
 *                              "place_of_birth": null,
 *                              "comment": "Vocmuza vig ahemotva parse nudego tuzunus ez os hiwci kekog otihuvleg jes biriclo kigcegcu ul osi un bec.",
 *                              "intra_community_VAT": null,
 *                              "company_registration_number": null,
 *                              "legal_status": null,
 *                              "activity": null,
 *                              "manager": "648808128",
 *                              "creator": "648808128",
 *                              "main_address": {
 *                                  "id_address": "347690736",
 *                                  "line": "1926 Ubomo Point",
 *                                  "supplement": "",
 *                                  "zip": "75005",
 *                                  "city": "PARIS",
 *                                  "country": "FR",
 *                                  "type": "Azerty",
 *                                  "id_link": "745920293",
 *                                  "third_party": "C"
 *                              },
 *                              "billing_address": {},
 *                              "secondary_address": {},
 *                              "bank_information": {
 *                                  "0": {
 *                                      "id_bankinfo": "559765082",
 *                                      "id_tiers": "750163408",
 *                                      "holder": "Brooks",
 *                                      "address": {
 *                                          "id_address": "347690736",
 *                                          "line": "1926 Ubomo Point",
 *                                          "supplement": "",
 *                                          "zip": "75005",
 *                                          "city": "PARIS",
 *                                          "country": "FR",
 *                                          "type": "Azerty",
 *                                          "id_link": "745920293",
 *                                          "third_party": "C"
 *                                      },
 *                                      "location": null,
 *                                      "name": null,
 *                                      "iban_number": "FR6693539213737984",
 *                                      "bic_number": "CRGBFRIPXXX"
 *                                  }
 *                              },
 *                              "sepa_information": {
 *                                  "0": {
 *                                      "id_sepainfo": "53632848",
 *                                      "id_tiers": "78586752",
 *                                      "society": "66822732",
 *                                      "ics": "FR1000015737493522 - DOME",
 *                                      "rum": "SOC6508507",
 *                                      "signature_date": "20170718",
 *                                      "print_url": "",
 *                                      "signature_url": null
 *                                  }
 *                              }
 *                          },
 *                          "1": {
 *                              "id_customer": "344563872",
 *                              "mode": "0",
 *                              "code": "CLI17039",
 *                              "type": "C",
 *                              "title": "Mme et M.",
 *                              "last_name": "Reeves",
 *                              "maiden_name": null,
 *                              "first_name": "Matilda",
 *                              "language": "fr-FR",
 *                              "rms_number": null,
 *                              "status": "A",
 *                              "email": "hu@repmif.ai",
 *                              "landline": null,
 *                              "mobile_phone": null,
 *                              "fax": null,
 *                              "skype_id": null,
 *                              "origin": "370767",
 *                              "method_of_payment": "355064",
 *                              "door_code": "3957",
 *                              "urssaf_code": null,
 *                              "social_insurance_number": null,
 *                              "intercom_code": null,
 *                              "allocation_number": null,
 *                              "caf_attached": null,
 *                              "accounting_account": "713VAYT1",
 *                              "sector": "1b*",
 *                              "date_of_birth": null,
 *                              "place_of_birth": null,
 *                              "comment": "Vocmuza vig ahemotva parse nudego tuzunus ez os hiwci kekog otihuvleg jes biriclo kigcegcu ul osi un bec.",
 *                              "intra_community_VAT": null,
 *                              "company_registration_number": null,
 *                              "legal_status": null,
 *                              "activity": null,
 *                              "manager": "648808128",
 *                              "creator": "648808128",
 *                              "main_address": {
 *                                  "id_address": "347690736",
 *                                  "line": "1926 Ubomo Point",
 *                                  "supplement": "",
 *                                  "zip": "75005",
 *                                  "city": "PARIS",
 *                                  "country": "FR",
 *                                  "type": "Azerty",
 *                                  "id_link": "745920293",
 *                                  "third_party": "C"
 *                              },
 *                              "billing_address": {},
 *                              "secondary_address": {},
 *                              "bank_information": {
 *                                  "0": {
 *                                      "id_bankinfo": "559765082",
 *                                      "id_tiers": "750163408",
 *                                      "holder": "Brooks",
 *                                      "address": {
 *                                          "id_address": "347690736",
 *                                          "line": "1926 Ubomo Point",
 *                                          "supplement": "",
 *                                          "zip": "75005",
 *                                          "city": "PARIS",
 *                                          "country": "FR",
 *                                          "type": "Azerty",
 *                                          "id_link": "745920293",
 *                                          "third_party": "C"
 *                                      },
 *                                      "location": null,
 *                                      "name": null,
 *                                      "iban_number": "FR6693539213737984",
 *                                      "bic_number": "CRGBFRIPXXX"
 *                                  }
 *                              },
 *                              "sepa_information": {
 *                                  "0": {
 *                                      "id_sepainfo": "53632848",
 *                                      "id_tiers": "78586752",
 *                                      "society": "66822732",
 *                                      "ics": "FR1000015737493522 - DOME",
 *                                      "rum": "SOC6508507",
 *                                      "signature_date": "20170718",
 *                                      "print_url": "",
 *                                      "signature_url": null
 *                                  }
 *                              }
 *                          }
 *                      }
 *                  }
 *              }
 *          }
 *      }
 * @apiUse UserShowAllNotFoundError
 * @apiUse UnexpectedBehaviorError
 */


/**
 * @api {get} /api/ogust/customers/:id Get a customer by its id
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getById
 * @apiGroup Ogust_Customers
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
 *
 * @apiExample {http} Example usage:
 *    api/ogust/customers/485739287
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.user Object containing customers information.
 * @apiSuccess {String} data.user.status Response status from Ogust.
 * @apiSuccess {Object} data.user.customer Object containing customer information details.
 * @apiSuccess {Object} data.user.customer.id_customer Customer id.
 * @apiSuccess {Object} data.user.customer.landline Customer landline phone number.
 * @apiSuccess {Object} data.user.customer.mobile_phone Customer mobile phone number.
 * @apiSuccess {Object} data.user.customer.main_address Customer main address details.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *       {
 *          "success": true,
 *          "message": "Utilisateur trouvé avec succès.",
 *          "data": {
 *              "user": {
 *                  "status": "OK",
 *                  "customer": {
 *                      "id_customer": "126483758",
 *                      "mode": "0",
 *                      "code": "CLI27944",
 *                      "type": "C",
 *                      "title": "M.",
 *                      "last_name": "Reeves",
 *                      "maiden_name": null,
 *                      "first_name": "Joel",
 *                      "language": "fr-FR",
 *                      "rms_number": null,
 *                      "status": "A",
 *                      "email": "tumgode@odhubu.ki",
 *                      "landline": null,
 *                      "mobile_phone": null,
 *                      "fax": null,
 *                      "skype_id": null,
 *                      "origin": "276782",
 *                      "method_of_payment": "585238",
 *                      "door_code": null,
 *                      "urssaf_code": null,
 *                      "social_insurance_number": null,
 *                      "intercom_code": null,
 *                      "allocation_number": null,
 *                      "caf_attached": null,
 *                      "accounting_account": "411REEV1",
 *                      "sector": "*",
 *                      "date_of_birth": null,
 *                      "place_of_birth": null,
 *                      "comment": "Koflico jiha nu cuftijcu bu disovacom arofobow lakujhil basev aviizubud kamir jogewid desdumje wu zemafaro wi ku or.",
 *                      "intra_community_VAT": null,
 *                      "company_registration_number": null,
 *                      "legal_status": null,
 *                      "activity": null,
 *                      "manager": "289873432",
 *                      "creator": "289873432",
 *                      "main_address": {
 *                          "id_address": "618762454",
 *                          "line": "1295 Bucgo Way",
 *                          "supplement": "",
 *                          "zip": "75014",
 *                          "city": "PARIS",
 *                          "country": "FR",
 *                          "type": "Azerty",
 *                          "id_link": "35528942",
 *                          "third_party": "C"
 *                      },
 *                      "billing_address": {},
 *                      "secondary_address": {},
 *                      "bank_information": {
 *                          "0": {
 *                              "id_bankinfo": "554122971",
 *                              "id_tiers": "35528942",
 *                              "holder": "Agnes Jenkins",
 *                              "address": {
 *                                  "id_address": "618766993",
 *                                  "line": "1295 Bucgo Way",
 *                                  "supplement": "",
 *                                  "zip": "75014",
 *                                  "city": "PARIS",
 *                                  "country": "FR",
 *                                  "type": "Azerty",
 *                                  "id_link": "35528942",
 *                                  "third_party": "C"
 *                              },
 *                              "location": null,
 *                              "name": null,
 *                              "iban_number": "FR3084238899380224",
 *                              "bic_number": "RTGEFRDD"
 *                          }
 *                      },
 *                      "sepa_information": {
 *                          "0": {
 *                              "id_sepainfo": "8990510274",
 *                              "id_tiers": "35528942",
 *                              "society": "356336",
 *                              "ics": "FR86OCZ81B7DM",
 *                              "rum": "R8832835632758784",
 *                              "signature_date": "20130528",
 *                              "print_url": "",
 *                              "signature_url": null
 *                          }
 *                      }
 *                  }
 *              }
 *          }
 *      }
 *
 * @apiUse UserNotFoundError
 * @apiUse UnexpectedBehaviorError
 */


/**
 * @api {get} /api/ogust/customers/:id/services Get services by customer
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getCustomerServices
 * @apiGroup Ogust_Customers
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
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
 *    api/ogust/customers/485739287/services?isDate=true&startDate=201708040000&endDate=201708040000
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.servicesRaw List of services by employee.
 * @apiSuccess {String} data.servicesRaw.status Response status from Ogust.
 * @apiSuccess {Object} data.servicesRaw.array_service Object containing pagination options and list of services for a customer.
 * @apiSuccess {Object} data.servicesRaw.array_service.pagination List of the paginations options.
 * @apiSuccess {Number} data.servicesRaw.array_service.pagination.count Total Number of records.
 * @apiSuccess {String} data.servicesRaw.array_service.pagination.nbperpage Number of records per page.
 * @apiSuccess {String} data.servicesRaw.array_service.pagination.pageNum Page number.
 * @apiSuccess {Object} data.servicesRaw.array_service.result Object containing all the services about a customer within range or date specified.
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
 * @api {get} /api/ogust/customers/:id/moreInfo Get customer detailed information by its id
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getThirdPartyInformation
 * @apiGroup Ogust_Customers
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
 * @apiParam {String} [third_party="C"] Customer category
 * @apiParam {Number} [nbperpage=10] Number of records per page
 * @apiParam {Number} [pagenum=1] Page number
 *
 * @apiExample {http} Example usage:
 *    api/ogust/customers/573839209/moreInfo
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.info Object containing customers information.
 * @apiSuccess {String} data.info.status Response status from Ogust.
 * @apiSuccess {Object} data.info.thirdPartyInformations Object containing customer third party information details.
 * @apiSuccess {Object} data.info.thirdPartyInformations.third_party Customer third party category.
 * @apiSuccess {Object} data.info.thirdPartyInformations.third_party_id Customer third party id.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values Object containing customer detailed info.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.NIVEAU Customer pathology.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.COMMNIV Customer pathology comment.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.DETAILEVE Customer intervention details.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.AUTRESCOMM Miscellaneous comments.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *       {
 *          "success": true,
 *          "message": "Informations tierces récupérées avec succès.",
 *          "data": {
 *              "info": {
 *                  "status": "OK",
 *                  "thirdPartyInformations": {
 *                      "third_party": "C",
 *                      "third_party_id": "506060990",
 *                      "array_values": {
 *                          "NIVEAU": "Alzheimer",
 *                          "COMMNIV": "",
 *                          "DETAILEVE": "Wi alizi sofvoba sem dergomape suvuca ve wiw seghifob iwucolcav am pumo. Mijve iffokem hes ni vipem la beuv rohov mo tejeon zidwihlo gaf ughibnu mo fuemakiv dupipiho pa. Iwo go medi sih ceemje buj fiopi avja akaud mun imanecoz caujalu jas kigu ik. Fon jobosbup cavgi igsej lepi pu awaleju uhuwusib docig fobnemtug cerwe okiejuhep re kinow tasul.",
 *                          "AUTRESCOMM": "Uk bi cohop zahabis gatpud rabafcur gewcace necva leufi lioveot uvuziela suvpize ul civazhi abisokse sangug hevucuti."
 *                      }
 *                  }
 *              }
 *          }
 *      }
 *
 * @apiUse thirdPartyInfoNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {put} /api/ogust/customers/:id/moreInfo Edit customer detailed information by its id
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName editThirdPartyInformation
 * @apiGroup Ogust_Customers
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
 * @apiParam {String} third_party="C" Customer category
 * @apiParam {Number} nbperpage=10 Number of records per page
 * @apiParam {Number} pagenum=1 Page number
 * @apiParam {Object} array_values.NIVEAU Customer pathology
 * @apiParam {String} array_values.COMMNIV Customer pathology comment.
 * @apiParam {String} array_values.DETAILEVE Customer intervention details.
 * @apiParam {String} array_values.AUTRESCOMM Miscellaneous comments.
 *
 * @apiExample {http} Example usage:
 *    api/ogust/customers/573839209/moreInfo
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 *    // body
 *   {
 *       "arrayValues": {
 *          "NIVEAU": "-",
 *          "COMMNIV": "BLA ?",
 *          "DETAILEVE": "Bla...",
 *          "AUTRESCOMM": "BLAHHH"
 *       }
 *   }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.info Object containing customers information.
 * @apiSuccess {String} data.info.status Response status from Ogust.
 * @apiSuccess {Object} data.info.thirdPartyInformations Object containing customer third party information details.
 * @apiSuccess {Object} data.info.thirdPartyInformations.third_party Customer third party category.
 * @apiSuccess {Object} data.info.thirdPartyInformations.third_party_id Customer third party id.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values Object containing customer detailed info.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.NIVEAU Customer pathology.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.COMMNIV Customer pathology comment.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.DETAILEVE Customer intervention details.
 * @apiSuccess {Object} data.info.thirdPartyInformations.array_values.AUTRESCOMM Miscellaneous comments.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *       {
 *          "success": true,
 *          "message": "Informations tierces récupérées avec succès.",
 *          "data": {
 *              "info": {
 *                  "status": "OK",
 *                  "thirdPartyInformations": {
 *                      "third_party": "C",
 *                      "third_party_id": "506060990",
 *                      "array_values": {
 *                          "NIVEAU": "Alzheimer",
 *                          "COMMNIV": "",
 *                          "DETAILEVE": "Wi alizi sofvoba sem dergomape suvuca ve wiw seghifob iwucolcav am pumo. Mijve iffokem hes ni vipem la beuv rohov mo tejeon zidwihlo gaf ughibnu mo fuemakiv dupipiho pa. Iwo go medi sih ceemje buj fiopi avja akaud mun imanecoz caujalu jas kigu ik. Fon jobosbup cavgi igsej lepi pu awaleju uhuwusib docig fobnemtug cerwe okiejuhep re kinow tasul.",
 *                          "AUTRESCOMM": "Uk bi cohop zahabis gatpud rabafcur gewcace necva leufi lioveot uvuziela suvpize ul civazhi abisokse sangug hevucuti."
 *                      }
 *                  }
 *              }
 *          }
 *      }
 *
 * @apiUse thirdPartyInfoNotFoundError
 * @apiUse UnexpectedBehaviorError
 */
