import { DIDiscordClient, Discord } from '../../loaders/discord.loader';
import { configure, getLogger, Logger as JSLogger } from 'log4js';
import Container, { Inject } from 'typedi';

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
  disconnected: '- ☠️ [Disconnected]',
  reconnected: '+ 🔌 [Reconnected]',
  reconnecting: '+ 🛠️ [Reconnecting]',
  connected: '+ ✅ [Connected]',
  error: '- 🆘 [Error]',
  success: '+ ✅ [Success]',
  info: '+ ℹ️ [Info]',
  warn: '- ⚠️ [Warn]',
  end: '- 🔚 [End]',
  delete: '- 🗑️ [Delete]',
  default: '😃⁉️',
};
/**
 * Logger
 */
export class Logger {
  private logger: JSLogger;

  readonly category: string;

  constructor(category?: string, logLevel?: LogLevel) {
    this.logger = getLogger(category);
    this.category = category || 'default';
    if (logLevel) {
      this.logger.level = logLevel;
    }
  }

  log(...args: any[]): void {
    return this.logger.log('log', ...args);
  }

  trace(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.trace(_messages[message] || message, ...args);
  }

  debug(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.debug(_messages[message] || message, ...args);
  }

  info(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.info(`ℹ️ ${_messages[message] || message}`, ...args);
  }

  success(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.info(`✅ ${_messages[message] || message}`, ...args);
  }

  warn(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.warn(`⚠️${_messages[message] || message}`, ...args);
  }

  error(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.error(`🆘 ${_messages[message] || message}`, ...args);
  }

  fatal(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.fatal(`🔥 ${_messages[message] || message}`, ...args);
  }

  mark(message: keyof typeof _messages, ...args: any[]): void {
    return this.logger.mark(_messages[message] || message, ...args);
  }

  discord(message: keyof typeof _messages, ...args: any[]): Promise<void> {
    if (process.env.MODE !== 'production') {
      this.logger.info(_messages[message] || message, ...args);
      return Promise.resolve();
    }
    const discordBot = Container.get(DIDiscordClient);
    return discordBot.sendMsg({
      message: [
        `\`\`\`diff\n${this.category ? this.category + ':' : ''}${_messages[message] || message}\`\`\``,
        ...args,
      ]
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg) : arg))
        .map((arg) => discordBot.decorateMsg(arg))
        .join('\n'),
      channelId: message === 'error' ? discordBot.errorChannelId : discordBot.notifyChannelId,
    });
  }
}
