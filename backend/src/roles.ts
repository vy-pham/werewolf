import { Roles, RoleSide } from '@prisma/client';

export const ROLES = [
  {
    name: 'Werewolf',
    description: 'Werewolves work together to kill off the villagers at night.',
    point: -10,
    enum: Roles.werewolf,
    side: RoleSide.werewolf,
  },
  {
    name: 'Villager',
    description:
      'Villagers have no special powers but must try to figure out who the werewolves are during the day.',
    point: 1,
    enum: Roles.villager,
    side: RoleSide.villager,
  },
  {
    name: 'Seer',
    description:
      "The Seer can look at one player's card each night to see if they are a werewolf or not.",
    point: 3,
    enum: Roles.seer,
    side: RoleSide.villager,
  },
  {
    name: 'Guard',
    description:
      'Can protect one player from being killed by the werewolves each night.',
    point: 4,
    enum: Roles.guard,
    side: RoleSide.villager,
  },
  {
    name: 'Hunter',
    description:
      'If the Hunter is killed by a werewolf or lynched by the villagers, they can choose another player to kill with them.',
    point: 2,
    enum: Roles.hunter,
    side: RoleSide.villager,
  },
  {
    name: 'Witch',
    description:
      'The Witch has two potions: one that can heal a player who has been attacked by a werewolf, and one that can kill any player.',
    point: 4,
    enum: Roles.witch,
    side: RoleSide.villager,
  },
];
