const Order = require("../../../models/userOrder");
const mongoose = require('mongoose')

const orderDto = (order) => ({
  id: String(order._id),
  numberOfClothes: order.numberOfClothes,
  weight: order.weight,
  status: order.status,
  createdAt: order.createdAt,
});

const submitOrder = async (req, res, next) => {


 
  

    const numberOfClothes = Number(req.body.numberOfClothes);
    const weight = Number(req.body.weight);
    const userId = req.user.userId;

    if(!Number.isInteger(numberOfClothes) || numberOfClothes < 1){
      return res.status(400).json({message:"El número de prendas debe ser un número entero positivo"})
    }
    if(!Number.isFinite(weight) || weight <= 0){
      return res.status(400).json({message:"El peso debe ser mayor que cero"})
    }

    try {
    const newOrder = new Order({
      userId,
      numberOfClothes,
      weight,
     

    });



    await newOrder.save();
    req.app.locals.io?.to('workers').emit('orders:refresh');
    return res.status(201).json({ message: "Pedido enviado correctamente", order: orderDto(newOrder) });
  } catch (error) {
    return next(error);
  }
};




// Get all orderes with number of  orders

const getOrderSummary = async (req, res, next) => {
  try {


    const userId =  new mongoose.Types.ObjectId(req.user.userId);
   const orders = await Order.find({userId}).sort({createdAt : -1})

   if(!orders || orders.length === 0 ){
    return res.status(404).json({message:"No se encontraron pedidos"});
   }

  //  total orders
   const totalOrders = orders.length;

  //  Pending order
    const pendingOrders = await Order.find({userId, status:"Pending"})

  //  length of pending order
    const lengthOfPending = pendingOrders.length;

  //  Completed order
    const completeOrders = await Order.find({userId ,status : "Completed"})

  //  length of completed order
    const lengthOfComplete = completeOrders.length;
    
   const formattedOrders = orders.map(order => ({
    orderId: order._id,
    numberOfClothes: order.numberOfClothes,
    weight: order.weight,
    status: order.status,
    createdAt: new Date(order.createdAt).toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}));

res.status(200).json({
  totalOrders,
  lengthOfPending,
  lengthOfComplete,
  order:formattedOrders
})


  } catch (error) { return next(error); }
};



module.exports = {submitOrder, getOrderSummary };
