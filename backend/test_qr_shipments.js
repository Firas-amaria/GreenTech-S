const { db } = require('./firebaseConfig');

async function checkShipments() {
  try {
    const shipmentsSnapshot = await db.collection('shipments').limit(5).get();
    
    shipmentsSnapshot.forEach(doc => {
      const data = doc.data();
      console.log('Shipment ID:', doc.id);
      console.log('Status:', data.status);
      console.log('Has QR Code:', !!data.qrcode);
      console.log('Container count:', data.containers ? data.containers.length : 0);
      if (data.containers) {
        data.containers.forEach((container, index) => {
          console.log(`  Container ${index + 1}: ${container.code}, Has QR: ${!!container.qrcode}`);
        });
      }
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

checkShipments();
