module.exports = {
  SENDER_MAIL: 'nepasrepondre@compani.fr',
  // EVENTS
  INTERVENTION: 'intervention',
  ABSENCE: 'absence',
  UNAVAILABILITY: 'unavailability',
  INTERNAL_HOUR: 'internalHour',
  UNJUSTIFIED: 'unjustified absence',
  ILLNESS: 'illness',
  PAID_LEAVE: 'leave',
  UNPAID_LEAVE: 'unpaid leave',
  MATERNITY_LEAVE: 'maternity leave',
  WORK_ACCIDENT: 'work accident',
  CESSATION_OF_WORK_CHILD: 'cessation_of_work_child',
  CESSATION_OF_WORK_RISK: 'cessation_of_work_risk',
  get EVENT_TYPE_LIST() {
    return {
      [this.INTERNAL_HOUR]: 'Heure interne',
      [this.INTERVENTION]: 'Intervention',
      [this.ABSENCE]: 'Absence',
      [this.UNAVAILABILITY]: 'Indisponibilité',
    };
  },
  get ABSENCE_TYPE_LIST() {
    return {
      [this.PAID_LEAVE]: 'Congé',
      [this.UNPAID_LEAVE]: 'Congé sans solde',
      [this.MATERNITY_LEAVE]: 'Congé maternité',
      [this.ILLNESS]: 'Maladie',
      [this.UNJUSTIFIED]: 'Absence injustifiée',
      [this.WORK_ACCIDENT]: 'Accident du travail',
      [this.CESSATION_OF_WORK_CHILD]: 'Arrêt de travail - garde d’enfant',
      [this.CESSATION_OF_WORK_RISK]: 'Arrêt de travail - salarié à risque',
      [this.OTHER]: 'other',
    };
  },
  get ABSENCE_NATURE_LIST() {
    return {
      [this.HOURLY]: 'Horaire',
      [this.DAILY]: 'Journalière',
    };
  },
  PLANNING_VIEW_END_HOUR: 22,
  // COMPANY
  MAX_INTERNAL_HOURS_NUMBER: 9,
  COMPANY: 'company',
  ASSOCIATION: 'association',
  // COMPANY THIRD PARTY PAYERS
  BILLING_INDIRECT: 'indirect',
  BILLING_DIRECT: 'direct',
  // CUSTOMER
  MISTER: 'mr',
  MRS: 'mrs',
  COUPLE: 'couple',
  get CIVILITY_LIST() {
    return {
      [this.MISTER]: 'M.',
      [this.MRS]: 'Mme',
      [this.COUPLE]: 'Mme et M.',
    };
  },
  // CUSTOMER FUNDINGS
  MONTHLY: 'monthly',
  ONCE: 'once',
  HOURLY: 'hourly',
  FIXED: 'fixed',
  DAILY: 'daily',
  get FUNDING_NATURES() {
    return [
      { label: 'Forfaitaire', value: this.FIXED },
      { label: 'Horaire', value: this.HOURLY },
    ];
  },
  get FUNDING_FREQUENCIES() {
    return [
      { value: this.MONTHLY, label: 'Mensuelle' },
      { value: this.ONCE, label: 'Une seule fois' },
    ];
  },
  // CUSTOMER SITUATION
  UNKNOWN: 'unknown',
  HOME: 'home',
  NURSING_HOME: 'nursing_home',
  HOSPITALIZED: 'hospitalized',
  DECEASED: 'deceased',
  get CUSTOMER_SITUATIONS() {
    return [
      { label: 'Non renseigné', value: this.UNKNOWN },
      { label: 'Domicile', value: this.HOME },
      { label: 'EHPAD', value: this.NURSING_HOME },
      { label: 'Hospitalisé', value: this.HOSPITALIZED },
      { label: 'Décédé', value: this.DECEASED },
    ];
  },
  // REPETITION FREQUENCY
  NEVER: 'never',
  EVERY_DAY: 'every_day',
  EVERY_WEEK_DAY: 'every_week_day',
  EVERY_WEEK: 'every_week',
  EVERY_TWO_WEEKS: 'every_two_weeks',
  get REPETITION_FREQUENCY_TYPE_LIST() {
    return {
      [this.NEVER]: 'Jamais',
      [this.EVERY_DAY]: 'Tous les jours',
      [this.EVERY_WEEK_DAY]: 'Du lundi au vendredi',
      [this.EVERY_WEEK]: 'Une fois par semaine',
      [this.EVERY_TWO_WEEKS]: 'Toutes les deux semaines',
    };
  },
  TWO_WEEKS: 'two_weeks',
  MONTH: 'month',
  // PAYMENT
  PAYMENT: 'payment',
  REFUND: 'refund',
  DIRECT_DEBIT: 'direct_debit',
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'check',
  CESU: 'cesu',
  get PAYMENT_TYPES_LIST() {
    return {
      [this.DIRECT_DEBIT]: 'Prélèvement',
      [this.BANK_TRANSFER]: 'Virement',
      [this.CHECK]: 'Chèque',
      [this.CESU]: 'Cesu',
    };
  },
  get PAYMENT_NATURE_LIST() {
    return {
      [this.PAYMENT]: 'Paiement',
      [this.REFUND]: 'Remboursement',
    };
  },
  SURCHARGES: {
    saturday: 'Samedi',
    sunday: 'Dimanche',
    publicHoliday: 'Jours fériés',
    twentyFifthOfDecember: '25 décembre',
    firstOfMay: '1er mai',
    evening: 'Soirée',
    custom: 'Personnalisée',
  },
  // CANCELLATION OPTIONS
  INVOICED_AND_PAID: 'invoiced_and_paid',
  INVOICED_AND_NOT_PAID: 'invoiced_and_not_paid',
  NOT_INVOICED_AND_NOT_PAID: 'not_invoiced_and_not_paid',
  CUSTOMER_INITIATIVE: 'customer_initiative',
  AUXILIARY_INITIATIVE: 'auxiliary_initiative',
  get CANCELLATION_CONDITION_LIST() {
    return {
      [this.INVOICED_AND_PAID]: 'Facturée & payée',
      [this.INVOICED_AND_NOT_PAID]: 'Facturée & non payée',
      [this.NOT_INVOICED_AND_NOT_PAID]: 'Non facturée & non payée',
    };
  },
  get CANCELLATION_REASON_LIST() {
    return {
      [this.CUSTOMER_INITIATIVE]: 'Initiative du client',
      [this.AUXILIARY_INITIATIVE]: 'Initiative de l\'intervenant',
    };
  },
  // INTERFACES
  CLIENT: 'client',
  VENDOR: 'vendor',
  // ROLE CLIENT
  AUXILIARY: 'auxiliary',
  HELPER: 'helper',
  COACH: 'coach',
  PLANNING_REFERENT: 'planning_referent',
  AUXILIARY_WITHOUT_COMPANY: 'auxiliary_without_company',
  CLIENT_ADMIN: 'client_admin',
  get AUXILIARY_ROLES() { return [this.AUXILIARY, this.PLANNING_REFERENT, this.AUXILIARY_WITHOUT_COMPANY]; },
  // ROLE VENDOR
  VENDOR_ADMIN: 'vendor_admin',
  TRAINING_ORGANISATION_MANAGER: 'training_organisation_manager',
  TRAINER: 'trainer',
  // SUBSCRIPTIONS
  ERP: 'erp',
  // EXPORTS
  SERVICE: 'service',
  SECTOR: 'sector',
  RUP: 'rup',
  REFERENT: 'referent',
  CUSTOMER: 'customer',
  SUBSCRIPTION: 'subscription',
  FUNDING: 'funding',
  DAYS_INDEX: {
    0: 'Lundi',
    1: 'Mardi',
    2: 'Mercredi',
    3: 'Jeudi',
    4: 'Vendredi',
    5: 'Samedi',
    6: 'Dimanche',
    7: 'Jours fériés',
  },
  // EXPORTS HISTORY
  WORKING_EVENT: 'working_event', // intervention or internal hours
  BILL: 'bill',
  // SERVICE
  get SERVICE_NATURES() {
    return this.FUNDING_NATURES;
  },
  // TRANSPORT
  PUBLIC_TRANSPORT: 'public',
  PRIVATE_TRANSPORT: 'private',
  TRANSIT: 'transit',
  DRIVING: 'driving',
  // PAY
  PAY: 'pay',
  // CONTRACTS
  CONTRACT: 'contract',
  EMPLOYER_TRIAL_PERIOD_TERMINATION: 'employer_trial_period_termination',
  EMPLOYEE_TRIAL_PERIOD_TERMINATION: 'employee_trial_period_termination',
  RESIGNATION: 'resignation',
  SERIOUS_MISCONDUCT_LAYOFF: 'serious_misconduct_layoff',
  GROSS_FAULT_LAYOFF: 'gross_fault_layoff',
  OTHER_REASON_LAYOFF: 'other_reason_layoff',
  MUTATION: 'mutation',
  CONTRACTUAL_TERMINATION: 'contractual_termination',
  INTERNSHIP_END: 'internship_end',
  CDD_END: 'cdd_end',
  OTHER: 'other',
  get END_CONTRACT_REASONS() {
    return {
      [this.EMPLOYER_TRIAL_PERIOD_TERMINATION]: 'Rupture période d’essai employeur',
      [this.EMPLOYEE_TRIAL_PERIOD_TERMINATION]: 'Rupture période d’essai salarié',
      [this.RESIGNATION]: 'Démission',
      [this.SERIOUS_MISCONDUCT_LAYOFF]: 'Licenciement faute grave',
      [this.GROSS_FAULT_LAYOFF]: 'Licenciement faute lourde',
      [this.OTHER_REASON_LAYOFF]: 'Licenciement autre motif',
      [this.MUTATION]: 'Mutation',
      [this.CONTRACTUAL_TERMINATION]: 'Rupture conventionnelle',
      [this.INTERNSHIP_END]: 'Fin de stage',
      [this.CDD_END]: 'Fin de contrat CDD',
      [this.OTHER]: 'Autres',
    };
  },
  // ORIGINS
  COMPANI: 'compani',
  THIRD_PARTY: 'third_party',
  OGUST: 'ogust',
  WEEKS_PER_MONTH: (52 / 12),
  // EVENT HISTORY
  EVENT_CREATION: 'event_creation',
  EVENT_DELETION: 'event_deletion',
  EVENT_UPDATE: 'event_update',
  // PAY DOCUMENT NATURE
  PAYSLIP: 'payslip',
  CERTIFICATE: 'certificate',
  // COURSES
  INTRA: 'intra',
  INTER_B2B: 'inter_b2b',
  CONVOCATION: 'convocation',
  REMINDER: 'reminder',
  // STEP
  E_LEARNING: 'e_learning',
  ON_SITE: 'on_site',
  // ACTIVITY
  LESSON: 'lesson',
  QUIZ: 'quiz',
  SHARING_EXPERIENCE: 'sharing_experience',
  VIDEO: 'video',
  // E-LEARNING CARDS
  TRANSITION: 'transition',
  TITLE_TEXT_MEDIA: 'title_text_media',
  TITLE_TEXT: 'title_text',
  TEXT_MEDIA: 'text_media',
  FLASHCARD: 'flashcard',
  FILL_THE_GAPS: 'fill_the_gaps',
  MULTIPLE_CHOICE_QUESTION: 'multiple_choice_question',
  SINGLE_CHOICE_QUESTION: 'single_choice_question',
  ORDER_THE_SEQUENCE: 'order_the_sequence',
  OPEN_QUESTION: 'open_question',
  SURVEY: 'survey',
  SINGLE_CHOICE_QUESTION_MAX_FALSY_ANSWERS_COUNT: 3,
  FILL_THE_GAPS_MAX_ANSWERS_COUNT: 6,
  MULTIPLE_CHOICE_QUESTION_MAX_ANSWERS_COUNT: 4,
  ORDER_THE_SEQUENCE_MAX_ANSWERS_COUNT: 3,
  // tests end2end
  PLANNING: 'planning',
  AUTHENTICATION: 'authentication',
  BILLING: 'billing',
  // Sms
  COURSE_SMS: 'Formation',
  HR_SMS: 'RH',
  get SMS_TAGS() { return [this.COURSE_SMS, this.HR_SMS]; },
};
