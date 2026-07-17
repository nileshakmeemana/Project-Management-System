// Local development only: `npm run dev:api` serves the Express app on :5000.
// On Vercel, api/index.js runs as a serverless function instead.
require("dotenv").config();
const app = require("./index");
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅  Designer Craft API (dev) on :${PORT}`));
