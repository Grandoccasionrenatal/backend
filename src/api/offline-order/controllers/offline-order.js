'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::offline-order.offline-order', ({ strapi }) => ({
  async create(ctx) {
    const {
      customer_name,
      customer_email,
      address,
      transaction_items,
      phone_number,
      details
    } = ctx.request.body;

    if (!transaction_items?.length) {
      ctx.response.status = 400;
      return { error: 'No items have been selected.' };
    }

    try {
      const createdTransaction = await strapi.service('api::transaction.transaction').create({
        data: {
          customer_name,
          customer_email,
          address,
          phone_number,
          details
        }
      });

      for (const item of transaction_items) {
        await strapi.service('api::transaction-item.transaction-item').create({
          data: {
            units: item?.units,
            total_price: item?.total_price,
            transaction: [createdTransaction?.id],
            product: [item?.product?.id]
          }
        });
      }

      for (const item of transaction_items) {
        await strapi.entityService.update('api::product.product', item?.product?.id, {
          data: {
            available_units: item?.product?.attributes?.available_units - item?.units,
            is_available: (item?.product?.attributes?.available_units - item?.units) > 0
          }
        });
      }

      const offlineOrder = await strapi.service('api::offline-order.offline-order').create({
        data: { transaction: [createdTransaction?.id] }
      });

      // Build items list for email
      const itemsList = transaction_items
        .map((i) => `  • ${i?.product?.attributes?.name ?? 'Product'} x${i?.units} — €${(i?.total_price ?? 0).toFixed(2)}`)
        .join('\n');

      const estimatedTotal = transaction_items
        .reduce((acc, i) => acc + (i?.total_price ?? 0) * (i?.units ?? 1), 0);

      await strapi.plugins['email'].services.email.send({
        to: process.env.ADMIN_EMAIL,
        from: 'info@grandoccasionrental.ie',
        subject: `📦 New Booking Enquiry — ${customer_name}`,
        text: `
NEW BOOKING ENQUIRY — Grand Occasion Rental Limited
====================================================

CUSTOMER DETAILS
----------------
Name:          ${customer_name}
Email:         ${customer_email}
Phone:         ${phone_number}

EVENT & DELIVERY
----------------
Address:       ${address || 'Not provided'}
${details ? `Details:       ${details}` : ''}

ITEMS REQUESTED
---------------
${itemsList}

Estimated Total: €${estimatedTotal.toFixed(2)} (excl. delivery)

BOOKING REFERENCE
-----------------
Offline Order ID:  #${offlineOrder?.id}
Transaction ID:    #${createdTransaction?.id}

====================================================
Reply to this email or call ${customer_name} on ${phone_number} to confirm the booking.
        `.trim()
      });

      return { status: 'created' };
    } catch (err) {
      console.error('Offline order error:', JSON.stringify(err));
      ctx.response.status = 500;
    }
  }
}));
