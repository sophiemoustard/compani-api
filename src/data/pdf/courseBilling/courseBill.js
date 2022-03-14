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

exports.getPdfContent = async (bill) => {
  const [compani] = await exports.getImages();

  const header = [
    { columns: [{ image: compani, width: 200, height: 42, alignment: 'right' }], marginBottom: 20 },
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 200, h: 42, r: 0, fillOpacity: 0.5, color: 'white' }],
      absolutePosition: { x: 40, y: 40 },
    },
  ];

  const billDetailsTableBody = [
    [
      { text: '#', style: 'header', alignment: 'left', marginRight: 20 },
      { text: 'Article & description', style: 'header', alignment: 'left' },
      { text: 'Quantité', style: 'header', alignment: 'center', marginLeft: 20, marginRight: 20 },
      { text: 'Prix unitaire', style: 'header', alignment: 'center', marginLeft: 20, marginRight: 20 },
      { text: 'Coût', alignment: 'right', style: 'header' },
    ],
  ];

  billDetailsTableBody.push(
    [
      { text: 1, alignment: 'left' },
      {
        stack: [
          { text: bill.course.subProgram.program.name, alignment: 'left' },
          { text: bill.mainFee.description || '', style: 'description', marginBottom: 8 },
        ],
      },
      { text: bill.mainFee.count, alignment: 'center' },
      { text: UtilsHelper.formatPrice(bill.mainFee.price), alignment: 'center' },
      {
        text: UtilsHelper.formatPrice(NumbersHelper.multiply(bill.mainFee.price, bill.mainFee.count)),
        alignment: 'right',
      },
    ]
  );

  if (bill.billingPurchaseList) {
    bill.billingPurchaseList.forEach((purchase, i) => {
      billDetailsTableBody.push(
        [
          { text: i + 2, alignment: 'left' },
          {
            stack: [
              { text: purchase.billingItem.name, alignment: 'left' },
              { text: purchase.description || '', style: 'description', marginBottom: 8 },
            ],
          },
          { text: purchase.count, alignment: 'center' },
          { text: UtilsHelper.formatPrice(purchase.price), alignment: 'center' },
          { text: UtilsHelper.formatPrice(NumbersHelper.multiply(purchase.price, purchase.count)), alignment: 'right' },
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
        { text: 'Sous-total', alignment: 'right' },
        {
          text: UtilsHelper.formatPrice(netInclTaxes),
          alignment: 'right',
          marginLeft: 22,
          marginRight: 4,
          width: 'auto',
        },
      ],
    };

  const feeTable = [
    {
      table: { body: billDetailsTableBody, widths: ['auto', '*', 'auto', 'auto', 'auto'] },
      margin: [0, 40, 0, 8],
      layout: { vLineWidth: () => 0, hLineWidth: i => (i > 1 ? 1 : 0), hLineColor: () => COPPER_GREY_200 },
    },
  ];
  const content = [];
  content.push(header, feeTable, tableFooter);
  return {
    content: content.flat(),
    defaultStyle: { font: 'SourceSans', fontSize: 12 },
    styles: {
      marginRightLarge: { marginRight: 40 },
      header: { fillColor: COPPER_600, color: 'white' },
      description: { alignment: 'left', marginLeft: 8, fontSize: 10 },
    },
  };
};
