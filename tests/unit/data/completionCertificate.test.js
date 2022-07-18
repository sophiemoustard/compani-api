const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const CompletionCertificate = require('../../../src/data/pdf/completionCertificate');
const { COPPER_50, COPPER_500, ORANGE_500 } = require('../../../src/helpers/constants');

describe('getPdfContent', () => {
  let downloadImages;

  beforeEach(() => {
    downloadImages = sinon.stub(FileHelper, 'downloadImages');
  });

  afterEach(() => {
    downloadImages.restore();
  });

  it('it should format and return pdf content', async () => {
    const paths = [
      'src/data/pdf/tmp/aux-pouce.png',
      'src/data/pdf/tmp/compani.png',
      'src/data/pdf/tmp/aux-eclaire.png',
      'src/data/pdf/tmp/smiling-emoji.png',
      'src/data/pdf/tmp/signature.png',
    ];
    downloadImages.returns(paths);

    const data = {
      duration: '15h',
      learningGoals: '- but',
      programName: 'Programme',
      startDate: '25/12/2021',
      endDate: '25/02/2022',
      trainee: { identity: 'Jean ALAIN', attendanceDuration: '14h' },
      date: '22/03/2022',
    };

    const result = await CompletionCertificate.getPdfContent(data);

    const header = {
      columns: [
        { image: paths[0], width: 64, marginTop: 8 },
        [
          { image: paths[1], width: 200, height: 42, alignment: 'right' },
          { text: 'Attestation individuelle de formation', style: 'title' },
        ],
      ],
      marginBottom: 20,
    };

    const body = [
      { text: 'Félicitations, vous avez terminé votre formation !', style: 'congratulations' },
      {
        columns: [
          { text: 'COMPANI est ravi de vous avoir accompagné et d\'avoir partagé ces moments ensemble', width: 'auto' },
          { image: paths[3], width: 10, height: 10, marginLeft: 2 },
        ],
        marginBottom: 16,
      },
      {
        text: [
          'Je soussigné Thibault de Saint Blancard, représentant de l\'organisme de formation ',
          { text: 'COMPANI', bold: true },
          ', atteste que ',
          { text: 'Jean ALAIN', italics: true },
          ' a participé à la formation :',
        ],
        marginBottom: 16,
      },
      {
        canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 24, r: 0, color: COPPER_50 }],
        absolutePosition: { x: 40, y: 264 },
        marginBottom: 8,
      },
      { text: 'Programme', style: 'programName' },
      {
        text: [
          { text: 'Durée', decoration: 'underline' },
          ' : 15h de formation en présentiel du ',
          { text: '25/12/2021 au 25/02/2022', color: COPPER_500 },
        ],
      },
      { image: paths[2], width: 128, height: 118, absolutePosition: { x: 450, y: 292 } },
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
                { text: 'Jean ALAIN', italics: true },
                ' a été présent(e) à ',
                { text: '14h de formation sur les 15h prévues.', bold: true },
              ],
            }],
            [{ text: 'Objectifs pédagogiques :', style: 'subTitle' }],
            [{
              text: [
                'À l\'issue de cette formation, ',
                { text: 'Jean ALAIN', italics: true },
                ' est capable de : ',
              ],
            }],
            [{ text: '- but', color: COPPER_500 }],
            [{ text: 'Résultats de l’évaluation des acquis :', style: 'subTitle' }],
            [{
              text: [
                'Les compétences et connaissances partagées lors de la formation ont été acquises par ',
                { text: 'Jean ALAIN', italics: true },
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

    const pdf = {
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
            { text: 'Fait à Paris, le 22/03/2022' },
            { text: 'Thibault de Saint Blancard, Directeur Compani' },
            { image: paths[4], width: 120, marginBottom: 24 },
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
    expect(JSON.stringify(result)).toEqual(JSON.stringify(pdf));

    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/aux-pouce.png', name: 'aux-pouce.png' },
      { url: 'https://storage.googleapis.com/compani-main/icons/compani_texte_bleu.png', name: 'compani.png' },
      { url: 'https://storage.googleapis.com/compani-main/aux-eclaire.png', name: 'aux-eclaire.png' },
      { url: 'https://storage.googleapis.com/compani-main/smiling-emoji.png', name: 'smiling-emoji.png' },
      { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
    ];
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});
