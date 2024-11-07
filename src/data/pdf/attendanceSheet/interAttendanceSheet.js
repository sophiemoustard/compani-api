const UtilsPdfHelper = require('./utils');
const UtilsHelper = require('../../../helpers/utils');
const PdfHelper = require('../../../helpers/pdf');
const FileHelper = require('../../../helpers/file');
const { COPPER_500 } = require('../../../helpers/constants');

const getSlotTableContent = (slot, trainerSignature, traineeSignature) => [
  { stack: [{ text: `${slot.date}` }, { text: `${slot.address || ''}`, fontSize: 8 }] },
  { stack: [{ text: `${slot.duration}` }, { text: `${slot.startHour} - ${slot.endHour}`, fontSize: 8 }] },
  ...trainerSignature ? [{ image: trainerSignature, width: 64, alignment: 'center' }] : [{ text: '' }],
  ...traineeSignature ? [{ image: traineeSignature, width: 64, alignment: 'center' }] : [{ text: '' }],
];

exports.getPdfContent = async (data) => {
  const { trainees, signatures } = data;
  let trainerSignature = null;
  let traineeSignature = null;
  const [conscience, compani, decision, signature] = await UtilsPdfHelper.getImages();
  if (signatures) {
    const signatureImages = [
      { url: signatures.trainer, name: 'trainer_signature.png' },
      { url: signatures.trainee, name: 'trainee_signature.png' },
    ];
    const [trainer, trainee] = await FileHelper.downloadImages(signatureImages);
    trainerSignature = trainer;
    traineeSignature = trainee;
  }

  const content = [];
  trainees.forEach((trainee, i) => {
    const title = `Émargements - ${trainee.traineeName}`;
    const trainersCount = trainee.course.trainers.length;
    const formattedTrainersTitle = UtilsHelper.formatQuantity('Intervenant·e', trainersCount, '·s', false);
    const columns = [
      [
        { text: `Nom de la formation : ${trainee.course.name}`, bold: true, marginBottom: 10 },
        { text: `Dates : du ${trainee.course.firstDate} au ${trainee.course.lastDate}` },
        { text: `Durée : ${trainee.course.duration}` },
        { text: `Structure : ${trainee.registrationCompany}` },
        { text: `${formattedTrainersTitle} : ${trainee.course.trainers.join(', ')}` },
      ],
      { image: decision, width: 64 },
    ];
    const header = UtilsPdfHelper.getHeader(compani, conscience, title, columns);

    const body = [
      [
        { text: 'Créneaux', style: 'header' },
        { text: 'Durée', style: 'header' },
        { text: 'Signature stagiaire', style: 'header' },
        { text: 'Signature de l\'intervenant(e)', style: 'header' },
      ],
    ];
    trainee.course.slots.forEach(slot => body.push(getSlotTableContent(slot, trainerSignature, traineeSignature)));

    const table = [{
      table: { body, widths: ['auto', 'auto', '*', '*'], dontBreakRows: true },
      marginBottom: 8,
      pageBreak: i === trainees.length - 1 ? 'none' : 'after',
    }];

    content.push(header, table);
  });

  return {
    template: {
      content: content.flat(),
      defaultStyle: { font: 'SourceSans', fontSize: 10 },
      pageMargins: [40, 40, 40, 128],
      styles: {
        header: { bold: true, fillColor: COPPER_500, color: 'white', alignment: 'center' },
        title: { fontSize: 16, bold: true, margin: [8, 32, 0, 0], alignment: 'left', color: COPPER_500 },
      },
      footer: UtilsPdfHelper.getFooter(signature),
    },
    images: [
      conscience,
      compani,
      decision,
      signature,
      ...trainerSignature && traineeSignature ? [trainerSignature, traineeSignature] : [],
    ],
  };
};

exports.getPdf = async (data) => {
  const { template, images } = await exports.getPdfContent(data);

  return PdfHelper.generatePdf(template, images);
};
