const crypto = require("crypto");

const paymentServiceUrl =
  process.env.PAYMENT_SERVICE_URL || "http://localhost:5003";
const checksumKey =
  process.env.PAYOS_CHECKSUM_KEY || process.env.PAYOS_SECRET || "change-me";

function sign(rawBody) {
  return crypto.createHmac("sha256", checksumKey).update(rawBody).digest("hex");
}

async function sendFakeWebhook({ orderCode, status = "PAID" }) {
  const payload = { orderCode, status };
  const rawBody = JSON.stringify(payload);
  const signature = sign(rawBody);

  const response = await fetch(`${paymentServiceUrl}/payments/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-payos-signature": signature,
    },
    body: rawBody,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(
      `Webhook request failed: ${response.status} ${JSON.stringify(data)}`,
    );
  }

  return data;
}

async function main() {
  const orderCode = process.argv[2];
  const status = process.argv[3] || "PAID";

  if (!orderCode) {
    console.error(
      "Usage: node scripts/fakeWebhook.js <orderCode> [PAID|FAILED]",
    );
    process.exit(1);
  }

  const result = await sendFakeWebhook({ orderCode, status });
  console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { sendFakeWebhook };
