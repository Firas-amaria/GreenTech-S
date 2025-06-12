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
  { id: "ITEM-001", itemName: "Tomato", variety: "Cherry" },
  { id: "ITEM-002", itemName: "Tomato", variety: "Roma" },
  { id: "ITEM-003", itemName: "Cucumber", variety: "Slicing" },
  { id: "ITEM-004", itemName: "Cucumber", variety: "Pickling" },
  { id: "ITEM-005", itemName: "Lettuce", variety: "Romaine" },
  { id: "ITEM-006", itemName: "Lettuce", variety: "Iceberg" }
];

// Roles definitions
export const mockRoles = [
  {
    name: "deliverer",
    description: "Pickup and deliver shipments to customers.",
    fields: [
      { label: "First Name", type: "text" },
      { label: "Last Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "Address", type: "text" },
      { label: "Birth Date", type: "date" },
      { label: "License Type", type: "text" },
      { label: "Vehicle Make", type: "text" },
      { label: "Vehicle Model", type: "text" },
      { label: "Vehicle Type", type: "text" },
      { label: "Vehicle Year", type: "number" },
      { label: "Vehicle Capacity", type: "number" },
      { label: "Driver License #", type: "text" },
      { label: "Vehicle Registration #", type: "text" },
      { label: "Insurance Confirmed", type: "checkbox" }
    ]
  },
  {
    name: "industrial-driver",
    description: "Deliver refrigerated or hazardous shipments.",
    fields: [
      { label: "First Name", type: "text" },
      { label: "Last Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "Address", type: "text" },
      { label: "Birth Date", type: "date" },
      { label: "License Type", type: "text" },
      { label: "Vehicle Make", type: "text" },
      { label: "Vehicle Model", type: "text" },
      { label: "Vehicle Type", type: "text" },
      { label: "Vehicle Year", type: "number" },
      { label: "Vehicle Capacity", type: "number" },
      { label: "Driver License #", type: "text" },
      { label: "Vehicle Registration #", type: "text" },
      { label: "Insurance Confirmed", type: "checkbox" },
      { label: "Refrigerated Capable", type: "checkbox" }
    ]
  },
  {
    name: "farmer",
    description: "Supply produce and manage lands.",
    fields: [
      { label: "First Name", type: "text" },
      { label: "Last Name", type: "text" },
      { label: "Email", type: "email" },
      { label: "Phone", type: "tel" },
      { label: "Agricultural Insurance", type: "checkbox" },
      { label: "Farm Name", type: "text" },
      { label: "Agreement Signed", type: "checkbox" },
      { label: "Lands (JSON)", type: "textarea" }
    ]
  }
];
