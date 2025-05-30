// tests/farmer-healthcheck.js
// Simple health-check script for Farmer API without external libraries
// Usage: TOKEN and BASE_URL env vars must be set
require("dotenv").config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:4000/api/farmer';
const TOKEN = process.env.TOKEN;


if (!TOKEN) {
  console.error('Error: TOKEN environment variable is required');
  process.exit(1);
}

async function call(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch(_) {}
  return { status: res.status, data };
}

(async function runTests() {
  console.log('Running Farmer API health-check tests...');
  let farmId, cropId, shipmentId, itemId, ratingId;
  
  // 1. List farms
  let res = await call('GET', '/farms');
  console.log('GET /farms', res.status);
  if (res.status === 200 && Array.isArray(res.data) && res.data.length) {
    farmId = res.data[0].id;
  }
  
  // 2. Get farm by ID
  if (farmId) {
    res = await call('GET', `/farms/${farmId}`);
    console.log(`GET /farms/${farmId}`, res.status);
  }

  // 3. List crops
  if (farmId) {
    res = await call('GET', `/farms/${farmId}/crops`);
    console.log(`GET /farms/${farmId}/crops`, res.status);
    if (res.status === 200 && Array.isArray(res.data) && res.data.length) {
      cropId = res.data[0].id;
    }
  }

  // 4. Report new crop
  if (farmId) {
    // assume an existing itemId from previous runs or tests
    itemId = 'item_placeholder_id';
    res = await call('POST', '/report-crop', { farmId, itemId, status: 'growing' });
    console.log('POST /report-crop', res.status);
    if (res.status === 201) cropId = res.data.cropId;
  }

  // 5. Get crop report DTO
  if (cropId) {
    res = await call('GET', `/crops/${cropId}/report`);
    console.log(`GET /crops/${cropId}/report`, res.status);
  }

  // 6. Update crop
  if (cropId) {
    res = await call('PUT', `/crops/${cropId}`, { status: 'harvested' });
    console.log(`PUT /crops/${cropId}`, res.status);
  }

  // 7. Delete crop
  if (cropId) {
    res = await call('DELETE', `/crops/${cropId}`);
    console.log(`DELETE /crops/${cropId}`, res.status);
  }

  // 8. List items
  res = await call('GET', '/items');
  console.log('GET /items', res.status);
  if (res.status === 200 && Array.isArray(res.data) && res.data.length) {
    itemId = res.data[0].id;
  }

  // 9. Get item
  if (itemId) {
    res = await call('GET', `/items/${itemId}`);
    console.log(`GET /items/${itemId}`, res.status);
  }

  // 10. List shipments
  res = await call('GET', '/shipments');
  console.log('GET /shipments', res.status);

  // 11. Create shipment
  if (farmId && itemId) {
    res = await call('POST', '/shipments', { farmId, items: [{ itemId, weight: 5, volume: 0.2 }] });
    console.log('POST /shipments', res.status);
    if (res.status === 201) shipmentId = res.data.shipmentId;
  }

  // 12. Generate barcode
  if (shipmentId) {
    res = await call('POST', `/shipments/${shipmentId}/barcode`);
    console.log(`POST /shipments/${shipmentId}/barcode`, res.status);
  }

  // 13. Get shipment
  if (shipmentId) {
    res = await call('GET', `/shipments/${shipmentId}`);
    console.log(`GET /shipments/${shipmentId}`, res.status);
  }

  // 14. List ratings
  res = await call('GET', '/ratings');
  console.log('GET /ratings', res.status);

  // 15. Create rating
  if (farmId) {
    res = await call('POST', '/ratings', { targetId: farmId, stars: 4, comment: 'Good!' });
    console.log('POST /ratings', res.status);
    if (res.status === 201) ratingId = res.data.ratingId;
  }

  // 16. Get rating
  if (ratingId) {
    res = await call('GET', `/ratings/${ratingId}`);
    console.log(`GET /ratings/${ratingId}`, res.status);
  }

  // 17. Dashboard
  res = await call('GET', '/dashboard');
  console.log('GET /dashboard', res.status);

  // 18. Performance
  res = await call('GET', '/performance');
  console.log('GET /performance', res.status);

  console.log('Health-check completed.');
})();
