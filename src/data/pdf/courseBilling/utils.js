const get = require('lodash/get');
const UtilsHelper = require('../../../helpers/utils');
const NumbersHelper = require('../../../helpers/numbers');
const FileHelper = require('../../../helpers/file');
const CourseBillHelper = require('../../../helpers/courseBills');
const { COPPER_GREY_200 } = require('../../../helpers/constants');

const getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

exports.getHeader = async (data, isBill = false) => {
  const [compani] = await getImages();

  const additionalInfosSection = isBill
    ? {
      stack: [
        { text: 'Formation pour le compte de' },
        { text: UtilsHelper.formatName(get(data, 'companies')), bold: true },
      ],
      alignment: 'right',
    }
    : {
      stack: [
        {
          text: [
            'Avoir sur la facture ',
            { text: get(data, 'courseBill.number'), bold: true },
            { text: ` du ${get(data, 'courseBill.date')}` },
          ],
        },
        { text: data.misc ? `Motif de l'avoir : ${data.misc}` : '' },
      ],
      alignment: 'right',
    };

  const header = [
    {
      columns: [
        { image: compani, width: 200, height: 42, alignment: 'right' },
        {
          stack: [
            { text: isBill ? 'Facture' : 'Avoir', fontSize: 32 },
            { text: data.number, bold: true },
            { text: `${isBill ? 'Date de facture' : 'Date de l\'avoir'} : ${data.date}` },
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
        { text: get(data, 'vendorCompany.name'), bold: true },
        { text: get(data, 'vendorCompany.address.street') || '' },
        {
          text: `${get(data, 'vendorCompany.address.zipCode') || ''} ${get(data, 'vendorCompany.address.city') || ''}`,
        },
        { text: `Siret : ${UtilsHelper.formatSiret(get(data, 'vendorCompany.siret') || '')}` },
      ],
      marginBottom: 36,
    },
    {
      columns: [
        {
          stack: [
            { text: isBill ? 'Facturer à' : '' },
            { text: get(data, 'payer.name') || '', bold: true },
            { text: get(data, 'payer.address') || '' },
          ],
        },
        additionalInfosSection,
      ],
    },
  ];

  return { header, images: [compani] };
};

exports.getFeeTable = (data) => {
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
          { text: data.course.subProgram.program.name, alignment: 'left', marginTop: 8 },
          { text: data.mainFee.description || '', style: 'description', marginBottom: 8 },
        ],
      },
      { text: data.mainFee.count, alignment: 'center', marginTop: 8 },
      { text: UtilsHelper.formatPrice(data.mainFee.price), alignment: 'center', marginTop: 8 },
      {
        text: UtilsHelper.formatPrice(NumbersHelper.multiply(data.mainFee.price, data.mainFee.count)),
        alignment: 'right',
        marginTop: 8,
      },
    ]
  );

  if (data.billingPurchaseList) {
    data.billingPurchaseList.forEach((purchase, i) => {
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

  return [
    {
      table: { body: billDetailsTableBody, widths: ['5%', '50%', '15%', '15%', '15%'] },
      margin: [0, 8, 0, 8],
      layout: { vLineWidth: () => 0, hLineWidth: i => (i > 1 ? 1 : 0), hLineColor: () => COPPER_GREY_200 },
    },
  ];
};

exports.getTableFooter = (data) => {
  const netInclTaxes = UtilsHelper.formatPrice(CourseBillHelper.getNetInclTaxes(data));

  return {
    columns: [
      { text: '' },
      { text: '' },
      { text: '' },
      [
        { text: 'Sous-total HT', alignment: 'right', marginRight: 22, marginBottom: 8 },
        { text: 'Total TTC', alignment: 'right', marginRight: 22, bold: true },
      ],
      [
        { text: netInclTaxes, alignment: 'right', width: 'auto', marginBottom: 8 },
        { text: netInclTaxes, alignment: 'right', width: 'auto', bold: true },
      ],
    ],
  };
};
