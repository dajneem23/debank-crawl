import Container, { Inject, Service } from 'typedi';
import { DIMongoDB } from '@/loaders/mongoDBLoader';
export const InvestmentCalSeed = async () => {
  const db = Container.get(DIMongoDB);
};
