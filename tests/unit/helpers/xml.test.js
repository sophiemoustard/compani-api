/* eslint-disable max-len */
const sinon = require('sinon');
const { expect } = require('expect');
const moment = require('moment');
const { ObjectId } = require('mongodb');
const fs = require('fs').promises;
const {
  generateSEPAHeader,
  generatePaymentInfo,
  addTransactionInfo,
  generateSEPAXml,
} = require('../../../src/helpers/xml');
const utils = require('../../../src/helpers/utils');
const GDriveStorageHelper = require('../../../src/helpers/gDriveStorage');
const { PAYMENT } = require('../../../src/helpers/constants');

describe('XML helper', () => {
  let getFixedNbStub = null;
  beforeEach(() => {
    getFixedNbStub = sinon.stub(utils, 'getFixedNumber');
  });
  afterEach(() => {
    getFixedNbStub.restore();
  });
  describe('generateSEPAHeader', () => {
    it('should return a sepa header object', () => {
      const data = {
        id: '123456',
        created: new Date(),
        txNumber: 2,
        sum: 110,
        initiatorName: 'Test',
        ics: '123456',
      };
      getFixedNbStub.returns(data.sum.toFixed(2));
      const result = generateSEPAHeader(data);

      expect(result).toBeDefined();
      expect(result).toEqual(expect.objectContaining({
        MsgId: data.id,
        CreDtTm: moment(data.created).format('YYYY-MM-DDTHH:mm:ss'),
        NbOfTxs: data.txNumber,
        CtrlSum: '110.00',
        InitgPty: {
          Nm: data.initiatorName,
          Id: {
            OrgId: {
              Othr: {
                Id: data.ics,
              },
            },
          },
        },
      }));
    });
  });

  describe('generatePaymentInfo', () => {
    it('should return sepa payment info object', () => {
      const data = {
        id: '123456',
        sequenceType: 'RCUR',
        method: 'DD',
        txNumber: 5,
        sum: 350,
        collectionDate: new Date(),
        creditor: {
          name: 'Test',
          iban: '098765432111234567890',
          bic: '12345678',
          ics: '1234567',
        },
      };
      getFixedNbStub.returns(data.sum.toFixed(2));
      const result = generatePaymentInfo(data);

      expect(result).toBeDefined();
      expect(result).toEqual(expect.objectContaining({
        PmtInfId: data.id,
        PmtMtd: data.method,
        NbOfTxs: data.txNumber,
        CtrlSum: '350.00',
        PmtTpInf: {
          SvcLvl: {
            Cd: 'SEPA',
          },
          LclInstrm: {
            Cd: 'CORE',
          },
          SeqTp: data.sequenceType,
        },
        ReqdColltnDt: moment(data.collectionDate).format('YYYY-MM-DD'),
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
          },
        },
        ChrgBr: 'SLEV',
        CdtrSchmeId: {
          Id: {
            PrvtId: {
              Othr: {
                Id: data.creditor.ics,
                SchmeNm: {
                  Prtry: 'SEPA',
                },
              },
            },
          },
        },
        DrctDbtTxInf: [],
      }));
    });
  });

  describe('addTransactionInfo', () => {
    it('should return sepa payment info with transactions info', () => {
      const paymentInfoObj = {
        PmtInfId: '1234566',
        PmtMtd: 'DD',
        NbOfTxs: 10,
        CtrlSum: '1350.00',
        PmtTpInf: {
          SvcLvl: { Cd: 'SEPA' },
          LclInstrm: { Cd: 'CORE' },
          SeqTp: 'RCUR',
        },
        ReqdColltnDt: moment().format('YYYY-MM-DD'),
        Cdtr: { Nm: 'TEST' },
        CdtrAcct: {
          Id: { IBAN: '12345678900987654321' },
          Ccy: 'EUR',
        },
        CdtrAgt: {
          FinInstnId: { BIC: '12345678' },
        },
        ChrgBr: 'SLEV',
        CdtrSchmeId: {
          Id: {
            PrvtId: {
              Othr: {
                Id: '123456789',
                SchmeNm: {
                  Prtry: 'SEPA',
                },
              },
            },
          },
        },
        DrctDbtTxInf: [],
      };

      const customersList = [{
        _id: new ObjectId(),
        identity: { title: 'mr', firstname: 'Romain', lastname: 'Bardet' },
        payment: { bankAccountOwner: 'David gaudu', mandates: [{ rum: 'R012345678903456789' }], bic: '', iban: '' },
      }, {
        _id: new ObjectId(),
        identity: { title: 'mr', firstname: 'Egan', lastname: 'Bernal' },
        payment: {
          bankAccountOwner: 'Lance Amstrong',
          iban: 'FR3514508000505917721779B12',
          bic: 'BNMDHISOBD',
          mandates: [{ rum: 'R09876543456765432', _id: new ObjectId(), signedAt: moment().toDate() }],
        },
      }];
      const payments = [
        {
          _id: new ObjectId(),
          date: moment().toDate(),
          number: 'REG-1904001',
          customer: customersList[0]._id,
          customerInfo: customersList[0],
          netInclTaxes: 900,
          nature: PAYMENT,
          type: 'direct_debit',
        },
        {
          _id: new ObjectId(),
          date: moment().toDate(),
          number: 'REG-1904002',
          customer: customersList[1]._id,
          customerInfo: customersList[1],
          netInclTaxes: 250,
          nature: PAYMENT,
          type: 'direct_debit',
        },
      ];
      getFixedNbStub.onCall(0).returns(payments[0].netInclTaxes.toFixed(2));
      getFixedNbStub.onCall(1).returns(payments[1].netInclTaxes.toFixed(2));
      const result = addTransactionInfo(paymentInfoObj, payments);

      expect(result).toBeDefined();
      expect(result).toEqual(expect.objectContaining({
        PmtInfId: '1234566',
        PmtMtd: 'DD',
        NbOfTxs: 10,
        CtrlSum: '1350.00',
        PmtTpInf: {
          SvcLvl: { Cd: 'SEPA' },
          LclInstrm: { Cd: 'CORE' },
          SeqTp: 'RCUR',
        },
        ReqdColltnDt: moment().format('YYYY-MM-DD'),
        Cdtr: { Nm: 'TEST' },
        CdtrAcct: {
          Id: { IBAN: '12345678900987654321' },
          Ccy: 'EUR',
        },
        CdtrAgt: {
          FinInstnId: { BIC: '12345678' },
        },
        ChrgBr: 'SLEV',
        CdtrSchmeId: {
          Id: {
            PrvtId: {
              Othr: {
                Id: '123456789',
                SchmeNm: {
                  Prtry: 'SEPA',
                },
              },
            },
          },
        },
        DrctDbtTxInf: [
          {
            PmtId: {
              InstrId: payments[0].number,
              EndToEndId: payments[0]._id.toHexString(),
            },
            InstdAmt: {
              '@Ccy': 'EUR',
              '#text': payments[0].netInclTaxes.toFixed(2),
            },
            DrctDbtTx: {
              MndtRltdInf: {
                MndtId: payments[0].customerInfo.payment.mandates[payments[0].customerInfo.payment.mandates.length - 1].rum,
                DtOfSgntr: moment(payments[0].customerInfo.payment.mandates[payments[0].customerInfo.payment.mandates.length - 1].signedAt).format('YYYY-MM-DD'),
              },
            },
            DbtrAgt: {
              FinInstnId: {
                BIC: payments[0].customerInfo.payment.bic,
              },
            },
            Dbtr: { Nm: payments[0].customerInfo.payment.bankAccountOwner },
            DbtrAcct: {
              Id: { IBAN: payments[0].customerInfo.payment.iban },
            },
          },
          {
            PmtId: {
              InstrId: payments[1].number,
              EndToEndId: payments[1]._id.toHexString(),
            },
            InstdAmt: {
              '@Ccy': 'EUR',
              '#text': payments[1].netInclTaxes.toFixed(2),
            },
            DrctDbtTx: {
              MndtRltdInf: {
                MndtId: payments[1].customerInfo.payment.mandates[payments[1].customerInfo.payment.mandates.length - 1].rum,
                DtOfSgntr: moment(payments[1].customerInfo.payment.mandates[payments[1].customerInfo.payment.mandates.length - 1].signedAt).format('YYYY-MM-DD'),
              },
            },
            DbtrAgt: {
              FinInstnId: {
                BIC: payments[1].customerInfo.payment.bic,
              },
            },
            Dbtr: { Nm: payments[1].customerInfo.payment.bankAccountOwner },
            DbtrAcct: {
              Id: { IBAN: payments[1].customerInfo.payment.iban },
            },
          },
        ],
      }));
    });
  });

  describe('generateSEPAXml', () => {
    it('should return output path of created sepa xml', async () => {
      const docObj = {
        Document: {
          '@xlmns': 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02',
          '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          '@xsi:schemaLocation': 'urn:iso:std:iso:20022:tech:xsd:pain.008.001.02 pain.008.001.02.xsd',
          CstmrDrctDbtInitn: {
            GrpHdr: {},
            PmtInf: [],
          },
        },
      };
      const header = {
        MsgId: '1234566',
        CreDtTm: moment().format('YYYY-MM-DDTHH:mm:ss'),
        NbOfTxs: 10,
        CtrlSum: '1110.00',
        InitgPty: {
          Nm: 'TEST',
          Id: {
            OrgId: {
              Othr: {
                Id: '1234567890',
              },
            },
          },
        },
      };
      const paymentInfo = {
        PmtInfId: '1234566',
        PmtMtd: 'DD',
        NbOfTxs: 2,
        CtrlSum: '1350.00',
        PmtTpInf: {
          SvcLvl: { Cd: 'SEPA' },
          LclInstrm: { Cd: 'CORE' },
          SeqTp: 'RCUR',
        },
        ReqdColltnDt: moment().format('YYYY-MM-DD'),
        Cdtr: { Nm: 'TEST' },
        CdtrAcct: {
          Id: { IBAN: '12345678900987654321' },
          Ccy: 'EUR',
        },
        CdtrAgt: {
          FinInstnId: { BIC: '12345678' },
        },
        ChrgBr: 'SLEV',
        CdtrSchmeId: {
          Id: {
            PrvtId: {
              Othr: {
                Id: '123456789',
                SchmeNm: {
                  Prtry: 'SEPA',
                },
              },
            },
          },
        },
        DrctDbtTxInf: [
          {
            PmtId: {
              InstrId: '12345678',
              EndToEndId: '12345635678990',
            },
            InstdAmt: {
              '@Ccy': 'EUR',
              '#text': '1000.00',
            },
            DrctDbtTx: {
              MndtRltdInf: {
                MndtId: 'R1234567890',
                DtOfSgntr: moment().format('YYYY-MM-DD'),
              },
            },
            DbtrAgt: {
              FinInstnId: { BIC: '12345678' },
            },
            Dbtr: { Nm: 'SuperTest' },
            DbtrAcct: {
              Id: { IBAN: '12345678900987654321' },
            },
          },
          {
            PmtId: {
              InstrId: '098765432',
              EndToEndId: '0987654321',
            },
            InstdAmt: {
              '@Ccy': 'EUR',
              '#text': '350.00',
            },
            DrctDbtTx: {
              MndtRltdInf: {
                MndtId: 'R0987654321',
                DtOfSgntr: moment().format('YYYY-MM-DD'),
              },
            },
            DbtrAgt: {
              FinInstnId: {
                BIC: '0987654321',
              },
            },
            Dbtr: { Nm: 'MegaTest' },
            DbtrAcct: {
              Id: { IBAN: '09876543210987654321' },
            },
          },
        ],
      };
      const addFileStub = sinon.stub(GDriveStorageHelper, 'addFile').returns({ id: '1234567890' });
      const result = await generateSEPAXml(docObj, header, '1234567890', paymentInfo);

      expect(result).toBeDefined();
      const stat = await fs.lstat(result);
      expect(stat.isFile()).toBe(true);
      sinon.assert.calledOnce(addFileStub);
      addFileStub.restore();
    });
  });
});
