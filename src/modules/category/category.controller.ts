import { Inject, Service } from 'typedi';
import httpStatusCode from 'http-status';
import { Body, Controller, Get, Params, Post, Put, Query, Res } from '@/utils/expressDecorators';
import { Response } from 'express';
import * as categoryValidation from './category.validation';
import { Category, CategoryParams } from './category.type';
import categoryService from './category.service';

@Service()
@Controller('/category')
export default class categoryController {
  @Inject()
  private categoryService: categoryService;

  @Get('/', [categoryValidation.query])
  async privateQuery(@Res() res: Response, @Query() query: Pick<Category, 'type'>) {
    const result = await this.categoryService.query(query);
    res.status(httpStatusCode.OK).json({ data: result });
  }

  // Create Category
  @Post('/', [categoryValidation.create])
  async create(@Res() res: Response, @Body() body: Pick<Category, 'type' | 'title' | 'weight'>) {
    const result = await this.categoryService.create(body);
    res.status(httpStatusCode.CREATED).json({ data: result });
  }

  // Update tag
  @Put('/:id', [categoryValidation.update])
  async update(
    @Res() res: Response,
    @Params() params: CategoryParams,
    @Body() body: Pick<Category, 'title' | 'weight'>,
  ) {
    const { id } = params;
    const result = await this.categoryService.update(id, body);
    res.status(httpStatusCode.CREATED).json({ data: result });
  }
}
