/* API DOCUMENTATION for apidoc.js - Ogust - Employees */

/**
 * @api {get} /api/ogust/employees Get all employees
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getAll
 * @apiGroup Ogust_Employees
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} [status="A"] Employee status
 * @apiParam {String} [nature="S"] Employee nature
 * @apiParam {Number} [nbperpage=50] Number of records per page
 * @apiParam {Number} [pagenum=1] Page number
 *
 * @apiExample {http} Example usage:
 *    api/ogust/employees?status=A&nature=S
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data List of all employees from Ogust.
 * @apiSuccess {Object} data.users Object containing users information.
 * @apiSuccess {String} data.users.status Response status from Ogust.
 * @apiSuccess {Object} data.users.array_employee Object containing pagination options and list of all employees
 * @apiSuccess {Object} data.users.array_employee.pagination List of the paginations options
 * @apiSuccess {String} data.users.array_employee.pagination.count Total Number of records
 * @apiSuccess {String} data.users.array_employee.pagination.nbperpage Number of records per page
 * @apiSuccess {String} data.users.array_employee.pagination.pageNum Page number
 * @apiSuccess {Object} data.users.array_employee.result Object containing all the information about employees
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Utilisateurs trouvés avec succès.",
 *         "data": {
 *             "users": {
 *                 "status": "OK",
 *                 "array_employee": {
 *                     "pagination": {
 *                         "count": 2,
 *                         "nbperpage": 50,
 *                         "pagenum": 1
 *                     },
 *                     "result": {
 *                         "0": {
 *                             "id_employee": "903251483",
 *                             "mode": "0",
 *                             "number": "GY23049",
 *                             "nature": "S",
 *                             "create_date": "201606201116",
 *                             "creator": "036270229",
 *                             "title": "Mme",
 *                             "last_name": "Barker",
 *                             "maiden_name": null,
 *                             "first_name": "Lou",
 *                             "language": "fr-FR",
 *                             "rms_number": null,
 *                             "email": "lou.barker@gmail.com",
 *                             "landline": "",
 *                             "mobile_phone": "0601585520",
 *                             "fax": "",
 *                             "skype_id": "732902502001425",
 *                             "method_of_payment": "3580",
 *                             "accounting_account": null,
 *                             "status": "G",
 *                             "sector": "1m*",
 *                             "date_of_birth": "19800214",
 *                             "place_of_birth": "Paris",
 *                             "state_of_birth": "75",
 *                             "country_of_birth": "FR",
 *                             "nationality": "FR",
 *                             "family_situation": null,
 *                             "transport_pass": "O",
 *                             "transport_pass_cost": "50.30",
 *                             "driving_license": "N",
 *                             "means_of_transport": null,
 *                             "comment": "",
 *                             "intra_community_VAT": null,
 *                             "company_registration_number": null,
 *                             "legal_status": null,
 *                             "activity": null,
 *                             "manager": "522620130",
 *                             "social_insurance_number": "340026873502452",
 *                             "main_address": {
 *                                 "id_address": "370212493",
 *                                 "line": "117 RUE SAINT MICHEL",
 *                                 "supplement": "",
 *                                 "zip": "75006",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "4515613993074688",
 *                                 "third_party": "1"
 *                             },
 *                             "billing_address": {},
 *                             "secondary_address": {},
 *                             "picture": "http://te.uy/bobsala",
 *                             "bank_information": {
 *                                 "0": {
 *                                     "id_bankinfo": "4794984429518848",
 *                                     "id_tiers": "4904318450794496",
 *                                     "holder": "Lou Barker",
 *                                     "address": {
 *                                         "id_address": "1000092570429249",
 *                                         "line": "117 RUE SAINT MICHEL",
 *                                         "supplement": "",
 *                                         "zip": "75006",
 *                                         "city": "PARIS",
 *                                         "country": "FR",
 *                                         "type": "Azerty",
 *                                         "id_link": "1081677124206592",
 *                                         "third_party": "j"
 *                                     },
 *                                     "location": null,
 *                                     "name": null,
 *                                     "iban_number": "FR8830125976059904",
 *                                     "bic_number": "TNPDFRPXXX"
 *                                 }
 *                             },
 *                             "sepa_information": {}
 *                         },
 *                         "1": {
 *                             "id_employee": "903251483",
 *                             "mode": "0",
 *                             "number": "GY23049",
 *                             "nature": "S",
 *                             "create_date": "201606201116",
 *                             "creator": "036270229",
 *                             "title": "Mme",
 *                             "last_name": "Barker",
 *                             "maiden_name": null,
 *                             "first_name": "Lou",
 *                             "language": "fr-FR",
 *                             "rms_number": null,
 *                             "email": "lou.barker@gmail.com",
 *                             "landline": "",
 *                             "mobile_phone": "0601585520",
 *                             "fax": "",
 *                             "skype_id": "732902502001425",
 *                             "method_of_payment": "3580",
 *                             "accounting_account": null,
 *                             "status": "G",
 *                             "sector": "1m*",
 *                             "date_of_birth": "19800214",
 *                             "place_of_birth": "Paris",
 *                             "state_of_birth": "75",
 *                             "country_of_birth": "FR",
 *                             "nationality": "FR",
 *                             "family_situation": null,
 *                             "transport_pass": "O",
 *                             "transport_pass_cost": "50.30",
 *                             "driving_license": "N",
 *                             "means_of_transport": null,
 *                             "comment": "",
 *                             "intra_community_VAT": null,
 *                             "company_registration_number": null,
 *                             "legal_status": null,
 *                             "activity": null,
 *                             "manager": "522620130",
 *                             "social_insurance_number": "340026873502452",
 *                             "main_address": {
 *                                 "id_address": "370212493",
 *                                 "line": "117 RUE SAINT MICHEL",
 *                                 "supplement": "",
 *                                 "zip": "75006",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "4515613993074688",
 *                                 "third_party": "1"
 *                             },
 *                             "billing_address": {},
 *                             "secondary_address": {},
 *                             "picture": "http://te.uy/bobsala",
 *                             "bank_information": {
 *                                 "0": {
 *                                     "id_bankinfo": "4794984429518848",
 *                                     "id_tiers": "4904318450794496",
 *                                     "holder": "Lou Barker",
 *                                     "address": {
 *                                         "id_address": "1000092570429249",
 *                                         "line": "117 RUE SAINT MICHEL",
 *                                         "supplement": "",
 *                                         "zip": "75006",
 *                                         "city": "PARIS",
 *                                         "country": "FR",
 *                                         "type": "Azerty",
 *                                         "id_link": "1081677124206592",
 *                                         "third_party": "j"
 *                                     },
 *                                     "location": null,
 *                                     "name": null,
 *                                     "iban_number": "FR8830125976059904",
 *                                     "bic_number": "TNPDFRPXXX"
 *                                 }
 *                             },
 *                             "sepa_information": {}
 *                         }
 *                     }
 *                 }
 *             }
 *         }
 *      }
 *
 * @apiUse UserShowAllNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/ogust/employees/sector/:sector Get all employees by sector
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getAllBySector
 * @apiGroup Ogust_Employees
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} sector Ogust sector
 * @apiParam {String} [status="A"] Employee status
 * @apiParam {String} [nature="S"] Employee nature
 * @apiParam {String} [nbperpage="50"] Number of records per page
 * @apiParam {string} [pagenum="1"] Page number
 *
 * @apiExample {http} Example usage:
 *    api/ogust/sector/1b*?status=A&nature=S
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data List of all employees from Ogust.
 * @apiSuccess {Object} data.users Object containing users information.
 * @apiSuccess {String} data.users.status Response status from Ogust.
 * @apiSuccess {Object} data.users.array_employee Object containing pagination options and list of all employees.
 * @apiSuccess {Object} data.users.array_employee.pagination List of the paginations options.
 * @apiSuccess {Number} data.users.array_employee.pagination.count Total Number of records.
 * @apiSuccess {Number} data.users.array_employee.pagination.nbperpage Number of records per page.
 * @apiSuccess {Number} data.users.array_employee.pagination.pageNum Page number.
 * @apiSuccess {Object} data.users.array_employee.result Object containing all the information about employees.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Utilisateurs trouvés avec succès.",
 *         "data": {
 *             "users": {
 *                 "status": "OK",
 *                 "array_employee": {
 *                     "pagination": {
 *                         "count": 2,
 *                         "nbperpage": 50,
 *                         "pagenum": 1
 *                     },
 *                     "result": {
 *                         "0": {
 *                             "id_employee": "903251483",
 *                             "mode": "0",
 *                             "number": "GY23049",
 *                             "nature": "S",
 *                             "create_date": "201606201116",
 *                             "creator": "036270229",
 *                             "title": "Mme",
 *                             "last_name": "Barker",
 *                             "maiden_name": null,
 *                             "first_name": "Lou",
 *                             "language": "fr-FR",
 *                             "rms_number": null,
 *                             "email": "lou.barker@gmail.com",
 *                             "landline": "",
 *                             "mobile_phone": "0601585520",
 *                             "fax": "",
 *                             "skype_id": "732902502001425",
 *                             "method_of_payment": "3580",
 *                             "accounting_account": null,
 *                             "status": "G",
 *                             "sector": "1m*",
 *                             "date_of_birth": "19800214",
 *                             "place_of_birth": "Paris",
 *                             "state_of_birth": "75",
 *                             "country_of_birth": "FR",
 *                             "nationality": "FR",
 *                             "family_situation": null,
 *                             "transport_pass": "O",
 *                             "transport_pass_cost": "50.30",
 *                             "driving_license": "N",
 *                             "means_of_transport": null,
 *                             "comment": "",
 *                             "intra_community_VAT": null,
 *                             "company_registration_number": null,
 *                             "legal_status": null,
 *                             "activity": null,
 *                             "manager": "522620130",
 *                             "social_insurance_number": "340026873502452",
 *                             "main_address": {
 *                                 "id_address": "370212493",
 *                                 "line": "117 RUE SAINT MICHEL",
 *                                 "supplement": "",
 *                                 "zip": "75006",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "4515613993074688",
 *                                 "third_party": "1"
 *                             },
 *                             "billing_address": {},
 *                             "secondary_address": {},
 *                             "picture": "http://te.uy/bobsala",
 *                             "bank_information": {
 *                                 "0": {
 *                                     "id_bankinfo": "4794984429518848",
 *                                     "id_tiers": "4904318450794496",
 *                                     "holder": "Lou Barker",
 *                                     "address": {
 *                                         "id_address": "1000092570429249",
 *                                         "line": "117 RUE SAINT MICHEL",
 *                                         "supplement": "",
 *                                         "zip": "75006",
 *                                         "city": "PARIS",
 *                                         "country": "FR",
 *                                         "type": "Azerty",
 *                                         "id_link": "1081677124206592",
 *                                         "third_party": "j"
 *                                     },
 *                                     "location": null,
 *                                     "name": null,
 *                                     "iban_number": "FR8830125976059904",
 *                                     "bic_number": "TNPDFRPXXX"
 *                                 }
 *                             },
 *                             "sepa_information": {}
 *                         },
 *                         "1": {
 *                             "id_employee": "903251483",
 *                             "mode": "0",
 *                             "number": "GY23049",
 *                             "nature": "S",
 *                             "create_date": "201606201116",
 *                             "creator": "036270229",
 *                             "title": "Mme",
 *                             "last_name": "Barker",
 *                             "maiden_name": null,
 *                             "first_name": "Lou",
 *                             "language": "fr-FR",
 *                             "rms_number": null,
 *                             "email": "lou.barker@gmail.com",
 *                             "landline": "",
 *                             "mobile_phone": "0601585520",
 *                             "fax": "",
 *                             "skype_id": "732902502001425",
 *                             "method_of_payment": "3580",
 *                             "accounting_account": null,
 *                             "status": "G",
 *                             "sector": "1m*",
 *                             "date_of_birth": "19800214",
 *                             "place_of_birth": "Paris",
 *                             "state_of_birth": "75",
 *                             "country_of_birth": "FR",
 *                             "nationality": "FR",
 *                             "family_situation": null,
 *                             "transport_pass": "O",
 *                             "transport_pass_cost": "50.30",
 *                             "driving_license": "N",
 *                             "means_of_transport": null,
 *                             "comment": "",
 *                             "intra_community_VAT": null,
 *                             "company_registration_number": null,
 *                             "legal_status": null,
 *                             "activity": null,
 *                             "manager": "522620130",
 *                             "social_insurance_number": "340026873502452",
 *                             "main_address": {
 *                                 "id_address": "370212493",
 *                                 "line": "117 RUE SAINT MICHEL",
 *                                 "supplement": "",
 *                                 "zip": "75006",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "4515613993074688",
 *                                 "third_party": "1"
 *                             },
 *                             "billing_address": {},
 *                             "secondary_address": {},
 *                             "picture": "http://te.uy/bobsala",
 *                             "bank_information": {
 *                                 "0": {
 *                                     "id_bankinfo": "4794984429518848",
 *                                     "id_tiers": "4904318450794496",
 *                                     "holder": "Lou Barker",
 *                                     "address": {
 *                                         "id_address": "1000092570429249",
 *                                         "line": "117 RUE SAINT MICHEL",
 *                                         "supplement": "",
 *                                         "zip": "75006",
 *                                         "city": "PARIS",
 *                                         "country": "FR",
 *                                         "type": "Azerty",
 *                                         "id_link": "1081677124206592",
 *                                         "third_party": "j"
 *                                     },
 *                                     "location": null,
 *                                     "name": null,
 *                                     "iban_number": "FR8830125976059904",
 *                                     "bic_number": "TNPDFRPXXX"
 *                                 }
 *                             },
 *                             "sepa_information": {}
 *                         }
 *                     }
 *                 }
 *             }
 *         }
 *      }
 *
 * @apiUse MissingParametersError
 * @apiUse UserShowAllNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/ogust/employees/:id Get an employee by its id
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getById
 * @apiGroup Ogust_Employees
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
 * @apiParam {String} [status="A"] Employee status
 *
 * @apiExample {http} Example usage:
 *    api/ogust/employees/485739287
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data Employee info from Ogust.
 * @apiSuccess {Object} data.user
 * @apiSuccess {String} data.user.status Response status from Ogust.
 * @apiSuccess {Object} data.user.employee Object containing employee information.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Utilisateur trouvé avec succès.",
 *         "data": {
 *             "user": {
 *                 "status": "OK",
 *                 "employee": {
 *                     "id_employee": "5289342947819520",
 *                     "mode": "0",
 *                     "number": "4G80705",
 *                     "nature": "S",
 *                     "create_date": "2061-12-16T19:13:26.202Z",
 *                     "creator": "3737525420032000",
 *                     "title": "M.",
 *                     "last_name": "Jackson",
 *                     "maiden_name": null,
 *                     "first_name": "Daniel",
 *                     "language": "fr-FR",
 *                     "rms_number": null,
 *                     "email": "hu@gokim.jp",
 *                     "landline": "",
 *                     "mobile_phone": "0634567809",
 *                     "fax": "",
 *                     "skype_id": "3260374914695168",
 *                     "method_of_payment": "9310",
 *                     "accounting_account": null,
 *                     "status": "A",
 *                     "sector": "1m*",
 *                     "date_of_birth": "19650721",
 *                     "place_of_birth": "Hanvuvop",
 *                     "state_of_birth": "99",
 *                     "country_of_birth": "DV",
 *                     "nationality": "DV",
 *                     "family_situation": null,
 *                     "transport_pass": "O",
 *                     "transport_pass_cost": "58.50",
 *                     "driving_license": "N",
 *                     "means_of_transport": null,
 *                     "comment": "",
 *                     "intra_community_VAT": null,
 *                     "company_registration_number": null,
 *                     "legal_status": null,
 *                     "activity": null,
 *                     "manager": "7084649138356224",
 *                     "social_insurance_number": "7780013447315456",
 *                     "main_address": {
 *                         "id_address": "3354150486147072",
 *                         "line": "467 Cuzip Loop",
 *                         "supplement": "",
 *                         "zip": "75009",
 *                         "city": "PARIS",
 *                         "country": "FR",
 *                         "type": "Azerty",
 *                         "id_link": "2386597918015488",
 *                         "third_party": "I"
 *                     },
 *                     "billing_address": {},
 *                     "secondary_address": {},
 *                     "picture": "http://nukes.lt/guzfuf",
 *                     "bank_information": {
 *                         "0": {
 *                             "id_bankinfo": "7640541558734848",
 *                             "id_tiers": "5273630768365568",
 *                             "holder": "Susie Aguilar",
 *                             "address": {
 *                                 "id_address": "249679105",
 *                                 "line": "467 Cuzip Loop",
 *                                 "supplement": "",
 *                                 "zip": "75009",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "2386597918015488",
 *                                 "third_party": "I"
 *                             },
 *                             "location": null,
 *                             "name": null,
 *                             "iban_number": "FR4703480956583936",
 *                             "bic_number": "FREDFRDDXXX"
 *                         }
 *                     },
 *                     "sepa_information": {}
 *                 }
 *             }
 *         }
 *     }
 *
 * @apiUse UserNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/ogust/employees/:id/services Get services by employee
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getEmployeeServices
 * @apiGroup Ogust_Employees
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
 *    api/ogust/employees/485739287/services?isDate=true&startDate=201708040000&endDate=201708040000
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
 * @apiSuccess {Object} data.servicesRaw.array_service Object containing pagination options and list of services for an employee.
 * @apiSuccess {Object} data.servicesRaw.array_service.pagination List of the paginations options.
 * @apiSuccess {Number} data.servicesRaw.array_service.pagination.count Total Number of records.
 * @apiSuccess {String} data.servicesRaw.array_service.pagination.nbperpage Number of records per page.
 * @apiSuccess {String} data.servicesRaw.array_service.pagination.pageNum Page number.
 * @apiSuccess {Object} data.servicesRaw.array_service.result Object containing all the services about an employee within range or date specified.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
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
 * @apiUse ServiceNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/ogust/employees/:id/customers Get customers of an employee
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getEmployeeCustomers
 * @apiGroup Ogust_Employees
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
 *
 * @apiExample {http} Example usage:
 *    api/ogust/employees/573839209/customers
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object[]} data.customers Array containing the list of all customers of an employee
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Utilisateurs trouvés avec succès.",
 *         "data": {
 *             "customers": [
 *                 {
 *                     "id_customer": "647205421",
 *                     "mode": "0",
 *                     "code": "CLI13840",
 *                     "type": "C",
 *                     "title": "Mme et M.",
 *                     "last_name": "Rice",
 *                     "maiden_name": null,
 *                     "first_name": null,
 *                     "language": "fr-FR",
 *                     "rms_number": null,
 *                     "status": "A",
 *                     "email": "dizmi@azusa.cx",
 *                     "landline": "0710928450",
 *                     "mobile_phone": "0716310150",
 *                     "fax": null,
 *                     "skype_id": null,
 *                     "origin": "540224",
 *                     "method_of_payment": "072599",
 *                     "door_code": "2073",
 *                     "urssaf_code": null,
 *                     "social_insurance_number": null,
 *                     "intercom_code": null,
 *                     "allocation_number": null,
 *                     "caf_attached": null,
 *                     "accounting_account": "581VNR9",
 *                     "sector": "1m*",
 *                     "date_of_birth": null,
 *                     "place_of_birth": null,
 *                     "comment": "Is bed rejcoppor zegurtij moga kimiplu pisigun etpejje zottadise om kukdu zojibmo buelucec siphi vadfun jeno.",
 *                     "intra_community_VAT": null,
 *                     "company_registration_number": null,
 *                     "legal_status": null,
 *                     "activity": null,
 *                     "manager": "502427119",
 *                     "creator": "502427119",
 *                     "main_address": {
 *                         "id_address": "2387880678",
 *                         "line": "1004 Lopof Trail",
 *                         "supplement": "",
 *                         "zip": "75014",
 *                         "city": "PARIS",
 *                         "country": "FR",
 *                         "type": "Azerty",
 *                         "id_link": "7846539",
 *                         "third_party": "C"
 *                     },
 *                     "billing_address": {},
 *                     "secondary_address": {},
 *                     "bank_information": {
 *                         "0": {
 *                             "id_bankinfo": "290543052",
 *                             "id_tiers": "7846539",
 *                             "holder": "COUPRIE",
 *                             "address": {
 *                                 "id_address": "2387880678",
 *                                 "line": "1004 Lopof Trail",
 *                                 "supplement": "",
 *                                 "zip": "75014",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "7846539",
 *                                 "third_party": "C"
 *                             },
 *                             "location": null,
 *                             "name": null,
 *                             "iban_number": "FR764607461564612608",
 *                             "bic_number": "BCJIFRBP031"
 *                         }
 *                     },
 *                     "sepa_information": {
 *                         "0": {
 *                             "id_sepainfo": "2822485414248448",
 *                             "id_tiers": ""7846539,
 *                             "society": "237480",
 *                             "ics": "FR99CGL80B4BA - DOME",
 *                             "rum": "R2724579283828736-1",
 *                             "signature_date": "20170715",
 *                             "print_url": "",
 *                             "signature_url": null
 *                         }
 *                     }
 *                 },
 *                 {
 *                     "id_customer": "647205421",
 *                     "mode": "0",
 *                     "code": "CLI13840",
 *                     "type": "C",
 *                     "title": "Mme et M.",
 *                     "last_name": "Rice",
 *                     "maiden_name": null,
 *                     "first_name": null,
 *                     "language": "fr-FR",
 *                     "rms_number": null,
 *                     "status": "A",
 *                     "email": "dizmi@azusa.cx",
 *                     "landline": "0710928450",
 *                     "mobile_phone": "0716310150",
 *                     "fax": null,
 *                     "skype_id": null,
 *                     "origin": "540224",
 *                     "method_of_payment": "072599",
 *                     "door_code": "2073",
 *                     "urssaf_code": null,
 *                     "social_insurance_number": null,
 *                     "intercom_code": null,
 *                     "allocation_number": null,
 *                     "caf_attached": null,
 *                     "accounting_account": "581VNR9",
 *                     "sector": "1m*",
 *                     "date_of_birth": null,
 *                     "place_of_birth": null,
 *                     "comment": "Is bed rejcoppor zegurtij moga kimiplu pisigun etpejje zottadise om kukdu zojibmo buelucec siphi vadfun jeno.",
 *                     "intra_community_VAT": null,
 *                     "company_registration_number": null,
 *                     "legal_status": null,
 *                     "activity": null,
 *                     "manager": "502427119",
 *                     "creator": "502427119",
 *                     "main_address": {
 *                         "id_address": "2387880678",
 *                         "line": "1004 Lopof Trail",
 *                         "supplement": "",
 *                         "zip": "75014",
 *                         "city": "PARIS",
 *                         "country": "FR",
 *                         "type": "Azerty",
 *                         "id_link": "7846539",
 *                         "third_party": "C"
 *                     },
 *                     "billing_address": {},
 *                     "secondary_address": {},
 *                     "bank_information": {
 *                         "0": {
 *                             "id_bankinfo": "290543052",
 *                             "id_tiers": "7846539",
 *                             "holder": "COUPRIE",
 *                             "address": {
 *                                 "id_address": "2387880678",
 *                                 "line": "1004 Lopof Trail",
 *                                 "supplement": "",
 *                                 "zip": "75014",
 *                                 "city": "PARIS",
 *                                 "country": "FR",
 *                                 "type": "Azerty",
 *                                 "id_link": "7846539",
 *                                 "third_party": "C"
 *                             },
 *                             "location": null,
 *                             "name": null,
 *                             "iban_number": "FR764607461564612608",
 *                             "bic_number": "BCJIFRBP031"
 *                         }
 *                     },
 *                     "sepa_information": {
 *                         "0": {
 *                             "id_sepainfo": "2822485414248448",
 *                             "id_tiers": ""7846539,
 *                             "society": "237480",
 *                             "ics": "FR99CGL80B4BA - DOME",
 *                             "rum": "R2724579283828736-1",
 *                             "signature_date": "20170715",
 *                             "print_url": "",
 *                             "signature_url": null
 *                         }
 *                     }
 *                 }
 *             ]
 *         }
 *     }
 *
 * @apiUse MissingParametersError
 * @apiUse ServicesNotFoundError
 * @apiUse UnexpectedBehaviorError
 */

/**
 * @api {get} /api/ogust/employees/:id/salaries Get salaries of an employee
 * @apiVersion 1.0.0
 * @apiPermission Ogust
 * @apiName getEmployeeSalaries
 * @apiGroup Ogust_Employees
 *
 * @apiHeader {String} x-ogust-token User token from Ogust
 *
 * @apiParam {String} id Unique id of the employee
 *
 *
 * @apiExample {http} Example usage:
 *    api/ogust/employees/573839209/salaries
 *    // header
 *    {
 *       "x-ogust-token": "2432E10TLL4A0S8WWXPLB8K91LF28370K3E61V88"
 *    }
 *
 * @apiSuccess {Boolean} success Return true on success.
 * @apiSuccess {String} message Human readable message to display for clients.
 * @apiSuccess {Object} data
 * @apiSuccess {Object} data.salaries Object containing salaries information.
 * @apiSuccess {String} data.salaries.status Response status from Ogust.
 * @apiSuccess {Object} data.salaries.array_salary Object containing pagination options and the salaries list of an employee.
 * @apiSuccess {Object} data.salaries.array_salary.pagination List of the paginations options.
 * @apiSuccess {Number} data.salaries.array_salary.pagination.count Total Number of records.
 * @apiSuccess {String} data.salaries.array_salary.pagination.nbperpage Number of records per page.
 * @apiSuccess {String} data.salaries.array_salary.pagination.pageNum Page number.
 * @apiSuccess {Object} data.salaries.array_salary.result Object containing the salaries list for the employee and its detailed information.
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *      {
 *         "success": true,
 *         "message": "Bulletins de salaire de l'employé trouvés avec succès.",
 *         "data": {
 *             "salaries": {
 *                 "status": "OK",
 *                 "array_salary": {
 *                     "pagination": {
 *                         "count": 2,
 *                         "nbperpage": "24",
 *                         "pagenum": "1"
 *                     },
 *                     "result": {
 *                         "0": {
 *                             "id_salary": "457032010",
 *                             "status": "V",
 *                             "id_employee": "570676115",
 *                             "reference": "G07",
 *                             "mode": "Prestataire",
 *                             "id_customer": "0",
 *                             "creation_date": "20151227",
 *                             "period_start": "201610010000",
 *                             "period_end": "201610312400",
 *                             "number_hours": "45.00000",
 *                             "clear_taxable": "635.46",
 *                             "net_amount": "580.36",
 *                             "employee_costs": "256.90",
 *                             "agence_costs": "232.98",
 *                             "society": "364172",
 *                             "associated_amount": null,
 *                             "search_start": null,
 *                             "search_end": null,
 *                             "print_url": "http://eggibwav.id/tomeggi"
 *                         },
 *                         "1": {
 *                             "id_salary": "457032010",
 *                             "status": "V",
 *                             "id_employee": "570676115",
 *                             "reference": "G07",
 *                             "mode": "Prestataire",
 *                             "id_customer": "0",
 *                             "creation_date": "20151227",
 *                             "period_start": "201610010000",
 *                             "period_end": "201610312400",
 *                             "number_hours": "45.00000",
 *                             "clear_taxable": "635.46",
 *                             "net_amount": "580.36",
 *                             "employee_costs": "256.90",
 *                             "agence_costs": "232.98",
 *                             "society": "364172",
 *                             "associated_amount": null,
 *                             "search_start": null,
 *                             "search_end": null,
 *                             "print_url": "http://eggibwav.id/tomeggi"
 *                         }
 *                     }
 *                 }
 *             }
 *         }
 *      }
 *
 * @apiUse MissingParametersError
 * @apiUse SalariesNotFoundError
 * @apiUse UnexpectedBehaviorError
 */
