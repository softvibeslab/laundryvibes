const configuredUrl = process.env.LAUNDRY_API_BASE_URL || "http://127.0.0.1:3000/api";

let parsed;
try {
  parsed = new URL(configuredUrl);
} catch {
  throw new Error("LAUNDRY_API_BASE_URL must be a valid absolute URL");
}

if (!["http:", "https:"].includes(parsed.protocol)) {
  throw new Error("LAUNDRY_API_BASE_URL must use HTTP or HTTPS");
}

export const BASE_URL = parsed.toString().replace(/\/$/, "");