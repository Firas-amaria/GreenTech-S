const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../services/authMiddleware');
const {
  listFarms,
  getFarm,
  listCrops,
  getCrop,
  reportCrop,
  updateCrop,
  deleteCrop,
  getCropReport,
  listShipments,
  getShipment,
  createShipment,
  generateBarcode,
  listItems,
  getItem,
  listRatings,
  getRating,
  createRating,
  getDashboard,
  getPerformance
} = require('../controllers/farmerController');

router.use(authenticate, requireRole('farmer'));

// Farm
router.get('/farms',authenticate, listFarms);
router.get('/farms/:farmId',authenticate, getFarm);

// Crop / Report
router.get('/farms/:farmId/crops',authenticate, listCrops);
router.get('/farms/:farmId/crops/:cropId',authenticate,  getCrop);
router.post('/report-crop',authenticate,  reportCrop);
router.put('/crops/:cropId',authenticate,  updateCrop);
router.delete('/crops/:cropId',authenticate,  deleteCrop);
router.get('/crops/:cropId/report',authenticate,  getCropReport);

// Shipment
router.get('/shipments',authenticate,  listShipments);
router.get('/shipments/:shipmentId',authenticate,  getShipment);
router.post('/shipments',authenticate,  createShipment);
router.post('/shipments/:shipmentId/barcode',authenticate,  generateBarcode);

// Item
router.get('/items',authenticate,  listItems);
router.get('/items/:itemId',authenticate,  getItem);

// Rating
router.get('/ratings',authenticate,  listRatings);
router.get('/ratings/:ratingId',authenticate,  getRating);
router.post('/ratings',authenticate,  createRating);

// Dashboard & Performance
router.get('/dashboard',authenticate,  getDashboard);
router.get('/performance',authenticate,  getPerformance);

module.exports = router;
