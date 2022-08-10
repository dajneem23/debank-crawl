create table company_product
(
    id           bigserial
        constraint company_product_pk
            primary key,
    company_name varchar(255)
        constraint company_product_crypto_company_name_fk
            references crypto_company (name),
    product      text
        constraint company_product_crypto_product_name_fk
            references crypto_product (name)
);

alter table company_product
    owner to application;

create unique index company_product_id_uindex
    on company_product (id);

INSERT INTO public.company_product (id, company_name, product) VALUES (1, 'Ledger', 'Ledger Nano S');
INSERT INTO public.company_product (id, company_name, product) VALUES (2, 'Ledger', 'Ledger Blue');
INSERT INTO public.company_product (id, company_name, product) VALUES (3, 'Amplify Exchange', 'Amplify Brokerage');
INSERT INTO public.company_product (id, company_name, product) VALUES (4, 'Canaan', 'Canaan Avalon 841');
INSERT INTO public.company_product (id, company_name, product) VALUES (5, 'Canaan', 'Canaan Avalon 821');
INSERT INTO public.company_product (id, company_name, product) VALUES (6, 'RTrade Technologies', 'Temporal');
INSERT INTO public.company_product (id, company_name, product) VALUES (7, 'ShapeShift', 'KeepKey');
INSERT INTO public.company_product (id, company_name, product) VALUES (8, 'Blockchain, Inc.', 'Blockchain Explorer');
INSERT INTO public.company_product (id, company_name, product) VALUES (9, 'Blockchain, Inc.', 'Blockchain Wallet');
INSERT INTO public.company_product (id, company_name, product) VALUES (10, 'Bitmain', 'Antminer T9+');
INSERT INTO public.company_product (id, company_name, product) VALUES (11, 'Bitmain', 'Antminer Z9 mini');
INSERT INTO public.company_product (id, company_name, product) VALUES (12, 'Bitmain', 'Antminer Z9');
INSERT INTO public.company_product (id, company_name, product) VALUES (13, 'Bitmain', 'Antminer X3 (220 kH/s)');
INSERT INTO public.company_product (id, company_name, product) VALUES (14, 'Bitmain', 'Antminer S9 (14 TH/s)');
INSERT INTO public.company_product (id, company_name, product) VALUES (15, 'Bitmain', 'Antminer L3++ (580 MH/s)');
INSERT INTO public.company_product (id, company_name, product) VALUES (16, 'Bitmain', 'Antminer L3+ (504 MH/s)');
INSERT INTO public.company_product (id, company_name, product) VALUES (17, 'Bitmain', 'Antminer E3');
INSERT INTO public.company_product (id, company_name, product) VALUES (18, 'Bitmain', 'Antminer D3 (19.3 GH/s)');
INSERT INTO public.company_product (id, company_name, product) VALUES (19, 'Bitmain', 'Antminer D3');
INSERT INTO public.company_product (id, company_name, product) VALUES (20, 'Omise', 'Omise');
INSERT INTO public.company_product (id, company_name, product) VALUES (21, 'ZBG', 'ZBG App');
INSERT INTO public.company_product (id, company_name, product) VALUES (22, 'ZB.com', 'ZB App');
INSERT INTO public.company_product (id, company_name, product) VALUES (23, 'OpenCrowd', 'DragonGlass');
INSERT INTO public.company_product (id, company_name, product) VALUES (24, 'EMURGO', 'Tangata Manu');
INSERT INTO public.company_product (id, company_name, product) VALUES (25, 'EMURGO', 'Seiza');
INSERT INTO public.company_product (id, company_name, product) VALUES (26, 'EMURGO', 'Yoroi Wallet');
INSERT INTO public.company_product (id, company_name, product) VALUES (27, '1xBit', '1xBit');
INSERT INTO public.company_product (id, company_name, product) VALUES (28, 'Binance', 'Trust Wallet');
INSERT INTO public.company_product (id, company_name, product) VALUES (29, 'Binance', 'Binance App');
INSERT INTO public.company_product (id, company_name, product) VALUES (30, 'Coinbase', 'Coinbase Wallet');
INSERT INTO public.company_product (id, company_name, product) VALUES (31, 'Coinbase', 'Coinbase Pro');
INSERT INTO public.company_product (id, company_name, product) VALUES (32, 'Coinbase', 'Coinbase App');
INSERT INTO public.company_product (id, company_name, product) VALUES (33, 'Bitbuy', 'Bitbuy App');
INSERT INTO public.company_product (id, company_name, product) VALUES (34, 'Circle', 'Circle Invest');
INSERT INTO public.company_product (id, company_name, product) VALUES (35, 'ConsenSys', 'MetaMask');
INSERT INTO public.company_product (id, company_name, product) VALUES (36, 'ConsenSys', 'uPort');
INSERT INTO public.company_product (id, company_name, product) VALUES (37, 'Input Output', 'Yoroi Wallet');
INSERT INTO public.company_product (id, company_name, product) VALUES (38, 'Input Output', 'Daedalus');
INSERT INTO public.company_product (id, company_name, product) VALUES (39, 'Sky Mavis', 'Axie Infinity');
INSERT INTO public.company_product (id, company_name, product) VALUES (40, 'Quadency', 'Quadency');
INSERT INTO public.company_product (id, company_name, product) VALUES (41, 'SwissBorg', 'SwissBorg Wealth App');
INSERT INTO public.company_product (id, company_name, product) VALUES (42, 'Dapper Labs', 'CryptoKitties');
