import { OPEN_STATUSES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

const memberUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  title: true,
  department: true,
  isActive: true,
} as const;

export async function serializeTeam(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: {
        orderBy: [{ role: "desc" }, { createdAt: "asc" }],
        include: { user: { select: memberUserSelect } },
      },
    },
  });
  if (!team) return null;

  const memberIds = team.members.map((member) => member.userId);
  const ticketWhere = {
    OR: [{ teamId: team.id }, ...(memberIds.length ? [{ assigneeId: { in: memberIds } }] : [])],
  };

  const [assignedTicketCount, openTicketCount] = await Promise.all([
    prisma.ticket.count({ where: ticketWhere }),
    prisma.ticket.count({
      where: {
        ...ticketWhere,
        status: { in: OPEN_STATUSES },
      },
    }),
  ]);

  return {
    id: team.id,
    name: team.name,
    description: team.description,
    createdAt: team.createdAt.toISOString(),
    memberCount: team.members.length,
    assignedTicketCount,
    openTicketCount,
    members: team.members.map((member) => ({
      membershipId: member.id,
      teamRole: member.role,
      ...member.user,
    })),
  };
}

export async function serializeTeams() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    select: { id: true },
  });
  const serialized = await Promise.all(teams.map((team) => serializeTeam(team.id)));
  return serialized.filter((team) => team !== null);
}
