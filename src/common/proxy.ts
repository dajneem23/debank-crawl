import { AxiosProxyConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// const proxy_host = '127.0.0.1';
const proxy_host = '167.172.79.230';
const proxy_port = 5566;
const proxy_options = `socks://${proxy_host}:${proxy_port}`;
export const TOR_PROXY_SOCKS_AGENT = new SocksProxyAgent(proxy_options);
export const TOR_PROXY_HTTP_AGENT = new HttpsProxyAgent(`http://${proxy_host}:${proxy_port}`);

export const WEBSHARE_PROXY_HTTP: AxiosProxyConfig = {
  host: 'p.webshare.io',
  port: 80,
  protocol: 'http',
  auth: {
    username: 'lildpslw-rotate',
    password: 'o988eyomghcu',
  },
};
export const MUAPROXY_PROXY_HTTP: AxiosProxyConfig = {
  host: '176.103.91.142',
  port: 64728,
  auth: {
    username: 'EAzGMRSu',
    password: 'ZiNQDnXh',
  },
};
