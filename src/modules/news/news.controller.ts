/* eslint-disable @typescript-eslint/no-unused-vars */
import { Inject, Service } from 'typedi';
import { Controller, Res, Post, Body, Get, Query, Put, Params, Delete, Req, Auth } from '@/utils/expressDecorators';
import { Response } from 'express';
import { News, NewsService, NewsValidation } from '.';
import { buildQueryFilter } from '@/utils/common';
import httpStatus from 'http-status';
import { protect, protectPrivateAPI } from '@/api/middlewares/protect';
import { JWTPayload } from '../auth/authSession.type';
import { BaseQuery, BaseServiceInput } from '@/types/Common';
@Service()
@Controller('/news')
export class NewsController {
  @Inject()
  private service: NewsService;

  @Post('/', [NewsValidation.create, protectPrivateAPI()])
  async create(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Body()
    _body: News,
  ) {
    const result = await this.service.create({
      _content: _body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Put('/:id', [NewsValidation.update, protectPrivateAPI()])
  async update(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: News,
  ) {
    const result = await this.service.update({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.CREATED).json(result);
  }

  @Delete('/:id', [NewsValidation.delete, protectPrivateAPI()])
  async delete(
    @Res() _res: Response,
    @Auth() _auth: JWTPayload,
    @Req() _req: Request,
    @Params() _params: { id: string },
    @Body()
    body: News,
  ) {
    const result = await this.service.delete({
      _id: _params.id,
      _content: body,
      _subject: _auth.id,
    } as BaseServiceInput);
    _res.status(httpStatus.NO_CONTENT).end();
  }
  @Get('/', [NewsValidation.query])
  async get(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.query({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/related', [NewsValidation.getRelated, protect()])
  async getRelated(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery, @Auth() _auth: JWTPayload) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getRelated({
      _id: _auth.id,
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }

  @Get('/important', [NewsValidation.getImportant])
  async getImportant(@Res() _res: Response, @Req() _req: Request, @Query() _query: BaseQuery) {
    const { filter, query } = buildQueryFilter(_query);
    const result = await this.service.getImportant({
      _filter: filter,
      _query: query,
    } as BaseServiceInput);
    _res.status(httpStatus.OK).json(result);
  }
  @Get('/:id', [NewsValidation.getById])
  async getById(
    @Res() _res: Response,
    @Req() _req: Request,
    @Params()
    _params: {
      id: string;
    },
  ) {
    const result = await this.service.getById({
      _id: _params.id,
    } as BaseServiceInput);

    const content = `**Uniswap (UNI) has been moving downward since reaching a high of July
28, but has potentially completed a short-term corrective structure.**

UNI had been decreasing underneath a descending resistance line since
reaching an all-time high price of \$45 in May 2021. The downward
movement led to a low of \$3.33 in June. Additionally, the low was
combined with an all-time low value in the weekly
[RSI](https://beincrypto.com/learn/rsi-indicator/) (green icon).

The price has been increasing since and managed to break out from the
line later in June. The upward movement led to a high of \$9.83 on July
28.

Sponsored

Sponsored

At the time, the weekly
[RSI](https://beincrypto.com/learn/rsi-indicator/) made an attempt at
moving above 50. However, the attempt was unsuccessful (red icon).

The closest resistance areas are at \$9 and \$16. UNI has to break out
from the first one alongside an RSI increase above 50 in order for the
trend to be considered bullish.

[UNI/USDT Chart By
TradingView](https://www.tradingview.com/symbols/UNIUSDT/?exchange=BINANCE)

Current UNI pattern
-------------------

The daily chart provides conflicting signs.

Sponsored Sponsored

On the bearish side, the price has broken down from an ascending support
line. Also, the daily RSI is below 50.

On the bullish side, the bullish divergence trend line in the daily RSI
is still intact. This trend line preceded the entire ongoing upward
movement.

So, a look at a lower time frame is required in order to determine the
direction of the trend.

Sponsored Sponsored

[UNI/USDT Chart By
TradingView](https://www.tradingview.com/symbols/UNIUSDT/?exchange=BINANCE)

Wave count analysis
-------------------

Author and analyst [@BigCheds](https://twitter.com/BigCheds) tweeted a
chart of UNI, stating that the price has to hold above the \$8 area in
order for the bullish trend to remain intact.

[Source:
Twitter](https://twitter.com/BigCheds/status/1559923036341641216)

While the price has fallen below the area since, the wave count suggests
that since the June lows, UNI has completed a five-wave upward movement
that resulted in the \$9.83 high.

Since then, it has been mired in an A-B-C corrective structure, in which
waves A:C have had close to a 1:1.61 ratio.

The most likely area for a bottom would be between \$6.34 and \$6.58.
This is between the 0.5 Fib retracement support level of the entire
upward movement (black) and would give waves A:C an exactly 1:1.61 ratio
(white)

[UNI/USDT Chart By
TradingView](https://www.tradingview.com/symbols/UNIUSDT/?exchange=BINANCE)

**For Be\[in\]Crypto's latest
[Bitcoin](https://beincrypto.com/price/bitcoin/) (BTC)
analysis,[](https://beincrypto.com/bitcoin-btc-consolidates-slightly-above-30000-after-steep-fall/)[click
here](https://beincrypto.com/bitcoin-btc-weekly-bearish-engulfing-candlestick-retesting-25000/)**

### Disclaimer

All the information contained on our website is published in good faith
and for general information purposes only. Any action the reader takes
upon the information found on our website is strictly at their own risk.

Sponsored

Share Article

### Related topics

-   [UNI Price](https://beincrypto.com/uni-price/)
-   [UNI/USDT](https://beincrypto.com/uni-usdt/)
-   [Uniswap Analysis](https://beincrypto.com/uniswap-analysis/)
-   [Uniswap Token (UNI)](https://beincrypto.com/uniswap-token-uni/)

![Valdrin
Tahiri](https://s32659.pcdn.co/wp-content/uploads/2020/06/photo_Valdrin.jpg.optimal.jpg)

[Valdrin Tahiri](https://beincrypto.com/author/valdrin/)

Valdrin discovered cryptocurrencies while he was getting his MSc in
Financial Markets from the Barcelona graduate school of Economics.
Shortly after graduating, he began writing for several different
cryptocurrency related websites as a freelancer before eventually taking
on the role of BeInCrypto's Senior Analyst.

#### Follow Author

[](https://www.facebook.com/valdrin.tahiri.96)
[](https://www.linkedin.com/in/valdrin-tahiri-63ba48209/)
[](mailto:valdrinttahiri@gmail.com)

[More Articles](https://beincrypto.com/author/valdrin/) **On Thursday,
reports underlined that the Indian Enforcement Directorate (ED) blocked
bank assets worth Rs 370 crore (around \$46 million) that belonged to
the troubled crypto exchange Vauld.**

The news came a week after ED froze the bank account of one of the
directors of Zanmai Lab Private Ltd, the operator of the [Indian
cryptocurrency exchange
WazirX](https://beincrypto.com/trouble-deepens-for-wazirx-in-india-as-ed-raids-director-freezes-bank-accounts/).
The development also comes amid an ongoing
[investigation](https://www.news18.com/news/business/crypto-exchanges-in-india-under-ed-lens-rs-1000-cr-alleged-money-laundering-by-10-platforms-5729689.html)of
at least 10 crypto exchanges by the Indian agency for an alleged money
laundering of over \$125 million.

Chinese loan apps reported beneficiaries of laundering
------------------------------------------------------

According to the
[release](https://enforcementdirectorate.gov.in/sites/default/files/latestnews/PR%20HYZO%20-%20Search%20%26%20freezing%20of%20Yellowtune%20%26%20Flipvolt%20CryptoExchange.pdf),
Vauld's local entity under Flipvolt Technologies was used by 23
predatory fintech and non-banking organizations to deposit millions in
question into wallets under Yellow Tune Technologies' control. In a
similar case, WazirX had allegedly assisted 16 accused fintech firms in
using the cryptocurrency channel to launder criminal proceeds of illicit
loan apps.

Sponsored

Sponsored

The agency claimed that Vauld's Indian entity has very lax
know-your-customer (KYC) norms, no enhanced due diligence (EDD)
mechanism, no check on the depositors' sources of funds, and no
mechanism of raising Suspicious Transaction Reports (STRs) among other
issues.

Additionally, searches at various locations of M/s Yellow Tune
Technologies Private Limited were made from August 8 to August 10, 2022,
by the agency, in an effort to identify the recipients' wallets and the
company's beneficial owners. However, ED stated, "But the company's
promoters are untraceable. It is found that this shell entity was
incorporated by Chinese Nationals Alex and Kaidi (real name not
known)..."

Vauld allegedly flouted AML regulations
---------------------------------------

Notably, the [Singapore-based
Vauld](https://beincrypto.com/singapore-based-vauld-seeks-protection-from-credit-liabilities-worth-400-million/)
had halted deposits, trading, and withdrawals on its platforms in July
after announcing layoffs amid a market downturn. Now, the platform is
accused of assisting "the accused fintech companies in avoiding regular
banking channels," to "take out all the fraud money in the form of
crypto assets." The platform is now essentially put to trial for playing
an active role in the laundering by "encouraging obscurity and having
lax AML \[anti-money laundering\] norms."

Sponsored Sponsored

In a response to [Business
Today](https://www.businesstoday.in/crypto/story/breaking-ed-freezes-rs-370-crore-worth-assets-of-crypto-exchange-vauld-344441-2022-08-11),
Vauld responded, "We are investigating this matter, we kindly request
your patience and support, we will keep you updated as soon as we have
more information on this."

The business had also announced on July 5 that it has [signed an
indicative
contract](https://beincrypto.com/nexo-looks-to-acquire-failing-rival-crypto-lender-vauld/)
to be acquired by cryptocurrency lender
[Nexo](https://beincrypto.com/learn/nexo-review/).

**For Be\[In\]Crypto's latest
[Bitcoin](https://beincrypto.com/price/bitcoin/) (BTC) analysis,**
[**click
here**](https://beincrypto.com/bitcoin-btc-drops-in-anticipation-of-rise-to-28400/)**.**

Sponsored Sponsored
`;
    _res.status(httpStatus.OK).json({
      id: '6308fff91cd276b4a1b6d760',
      slug: 'asd',
      categories: [{ id: '', name: 'abc' }],
      coin_tags: [
        { id: '6308fff91cd276b4a1b6d760', name: 'coin_tags1' },
        { id: '6308fff91cd276b4a1b6d760', name: 'coin_tags2' },
        { id: '6308fff91cd276b4a1b6d760', name: 'coin_tags3' },
      ],
      company_tags: [
        { id: '6308fff91cd276b4a1b6d760', name: 'Weiss Crypto Ratings1' },
        { id: '6308fff91cd276b4a1b6d760', name: 'Weiss Crypto Ratings12' },
        { id: '6308fff91cd276b4a1b6d760', name: 'Weiss Crypto Ratings13' },
      ],

      title: 'Mercury Wallet is pitching itself as Bitcoin’s answer to scalability, privacy',
      lang: 'vi',
      content: content,
      headings: ['heading1', 'heading2'],
      summary: 'tom tat2',

      created_at: '2022-08-26T17:06:23.605Z',
      created_by: 'admin',
      deleted: false,
      keywords: ['trending'],
      number_relate_article: 6,
      photos: [
        'https://i1-vnexpress.vnecdn.net/2022/08/26/Bo-Cong-an-9374-1637833058-jpe-9051-3294-1661523682.jpg?w...',
      ],
      product_tags: [
        { id: '6308fff91cd276b4a1b6d760', name: 'product_tags' },
        { id: '6308fff91cd276b4a1b6d760', name: 'product_tags2' },
        { id: '6308fff91cd276b4a1b6d760', name: 'product_tags3' },
      ],
      source: 'https://cryptoslate.com/swift-considered-neutral-on-sanctions-debate-sparked-on-whether-ethereum-is-...',
      stars: 4,
      updated_at: '2022-08-26T17:06:23.605Z',
      views: 54,
      author: {
        full_name: 'admin',
        id: '63048b7e3021583b516c75f8',
      },
    });
  }
}
