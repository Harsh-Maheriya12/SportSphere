import pino from 'pino';

// Define the configuration object for the pino logger.
const loggerConfig = {
  // Set the minimum log level to be processed.
  // In development, this is set to 'debug' to show all log severities.
  // In production, it's set to 'info' to reduce log volume and focus on important events.
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Conditionally configure the log transport based on the environment.
  transport: process.env.NODE_ENV !== 'production' 
    // In development, use 'pino-pretty' to format logs for readability.
    ? {
        target: 'pino-pretty',
        options: {
          // colorize adds ANSI color codes to the output.
          colorize: true,
          // translateTime formats the timestamp into a standard format.
          translateTime: 'SYS:standard',
          // ignore removes noisy, less useful fields from the development output.
          ignore: 'pid,hostname',
        },
      } 
    // In production, 'transport' is undefined, causing pino to default to writing
    // raw JSON to stdout, which is the standard for log collection systems.
    : undefined,
};

// Create and export a single, global logger instance using the defined configuration.
const logger = pino(loggerConfig);

export default logger;