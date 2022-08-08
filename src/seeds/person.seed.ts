import { Connection } from 'typeorm';
import { Factory, Seeder } from 'typeorm-seeding';
import { PersonModel } from '../models';
import Logger from '../core/logger';
const logger = new Logger('PersonSeed');
import crypto_people from '../data/crypto_slate/json/crypto_people.json';
export default class PersonSeed implements Seeder {
  public async run(factory: Factory, connection: Connection): Promise<any> {
    logger.debug('[run:start]');
    const peoples = [];
    peoples.push(
      ...crypto_people.map((person) => {
        return {
          name: person.name,
          position: person.position,
          avatar: person.avatar,
          blog: person.blog,
          twitter: person.twitter,
          facebook: person.facebook,
          linkedin: person.linkedin,
          instagram: person.instagram,
          youtube: person.youtube,
          telegram: person.telegram,
          website: person.website,
          about: person.about,
          medium: person.medium,
          reddit: person.reddit,
          createdAt: new Date(),
        };
      }),
    );

    logger.info('[running]', { peoples });
    // await connection.createQueryBuilder().insert().into(PersonModel).values(peoples).execute();
    logger.debug('[run:end]');
  }
}
