exports.routes = [
  {
    plugin: require('./users'),
    routes: {
      prefix: '/users'
    }
  },
  {
    plugin: require('./roles'),
    routes: {
      prefix: '/roles'
    }
  },
  {
    plugin: require('./features'),
    routes: {
      prefix: '/features'
    }
  },
  {
    plugin: require('./activation'),
    routes: {
      prefix: '/activation'
    }
  },
  {
    plugin: require('./planningUpdates'),
    routes: {
      prefix: '/planningUpdates'
    }
  },
  // {
  //   plugin: require('./uploader'),
  //   routes: {
  //     prefix: '/uploader'
  //   }
  // },
  {
    plugin: require('./Ogust/employee'),
    routes: {
      prefix: '/ogust/employees'
    }
  },
  {
    plugin: require('./Ogust/customer'),
    routes: {
      prefix: '/ogust/customers'
    }
  },
  {
    plugin: require('./Ogust/utils'),
    routes: {
      prefix: '/ogust'
    }
  },
  // {
  //   plugin: require('./Ogust/services'),
  //   routes: {
  //     prefix: '/ogust/services'
  //   }
  // }
];
