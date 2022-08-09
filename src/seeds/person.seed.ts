import { Connection } from 'typeorm';
import Logger from '../core/logger';
const logger = new Logger('PersonSeed');
import crypto_people from '../data/crypto_slate/json/crypto_people.json';
import person_currentwork from '../data/crypto_slate/json/people_current_work.json';
import person_previouswork from '../data/crypto_slate/json/people_previous_work.json';
import person_education from '../data/crypto_slate/json/people_education.json';
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
          currentWork: person_currentwork.filter((item) => {
            return item.person_name === person.name;
          }),
          previousWork: person_previouswork.filter((item) => {
            return item.person_name === person.name;
          }),
          education: person_education.filter((item) => {
            return item.person_name === person.name;
          }),
          createdAt: new Date(),
        };
      }),
    );

    logger.info('[running]', { peoples });
    // await connection.createQueryBuilder().insert().into(PersonModel).values(peoples).execute();
    logger.debug('[run:end]');
  }
}
