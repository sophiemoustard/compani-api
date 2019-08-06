exports.routes = [
  {
    plugin: require('./users'),
    routes: { prefix: '/users' },
  },
  {
    plugin: require('./roles'),
    routes: { prefix: '/roles' },
  },
  {
    plugin: require('./rights'),
    routes: { prefix: '/rights' },
  },
  {
    plugin: require('./activation'),
    routes: { prefix: '/activation' },
  },
  {
    plugin: require('./email'),
    routes: { prefix: '/email' },
  },
  {
    plugin: require('./blog'),
    routes: { prefix: '/blog' },
  },
  {
    plugin: require('./Google/drive'),
    routes: { prefix: '/gdrive' },
  },
  {
    plugin: require('./cloudinary'),
    routes: { prefix: '/cloudinary' },
  },
  {
    plugin: require('./Ogust/employee'),
    routes: { prefix: '/ogust/employees' },
  },
  {
    plugin: require('./Ogust/utils'),
    routes: { prefix: '/ogust' },
  },
  {
    plugin: require('./twilio'),
    routes: { prefix: '/sms' },
  },
  {
    plugin: require('./tasks'),
    routes: { prefix: '/tasks' },
  },
  {
    plugin: require('./companies'),
    routes: { prefix: '/companies' },
  },
  {
    plugin: require('./customers'),
    routes: { prefix: '/customers' },
  },
  {
    plugin: require('./Esign'),
    routes: { prefix: '/esign' },
  },
  {
    plugin: require('./events'),
    routes: { prefix: '/events' },
  },
  {
    plugin: require('./Google/maps'),
    routes: { prefix: '/google/maps' },
  },
  {
    plugin: require('./distanceMatrix'),
    routes: { prefix: '/distancematrix' },
  },
  {
    plugin: require('./sectors'),
    routes: { prefix: '/sectors' },
  },
  {
    plugin: require('./contracts'),
    routes: { prefix: '/contracts' },
  },
  {
    plugin: require('./services'),
    routes: { prefix: '/services' },
  },
  {
    plugin: require('./surcharges'),
    routes: { prefix: '/surcharges' },
  },
  {
    plugin: require('./thirdPartyPayers'),
    routes: { prefix: '/thirdpartypayers' },
  },
  {
    plugin: require('./bills'),
    routes: { prefix: '/bills' },
  },
  {
    plugin: require('./creditNotes'),
    routes: { prefix: '/creditNotes' },
  },
  {
    plugin: require('./balances'),
    routes: { prefix: '/balances' },
  },
  {
    plugin: require('./payments'),
    routes: { prefix: '/payments' },
  },
  {
    plugin: require('./exports'),
    routes: { prefix: '/exports' },
  },
  {
    plugin: require('./pay'),
    routes: { prefix: '/pay' },
  },
  {
    plugin: require('./finalPay'),
    routes: { prefix: '/finalpay' },
  },
  {
    plugin: require('./eventHistories'),
    routes: { prefix: '/eventhistories' },
  },
];
