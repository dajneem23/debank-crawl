import { configure, getLogger, Logger as JSLogger } from 'log4js';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Configure logger
 */
configure({
  appenders: {
    file: {
      type: 'file',
      filename: 'logs/app.log',
      maxLogSize: 10 * 1024 * 1024, // Max log file size 10MB
      backups: 30, // Keep 30 backup files
      compress: false, // Compress the backups
      encoding: 'utf-8',
      mode: 0o0640,
      flags: 'w+',
    },
    dateFile: {
      type: 'dateFile',
      filename: 'logs/file.log',
      pattern: 'yyyy-MM-dd',
      compress: false,
    },
    out: {
      type: 'stdout',
    },
  },
  categories: {
    default: { appenders: ['file', 'dateFile', 'out'], level: 'trace' },
  },
});
const _messages = {
  get_error: 'get_error',
  get_success: 'get_success',
  create_error: '[create:error]',
  create_success: '[create:success]',
  update_error: '[update:error]',
  update_success: '[update:success]',
  delete_error: '[delete:error]',
  delete_success: '[delete:success]',
  find_error: '[find:error]',
  find_success: '[find:success]',
  count_error: '[count:error]',
  count_success: '[count:success]',
  query_error: '[query:error]',
  query_success: '[query:success]',
  upload_error: '[upload:error]',
  validate_error: '[validate:error]',
  validate_success: '[validate:success]',
  upload_success: '[upload:success]',
  download_error: '[download:error]',
  download_success: '[download:success]',
  load_error: '[load:error]',
  load_success: '[load:success]',
  db_error: '[db:error]',
  db_success: '[db:success]',
  db_disconnect: '[db:disconnect]',
  db_reconnect: '[db:reconnect]',
  redis_error: '[redis:error]',
  redis_success: '[redis:success]',
  express_error: '[express:error]',
  express_success: '[express:success]',
  server_error: '[server:error]',
  server_success: '[server:success]',
  unsuspend_success: '[unsuspend:success]',
  unsuspend_error: '[unsuspend:error]',
  suspend_success: '[suspend:success]',
  suspend_error: '[suspend:error]',
  connected: '[connected]',
  disconnected: '[disconnected]',
  reconnected: '[reconnected]',
  reconnecting: '[reconnecting]',
  error: '🆘[error]',
  success: '✅[success]',
  end: '🔚[end]',
  delete: '🚮[delete]',
  default: '😃⁉️',
};
/**
 * Logger
 */
export default class Logger {
  private logger: JSLogger;

  constructor(category?: string, logLevel?: LogLevel) {
    this.logger = getLogger(category);
    if (logLevel) {
      this.logger.level = logLevel;
    }
  }

  trace(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.trace(_messages[message] || _messages['default'], ...args);
  }

  debug(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.debug(_messages[message] || _messages['default'], ...args);
  }

  info(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.info(`ℹ️ ${_messages[message] || _messages['default']}`, ...args);
  }

  success(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.info(`✅ ${_messages[message] || _messages['default']}`, ...args);
  }

  warn(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.warn(`⚠️${_messages[message]}` || _messages['default'], ...args);
  }

  error(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.error(`🆘 ${_messages[message] || _messages['default']}`, ...args);
  }

  fatal(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.fatal(`🔥 ${_messages[message] || _messages['default']}`, ...args);
  }

  mark(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.mark(_messages[message] || _messages['default'], ...args);
  }
}
