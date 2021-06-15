const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const IntraAttendanceSheet = require('../../../src/data/pdf/intraAttendanceSheet');

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
      'src/data/pdf/tmp/conscience.png',
      'src/data/pdf/tmp/compani.png',
      'src/data/pdf/tmp/decision.png',
      'src/data/pdf/tmp/signature.png',
    ];
    const course = {
      name: 'La communication empathique - Groupe 3',
      duration: '5h',
      company: 'Alenvi Home SAS',
      trainer: 'Anne Onyme',
    };
    const data = {
      dates: [
        {
          course,
          address: 'Rue Jean Jaurès 59620 Aulnoye-Aymeries',
          slots: [{ startHour: '09h30', endHour: '12h' }],
          date: '05/03/2020',
        },
        {
          course,
          address: '2 Place de la Concorde 59600 Maubeuge',
          slots: [{ startHour: '09h30', endHour: '12h' }],
          date: '08/09/2020',
        },
      ],
    };
    const table = {
      body: [
        [{ text: 'Prénom NOM', style: 'header' }, { text: '09h30 - 12h', style: 'header' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: '' }, { text: '' }],
        [{ text: 'Signature du formateur', italics: true, margin: [0, 10, 0, 0] }, { text: '' }],
      ],
      widths: ['*', '*'],
      heights: ['auto', 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    };
    const pdf = {
      content: [
        {
          columns: [
            { image: paths[0], width: 64 },
            [
              { image: paths[1], width: 132, height: 28, alignment: 'right' },
              { text: 'Feuille d\'émargement - 05/03/2020', style: 'title' },
            ],
          ],
          marginBottom: 20,
        },
        {
          canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 100, r: 0, color: '#FEF4E4' }],
          absolutePosition: { x: 40, y: 150 },
        },
        {
          columns: [
            [
              { text: 'Nom de la formation : La communication empathique - Groupe 3', bold: true },
              { text: 'Durée : 5h' },
              { text: 'Lieu : Rue Jean Jaurès 59620 Aulnoye-Aymeries' },
              { text: 'Structure : Alenvi Home SAS' },
              { text: 'Intervenant : Anne Onyme' },
            ],
            { image: paths[2], width: 64 },
          ],
          margin: [16, 0, 24, 16],
        },
        { table, marginBottom: 8 },
        { columns: [
          { text: 'Signature et tampon de l\'organisme de formation :', bold: true },
          {
            image: paths[3],
            width: 80,
            pageBreak: 'after',
            marginTop: 8,
            alignment: 'right',
          },
        ] },
        {
          columns: [
            { image: paths[0], width: 64 },
            [
              { image: paths[1], width: 132, height: 28, alignment: 'right' },
              { text: 'Feuille d\'émargement - 08/09/2020', style: 'title' },
            ],
          ],
          marginBottom: 20,
        },
        {
          canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 100, r: 0, color: '#FEF4E4' }],
          absolutePosition: { x: 40, y: 150 },
        },
        {
          columns: [
            [
              { text: 'Nom de la formation : La communication empathique - Groupe 3', bold: true },
              { text: 'Durée : 5h' },
              { text: 'Lieu : 2 Place de la Concorde 59600 Maubeuge' },
              { text: 'Structure : Alenvi Home SAS' },
              { text: 'Intervenant : Anne Onyme' },
            ],
            { image: paths[2], width: 64 },
          ],
          margin: [16, 0, 24, 16],
        },
        { table, marginBottom: 8 },
        { columns: [
          { text: 'Signature et tampon de l\'organisme de formation :', bold: true },
          {
            image: paths[3],
            width: 80,
            pageBreak: 'none',
            marginTop: 8,
            alignment: 'right',
          },
        ] },
      ],
      defaultStyle: { font: 'SourceSans', fontSize: 10 },
      styles: {
        header: {
          bold: true,
          fillColor: '#7B0046',
          color: 'white',
          alignment: 'center',
        },
        title: {
          fontSize: 16,
          bold: true,
          margin: [8, 32, 0, 0],
          alignment: 'left',
          color: '#7B0046',
        },
      },
    };
    const imageList = [
      { url: 'https://storage.googleapis.com/compani-main/aux-conscience-eclairee.png', name: 'conscience.png' },
      { url: 'https://storage.googleapis.com/compani-main/compani_text_orange.png', name: 'compani.png' },
      { url: 'https://storage.googleapis.com/compani-main/aux-prisededecision.png', name: 'decision.png' },
      { url: 'https://storage.googleapis.com/compani-main/tsb_signature.png', name: 'signature.png' },
    ];

    downloadImages.returns(paths);

    const result = await IntraAttendanceSheet.getPdfContent(data);

    expect(result).toMatchObject(pdf);
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});
