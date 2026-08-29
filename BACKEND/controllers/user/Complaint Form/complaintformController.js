const Complaint = require('../../../models/user/Complaint Form/complaintModel');
const User = require('../../../models/user');

// Function to handle complaint submission
const submitComplaint = async (req, res, next) => {
  const { typeOfComplaint, description } = req.body;
  const userId = req.user.userId;

  // Basic validation
  if (!userId || !typeOfComplaint || !description) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  }

  try {
    // Fetch user details (name and address) based on the userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Create a new complaint
    const newComplaint = new Complaint({
      userId,
      bagNumber: user.bagNumber,
      typeOfComplaint,
      description,
      userName: user.name,  // Adding user's name to the complaint
      userAddress: `${user.buildingName}, ${user.roomNumber}`, // Adding user's address
    });

    // Save the complaint to the database
    await newComplaint.save();

    res.status(201).json({ message: 'Reclamación enviada correctamente', complaint: {
      id: String(newComplaint._id), bagNumber: newComplaint.bagNumber,
      typeOfComplaint: newComplaint.typeOfComplaint, description: newComplaint.description,
      createdAt: newComplaint.createdAt,
    } });
  } catch (error) {
    return next(error);
  }
};

module.exports = { submitComplaint };
