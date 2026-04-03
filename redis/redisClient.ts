import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    throw new Error("REDIS_URL is not defined in environment variables");
}

const redishClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
    tls: {}, // Recommended for Upstash
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redishClient.on("connect", () => {
    console.log("Redis connected");
});

redishClient.on("error", (err) => {
    console.error("Redis error:", err);
});

export default redishClient;