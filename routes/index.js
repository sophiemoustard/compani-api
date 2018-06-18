exports.routes = [
  {
    plugin: require('./users'),
    routes: {
      prefix: '/users'
    }
  },
  {
    plugin: require('./upload'),
    routes: {
      prefix: '/upload'
    }
  }
];
