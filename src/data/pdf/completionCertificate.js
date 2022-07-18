const FileHelper = require('../../helpers/file');
const { COPPER_500, ORANGE_500, COPPER_50 } = require('../../helpers/constants');

const getImages = async () => {
  const imageList = [
    { url: 'https://storage.googleapis.com/compani-main/aux-pouce.png', name: 'aux-pouce.png' },
    { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
    { url: 'https://storage.googleapis.com/compani-main/aux-eclaire.png', name: 'aux-eclaire.png' },
    { url: 'https://storage.googleapis.com/compani-main/smiling-emoji.png', name: 'smiling-emoji.png' },
    { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
  ];

  return FileHelper.downloadImages(imageList);
};

const getHeader = (thumb, compani) => [
  {
    columns: [
      { image: thumb, width: 64, marginTop: 8 },
      [
        { image: compani, width: 200, height: 42, alignment: 'right' },
        { text: 'Attestation individuelle de formation', style: 'title' },
      ],
    ],
    marginBottom: 20,
  },
];

exports.getPdfContent = async (data) => {
  const [thumb, compani, lighted, emoji, signature] = await getImages();
  const { trainee, programName, duration, startDate, endDate, learningGoals, date } = data;

  const header = getHeader(thumb, compani);

  const body = [
    { text: 'Félicitations, vous avez terminé votre formation !', style: 'congratulations' },
    {
      columns: [
        { text: 'COMPANI est ravi de vous avoir accompagné et d\'avoir partagé ces moments ensemble', width: 'auto' },
        { image: emoji, width: 10, height: 10, marginLeft: 2 },
      ],
      marginBottom: 16,
    },
    {
      text: [
        'Je soussigné Thibault de Saint Blancard, représentant de l\'organisme de formation ',
        { text: 'COMPANI', bold: true },
        ', atteste que ',
        { text: trainee.identity, italics: true },
        ' a participé à la formation :',
      ],
      marginBottom: 16,
    },
    {
      canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 24, r: 0, color: COPPER_50 }],
      absolutePosition: { x: 40, y: 264 },
      marginBottom: 8,
    },
    { text: programName, style: 'programName' },
    {
      text: [
        { text: 'Durée', decoration: 'underline' },
        ` : ${duration} de formation en présentiel du `,
        { text: `${startDate} au ${endDate}`, color: COPPER_500 },
      ],
    },
    { image: lighted, width: 128, height: 118, absolutePosition: { x: 450, y: 292 } },
    {
      text: [
        { text: 'Type d\'action de formation', decoration: 'underline' },
        { text: ' : Accompagnement dans le développement de compétences', italics: true },
      ],
    },
    {
      table: {
        body: [
          [{ text: 'Assiduité du stagiaire :', style: 'subTitle' }],
          [{
            text: [
              { text: trainee.identity, italics: true },
              ' a été présent(e) à ',
              { text: `${trainee.attendanceDuration} de formation sur les ${duration} prévues.`, bold: true },
            ],
          }],
          [{ text: 'Objectifs pédagogiques :', style: 'subTitle' }],
          [{
            text: [
              'À l\'issue de cette formation, ',
              { text: trainee.identity, italics: true },
              ' est capable de : ',
            ],
          }],
          [{ text: learningGoals, color: COPPER_500 }],
          [{ text: 'Résultats de l’évaluation des acquis :', style: 'subTitle' }],
          [{
            text: [
              'Les compétences et connaissances partagées lors de la formation ont été acquises par ',
              { text: trainee.identity, italics: true },
              { text: ' et validées par un quiz d’acquisition de connaissances.' },
            ],
            marginBottom: 32,
          }],
        ],
        widths: ['75%'],
      },
      layout: { vLineWidth: () => 0, hLineWidth: () => 0 },
    },
  ];

  return {
    content: [header, body].flat(),
    defaultStyle: { font: 'Calibri', fontSize: 11 },
    pageMargins: [40, 40, 40, 280],
    styles: {
      title: { fontSize: 18, bold: true, color: COPPER_500, marginLeft: 48, marginTop: 16 },
      congratulations: { fontSize: 11, bold: true, color: ORANGE_500, marginBottom: 24 },
      subTitle: { fontSize: 16, color: COPPER_500, marginTop: 16 },
      programName: { fontSize: 12, alignment: 'center', color: COPPER_500, marginBottom: 16 },
    },
    footer(currentPage, pageCount) {
      const style = { fontSize: 9, bold: true };
      return {
        stack: [
          { text: `Fait à Paris, le ${date}` },
          { text: 'Thibault de Saint Blancard, Directeur Compani' },
          { image: signature, width: 120, marginBottom: 24 },
          { text: 'Compani', style },
          { text: '24 avenue daumesnil, 75012 Paris', style },
          { text: 'Numéro SIRET : 90512399800015 | Numéro de déclaration d’activité : 11756363475', style },
          { text: `PAGE ${currentPage.toString()} / ${pageCount}`, style, alignment: 'right' },
        ],
        marginLeft: 40,
        marginRight: 40,
        marginTop: 8,
      };
    },
  };
};
