// Compatibilidad para imports antiguos. La maqueta de alta manual fue deshabilitada:
// el contrato actual sólo permite que el cliente cree pedidos desde su cuenta.
export default function NewOrder({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><section role="dialog" aria-modal="true" aria-labelledby="new-order-disabled-title" className="w-full max-w-md rounded-xl bg-white p-6"><h2 id="new-order-disabled-title" className="text-xl font-bold">Alta operativa no disponible</h2><p className="mt-2 text-gray-600">Este formulario era una maqueta y no enviaba datos. Los clientes deben crear sus pedidos desde “Realizar pedido”.</p><button type="button" autoFocus onClick={onClose} className="mt-5 min-h-11 w-full rounded bg-blue-700 font-semibold text-white">Entendido</button></section></div>;
}
