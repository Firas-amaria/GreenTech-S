// Entry file for bundling qrcode library for browser
const QRCode = require("qrcode");

// Expose QRCode globally for browser use
window.QRCode = QRCode;
