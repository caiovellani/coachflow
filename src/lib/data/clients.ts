import "server-only";

import { ClientStatus, Prisma } from "@prisma/client";

import { fromDateInput } from "@/lib/dates";
import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import type { ClientInput } from "@/lib/validations/client";

// Toda funcao recebe professionalId vindo de requireProfessional() e filtra por ele.

export type ClientFilter = ClientStatus | "ALL";

function toData(input: ClientInput) {
  return {
    name: input.name,
    phone: normalizePhone(input.phone)!, // validado pelo schema
    email: input.email || null,
    goal: input.goal || null,
    notes: input.notes || null,
    plannedPerWeek: input.plannedPerWeek ? Number(input.plannedPerWeek) : null,
    startDate: fromDateInput(input.startDate),
  };
}

export function listClients(
  professionalId: string,
  { query, filter }: { query: string; filter: ClientFilter },
) {
  const where: Prisma.ClientWhereInput = { professionalId };
  if (filter !== "ALL") where.status = filter;
  if (query) {
    const digits = query.replace(/\D/g, "");
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      ...(digits ? [{ phone: { contains: digits } }] : []),
    ];
  }

  return prisma.client.findMany({ where, orderBy: { name: "asc" } });
}

export function getClient(professionalId: string, id: string) {
  return prisma.client.findFirst({ where: { id, professionalId } });
}

export function createClient(professionalId: string, input: ClientInput) {
  return prisma.client.create({ data: { ...toData(input), professionalId } });
}

export async function updateClient(
  professionalId: string,
  id: string,
  input: ClientInput,
) {
  const { count } = await prisma.client.updateMany({
    where: { id, professionalId },
    data: toData(input),
  });
  return count === 1;
}

export async function setClientStatus(
  professionalId: string,
  id: string,
  status: ClientStatus,
) {
  const { count } = await prisma.client.updateMany({
    where: { id, professionalId },
    data: { status },
  });
  return count === 1;
}
