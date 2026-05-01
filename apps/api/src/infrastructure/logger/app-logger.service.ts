import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';

@Injectable()
export class AppLoggerService implements LoggerService {
  private readonly logger = createLogger({
    level: 'info',
    format: format.combine(format.timestamp(), format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)),
    transports: [new transports.Console()]
  });

  log(message: string): void {
    this.logger.info(message);
  }

  error(message: string, trace?: string): void {
    this.logger.error(trace ? `${message} - ${trace}` : message);
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  verbose(message: string): void {
    this.logger.verbose(message);
  }
}
