module.exports = {
  language: 'fr-FR',
  'en-EN': {
    /* Global errors */
    unexpectedBehavior: 'Unexpected behavior.',
    /* Token errors */
    tokenAuthFailed: 'Failed to authenticate token.',
    tokenExpired: 'Token is expired.',
    tokenNotFound: 'Please provide a token.',
    /* Users strings */
    usersNotFound: 'There are no users.',
    userNotFound: 'User doesn\'t exist.',
    userEmailExists: 'This email is already taken by another user.',
    invalidEmail: 'Email is not valid.',
    userFound: 'User found successfully.',
    usersFound: 'Users found successfully.',
    userSaved: 'User saved successfully.',
    userRemoved: 'User removed successfully.',
    userUpdated: 'User updated successfully.',
    userAuthFailed: 'The email address or password you entered is not valid.',
    forbidden: 'Forbidden.',
    userAuthentified: 'User authenticated successfully.',
    userLogout: 'User disconnected successfully.',
    userRoleConflict: 'User already has a role on this interface.',
    /* Rss feeds */
    blogGetRssFeedsOk: 'Rss feed found.',
    /* Api */
    apiVersionUpToDate: 'api version up to date.',
    apiVersionToUpdate: 'api version must be updated.',
    /* Messages */
    getAllMessagesFound: 'Messages found successfully.',
    getAllMessagesNotFound: 'Messages not found.',
    messageNotFound: 'Message not found.',
    storeMessage: 'Message successfully stored.',
    messageRecipientAdded: 'Message recipient added successfully.',
    /* SMS */
    smsNotSent: 'SMS not sent.',
    smsSent: 'SMS well sent.',
    smsFound: 'SMS found.',
    /* Role */
    rolesNotFound: 'Roles not found.',
    rolesFound: 'Roles found.',
    unknownRole: 'Role does not exist.',
    /* Email */
    emailSent: 'Email successfully sent.',
    emailNotSent: 'An error occurred while sending the email.',
    /* Reset password token */
    resetPasswordTokenFound: 'Reset password token found.',
    resetPasswordTokenNotFound: 'Reset password token not found.',
    /* Uploader */
    fileNotFound: 'File not found.',
    filesNotFound: 'Files not found.',
    fileFound: 'File found.',
    filesFound: 'Files found.',
    fileDeleted: 'File Deleted.',
    folderCreated: 'Folder successfully created.',
    folderCreationFailure: 'Folder creation Failed.',
    fileCreated: 'File successfully created.',
    uploadNotAllowed: 'Upload not allowed.',
    /* Company */
    companyCreated: 'Company created.',
    companiesFound: 'Companies found.',
    companyFound: 'Company found.',
    companyNotFound: 'Company not found.',
    companyExists: 'Company already exists.',
    companyLinkRequestCreated: 'Company link request created.',
    companyLinkRequestsFound: 'Company link requests found.',
    companyLinkRequestDeleted: 'Company link request deleted.',
    companyInternalHourCreated: 'Company internal hour created.',
    companyInternalHourNotFound: 'Company internal hour not found.',
    companyInternalHoursNotFound: 'Company internal hours not found.',
    companyInternalHoursFound: 'Company internal hours found.',
    companyInternalHourRemoved: 'Company internal hour removed.',
    companyInternalHourCreationNotAllowed: 'Company internal hour creation not allowed.',
    companyInternalHourDeletionNotAllowed: 'Company internal hour deletion not allowed.',
    companyFirstInterventionFound: 'Company first intervention found.',
    companyFirstInterventionNotFound: 'Company first intervention not found.',
    administrativeDocumentNotFound: 'Administrative document not found.',
    administrativeDocumentFound: 'Administrative documents found.',
    administrativeDocumentCreated: 'Administrative documents found.',
    administrativeDocumentRemoved: 'Administrative documents removed.',
    /* Contracts */
    contractsFound: 'Contracts found.',
    contractsNotFound: 'Contracts not found.',
    contractUpdated: 'Contract updated.',
    contractAdded: 'Contract added.',
    contractRemoved: 'Contract removed.',
    staffRegisteredFound: 'Staff Registered Found.',
    contractHasTimeStampedEventAfterEndDate: 'There are timestamped events after the end date of the contract.',
    contractEndDateBeforeStartDate: 'End date is before last version start date.',
    contractHasBilledEventAfterEndDate: 'There are billed events after contract end date.',
    /* Contracts amendments */
    contractVersionAdded: 'Contract amendment added.',
    contractVersionRemoved: 'Contract amendment removed.',
    contractVersionUpdated: 'Contract amendment updated.',
    /* Customers */
    customersFound: 'Customers found.',
    customerFound: 'Customer found.',
    customersNotFound: 'Customers not found.',
    customerNotFound: 'Customer not found.',
    customerCreated: 'Customer created.',
    customerUpdated: 'Customer updated.',
    customerRemoved: 'Customer removed.',
    customerSubscriptionAdded: 'Customer subscription added.',
    customerSubscriptionUpdated: 'Customer subscription updated.',
    customerSubscriptionRemoved: 'Customer subscription removed.',
    customerSubscriptionDeletionForbidden: 'Customer subscription deletion forbidden.',
    serviceAlreadySubscribed: 'Service already subscribed.',
    customerMandateUpdated: 'Customer mandate updated.',
    customerMandatesFound: 'Customer mandates found.',
    customerQuotesFound: 'Customer quotes found.',
    customerQuoteAdded: 'Customer quote added.',
    signedDocumentSaved: 'Signed document saved.',
    customerSubscriptionHistoryAdded: 'Customer subscription history added.',
    customerFundingConflict: 'Subscription is already used by another funding.',
    customerFundingCreated: 'Customer funding created.',
    customerFundingUpdated: 'Customer funding updated.',
    customerFundingRemoved: 'Customer funding removed.',
    qrCodeCreated: 'QR code created.',
    archivingNotAllowed: 'Archiving not allowed : customer has non-billed interventions.',
    archivingNotAllowedBeforeStoppingDate: 'Archiving not allowed before stopping date.',
    customerIsAbsent: 'Customer is absent at this date.',
    /* Customer absence */
    stoppedCustomer: 'Can\'t create an absence on a period where customer is stopped.',
    customerAlreadyAbsent: 'Customer absence already exists on this period.',
    customerAbsenceCreated: 'Customer absence created.',
    endDateBeforeStartDate: 'End date must be later than start date.',
    /* Customer notes */
    customerNoteCreated: 'Customer note created.',
    customerNotesFound: 'Customer notes found.',
    customerNotesNotFound: 'Customer notes not found.',
    customerNoteUpdated: 'Customer note updated.',
    /* ESign */
    signatureRequestCreated: 'Signature request created.',
    documentNotFound: 'Eversign document not found.',
    documentFound: 'Eversign document found.',
    /* Google drive */
    googleDriveFolderCreationFailed: 'Google drive folder creation failed.',
    googleDriveFolderNotFound: 'Google drive folder not found.',
    googleDriveFileNotFound: 'Google drive file not found.',
    /* Events */
    eventsNotFound: 'Events not found.',
    eventNotFound: 'Event not found.',
    eventsFound: 'Events found.',
    eventCreated: 'Event created.',
    eventUpdated: 'Event updated.',
    eventDeleted: 'Event deleted.',
    eventsDeleted: 'Events deleted.',
    eventDatesNotOnSameDay: 'Start and end dates should be on the same day.',
    eventsConflict: 'Events in conflict.',
    eventTimeStamped: 'Event timestamped.',
    alreadyTimeStamped: 'The event is already timestamped.',
    timeStampConflict: 'The timestamp is in conflict with an event.',
    timeStampOtherConflict: 'Timestamp error. Contact technical support.',
    timeStampTooLate: 'Can\'t timestamp startDate after event ends.',
    timeStampTooEarly: 'Can\'t timestamp endDate before event starts.',
    isBilled: 'You can not delete a billed event.',
    isTimeStamped: 'You can not delete a timestamped event.',
    timeStampCancelledEvent: 'Can\'t timestamp a cancelled event.',
    /* Repetitions */
    invalidRepetition: 'Forbidden action : Invalid repetition.',
    /* Sectors */
    sectorCreated: 'Sector created.',
    sectorUpdated: 'Sector updated.',
    sectorNotFound: 'Sector not found.',
    sectorsFound: 'Sectors found.',
    sectorDeleted: 'Sector deleted.',
    sectorAlreadyExists: 'Sector already exists.',
    /* Services */
    servicesFound: 'Services found.',
    serviceCreated: 'Service created.',
    serviceDeleted: 'Service deleted.',
    servicesNotFound: 'Services not found.',
    serviceNotFound: 'Service not found.',
    servicesUpdated: 'Services updated.',
    /* Surcharges */
    surchargesFound: 'Surcharges found.',
    surchargeCreated: 'Surcharge created.',
    surchargeDeleted: 'Surcharge deleted.',
    surchargeNotFound: 'Surcharge not found.',
    surchargeUpdated: 'Surcharge updated.',
    /* Third party payers */
    thirdPartyPayerCreated: 'Company third party payer created.',
    thirdPartyPayersFound: 'Company third party payers found.',
    thirdPartyPayersNotFound: 'Company third party payers not found.',
    thirdPartyPayerUpdated: 'Company third party payer updated.',
    thirdPartyPayerDeleted: 'Company third party payer deleted.',
    /* Bills */
    billsCreated: 'Bills created.',
    billCreated: 'Bill created.',
    draftBillsCreated: 'Draft bills created.',
    billsFound: 'Bills found.',
    billNotCompani: 'Bill\'s origin must be \'Compani\'.',
    /* Credit Notes */
    creditNotesFound: 'Credit notes found.',
    creditNoteCreated: 'Credit note found.',
    creditNoteDeleted: 'Credit note deleted.',
    creditNotesNotFound: 'Credit notes not found.',
    creditNoteNotFound: 'Credit note not found.',
    creditNoteUpdated: 'Credit note updated.',
    creditNoteNotCompani: 'Credit note\'s origin must be \'Compani\'.',
    /* Balances */
    balancesFound: 'Balances found.',
    /* Payments */
    paymentsFound: 'Payments found.',
    paymentsNotFound: 'Payments not found.',
    paymentNotFound: 'Payment not found.',
    paymentCreated: 'Payment created.',
    paymentUpated: 'Payment updated.',
    paymentRemoved: 'Payment removed.',
    /* Pay */
    payListCreated: 'Pay list created.',
    hoursToWorkFound: 'Hours to work found.',
    /* Final pay */
    finalPayListCreated: 'Final pay list created.',
    /* Event history */
    eventHistoriesFound: 'Event histories found.',
    eventHistoryUpdated: 'Event history updated.',
    /* Pay documents */
    payDocumentCreated: 'Pay document created.',
    payDocumentsFound: 'Pay documents found.',
    payDocumentsNotFound: 'Pay documents not found.',
    payDocumentNotFound: 'Pay document not found.',
    payDocumentDeleted: 'Pay document deleted.',
    /* Stats */
    statsFound: 'Stats found.',
    statsNotFound: 'Stats not found.',
    /* Sector history */
    sectorHistoryNotFound: 'Sector history not found.',
    /* Bill slip */
    billSlipsFound: 'Bill slips found.',
    /* Tax certificates */
    taxCertificatesNotFound: 'Tax certificates not found.',
    taxCertificateNotFound: 'Tax certificate not found.',
    taxCertificatesFound: 'Tax certificates found.',
    taxCertificateCreated: 'Tax certificate created.',
    /* Establishments */
    establishmentCreated: 'Establishment created.',
    establishmentNotFound: 'Establishment not found.',
    establishmentsFound: 'Establishments found.',
    establishmentRemoved: 'Establishment removed.',
    siretAlreadyExists: 'Siret already used by another establishment.',
    /* Programs */
    programsFound: 'Programs found.',
    programsNotFound: 'Programs not found.',
    programCreated: 'Program created.',
    programFound: 'Program found.',
    programUpdated: 'Program updated.',
    testerAdded: 'Tester added to program.',
    testerRemoved: 'Tester removed from program.',
    testerNotFound: 'Tester not found in program.',
    testerConflict: 'Tester already added to program.',
    /* Categories */
    categoriesFound: 'Categories found.',
    categoriesNotFound: 'Categories not found.',
    categoryCreated: 'Category created.',
    categoryUpdated: 'Category updated.',
    categoryDeleted: 'Category deleted.',
    categoryAdded: 'Category added.',
    categoryRemoved: 'Category removed.',
    /* SubPrograms */
    subProgramsFound: 'Sub-programs found.',
    subProgramFound: 'Sub-program found.',
    subProgramsNotFound: 'Sub-programs not found.',
    subProgramUpdated: 'Sub-program updated.',
    eLearningSubProgramAlreadyExists: 'A published eLearning sub-program already exists.',
    /* Steps */
    stepUpdated: 'Step updated.',
    stepsFound: 'Steps found.',
    /* Activities */
    activityFound: 'Activity found.',
    activityUpdated: 'Activity updated.',
    activityDetached: 'Activity detached.',
    /* Cards */
    cardUpdated: 'Card updated.',
    cardDeleted: 'Card deleted.',
    /* Courses */
    coursesFound: 'Courses found.',
    courseHistoriesFound: 'Course histories found.',
    coursesNotFound: 'Courses not found.',
    courseHistoriesNotFound: 'Course histories not found.',
    courseCreated: 'Course created.',
    courseFound: 'Course found.',
    courseUpdated: 'Course updated.',
    courseDeleted: 'Course deleted.',
    courseTraineeAdded: 'Course trainee added.',
    courseTraineeRemoved: 'Course trainee removed.',
    courseTraineeAlreadyExists: 'Course trainee already added to course.',
    courseTraineeNotFromCourseCompany: 'Course trainee not connected to course company.',
    courseAccessRuleAdded: 'Access rule added.',
    courseAccessRuleDeleted: 'Access rule deleted.',
    courseQuestionnairesFound: 'Questionnaires found.',
    courseAttendanceNotGenerated: 'Failed to download attendance sheet, no on-site slot.',
    /* Course slots */
    courseSlotCreated: 'Course slot created.',
    courseSlotUpdated: 'Course slot updated.',
    courseSlotDeleted: 'Course slot deleted.',
    courseSlotNotFound: 'Course slot not found.',
    courseSlotConflict: 'Course slot in conflict.',
    /* Activities */
    activityHistoryCreated: 'Activity history created.',
    activityHistoriesFound: 'Activity histories found.',
    /* AttendanceSheets */
    attendanceSheetCreated: 'AttendanceSheet created.',
    attendanceSheetsFound: 'AttendanceSheets found.',
    attendanceSheetsNotFound: 'AttendanceSheets not found.',
    attendanceSheetDeleted: 'AttendanceSheet deleted.',
    /* Attendances */
    attendanceCreated: 'Attendance created.',
    attendancesFound: 'Attendances found.',
    attendancesNotFound: 'Attendances not found.',
    attendanceDeleted: 'Attendance deleted.',
    attendanceExists: 'An attendance exists.',
    /* Questionnaires */
    questionnairesFound: 'Questionnaires found.',
    questionnairesNotFound: 'Questionnaires not found.',
    questionnaireCreated: 'Questionnaire created.',
    questionnaireFound: 'Questionnaire found.',
    draftQuestionnaireAlreadyExists: 'A draft questionnaire with this type already exists.',
    publishedQuestionnaireWithSameTypeExists: 'A questionnaire with the same type is already published.',
    questionnaireUpdated: 'questionnaire updated.',
    questionnaireHistoryCreated: 'Questionnaire history created.',
    /* PartnerOrganization */
    partnerOrganizationCreated: 'Partner organization created.',
    partnerOrganizationAlreadyExists: 'A partner organization already exists.',
    partnerOrganizationsFound: 'Partner organizations found.',
    partnerOrganizationFound: 'Partner organization found.',
    partnerOrganizationUpdated: 'Partner organization updated.',
    partnerCreated: 'Partner created.',
    partnersFound: 'Partners found.',
    partnersNotFound: 'Partners not found.',
    partnerUpdated: 'Partner updated.',
    /* Helper */
    helpersFound: 'Helpers found.',
    helpersNotFound: 'Helpers not found.',
    helperUpdated: 'Helper updated.',
    /* CustomerPartners */
    customerPartnerCreated: 'Customer partner created.',
    customerPartnersFound: 'Customer partners found.',
    customerPartnersNotFound: 'Customer partners not found.',
    customerPartnerAlreadyExists: 'Customer partner already exists.',
    customerPartnerUpdated: 'Customer partner updated.',
    customerPartnerRemoved: 'Customer partner removed.',
    /* BillingItems */
    billingItemCreated: 'Billing item created.',
    billingItemsFound: 'Billing items found.',
    billingItemsConflict: 'This billing item already exists.',
    billingItemRemoved: 'Billing item removed.',
    billingItemHasServiceLinked: 'Billing item is linked to a service.',
    billingItemHasBillLinked: 'Billing item is linked to a bill.',
    /* Télétransmission */
    deliveryCreated: 'Delivery file created',
  },
  'fr-FR': {
    /* Global errors */
    unexpectedBehavior: 'Comportement inattendu.',
    /* Token errors */
    tokenAuthFailed: 'Impossible d\'authentifier le token.',
    tokenExpired: 'Le token a expiré.',
    tokenNotFound: 'Merci de fournir un token.',
    /* Users strings */
    usersNotFound: 'Il n\'y a aucun compte.',
    userNotFound: 'Le compte n\'existe pas.',
    userEmailExists: 'Cet email est déjà pris par un autre compte.',
    invalidEmail: 'L\'email n\'est pas valide.',
    userSaved: 'Compte enregistré avec succès.',
    usersFound: 'Comptes trouvés avec succès.',
    userFound: 'Compte trouvé avec succès.',
    userRemoved: 'Compte supprimé avec succès.',
    userUpdated: 'Compte modifié avec succès.',
    userAuthFailed: 'L\'adresse email ou le mot de passe est invalide.',
    forbidden: 'Accès non autorisé.',
    userAuthentified: 'Compte authentifié avec succès.',
    userLogout: 'Compte déconnecté avec succès.',
    userRoleConflict: 'Ce compte a déjà un rôle sur cette interface.',
    /* Rss feeds */
    blogGetRssFeedsOk: 'Flux Rss trouvé avec succès.',
    /* Api */
    apiVersionUpToDate: 'La version de l\'api est à jour.',
    apiVersionToUpdate: 'La version de l\'api doit être mis à jour.',
    /* Messages */
    getAllMessagesFound: 'Messages trouvés avec succès.',
    getAllMessagesNotFound: 'Pas de messages.',
    messageNotFound: 'Message non trouvé.',
    storeMessage: 'Message enregistré avec succès.',
    messageRecipientUpdated: 'Destinataire message ajouté avec succès.',
    /* SMS */
    smsNotSent: 'SMS non envoyé.',
    smsSent: 'SMS bien envoyé.',
    smsFound: 'SMS trouvés.',
    /* Role */
    rolesNotFound: 'Rôles non trouvés.',
    rolesFound: 'Rôles trouvés.',
    unknownRole: 'Le rôle n\'existe pas.',
    /* Email */
    emailSent: 'Email envoyé avec succès.',
    emailNotSent: 'Erreur lors de l\'envoi de l\'email.',
    /* Reset password token */
    resetPasswordTokenFound: 'Token de changement de password trouvé.',
    resetPasswordTokenNotFound: 'Token de changement de password non trouvé.',
    /* Uploader */
    fileNotFound: 'Fichier non trouvé.',
    fileFound: 'Fichier trouvé.',
    fileDeleted: 'Fichier supprimé.',
    folderCreated: 'Dossier créé.',
    folderCreationFailure: 'La création de dossier a échouée.',
    fileCreated: 'Fichier créé.',
    uploadNotAllowed: 'Téléchargement non autorisé.',
    /* Company */
    companyCreated: 'Entreprise créée.',
    companiesFound: 'Entreprises trouvées.',
    companyFound: 'Entreprise trouvée.',
    companyNotFound: 'Entreprise non trouvée.',
    companyExists: 'Entreprise déjà existante.',
    companyLinkRequestCreated: 'Demande de rattachement à une structure créée.',
    companyLinkRequestsFound: 'Demandes de rattachement à la structure trouvées.',
    companyLinkRequestDeleted: 'Demande de rattachement à la structure supprimée.',
    companyInternalHourCreated: 'Heure interne de l\'entreprise créée.',
    companyInternalHourNotFound: 'Heure interne de l\'entreprise non trouvée.',
    companyInternalHoursNotFound: 'Heures internes de l\'entreprise non trouvées.',
    companyInternalHoursFound: 'Heures internes de l\'entreprise trouvées.',
    companyInternalHourRemoved: 'Heure interne de l\'entreprise supprimé.',
    companyInternalHourCreationNotAllowed: 'Creation de l\'heure interne non autorisée.',
    companyInternalHourDeletionNotAllowed: 'Suppression de l\'heure interne non autorisée.',
    companyFirstInterventionFound: 'Première intervention de l\'entreprise trouvée.',
    companyFirstInterventionNotFound: 'Première intervention de l\'entreprise non trouvée.',
    administrativeDocumentNotFound: 'Document administratif non trouvé.',
    administrativeDocumentFound: 'Document administratif trouvé.',
    administrativeDocumentCreated: 'Document administratif créé.',
    administrativeDocumentRemoved: 'Document administratif supprimé.',
    /* Contracts */
    contractsFound: 'Contrats trouvés.',
    contractsNotFound: 'Contrats non trouvés.',
    contractUpdated: 'Contrat mis à jour.',
    contractAdded: 'Contrat ajouté.',
    contractRemoved: 'Contrat supprimé.',
    staffRegisteredFound: 'Registre Unique du personnel récuperé.',
    contractHasTimeStampedEventAfterEndDate:
      'Impossible: il y a des évènements horodatés après la date de fin du contrat.',
    contractEndDateBeforeStartDate:
      'Impossible de mettre fin à un contrat avant sa date de début.',
    contractHasBilledEventAfterEndDate: 'Impossible: il y a des évènements facturés après la date de fin de contrat.',
    /* Contracts amendments */
    contractVersionAdded: 'Avenant au contrat ajouté.',
    contractVersionRemoved: 'Avenant au contrat supprimé.',
    contractVersionUpdated: 'Avenant au contrat modifié.',
    /* Customers */
    customersFound: 'Bénéficiaires trouvés.',
    customerFound: 'Bénéficiaire trouvé(e).',
    customersNotFound: 'Bénéficiaires non trouvés.',
    customerNotFound: 'Bénéficiaire non trouvé(e).',
    customerCreated: 'Bénéficiaire créé(e).',
    customerUpdated: 'Bénéficiaire mis(e) à jour.',
    customerRemoved: 'Bénéficiaire supprimé(e).',
    customerSubscriptionAdded: 'Abonnement du/de la bénéficiaire ajouté.',
    customerSubscriptionUpdated: 'Abonnement du/de la bénéficiaire mis à jour.',
    customerSubscriptionRemoved: 'Abonnement du/de la bénéficiaire supprimé.',
    customerSubscriptionDeletionForbidden: 'Impossible de supprimer l\'abonnement du/de la bénéficiaire.',
    serviceAlreadySubscribed: 'Le/la bénéficiaire est déjà abonné(e) à ce service.',
    customerMandateUpdated: 'Mandat du/de la bénéficiaire mis à jour.',
    customerMandatesFound: 'Mandats du/de la bénéficiaire trouvés.',
    customerQuotesFound: 'Devis du/de la bénéficiaire trouvés.',
    customerQuoteAdded: 'Devis du/de la bénéficiaire ajouté.',
    signedDocumentSaved: 'Document signé enregistré.',
    customerSubscriptionHistoryAdded: 'Historique de l\'abonnement du/de la bénéficiaire ajouté.',
    customerFundingConflict: 'Le service est déjà utilisé par un autre financement.',
    customerFundingCreated: 'Financement du/de la bénéficiaire créé.',
    customerFundingUpdated: 'Financement du/de la bénéficiaire modifié.',
    customerFundingRemoved: 'Financement du/ de la bénéficiaire supprimé.',
    qrCodeCreated: 'QR code créé.',
    archivingNotAllowed: 'Archivage impossible : interventions non facturées.',
    archivingNotAllowedBeforeStoppingDate: 'Vous ne pouvez pas archiver une personne avant sa date d\'arrêt.',
    customerIsAbsent: 'Le bénéficiaire est absent à cette date',
    /* Customer absence */
    stoppedCustomer: 'Impossible: le bénéficiaire est arrêté sur cette période.',
    customerAlreadyAbsent: 'Impossible: une absence existe déjà sur cette période.',
    customerAbsenceCreated: 'Absence créée.',
    endDateBeforeStartDate: 'Impossible: la date de fin doit être postérieure à la date de début.',
    /* Customer notes */
    customerNoteCreated: 'Note de suivi créée.',
    customerNotesFound: 'Notes de suivi trouvées.',
    customerNotesNotFound: 'Notes de suivi non trouvées.',
    customerNoteUpdated: 'Note de suivi mise à jour.',
    /* ESign */
    signatureRequestCreated: 'Demande de signature créée.',
    documentNotFound: 'Document eversign non trouvé.',
    documentFound: 'Document eversign trouvé.',
    /* Google drive */
    googleDriveFolderCreationFailed: 'Echec de la création du dossier google drive.',
    googleDriveFolderNotFound: 'Dossier google drive non trouvé.',
    googleDriveFileNotFound: 'Fichier google drive non trouvé.',
    /* Events */
    eventsNotFound: 'Evènements non trouvés.',
    eventNotFound: 'Evènement non trouvé.',
    eventsFound: 'Evènement trouvé.',
    eventCreated: 'Evènement créé.',
    eventUpdated: 'Evènement mis à jour.',
    eventDeleted: 'Evènement supprimé.',
    eventsDeleted: 'Evènements supprimé.',
    eventDatesNotOnSameDay: 'Les dates de début et de fin devraient être le même jour.',
    eventsConflict: 'L\'évènement est en conflit avec les évènements de l\'auxiliaire.',
    eventTimeStamped: 'Evènement horodaté.',
    alreadyTimeStamped: 'L\'évènement est déja horodaté.',
    timeStampConflict: 'L\'horodatage est en conflit avec un évènement.',
    timeStampOtherConflict: 'Problème lors de l\'horodatage. Contactez le support technique.',
    timeStampTooLate: 'Vous ne pouvez pas horodater le début d\'un évènement terminé.',
    timeStampTooEarly: 'Vous ne pouvez pas horodater la fin d\'un évènement avant son commencement.',
    isBilled: 'Vous ne pouvez pas supprimer un évènement facturé.',
    isTimeStamped: 'Vous ne pouvez pas supprimer un évènement horodaté.',
    timeStampCancelledEvent: 'Vous ne pouvez pas horodater un évènement annulé.',
    /* Repetitions */
    invalidRepetition: 'Action impossible : La répétition est invalide.',
    /* Sectors */
    sectorCreated: 'Équipe créée.',
    sectorUpdated: 'Équipe modifiée.',
    sectorNotFound: 'Équipe non trouvée.',
    sectorsFound: 'Équipes trouvées.',
    sectorDeleted: 'Équipe supprimée.',
    sectorAlreadyExists: 'Équipe déjà existante.',
    /* Services */
    servicesFound: 'Services trouvés.',
    serviceCreated: 'Service créé.',
    serviceDeleted: 'Service supprimé.',
    servicesNotFound: 'Services non trouvés.',
    serviceNotFound: 'Service non trouvé.',
    servicesUpdated: 'Service modifié.',
    /* Surcharges */
    surchargesFound: 'Plans de majorations trouvés.',
    surchargeCreated: 'Plan de majoration créé.',
    surchargeDeleted: 'Plan de majoration supprimé.',
    surchargeNotFound: 'Plan de majoration non trouvé.',
    surchargeUpdated: 'Plan de majoration modifié.',
    /* Third party payers */
    thirdPartyPayerCreated: 'Tiers payeur de l\'entreprise créé.',
    thirdPartyPayersFound: 'Tiers payeurs de l\'entreprise trouvés.',
    thirdPartyPayersNotFound: 'Tiers payeurs de l\'entreprise non trouvés.',
    thirdPartyPayerUpdated: 'Tiers payeur de l\'entreprise modifié.',
    thirdPartyPayerDeleted: 'Tiers payeur de l\'entreprise supprimé.',
    /* Bills */
    billsCreated: 'Factures créées.',
    billCreated: 'Facture créée.',
    draftBillsCreated: 'Brouillons de facture générés.',
    billsFound: 'Factures trouvés.',
    billNotCompani: 'L\'origine de la facture doit être \'Compani\'.',
    /* Credit Notes */
    creditNotesFound: 'Avoirs trouvés.',
    creditNoteCreated: 'Avoir créé.',
    creditNoteDeleted: 'Avoir supprimé.',
    creditNotesNotFound: 'Avoirs non trouvés.',
    creditNoteNotFound: 'Avoir non trouvé.',
    creditNoteUpdated: 'Avoir modifié.',
    creditNoteNotCompani: 'L\'origine de l\'avoir doit être \'Compani\'.',
    /* Balances */
    balancesFound: 'Balances trouvées.',
    /* Payments */
    paymentsFound: 'Règlements trouvés.',
    paymentsNotFound: 'Règlements non trouvés.',
    paymentCreated: 'Règlement créé.',
    paymentNotFound: 'Règlement non trouvé.',
    paymentUpated: 'Règlement modifié.',
    paymentRemoved: 'Règlement supprimé.',
    /* Pay */
    payListCreated: 'Liste de paie créée.',
    hoursToWorkFound: 'Heures à travailler trouvées.',
    /* Final pay */
    finalPayListCreated: 'Liste des stc créée.',
    /* Event history */
    eventHistoriesFound: 'Historique des évènements trouvés.',
    eventHistoryUpdated: 'Historique d\'évènement mis à jour.',
    /* Pay documents */
    payDocumentCreated: 'Document de paie créé.',
    payDocumentsFound: 'Documents de paie trouvés.',
    payDocumentsNotFound: 'Documents de paie non trouvés.',
    payDocumentNotFound: 'Document de paie non trouvé.',
    payDocumentDeleted: 'Document de paie supprimé.',
    /* Stats */
    statsFound: 'Statistiques trouvées.',
    statsNotFound: 'Statistiques non trouvées.',
    /* Sector history */
    sectorHistoryNotFound: 'Historique du secteur non trouvé.',
    /* Bill slip */
    billSlipsFound: 'Bordereaux trouvés.',
    /* Tax certificates */
    taxCertificatesNotFound: 'Attestations fiscales non trouvées.',
    taxCertificateNotFound: 'Attestation fiscale non trouvée.',
    taxCertificatesFound: 'Attestations fiscales trouvées.',
    taxCertificateCreated: 'Attestation fiscale créée.',
    /* Establishments */
    establishmentCreated: 'Établissement créé.',
    establishmentNotFound: 'Établissement non trouvé.',
    establishmentsFound: 'Établissements trouvés.',
    establishmentRemoved: 'Établissement supprimé.',
    siretAlreadyExists: 'Siret déjà utilisé par un autre établissement.',
    /* Programs */
    programsFound: 'Liste des programmes trouvée.',
    programsNotFound: 'Liste des programmes non trouvée.',
    programCreated: 'Programme créé.',
    programFound: 'Programme trouvé.',
    programUpdated: 'Programme mis à jour.',
    testerAdded: 'Testeur(euse) ajouté(e) au programme.',
    testerRemoved: 'Testeur(euse) supprimé(e) du programme.',
    testerNotFound: 'Testeur(euse) non trouvé(e) dans le programme.',
    testerConflict: 'Testeur(euse) déjà ajouté(e) au programme.',
    /* Categories */
    categoriesFound: 'Catégories trouvées.',
    categoriesNotFound: 'Catégories non trouvées.',
    categoryCreated: 'Catégorie créée.',
    categoryUpdated: 'Catégorie mise à jour.',
    categoryDeleted: 'Catégorie supprimée.',
    categoryAdded: 'Catégorie ajoutée.',
    categoryRemoved: 'Catégorie retirée.',
    /* SubPrograms */
    subProgramUpdated: 'Sous-Programme mis à jour.',
    subProgramsFound: 'Sous-Programmes trouvés.',
    subProgramFound: 'Sous-Programme trouvé.',
    subProgramsNotFound: 'Sous-Programmes non trouvés.',
    eLearningSubProgramAlreadyExists: 'Un sous-programme eLearning publié existe déjà.',
    /* Steps */
    stepsFound: 'Liste des étapes trouvée.',
    stepUpdated: 'Étape mise à jour.',
    /* Activities */
    activityFound: 'Activité trouvée.',
    activityUpdated: 'Activité mise à jour.',
    activityDetached: 'Activité retirée.',
    /* Cards */
    cardUpdated: 'Carte mise à jour.',
    cardDeleted: 'Carte supprimée.',
    /* Courses */
    coursesFound: 'Liste des formations trouvée.',
    courseHistoriesFound: 'Liste des historiques de formation trouvée.',
    coursesNotFound: 'Liste des formations non trouvée.',
    courseHistoriesNotFound: 'Liste des historiques de formation non trouvée.',
    courseCreated: 'Formation créée.',
    courseFound: 'Formation trouvée.',
    courseUpdated: 'Formation mise à jour.',
    courseDeleted: 'Formation supprimée.',
    courseTraineeAdded: 'Stagiaire ajouté(e) à la formation.',
    courseTraineeRemoved: 'Stagiaire supprimé(e) de la formation.',
    courseTraineeAlreadyExists: 'Stagiaire déjà ajouté(e) à la formation.',
    courseTraineeNotFromCourseCompany: 'Ce compte n\'est pas relié à la structure de la formation.',
    courseAccessRuleAdded: 'Règle d\'accès ajoutée.',
    courseAccessRuleDeleted: 'Règle d\'accès supprimée.',
    courseQuestionnairesFound: 'Questionnaires trouvés.',
    courseAttendanceNotGenerated: 'Erreur lors du téléchargement, la formation ne contient pas de créneau présentiel.',
    /* Course slots */
    courseSlotCreated: 'Créneau de formation créé.',
    courseSlotUpdated: 'Créneau de formation mis à jour.',
    courseSlotDeleted: 'Créneau de formation supprimé.',
    courseSlotNotFound: 'Créneau de formation non trouvé.',
    courseSlotConflict: 'Créneau de formation en conflit.',
    /* Activities */
    activityHistoryCreated: 'Historique d\'activité créé.',
    activityHistoriesFound: 'Historiques d\'activité trouvés.',
    /* AttendanceSheets */
    attendanceSheetCreated: 'Feuille d\'émargement créée.',
    attendanceSheetsFound: 'Feuilles d\'émargement trouvées.',
    attendanceSheetsNotFound: 'Feuilles d\'émargement non trouvées.',
    attendanceSheetDeleted: 'Feuille d\'émargement supprimée.',
    /* Attendances */
    attendanceCreated: 'Émargement créé.',
    attendancesFound: 'Émargements trouvés.',
    attendancesNotFound: 'Émargements non trouvés.',
    attendanceDeleted: 'Émargement supprimé.',
    attendanceExists: 'Un émargement existe.',
    /* Questionnaires */
    questionnairesFound: 'Liste des questionnaires trouvée.',
    questionnairesNotFound: 'Liste des questionnaires non trouvée.',
    questionnaireCreated: 'Questionnaire créé.',
    questionnaireFound: 'Questionnaire trouvé.',
    draftQuestionnaireAlreadyExists: 'Il existe déjà un questionnaire de ce type en brouillon.',
    publishedQuestionnaireWithSameTypeExists: 'Un questionnaire du même type est déjà publié.',
    questionnaireUpdated: 'Questionnaire mis à jour.',
    questionnaireHistoryCreated: 'Historique de questionnaire créé.',
    /* PartnerOrganization */
    partnerOrganizationCreated: 'Structure partenaire créée.',
    partnerOrganizationAlreadyExists: 'Structure partenaire déjà existante.',
    partnerOrganizationsFound: 'Liste des structures partenaires trouvées.',
    partnerOrganizationFound: 'Structure partenaire trouvée.',
    partnerOrganizationUpdated: 'Structure partenaire mise à jour.',
    partnerCreated: 'Partenaire créé(e).',
    partnersFound: 'Liste des partenaires trouvée.',
    partnersNotFound: 'Liste des partenaires non trouvée.',
    partnerUpdated: 'Partenaire mis(e) à jour.',
    /* Helper */
    helpersFound: 'Liste des aidants trouvée.',
    helpersNotFound: 'Liste des aidants non trouvée.',
    helperUpdated: 'Aidant(e) mis(e) à jour.',
    /* CustomerPartners */
    customerPartnerCreated: 'Partenaire bénéficiaire créé.',
    customerPartnersFound: 'Liste des partenaires bénéficiaire trouvée.',
    customerPartnersNotFound: 'Liste des partenaires bénéficiaire non trouvée.',
    customerPartnerAlreadyExists: 'Le/la partenaire existe déjà.',
    customerPartnerUpdated: 'Partenaire mis(e) à jour.',
    customerPartnerRemoved: 'Partenaire supprimé(e).',
    /* BillingItems */
    billingItemCreated: 'Article de facturation créé.',
    billingItemsFound: 'Articles de facturation trouvés.',
    billingItemsConflict: 'Cet article de facturation existe déjà.',
    billingItemRemoved: 'Article de facturation supprimé.',
    billingItemHasServiceLinked: 'Impossible: l\'article de facturation est relié à un service.',
    billingItemHasBillLinked: 'Impossible: l\'article de facturation est relié à une facture.',
    /* Télétransmission */
    deliveryCreated: 'Fichier de delivery créé',
  },
};
