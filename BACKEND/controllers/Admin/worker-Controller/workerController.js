const Worker = require("../../../models/Worker/workerModel");
const bcrypt = require("bcryptjs");

const createWorker = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "El correo electrónico y la contraseña son obligatorios." });
  }

  try {
    const existingWorker = await Worker.findOne({ email });
    if (existingWorker) {
      return res
        .status(400)
        .json({ message: "Ya existe un trabajador con este correo electrónico." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newWorker = new Worker({
      email,
      password: hashedPassword,
    });
    await newWorker.save();

    res.status(201).json({ message: "Trabajador añadido correctamente", worker: { id: newWorker._id, email: newWorker.email, role: newWorker.role } });
  } catch (error) { return next(error); }
};



module.exports = { createWorker  };