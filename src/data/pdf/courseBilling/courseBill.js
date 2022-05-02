const { COPPER_600 } = require('../../../helpers/constants');
const UtilsPdfHelper = require('./utils');

exports.getPdfContent = async (bill) => {
  const header = await UtilsPdfHelper.getHeader(bill, true);
  const feeTable = UtilsPdfHelper.getFeeTable(bill);
  const tableFooter = UtilsPdfHelper.getTableFooter(bill);

  const footer = [{
    text: 'Merci de lire attentivement nos Conditions Générales de Prestations et le(s) programme(s) de formation en '
      + 'pièce-jointe.\nEn tant qu’organisme de formation, Compani est exonéré de la Taxe sur la Valeur Ajoutée (TVA).',
    fontSize: 8,
    marginTop: 48,
  }];

  const content = [header, feeTable, tableFooter, footer];

  return {
    content: content.flat(),
    defaultStyle: { font: 'Avenir', fontSize: 12 },
    styles: {
      header: { fillColor: COPPER_600, color: 'white' },
      description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
    },
  };
};
