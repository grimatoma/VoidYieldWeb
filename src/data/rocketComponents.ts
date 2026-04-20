import type { RocketComponentData } from './types';

/** Default component specs — quality attributes are set during crafting (empty = unset). */
export const ROCKET_COMPONENT_DEFAULTS: Record<string, RocketComponentData> = {
  hull: {
    componentType: 'hull',
    name: 'Hull Assembly',
    carrySlots: 10,  // takes full inventory (spec 10)
    attributes: {},
  },
  engine: {
    componentType: 'engine',
    name: 'Engine Assembly',
    carrySlots: 5,
    attributes: {},
  },
  fuel_tank: {
    componentType: 'fuel_tank',
    name: 'Fuel Tank',
    carrySlots: 4,
    attributes: {},
  },
  avionics: {
    componentType: 'avionics',
    name: 'Avionics Core',
    carrySlots: 1,
    attributes: {},
  },
  landing_gear: {
    componentType: 'landing_gear',
    name: 'Landing Gear',
    carrySlots: 3,
    attributes: {},
  },
};
