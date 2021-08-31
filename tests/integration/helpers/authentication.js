const memoize = require('lodash/memoize');
const app = require('../../../server');
const UtilsHelper = require('../../../src/helpers/utils');
const { VENDOR_ROLES } = require('../../../src/helpers/constants');
const Activity = require('../../../src/models/Activity');
const ActivityHistory = require('../../../src/models/ActivityHistory');
const AdministrativeDocument = require('../../../src/models/AdministrativeDocument');
const Attendance = require('../../../src/models/Attendance');
const AttendanceSheet = require('../../../src/models/AttendanceSheet');
const Bill = require('../../../src/models/Bill');
const BillingItem = require('../../../src/models/BillingItem');
const BillNumber = require('../../../src/models/BillNumber');
const BillSlipNumber = require('../../../src/models/BillSlipNumber');
const BillSlip = require('../../../src/models/BillSlip');
const Card = require('../../../src/models/Card');
const Category = require('../../../src/models/Category');
const Company = require('../../../src/models/Company');
const ContractNumber = require('../../../src/models/ContractNumber');
const Contract = require('../../../src/models/Contract');
const CourseHistory = require('../../../src/models/CourseHistory');
const Course = require('../../../src/models/Course');
const CourseSlot = require('../../../src/models/CourseSlot');
const CourseSmsHistory = require('../../../src/models/CourseSmsHistory');
const CreditNoteNumber = require('../../../src/models/CreditNoteNumber');
const CreditNote = require('../../../src/models/CreditNote');
const CustomerNoteHistory = require('../../../src/models/CustomerNoteHistory');
const CustomerNote = require('../../../src/models/CustomerNote');
const CustomerPartner = require('../../../src/models/CustomerPartner');
const Customer = require('../../../src/models/Customer');
const DistanceMatrix = require('../../../src/models/DistanceMatrix');
const Establishment = require('../../../src/models/Establishment');
const EventHistory = require('../../../src/models/EventHistory');
const Event = require('../../../src/models/Event');
const FinalPay = require('../../../src/models/FinalPay');
const FundingHistory = require('../../../src/models/FundingHistory');
const Helper = require('../../../src/models/Helper');
const IdentityVerification = require('../../../src/models/IdentityVerification');
const InternalHour = require('../../../src/models/InternalHour');
const PartnerOrganization = require('../../../src/models/PartnerOrganization');
const Partner = require('../../../src/models/Partner');
const PayDocument = require('../../../src/models/PayDocument');
const PaymentNumber = require('../../../src/models/PaymentNumber');
const Payment = require('../../../src/models/Payment');
const Pay = require('../../../src/models/Pay');
const Program = require('../../../src/models/Program');
const QuestionnaireHistory = require('../../../src/models/QuestionnaireHistory');
const Questionnaire = require('../../../src/models/Questionnaire');
const QuoteNumber = require('../../../src/models/QuoteNumber');
const ReferentHistory = require('../../../src/models/ReferentHistory');
const Repetition = require('../../../src/models/Repetition');
const Role = require('../../../src/models/Role');
const Rum = require('../../../src/models/Rum');
const SectorHistory = require('../../../src/models/SectorHistory');
const Sector = require('../../../src/models/Sector');
const Service = require('../../../src/models/Service');
const Step = require('../../../src/models/Step');
const SubProgram = require('../../../src/models/SubProgram');
const Surcharge = require('../../../src/models/Surcharge');
const TaxCertificate = require('../../../src/models/TaxCertificate');
const ThirdPartyPayer = require('../../../src/models/ThirdPartyPayer');
const UserCompany = require('../../../src/models/UserCompany');
const User = require('../../../src/models/User');
const { rolesList } = require('../../seed/authRolesSeed');
const { userList, userCompaniesList } = require('../../seed/authUsersSeed');
const { authCompany, otherCompany, companyWithoutSubscription } = require('../../seed/authCompaniesSeed');
const { sector, sectorHistories } = require('../../seed/authSectorsSeed');
const { authCustomer, helperCustomer } = require('../../seed/authCustomers');

const getUser = (roleName, erp = true) => {
  const role = rolesList.find(r => r.name === roleName);

  if (!VENDOR_ROLES.includes(roleName)) {
    const company = [authCompany, companyWithoutSubscription].find(c => c.subscriptions.erp === erp);
    const filteredUserCompanies = userCompaniesList.filter(u => UtilsHelper.areObjectIdsEquals(u.company, company._id));

    return userList.find(u => UtilsHelper.areObjectIdsEquals(u.role[role.interface], role._id) &&
      filteredUserCompanies.some(uc => UtilsHelper.areObjectIdsEquals(uc.user, u._id)));
  }

  return userList.find(u => UtilsHelper.areObjectIdsEquals(u.role[role.interface], role._id));
};

const getTokenByCredentials = memoize(
  async (credentials) => {
    const response = await app.inject({
      method: 'POST',
      url: '/users/authenticate',
      payload: credentials,
    });

    return response.result.data.token;
  },
  // do not stringify the 'credentials' object, because the order of the props can't be predicted
  credentials => JSON.stringify([credentials.email, credentials.password])
);

const getToken = async (roleName, erp) => {
  const user = getUser(roleName, erp);

  return getTokenByCredentials(user.local);
};

const deleteNonAuthenticationSeeds = async () => {
  await Promise.all([
    Activity.deleteMany(),
    ActivityHistory.deleteMany(),
    AdministrativeDocument.deleteMany(),
    Attendance.deleteMany(),
    AttendanceSheet.deleteMany(),
    Bill.deleteMany(),
    BillingItem.deleteMany(),
    BillNumber.deleteMany(),
    BillSlipNumber.deleteMany(),
    BillSlip.deleteMany(),
    Card.deleteMany(),
    Category.deleteMany(),
    Company.deleteMany({ _id: { $nin: [authCompany._id, otherCompany._id, companyWithoutSubscription._id] } }),
    ContractNumber.deleteMany(),
    Contract.deleteMany(),
    CourseHistory.deleteMany(),
    Course.deleteMany(),
    CourseSlot.deleteMany(),
    CourseSmsHistory.deleteMany(),
    CreditNoteNumber.deleteMany(),
    CreditNote.deleteMany(),
    CustomerNoteHistory.deleteMany(),
    CustomerNote.deleteMany(),
    CustomerPartner.deleteMany(),
    Customer.deleteMany({ _id: { $nin: [authCustomer._id] } }),
    DistanceMatrix.deleteMany(),
    Establishment.deleteMany(),
    EventHistory.deleteMany(),
    Event.deleteMany(),
    FinalPay.deleteMany(),
    FundingHistory.deleteMany(),
    Helper.deleteMany({ _id: { $nin: [helperCustomer._id] } }),
    IdentityVerification.deleteMany(),
    InternalHour.deleteMany(),
    PartnerOrganization.deleteMany(),
    Partner.deleteMany(),
    PayDocument.deleteMany(),
    PaymentNumber.deleteMany(),
    Payment.deleteMany(),
    Pay.deleteMany(),
    Program.deleteMany(),
    QuestionnaireHistory.deleteMany(),
    Questionnaire.deleteMany(),
    QuoteNumber.deleteMany(),
    ReferentHistory.deleteMany(),
    Repetition.deleteMany(),
    Role.deleteMany({ _id: { $nin: rolesList.map(role => role._id) } }),
    Rum.deleteMany(),
    SectorHistory.deleteMany({ _id: { $nin: sectorHistories.map(sectorHistory => sectorHistory._id) } }),
    Sector.deleteMany({ _id: { $nin: [sector._id] } }),
    Service.deleteMany(),
    Step.deleteMany(),
    SubProgram.deleteMany(),
    Surcharge.deleteMany(),
    TaxCertificate.deleteMany(),
    ThirdPartyPayer.deleteMany(),
    UserCompany.deleteMany({ user: { $nin: userList.map(user => user._id) } }),
    User.deleteMany({ _id: { $nin: userList.map(user => user._id) } }),
  ]);
};

module.exports = { getToken, getTokenByCredentials, deleteNonAuthenticationSeeds };
