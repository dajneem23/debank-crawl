export type fetchAssetTrendingDataJob = {
  name: AssetTrendingJobNames;
};

export type AssetTrendingJobNames = 'asset-trending:fetch:trending' | 'asset-trending:fetch:trending-soon';

export type AssetTrendingJobData = fetchAssetTrendingDataJob;
