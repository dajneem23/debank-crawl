import { Service } from 'typedi';
import Logger from '@/core/logger';
import { AppDataSource } from '@/config/dbConfig';
import { Category } from './category.type';
import { CategoryError } from './category.error';
import { isNull, omitBy, pick } from 'lodash';
import { CategoryModel } from '@/models/category.model';

@Service()
export default class categoryService {
  private logger = new Logger('categoryService');

  /**
   * Query content
   */
  async query(filter: Pick<Category, 'type'>): Promise<Array<Category>> {
    try {
      const repository = AppDataSource.getRepository(CategoryModel);
      const data = await repository
        .createQueryBuilder('category')
        .select(['category.id', 'category.title', 'category.weight'])
        .where(filter)
        .getMany();

      this.logger.debug('[query:success]', { filter });
      return data;
    } catch (err) {
      this.logger.error('[query:error]', err.message);
      throw err;
    }
  }

  /**
   * Create category
   */
  async create(body: Pick<Category, 'type' | 'title' | 'weight'>): Promise<Category> {
    try {
      // category repository
      const categoryRepository = AppDataSource.getRepository(CategoryModel);
      const crawlContent = await categoryRepository.findOneBy({
        title: body.title,
        type: body.type,
      });
      if (crawlContent) {
        throw new CategoryError('CATEGORY_ALREADY_EXIST');
      }
      const category = await categoryRepository.create({ ...body, createdAt: new Date() });
      // Create relationship and save
      const categorySaved = await categoryRepository.save(category);

      this.logger.debug('[Create category: success]', categorySaved);
      return omitBy(categorySaved, isNull);
    } catch (err) {
      this.logger.error('[Create category: error]', err.message);
      throw err;
    }
  }

  /**
   * update plan
   */
  async update(id: string, body: Pick<Category, 'title' | 'weight'>): Promise<Category> {
    try {
      const repository = AppDataSource.getRepository(CategoryModel);
      const content = await repository.createQueryBuilder('content_plan').where({ id }).getOne();

      if (!content) {
        throw new CategoryError('CATEGORY_NOT_FOUND');
      }
      repository.merge(content, { ...body, updatedAt: new Date() });
      const planSaved = await repository.save(content);
      this.logger.debug('[update:success]', { id });
      return pick(planSaved, ['id', 'title', 'weight']);
    } catch (err) {
      this.logger.error('[update:error]', err.message);
      throw err;
    }
  }
}
