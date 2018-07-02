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
    plugin: require('./ogust'),
    routes: {
      prefix: '/ogust'
    }
  }
];
