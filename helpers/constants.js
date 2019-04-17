module.exports = {
  // EVENTS
  INTERVENTION: 'intervention',
  ABSENCE: 'absence',
  UNAVAILABILITY: 'unavailability',
  INTERNAL_HOUR: 'internalHour',
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
  // REPETITION FREQUENCY
  NEVER: 'never',
  EVERY_DAY: 'every_day',
  EVERY_WEEK_DAY: 'every_week_day',
  EVERY_WEEK: 'every_week',
  CUSTOMER_CONTRACT: 'contract_with_customer',
  COMPANY_CONTRACT: 'contract_with_company',
  TWO_WEEKS: 'two_weeks',
  MONTH: 'month',
  // PAYMENT
  PAYMENT: 'payment',
  REFUND: 'refund',
  PAYMENT_TYPES: ['withdrawal', 'bank_transfer', 'check', 'cesu'],
  // CANCELLATION OPTIONS
  INVOICED_AND_PAYED: 'invoiced_and_payed',
  INVOICED_AND_NOT_PAYED: 'invoiced_and_not_payed',
  NOT_INVOICED_AND_NOT_PAYED: 'not_invoiced_and_not_payed',
};
