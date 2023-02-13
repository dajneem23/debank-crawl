//get system info using systeminformation package
import si from 'systeminformation';
export const systemInfo = async () => {
  const { free: freeMem, total: totalMem, used: usedMem, active: activeMem } = await si.mem();
  const network = await si.networkInterfaces();
  const { cpus, currentLoad: cpuLoad } = await si.currentLoad();
  return {
    freeMem,
    totalMem,
    memLoad: `${((activeMem / totalMem) * 100).toFixed(2)}%`,
    cpuLoad: `${cpuLoad.toFixed(2)}%`,
  };
};

export const dockerContainerStats = async () => {
  const dockerStats = await si.dockerAll();
  const dockerStatsArray = dockerStats.map(({ id, name, state, memPercent, cpuPercent, pids }: any) => ({
    // id,
    name,
    state,
    cpu: `${cpuPercent.toFixed(2)}%`,
    mem: `${memPercent.toFixed(2)}%`,
    pids,
  }));
  return dockerStatsArray;
};