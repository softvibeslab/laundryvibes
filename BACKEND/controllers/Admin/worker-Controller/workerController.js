const Worker = require("../../../models/Worker/workerModel");
const User = require("../../../models/user");
const bcrypt = require("bcryptjs");
const { normalizeEmail, isValidEmail, isValidPassword } = require("../../../utils/credentials");
const { auditHttp } = require('../../../services/auditService');
const { runInTransaction } = require('../../../services/transactionService');

const createWorker = async (req, res, next) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "El correo electrónico y la contraseña son obligatorios." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Ingresa un correo electrónico válido." });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ message: "La contraseña debe tener al menos 8 caracteres." });
  }

  try {
    const [existingWorker, existingUser] = await Promise.all([
      Worker.findOne({ email }),
      User.findOne({ email }),
    ]);
    if (existingWorker || existingUser) {
      return res
        .status(400)
        .json({ message: "Ya existe una cuenta con este correo electrónico." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newWorker = await runInTransaction(async (session) => {
      const worker = new Worker({ email, password: hashedPassword });
      await worker.save({ session });
      await auditHttp(req, 'account.worker_created', { type: 'account', id: String(worker._id) }, { role: worker.role }, { session });
      return worker;
    }, { transactionRunner: req.app?.locals?.config?.transactionRunner });

    res.status(201).json({ message: "Trabajador añadido correctamente", worker: { id: newWorker._id, email: newWorker.email, role: newWorker.role } });
  } catch (error) { return next(error); }
};



module.exports = { createWorker  };