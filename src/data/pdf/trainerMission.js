const get = require('lodash/get');
const { MISTER, DD_MM_YYYY, INTRA } = require('../../helpers/constants');
const { CompaniDate } = require('../../helpers/dates/companiDates');
const FileHelper = require('../../helpers/file');
const PdfHelper = require('../../helpers/pdf');
const UtilsHelper = require('../../helpers/utils');

const getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
    { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

const composeCourseName = (course) => {
  const companyName = course.type === INTRA ? `${course.companies[0].name} - ` : '';
  const misc = course.misc ? ` - ${course.misc}` : '';

  return companyName + course.subProgram.program.name + misc;
};

const formatCertifications = (courses) => {
  const courseNames = courses.map(course => composeCourseName(course)).join(', ');
  return `au moins un(e) stagiaire de ${courseNames}`;
};

const formatDates = (data) => {
  const dates = data.dates.join(', ');
  const slotsToPlan = data.slotsToPlan
    ? `\n${UtilsHelper.formatQuantity('créneau', data.slotsToPlan, 'x')} restent à définir`
    : '';

  return dates + slotsToPlan;
};

exports.getPdfContent = async (data) => {
  const [compani, signature] = await getImages();

  const header = [
    { image: compani, width: 154, height: 32, alignment: 'right', marginBottom: 24, opacity: 0.5 },
    { text: 'ORDRE DE MISSION', alignment: 'center', fontSize: 24, bold: true, marginBottom: 24 },
  ];

  const body = [
    [{ text: 'NOM et Prénom' }, { text: UtilsHelper.formatIdentity(data.identity, 'FL'), style: 'cell' }],
    [
      { text: 'Fonction' },
      { text: get(data, 'identity.title') === MISTER ? 'Formateur' : 'Formatrice', style: 'cell' },
    ],
    [{ text: 'Se rendra à la formation suivante' }, { text: data.program, style: 'cell' }],
    [
      { text: 'Durée de la formation' },
      { text: `${UtilsHelper.formatQuantity('session', data.slotsCount)} - ${data.liveDuration}`, style: 'cell' },
    ],
    [{ text: 'Nombre de groupe' }, { text: data.groupCount, style: 'cell' }],
    [{ text: 'Structures' }, { text: data.companies, style: 'cell' }],
    [{ text: 'Lieu(x) de la formation' }, { text: data.addressList.join(', '), style: 'cell' }],
    [{ text: 'Dates de la formation' }, { text: formatDates(data), style: 'cell' }],
    [
      { text: 'Formation certifiante ?' },
      { text: !data.certification.length ? 'Non' : `${formatCertifications(data.certification)}`, style: 'cell' },
    ],
    [{ text: 'Frais de formateurs prévus' }, { text: data.fee, style: 'cell' }],
  ];

  const table = [{ table: { body, widths: ['*', '*'], dontBreakRows: true }, marginBottom: 8 }];

  const footer = [
    {
      stack: [
        { text: 'Fait à Paris,', alignment: 'right' },
        { text: `Le ${CompaniDate().format(DD_MM_YYYY)}`, alignment: 'right' },
        { text: `${data.createdBy}`, alignment: 'right' },
        { image: signature, width: 144, marginTop: 8, alignment: 'right' },
      ],
      unbreakable: true,
      marginLeft: 40,
      marginRight: 40,
    },
  ];

  const content = [header, table];

  return {
    template: {
      content: content.flat(),
      defaultStyle: { font: 'SourceSans', fontSize: 14 },
      pageMargins: [40, 40, 40, 200],
      styles: { cell: { margin: [4, 4, 4, 12] } },
      footer,
    },
    images: [compani, signature],
  };
};

exports.getPdf = async (data) => {
  const { template, images } = await exports.getPdfContent(data);

  return PdfHelper.generatePdf(template, images);
};
