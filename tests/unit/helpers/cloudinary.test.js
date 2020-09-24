const expect = require('expect');
const CloudinaryHelper = require('../../../src/helpers/cloudinary');

describe('formatPublicId', () => {
  const invalidCharacters = [
    { character: '?', publicId: '?bonj?our?' },
    { character: '<', publicId: '<bonj<our<' },
    { character: '>', publicId: '>bonj>our>' },
    { character: '#', publicId: '#bonj#our#' },
    { character: '&', publicId: '&bonj&our&' },
    { character: '%', publicId: '%bonj%our%' },
    { character: '\\', publicId: '\\bonj\\our\\' },
    { character: 'emoji', publicId: '🏓bonj🤭our🍄' },
  ];
  invalidCharacters.forEach((invalid) => {
    it(`should remove ${invalid.character}`, () => {
      const result = CloudinaryHelper.formatPublicId(invalid.publicId);
      expect(result).toEqual('bonjour');
    });
  });

  const invalidFirstCharacters = [
    { character: '/', publicId: '/bonjour' },
    { character: 'space', publicId: ' bonjour' },
  ];
  invalidFirstCharacters.forEach((invalid) => {
    it(`should remove ${invalid.character} at the begining`, () => {
      const result = CloudinaryHelper.formatPublicId(invalid.publicId);
      expect(result).toEqual('bonjour');
    });
  });

  const invalidLastCharacters = [
    { character: '/', publicId: 'bonjour/' },
    { character: 'space', publicId: 'bonjour ' },
  ];
  invalidLastCharacters.forEach((invalid) => {
    it(`should remove ${invalid.character} at the end`, () => {
      const result = CloudinaryHelper.formatPublicId(invalid.publicId);
      expect(result).toEqual('bonjour');
    });
  });
});
