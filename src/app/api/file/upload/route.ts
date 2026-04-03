import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // 1. Define the directory and ensure it exists
        const uploadDir = path.join(process.cwd(), "upload-data");
        await fs.mkdir(uploadDir, { recursive: true });

        // 2. Create a unique filename to avoid overwriting
        const filePath = path.join(uploadDir, `${Date.now()}-${file.name}`);

        // 3. Process the file in chunks using a ReadableStream
        const reader = file.stream().getReader();

        // We use a flag 'a' (append) to write chunks one by one
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 'value' is a Uint8Array (a chunk of the file)
            await fs.appendFile(filePath, Buffer.from(value));
        }

        return NextResponse.json({
            message: "File uploaded in chunks successfully",
            path: filePath
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
    }
}


