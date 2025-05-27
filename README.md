🌾 DFCP – Smart Agricultural Logistics Platform

🛠 1. Backend Setup

Go to the backend folder:

    cd backend

Install dependencies:

    npm install

Create a .env file with the following content:

SERVICE_ACCOUNT_KEY={"type": "service_account", "project_id": "...", ...}

⚠️ Replace the value of SERVICE_ACCOUNT_KEY with your Firebase Admin JSON as one-line string.

Start the server:

    npm start

✅ Server runs at: http://localhost:4000

summary :-
1.create the .env file and place it in the backend folder
if u have a problem making this file contact me

then open terminal in vsCode (Ctrl + Shift + ` )  
and enter these comand in order one after the other:-

    cd backend
    npm install
    npm start

the webiste should open if all the step where folowed

A scalable, microservice-based logistics platform designed to connect farmers directly with consumers, digitally manage every delivery stage, and ensure zero inventory, minimal waste, and maximum transparency.
🧠 Core Features

    🧺 Farmer-first supply chain: From field to doorstep.

    📦 Zero inventory model: Only what’s ordered gets moved.

    🚚 Dynamic delivery scheduling with real-time driver assignment.

    📍 Live tracking & container-level traceability

    🧪 Quality control events and performance analytics

    🎮 Gamified worker experience with feedback and progress tracking.

👥 User Roles
Role Description
Admin Manages platform operations and user creation
Consumer Places and tracks orders, rates service
Farmer Manages farms and crops, tracks items
Transporter Delivers items, updates location & vehicle info
Gatherer Picks items for delivery based on tasks
Manager Supervises performance, quality, or delivery
🧩 Key Modules
🚜 User System

    User → Employee → Farmer / Transporter / Gatherer / Manager (Farming / Delivery / Logistics)

    Consumer (Customer): with Cart, Orders, Ratings, etc.

🌱 Farming & Inventory

    Farm, Crop, Item, CropReport, QualityStandard

📦 Shipment & Containers

    ShipmentBatch, Shipment, Container, WarehouseLocation

    ContainerEvent, SortingResult, QualityReport

📋 Orders & Fulfillment

    Order, OrderItem, PickTask, PickTaskItem, ReturnRequest

🎛 Services & Support

    RealTimeStockService, Notification, Document, Payment, Review, Media

🔐 Enumerations (System Constants)

    ContainerState: RECEIVED, SORTED, IN_WAREHOUSE, PICKED, SHIPPED

    OrderStatus: CREATED, PROCESSING, COMPLETED, CANCELLED

    ShipmentStatus: PENDING, DISPATCHED, DELIVERED

    ReturnStatus: REQUESTED, APPROVED, REJECTED

    TaskStatus: ASSIGNED, IN_PROGRESS, COMPLETED
