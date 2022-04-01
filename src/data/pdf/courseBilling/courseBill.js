const get = require('lodash/get');
const UtilsHelper = require('../../../helpers/utils');
const NumbersHelper = require('../../../helpers/numbers');
const FileHelper = require('../../../helpers/file');
const CourseBillHelper = require('../../../helpers/courseBills');
const { COPPER_GREY_200, COPPER_600 } = require('../../../helpers/constants');

exports.getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

const formatSiret = siret => siret &&
  `${siret.slice(0, 3)} ${siret.slice(3, 6)} ${siret.slice(6, 9)} ${siret.slice(9, 14)}`;

exports.getPdfContent = async (bill) => {
  const [compani] = await exports.getImages();

  const header = [
    {
      columns: [
        { image: compani, width: 200, height: 42, alignment: 'right' },
        {
          stack: [
            { text: 'Facture', fontSize: 32 },
            { text: bill.number, bold: true },
            { text: `Date de facture : ${bill.date}` },
          ],
          alignment: 'right',
        },
      ],
      marginBottom: 4,
    },
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 200, h: 42, r: 0, fillOpacity: 0.5, color: 'white' }],
      absolutePosition: { x: 40, y: 40 },
    },
    {
      stack: [
        { text: get(bill, 'vendorCompany.name'), bold: true },
        { text: get(bill, 'vendorCompany.address.street') || '' },
        {
          text: `${get(bill, 'vendorCompany.address.zipCode') || ''} ${get(bill, 'vendorCompany.address.city') || ''}`,
        },
        { text: `Siret : ${formatSiret(get(bill, 'vendorCompany.siret') || '')}` },
      ],
      marginBottom: 36,
    },
    {
      columns: [
        {
          stack: [
            { text: 'Facturée à' },
            { text: get(bill, 'funder.name') || '', bold: true },
            { text: get(bill, 'funder.address.street') || '' },
            { text: `${get(bill, 'funder.address.zipCode') || ''} ${get(bill, 'funder.address.city') || ''}` },
          ],
        },
        {
          stack: [{ text: 'Formation pour le compte de' }, { text: get(bill, 'company.name'), bold: true }],
          alignment: 'right',
        },
      ],
    },
  ];

  const footer = [{
    text: 'Merci de lire attentivement nos Conditions Générales de Prestations et le(s) programme(s) de formation en '
      + 'pièce-jointe.\nEn tant qu’organisme de formation, Compani est exonéré de la Taxe sur la Valeur Ajoutée (TVA).',
    fontSize: 8,
    marginTop: 48,
  }];

  const billDetailsTableBody = [
    [
      { text: '#', style: 'header', alignment: 'left' },
      { text: 'Article & description', style: 'header', alignment: 'left' },
      { text: 'Quantité', style: 'header', alignment: 'center' },
      { text: 'Prix unitaire', style: 'header', alignment: 'center' },
      { text: 'Coût', alignment: 'right', style: 'header' },
    ],
  ];

  billDetailsTableBody.push(
    [
      { text: 1, alignment: 'left', marginTop: 8 },
      {
        stack: [
          { text: bill.course.subProgram.program.name, alignment: 'left', marginTop: 8 },
          { text: bill.mainFee.description || '', style: 'description', marginBottom: 8 },
        ],
      },
      { text: bill.mainFee.count, alignment: 'center', marginTop: 8 },
      { text: UtilsHelper.formatPrice(bill.mainFee.price), alignment: 'center', marginTop: 8 },
      {
        text: UtilsHelper.formatPrice(NumbersHelper.multiply(bill.mainFee.price, bill.mainFee.count)),
        alignment: 'right',
        marginTop: 8,
      },
    ]
  );

  if (bill.billingPurchaseList) {
    bill.billingPurchaseList.forEach((purchase, i) => {
      billDetailsTableBody.push(
        [
          { text: i + 2, alignment: 'left', marginTop: 8 },
          {
            stack: [
              { text: purchase.billingItem.name, alignment: 'left', marginTop: 8 },
              { text: purchase.description || '', style: 'description', marginBottom: 8 },
            ],
          },
          { text: purchase.count, alignment: 'center', marginTop: 8 },
          { text: UtilsHelper.formatPrice(purchase.price), alignment: 'center', marginTop: 8 },
          {
            text: UtilsHelper.formatPrice(NumbersHelper.multiply(purchase.price, purchase.count)),
            alignment: 'right',
            marginTop: 8,
          },
        ]
      );
    });
  }

  const netInclTaxes = CourseBillHelper.getNetInclTaxes(bill);
  const tableFooter =
    {
      columns: [
        { text: '' },
        { text: '' },
        { text: '' },
        { text: 'Sous-total', alignment: 'right', marginRight: 22 },
        { text: UtilsHelper.formatPrice(netInclTaxes), alignment: 'right', width: 'auto' },
      ],
    };

  const feeTable = [
    {
      table: { body: billDetailsTableBody, widths: ['5%', '50%', '15%', '15%', '15%'] },
      margin: [0, 8, 0, 8],
      layout: { vLineWidth: () => 0, hLineWidth: i => (i > 1 ? 1 : 0), hLineColor: () => COPPER_GREY_200 },
    },
  ];
  const content = [];
  content.push(header, feeTable, tableFooter, footer);
  return {
    content: content.flat(),
    defaultStyle: { font: 'Avenir', fontSize: 12 },
    styles: {
      marginRightLarge: { marginRight: 40 },
      header: { fillColor: COPPER_600, color: 'white' },
      description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
    },
  };
};
