const FileHelper = require('../../../helpers/file');
const UtilsHelper = require('../../../helpers/utils');

const getTableContent = (taxCertificate, columns) => {
  const { interventions } = taxCertificate;
  const content = [];

  const tableHeader = [
    { text: 'Matricule', bold: true },
    { text: 'Intervenant', bold: true },
    { text: 'Mois', bold: true },
    { text: 'Heures', bold: true },
    { text: 'Prestation', bold: true },
  ];
  content.push(tableHeader);

  interventions.forEach((row) => {
    const bodyRow = [];

    columns.forEach((column) => {
      if (column === 'month') bodyRow.push(UtilsHelper.capitalize(row[column].toString()));
      else if (column === 'hours') bodyRow.push({ text: row[column].toString(), alignment: 'right' });
      else bodyRow.push(row[column].toString());
    });

    content.push(bodyRow);
  });

  const tableFooter = [
    '',
    '',
    { text: 'Total', bold: true },
    { text: `${taxCertificate.totalHours}`, bold: true, alignment: 'right' },
    '',
  ];
  content.push(tableFooter);

  return content;
};

exports.getPdfContent = async (data) => {
  const { taxCertificate } = data;

  const [logo] = await FileHelper.downloadImages([{ url: taxCertificate.company.logo, name: 'logo.png' }]);

  const header = [
    { image: logo, width: 132, marginBottom: 24 },
    { text: `${taxCertificate.company.name}`, bold: true, marginBottom: 8, fontSize: 12 },
    {
      columns: [
        [
          {
            text: taxCertificate.company.rcs
              ? `RCS : ${taxCertificate.company.rcs}`
              : `RNA : ${taxCertificate.company.rna}`,
            fontSize: 12,
          },
          { text: `${taxCertificate.company.address.fullAddress}`, fontSize: 12 },
        ],
        [
          { text: `${taxCertificate.customer.name}`, fontSize: 12 },
          { text: `${taxCertificate.customer.address.fullAddress}`, fontSize: 12 },
        ],
      ],
      marginBottom: 40,
    },
  ];

  const body = [
    {
      table: {
        headerRows: 0,
        widths: ['*'],
        body: [[{
          text: `ATTESTATION DESTINEE AU CENTRE DES IMPOTS POUR L'ANNEE ${taxCertificate.year}`,
          alignment: 'center',
          fontSize: 14,
          bold: true,
        }]],
      },
      marginBottom: 24,
    },
    {
      text: `Je soussigné(e) ${taxCertificate.company.legalRepresentative.name},`
      + ` ${taxCertificate.company.legalRepresentative.position} de ${taxCertificate.company.name},`
      + ` certifie que ${taxCertificate.customer.name} (${taxCertificate.customer.address.fullAddress})`
      + ' a bénéficié d\'une aide à domicile.\n\n',
    },
    { text: `Nature des interventions : ${taxCertificate.subscriptions}.\n\n` },
    {
      text: 'Montant total des interventions effectivement acquitté ouvrant droit à réduction ou crédit d\'impôt :'
      + ` ${taxCertificate.totalPaid}`,
    },
    {
      text: taxCertificate.cesu
        ? `Dont montant total réglé avec des CESU préfinancés * : ${taxCertificate.cesu}`
        : '',
      marginBottom: 24,
    },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: ['auto', '*', 'auto', 'auto', 'auto'],
        body: getTableContent(taxCertificate, ['serialNumber', 'auxiliary', 'month', 'hours', 'subscription']),
      },
      layout: { hLineWidth() { return 0.5; }, vLineWidth() { return 0.5; } },
      marginBottom: 24,
    },
    {
      text: 'Les sommes que vous auriez perçues sur votre compte pour financer l\'aide à domicile sont à déduire de'
      + ' la valeur indiquée précédemment. Votre déclaration n\'engage que votre responsabilité de'
      + ' contribuable.\n\n',
    },
    {
      text: '* Pour les personnes utilisant le Chèque emploi service universel, seul le montant que vous'
      + ' avez personnellement financé est déductible (article 199 sexdecies du Code général des impôts et'
       + ' article L7233-7 du code du travail). Une attestation vous sera délivrée par les établissements qui'
      + ' préfinancent le Cesu.\n\n',
    },
    {
      text: 'Le client doit conserver à fin de contrôle, les factures remises par le prestataire de services,'
      + ' qui précisent les dates et durées des interventions.\n\n',
    },
  ];

  const footer = [
    { text: 'Fait pour valoir ce que de droit,' },
    { text: `${taxCertificate.date}`, alignment: 'right' },
    { text: `${taxCertificate.company.legalRepresentative.name}`, alignment: 'right' },
    { text: `${taxCertificate.company.legalRepresentative.position}`, alignment: 'right' },
  ];

  const content = [header, body, footer];

  return { content: content.flat(), defaultStyle: { font: 'SourceSans', fontSize: 11, alignment: 'justify' } };
};
