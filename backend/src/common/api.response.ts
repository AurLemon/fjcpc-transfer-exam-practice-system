// src/common/api.response

export class ApiResponseUtil {
  static success(code: number, data: any) {
    return {
      code,
      status: 'success',
      data,
      timestamp: Date.now(),
    };
  }

  static error(code: number, type: string, message: string) {
    return {
      code,
      status: 'error',
      data: {
        type,
        message,
      },
      timestamp: Date.now(),
    };
  }
}
