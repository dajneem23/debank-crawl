import { onChainBotAlertConfigToken } from '@/loaders/config.loader';
import { sendTelegramMessage } from '@/service/alert/telegram';
import { CHAINS } from '@/types/chain';
import Container from 'typedi';

export const alertHighPriceTransaction = async ({
  type = 'telegram',
  ...rest
}: {
  tx_hash: string;
  amount: number;
  symbol: string;
  usd_value: number;
  chain_id: number;
  tx_type?: 'swap' | 'transfer' | 'mint' | 'burn' | 'add_liquidity' | 'remove_liquidity' | 'buy' | 'sell';
  type: 'telegram';
}) => {
  const handleAlert = {
    telegram: () => alertHighPriceTransactionWithTelegram({ ...rest }),
  };
  return (
    handleAlert[type]?.() ||
    (async () => {
      throw new Error('Invalid alert type');
    })()
  );
};

const alertHighPriceTransactionWithTelegram = async ({
  tx_hash,
  amount,
  symbol,
  usd_value,
  chain_id,
}: {
  tx_hash: string;
  amount: number;
  symbol: string;
  usd_value: number;
  chain_id: number;
  tx_type?: 'swap' | 'transfer' | 'mint' | 'burn' | 'add_liquidity' | 'remove_liquidity' | 'buy' | 'sell';
}) => {
  const scanUrl = `${CHAINS[chain_id].scanHost}/tx/${tx_hash}`;
  const message = `*High Price Transaction Alert* \n\nTransaction: [${tx_hash}](${scanUrl}) \nAmount: ${amount} *${symbol}* \nUSD Value: ${usd_value}$💵`;
  await sendTelegramMessage({
    message,
    chatId: Container.get(onChainBotAlertConfigToken).chat_id,
    options: {
      parse_mode: 'MarkdownV2',
    },
  });
};
