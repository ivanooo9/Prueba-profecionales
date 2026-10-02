/**
 * PayPhone Frontend Helper
 * ------------------------
 * Expone la función global `iniciarPagoPayPhone` que prepara un pago contra
 * `/api/payphone/prepare` y redirige al usuario a la pasarela de pago segura
 * de PayPhone cuando la respuesta es exitosa.
 *
 * Uso:
 *   iniciarPagoPayPhone({ itemType, itemId, baseAmount, hasTax, productName })
 *
 * La función no devuelve nada; en caso de error muestra un `alert` con el
 * mensaje devuelto por el backend (o un mensaje por defecto).
 */
window.iniciarPagoPayPhone = async function ({ itemType, itemId, baseAmount, hasTax, productName } = {}) {
  try {
    const payload = { itemType, itemId, baseAmount, hasTax, productName };
    const res = await fetch('/api/payphone/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (data.success && data.payWithCardUrl) {
      window.location.href = data.payWithCardUrl;
      return;
    }
    alert(data.error || data.message || 'Error al preparar el pago con PayPhone');
  } catch (err) {
    console.error('PayPhone prepare error:', err);
    alert('Error de conexión al preparar el pago');
  }
};
