const luxon = require('luxon');

luxon.Settings.defaultLocale = 'fr';
luxon.Settings.defaultZone = 'Europe/Paris';

module.exports = luxon;
