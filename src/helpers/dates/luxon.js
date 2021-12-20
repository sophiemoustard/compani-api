const luxon = require('luxon');

luxon.Settings.defaultLocale = 'fr';
luxon.Settings.defaultZone = 'Europe/Paris';
luxon.Settings.throwOnInvalid = true;

module.exports = luxon;
