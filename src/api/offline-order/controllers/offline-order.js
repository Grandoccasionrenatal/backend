'use strict';

/**
 * offline-order controller
 */

// @ts-ignore
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::offline-order.offline-order', ({strapi})=>({
  async create(ctx){
    const {
      customer_name,
      customer_email,
      address,
      transaction_items,
      phone_number,
      details,
  } = ctx.request.body;

  if (transaction_items?.length === 0) {
    ctx.response.status = 400;
    return { error: "No items have been selected." };
}

try{

  const createdTransaction = await strapi.service("api::transaction.transaction").create({
    data: {
        customer_name,
        customer_email,
        address,
        phone_number,
        details
    }
});

for (const transaction_item of transaction_items) {
    await strapi.service("api::transaction-item.transaction-item").create({
       data: {
        units: transaction_item?.units,
        total_price: transaction_item?.total_price,
        transaction: [createdTransaction?.id],
        product: [transaction_item?.product?.id]
       }
    });
}

for (const transaction_item of transaction_items) {
    await strapi.entityService.update("api::product.product", transaction_item?.product?.id, {
        data: {
            available_units: transaction_item?.product?.attributes?.available_units - transaction_item?.units,
            is_available: (transaction_item?.product?.attributes?.available_units - transaction_item?.units) > 0
        }
    })
}

const offlineOrder = await strapi.service("api::offline-order.offline-order").create({
  data: {
    transaction: [createdTransaction?.id]
  }
})

await strapi.plugins['email'].services.email.send({
  to: process.env.ADMIN_EMAIL,

  from: 'info@grandoccasionrental.ie',
  subject: 'New Offline Order for Grand Occassion',
  text: `
    A new offline order has been made,

    The offline order ID is ${offlineOrder?.id}

    The Linked transaction ID is ${createdTransaction?.id}

    customer name - ${customer_name}

    customer email - ${customer_email}

    customer phone number - ${phone_number}

    customer address - ${address}

    more details -${details}
  `,
});

return {status: 'created'}

}catch(err){
            console.log('err:', JSON.stringify(err))
            ctx.response.status = 500
        }
  }
}));
