import mongoDBLoader from '@/loaders/mongoDBLoader';
import { countCollection } from '@/utils/common';
import { WorkType } from '@/types/Common';
import crypto_peoples from '../data/crypto_slate/json/crypto_people.json';
import people_previous_work from '../data/crypto_slate/json/people_previous_work.json';
import people_current_work from '../data/crypto_slate/json/people_current_work.json';
import people_education from '../data/crypto_slate/json/people_education.json';
/* eslint-disable no-console */
export const PersonSeed = async () => {
  console.log('Running person seed');
  const db = await mongoDBLoader();
  const collection = db.collection('persons');
  const count = await countCollection(collection);
  if (!count) {
    const peoples = [];
    peoples.push(
      ...crypto_peoples.map((person) => {
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
          created_at: new Date(),
          updated_at: new Date(),
          works: [
            ...people_previous_work
              .filter((work) => {
                return work.person_name === person.name;
              })
              .map((work) => {
                return {
                  title: work.work,
                  type: WorkType.PREVIOUS,
                };
              }),
            ...people_current_work
              .filter((work) => {
                return work.person_name === person.name;
              })
              .map((work) => {
                return {
                  title: work.work,
                  type: WorkType.CURRENT,
                };
              }),
          ],
          educations: [
            ...people_education
              .filter((education) => {
                return education.person_name === person.name;
              })
              .map((education) => {
                return {
                  title: education.education,
                };
              }),
          ],
        };
      }),
    );

    console.log('Inserting persons', peoples.length);
    await collection.insertMany(peoples);
  }
};
