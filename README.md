🌾 DFCP – Smart Agricultural Logistics Platform

A scalable, microservice-based logistics platform designed to connect farmers directly with consumers, digitally manage every delivery stage, and ensure zero inventory, minimal waste, and maximum transparency.
🧠 Core Features

    🧺 Farmer-first supply chain: From field to doorstep.

    📦 Zero inventory model: Only what’s ordered gets moved.

    🚚 Dynamic delivery scheduling with real-time driver assignment.

    📍 Live tracking & container-level traceability

    🧪 Quality control events and performance analytics

    🎮 Gamified worker experience with feedback and progress tracking.

📐 System Architecture

    Frontend: React Native

    Backend: Node.js + TypeScript

    Database: Firebase (live), SQL (historical backup)

    Analytics: ElasticSearch

    API Style: REST (Microservices)

    Authentication: Role-based access

    Session Handling: Stateful

👥 User Roles
Role	Description
Admin	Manages platform operations and user creation
Consumer	Places and tracks orders, rates service
Farmer	Manages farms and crops, tracks items
Transporter	Delivers items, updates location & vehicle info
Gatherer	Picks items for delivery based on tasks
Manager	Supervises performance, quality, or delivery
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
