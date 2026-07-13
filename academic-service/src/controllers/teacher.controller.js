import * as teacherService from "../services/teacher.service.js";

export const getAll = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    res.json(await teacherService.getAll(page, limit));
  } catch (err) {
    next(err);
  }
};

export const getById = async (req, res, next) => {
  try {
    res.json(await teacherService.getById(req.params.id));
  } catch (err) {
    next(err);
  }
};

export const getSchedule = async (req, res, next) => {
  try {
    const schedule = await teacherService.getSchedule(req.params.id);
    res.json({ teacher_id: parseInt(req.params.id), schedule });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    res.status(201).json(await teacherService.create(req.body, req.rawToken));
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    res.json(await teacherService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await teacherService.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
