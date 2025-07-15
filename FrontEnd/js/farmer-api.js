// =================================================================
// 🔌 FARMER API INTEGRATION
// Helper functions to connect frontend to backend API endpoints
// =================================================================

// Base API configuration
const API_BASE_URL = "http://localhost:4000/api/farmer"; // Update this to your actual backend URL

// Helper function to get auth token (implement based on your auth system)
function getAuthToken() {
  // This should return the actual JWT token from your auth system
  // For now, return null - you'll need to implement this based on your auth
  return localStorage.getItem("token") || null;
}

// Helper function to make authenticated API calls
async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();

  const config = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API call failed:", error);
    throw error;
  }
}

// =================================================================
// 📊 FARMER API FUNCTIONS
// =================================================================

// Get lands data (replaces hardcoded parsedLands)
export async function fetchLands() {
  try {
    return await apiCall("/frontend/lands");
  } catch (error) {
    console.warn("Failed to fetch lands from API, using fallback data:", error);
    // Return fallback data if API fails
    return [
      {
        LandId: "00001",
        name: "North Field",
        acres: "22",
        Crops: null,
      },
      {
        LandId: "00002",
        name: "South Plot",
        acres: "10",
        Crops: {
          itemId: "001",
          plantedAmount: 10,
          plantedOn: "2025-05-01",
          status: "Growing",
          updatedOn: "2025-05-15",
          percentage: 17,
          imageUrl:
            "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=50&q=80",
        },
      },
    ];
  }
}

// Get items data (replaces hardcoded itemList)
export async function fetchItems() {
  try {
    return await apiCall("/frontend/items");
  } catch (error) {
    console.warn("Failed to fetch items from API, using fallback data:", error);
    return [
      { itemName: "Tomato", variety: "Cherry", itemId: "001" },
      { itemName: "Lettuce", variety: "Iceberg", itemId: "002" },
      { itemName: "Potato", variety: "White", itemId: "003" },
    ];
  }
}

// Get shipments data (replaces hardcoded shipment arrays)
export async function fetchShipments() {
  try {
    return await apiCall("/frontend/shipments");
  } catch (error) {
    console.warn(
      "Failed to fetch shipments from API, using fallback data:",
      error
    );
    return {
      approvedShipments: [
        {
          id: 301,
          item: "Tomato",
          amount: 120,
          pickupTime: "2025-06-02T08:00",
        },
        {
          id: 302,
          item: "Lettuce",
          amount: 80,
          pickupTime: "2025-06-01T09:30",
        },
        {
          id: 303,
          item: "Potato",
          amount: 200,
          pickupTime: "2025-06-04T11:00",
        },
      ],
      shipmentRequests: [
        { id: 1, item: "Carrot", amount: 50, pickupTime: "2025-06-03T10:00" },
        { id: 2, item: "Spinach", amount: 40, pickupTime: "2025-06-05T13:30" },
      ],
    };
  }
}

// Get quality standards for specific item
export async function fetchQualityStandards(itemId) {
  try {
    return await apiCall(`/frontend/quality-standards/${itemId}`);
  } catch (error) {
    console.warn(
      "Failed to fetch quality standards from API, using fallback data:",
      error
    );
    return [
      { parameter: "Brix (סוכר)", a: "≥ 12", b: "8–11", c: "< 8" },
      {
        parameter: "Acidity (חומציות)",
        a: "Balanced (מאוזנת)",
        b: "Slight (חמוץ/תפל)",
        c: "Very Sour (חמוץ מאוד)",
      },
      {
        parameter: "Size (גודל)",
        a: "Medium",
        b: "Small or Too Large",
        c: "Inconsistent/Abnormal",
      },
    ];
  }
}

// Get complete dashboard data
export async function fetchDashboardData() {
  try {
    return await apiCall("/frontend/dashboard");
  } catch (error) {
    console.warn(
      "Failed to fetch dashboard data from API, using fallback data:",
      error
    );
    // Combine fallback data
    const [lands, shipments] = await Promise.all([
      fetchLands(),
      fetchShipments(),
    ]);
    return {
      lands,
      ...shipments,
      cropStatusOptions: [
        "Planting",
        "Growing",
        "Crop Maintenance",
        "Blooming",
        "Fruit Set",
        "Ripening",
        "Harvesting",
        "Harvested",
        "Field Clearing",
      ],
    };
  }
}

// Get complete crops page data
export async function fetchCropsPageData() {
  try {
    return await apiCall("/frontend/crops");
  } catch (error) {
    console.warn(
      "Failed to fetch crops page data from API, using fallback data:",
      error
    );
    const [parsedLands, itemList] = await Promise.all([
      fetchLands(),
      fetchItems(),
    ]);
    return {
      parsedLands,
      itemList,
      cropStatusOptions: [
        "Planting",
        "Growing",
        "Crop Maintenance",
        "Blooming",
        "Fruit Set",
        "Ripening",
        "Harvesting",
        "Harvested",
        "Field Clearing",
      ],
    };
  }
}

// Get complete shipments page data
export async function fetchShipmentsPageData() {
  try {
    return await apiCall("/frontend/shipments-page");
  } catch (error) {
    console.warn(
      "Failed to fetch shipments page data from API, using fallback data:",
      error
    );
    return await fetchShipments();
  }
}

// =================================================================
// 🔄 CROP MANAGEMENT FUNCTIONS
// =================================================================

// Add a new crop (you'll need to implement the backend endpoint)
export async function addCrop(landId, cropData) {
  try {
    return await apiCall("/crops", {
      method: "POST",
      body: JSON.stringify({
        farmId: landId,
        ...cropData,
      }),
    });
  } catch (error) {
    console.error("Failed to add crop:", error);
    throw error;
  }
}

// Update crop status (you'll need to implement the backend endpoint)
export async function updateCropStatus(cropId, status, percentage) {
  try {
    return await apiCall(`/crops/${cropId}`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        statusPercentage: percentage,
        updatedOn: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error("Failed to update crop status:", error);
    throw error;
  }
}

// =================================================================
// 🚚 SHIPMENT MANAGEMENT FUNCTIONS
// =================================================================

// Approve a shipment request (you'll need to implement the backend endpoint)
export async function approveShipmentRequest(requestId) {
  try {
    return await apiCall(`/shipments/requests/${requestId}/approve`, {
      method: "POST",
    });
  } catch (error) {
    console.error("Failed to approve shipment request:", error);
    throw error;
  }
}

// =================================================================
// 📱 UTILITY FUNCTIONS
// =================================================================

// Check if API is available
export async function checkApiHealth() {
  try {
    // You can create a simple health check endpoint
    await apiCall("/health");
    return true;
  } catch (error) {
    console.warn("API health check failed:", error);
    return false;
  }
}

// Set API base URL (useful for different environments)
export function setApiBaseUrl(url) {
  API_BASE_URL = url;
}

// Export static data that matches frontend expectations
export const CROP_STATUS_OPTIONS = [
  "Planting",
  "Growing",
  "Crop Maintenance",
  "Blooming",
  "Fruit Set",
  "Ripening",
  "Harvesting",
  "Harvested",
  "Field Clearing",
];

export const REAL_CROP_IMAGES = [
  "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1506806732259-39c2d0268443?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1574226516831-e1dff420e43e?auto=format&fit=crop&w=50&q=80",
  "https://images.unsplash.com/photo-1567306301408-9b74779a11af?auto=format&fit=crop&w=50&q=80",
];
