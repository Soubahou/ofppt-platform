import { hashPassword } from './hash.js'

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'ofppt.ma'

const normaliseNamePart = (str) =>
  str
    .trim()
    .toLowerCase()
    .normalize('NFD')                
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/[^a-z0-9]/g, '')       

export const generateEmail = (firstName, lastName) => {
  const local = `${normaliseNamePart(firstName)}.${normaliseNamePart(lastName)}`
  return `${local}@${EMAIL_DOMAIN}`
}

export const generatePassword = (firstName, dateOfBirth) => {

  const year        = dateOfBirth.getFullYear()
  const capitalised = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
  return `${capitalised}@${year}`
}

export const generateDefaultPasswordHash = async (firstName, dateOfBirth) => {
  const password = generatePassword(firstName, dateOfBirth)
  return {
    plainPassword:  password,
    hashedPassword: await hashPassword(password),
  }
}
