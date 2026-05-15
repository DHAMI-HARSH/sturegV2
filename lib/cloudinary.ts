import { v2 as cloudinary } from "cloudinary";
import { env } from "@/lib/env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

type UploadReceiptInput = {
  bytes: Buffer;
  ddNumber: string;
  mime: string;
  fileName: string;
};

function bufferToDataUri(buffer: Buffer, mime: string) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function uploadReceipt({
  bytes,
  ddNumber,
  mime,
  fileName,
}: UploadReceiptInput) {
  let upload;

  try {
    upload = await cloudinary.uploader.upload(bufferToDataUri(bytes, mime), {
      folder: `student-registration/receipts/${ddNumber}`,
      public_id: fileName.replace(/\.[^.]+$/, ""),
      resource_type: "auto",
      overwrite: true,
      use_filename: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cloudinary upload failed.";

    if (message.toLowerCase().includes("api key")) {
      throw new Error(
        "Cloudinary rejected the credentials. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local.",
      );
    }

    throw new Error(`Cloudinary upload failed: ${message}`);
  }

  return {
    secureUrl: upload.secure_url,
    publicId: upload.public_id,
    format: upload.format,
    previewUrl: buildReceiptPreviewUrl(upload.secure_url, upload.public_id),
  };
}

export function buildReceiptPreviewUrl(receiptUrl: string, publicId?: string) {
  if (!receiptUrl.endsWith(".pdf")) {
    return receiptUrl;
  }

  if (publicId) {
    return cloudinary.url(publicId, {
      secure: true,
      resource_type: "image",
      format: "jpg",
      page: 1,
    });
  }

  return receiptUrl.replace(/\/upload\//, "/upload/pg_1/f_jpg/").replace(/\.pdf$/i, ".jpg");
}
