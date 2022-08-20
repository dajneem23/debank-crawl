import fs from 'fs';

export const createDataFile = ({ _collection, _key, _file }: { _collection: string; _key: string; _file: any }) => {
  const groupCoins = (_file as any).reduce(
    (
      acc: any,
      coin: any,
    ): {
      [key: string]: any;
    } => {
      const { [_key]: key } = coin;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(coin);
      return acc;
    },
    {},
  );
  // fs.writeFileSync(`${__dirname}/data/group_${_collection}.json`, JSON.stringify(groupCoins));

  const result = Object.keys(groupCoins).map((token: any) => {
    return groupCoins[token].reduce((acc: any, coin: any) => {
      return Object.keys(coin).reduce((pKey: any, cKey: any) => {
        if (!acc[cKey]) {
          acc[cKey] = coin[cKey];
        } else {
          if (Array.isArray(acc[cKey])) {
            if (Array.isArray(coin[cKey])) {
              acc[cKey] = [...acc[cKey], ...coin[cKey]].reduce((pre, cur) => {
                let addValue: any = null;
                if (typeof cur === 'object' && cur !== null) {
                  // console.log({ cur, cKey, pre });
                  const { [cKey]: value } = cur;
                  addValue = value;
                } else {
                  addValue = cur;
                }
                // if (pre.indexOf(addValue) === -1) {
                //   pre.push(addValue);
                // }
                if (!pre.some((p: any) => p[cKey] == addValue)) {
                  pre.push(cur);
                }
                return pre;
              }, []);
            } else {
              acc[cKey].push(coin[cKey]);
            }
          } else {
            if (acc[cKey] !== coin[cKey]) {
              if (Array.isArray(coin[cKey])) {
                acc[cKey] = [acc[cKey], ...coin[cKey]];
              } else {
                acc[cKey] = [acc[cKey], coin[cKey]];
              }
            }
          }
        }
        return acc;
      }, {});
    }, {});
  });
  fs.writeFileSync(`${__dirname}/data/${_collection}.json`, JSON.stringify(result));
};
export const readDataFromFile = ({ _collection }: any) => {
  return JSON.parse(fs.readFileSync(`${__dirname}/data/${_collection}.json`, { encoding: 'utf8', flag: 'r' }));
};
