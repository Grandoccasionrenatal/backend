'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    // One-time: set vat_rate=13.5 on all marquee products, 23 on all others
    try {
      const products = await strapi.entityService.findMany('api::product.product', {
        fields: ['id', 'name', 'vat_rate'],
        pagination: { limit: -1 },
      });

      for (const product of products) {
        const isMarquee = /marquee/i.test(product.name || '');
        const correctRate = isMarquee ? 13.5 : 23;
        if (product.vat_rate !== correctRate) {
          await strapi.entityService.update('api::product.product', product.id, {
            data: { vat_rate: correctRate },
          });
        }
      }
      console.log('[bootstrap] VAT rates updated for all products');
    } catch (err) {
      console.error('[bootstrap] VAT rate update failed:', err?.message);
    }
  },
};
