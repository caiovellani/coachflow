import "server-only";

import { prisma } from "@/lib/prisma";
import { generateLinkCode, LINK_CODE_TTL_MS } from "@/lib/whatsapp/link-code";

export async function createLinkCode(professionalId: string, clientId: string) {
  const { count } = await prisma.client.updateMany({
    where: { id: clientId, professionalId },
    data: {
      whatsappLinkCode: generateLinkCode(),
      whatsappLinkCodeExpiresAt: new Date(Date.now() + LINK_CODE_TTL_MS),
    },
  });
  return count === 1;
}
