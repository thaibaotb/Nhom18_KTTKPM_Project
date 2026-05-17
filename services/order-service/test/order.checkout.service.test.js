const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const Order = require("../src/models/order.model");
const {
  OrderCheckoutService,
  BadRequestException,
  ConflictException,
} = require("../src/services/order.checkout.service");

jest.setTimeout(120000);

const cartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String },
    stock: { type: Number },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, default: 0 },
    version: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["ACTIVE", "CHECKED_OUT"],
      default: "ACTIVE",
    },
  },
  { timestamps: true },
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

class MongoCartClient {
  constructor(cartModel) {
    this.cartModel = cartModel;
  }

  async getCart(userId) {
    return this.cartModel.findOne({ userId }).lean();
  }

  async clearCart(userId, expectedVersion) {
    return this.cartModel.findOneAndUpdate(
      { userId, version: expectedVersion, status: "ACTIVE" },
      {
        $set: { status: "CHECKED_OUT", items: [] },
        $inc: { version: 1 },
      },
      { new: true },
    );
  }
}

describe("OrderCheckoutService", () => {
  let mongo;
  let cartClient;
  let service;

  const userId = "user-order-checkout-test";
  const productId = new mongoose.Types.ObjectId("507f1f77bcf86cd799439011");

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), {
      dbName: "order-service-checkout-test",
    });

    cartClient = new MongoCartClient(Cart);
    service = new OrderCheckoutService({ orderModel: Order, cartClient });
  });

  beforeEach(async () => {
    await Promise.all([Cart.deleteMany({}), Order.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  async function seedCart({ status = "ACTIVE", items } = {}) {
    await Cart.deleteMany({ userId });
    return Cart.create({
      userId,
      status,
      version: 1,
      totalPrice: 0,
      items: items || [
        {
          productId,
          name: "Sample Product",
          price: 25000,
          quantity: 2,
          image: "",
          stock: 99,
        },
      ],
    });
  }

  it("creates an order from an active cart", async () => {
    const seeded = await seedCart({
      items: [
        {
          productId,
          name: "Sample Product",
          price: 25000,
          quantity: 2,
          image: "",
          stock: 99,
        },
      ],
    });

    const order = await service.createOrder(userId);

    expect(order).toBeTruthy();
    expect(order.userId).toBe(userId);
    expect(order.status).toBe("PENDING");
    expect(order.totalPrice).toBe(50000);
    expect(order.items).toHaveLength(1);
    expect(String(order.items[0].productId)).toBe(String(productId));

    const persistedCart = await Cart.findOne({ userId }).lean();
    expect(persistedCart.status).toBe("CHECKED_OUT");
    expect(persistedCart.items).toHaveLength(0);
    expect(persistedCart.version).toBe(seeded.version + 1);

    const orderCount = await Order.countDocuments({ userId });
    expect(orderCount).toBe(1);
  });

  it("allows only one concurrent checkout", async () => {
    await seedCart({
      items: [
        {
          productId,
          name: "Sample Product",
          price: 25000,
          quantity: 2,
          image: "",
          stock: 99,
        },
      ],
    });

    const results = await Promise.allSettled([
      service.createOrder(userId),
      service.createOrder(userId),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);

    const orders = await Order.find({ userId }).lean();
    expect(orders).toHaveLength(1);
  });

  it("throws when the cart is empty", async () => {
    await seedCart({ items: [] });

    await expect(service.createOrder(userId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("throws when the cart is already checked out", async () => {
    await seedCart({ status: "CHECKED_OUT" });

    await expect(service.createOrder(userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("throws when clearCart fails", async () => {
    await seedCart();

    const failingService = new OrderCheckoutService({
      orderModel: Order,
      cartClient: {
        getCart: jest.fn().mockResolvedValue({
          userId,
          status: "ACTIVE",
          version: 1,
          items: [
            {
              productId,
              name: "Sample Product",
              price: 25000,
              quantity: 1,
            },
          ],
        }),
        clearCart: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(failingService.createOrder(userId)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
