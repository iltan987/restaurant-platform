import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common"
import type { Request, Response } from "express"
import { ErrorCode, type ApiError } from "@repo/schemas"

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let code: ErrorCode = ErrorCode.INTERNAL_ERROR
    let message = "Internal server error"

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const body = exception.getResponse()

      if (typeof body === "object" && body !== null && "code" in body) {
        // Exception thrown with a structured body containing our code
        const structured = body as Record<string, unknown>
        code = (structured["code"] as ErrorCode) ?? ErrorCode.INTERNAL_ERROR
        message =
          typeof structured["message"] === "string"
            ? structured["message"]
            : message
      } else {
        // Plain HttpException — derive a generic code from status
        message =
          typeof body === "string"
            ? body
            : typeof body === "object" && "message" in body
              ? String((body as Record<string, unknown>)["message"])
              : exception.message
        code = statusToCode(statusCode)
      }
    } else if (exception instanceof Error) {
      message = exception.message
    }

    const errorBody: ApiError = { statusCode, code, message }
    console.error(`[${request.method}] ${request.url} → ${statusCode}`, errorBody)

    response.status(statusCode).json(errorBody)
  }
}

function statusToCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.NOT_FOUND:
      return ErrorCode.RESTAURANT_NOT_FOUND
    case HttpStatus.CONFLICT:
      return ErrorCode.SLUG_TAKEN
    case HttpStatus.BAD_REQUEST:
      return ErrorCode.VALIDATION_ERROR
    default:
      return ErrorCode.INTERNAL_ERROR
  }
}
