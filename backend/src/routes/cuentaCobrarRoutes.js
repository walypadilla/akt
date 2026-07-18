const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const cuentaCobrarController = require('../controllers/cuentaCobrarController');

const router = express.Router();
router.use(authMiddleware);

router.get('/', cuentaCobrarController.obtenerCuentasCobrar);
router.put('/:id/pagar', cuentaCobrarController.marcarComoPagada);

module.exports = router;