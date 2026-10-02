import { db } from "@/server/db/client";

export async function searchKnowledge(query: string, limit = 5) {
  const words = query.trim().split(/\s+/).filter((word) => word.length > 2).slice(0, 5);
  if (words.length === 0) return [];
  return db.faq.findMany({
    where: { OR: words.flatMap((word) => [
      { question: { contains: word, mode: "insensitive" as const } },
      { answer: { contains: word, mode: "insensitive" as const } },
    ]) },
    select: { question: true, answer: true, topic: true },
    orderBy: { id: "asc" },
    take: Math.max(1, Math.min(5, limit)),
  });
}
