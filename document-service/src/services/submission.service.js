import prisma from "../db.js";
import { deleteFile } from "../utils/fileUtils.js";
import { validateStudentInGroup } from "../utils/academicService.js";
import logger from "../utils/logger.js";

const paginate = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  return { skip: (p - 1) * l, take: l, page: p, limit: l };
};

export const listSubmissions = async (
  { assignment_id, submitted_by, page, limit },
  requestingUser,
) => {
  const { skip, take, page: p, limit: l } = paginate(page, limit);

  const where = {};
  if (assignment_id) where.exercise_assignment_id = parseInt(assignment_id, 10);
  if (submitted_by) where.submitted_by = parseInt(submitted_by, 10);

  if (requestingUser.role === "stagiaire") {
    where.submitted_by = requestingUser.id;
  }

  if (requestingUser.role === "formateur") {
    where.assignment = { assigned_by: requestingUser.id };
  }

  const [total, data] = await Promise.all([
    prisma.exerciseSubmission.count({ where }),
    prisma.exerciseSubmission.findMany({
      where,
      skip,
      take,
      orderBy: { submission_date: "desc" },
      include: {
        assignment: {
          select: {
            id: true,
            document_id: true,
            group_id: true,
            due_date: true,
          },
        },
      },
    }),
  ]);

  return {
    data,
    pagination: { total, page: p, limit: l, total_pages: Math.ceil(total / l) },
  };
};

export const createSubmission = async (
  { exercise_assignment_id, file_path },
  submittedBy,
  bearerToken,
) => {
  const assignment = await prisma.exerciseAssignment.findUniqueOrThrow({
    where: { id: exercise_assignment_id },
  });

  if (assignment.due_date && new Date() > new Date(assignment.due_date)) {
    throw {
      status: 400,
      message: "The submission deadline for this assignment has passed",
    };
  }

  // Prevent duplicate submissions for the same assignment
  const existing = await prisma.exerciseSubmission.findFirst({
    where: { exercise_assignment_id, submitted_by: submittedBy },
  });
  if (existing) {
    throw { status: 409, message: "Vous avez déjà soumis ce devoir" };
  }

  await validateStudentInGroup(submittedBy, assignment.group_id, bearerToken);

  const submission = await prisma.exerciseSubmission.create({
    data: {
      exercise_assignment_id,
      submitted_by: submittedBy,
      file_path,
    },
    include: {
      assignment: {
        select: { id: true, document_id: true, group_id: true, due_date: true },
      },
    },
  });

  logger.info(
    { submissionId: submission.id, exercise_assignment_id, submittedBy },
    "Submission created",
  );
  return submission;
};

export const getSubmissionById = async (id, requestingUser) => {
  const submission = await prisma.exerciseSubmission.findUniqueOrThrow({
    where: { id },
    include: {
      assignment: {
        select: {
          id: true,
          document_id: true,
          group_id: true,
          due_date: true,
          assigned_by: true,
        },
      },
    },
  });

  if (
    requestingUser.role === "stagiaire" &&
    submission.submitted_by !== requestingUser.id
  ) {
    throw { status: 403, message: "You can only view your own submissions" };
  }

  if (
    requestingUser.role === "formateur" &&
    submission.assignment.assigned_by !== requestingUser.id
  ) {
    throw {
      status: 403,
      message: "You can only view submissions for your own assignments",
    };
  }

  return submission;
};

export const patchSubmissionStatus = async (id, { status }, requestingUser) => {
  const submission = await prisma.exerciseSubmission.findUniqueOrThrow({
    where: { id },
    include: { assignment: { select: { assigned_by: true } } },
  });

  if (
    requestingUser.role === "formateur" &&
    submission.assignment.assigned_by !== requestingUser.id
  ) {
    throw {
      status: 403,
      message: "You can only review submissions for your own assignments",
    };
  }

  const updated = await prisma.exerciseSubmission.update({
    where: { id },
    data: { status },
  });

  logger.info(
    { submissionId: id, status, reviewedBy: requestingUser.id },
    "Submission status updated",
  );
  return updated;
};

export const gradeSubmission = async (
  id,
  { grade, feedback },
  requestingUser,
) => {
  const submission = await prisma.exerciseSubmission.findUniqueOrThrow({
    where: { id },
    include: { assignment: { select: { assigned_by: true } } },
  });

  if (
    requestingUser.role === "formateur" &&
    submission.assignment.assigned_by !== requestingUser.id
  ) {
    throw {
      status: 403,
      message: "You can only grade submissions for your own assignments",
    };
  }

  const updated = await prisma.exerciseSubmission.update({
    where: { id },
    data: {
      ...(grade !== undefined && { grade: parseFloat(grade) }),
      ...(feedback !== undefined && { feedback }),
      status: "graded",
    },
  });

  logger.info(
    { submissionId: id, grade, gradedBy: requestingUser.id },
    "Submission graded",
  );
  return updated;
};

export const deleteSubmission = async (id, requestingUser) => {
  const submission = await prisma.exerciseSubmission.findUniqueOrThrow({
    where: { id },
    include: { assignment: { select: { assigned_by: true } } },
  });

  if (
    requestingUser.role === "stagiaire" &&
    submission.submitted_by !== requestingUser.id
  ) {
    throw { status: 403, message: "You can only delete your own submissions" };
  }

  if (
    requestingUser.role === "formateur" &&
    submission.assignment.assigned_by !== requestingUser.id
  ) {
    throw {
      status: 403,
      message: "You can only delete submissions for your own assignments",
    };
  }

  await prisma.exerciseSubmission.delete({ where: { id } });
  deleteFile(submission.file_path);

  logger.info(
    { submissionId: id, deletedBy: requestingUser.id },
    "Submission deleted",
  );
};

export const getSubmissionForDownload = async (id, requestingUser) => {
  return getSubmissionById(id, requestingUser);
};
