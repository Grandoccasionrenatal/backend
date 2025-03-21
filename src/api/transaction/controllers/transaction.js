// stripe
// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)


'use strict';

/**
 * transaction controller
 */

// @ts-ignore
const { createCoreController } = require('@strapi/strapi').factories;


module.exports = createCoreController('api::transaction.transaction', ({strapi})=>({
    async create(ctx){

    //    console.log('ctx', ctx?.request?.body)

        const {
            transaction_date,
            return_date,
            total_price,
            customer_name,
            shipping,
            transaction_items,
            customer_email,
            distance,
            address
        } = ctx.request.body;

        if (transaction_items?.length === 0) {
            ctx.response.status = 400;
            return { error: "No items have been selected." };
        }

        try{
            const lineItems = await Promise.all(
                transaction_items?.map(async(item)=> {
                    const product = await strapi.service("api::product.product").findOne(item?.product?.id)


                    return {
                        price_data: {
                            currency: "eur",
                            product_data: {
                                name: `${product?.name} (${item?.product?.images?.data[0]?.attributes?.excl_vat ? `No VAT included` :  `includes ${23}% VAT`})`,
                                images: [item?.product?.images?.data[0]?.attributes?.url],

                            },
                            unit_amount: Math.round((item?.total_price / 2) * 100),
                        },
                        quantity: item?.units,
                    }
                })
            )

            

            const stripeSessionData = {
                mode: "payment",
                success_url: `${process.env.CLIENT_URL}?success=true`,
                cancel_url: `${process.env.CLIENT_URL}?success=false`,
                line_items: shipping ?
                [...lineItems, {
                  price_data: {
                    currency: "eur",
                    product_data: {
                        name: `Shipping`,
                        images: []
                    },
                    unit_amount: Number(distance) < 10 ? Math.round(Number(process.env.SHIPPING_FEE_FIXED) * 100) : Math.round(Number(process.env.SHIPPING_FEE) * Number(`${distance}`) * 100)
                },
                quantity: 1
                }]
                : lineItems,
                payment_method_types: ['card'],
                payment_intent_data: {
                  shipping: {
                    name: customer_name,
                    address: address
                  }
                }
            }

        const session = await stripe.checkout.sessions.create(!!customer_email ?
            {...stripeSessionData, customer_email: customer_email} : {...stripeSessionData}
            );

         const createdTransaction = await strapi.service("api::transaction.transaction").create({
                data: {
                    transaction_date,
                    return_date,
                    total_price,
                    customer_name,
                    shipping,
                    token: session.id,
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

            return {stripeSession: session}
        }catch(err){
            console.log('err:', err)
            ctx.response.status = 500
        }
    }
}));
