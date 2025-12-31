export const swaggerConfig = {
  title: 'ZimMarket API',
  description: 'Zimbabwe Marketplace API Documentation',
  version: '1.0',
  contact: {
    name: 'ZimMarket Support',
    email: 'support@zimmarket.co.zw',
  },
  license: {
    name: 'MIT',
    url: 'https://opensource.org/licenses/MIT',
  },
  externalDocs: {
    description: 'Find out more about ZimMarket',
    url: 'https://zimmarket.co.zw',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
    {
      url: 'https://api.zimmarket.co.zw',
      description: 'Production server',
    },
  ],
  tags: [
    {
      name: 'auth',
      description: 'Authentication and authorization endpoints',
    },
    {
      name: 'users',
      description: 'User management operations',
    },
    {
      name: 'listings',
      description: 'Product listings management',
    },
    {
      name: 'orders',
      description: 'Order processing and management',
    },
    {
      name: 'payments',
      description: 'Payment processing (EcoCash, OneMoney, Bank Transfer)',
    },
  ],
};