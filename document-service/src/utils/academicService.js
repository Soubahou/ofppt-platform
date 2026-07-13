import fetch from "node-fetch";
import logger from "./logger.js";

const ACADEMIC_SERVICE_URL =
  process.env.ACADEMIC_SERVICE_URL || "http://academic-service:3002";

export const validateModuleExists = async (moduleId, bearerToken) => {
  try {
    const res = await fetch(`${ACADEMIC_SERVICE_URL}/api/modules/${moduleId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (res.status === 404)
      throw {
        status: 400,
        message: `Module with id ${moduleId} does not exist`,
      };
    if (!res.ok)
      throw {
        status: 502,
        message: "Unexpected response from academic service",
      };
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    logger.error(
      { err, moduleId },
      "Academic service unreachable during module validation",
    );
    throw { status: 503, message: "Academic service unavailable" };
  }
};

export const validateGroupExists = async (groupId, bearerToken) => {
  try {
    const res = await fetch(`${ACADEMIC_SERVICE_URL}/api/groups/${groupId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (res.status === 404)
      throw { status: 400, message: `Group with id ${groupId} does not exist` };
    if (!res.ok)
      throw {
        status: 502,
        message: "Unexpected response from academic service",
      };
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    logger.error(
      { err, groupId },
      "Academic service unreachable during group validation",
    );
    throw { status: 503, message: "Academic service unavailable" };
  }
};

/**
 * Fetch a group's basic info including real student count (_count.students).
 * Returns null on 404 instead of throwing so callers can degrade gracefully.
 */
export const getGroupInfo = async (groupId, bearerToken) => {
  try {
    const res = await fetch(`${ACADEMIC_SERVICE_URL}/api/groups/${groupId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw { status: res.status };
    return await res.json(); // { id, name, branch, _count: { students } }
  } catch (err) {
    if (err.status) throw err;
    logger.warn(
      { err, groupId },
      "Academic service unreachable fetching group info — degrading gracefully",
    );
    return null;
  }
};

export const getModuleInfo = async (moduleId, bearerToken) => {
  try {
    const res = await fetch(`${ACADEMIC_SERVICE_URL}/api/modules/${moduleId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw { status: res.status };
    return await res.json(); // { id, name, ... }
  } catch (err) {
    if (err.status) throw err;
    logger.warn(
      { err, moduleId },
      "Academic service unreachable fetching module info — degrading gracefully",
    );
    return null;
  }
};

/**
 * Fetch a student profile by their auth user_id.
 * Returns null if the student has no profile yet (404).
 */
export const getStudentProfile = async (userId, bearerToken) => {
  try {
    const res = await fetch(`${ACADEMIC_SERVICE_URL}/api/students/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw { status: res.status };
    return await res.json(); // { user_id, group_id, group, ... }
  } catch (err) {
    if (err.status) throw err;
    logger.warn(
      { err, userId },
      "Academic service unreachable fetching student profile — degrading gracefully",
    );
    return null;
  }
};

export const validateStudentInGroup = async (userId, groupId, bearerToken) => {
  try {
    const res = await fetch(
      `${ACADEMIC_SERVICE_URL}/api/groups/${groupId}/students?limit=100`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    );
    if (res.status === 404)
      throw { status: 400, message: `Group with id ${groupId} does not exist` };
    if (!res.ok)
      throw {
        status: 502,
        message: "Unexpected response from academic service",
      };

    const body = await res.json();
    const students = body.data || body;
    const isMember =
      Array.isArray(students) && students.some((s) => s.user_id === userId);

    if (!isMember) {
      throw {
        status: 403,
        message: `You are not a member of group ${groupId} and cannot submit to this assignment`,
      };
    }
  } catch (err) {
    if (err.status) throw err;
    logger.error(
      { err, userId, groupId },
      "Academic service unreachable during student-in-group check",
    );
    throw { status: 503, message: "Academic service unavailable" };
  }
};
