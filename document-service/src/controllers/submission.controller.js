import * as submissionService from "../services/submission.service.js";
import { streamFile } from "../utils/fileUtils.js";

export const list = async (req, res, next) => {
  try {
    const result = await submissionService.listSubmissions(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "A file is required" });
    }

    const file_path = `submissions/${req.file.filename}`;

    const submission = await submissionService.createSubmission(
      {
        exercise_assignment_id: parseInt(req.body.exercise_assignment_id, 10),
        file_path,
      },
      req.user.id,
      req.rawToken,
    );

    res.status(201).json(submission);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionById(
      parseInt(req.params.id, 10),
      req.user,
    );
    res.json(submission);
  } catch (err) {
    next(err);
  }
};

export const patchStatus = async (req, res, next) => {
  try {
    const submission = await submissionService.patchSubmissionStatus(
      parseInt(req.params.id, 10),
      req.body,
      req.user,
    );
    res.json(submission);
  } catch (err) {
    next(err);
  }
};

export const grade = async (req, res, next) => {
  try {
    const submission = await submissionService.gradeSubmission(
      parseInt(req.params.id, 10),
      req.body,
      req.user,
    );
    res.json(submission);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await submissionService.deleteSubmission(
      parseInt(req.params.id, 10),
      req.user,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const download = async (req, res, next) => {
  try {
    const submission = await submissionService.getSubmissionForDownload(
      parseInt(req.params.id, 10),
      req.user,
    );
    streamFile(res, submission.file_path, `submission-${submission.id}.pdf`);
  } catch (err) {
    next(err);
  }
};
