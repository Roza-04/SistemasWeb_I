import client from 'prom-client';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const bookingsTotal = new client.Counter({
  name: 'bookings_total',
  help: 'Total number of bookings',
  labelNames: ['status']
});

const ridesTotal = new client.Counter({
  name: 'rides_total',
  help: 'Total number of rides created'
});

const paymentsTotal = new client.Counter({
  name: 'payments_total',
  help: 'Total number of payments',
  labelNames: ['status']
});

const messagesTotal = new client.Counter({
  name: 'messages_total',
  help: 'Total number of messages sent'
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeConnections);
register.registerMetric(bookingsTotal);
register.registerMetric(ridesTotal);
register.registerMetric(paymentsTotal);
register.registerMetric(messagesTotal);

// Middleware to track metrics
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode
      },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
  });
  
  next();
};

// Setup metrics endpoint
export const setupMetrics = (app) => {
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
};

export const metrics = {
  httpRequestDuration,
  httpRequestTotal,
  activeConnections,
  bookingsTotal,
  ridesTotal,
  paymentsTotal,
  messagesTotal
};

export { register };
export default metrics;
