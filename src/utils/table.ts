//array object to table
export const arrayObjectToTable = (data: any[]) => {
  return data.reduce((acc, cur, index) => {
    if (index === 0) {
      acc.push(Object.keys(cur));
    }
    acc.push(Object.values(cur));
    return acc;
  }, []);
};
