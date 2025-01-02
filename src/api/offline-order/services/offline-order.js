'use strict';

/**
 * offline-order service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::offline-order.offline-order');
