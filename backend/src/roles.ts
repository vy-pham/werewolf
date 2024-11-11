import { Roles } from '@prisma/client';

export const ROLES = [
  {
    name: 'Werewolf',
    description: 'Werewolves work together to kill off the villagers at night.',
    point: -10,
    enum: Roles.werewolf,
  },
  {
    name: 'Villager',
    description:
      'Villagers have no special powers but must try to figure out who the werewolves are during the day.',
    point: 1,
    enum: Roles.villager,
  },
  {
    name: 'Seer',
    description:
      "The Seer can look at one player's card each night to see if they are a werewolf or not.",
    point: 3,
    enum: Roles.seer,
  },
  {
    name: 'Doctor',
    description:
      'The Doctor can protect one player from being killed by the werewolves each night.',
    point: 4,
    enum: Roles.doctor,
  },
  {
    name: 'Hunter',
    description:
      'If the Hunter is killed by a werewolf or lynched by the villagers, they can choose another player to kill with them.',
    point: 2,
    enum: Roles.hunter,
  },
  {
    name: 'Cupid',
    description:
      'Cupid can choose two players to be lovers on the first night. If one lover dies, the other dies of a broken heart.',
    point: 3,
    enum: Roles.cupid,
  },
  {
    name: 'Witch',
    description:
      'The Witch has two potions: one that can heal a player who has been attacked by a werewolf, and one that can kill any player.',
    point: 4,
    enum: Roles.witch,
  },
  {
    name: 'Little Girl',
    description:
      'The Little Girl can peek at the werewolves during the night but must be careful not to get caught.',
    point: 2,
    enum: Roles.little_girl,
  },
  {
    name: 'Elder',
    description:
      'The Elder is a villager who can survive one attack from the werewolves.',
    point: 2,
    enum: Roles.elder,
  },
  {
    name: 'Tanner',
    description: 'The Tanner wins if they are killed by the villagers.',
    point: -5,
    enum: Roles.tanner,
  },
  {
    name: 'Village Idiot',
    description:
      "The Village Idiot is immune to the Witch's poison and cannot be killed at night by the werewolves.",
    point: -2,
    enum: Roles.village_idiot,
  },
  {
    name: 'Wild Child',
    description:
      'The Wild Child chooses a player to idolize on the first night. If their idol dies, they become a werewolf.',
    point: 2,
    enum: Roles.wild_child,
  },
] as const;
