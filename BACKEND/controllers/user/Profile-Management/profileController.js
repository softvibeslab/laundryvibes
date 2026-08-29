const User = require('../../../models/user');

const profileDto = (user) => ({
    id: String(user._id), name: user.name, email: user.email,
    phoneNumber: user.phoneNumber, buildingName: user.buildingName,
    roomNumber: user.roomNumber, bagNumber: user.bagNumber, address: user.address,
});

const getUserProfile = async (req,res,next) => {
    try {
        const user = await User.findById(req.user.userId)

        if(!user){
           return res.status(404).json({message:"User not found"});
        }

        res.json(profileDto(user));

    } catch(error){ return next(error); }
};

const updateUserProfile = async (req,res,next) => {
    try{
        const userId=req.user.userId
        const {phoneNumber,roomNumber,bagNumber,buildingName,address} = req.body;
        // console.log("Received Data:", req.body)

        const user = await User.findById(userId);

        // console.log("User Before Update:", user);
        if(!user){
            return res.status(404).json({message:"User not Found"});
        }

        // find the phone Number is larady in use 

        if(phoneNumber && phoneNumber !== user.phoneNumber){
            const existingNumber = await User.findOne({phoneNumber});
            if(existingNumber){
                return res.status(400).json({message:"Phone Number is alredy in use"});
            }
           
        }

      const updateUser = await User.findByIdAndUpdate(
        userId,
        {
            phoneNumber: phoneNumber || user.phoneNumber,
                bagNumber: bagNumber || user.bagNumber,
                roomNumber: roomNumber || user.roomNumber,
                buildingName: buildingName || user.buildingName,
                address: address || user.address,
            },
            { new: true }
        
      )

    //   console.log("updates user:",updateUser)

        res.status(200).json({message:"Profile Update Successfully",user : profileDto(updateUser)})

    }catch(error){ return next(error); }
}

module.exports = {getUserProfile,updateUserProfile}