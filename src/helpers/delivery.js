const { get } = require('lodash');
const builder = require('xmlbuilder');
const Customer = require('../models/Customer');
const Event = require('../models/Event');
const UtilsHelper = require('./utils');
const FundingsHelper = require('./fundings');
const DatesHelper = require('./dates');
const { TIME_STAMPING_ACTIONS } = require('../models/EventHistory');

const CADRE_PRESTATAIRE = 'PRE';
const MISSING_START_TIME_STAMP = 'COA';
const MISSING_END_TIME_STAMP = 'COD';
const MISSING_BOTH_TIME_STAMP = 'CO2';
const AUXILIARY_CONTACT = 'INT';

// Identifiant de transaction du flux delivery
const getCIDDHExchangedDocumentContext = transactionId => ({ VersionID: '1.4', SpecifiedTransactionID: transactionId });

// Description de l'entête de télégestion
const getCIDDHExchangedDocument = (transactionId, issueDateTime) => ({
  ID: transactionId,
  IssueDateTime: issueDateTime,
});

// Tiers payeurs
const getApplicableCIDDHSupplyChainTradeAgreement = tpp => ({
  BuyerOrderReferencedCIReferencedDocument: {
    IssuerCITradeParty: {
      'pie:ID': { '#text': tpp.teletransmissionId, '@schemeAgencyName': 'token', '@schemeID': 'token' },
      'pie:Name': tpp.name,
    },
  },
  ContractReferencedCIReferencedDocument: {
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
  if (birthDate) shipToCITradeParty['pie:BirthDate'] = DatesHelper.toLocalISOString(birthDate);

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

// Délivrance retenue : les horaires validés de début et de fin  d’intervention
const getActualDespatchCISupplyChainEvent = (event, isStartTimeStamped, isEndTimeStamped) => {
  let typeCode = '';
  if (!isStartTimeStamped || !isEndTimeStamped) {
    if (isStartTimeStamped) typeCode = MISSING_END_TIME_STAMP;
    else if (isEndTimeStamped) typeCode = MISSING_START_TIME_STAMP;
    else typeCode = MISSING_BOTH_TIME_STAMP;
  }

  const actualDespatchCISupplyChainEvent = {
    TypeCode: { '#text': typeCode, '@listAgencyName': 'EDESS', '@listID': 'ESPPADOM_EFFECTIVITY_AJUST' },
    OccurrenceCISpecifiedPeriod: {
      'qdt:StartDateTime': DatesHelper.toLocalISOString(event.startDate),
      'qdt:EndDateTime': DatesHelper.toLocalISOString(event.endDate),
    },
  };

  return actualDespatchCISupplyChainEvent;
};

// Précisions de delivrance (bénéficiaire et contexte)
const getApplicableCIDDHSupplyChainTradeDelivery = (event, customer) => {
  const isStartTimeStamped = event.histories.some(h => !!h.update.startHour);
  const isEndTimeStamped = event.histories.some(h => !!h.update.endHour);

  const applicableCIDDHSupplyChainTradeDelivery = {
    ShipToCITradeParty: getShipToCITradeParty(customer),
    ShipFromCITradeParty: getShipFromCITradeParty(event.auxiliary),
    ActualDespatchCISupplyChainEvent:
      getActualDespatchCISupplyChainEvent(event, isStartTimeStamped, isEndTimeStamped),
  };

  if (isStartTimeStamped && isEndTimeStamped) {
    applicableCIDDHSupplyChainTradeDelivery.AdditionalReferencedCIReferencedDocument = {
      EffectiveCISpecifiedPeriod: {
        StartDateTime: { CertifiedDateTime: DatesHelper.toLocalISOString(event.startDate) },
        EndDateTime: { CertifiedDateTime: DatesHelper.toLocalISOString(event.endDate) },
      },
    };
  }

  return applicableCIDDHSupplyChainTradeDelivery;
};

// Domatel ne tient pas compte des secondes sur les horodatages et calcule les durées à facturer au CD à la minute près
const computeBilledQuantity = (event) => {
  const minutes = (event.endDate - event.startDate) / (60 * 1000);

  return Math.round((Math.round(minutes) * 100) / 60) / 100;
};

// Prestation à effectuer
const getIncludedCIDDLSupplyChainTradeLineItem = (event, funding, transactionId) => ({
  AssociatedCIDDLDocumentLineDocument: {
    LineID: transactionId,
    OrderLineID: funding.folderNumber,
  },
  SpecifiedCIDDLSupplyChainTradeDelivery: {
    BilledQuantity: { '#text': computeBilledQuantity(event), '@unitCode': 'HUR' },
  },
  SpecifiedCIDDLSupplyChainTradeSettlement: {
    CadreIntervention: { '@listID': 'ESPPADOM_CADRE', '@listAgencyName': 'EDESS', '#text': CADRE_PRESTATAIRE },
  },
  SpecifiedCITradeProduct: {
    'qdt:ID': {
      '@listID': 'ESPPADOM_TYPE_AIDE',
      '@listAgencyName': 'EDESS',
      '#text': get(funding, 'thirdPartyPayer.type'),
    },
    'qdt:Name': 'Aide aux personnes âgées',
  },
});

// Contenu du document
const getCIDDHSupplyChainTradeTransaction = (event, funding, transactionId) => ({
  ApplicableCIDDHSupplyChainTradeAgreement: getApplicableCIDDHSupplyChainTradeAgreement(funding.thirdPartyPayer),
  ApplicableCIDDHSupplyChainTradeDelivery: getApplicableCIDDHSupplyChainTradeDelivery(event, event.customer),
  ApplicableCIDDHSupplyChainTradeSettlement: {},
  IncludedCIDDLSupplyChainTradeLineItem: getIncludedCIDDLSupplyChainTradeLineItem(event, funding, transactionId),
});

const formatCrossIndustryDespatchAdvice = (event, customersWithFunding, transactionId, issueDateTime, eventIndex) => {
  const customer = customersWithFunding.find(c => UtilsHelper.areObjectIdsEquals(c._id, event.customer));
  const fundingsWithLastVersion = customer.fundings.map(f => ({ ...f, ...f.versions[f.versions.length - 1] }));
  const funding = FundingsHelper.getMatchingFunding(event.startDate, fundingsWithLastVersion);
  if (!funding) return null;

  return {
    'ns:CIDDHExchangedDocumentContext': getCIDDHExchangedDocumentContext(`I${transactionId}${eventIndex}`),
    'ns:CIDDHExchangedDocument': getCIDDHExchangedDocument(`I${transactionId}${eventIndex}`, issueDateTime),
    'ns:CIDDHSupplyChainTradeTransaction':
      getCIDDHSupplyChainTradeTransaction({ ...event, customer }, funding, `I${transactionId}${eventIndex}`),
  };
};

/**
 * Un fichier = une liste d'interventions pour un tiers payeur donné
 * => pour un tiers payeur, on récupere la liste des inteventions qui sont reliées à un plan d'aide
 */
exports.getCrossIndustryDespatchAdvice = async (query, credentials) => {
  const companyId = get(credentials, 'company._id');

  const fundingQuery = query.thirdPartyPayer ? { thirdPartyPayer: query.thirdPartyPayer } : { $exists: true };

  const customerIds = [
    '604623164fb51b00152fc63e', // APA Dependence
    '612cdc439588f60016d005c0', // APA Dependence
    '60688c9201bffa0015d6556a', // APA Aide ménagère
    '60eb3bf51ed1d40015742a07', // APA Aide ménagère
  ];
  const customersWithFunding = await Customer
    .find(
      { fundings: fundingQuery, _id: { $in: customerIds } },
      { 'contact.primaryAddress': 1, identity: 1, fundings: 1, serialNumber: 1 }
    )
    .populate({ path: 'fundings.thirdPartyPayer', select: 'teletransmissionId name type' })
    .lean();

  const subscriptionIds = customersWithFunding.map(c => c.fundings.map(f => f.subscription)).flat();
  const events = await Event
    .find({
      company: companyId,
      subscription: { $in: subscriptionIds },
      startDate: { $gte: '2021-09-06T00:00:00' },
      endDate: { $lte: '2021-09-10T12:00:00' },
      auxiliary: { $exists: true },
    })
    .populate({
      path: 'auxiliary',
      populate: [{ path: 'establishment' }, { path: 'company', populate: { path: 'company' } }],
      select: 'establishment identity serialNumber',
    })
    .populate({ path: 'histories', match: { action: { $in: TIME_STAMPING_ACTIONS }, company: companyId } })
    .lean();

  const issueDateTime = DatesHelper.toLocalISOString(new Date());
  const transactionId = issueDateTime.replace(/T/g, '').replace(/-/g, '').replace(/:/g, '');

  return events
    .map((ev, i) => formatCrossIndustryDespatchAdvice(ev, customersWithFunding, transactionId, issueDateTime, i))
    .filter(c => !!c);
};

exports.generateDeliveryXml = async (query, credentials) => {
  const data = {
    'ns:delivery': {
      '@versionID': '1.4',
      '@xmlns': 'urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:8',
      '@xmlns:pie': 'urn:un:unece:uncefact:data:standard:PersonInformationEntity:1',
      '@xmlns:qdt': 'urn:un:unece:uncefact:data:standard:QualifiedDataType:8',
      '@xmlns:ns': 'urn:un:unece:uncefact:data:standard:CrossIndustryDespatchAdvice:2',
      'ns:CrossIndustryDespatchAdvice': await exports.getCrossIndustryDespatchAdvice(query, credentials),
    },
  };
  const xml = builder.create(data, { encoding: 'utf-8' }).end({ pretty: true });

  return xml;
};
