const get = require('lodash/get');
const keyBy = require('lodash/keyBy');
const os = require('os');
const path = require('path');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const EventHistory = require('../models/EventHistory');
const User = require('../models/User');
const UtilsHelper = require('./utils');
const XMLHelper = require('./xml');
const DraftBillsHelper = require('./draftBills');
const FundingsHelper = require('./fundings');
const DatesHelper = require('./dates');
const { CompaniDate } = require('./dates/companiDates');
const { NOT_INVOICED_AND_NOT_PAID, TIME_STAMPING_ACTIONS } = require('./constants');
const ThirdPartyPayer = require('../models/ThirdPartyPayer');

const CADRE_PRESTATAIRE = 'PRE';
const MISSING_START_TIME_STAMP = 'COA';
const MISSING_END_TIME_STAMP = 'COD';
const EDITED_BOTH_TIME_STAMP = 'CO2';
const MISSING_BOTH_TIME_STAMP = 'CRE';
const AUXILIARY_CONTACT = 'INT';
const SPECIFIED_CI_TRADE_PRODUCT_NAME = 'Aide aux personnes âgées';
const BADGE = 'BDG';

const formatDate = date => date.toLocalISO().slice(0, 19);

// Identifiant de transaction du flux delivery
const getCIDDHExchangedDocumentContext = transactionId => ({
  'ram:VersionID': '1.4',
  'ram:SpecifiedTransactionID': transactionId,
});

// Description de l'entête de télégestion
const getCIDDHExchangedDocument = (transactionId, issueDateTime) => ({
  'ram:ID': transactionId,
  'ram:IssueDateTime': issueDateTime,
});

// Tiers payeurs
const getApplicableCIDDHSupplyChainTradeAgreement = tpp => ({
  'ram:BuyerOrderReferencedCIReferencedDocument': {
    'ram:IssuerCITradeParty': {
      'pie:ID': { '#text': tpp.teletransmissionId, '@schemeAgencyName': 'token', '@schemeID': 'token' },
      'pie:Name': tpp.name,
    },
  },
  'ram:ContractReferencedCIReferencedDocument': {
    'qdt:GlobalID': { '#text': 'P', '@schemeAgencyName': 'token', '@schemeID': 'token' },
  },
});

const getPostalCITradeAddress = address => ({ // order matters
  'pie:LineOne': get(address, 'street') || '',
  'pie:PostcodeCode': get(address, 'zipCode') || '',
  'pie:CityName': get(address, 'city') || '',
  'pie:CountryID': 'FR',
});

const getShipToCITradeParty = (customer) => { // order matters
  const shipToCITradeParty = {
    'pie:ID': { '#text': customer.serialNumber, '@schemeAgencyName': 'token', '@schemeID': 'token' },
    'pie:Name': UtilsHelper.formatIdentity(customer.identity, 'FL'),
  };

  const firstname = get(customer, 'identity.firstname');
  if (firstname) shipToCITradeParty['pie:FirstName'] = firstname;

  shipToCITradeParty['pie:LastName'] = get(customer, 'identity.lastname') || '';

  const birthDate = get(customer, 'identity.birthDate');
  if (birthDate) shipToCITradeParty['pie:BirthDate'] = formatDate(CompaniDate(birthDate));

  shipToCITradeParty['pie:PostalCITradeAddress'] = getPostalCITradeAddress(get(customer, 'contact.primaryAddress'));

  return shipToCITradeParty;
};

const getShipFromCITradeParty = auxiliary => ({
  'pie:ID': {
    '#text': get(auxiliary, 'company.customersConfig.teletransmissionId'),
    '@schemeAgencyName': 'token',
    '@schemeID': 'token',
  },
  'pie:Name': `${get(auxiliary, 'company.name')} - ${get(auxiliary, 'establishment.name')}`,
  'pie:SIRET': get(auxiliary, 'establishment.siret'),
  'pie:DefinedCITradeContact': {
    'pie:ID': { '#text': auxiliary.serialNumber.substring(10), '@schemeAgencyName': 'token', '@schemeID': 'token' },
    'pie:PersonName': UtilsHelper.formatIdentity(auxiliary.identity, 'LF'),
    'pie:TypeCode': {
      '#text': AUXILIARY_CONTACT,
      '@listAgencyName': 'EDESS',
      '@listID': 'ESPPADOM_CONTACT_PRESTATAIRE',
    },
  },
  'pie:PostalCITradeAddress': getPostalCITradeAddress(get(auxiliary, 'company.address')),
});

exports.getTypeCode = (startTimeStampList, endTimeStampList, hasTimeStamp) => {
  let typeCode = '';
  const isStartTimeStamped = startTimeStampList.length && startTimeStampList.some(ev => !ev.isCancelled);
  const isEndTimeStamped = endTimeStampList.length && endTimeStampList.some(ev => !ev.isCancelled);

  if (!isStartTimeStamped || !isEndTimeStamped) {
    if (isStartTimeStamped) typeCode = MISSING_END_TIME_STAMP;
    else if (isEndTimeStamped) typeCode = MISSING_START_TIME_STAMP;
    else if (hasTimeStamp) typeCode = EDITED_BOTH_TIME_STAMP;
    else typeCode = MISSING_BOTH_TIME_STAMP;
  }

  return typeCode;
};

// Délivrance retenue : les horaires validés de début et de fin  d’intervention
const getActualDespatchCISupplyChainEvent = (event, startTimeStampList, endTimeStampList, hasTimeStamp) => {
  const typeCode = exports.getTypeCode(startTimeStampList, endTimeStampList, hasTimeStamp);

  const actualDespatchCISupplyChainEvent = {
    'ram:TypeCode': { '#text': typeCode, '@listAgencyName': 'EDESS', '@listID': 'ESPPADOM_EFFECTIVITY_AJUST' },
    'ram:OccurrenceCISpecifiedPeriod': {
      'qdt:StartDateTime': formatDate(CompaniDate(event.startDate)),
      'qdt:EndDateTime': formatDate(CompaniDate(event.endDate)),
    },
  };

  return actualDespatchCISupplyChainEvent;
};

exports.getTimeStampInfo = (event) => {
  const startTimeStampList = event.histories.filter(h => !!h.update.startHour)
    .sort(DatesHelper.descendingSort('createdAt'));
  const endTimeStampList = event.histories.filter(h => !!h.update.endHour)
    .sort(DatesHelper.descendingSort('createdAt'));
  const hasTimeStamp = event.histories.some(h => (!!h.update.endHour || !!h.update.startHour));

  return { startTimeStampList, endTimeStampList, hasTimeStamp };
};

// Précisions de delivrance (bénéficiaire et contexte)
const getApplicableCIDDHSupplyChainTradeDelivery = (event, customer) => {
  const { startTimeStampList, endTimeStampList, hasTimeStamp } = exports.getTimeStampInfo(event);

  const applicableCIDDHSupplyChainTradeDelivery = {
    'ram:ShipToCITradeParty': getShipToCITradeParty(customer),
    'ram:ShipFromCITradeParty': getShipFromCITradeParty(event.auxiliary),
    'ram:ActualDespatchCISupplyChainEvent':
      getActualDespatchCISupplyChainEvent(event, startTimeStampList, endTimeStampList, hasTimeStamp),
  };

  if (startTimeStampList.length || endTimeStampList.length) {
    const lastStartTimeStamp = startTimeStampList[0];
    const lastEndTimeStamp = endTimeStampList[0];
    const identificiationMethodContent = {
      '@listID': 'ESPPADOM_TIMESTAMP_METHOD',
      '@listAgencyName': 'EDESS',
      '#text': BADGE,
    };
    const identificiationMethod = {
      'ram:CustomerIdentificationMethod': identificiationMethodContent,
      'ram:SupplierIdentificationMethod': identificiationMethodContent,
    };

    applicableCIDDHSupplyChainTradeDelivery['ram:AdditionalReferencedCIReferencedDocument'] = {
      'ram:EffectiveCISpecifiedPeriod': {
        ...(lastStartTimeStamp &&
          {
            'ram:StartDateTime': {
              'ram:CertifiedDateTime': formatDate(CompaniDate(lastStartTimeStamp.event.startDate)),
              ...identificiationMethod,
            },
          }),
        ...(lastEndTimeStamp &&
          {
            'ram:EndDateTime': {
              'ram:CertifiedDateTime': formatDate(CompaniDate(lastEndTimeStamp.event.endDate)),
              ...identificiationMethod,
            },
          }),
      },
    };
  }

  return applicableCIDDHSupplyChainTradeDelivery;
};

/**
 * Domatel ne tient pas compte des secondes sur les horodatages et calcule les durées à facturer au tiers-payeur
 * à la minute près
*/
const computeBilledQuantity = (event) => {
  const minutes = DraftBillsHelper.getDurationInMinutes(event.startDate, event.endDate);

  return minutes / 60;
};

// Prestation à effectuer
const getIncludedCIDDLSupplyChainTradeLineItem = (event, funding, transactionId) => {
  const subscription = event.customer.subscriptions
    .find(s => UtilsHelper.areObjectIdsEquals(event.subscription, s._id));
  const lastServiceVersion = subscription ? UtilsHelper.getLastVersion(subscription.service.versions, 'startDate') : {};

  return {
    'ram:AssociatedCIDDLDocumentLineDocument': {
      'ram:LineID': transactionId,
      'ram:OrderLineID': funding.fundingPlanId,
    },
    'ram:SpecifiedCIDDLSupplyChainTradeDelivery': {
      'ram:BilledQuantity': { '#text': computeBilledQuantity(event), '@unitCode': 'HUR' },
    },
    'ram:SpecifiedCIDDLSupplyChainTradeSettlement': {
      'ram:CadreIntervention': { '@listID': 'ESPPADOM_CADRE', '@listAgencyName': 'EDESS', '#text': CADRE_PRESTATAIRE },
    },
    'ram:SpecifiedCITradeProduct': {
      'qdt:ID': {
        '@listID': 'ESPPADOM_TYPE_AIDE',
        '@listAgencyName': 'EDESS',
        '#text': get(funding, 'thirdPartyPayer.type'),
      },
      'qdt:Name': lastServiceVersion.name || SPECIFIED_CI_TRADE_PRODUCT_NAME,
    },
  };
};

// Contenu du document
const getCIDDHSupplyChainTradeTransaction = (event, funding, transactionId) => ({
  'ram:ApplicableCIDDHSupplyChainTradeAgreement': getApplicableCIDDHSupplyChainTradeAgreement(funding.thirdPartyPayer),
  'ram:ApplicableCIDDHSupplyChainTradeDelivery': getApplicableCIDDHSupplyChainTradeDelivery(event, event.customer),
  'ram:ApplicableCIDDHSupplyChainTradeSettlement': {},
  'ram:IncludedCIDDLSupplyChainTradeLineItem': getIncludedCIDDLSupplyChainTradeLineItem(event, funding, transactionId),
});

exports.formatCrossIndustryDespatchAdvice = (event, transactionId, issueDateTime, eventIndex) => {
  const fundingsWithLastVersion = event.customer.fundings
    .map(f => UtilsHelper.mergeLastVersionWithBaseObject(f, 'createdAt'));
  const funding = FundingsHelper.getMatchingFunding(event.startDate, fundingsWithLastVersion);
  if (!funding) return null;

  return {
    'ns:CIDDHExchangedDocumentContext': getCIDDHExchangedDocumentContext(`I${transactionId}${eventIndex}`),
    'ns:CIDDHExchangedDocument': getCIDDHExchangedDocument(event._id.toHexString(), issueDateTime),
    'ns:CIDDHSupplyChainTradeTransaction':
      getCIDDHSupplyChainTradeTransaction(event, funding, `I${transactionId}${eventIndex}`),
  };
};

exports.getAuxiliaries = async (events) => {
  const auxiliaries = await User
    .find({ _id: { $in: events.map(ev => ev.auxiliary) } }, { identity: 1, serialNumber: 1 })
    .populate({ path: 'establishment' })
    .populate({ path: 'company', populate: { path: 'company' } })
    .lean();

  return keyBy(auxiliaries, '_id');
};

exports.getCustomers = async (events, companyId) => {
  const customers = await Customer
    .find(
      { _id: { $in: events.map(ev => ev.customer) }, company: companyId },
      { 'contact.primaryAddress': 1, identity: 1, fundings: 1, serialNumber: 1, subscriptions: 1 }
    )
    .populate({ path: 'fundings.thirdPartyPayer', select: 'teletransmissionId name type' })
    .populate({ path: 'subscriptions.service' })
    .lean();

  return keyBy(customers, '_id');
};

exports.getEventHistories = async (events, companyId) => {
  const eventHistories = await EventHistory
    .find({
      action: { $in: TIME_STAMPING_ACTIONS },
      'event.eventId': { $in: events.map(ev => ev._id) },
      company: companyId,
    })
    .lean();

  const formattedHistories = {};
  for (const history of eventHistories) {
    if (!formattedHistories[history.event.eventId]) formattedHistories[history.event.eventId] = [history];
    else formattedHistories[history.event.eventId].push(history);
  }

  return formattedHistories;
};

exports.formatEvents = async (events, companyId) => {
  const auxiliaries = await exports.getAuxiliaries(events);
  const customers = await exports.getCustomers(events, companyId);
  const eventHistories = await exports.getEventHistories(events, companyId);

  return events.map(ev => ({
    ...ev,
    auxiliary: auxiliaries[ev.auxiliary],
    customer: customers[ev.customer],
    histories: eventHistories[ev._id] || [],
  }));
};

exports.formatNonBilledEvents = async (events, startDate, endDate, credentials) => {
  if (!events.length) return [];

  const billsQuery = { startDate, endDate, eventIds: events.map(ev => ev._id) };
  const bills = await DraftBillsHelper.getDraftBillsList(billsQuery, credentials);

  return bills
    .filter(b => !!b.thirdPartyPayerBills)
    .flatMap(b => b.thirdPartyPayerBills
      .flatMap(tppb => tppb.bills
        .flatMap(bi => bi.eventsList.flatMap(ev => ({ ...ev, customer: b.customer._id, _id: ev.event })))));
};

exports.getEvents = async (query, credentials) => {
  const { month, thirdPartyPayers, onlyPastEvents } = query;
  const companyId = get(credentials, 'company._id');
  const tpps = UtilsHelper.formatObjectIdsArray(thirdPartyPayers);
  const customersWithFundings = await Customer
    .find({ 'fundings.thirdPartyPayer': { $in: tpps }, company: companyId }, { fundings: 1 })
    .lean();
  const subscriptionIds = customersWithFundings.flatMap(c => c.fundings)
    .filter(f => UtilsHelper.doesArrayIncludeId(tpps, f.thirdPartyPayer))
    .map(f => f.subscription);

  const startDate = CompaniDate(month, 'MM-yyyy').startOf('month').toDate();
  const yesterday = CompaniDate().subtract({ days: 1 }).endOf('day');
  const endOfMonth = CompaniDate(month, 'MM-yyyy').endOf('month');
  const endDate = onlyPastEvents && yesterday.isBefore(endOfMonth) ? yesterday.toDate() : endOfMonth.toDate();

  const events = await Event
    .find({
      subscription: { $in: subscriptionIds },
      company: companyId,
      endDate: { $gt: startDate },
      startDate: { $lt: endDate },
      auxiliary: { $exists: true },
      'cancel.condition': { $not: { $eq: NOT_INVOICED_AND_NOT_PAID } },
    })
    .lean();

  const billedEvents = events.filter(ev => !!ev.isBilled &&
    UtilsHelper.doesArrayIncludeId(tpps, ev.bills.thirdPartyPayer));
  const nonBilledEvents = events.filter(ev => !ev.isBilled);

  const notBilledEvents = await exports.formatNonBilledEvents(nonBilledEvents, startDate, endDate, credentials);

  return exports.formatEvents([...notBilledEvents, ...billedEvents], get(credentials, 'company._id'));
};

/**
 * Un fichier = une liste d'interventions pour un tiers payeur donné
 * => pour un tiers payeur, on récupere la liste des inteventions qui sont reliées à un plan d'aide
 */
exports.getCrossIndustryDespatchAdvice = async (query, credentials) => {
  const issueDateTime = formatDate(CompaniDate());
  const transactionId = issueDateTime.replace(/T/g, '').replace(/-/g, '').replace(/:/g, '');

  return (await exports.getEvents(query, credentials))
    .map((ev, i) => exports.formatCrossIndustryDespatchAdvice(ev, transactionId, issueDateTime, i))
    .filter(c => !!c);
};

exports.getFileName = async (query) => {
  const tppsQuery = UtilsHelper.formatObjectIdsArray(query.thirdPartyPayers);
  const tpp = await ThirdPartyPayer
    .findOne({ _id: tppsQuery[0] }, { teletransmissionType: 1, companyCode: 1 })
    .lean();

  const month = CompaniDate(query.month, 'MM-yyyy').format('yyyyMM');
  const date = CompaniDate().format('yyMMddhhmm');

  return `${tpp.companyCode}-${month}-${tpp.teletransmissionType}-${date}.xml`;
};

exports.generateDeliveryXml = async (query, credentials) => {
  const data = {
    'ns:delivery': {
      '@versionID': '1.4',
      '@xmlns:ram': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:8',
      '@xmlns:pie': 'urn:un:unece:uncefact:data:standard:PersonInformationEntity:1',
      '@xmlns:qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:8',
      '@xmlns:ns': 'urn:un:unece:uncefact:data:standard:CrossIndustryDespatchAdvice:2',
      'ns:CrossIndustryDespatchAdvice': await exports.getCrossIndustryDespatchAdvice(query, credentials),
    },
  };

  const fileName = await exports.getFileName(query);
  const outputPath = path.join(os.tmpdir(), fileName);

  return { file: await XMLHelper.generateXML(data, outputPath), fileName };
};
