import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { TokenService } from '../auth/token.service';
import { ApiResponseUtil } from '../common/api.response';

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const access_token = request.headers['authorization']?.split(' ')[1];

    if (!access_token) {
      throw new HttpException(
        ApiResponseUtil.error(400, 'lack_token', '请传入 Token'),
        HttpStatus.OK,
      );
    }

    const result = await this.tokenService.validateAccessToken(access_token);

    if (result.valid !== true) {
      if (result.reason === 'expiry') {
        throw new HttpException(
          ApiResponseUtil.error(403, 'expiry_token', 'Token 已过期'),
          HttpStatus.OK,
        );
      } else if (result.reason === 'not_exist') {
        throw new HttpException(
          ApiResponseUtil.error(403, 'token_not_exist', 'Token 不存在'),
          HttpStatus.OK,
        );
      } else {
        throw new HttpException(
          ApiResponseUtil.error(500, 'unexpected_error', '未知错误'),
          HttpStatus.OK,
        );
      }
    }

    request.user = result.result;
    return true;
  }
}
