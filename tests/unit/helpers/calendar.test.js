const expect = require('expect');
const { getEmployeeEvents, getCustomerEvents } = require('../../../helpers/calendar');
const employees = require('../../../models/Ogust/Employee');
const customers = require('../../../models/Ogust/Customer');

describe('getEmployeeEvents', () => {
  const params = {
    isDate: true,
    startDate: 201812240000,
    endDate: 201812302359,
    id_employee: 293209296,
  };

  it('should throw a bad request as status is invalid', async () => {
    employees.getServices = () => ({
      data: {
        status: 'KO',
        message: 'Ceci est un message d\'erreur'
      }
    });

    try {
      await getEmployeeEvents({}, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Ceci est un message d\'erreur');
    }
  });

  it('should throw a not found exception as event is empty', async () => {
    employees.getServices = () => ({
      data: {
        status: 'OK',
        array_service: { result: [{ status: 'B' }] },
      }
    });

    try {
      await getEmployeeEvents({}, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(404);
      expect(e.output.payload.message).toEqual('Services Ogust non trouvés.');
    }
  });

  it('should throw a bad request exception as ogust customer response is KO', async () => {
    employees.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_customer: 1 },
            { status: 'A', id_customer: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = () => ({
      data: { status: 'KO', message: 'Joyeux Noel' },
    });

    try {
      await getEmployeeEvents(req, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Joyeux Noel');
    }
  });

  it('should throw a bad request exception as ogust third party response is KO', async () => {
    employees.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_customer: 1 },
            { status: 'A', id_customer: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = () => ({ data: { status: 'OK' } });
    customers.getThirdPartyInformationByCustomerId = () => ({
      data: { status: 'KO', message: 'Bonne année' },
    });

    try {
      await getEmployeeEvents(req, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Bonne année');
    }
  });

  it('should return formatted events', async () => {
    employees.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_customer: 1 },
            { status: 'A', id_customer: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = ({ id_customer: customerId }) => {
      if (customerId === 1) {
        return {
          data: {
            customer: {
              first_name: 'Djibril',
              id_customer: 1,
              last_name: 'Cisse',
              door_code: 1981,
              intercom_code: 9
            },
          },
        };
      }

      return {
        data: {
          customer: {
            first_name: 'David',
            id_customer: 2,
            last_name: 'Trezeguet',
            door_code: 1977,
            intercom_code: 34
          },
        },
      };
    };
    customers.getThirdPartyInformationByCustomerId = () => ({
      data: {
        thirdPartyInformations: {
          array_values: {
            NIVEAU: 'Attaquant',
          },
        },
      },
    });

    const events = await getEmployeeEvents(req, params);
    expect(events.length).toEqual(2);
    expect(events[0]).toEqual({
      status: 'A',
      id_customer: 1,
      customer: {
        id_customer: 1,
        title: undefined,
        firstname: 'Djibril',
        lastname: 'Cisse',
        door_code: 1981,
        intercom_code: 9,
        pathology: 'Attaquant',
        comments: '-',
        interventionDetails: '-',
        misc: '-',
      }
    });
    expect(events[1]).toEqual({
      status: 'A',
      id_customer: 2,
      customer: {
        id_customer: 2,
        title: undefined,
        firstname: 'David',
        lastname: 'Trezeguet',
        door_code: 1977,
        intercom_code: 34,
        pathology: 'Attaquant',
        comments: '-',
        interventionDetails: '-',
        misc: '-',
      }
    });
  });
});

describe('getCustomerEvents', () => {
  const params = {
    isDate: true,
    startDate: 201812240000,
    endDate: 201812302359,
    id_customer: 293209296,
  };

  it('should throw a bad request as status is invalid', async () => {
    customers.getServices = () => ({
      data: {
        status: 'KO',
        message: 'Ceci est un message d\'erreur'
      }
    });

    try {
      await getCustomerEvents({}, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Ceci est un message d\'erreur');
    }
  });

  it('should throw a not found exception as event is empty', async () => {
    customers.getServices = () => ({
      data: {
        status: 'OK',
        array_service: { result: [{ status: 'B' }] },
      }
    });

    try {
      await getCustomerEvents({}, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(404);
      expect(e.output.payload.message).toEqual('Services Ogust non trouvés.');
    }
  });

  it('should throw a bad request exception as ogust customer response is KO', async () => {
    employees.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_employee: 1 },
            { status: 'A', id_employee: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = () => ({
      data: { status: 'KO', message: 'Joyeux Noel' },
    });

    try {
      await getEmployeeEvents(req, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Joyeux Noel');
    }
  });

  it('should throw a bad request exception as ogust third party response is KO', async () => {
    employees.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_employee: 1 },
            { status: 'A', id_employee: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = () => ({ data: { status: 'OK' } });
    customers.getThirdPartyInformationByCustomerId = () => ({
      data: { status: 'KO', message: 'Bonne année' },
    });

    try {
      await getEmployeeEvents(req, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Bonne année');
    }
  });

  it('should throw a bad request exception as ogust employee response is KO', async () => {
    customers.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_employee: 1 },
            { status: 'A', id_employee: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = () => ({ data: { status: 'OK', customer: {} } });
    customers.getThirdPartyInformationByCustomerId = () => ({
      data: {
        status: 'OK',
        thirdPartyInformations: { array_values: {} }
      },
    });
    employees.getEmployeeById = () => ({
      data: { status: 'KO', message: 'Ceci est un message d\'erreur' },
    });

    try {
      await getCustomerEvents(req, params);
    } catch (e) {
      expect(e.output.payload.statusCode).toEqual(400);
      expect(e.output.payload.message).toEqual('Ceci est un message d\'erreur');
    }
  });

  it('should return formatted events', async () => {
    customers.getServices = () => ({
      data: {
        status: 'OK',
        array_service: {
          result: [
            { status: 'A', id_employee: 1 },
            { status: 'A', id_employee: 2 },
          ],
        },
      }
    });

    const req = {
      headers: { 'x-access-token': 'qwertyuiop' },
      query: { status: 'A' }
    };

    customers.getCustomerById = () => ({
      data: {
        customer: {
          first_name: 'David',
          id_customer: 2,
          last_name: 'Trezeguet',
          door_code: 1977,
          intercom_code: 34,
          title: 'M',
        },
      },
    });
    customers.getThirdPartyInformationByCustomerId = () => ({
      data: {
        thirdPartyInformations: {
          array_values: {
            NIVEAU: 'Attaquant',
          },
        },
      },
    });
    employees.getEmployeeById = ({ id_employee: employeeId }) => {
      if (employeeId === 1) {
        return {
          data: {
            employee: {
              id_employee: 1,
              title: 'M',
              first_name: 'N\'golo',
              last_name: 'Kante',
            },
          }
        };
      }

      return {
        data: {
          employee: {
            id_employee: 1,
            title: 'M',
            first_name: 'Steven',
            last_name: 'Nzonzi',
          },
        }
      };
    };

    const events = await getCustomerEvents(req, params);
    expect(events.length).toEqual(2);
    expect(events[0]).toEqual({
      status: 'A',
      id_employee: 1,
      customer: {
        id_customer: 2,
        title: 'M',
        firstname: 'David',
        lastname: 'Trezeguet',
        door_code: 1977,
        intercom_code: 34,
        pathology: 'Attaquant',
        comments: '-',
        interventionDetails: '-',
        misc: '-',
      },
      employee: {
        id_employee: 1,
        title: 'M',
        firstname: 'N\'golo',
        lastname: 'Kante',
      },
    });
    expect(events[1]).toEqual({
      status: 'A',
      id_employee: 2,
      customer: {
        id_customer: 2,
        title: 'M',
        firstname: 'David',
        lastname: 'Trezeguet',
        door_code: 1977,
        intercom_code: 34,
        pathology: 'Attaquant',
        comments: '-',
        interventionDetails: '-',
        misc: '-',
      },
      employee: {
        id_employee: 1,
        title: 'M',
        firstname: 'Steven',
        lastname: 'Nzonzi',
      },
    });
  });
});
