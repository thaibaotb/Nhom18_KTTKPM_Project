# C4 Diagrams - ELPPA E-Commerce Microservices

## 1. C4 Context Diagram

```mermaid
flowchart LR
    Customer[Customer / End User]
    Admin[Admin]

    ELPPA[(ELPPA E-Commerce System)]

    PayOS[PayOS Payment Gateway]
    SMTP[SMTP Email Service]
    S3[Cloud Storage (AWS S3 / Cloudinary)]

    Customer -->|Browse products, cart, checkout, track orders, chat| ELPPA
    Admin -->|Manage products, categories, orders, users, support chat| ELPPA

    ELPPA -->|Create payment link, verify payment status, receive webhook flow| PayOS
    ELPPA -->|Send OTP / notifications / account email| SMTP
    ELPPA -->|Upload and retrieve product images| S3
```

## 2. C4 Container Diagram

```mermaid
flowchart TB
    subgraph Client Layer
      FE[Frontend - React/Vite<br/>Port 5173]
    end

    subgraph ELPPA System Boundary
      GW[API Gateway - Node/Express<br/>Port 3000]

      AUTH[Auth Service<br/>Port 3001]
      PRODUCT[Product Service<br/>Port 3002]
      CART[Cart Service<br/>Port 3003]
      ORDER[Order Service<br/>Port 3004]
      CHAT[Chat Service<br/>Port 3005]
      PAYMENT[Payment Service<br/>Port 5003]
    end

    subgraph Data Stores
      PG[(PostgreSQL<br/>Auth data)]
      MONGO[(MongoDB<br/>Product, Cart, Order, Chat, Payment)]
      REDIS[(Redis<br/>Auth temporary data - OTP - pending registration)]
    end

    EXTPAY[PayOS]
    EXTMAIL[SMTP]
    EXTS3[S3 / Cloudinary]

    FE -->|REST/HTTP + JWT| GW

    GW --> AUTH
    GW --> PRODUCT
    GW --> CART
    GW --> ORDER
    GW --> CHAT
    GW --> PAYMENT

    AUTH --> PG
    AUTH --> REDIS
    AUTH --> EXTMAIL

    PRODUCT --> MONGO
    PRODUCT --> EXTS3

    CART --> MONGO

    ORDER --> MONGO
    ORDER --> PAYMENT
    ORDER --> PRODUCT
    ORDER --> CART

    CHAT --> MONGO

    PAYMENT --> MONGO
    PAYMENT --> EXTPAY
    PAYMENT -->|Internal callback / outbox delivery| ORDER
```

## Notes for defense

- The project implements an API Gateway pattern with domain microservices.
- Communication is primarily synchronous HTTP via the gateway, plus internal callback/event-like flow between Payment and Order (outbox/retry behavior in payment service).
- The current deployment target is Docker Compose local environment; cloud/k8s containers can be mapped from this container diagram.
