import prisma from "../db.js";
import { deleteFile } from "../utils/fileUtils.js";
import { validateGroupExists, validateModuleExists } from "../utils/academicService.js";
import { getGroupInfo, getStudentProfile, getModuleInfo } from "../utils/academicService.js";
import { getUserById } from "../utils/authService.js";
import logger from "../utils/logger.js";

const paginate = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listAssignments = async (
  { group_id, document_id, module_id, page, limit, mine },
  requestingUser,
  bearerToken,
) => {
  const { skip, take, page: p, limit: l } = paginate(page, limit);
  const where = {};

  // Teachers only see their own assignments
  if (requestingUser.role === "formateur") {
    where.assigned_by = requestingUser.id;
  }

  // Stagiaires with mine=true: filter to their group
  if (
    (mine === "true" || mine === true) &&
    requestingUser.role === "stagiaire"
  ) {
    const student = await getStudentProfile(requestingUser.id, bearerToken);
    if (!student?.group_id) {
      return { data: [], totalPages: 0, total: 0 };
    }
    where.group_id = student.group_id;
  }

  if (group_id) where.group_id = parseInt(group_id, 10);
  if (document_id) where.document_id = parseInt(document_id, 10);
  if (module_id) {
    where.document = {
      module_documents: { some: { module_id: parseInt(module_id, 10) } },
    };
  }

  const [total, rawData] = await Promise.all([
    prisma.exerciseAssignment.count({ where }),
    prisma.exerciseAssignment.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        document: { select: { id: true, title: true, type: true } },
        _count: { select: { submissions: true } },
      },
    }),
  ]);

  // Batch-fetch group info (parallel, failures degrade gracefully)
  const uniqueGroupIds = [
    ...new Set(rawData.map((a) => a.group_id).filter(Boolean)),
  ];
  const groupResults = await Promise.allSettled(
    uniqueGroupIds.map((gid) => getGroupInfo(gid, bearerToken)),
  );
  const groupMap = {};
  uniqueGroupIds.forEach((gid, i) => {
    if (groupResults[i].status === "fulfilled" && groupResults[i].value) {
      groupMap[gid] = groupResults[i].value;
    }
  });

  // For stagiaires: attach their own submission (if any) to each assignment row
  let mySubMap = {};
  if (requestingUser.role === "stagiaire") {
    const mySubs = await prisma.exerciseSubmission.findMany({
      where: {
        exercise_assignment_id: { in: rawData.map((a) => a.id) },
        submitted_by: requestingUser.id,
      },
    });
    mySubs.forEach((s) => {
      mySubMap[s.exercise_assignment_id] = s;
    });
  }

  const uniqueModuleIds = [
    ...new Set(rawData.map((a) => a.module_id).filter(Boolean)),
  ];
  const moduleResults = await Promise.allSettled(
    uniqueModuleIds.map((mid) => getModuleInfo(mid, bearerToken)),
  );
  const moduleMap = {};
  uniqueModuleIds.forEach((mid, i) => {
    if (moduleResults[i].status === "fulfilled" && moduleResults[i].value) {
      moduleMap[mid] = moduleResults[i].value;
    }
  });
  const data = rawData.map((a) => ({
    id: a.id,
    title: a.document?.title ?? "—",
    document_id: a.document_id,
    document_type: a.document?.type,
    group_id: a.group_id,
    group_name: groupMap[a.group_id]?.name ?? `Groupe #${a.group_id}`,
    student_count: groupMap[a.group_id]?._count?.students ?? "?",
    module_id: a.module_id,
    module_name: moduleMap[a.module_id]?.name ?? `Module #${a.module_id}`,
    submission_count: a._count.submissions,
    due_date: a.due_date,
    created_at: a.created_at,
    my_submission: mySubMap[a.id] ?? null,
  }));

  return { data, totalPages: Math.ceil(total / l), total };
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createAssignment = async (
  { document_id, group_id, module_id, due_date },
  assignedBy,
  bearerToken,
) => {
  await validateGroupExists(group_id, bearerToken);
  await validateModuleExists(module_id, bearerToken);

  const assignment = await prisma.exerciseAssignment.create({
    data: {
      document_id,
      group_id,
      module_id,
      assigned_by: assignedBy,
      due_date: due_date ? new Date(due_date) : null,
    },
    include: {
      document: { select: { id: true, title: true, type: true } },
    },
  });

  logger.info(
    { assignmentId: assignment.id, document_id, group_id, assignedBy },
    "Assignment created",
  );
  return assignment;
};

// ─── Get by id ────────────────────────────────────────────────────────────────

export const getAssignmentById = async (id) => {
  return prisma.exerciseAssignment.findUniqueOrThrow({
    where: { id },
    include: { document: { select: { id: true, title: true, type: true } } },
  });
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateAssignment = async (id, { due_date }, requestingUser) => {
  const assignment = await prisma.exerciseAssignment.findUniqueOrThrow({
    where: { id },
  });

  if (
    requestingUser.role === "formateur" &&
    assignment.assigned_by !== requestingUser.id
  ) {
    throw { status: 403, message: "You can only update your own assignments" };
  }

  const updated = await prisma.exerciseAssignment.update({
    where: { id },
    data: { due_date: due_date ? new Date(due_date) : null },
    include: { document: { select: { id: true, title: true, type: true } } },
  });

  logger.info(
    { assignmentId: id, updatedBy: requestingUser.id },
    "Assignment updated",
  );
  return updated;
};

// ─── Delete ───────────────────────────────────────────────────────────────────

export const deleteAssignment = async (id, requestingUser) => {
  const assignment = await prisma.exerciseAssignment.findUniqueOrThrow({
    where: { id },
  });

  if (
    requestingUser.role === "formateur" &&
    assignment.assigned_by !== requestingUser.id
  ) {
    throw { status: 403, message: "You can only delete your own assignments" };
  }

  await prisma.exerciseAssignment.delete({ where: { id } });
  logger.info(
    { assignmentId: id, deletedBy: requestingUser.id },
    "Assignment deleted",
  );
};

// ─── Submissions for an assignment ───────────────────────────────────────────

export const listAssignmentSubmissions = async (
  assignmentId,
  requestingUser,
  { page, limit },
  bearerToken,
) => {
  const { skip, take, page: p, limit: l } = paginate(page, limit);

  const assignment = await prisma.exerciseAssignment.findUniqueOrThrow({
    where: { id: assignmentId },
  });

  if (
    requestingUser.role === "formateur" &&
    assignment.assigned_by !== requestingUser.id
  ) {
    throw {
      status: 403,
      message: "You can only view submissions for your own assignments",
    };
  }

  const where = { exercise_assignment_id: assignmentId };

  const [total, rawData] = await Promise.all([
    prisma.exerciseSubmission.count({ where }),
    prisma.exerciseSubmission.findMany({
      where,
      skip,
      take,
      orderBy: { submission_date: "desc" },
    }),
  ]);

  // Fetch group name once (same group for all submissions of this assignment)
  const groupInfo = await getGroupInfo(assignment.group_id, bearerToken);
  const groupName = groupInfo?.name ?? `Groupe #${assignment.group_id}`;

  // Batch-fetch student names (parallel, failures degrade gracefully)
  const uniqueUserIds = [...new Set(rawData.map((s) => s.submitted_by))];
  const userResults = await Promise.allSettled(
    uniqueUserIds.map((uid) => getUserById(uid, bearerToken)),
  );
  const userMap = {};
  uniqueUserIds.forEach((uid, i) => {
    if (userResults[i].status === "fulfilled" && userResults[i].value) {
      userMap[uid] = userResults[i].value;
    }
  });

  const data = rawData.map((s) => {
    const user = userMap[s.submitted_by];
    return {
      id: s.id,
      submitted_at: s.submission_date,
      submitted_by: s.submitted_by,
      student_name: user
        ? `${user.first_name} ${user.last_name}`.trim()
        : `Utilisateur #${s.submitted_by}`,
      group_name: groupName,
      file_path: s.file_path,
      status: s.status,
      grade: s.grade,
      feedback: s.feedback,
      exercise_assignment_id: s.exercise_assignment_id,
    };
  });

  return {
    data,
    pagination: { total, page: p, limit: l, total_pages: Math.ceil(total / l) },
  };
};
