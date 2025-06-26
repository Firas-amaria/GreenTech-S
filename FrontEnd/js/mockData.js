// js/mockData.js
// Mock data for job applications, item list, and roles

export const mockApplications = [
  // Deliverer Application
  {
    id: "APP-DR-001",
    role: "deliverer",
    submittedAt: "2025-06-12T16:44:43.946Z",
    status: "pending",
    details: {
      firstname: "JJ",
      lastname: "Driving",
      email: "john.doe@example.com",
      phone: "+1234567890",
      address: "hunalulu",
      "birth-date": "1997-07-17",
      licenseType: "a",
      vehicleMake: "toyota",
      vehicleModel: "hilux",
      vehicleType: "pickup",
      vehicleYear: 2002,
      vehicleCapacity: 122,
      driverLicenseNumber: "41411333",
      vehicleRegistrationNumber: "1112",
      vehicleInsurance: "on",
      schedule: JSON.parse(
        '{"Sunday":["Morning"],"Monday":["Afternoon"],"Tuesday":["Morning"],"Wednesday":["Afternoon"],"Thursday":["Afternoon"],"Friday":["Morning"],"Saturday":["Morning"]}'
      )
    }
  },

  // Industrial Driver Application
  {
    id: "APP-ID-002",
    role: "industrial-driver",
    submittedAt: "2025-06-12T16:42:48.122Z",
    status: "pending",
    details: {
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      address: "hunalulu",
      "birth-date": "1997-07-17",
      licenseType: "a",
      vehicleMake: "toyota",
      vehicleModel: "hilux",
      vehicleType: "pickup",
      vehicleYear: 2019,
      vehicleCapacity: 30,
      driverLicenseNumber: "41411333",
      vehicleRegistrationNumber: "1112",
      vehicleInsurance: "on",
      refrigerated: "on",
      schedule: JSON.parse(
        '{"Sunday":["Afternoon"],"Monday":["Afternoon"],"Tuesday":["Evening"],"Wednesday":["Afternoon","Evening"],"Thursday":["Morning"],"Friday":["Morning"],"Saturday":["Afternoon"]}'
      )
    }
  },

  // Farmer Application
  {
    id: "APP-FR-003",
    role: "farmer",
    submittedAt: "2025-06-12T14:45:00.172Z",
    status: "pending",
    details: {
      firstname: "Johnny",
      lastname: "Meow",
      email: "john.doe@example.com",
      phone: "+1234567890",
      agriculturalInsurance: "on",
      farmName: "shalomi",
      agreement: "on",
      lands: JSON.parse(
        '[{"id":"LAND-001","name":"ss","ownership":"owner","acres":"22","pickupAddress":{"address":"hggh uf gj  hjh","latitude":0,"longitude":0},"location":{"address":"","latitude":0,"longitude":0}}]'
      )
    }
  }
];

// Additional mock item list
export const mockItemList = [
  { itemId: "VEG-001", itemName: "Tomato", variety: "Cherry" },
  { itemId: "VEG-002", itemName: "Tomato", variety: "Roma" },
  { itemId: "VEG-003", itemName: "Cucumber", variety: "Slicing" },
  { itemId: "VEG-004", itemName: "Cucumber", variety: "Pickling" },
  { itemId: "VEG-005", itemName: "Lettuce", variety: "Romaine" },
  { itemId: "VEG-006", itemName: "Lettuce", variety: "Iceberg" }
];

export const mockStock = {
  morning: [
    {
      stockid:1 ,
      itemId: "FRT-001",
      itemDisplayName: "Apple Fuji",
      itemPictureUrl: "https://via.placeholder.com/100?text=Apple",
      category: "Fruits",
      sourceFarmerName: "Farmer John",
      currentAvailableQuantityKg: 100,
      pricePerUnit: 2.99
    },
    {
      itemId: "VEG-001",
      itemDisplayName: "Cucumber",
      itemPictureUrl: "https://via.placeholder.com/100?text=Cucumber",
      category: "Vegetables",
      sourceFarmerName: "Farmer Jane",
      currentAvailableQuantityKg:10,
      pricePerUnit: 1.8
    },
    {
      itemId: "VEG-002",
      itemDisplayName: "Tomato Roma",
      itemPictureUrl: "https://via.placeholder.com/100?text=Tomato",
      category: "Vegetables",
      sourceFarmerName: "Farmer Amir",
      currentAvailableQuantityKg: 10,
      pricePerUnit: 2.2
    },
    {
      itemId: "VEG-004",
      itemDisplayName: "Pickling Cucumber",
      itemPictureUrl: "https://via.placeholder.com/100?text=Pickle",
      category: "Vegetables",
      sourceFarmerName: "Farmer Dana",
      currentAvailableQuantityKg: 25,
      pricePerUnit: 1.5
    }
  ],
  afternoon: [],
  night: [
    {
      itemId: "VEG-003",
      itemDisplayName: "Spinach Bunch",
      itemPictureUrl: "https://via.placeholder.com/100?text=Spinach",
      category: "Vegetables",
      sourceFarmerName: "Farmer Ezra",
      currentAvailableQuantityKg: 55,
      pricePerUnit: 2.3
    }
  ]
};

export const mockAddresses = [
  "123 Green Rd",
  "45 Market St",
  "678 Orchard Lane"
];

