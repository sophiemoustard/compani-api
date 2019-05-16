module.exports = {
  // EVENTS
  INTERVENTION: 'intervention',
  ABSENCE: 'absence',
  UNAVAILABILITY: 'unavailability',
  INTERNAL_HOUR: 'internalHour',
  UNJUSTIFIED: 'unjustified absence',
  ILLNESS: 'illness',
  // COMPANY
  MAX_INTERNAL_HOURS_NUMBER: 9,
  // COMPANY THIRD PARTY PAYERS
  BILLING_INDIRECT: 'indirect',
  BILLING_DIRECT: 'direct',
  // CUSTOMER FUNDINGS
  MONTHLY: 'monthly',
  ONCE: 'once',
  HOURLY: 'hourly',
  FIXED: 'fixed',
  DAILY: 'daily',
  get SERVICE_NATURES() {
    return [
      { label: 'Forfaitaire', value: this.FIXED },
      { label: 'Horaire', value: this.HOURLY },
    ];
  },
  // REPETITION FREQUENCY
  NEVER: 'never',
  EVERY_DAY: 'every_day',
  EVERY_WEEK_DAY: 'every_week_day',
  EVERY_WEEK: 'every_week',
  CUSTOMER_CONTRACT: 'contract_with_customer',
  COMPANY_CONTRACT: 'contract_with_company',
  get CONTRACT_TYPES() {
    return [
      { label: 'Prestataire', value: this.COMPANY_CONTRACT },
      { label: 'Mandataire', value: this.CUSTOMER_CONTRACT },
    ];
  },
  TWO_WEEKS: 'two_weeks',
  MONTH: 'month',
  // PAYMENT
  PAYMENT: 'payment',
  REFUND: 'refund',
  WITHDRAWAL: 'withdrawal',
  BANK_TRANSFER: 'bank_transfer',
  CHECK: 'check',
  CESU: 'cesu',
  get PAYMENT_TYPES() {
    return [this.WITHDRAWAL, this.BANK_TRANSFER, this.CHECK, this.CESU];
  },
  // CANCELLATION OPTIONS
  INVOICED_AND_PAYED: 'invoiced_and_payed',
  INVOICED_AND_NOT_PAYED: 'invoiced_and_not_payed',
  CUSTOMER_INITIATIVE: 'customer_initiative',
  AUXILIARY_INITIATIVE: 'auxiliary_initiative',
  // EXPORTS
  SERVICE: 'service',
  AUXILIARY: 'auxiliary',
  HELPER: 'helper',
  CUSTOMER: 'customer',
  SUBSCRIPTION: 'subscription',
  FUNDING: 'funding',
};
