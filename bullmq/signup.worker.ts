/**
 * Here we are processing the signupQueue to send request received 
 * we will contact you shortly
 * 
 */


import "dotenv/config";
import { Worker, Job } from "bullmq";
import RedisClient from "../redis/redisClient";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_KEY);

// Email processor
async function sendEmail(email: string) {
    console.log("Sending email to:", email);

    const { data, error } = await resend.emails.send({
        from: 'no-reply@fynback.com',
        to: [email],
        subject: 'Your account register successful',
        text: `thank you for connected with us 
your team will contact your shortly

this is auto generated 
do not reply it`,
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log("Email sent successfully:", data?.id);
}

// Worker definition
const worker = new Worker(
    "signup",
    async (job: Job<{ email: string }>) => {
        const { email } = job.data;

        if (!email) {
            throw new Error("Email not found in job data");
        }

        await sendEmail(email);

        return { success: true };
    },
    {
        connection: RedisClient,
        concurrency: 5,
    }
);


worker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
    console.error(`Job failed: ${job?.id}`, err.message);
});

worker.on("error", (err: any) => {
    // Only log critical errors. ECONNRESET is handled by ioredis auto-reconnect.
    if (err.code === 'ECONNRESET') {
        console.warn("Redis connection reset (ECONNRESET) - Reconnecting...");
    } else {
        console.error("Worker error:", err);
    }
});
