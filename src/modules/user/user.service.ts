import { Service } from 'typedi';
import Logger from '@/core/logger';
import { AuthRequest } from '@/modules/user/user.type';

@Service()
export default class UserService {
  private logger = new Logger('UserService');

  async login(body: AuthRequest): Promise<void> {
    this.logger.error('demo');
  }
}
