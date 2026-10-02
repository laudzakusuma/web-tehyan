import { z } from "zod";

export const jobApplicationInputSchema = z
  .object({
    jobSlug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug lowongan tidak valid.",
      ),

    name: z
      .string()
      .trim()
      .min(2, "Nama terlalu pendek.")
      .max(120, "Nama terlalu panjang."),

    email: z
      .string()
      .trim()
      .email("Email tidak valid.")
      .max(200)
      .transform((value) =>
        value.toLowerCase(),
      ),

    phone: z
      .string()
      .trim()
      .min(8, "Nomor WhatsApp terlalu pendek.")
      .max(30, "Nomor WhatsApp terlalu panjang.")
      .regex(
        /^[0-9+\-\s()]+$/,
        "Nomor WhatsApp tidak valid.",
      ),

    portfolioUrl: z
      .union([
        z
          .string()
          .trim()
          .url("Link portfolio tidak valid.")
          .max(500),
        z.literal(""),
        z.null(),
      ])
      .optional(),

    message: z
      .union([
        z
          .string()
          .trim()
          .max(2000, "Pesan terlalu panjang."),
        z.literal(""),
        z.null(),
      ])
      .optional(),
  })
  .strict();

export type JobApplicationInput =
  z.infer<
    typeof jobApplicationInputSchema
  >;

export const adminJobInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Slug tidak valid.",
      ),

    title: z
      .string()
      .trim()
      .min(3)
      .max(160),

    location: z
      .string()
      .trim()
      .min(2)
      .max(160),

    employmentType: z.enum([
      "FULL_TIME",
      "PART_TIME",
      "CONTRACT",
      "INTERNSHIP",
    ]),

    summary: z
      .string()
      .trim()
      .min(10)
      .max(500),

    responsibilities: z
      .string()
      .trim()
      .min(20)
      .max(10000),

    requirements: z
      .string()
      .trim()
      .min(20)
      .max(10000),

    status: z.enum([
      "DRAFT",
      "PUBLISHED",
      "CLOSED",
    ]),
  })
  .strict();

export const applicationStatusInputSchema =
  z
    .object({
      status: z.enum([
        "NEW",
        "REVIEWING",
        "SHORTLISTED",
        "REJECTED",
        "HIRED",
      ]),
    })
    .strict();

export type AdminJobInput =
  z.infer<
    typeof adminJobInputSchema
  >;