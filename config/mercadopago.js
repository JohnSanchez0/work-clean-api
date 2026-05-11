const { MercadoPagoConfig, Preference } = require('mercadopago');

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: 'abc',
    locale: 'es-CO' // Especificar Colombia
  }
});

// Instancia de Preference para crear preferencias de pago
const preference = new Preference(client);

module.exports = {
  client,
  preference
};
