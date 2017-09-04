const express = require('express');

const router = express.Router();

const { checkOgustToken } = require('../../helpers/checkOgustToken');
const tokenConfig = require('../../config/strategies').token;
const tokenProcess = require('../../helpers/tokenProcess');

const customerController = require('./../../controllers/Ogust/customerController');
const employeeController = require('./../../controllers/Ogust/employeeController');
const tokenController = require('./../../controllers/Ogust/tokenController');
const serviceController = require('./../../controllers/Ogust/serviceController');

router.get('/token', tokenProcess.decode({ secret: tokenConfig.secret }), tokenController.get);

if (process.env.NODE_ENV == 'development') {
  router.get('/tests/token/:id', (req, res) => {
    const jwt = require('jsonwebtoken');
    const payload = {
      _id: req.params.id
    };
    const token = jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: '24h' });
    res.status(200).json({ success: true, message: 'Token bien encrypté !', data: { token } });
  });
}

// Routes protection by token
router.use(checkOgustToken);

router.get('/employees', employeeController.getAll);
router.get('/employees/sector/:sector', employeeController.getAllBySector);
router.get('/employees/:id', employeeController.getById);
router.get('/employees/:id/services', employeeController.getEmployeeServices);
router.get('/employees/:id/customers', employeeController.getEmployeeCustomers);
router.get('/employees/:id/salaries', employeeController.getEmployeeSalaries);

router.get('/customers', customerController.getAll);
router.get('/customers/:id', customerController.getById);
router.get('/customers/:id/services', customerController.getCustomerServices);
router.get('/customers/:id/moreInfo', customerController.getThirdPartyInformation);
router.put('/customers/:id/moreInfo', customerController.editThirdPartyInformation);

router.get('/services', serviceController.getAll);
router.get('/services/:id', serviceController.getById);

module.exports = router;
