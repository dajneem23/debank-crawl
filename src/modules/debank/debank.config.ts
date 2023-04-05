import { DIDiscordClient } from '../../loaders/discord.loader';
import { Logger } from '../../core/logger';
import Container from 'typedi';
import { pgpToken } from '../../loaders/pg.loader';

export const logger = new Logger('Debank');

export const discord = Container.get(DIDiscordClient);

export const pgp = Container.get(pgpToken);
