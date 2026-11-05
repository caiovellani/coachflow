import "server-only";

import { AlertStatus, ClientStatus, SessionStatus } from "@prisma/client";

import { evaluateAttention } from "@/lib/attention";
import { startOfDay } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getDashboard(professionalId: string, now: Date) {
  const completed = { professionalId, status: SessionStatus.COMPLETED };

  const [clients, lastSessions, weekSessions, todaySessions, recent, alerts] =
    await Promise.all([
      prisma.client.findMany({
        where: { professionalId, status: ClientStatus.ACTIVE },
        select: { id: true, name: true, startDate: true, plannedPerWeek: true },
      }),
      prisma.workoutSession.groupBy({
        by: ["clientId"],
        where: completed,
        _max: { startedAt: true },
      }),
      prisma.workoutSession.groupBy({
        by: ["clientId"],
        where: {
          ...completed,
          startedAt: { gte: new Date(now.getTime() - WEEK_MS) },
        },
        _count: { _all: true },
      }),
      prisma.workoutSession.findMany({
        where: { ...completed, startedAt: { gte: startOfDay(now) } },
        distinct: ["clientId"],
        select: { clientId: true },
      }),
      prisma.workoutSession.findMany({
        where: completed,
        orderBy: { startedAt: "desc" },
        take: 8,
        include: {
          client: { select: { id: true, name: true } },
          workoutPlan: { select: { name: true } },
          _count: { select: { exerciseLogs: true } },
        },
      }),
      prisma.alert.findMany({
        where: { professionalId, status: AlertStatus.OPEN },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true } } },
      }),
    ]);

  const lastByClient = new Map(
    lastSessions.map((row) => [row.clientId, row._max.startedAt]),
  );
  const weekByClient = new Map(
    weekSessions.map((row) => [row.clientId, row._count._all]),
  );

  const attention = clients.flatMap((client) => {
    const result = evaluateAttention(
      {
        startDate: client.startDate,
        plannedPerWeek: client.plannedPerWeek,
        lastSessionAt: lastByClient.get(client.id) ?? null,
        sessionsLastWeek: weekByClient.get(client.id) ?? 0,
      },
      now,
    );
    return result ? [{ ...result, client }] : [];
  });

  return {
    activeClients: clients.length,
    trainedToday: todaySessions.length,
    needAttention:
      new Set([
        ...attention.filter((item) => !item.inactive).map((a) => a.client.id),
        ...alerts.map((alert) => alert.clientId),
      ]).size,
    inactive: attention.filter((item) => item.inactive).length,
    attention,
    alerts,
    recent,
  };
}

export async function resolveAlert(professionalId: string, id: string) {
  const { count } = await prisma.alert.updateMany({
    where: { id, professionalId, status: AlertStatus.OPEN },
    data: { status: AlertStatus.RESOLVED, resolvedAt: new Date() },
  });
  return count === 1;
}
