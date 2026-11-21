import { prisma } from "../prisma";

const fallbackCredits = new Map();

export const UserService = {
  async getCredits(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      return user ? user.credits : 0;
    } catch {
      return fallbackCredits.get(userId) ?? 50;
    }
  },

  async addCredits(userId, amount) {
    if (amount <= 0) return;
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: amount,
          },
        },
      });
    } catch {
      const current = fallbackCredits.get(userId) ?? 50;
      const updated = current + amount;
      fallbackCredits.set(userId, updated);
      return { id: userId, credits: updated };
    }
  },

  async deductCredits(userId, amount) {
    if (amount <= 0) return;

    const currentCredits = await this.getCredits(userId);
    if (currentCredits < amount) {
      throw new Error("Insufficient credits available");
    }

    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });
    } catch {
      const updated = Math.max(0, currentCredits - amount);
      fallbackCredits.set(userId, updated);
      return { id: userId, credits: updated };
    }
  },
};
