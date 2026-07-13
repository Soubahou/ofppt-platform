import * as studentService from "../services/student.service.js";

export const getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const filters = {};
    if (req.query.group_id !== undefined) filters.group_id = req.query.group_id;
    res.json(await studentService.getAll(page, limit, filters));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    res.json(await studentService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json(await studentService.create(req.body, req.rawToken));
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    res.json(await studentService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await studentService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
