import {
  ArticleStatus,
} from "@prisma/client";

import type {
  ArticleInput,
} from "@/lib/article-contract";

import { cache } from "react";

import { db } from "@/server/db/client";

export const listPublishedArticles =
  cache(async (limit = 20) => {
    const now = new Date();

    return db.article.findMany({
      where: {
        status:
          ArticleStatus.PUBLISHED,

        publishedAt: {
          lte: now,
        },
      },

      orderBy: [
        {
          publishedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: Math.max(
        1,
        Math.min(50, limit),
      ),

      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    });
  });

export const getPublishedArticleBySlug =
  cache(async (slug: string) => {
    const now = new Date();

    return db.article.findFirst({
      where: {
        slug,

        status:
          ArticleStatus.PUBLISHED,

        publishedAt: {
          lte: now,
        },
      },

      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    });
  });

export const listAdminArticles = () =>
  db.article.findMany({
    orderBy: [
      {
        updatedAt: "desc",
      },
    ],

    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      status: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

export type ArticleServiceErrorCode =
  | "ARTICLE_NOT_FOUND"
  | "ARTICLE_SLUG_TAKEN"
  | "ARTICLE_DELETE_PUBLISHED";

export class ArticleServiceError extends Error {
  constructor(
    public readonly code:
      ArticleServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name =
      "ArticleServiceError";
  }
}

export async function createArticle(
  input: ArticleInput,
) {
  const existing =
    await db.article.findUnique({
      where: {
        slug: input.slug,
      },

      select: {
        id: true,
      },
    });

  if (existing) {
    throw new ArticleServiceError(
      "ARTICLE_SLUG_TAKEN",
      "Slug artikel sudah digunakan.",
    );
  }

  const published =
    input.status ===
    ArticleStatus.PUBLISHED;

  return db.article.create({
    data: {
      slug: input.slug,
      title: input.title.trim(),
      excerpt:
        input.excerpt.trim(),
      content:
        input.content.trim(),

      coverImageUrl:
        input.coverImageUrl
          ?.trim() ||
        null,

      status: input.status,

      publishedAt:
        published
          ? new Date()
          : null,
    },

    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      status: true,
      publishedAt: true,
    },
  });
}

export async function updateArticle(
  id: string,
  input: ArticleInput,
) {
  const current =
    await db.article.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        slug: true,
        status: true,
        publishedAt: true,
      },
    });

  if (!current) {
    throw new ArticleServiceError(
      "ARTICLE_NOT_FOUND",
      "Artikel tidak ditemukan.",
    );
  }

  if (
    input.slug !== current.slug
  ) {
    const duplicate =
      await db.article.findUnique({
        where: {
          slug: input.slug,
        },

        select: {
          id: true,
        },
      });

    if (
      duplicate &&
      duplicate.id !== id
    ) {
      throw new ArticleServiceError(
        "ARTICLE_SLUG_TAKEN",
        "Slug artikel sudah digunakan.",
      );
    }
  }

  const publishing =
    input.status ===
      ArticleStatus.PUBLISHED &&
    current.status !==
      ArticleStatus.PUBLISHED;

  const unpublishing =
    input.status ===
      ArticleStatus.DRAFT &&
    current.status ===
      ArticleStatus.PUBLISHED;

  await db.article.update({
    where: {
      id,
    },

    data: {
      slug: input.slug,
      title: input.title.trim(),
      excerpt:
        input.excerpt.trim(),
      content:
        input.content.trim(),

      coverImageUrl:
        input.coverImageUrl
          ?.trim() ||
        null,

      status: input.status,

      publishedAt:
        publishing
          ? new Date()
          : unpublishing
            ? null
            : current.publishedAt,
    },
  });

  return db.article.findUniqueOrThrow({
    where: {
      id,
    },

    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      coverImageUrl: true,
      status: true,
      publishedAt: true,
    },
  });
}

export async function deleteArticle(
  id: string,
) {
  const article =
    await db.article.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
      },
    });

  if (!article) {
    throw new ArticleServiceError(
      "ARTICLE_NOT_FOUND",
      "Artikel tidak ditemukan.",
    );
  }

  if (
    article.status ===
    ArticleStatus.PUBLISHED
  ) {
    throw new ArticleServiceError(
      "ARTICLE_DELETE_PUBLISHED",
      "Artikel published harus dijadikan draft sebelum dihapus.",
    );
  }

  await db.article.delete({
    where: {
      id,
    },
  });

  return {
    id,
  };
}