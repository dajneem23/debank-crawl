export type FetchAllCategoryJob = {
  name: 'category:fetch:all';
};
export type FetchCategoryInfoJob = {
  name: 'category:fetch:info';
};

export type CategoryJobNames = 'category:fetch:all' | 'category:fetch:info';
export type CategoryJobData = FetchAllCategoryJob | FetchCategoryInfoJob;
