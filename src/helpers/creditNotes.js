const moment = require('moment');
const Boom = require('@hapi/boom');
const get = require('lodash/get');
const pick = require('lodash/pick');
const translate = require('./translate');
const Company = require('../models/Company');
const CreditNote = require('../models/CreditNote');
const PdfHelper = require('./pdf');
const UtilsHelper = require('./utils');
const { CIVILITY_LIST, COMPANI } = require('./constants');
const CreditNotePdf = require('../data/pdf/billing/creditNote');
const NumbersHelper = require('./numbers');

const { language } = translate;

const formatEventForPdf = event => ({
  identity: `${event.auxiliary.identity.firstname.substring(0, 1)}. ${event.auxiliary.identity.lastname}`,
  date: moment(event.startDate).format('DD/MM'),
  startTime: moment(event.startDate).format('HH:mm'),
  endTime: moment(event.endDate).format('HH:mm'),
  service: event.serviceName,
  surcharges: event.bills.surcharges && PdfHelper.formatEventSurchargesForPdf(event.bills.surcharges),
});

const formatBillingItemForPdf = billingItem => pick(
  billingItem,
  ['name', 'unitInclTaxes', 'vat', 'count', 'inclTaxes']
);

exports.formatPdf = (creditNote, company) => {
  const computedData = {
    date: moment(creditNote.date).format('DD/MM/YYYY'),
    number: creditNote.number,
    forTpp: !!creditNote.thirdPartyPayer,
    recipient: {
      address: creditNote.thirdPartyPayer
        ? get(creditNote, 'thirdPartyPayer.address', {})
        : get(creditNote, 'customer.contact.primaryAddress', {}),
      name: creditNote.thirdPartyPayer
        ? creditNote.thirdPartyPayer.name
        : UtilsHelper.formatIdentity(creditNote.customer.identity, 'TFL'),
    },
    misc: creditNote.misc,
  };

  if (creditNote.events && creditNote.events.length) {
    computedData.formattedEvents = [];
    const sortedEvents = creditNote.events.map(ev => ev).sort((ev1, ev2) => ev1.startDate - ev2.startDate);

    for (const event of sortedEvents) {
      computedData.formattedEvents.push(formatEventForPdf(event));
    }
  } else if (creditNote.subscription) {
    computedData.subscription = {
      service: creditNote.subscription.service.name,
      unitInclTaxes: UtilsHelper.formatPrice(creditNote.subscription.unitInclTaxes),
    };
  } else if (creditNote.billingItemList) {
    computedData.billingItems = [];
    for (const billingItem of creditNote.billingItemList) {
      computedData.billingItems.push(formatBillingItemForPdf(billingItem));
    }
  }

  const totalExclTaxes = creditNote.exclTaxesTpp && !NumbersHelper.isEqualTo(creditNote.exclTaxesTpp, 0)
    ? parseFloat(creditNote.exclTaxesTpp)
    : parseFloat(creditNote.exclTaxesCustomer);

  const netInclTaxes = creditNote.inclTaxesTpp ? creditNote.inclTaxesTpp : creditNote.inclTaxesCustomer;

  computedData.totalVAT = UtilsHelper.formatPrice(NumbersHelper.subtract(netInclTaxes, totalExclTaxes));

  return {
    creditNote: {
      customer: {
        identity: { ...creditNote.customer.identity, title: CIVILITY_LIST[get(creditNote, 'customer.identity.title')] },
        contact: creditNote.customer.contact,
      },
      totalExclTaxes: UtilsHelper.formatPrice(totalExclTaxes),
      netInclTaxes: UtilsHelper.formatPrice(netInclTaxes),
      ...computedData,
      company: pick(company, ['rcs', 'rna', 'address', 'logo', 'name']),
    },
  };
};

exports.generateCreditNotePdf = async (params, credentials) => {
  const creditNote = await CreditNote.findOne({ _id: params._id })
    .populate({
      path: 'customer',
      select: '_id identity contact subscriptions',
      populate: { path: 'subscriptions.service' },
    })
    .populate({ path: 'thirdPartyPayer', select: '_id name address' })
    .populate({ path: 'events.auxiliary', select: 'identity' })
    .lean();

  if (!creditNote) throw Boom.notFound(translate[language].creditNoteNotFound);
  if (creditNote.origin !== COMPANI) throw Boom.badRequest(translate[language].creditNoteNotCompani);

  const company = await Company.findOne({ _id: get(credentials, 'company._id', null) }).lean();
  const data = exports.formatPdf(creditNote, company);
  const pdf = await CreditNotePdf.getPdf(data);

  return { pdf, creditNoteNumber: creditNote.number };
};
