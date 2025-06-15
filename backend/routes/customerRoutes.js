// customerRoutes.js

const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../services/authMiddleware");
const {
  getCustomerProfile,
  updateCustomerProfile,
  listItems,
  getItem,
  searchItems,
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getOrderHistory,
  getOrderById,
  cancelOrder,
  trackOrder,
  listFavorites,
  addFavorite,
  removeFavorite,
  submitProductRating,
  submitFarmerRating,
  getLoyaltyPoints,
  redeemPoints,
  listCoupons,
  applyCoupon,
  submitSupportTicket,
  getSupportTickets,
  addSupportReply,
  getNotifications,
  markNotificationRead,
  getPreferences,
  updatePreferences,
  getRecommendations,
} = require("../controllers/customerController");

router.use(authenticate);
router.use(requireRole("customer"));

router.get("/profile", getCustomerProfile);
router.put("/profile", updateCustomerProfile);

router.get("/items", listItems);
router.get("/items/search", searchItems); // ✅ MOVE THIS BEFORE :itemId
router.get("/items/:itemId", getItem); // ✅ PARAMETERIZED ROUTE COMES LAST

router.get("/cart", getCart);
router.post("/cart", addToCart);
router.put("/cart/:itemId", updateCartItem);
router.delete("/cart/:itemId", removeCartItem);
router.delete("/cart", clearCart);

router.post("/orders", createOrder);
router.get("/orders", getOrderHistory);
router.get("/orders/:orderId", getOrderById);
router.post("/orders/:orderId/cancel", cancelOrder);
router.get("/orders/:orderId/track", trackOrder);

router.get("/favorites", listFavorites);
router.post("/favorites/:itemId", addFavorite);
router.delete("/favorites/:itemId", removeFavorite);

router.post("/ratings/product", submitProductRating);
router.post("/ratings/farmer", submitFarmerRating);

router.get("/loyalty", getLoyaltyPoints);
router.post("/loyalty/redeem", redeemPoints);

router.get("/coupons", listCoupons);
router.post("/coupons/apply", applyCoupon);

router.post("/support/tickets", submitSupportTicket);
router.get("/support/tickets", getSupportTickets);
router.post("/support/tickets/:ticketId/reply", addSupportReply);

router.get("/notifications", getNotifications);
router.post("/notifications/:notificationId/read", markNotificationRead);

router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

router.get("/recommendations", getRecommendations);

module.exports = router;
