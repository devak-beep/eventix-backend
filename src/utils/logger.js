const winston = require('winston');
require('winston-mongodb');

// Lazy-load Audit model to avoid loading before DB connection
let Audit = null;
const getAuditModel = () => {
  if (!Audit) {
    Audit = require('../models/Audit.model');
  }
  return Audit;
};

// Detect serverless environment
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME);

const transports = [
  new winston.transports.Console({
    format: winston.format.simple()
  })
];

// Only add file transports when NOT in serverless
if (!isServerless) {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports
});

// Audit logger - console only in serverless
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: isServerless 
    ? [new winston.transports.Console()]
    : [new winston.transports.File({ filename: 'logs/audit.log' })]
});

async function logBookingStateChange(bookingId, fromState, toState, userId, correlationId, eventId = null, action = 'BOOKING_CREATED', metadata = {}) {
  // 1. Log to file (existing functionality)
  auditLogger.info({
    type: 'BOOKING_STATE_CHANGE',
    bookingId,
    fromState,
    toState,
    userId,
    correlationId,
    timestamp: new Date().toISOString()
  });

  // 2. Store in MongoDB
  try {
    const AuditModel = getAuditModel();
    await AuditModel.create({
      bookingId,
      eventId: eventId || metadata.eventId,
      fromStatus: fromState,
      toStatus: toState,
      action,
      correlationId,
      metadata: {
        ...metadata,
        userId
      }
    });
  } catch (error) {
    logger.error('Failed to store audit record in MongoDB:', error);
  }
}

function logError(error, context = {}, correlationId = null) {
  logger.error({
    message: error.message,
    stack: error.stack,
    context,
    correlationId,
    timestamp: new Date().toISOString()
  });
}

module.exports = { logger, logBookingStateChange, logError };
