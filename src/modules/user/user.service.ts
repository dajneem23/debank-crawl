import { Service } from 'typedi';
import Logger from '@/core/logger';
import { BaseQuery, PaginationResult } from '@/types/Common';
import { AppDataSource } from '@/config/dbConfig';
import { RoleModel } from '@/models/role.model';
import { UserError } from './user.error';
import { SubscribeRequest, UserRequest, UserResponse } from '@/modules/user/user.type';
import { AuthRequest } from '@/modules/user/user.type';
import { UserModel } from '@/models/user.model';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { toResponseUser } from '@/modules/user/user.util';
import { toResponseUserList } from '@/modules/user/user.util';
import { AccessError } from '@/modules/access/access.error';

@Service()
export default class UserService {
  private logger = new Logger('UserService');

  async login(body: AuthRequest): Promise<AuthRequest> {
    try {
      const userRepository = AppDataSource.getRepository(UserModel);
      const user = await userRepository.findOneBy({ email: body.email });
      if (!user) {
        throw new UserError('USER_NOT_FOUND');
      }
      return user;
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }

  async findAllUser(
    filter: Pick<UserRequest, 'id' | 'name' | 'email'>,
    query: BaseQuery,
  ): Promise<PaginationResult<UserResponse>> {
    try {
      const repository = AppDataSource.getRepository(UserModel);
      const queryData = await repository.createQueryBuilder('user').where(filter);
      const count = await queryData.getCount();
      const items = await queryData.skip((query.page - 1) * query.perPage).getMany();
      this.logger.debug('[query:success]', { filter, query });
      return { totalCount: count, items: toResponseUserList(items) };
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }

  /**
   * Find by Id
   */
  async findUserById(id: string): Promise<UserResponse> {
    try {
      const repository = AppDataSource.getRepository(UserModel);
      const user = await repository
        .createQueryBuilder('user')
        .select([])
        .leftJoinAndSelect('user.role', 'role')
        .leftJoinAndSelect('user.following', 'category')
        .where({ id })
        .getOne();
      if (!user) {
        throw new UserError('USER_NOT_FOUND');
      }
      this.logger.debug('[query:success]', { id });
      return toResponseUser(user);
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }

  /**
   * Create User
   */
  async create(body: UserRequest): Promise<any> {
    try {
      const userRepository = AppDataSource.getRepository(UserModel);
      const user = await userRepository.findOneBy({
        email: body.email,
      });
      if (user) {
        throw new UserError('USER_ALREADY_EXIST');
      }
      const { name, email, language, translation_source_languages, translation_target_languages, role_id } = body;
      const repository = AppDataSource.getRepository(RoleModel);
      const role = await repository.createQueryBuilder('role').where({ id: role_id }).getOne();
      if (!role) {
        throw new AccessError('ROLE_NOT_FOUND');
      }
      const now = new Date();
      const userId = randomUUID();
      const hasPassword = bcrypt.hashSync('123456', bcrypt.genSaltSync(10));
      // Create data
      const data = await userRepository.create({
        id: userId,
        name,
        email,
        password: hasPassword,
        language,
        translation_source_languages,
        translation_target_languages,
        username: body.username,
        first_name: body.first_name,
        last_name: body.last_name,
        about: body.about,
        location: body.location,
        website: body.website,
        avatar: body.avatar,
        role_id,
        createdAt: now,
        updatedAt: now,
      });
      // Save data
      await userRepository.save({ ...data });

      this.logger.debug('[Create User: success]', UserModel);
      return data;
    } catch (err) {
      this.logger.error('[Create User: error]', err.message);
      throw err;
    }
  }

  /**
   * Update User
   */
  async updateUser(id: string, body: UserRequest): Promise<UserResponse> {
    try {
      const repository = AppDataSource.getRepository(UserModel);
      const user = await repository.createQueryBuilder('user').where({ id }).getOne();

      if (!user) {
        throw new UserError('USER_NOT_FOUND');
      }
      repository.merge(user, body);
      const dataSaved = await repository.save(user);
      this.logger.debug('[update:success]', { id });
      return toResponseUser(dataSaved);
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }

  /**
   * User follow category
   */
  async following(id: string, { categories }: SubscribeRequest) {
    try {
      const repository = AppDataSource.getRepository(UserModel);
      const user = await repository.createQueryBuilder('user').where({ id }).getOne();

      repository.merge(user, { following: categories.map((id) => ({ id })) });
      const dataSaved = await repository.save(user);
      this.logger.debug('[update:success]', { id });
      return toResponseUser(dataSaved);
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }
}
