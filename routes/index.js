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
    plugin: require('./upload'),
    routes: {
      prefix: '/upload'
    }
  },
  {
    plugin: require('./ogust'),
    routes: {
      prefix: '/ogust'
    }
  }
];
