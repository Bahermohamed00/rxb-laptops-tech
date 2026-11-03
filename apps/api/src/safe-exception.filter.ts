import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SafeExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json(exception.getResponse());
      return;
    }

    const exceptionType = exception instanceof Error ? exception.constructor.name : typeof exception;
    this.logger.error(`Unhandled API exception (${exceptionType}) for ${request.method} ${request.path}.`);
    response.status(500).json({
      statusCode: 500,
      message: 'Internal server error.',
      path: request.path,
    });
  }
}
