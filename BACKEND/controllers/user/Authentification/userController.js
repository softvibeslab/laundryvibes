const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../../../models/user');
const Worker = require('../../../models/Worker/workerModel');

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const publicUser = (doc) => ({ id: String(doc._id), name: doc.name, email: doc.email, role: doc.role });

async function registerUser(req, res, next) {
  try {
    const { name, phoneNumber, buildingName, roomNumber, bagNumber, password, confirmPassword } = req.body;
    const email = normalizeEmail(req.body.email);
    if (![name, email, phoneNumber, buildingName, roomNumber, bagNumber, password, confirmPassword].every(Boolean))
      return res.status(400).json({ message: 'All fields are required.' });
    if (password !== confirmPassword || password.length < 8)
      return res.status(400).json({ message: 'Passwords must match and contain at least 8 characters.' });
    if (await User.exists({ $or: [{ email }, { phoneNumber }] }))
      return res.status(409).json({ message: 'An account with those details already exists.' });
    const created = await User.create({ name, email, phoneNumber, buildingName, roomNumber, bagNumber, password: await bcrypt.hash(password, 12) });
    return res.status(201).json({ success: true, message: 'User registered successfully', user: publicUser(created) });
  } catch (error) { return next(error); }
}

async function loginUser(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });
    const account = (await User.findOne({ email }).select('+password')) || (await Worker.findOne({ email }).select('+password'));
    if (!account || !(await bcrypt.compare(password, account.password)))
      return res.status(401).json({ message: 'Invalid email or password' });
    const config = req.app.locals.config;
    const token = jwt.sign({ userId: String(account._id), role: account.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn, subject: String(account._id) });
    return res.json({ success: true, message: 'Login successful', token, name: account.name, userId: account._id, role: account.role });
  } catch (error) { return next(error); }
}

async function forgotPassword(req, res) {
  const generic = { message: 'If that account exists, reset instructions will be sent.' };
  try {
    const account = await User.findOne({ email: normalizeEmail(req.body.email) });
    if (!account) return res.json(generic);
    const rawToken = crypto.randomBytes(32).toString('hex');
    account.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    account.resetPasswordExpires = new Date(Date.now() + req.app.locals.config.resetTtlMinutes * 60_000);
    await account.save();
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      const transporter = nodemailer.createTransport({ service: 'Gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD }, disableFileAccess: true, disableUrlAccess: true });
      const link = `${req.app.locals.config.frontendUrl}/reset-password/${rawToken}`;
      await transporter.sendMail({ from: process.env.EMAIL_USER, to: account.email, subject: 'Password reset', text: `A password reset was requested. This link expires in ${req.app.locals.config.resetTtlMinutes} minutes:\n${link}\nIgnore this message if you did not request it.` });
    }
  } catch (error) {
    console.error('Password reset delivery failed', { name: error.name });
  }
  return res.json(generic);
}

async function resetPassword(req, res, next) {
  try {
    const { newPassword, confirmPassword } = req.body;
    if (!newPassword || newPassword !== confirmPassword || newPassword.length < 8)
      return res.status(400).json({ message: 'Passwords must match and contain at least 8 characters.' });
    const digest = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
    const account = await User.findOne({ resetPasswordToken: digest, resetPasswordExpires: { $gt: new Date() } }).select('+resetPasswordToken +resetPasswordExpires');
    if (!account) return res.status(400).json({ message: 'Invalid or expired token' });
    account.password = await bcrypt.hash(newPassword, 12);
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    await account.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (error) { return next(error); }
}

async function updatePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'New password must contain at least 8 characters' });
    const account = await User.findById(req.user.userId).select('+password');
    if (!account || !(await bcrypt.compare(currentPassword || '', account.password))) return res.status(400).json({ message: 'Current password is incorrect' });
    account.password = await bcrypt.hash(newPassword, 12);
    await account.save();
    return res.json({ message: 'Password updated successfully' });
  } catch (error) { return next(error); }
}

module.exports = { registerUser, loginUser, forgotPassword, resetPassword, updatePassword, publicUser };
