import { createContext, useState } from 'react';

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [weight, setWeight] = useState('');
  const [numberofitems, setNumberOfItems] = useState('');
  const [bagNumber, setBagNumber] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState(null);

  return (
    <OrderContext.Provider value={{
      weight,
      setWeight,
      numberofitems,
      setNumberOfItems,
      bagNumber,
      setBagNumber,
      roomNumber,
      setRoomNumber,
      submittedOrder,
      setSubmittedOrder,
    }}>
      {children}
    </OrderContext.Provider>
  );
};
