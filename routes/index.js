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
    plugin: require('./rights'),
    routes: {
      prefix: '/rights'
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
  {
    plugin: require('./email'),
    routes: {
      prefix: '/email'
    }
  },
  {
    plugin: require('./bot'),
    routes: {
      prefix: '/bot'
    }
  },
  {
    plugin: require('./blog'),
    routes: {
      prefix: '/blog'
    }
  },
  {
    plugin: require('./calendar'),
    routes: {
      prefix: '/calendar'
    }
  },
  {
    plugin: require('./messageToBot'),
    routes: {
      prefix: '/messageToBot'
    }
  },
  // {
  //   plugin: require('./uploader'),
  //   routes: {
  //     prefix: '/uploader'
  //   }
  // },
  {
    plugin: require('./gdrive'),
    routes: {
      prefix: '/gdrive'
    }
  },
  {
    plugin: require('./cloudinary'),
    routes: {
      prefix: '/cloudinary'
    }
  },
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
  {
    plugin: require('./Ogust/services'),
    routes: {
      prefix: '/ogust/services'
    }
  },
  {
    plugin: require('./Ogust/bankInfo'),
    routes: {
      prefix: '/ogust/bankInfo'
    }
  },
  {
    plugin: require('./Ogust/employment'),
    routes: {
      prefix: '/ogust/employment'
    }
  },
  {
    plugin: require('./Ogust/contact'),
    routes: {
      prefix: '/ogust/contacts'
    }
  },
  {
    plugin: require('./Ogust/address'),
    routes: {
      prefix: '/ogust/address'
    }
  },
  {
    plugin: require('./twilio'),
    routes: {
      prefix: '/sms'
    }
  },
  {
    plugin: require('./tasks'),
    routes: {
      prefix: '/tasks'
    }
  }
];
