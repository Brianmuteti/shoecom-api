import CategoryService from "../../services/product/category.service";
import { z, ZodError } from "zod";
import { createCrudController } from "../crud.factory";
import { Request, Response } from "express";
import cloudinary, {
    extractPublicId,
    uploadToCloudinary,
} from "../../utils/cloudinary";

const categorySchema = {
    create: z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().min(10),
        metaTitle: z.string().min(3),
        metaDescription: z.string().min(10),
        image: z.string().url().optional(),
        icon: z.string().url().optional(),
        parentId: z.number().nullable().optional(),
    }),
    update: z.object({
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().min(10).optional(),
        metaTitle: z.string().min(3).optional(),
        metaDescription: z.string().min(10).optional(),
        image: z.string().url().optional(),
        icon: z.string().url().optional(),
        parentId: z.number().nullable().optional(),
    }),
};

const base = createCrudController({
    service: CategoryService,
    schema: categorySchema,
    resourceName: "category",
});

const categoryController = {
    ...base,

    create: async (req: Request, res: Response) => {
        const data = categorySchema.create.parse(req.body);

        if (data.parentId) {
            const parent = await CategoryService.findById(data.parentId);
            if (!parent) {
                throw new ZodError([
                    {
                        code: "custom",
                        path: ["parentId"],
                        message: "Parent category not found",
                    },
                ]);
            }
        }

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const uploadedImageUrls: string[] = []; // Track uploaded images for cleanup

        try {
            // ✅ Handle category image
            if (files?.image?.[0]) {
                const uploaded = await uploadToCloudinary(
                    files.image[0],
                    "LandulaShop/categories/images"
                );
                uploadedImageUrls.push(uploaded.secure_url);
                data.image = uploaded.secure_url;
            }

            // ✅ Handle category icon
            if (files?.icon?.[0]) {
                const uploaded = await uploadToCloudinary(
                    files.icon[0],
                    "LandulaShop/categories/icons"
                );
                uploadedImageUrls.push(uploaded.secure_url);
                data.icon = uploaded.secure_url;
            }

            // Try to save to database
            const created = await CategoryService.create(data);
            res.status(201).json({ data: created });
        } catch (error) {
            // 🧹 Cleanup: Delete uploaded images from Cloudinary if DB operation failed
            console.error(
                "❌ Category creation failed, cleaning up uploaded images..."
            );

            for (const imageUrl of uploadedImageUrls) {
                try {
                    const publicId = extractPublicId(imageUrl);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`✅ Deleted orphaned image: ${publicId}`);
                    }
                } catch (cleanupError) {
                    console.error(
                        `⚠️  Failed to delete image ${imageUrl}:`,
                        cleanupError
                    );
                    // Continue with other deletions even if one fails
                }
            }

            // Re-throw the original error
            throw error;
        }
    },

    update: async (req: Request, res: Response) => {
        const { id, ...data } = categorySchema.update.parse(req.body);

        if (data.parentId) {
            const parent = await CategoryService.findById(data.parentId);
            if (!parent) {
                throw new ZodError([
                    {
                        code: "custom",
                        path: ["parentId"],
                        message: "Parent category not found",
                    },
                ]);
            }
        }

        const files = req.files as {
            [fieldname: string]: Express.Multer.File[];
        };

        const current = await CategoryService.findById(Number(id));
        const uploadedImageUrls: string[] = []; // Track new uploads for cleanup
        const oldImageUrls: { image?: string; icon?: string } = {}; // Track old URLs to delete later

        try {
            // ✅ Upload new category image
            if (files?.image?.[0]) {
                if (current?.image) {
                    oldImageUrls.image = current.image; // Track old image
                }
                const uploaded = await uploadToCloudinary(
                    files.image[0],
                    "LandulaShop/categories/images"
                );
                uploadedImageUrls.push(uploaded.secure_url);
                data.image = uploaded.secure_url;
            }

            // ✅ Upload new category icon
            if (files?.icon?.[0]) {
                if (current?.icon) {
                    oldImageUrls.icon = current.icon; // Track old icon
                }
                const uploaded = await uploadToCloudinary(
                    files.icon[0],
                    "LandulaShop/categories/icons"
                );
                uploadedImageUrls.push(uploaded.secure_url);
                data.icon = uploaded.secure_url;
            }

            // Try to save to database
            const updated = await CategoryService.update(Number(id), data);

            // 🧹 Only delete old images AFTER successful DB update
            if (oldImageUrls.image) {
                const pid = extractPublicId(oldImageUrls.image);
                if (pid) {
                    await cloudinary.uploader.destroy(pid);
                    console.log(`✅ Deleted old category image: ${pid}`);
                }
            }
            if (oldImageUrls.icon) {
                const pid = extractPublicId(oldImageUrls.icon);
                if (pid) {
                    await cloudinary.uploader.destroy(pid);
                    console.log(`✅ Deleted old category icon: ${pid}`);
                }
            }

            res.json({ data: updated });
        } catch (error) {
            // 🧹 Cleanup: Delete newly uploaded images from Cloudinary if DB operation failed
            console.error(
                "❌ Category update failed, cleaning up uploaded images..."
            );

            for (const imageUrl of uploadedImageUrls) {
                try {
                    const publicId = extractPublicId(imageUrl);
                    if (publicId) {
                        await cloudinary.uploader.destroy(publicId);
                        console.log(`✅ Deleted orphaned image: ${publicId}`);
                    }
                } catch (cleanupError) {
                    console.error(
                        `⚠️  Failed to delete image ${imageUrl}:`,
                        cleanupError
                    );
                    // Continue with other deletions even if one fails
                }
            }

            // Old images remain intact (good - no data loss)

            // Re-throw the original error
            throw error;
        }
    },
};

export default categoryController;
