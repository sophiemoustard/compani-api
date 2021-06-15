const sinon = require('sinon');
const expect = require('expect');
const FileHelper = require('../../../src/helpers/file');
const InterAttendanceSheet = require('../../../src/data/pdf/interAttendanceSheet');

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
      name: 'Formation Test',
      slots: [
        {
          address: '24 Avenue Daumesnil 75012 Paris',
          date: '16/09/2021',
          startHour: '10:00',
          endHour: '13:00',
          duration: '3h',
        },
        {
          address: '24 Avenue Daumesnil 75012 Paris',
          date: '16/09/2021',
          startHour: '14:00',
          endHour: '18:00',
          duration: '4h',
        },
      ],
      trainer: 'Anne ONYME',
      firstDate: '16/09/2021',
      lastDate: '28/01/2022',
      duration: '56h',
    };
    const data = {
      trainees: [
        { traineeName: 'Alain TÉRIEUR', company: 'Alenvi Home SAS', course },
        { traineeName: 'Alex TÉRIEUR', company: 'APEF Rouen', course },
      ],
    };
    const table = {
      body: [
        [
          { text: 'Créneaux', style: 'header' },
          { text: 'Durée', style: 'header' },
          { text: 'Signature stagiaire', style: 'header' },
          { text: 'Signature formateur', style: 'header' },
        ],
        [
          { stack: [{ text: '16/09/2021' }, { text: '24 Avenue Daumesnil 75012 Paris', fontSize: 8 }] },
          { stack: [{ text: '3h' }, { text: '10:00 - 13:00', fontSize: 8 }] },
          { text: '' },
          { text: '' },
        ],
        [
          { stack: [{ text: '16/09/2021' }, { text: '24 Avenue Daumesnil 75012 Paris', fontSize: 8 }] },
          { stack: [{ text: '4h' }, { text: '14:00 - 18:00', fontSize: 8 }] },
          { text: '' },
          { text: '' },
        ],
      ],
      widths: ['auto', 'auto', '*', '*'],
    };
    const pdf = {
      content: [
        {
          columns: [
            { image: paths[0], width: 64 },
            [
              { image: paths[1], width: 132, height: 28, alignment: 'right' },
              { text: 'Émargements - Alain TÉRIEUR', style: 'title' },
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
              { text: 'Nom de la formation : Formation Test', bold: true },
              { text: 'Dates : du 16/09/2021 au 28/01/2022' },
              { text: 'Durée : 56h' },
              { text: 'Structure : Alenvi Home SAS' },
              { text: 'Formateur : Anne ONYME' },
            ],
            { image: paths[2], width: 64 },
          ],
          margin: [16, 0, 24, 16],
        },
        { table, marginBottom: 8 },
        {
          columns: [
            { text: 'Signature et tampon de l\'organisme de formation :' },
            {
              image: paths[3],
              width: 96,
              pageBreak: 'after',
              marginTop: 8,
              alignment: 'right',
            },
          ],
        },
        {
          columns: [
            { image: paths[0], width: 64 },
            [
              { image: paths[1], width: 132, height: 28, alignment: 'right' },
              { text: 'Émargements - Alex TÉRIEUR', style: 'title' },
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
              { text: 'Nom de la formation : Formation Test', bold: true },
              { text: 'Dates : du 16/09/2021 au 28/01/2022' },
              { text: 'Durée : 56h' },
              { text: 'Structure : APEF Rouen' },
              { text: 'Formateur : Anne ONYME' },
            ],
            { image: paths[2], width: 64 },
          ],
          margin: [16, 0, 24, 16],
        },
        { table, marginBottom: 8 },
        {
          columns: [
            { text: 'Signature et tampon de l\'organisme de formation :' },
            {
              image: paths[3],
              width: 96,
              pageBreak: 'none',
              marginTop: 8,
              alignment: 'right',
            },
          ],
        },
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

    const result = await InterAttendanceSheet.getPdfContent(data);

    expect(result).toMatchObject(pdf);
    sinon.assert.calledOnceWithExactly(downloadImages, imageList);
  });
});
