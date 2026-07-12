const { z } = require('zod');

const id = z.coerce.number().int().positive();
const login = z.object({ username: z.string().trim().min(1).max(80), password: z.string().min(8).max(200), otp_code: z.string().regex(/^\d{6}$/).optional() }).strict();
const citizenLogin = z.object({ email: z.string().trim().email().max(254), password: z.string().min(8).max(200) }).strict();
const recover = z.object({ channel: z.literal('email'), identifier: z.string().trim().min(3).max(254) }).strict();
const profile = z.object({ full_name: z.string().trim().min(3).max(200).optional(), phone: z.string().trim().regex(/^\+?[0-9() -]{7,40}$/).optional(), notification_email: z.boolean().optional(), notification_web: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo actualizable');

module.exports = { id, login, citizenLogin, recover, profile };
