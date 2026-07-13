import * as assignmentService from "../services/assignment.service.js";

export const list = async (req, res, next) => {
  try {
    const result = await assignmentService.listAssignments(
      req.query,
      req.user,
      req.rawToken,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const assignment = await assignmentService.createAssignment(
      req.body,
      req.user.id,
      req.rawToken,
    );
    res.status(201).json(assignment);
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    const assignment = await assignmentService.getAssignmentById(
      parseInt(req.params.id, 10),
    );
    res.json(assignment);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const assignment = await assignmentService.updateAssignment(
      parseInt(req.params.id, 10),
      req.body,
      req.user,
    );
    res.json(assignment);
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await assignmentService.deleteAssignment(
      parseInt(req.params.id, 10),
      req.user,
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const listSubmissions = async (req, res, next) => {
  try {
    const result = await assignmentService.listAssignmentSubmissions(
      parseInt(req.params.id, 10),
      req.user,
      req.query,
      req.rawToken,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};
