import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

export const extractPublicId = (url: string): string | null => {
    try {
        const u = new URL(url);
        const parts = u.pathname.split("/").filter(Boolean);
        // pathname: /<account>/image/upload/v12345/...path...
        const uploadIdx = parts.findIndex((p) => p === "upload");
        if (uploadIdx === -1) return null;
        const afterUpload = parts.slice(uploadIdx + 1); // [v12345, categories, images, file.ext]
        const withoutVersion = afterUpload[0]?.startsWith("v")
            ? afterUpload.slice(1)
            : afterUpload;
        if (withoutVersion.length === 0) return null;
        const last = withoutVersion[withoutVersion.length - 1];
        const dot = last.lastIndexOf(".");
        const lastNoExt = dot > -1 ? last.substring(0, dot) : last;
        const path = [...withoutVersion.slice(0, -1), lastNoExt].join("/");
        return path || null;
    } catch {
        return null;
    }
};

export const uploadToCloudinary = (
    file: Express.Multer.File,
    folder: string
): Promise<{ secure_url: string }> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) return reject(error);
                resolve(result as { secure_url: string });
            }
        );
        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};
