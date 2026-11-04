import type { ClientStatus } from "@prisma/client";

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  ARCHIVED: "Arquivado",
};
