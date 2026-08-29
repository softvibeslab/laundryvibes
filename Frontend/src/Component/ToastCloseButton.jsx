export default function ToastCloseButton({ closeToast }) {
  return (
    <button
      type="button"
      className="Toastify__close-button Toastify__close-button--light"
      aria-label="Cerrar notificación"
      onClick={closeToast}
    >
      ×
    </button>
  );
}
