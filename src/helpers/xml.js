const builder = require('xmlbuilder');
const moment = require('moment');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { getFixedNumber, removeSpaces, getLastVersion } = require('./utils');
const gDriveStorageHelper = require('./gDriveStorage');

const createDocument = () => ({
  Document: {
    '@xmlns': 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02',
    '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    '@xsi:schemaLocation': 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02 pain.008.001.02.xsd',
    CstmrDrctDbtInitn: {
      GrpHdr: {},
      PmtInf: [],
    },
  },
});

const generateSEPAHeader = data => ({
  MsgId: data.id,
  CreDtTm: moment(data.created).format('YYYY-MM-DDTHH:mm:ss'),
  NbOfTxs: data.txNumber,
  CtrlSum: getFixedNumber(data.sum, 2),
  InitgPty: {
    Nm: data.initiatorName,
    Id: {
      OrgId: {
        Othr: {
          Id: removeSpaces(data.ics),
        },
      },
    },
  },
});

const generatePaymentInfo = data => ({
  PmtInfId: data.id,
  PmtMtd: data.method,
  NbOfTxs: data.txNumber,
  CtrlSum: getFixedNumber(data.sum, 2),
  PmtTpInf: {
    SvcLvl: { Cd: 'SEPA' },
    LclInstrm: { Cd: 'CORE' },
    SeqTp: data.sequenceType,
  },
  ReqdColltnDt: moment(data.collectionDate).format('YYYY-MM-DD'),
  Cdtr: { Nm: data.creditor.name },
  CdtrAcct: {
    Id: { IBAN: removeSpaces(data.creditor.iban) },
    Ccy: 'EUR',
  },
  CdtrAgt: {
    FinInstnId: { BIC: removeSpaces(data.creditor.bic) },
  },
  ChrgBr: 'SLEV',
  CdtrSchmeId: {
    Id: {
      PrvtId: {
        Othr: {
          Id: removeSpaces(data.creditor.ics),
          SchmeNm: { Prtry: 'SEPA' },
        },
      },
    },
  },
  DrctDbtTxInf: [],
});

const addTransactionInfo = (paymentInfoObj, data) => {
  for (const transaction of data) {
    const lastMandate = getLastVersion(transaction.customerInfo.payment.mandates, 'createdAt');
    paymentInfoObj.DrctDbtTxInf.push({
      PmtId: {
        InstrId: transaction.number,
        EndToEndId: transaction._id.toHexString(),
      },
      InstdAmt: {
        '@Ccy': 'EUR',
        '#text': getFixedNumber(transaction.netInclTaxes, 2),
      },
      DrctDbtTx: {
        MndtRltdInf: {
          MndtId: lastMandate.rum,
          DtOfSgntr: moment(lastMandate.signedAt).format('YYYY-MM-DD'),
        },
      },
      DbtrAgt: {
        FinInstnId: {
          BIC: removeSpaces(transaction.customerInfo.payment.bic),
        },
      },
      Dbtr: { Nm: transaction.customerInfo.payment.bankAccountOwner.trim() },
      DbtrAcct: {
        Id: { IBAN: removeSpaces(transaction.customerInfo.payment.iban) },
      },
    });
  }

  return paymentInfoObj;
};

const generateSEPAXml = async (docObj, header, folderId, ...paymentsInfo) => new Promise((resolve, reject) => {
  const newObj = { ...docObj };
  newObj.Document.CstmrDrctDbtInitn.GrpHdr = header;
  for (const info of paymentsInfo) {
    if (info) newObj.Document.CstmrDrctDbtInitn.PmtInf.push(info);
  }
  const finalDoc = builder.create(newObj, { encoding: 'utf-8' });
  const outputPath = path.join(os.tmpdir(), `${newObj.Document.CstmrDrctDbtInitn.GrpHdr.MsgId}.xml`);
  const file = fs.createWriteStream(outputPath);
  file.write(finalDoc.end({ pretty: true }));
  file.end();
  file.on('finish', async () => {
    await gDriveStorageHelper.addFile({
      driveFolderId: folderId,
      name: `prélèvements_${moment().format('YYYYMMDD_HHmm')}.xml`,
      type: 'text/xml',
      body: fs.createReadStream(outputPath),
    });
    resolve(outputPath);
  });
  file.on('error', err => reject(err));
});

module.exports = {
  createDocument,
  generateSEPAHeader,
  generatePaymentInfo,
  addTransactionInfo,
  generateSEPAXml,
};
