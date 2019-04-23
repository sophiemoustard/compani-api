const builder = require('xmlbuilder');
const moment = require('moment');
const fs = require('fs');
const os = require('os');
const path = require('path');

const createDocument = () => ({
  Document: {
    '@xlmns': 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02',
    '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
    '@xsi:schemaLocation': 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02 pain.008.001.02.xsd',
    CstmrDrctDbtInitn: {
      GrpHdr: {},
      PmtInf: [],
    },
  }
});

const generateSEPAHeader = data => ({
  MsgId: data.id,
  CreDtTm: data.created,
  NbOfTxs: data.txNumber,
  CtrlSum: data.sum,
  InitgPty: {
    Nm: data.initiatorName,
    Id: {
      OrgId: {
        Othr: {
          Id: data.ics
        }
      }
    }
  }
});

const generatePaymentInfo = data => ({
  PmtInfId: data.id,
  PmtMtd: data.method,
  NbOfTxs: data.txNumber,
  CtrlSum: data.sum,
  PmtTpInf: {
    SvcLvl: {
      Cd: 'SEPA',
    },
    LclInstrm: {
      Cd: 'CORE',
    },
    SeqTp: data.sequenceType,
  },
  ReqColltnDt: data.collectionDate,
  Cdtr: {
    Nm: data.creditor.name,
  },
  CdtrAcct: {
    Id: {
      IBAN: data.creditor.iban,
    },
    Ccy: 'EUR',
  },
  CdtrAgt: {
    FinInstnId: {
      BIC: data.creditor.bic,
    }
  },
  ChrgBr: 'SLEV',
  CdtrSchmeId: {
    Id: {
      PrvtId: {
        Othr: {
          Id: data.creditor.ics,
          SchmeNm: {
            Prtry: 'SEPA'
          }
        }
      }
    }
  },
  DrctDbtTxInf: []
});

const addTransactionInfo = (paymentInfoObj, data) => {
  for (const transaction of data) {
    paymentInfoObj.DrctDbtTxInf.push({
      PmtId: {
        InstrId: transaction.number,
        EndToEndId: transaction._id,
      },
      InstdAmt: {
        '@Ccy': 'EUR',
        '#text': transaction.netInclTaxes,
      },
      DrctDbtTx: {
        MndtRltdInf: {
          MndtId: transaction.customerInfo.payment.mandates[transaction.customerInfo.payment.mandates.length - 1].rum,
          DtOfSgntr: moment(transaction.customerInfo.payment.mandates[transaction.customerInfo.payment.mandates.length - 1].signedAt).toDate(),
        }
      },
      DbtrAgt: {
        FinInstnId: {
          BIC: transaction.customerInfo.payment.bic,
        }
      },
      Dbtr: { Nm: transaction.customerInfo.payment.bankAccountOwner },
      DbtrAcct: {
        Id: { IBAN: transaction.customerInfo.payment.iban },
      },
    });
  }

  return paymentInfoObj;
};

const generateSEPAXml = (docObj, header, ...paymentsInfo) => {
  docObj.Document.CstmrDrctDbtInitn.GrpHdr = header;
  for (const info of paymentsInfo) {
    if (info) docObj.Document.CstmrDrctDbtInitn.PmtInf.push(info);
  }
  const finalDoc = builder.create(docObj, { encoding: 'utf-8' });
  const file = fs.createWriteStream(path.join(os.tmpdir(), `${docObj.Document.CstmrDrctDbtInitn.GrpHdr.MsgId}.xml`));
  file.write(finalDoc.end({ pretty: true }));
};

module.exports = {
  createDocument,
  generateSEPAHeader,
  generatePaymentInfo,
  addTransactionInfo,
  generateSEPAXml,
};
