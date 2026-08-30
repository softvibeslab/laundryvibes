const Order = require('../../../models/userOrder');
const { financialDto } = require('../../../utils/orderDto');

function orderDto(order) {
  const user = order.userId || {};
  return {
    id: String(order._id), OrderId: order._id, userName: user.name || 'N/A', phoneNumber: user.phoneNumber,
    bagNumber: user.bagNumber, numberOfItems: order.numberOfClothes,
    numberOfClothes: order.numberOfClothes, weight: order.weight, status: order.status,
    createdAt: order.createdAt,
    ...financialDto(order),
    date: new Date(order.createdAt).toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata' }),
    time: new Date(order.createdAt).toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
  };
}

async function getWorkerOrders(req, res, next) {
  try {
    const orders = await Order.find().populate('userId', 'name phoneNumber bagNumber').sort({ createdAt: -1 });
    return res.json({
      totalOrders: orders.length,
      pendingOrders: orders.filter((o) => o.status === 'Pending').length,
      completedOrders: orders.filter((o) => o.status === 'Completed').length,
      orders: orders.map(orderDto),
    });
  } catch (error) { return next(error); }
}

async function updateOrderStatus(req, res, next) {
  try {
    const order = await Order.findById(req.params.orderId).populate('userId', 'phoneNumber name');
    if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
    const alreadyCompleted = order.status === 'Completed';
    order.status = 'Completed';
    await order.save();
    req.app.locals.io?.to('workers').emit('orders:refresh');
    if (order.userId?._id) req.app.locals.io?.to(`user:${order.userId._id}`).emit('orders:refresh');

    let notification = order.smsSent ? 'already-sent' : 'not-configured';
    if (!alreadyCompleted && !order.smsSent && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && order.userId?.phoneNumber) {
      try {
        const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
          body: `LaundryVibes: tu pedido ${order._id} está completo y listo.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: order.userId.phoneNumber,
        });
        order.smsSent = true;
        await order.save();
        notification = 'sent';
      } catch (error) {
        notification = 'failed';
        console.error('Best-effort SMS failed', { orderId: String(order._id), name: error.name });
      }
    }
    return res.json({ message: 'Estado del pedido actualizado', order: { id: order._id, status: order.status }, notification });
  } catch (error) { return next(error); }
}

module.exports = { getWorkerOrders, updateOrderStatus };
