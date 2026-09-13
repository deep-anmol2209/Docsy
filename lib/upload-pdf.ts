import cloudinary from "@/lib/cloudinary-client";
import { UploadApiResponse } from "cloudinary";

export async function uploadPdfToCloudinary(
  file: File
): Promise<UploadApiResponse> {
  const bytes = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "pdfs",
        resource_type: "raw", // PDFs ke liye
        use_filename: true,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result as UploadApiResponse);
      }
    );

    stream.end(bytes);
  });
}