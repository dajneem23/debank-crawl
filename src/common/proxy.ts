import { AxiosProxyConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

// const proxy_host = '127.0.0.1';
const proxy_host = '167.172.79.230';
const proxy_port = 5566;
const proxy_options = `socks://${proxy_host}:${proxy_port}`;
export const TOR_PROXY_SOCKS_AGENT = new SocksProxyAgent(proxy_options);
export const TOR_PROXY_HTTP_AGENT = new HttpsProxyAgent(`http://${proxy_host}:${proxy_port}`);
export const WEBSHARE_PROXY_STR = 'http://wicagssg-rotate:gv8luczj7lw0@p.webshare.io:80/';
export const WEBSHARE_PROXY_HTTP: AxiosProxyConfig = {
  host: 'p.webshare.io',
  port: 80,
  protocol: 'http',
  auth: {
    username: 'wicagssg-rotate',
    password: 'gv8luczj7lw0',
  },
};
