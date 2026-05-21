const { parseDob } = require("../../../utils/validators");
const { HttpError } = require("./auth.service");
const User = require("../models/user.model");
const UserLocation = require("../models/userLocation.model");

const VALID_GENDERS = ["male", "female", "other"];

async function getProfile(userId) {
  const result = await User.profileWithLocation(userId);
  if (result.rows.length === 0) throw new HttpError(404, "User not found.");
  const u = result.rows[0];
  return {
    id: u.id,
    phoneNumber: u.phone_number,
    displayName: u.display_name,
    email: u.email || "",
    role: u.role,
    avatarUrl: u.avatar_url || "",
    gender: u.gender || "",
    dateOfBirth: u.date_of_birth || null,
    emergencyContact: u.emergency_contact || "",
    address: u.address || "",
    latitude: u.latitude,
    longitude: u.longitude,
    locationUpdatedAt: u.location_updated_at,
    isActive: u.is_active,
    createdAt: u.created_at,
    updatedAt: u.updated_at,
  };
}

async function updateProfile(userId, input) {
  const {
    displayName,
    email,
    gender,
    dateOfBirth,
    emergencyContact,
    address,
    latitude,
    longitude,
  } = input;

  if (gender && !VALID_GENDERS.includes(gender)) {
    throw new HttpError(400, "Invalid gender value.");
  }

  let parsedDob = null;
  if (dateOfBirth !== undefined && dateOfBirth !== null && String(dateOfBirth).trim() !== "") {
    try {
      parsedDob = parseDob(dateOfBirth);
    } catch (e) {
      throw new HttpError(400, e.message);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDob > today) {
      throw new HttpError(400, "Date of birth cannot be in the future.");
    }
  }

  const fields = [];
  const values = [];

  if (displayName !== undefined) {
    fields.push(`display_name = $${values.length + 1}`);
    values.push(displayName.trim() || "User");
  }
  if (email !== undefined) {
    fields.push(`email = $${values.length + 1}`);
    values.push(email.trim());
  }
  if (gender !== undefined) {
    fields.push(`gender = $${values.length + 1}`);
    values.push(gender);
  }
  if (dateOfBirth !== undefined) {
    fields.push(`date_of_birth = $${values.length + 1}`);
    values.push(parsedDob ? parsedDob.toISOString().slice(0, 10) : null);
  }
  if (emergencyContact !== undefined) {
    fields.push(`emergency_contact = $${values.length + 1}`);
    values.push(emergencyContact.trim());
  }
  if (address !== undefined) {
    fields.push(`address = $${values.length + 1}`);
    values.push(address.trim());
  }

  if (fields.length === 0) throw new HttpError(400, "No fields to update.");

  const result = await User.updateProfileDynamic(userId, fields, values);
  if (result.rows.length === 0) throw new HttpError(404, "User not found.");
  const u = result.rows[0];

  if (latitude !== undefined && longitude !== undefined) {
    await UserLocation.upsert(userId, latitude, longitude, address || "");
  }

  const locResult = await UserLocation.getForUser(userId);
  const loc = locResult.rows[0] || {};

  return {
    id: u.id,
    phoneNumber: u.phone_number,
    displayName: u.display_name,
    email: u.email || "",
    role: u.role,
    avatarUrl: u.avatar_url || "",
    gender: u.gender || "",
    dateOfBirth: u.date_of_birth || null,
    emergencyContact: u.emergency_contact || "",
    address: loc.address || u.address || "",
    latitude: loc.latitude,
    longitude: loc.longitude,
    locationUpdatedAt: loc.location_updated_at,
  };
}

module.exports = { getProfile, updateProfile };
