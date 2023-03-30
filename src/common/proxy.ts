import { AxiosProxyConfig } from 'axios';
export const WEBSHARE_PROXY_STR = 'http://wicagssg-rotate:gv8luczj7lw0@p.webshare.io:80/';
export const WEBSHARE_PORTFOLIO_PROXY_STR = 'http://rurucqkl-rotate:vf3u6llhg9m7@p.webshare.io:80/';
export const WEBSHARE_RANKINK_WHALE_TOP_HOLDERS_PROXY_STR = 'http://obevalnb-rotate:q7txqufg5lrg@p.webshare.io:80/';
export const WEBSHARE_PROXY_HOST = 'http://p.webshare.io:80/';
export const WEBSHARE_PROXY_HTTP: AxiosProxyConfig = {
  host: 'p.webshare.io',
  port: 80,
  protocol: 'http',
  auth: {
    username: 'wicagssg-rotate',
    password: 'gv8luczj7lw0',
  },
};
export const WEBSHARE_PROXY_RANKING_WHALE_TOPHOLDERS_HTTP: AxiosProxyConfig = {
  host: 'p.webshare.io',
  port: 80,
  protocol: 'http',
  auth: {
    username: 'obevalnb-rotate',
    password: 'q7txqufg5lrg',
  },
};
