require("dotenv").config();

try {
  require("./dist/main");
} catch (error) {
  console.error(
    "Cart Service is now a NestJS app. Build it first with `npm run build`.",
  );
  console.error(error);
  process.exit(1);
}
