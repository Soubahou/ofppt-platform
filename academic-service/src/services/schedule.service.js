import prisma from "../db.js";
import logger from "../utils/logger.js";

const toJsDay = (dow) => (dow === 6 ? 0 : dow + 1);

const datesForDow = (start, end, dayOfWeek) => {
  const dates = [];
  const jsDay = toJsDay(dayOfWeek);
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    if (cursor.getDay() === jsDay) dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const getMondayOf = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const sessionFullInclude = {
  module_teacher_group: {
    include: {
      module_teacher: { include: { module: true, teacher: true } },
      group: true,
    },
  },
  room: true,
};

export const getAllSessions = async (page = 1, limit = 10, filters = {}) => {
  const skip = (page - 1) * limit;
  const take = Math.min(limit, 100);
  const where = {};

  if (filters.module_teacher_group_id)
    where.module_teacher_group_id = parseInt(filters.module_teacher_group_id);

  if (filters.day_of_week !== undefined)
    where.day_of_week = parseInt(filters.day_of_week);

  if (filters.room_id) where.room_id = parseInt(filters.room_id);

  if (filters.group_id)
    where.module_teacher_group = { group_id: parseInt(filters.group_id) };

  if (filters.scheduled === "true") where.day_of_week = { not: null };
  else if (filters.scheduled === "false") where.day_of_week = null;

  const [data, total] = await Promise.all([
    prisma.session.findMany({
      where,
      skip,
      take,
      orderBy: [{ day_of_week: "asc" }, { start_slot: "asc" }],
      include: sessionFullInclude,
    }),
    prisma.session.count({ where }),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit: take,
      total_pages: Math.ceil(total / take),
    },
  };
};

export const getSessionById = async (id) => {
  const session = await prisma.session.findUnique({
    where: { id: parseInt(id) },
    include: sessionFullInclude,
  });
  if (!session) throw { status: 404, message: "Session not found" };
  return session;
};

export const createSession = async (payload) => {
  const {
    module_teacher_group_id,
    day_of_week,
    start_slot,
    slot_count,
    is_online,
    room_id,
  } = payload;

  const mtg = await prisma.moduleTeacherGroup.findUnique({
    where: { id: module_teacher_group_id },
  });
  if (!mtg)
    throw {
      status: 400,
      message: `module_teacher_group id ${module_teacher_group_id} not found`,
    };

  if (room_id) {
    const room = await prisma.room.findUnique({ where: { id: room_id } });
    if (!room)
      throw { status: 400, message: `Room with id ${room_id} not found` };
  }

  const session = await prisma.session.create({
    data: {
      module_teacher_group_id,
      day_of_week: day_of_week ?? null,
      start_slot: start_slot ?? null,
      slot_count,
      is_online,
      room_id: room_id || null,
    },
    include: sessionFullInclude,
  });
  logger.info({ sessionId: session.id }, "Session created");
  return session;
};

export const placeSession = async (id, { day_of_week, start_slot }) => {
  const session = await prisma.session.findUnique({
    where: { id: parseInt(id) },
    include: { module_teacher_group: true },
  });
  if (!session) throw { status: 404, message: "Session not found" };

  const dow = parseInt(day_of_week);
  const ss = parseInt(start_slot);

  if (dow < 0 || dow > 4)
    throw {
      status: 400,
      message: "day_of_week doit être entre 0 (Lundi) et 4 (Vendredi)",
    };
  if (ss < 0 || ss + session.slot_count > 4)
    throw {
      status: 409,
      message: "La séance dépasse les créneaux disponibles sur cette journée",
    };

  // ── 1. Group conflict — same group, same day, overlapping slots ────────────
  const groupCandidates = await prisma.session.findMany({
    where: {
      id: { not: parseInt(id) },
      day_of_week: dow,
      module_teacher_group: { group_id: session.module_teacher_group.group_id },
    },
  });

  const hasGroupConflict = groupCandidates.some((c) => {
    if (c.start_slot == null) return false;
    const cEnd = c.start_slot + c.slot_count;
    const sEnd = ss + session.slot_count;
    return c.start_slot < sEnd && ss < cEnd;
  });

  if (hasGroupConflict)
    throw {
      status: 409,
      message:
        "Créneau occupé : un autre cours est déjà planifié pour ce groupe à ce moment",
    };

  // ── 2. Room conflict — same room, same day, overlapping slots ──────────────
  if (session.room_id) {
    const roomCandidates = await prisma.session.findMany({
      where: {
        id: { not: parseInt(id) },
        day_of_week: dow,
        room_id: session.room_id,
        start_slot: { not: null },
      },
    });

    const hasRoomConflict = roomCandidates.some((c) => {
      const cEnd = c.start_slot + c.slot_count;
      const sEnd = ss + session.slot_count;
      return c.start_slot < sEnd && ss < cEnd;
    });

    if (hasRoomConflict)
      throw {
        status: 409,
        message: "Conflit de salle : cette salle est déjà occupée à ce créneau",
      };
  }

  // ── 3. Teacher conflict — same teacher, same day, overlapping slots ────────
  if (session.module_teacher_group) {
    const mt = await prisma.moduleTeacher.findUnique({
      where: { id: session.module_teacher_group.module_teacher_id },
    });

    if (mt) {
      const teacherCandidates = await prisma.session.findMany({
        where: {
          id: { not: parseInt(id) },
          day_of_week: dow,
          module_teacher_group: {
            module_teacher: { teacher_id: mt.teacher_id },
          },
          start_slot: { not: null },
        },
      });

      const hasTeacherConflict = teacherCandidates.some((c) => {
        const cEnd = c.start_slot + c.slot_count;
        const sEnd = ss + session.slot_count;
        return c.start_slot < sEnd && ss < cEnd;
      });

      if (hasTeacherConflict)
        throw {
          status: 409,
          message:
            "Conflit formateur : ce formateur a déjà une séance à ce créneau",
        };
    }
  }

  const updated = await prisma.session.update({
    where: { id: parseInt(id) },
    data: { day_of_week: dow, start_slot: ss },
    include: sessionFullInclude,
  });
  logger.info(
    { sessionId: updated.id, day_of_week: dow, start_slot: ss },
    "Session placed",
  );
  return updated;
};

export const unplaceSession = async (id) => {
  const session = await getSessionById(id);
  const updated = await prisma.session.update({
    where: { id: parseInt(id) },
    data: { day_of_week: null, start_slot: null },
    include: sessionFullInclude,
  });
  logger.info({ sessionId: session.id }, "Session unplaced");
  return updated;
};

export const updateSession = async (id, payload) => {
  await getSessionById(id);
  const session = await prisma.session.update({
    where: { id: parseInt(id) },
    data: payload,
    include: sessionFullInclude,
  });
  logger.info({ sessionId: session.id }, "Session updated");
  return session;
};

export const deleteSession = async (id) => {
  await getSessionById(id);
  await prisma.session.delete({ where: { id: parseInt(id) } });
  logger.info({ sessionId: parseInt(id) }, "Session deleted");
};

export const generateInstances = async (
  sessionId,
  startDateStr,
  endDateStr,
) => {
  const session = await getSessionById(sessionId);
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  if (start > end)
    throw { status: 400, message: "start_date must be before end_date" };

  const dates = datesForDow(start, end, session.day_of_week);
  let created = 0,
    skipped = 0;

  for (const date of dates) {
    const existing = await prisma.sessionInstance.findUnique({
      where: { session_id_date: { session_id: session.id, date } },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.sessionInstance.create({
      data: { session_id: session.id, date, is_cancelled: false },
    });
    created++;
  }
  logger.info({ sessionId, created, skipped }, "Instances generated");
  return { created, skipped, total_dates: dates.length };
};

export const patchInstance = async (id, payload) => {
  const instance = await prisma.sessionInstance.findUnique({
    where: { id: parseInt(id) },
    include: { session: true },
  });
  if (!instance) throw { status: 404, message: "Session instance not found" };

  const updated = await prisma.sessionInstance.update({
    where: { id: parseInt(id) },
    data: payload,
    include: { session: true, override_room: true },
  });
  logger.info({ instanceId: id }, "Instance patched");
  return updated;
};

export const getWeekForGroup = async (dateStr, groupId) => {
  const monday = getMondayOf(new Date(dateStr));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const mtGroups = await prisma.moduleTeacherGroup.findMany({
    where: { group_id: parseInt(groupId), is_active: true },
    include: {
      sessions: {
        include: {
          room: true,
          instances: {
            where: { date: { gte: monday, lte: sunday } },
            include: { override_room: true },
          },
        },
      },
      module_teacher: { include: { module: true, teacher: true } },
      group: true,
    },
  });

  return buildWeekView(mtGroups, monday);
};

export const getWeekForTeacher = async (dateStr, teacherId) => {
  const monday = getMondayOf(new Date(dateStr));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const moduleTeachers = await prisma.moduleTeacher.findMany({
    where: { teacher_id: parseInt(teacherId) },
    include: {
      module: true,
      module_teacher_groups: {
        where: { is_active: true },
        include: {
          group: true,
          sessions: {
            include: {
              room: true,
              instances: {
                where: { date: { gte: monday, lte: sunday } },
                include: { override_room: true },
              },
            },
          },
        },
      },
    },
  });

  const mtGroups = moduleTeachers.flatMap((mt) =>
    mt.module_teacher_groups.map((mtg) => ({ ...mtg, module_teacher: mt })),
  );

  return buildWeekView(mtGroups, monday);
};

const buildWeekView = (mtGroups, monday) => {
  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  const week = {};
  days.forEach((d, i) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + i);
    week[d] = { date: date.toISOString().split("T")[0], slots: [] };
  });

  for (const mtg of mtGroups) {
    for (const session of mtg.sessions) {
      if (session.day_of_week == null) continue;
      const dayName = days[session.day_of_week];
      if (!dayName) continue;

      const instance = session.instances.find(
        (inst) => inst.session_id === session.id,
      );
      if (!instance) continue

      week[dayName].slots.push({
        session_id: session.id,
        start_slot: session.start_slot,
        slot_count: session.slot_count,
        is_online: session.is_online,
        room: session.room,
        module: {
          id: mtg.module_teacher.module.id,
          name: mtg.module_teacher.module.name,
          type: mtg.module_teacher.module.type,
        },
        teacher: mtg.module_teacher.teacher
          ? {
              user_id: mtg.module_teacher.teacher.user_id,
              specialization: mtg.module_teacher.teacher.specialization,
            }
          : null,
        group: { id: mtg.group.id, name: mtg.group.name },
        instance: instance
          ? {
              id: instance.id,
              date: instance.date,
              is_cancelled: instance.is_cancelled,
              override_room: instance.override_room,
            }
          : null,
      });
    }
  }

  for (const day of Object.values(week)) {
    day.slots.sort((a, b) => (a.start_slot ?? 0) - (b.start_slot ?? 0));
  }

  return week;
};

export const generateWeekInstances = async (groupId, weekStartDate) => {
  const monday = getMondayOf(new Date(weekStartDate))

  // Get all placed sessions for this group
  const sessions = await prisma.session.findMany({
    where: {
      day_of_week: { not: null },
      start_slot:  { not: null },
      module_teacher_group: { group_id: parseInt(groupId) },
    },
  })

  if (sessions.length === 0)
    throw { status: 400, message: 'Aucune séance placée pour ce groupe. Placez des séances dans le constructeur EDT d\'abord.' }

  let created = 0
  let skipped = 0

  for (const session of sessions) {
    const sessionDate = new Date(monday)
    sessionDate.setDate(monday.getDate() + session.day_of_week)
    sessionDate.setHours(0, 0, 0, 0)

    // Skip if instance already exists for this day
    const existing = await prisma.sessionInstance.findFirst({
      where: { session_id: session.id, date: sessionDate },
    })

    if (existing) { skipped++; continue }

    await prisma.sessionInstance.create({
      data: { session_id: session.id, date: sessionDate, is_cancelled: false },
    })
    created++
  }

  logger.info({ groupId, weekStart: monday.toISOString(), created, skipped }, 'Week instances generated')
  return {
    week_start:        monday.toISOString().split('T')[0],
    sessions_total:    sessions.length,
    instances_created: created,
    instances_skipped: skipped,
  }
}