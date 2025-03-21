module.exports = ({ env }) => ({
  // ...
  upload: {
    config: {
      provider: 'cloudinary',
      providerOptions: {
        cloud_name: env('CLOUDINARY_NAME'),
        api_key: env('CLOUDINARY_KEY'),
        api_secret: env('CLOUDINARY_SECRET'),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
  // email: {
  //   config: {
  //     provider: 'sendgrid',
  //     providerOptions: {
  //       apiKey: env('SENDGRID_API_KEY'),
  //     },
  //     settings: {
  //       defaultFrom: 'info@grandoccasionrental.ie',
  //       defaultReplyTo: 'info@grandoccasionrental.ie',
  //     },
  //   },
  // },  




    email: {
      config: {
        // Use an official Postmark provider package for Strapi, for example:
        provider: '@joshmeads/strapi-provider-email-postmark',
        providerOptions: {
          serverToken: env('POSTMARK_SERVER_TOKEN'),
        },
        settings: {
          defaultFrom: env('POSTMARK_DEFAULT_FROM', 'noreply@yourdomain.com'),
          defaultReplyTo: env('POSTMARK_DEFAULT_REPLY_TO', 'support@yourdomain.com'),
        },
      },
    },

  // ...
});