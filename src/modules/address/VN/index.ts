import fs from 'fs';
import path from 'path';

const findJSONDataFromFile = (path: string) => {
  try {
    const raw = fs.readFileSync(path, 'utf-8');
    const data = JSON.parse(raw);
    return Object.values(data);
  } catch (err) {
    return [];
  }
};

export const getVNProvince = () => {
  const filePath = path.resolve(__dirname, 'tinh_tp.json');
  return findJSONDataFromFile(filePath);
};

export const getVNDistrict = (provinceCode: number | string) => {
  const filePath = path.resolve(__dirname, `./quan-huyen/${provinceCode}.json`);
  return findJSONDataFromFile(filePath);
};

export const getVNWard = (districtCode: number | string) => {
  const filePath = path.resolve(__dirname, `./xa-phuong/${districtCode}.json`);
  return findJSONDataFromFile(filePath);
};
