import { Vector3 } from 'three'

export type Language = 'en' | 'it'
export const LANGUAGES: Language[] = ['en', 'it']

type Text = { name: string; kind: string; facts: string[] }

export type Body = {
  id: string
  text: Record<Language, Text>
  texture: string
  // Easy scale: sizes and distances are made up so everything is big enough to see.
  radius: number
  orbit: number
  // Where the body sits on its orbit, in degrees around the Sun.
  angle: number
  // Real axial tilt, in degrees. Venus and Uranus are the odd ones out.
  // (Saturn leans the other way on screen, so its rings are seen from above.)
  tilt: number
  // How fast it spins on screen, in radians per second (not real speed, just the feel of it).
  spin: number
  clouds?: string
  rings?: { inner: number; outer: number; texture: string }
}

const T = (file: string) => `/textures/${file}`

export const BODIES: Body[] = [
  {
    id: 'sun', texture: T('2k_sun.jpg'),
    radius: 6, orbit: 0, angle: 0, tilt: 7.25, spin: 0.05,
    text: {
      en: {
        name: 'Sun', kind: 'Our star',
        facts: [
          'The Sun is a star: a giant ball of hot, glowing gas.',
          'It is so big that a million Earths could fit inside.',
          'Its light takes about 8 minutes to reach us.',
        ],
      },
      it: {
        name: 'Sole', kind: 'La nostra stella',
        facts: [
          'Il Sole è una stella: una palla gigante di gas caldo e luminoso.',
          'È così grande che dentro ci starebbe un milione di Terre.',
          'La sua luce arriva fino a noi in circa 8 minuti.',
        ],
      },
    },
  },
  {
    id: 'mercury', texture: T('2k_mercury.jpg'),
    radius: 0.45, orbit: 11, angle: 0, tilt: 0.03, spin: 0.06,
    text: {
      en: {
        name: 'Mercury', kind: 'Planet 1',
        facts: [
          'The smallest planet, and the closest to the Sun.',
          'A year on Mercury lasts only 88 days.',
          'Boiling hot in the day, freezing cold at night.',
        ],
      },
      it: {
        name: 'Mercurio', kind: 'Pianeta 1',
        facts: [
          'Il pianeta più piccolo e il più vicino al Sole.',
          'Un anno su Mercurio dura solo 88 giorni.',
          'Di giorno fa caldissimo, di notte fa freddissimo.',
        ],
      },
    },
  },
  {
    id: 'venus', texture: T('2k_venus_atmosphere.jpg'),
    radius: 0.85, orbit: 15, angle: 25, tilt: 177.4, spin: 0.04,
    text: {
      en: {
        name: 'Venus', kind: 'Planet 2',
        facts: [
          'The hottest planet, even hotter than Mercury.',
          'Thick clouds trap the heat like a blanket.',
          'It spins backwards, very, very slowly.',
        ],
      },
      it: {
        name: 'Venere', kind: 'Pianeta 2',
        facts: [
          'Il pianeta più caldo, ancora più di Mercurio.',
          'Nuvole spesse tengono dentro il caldo, come una coperta.',
          'Gira al contrario, piano piano.',
        ],
      },
    },
  },
  {
    id: 'earth', texture: T('2k_earth_daymap.jpg'),
    radius: 0.9, orbit: 20, angle: 50, tilt: 23.4, spin: 0.25,
    clouds: T('2k_earth_clouds.jpg'),
    text: {
      en: {
        name: 'Earth', kind: 'Planet 3',
        facts: [
          'Our home! The only place we know of with life.',
          'Most of it is covered in water.',
          'It has one Moon.',
        ],
      },
      it: {
        name: 'Terra', kind: 'Pianeta 3',
        facts: [
          'La nostra casa! L\'unico posto dove sappiamo che c\'è la vita.',
          'Quasi tutta è coperta d\'acqua.',
          'Ha una Luna.',
        ],
      },
    },
  },
  {
    id: 'mars', texture: T('2k_mars.jpg'),
    radius: 0.6, orbit: 25, angle: 75, tilt: 25.2, spin: 0.24,
    text: {
      en: {
        name: 'Mars', kind: 'Planet 4',
        facts: [
          'The red planet: its dust is rusty, like old iron.',
          'It has the biggest volcano in the solar system.',
          'Robots called rovers drive around on it.',
        ],
      },
      it: {
        name: 'Marte', kind: 'Pianeta 4',
        facts: [
          'Il pianeta rosso: la sua polvere è arrugginita, come il ferro vecchio.',
          'Ha il vulcano più grande del sistema solare.',
          'Dei robot chiamati rover ci vanno in giro.',
        ],
      },
    },
  },
  {
    id: 'jupiter', texture: T('2k_jupiter.jpg'),
    radius: 2.8, orbit: 40, angle: 100, tilt: 3.1, spin: 0.5,
    text: {
      en: {
        name: 'Jupiter', kind: 'Planet 5',
        facts: [
          'The biggest planet: more than 1,300 Earths could fit inside.',
          'The Great Red Spot is a storm bigger than Earth.',
          'It has more than 90 moons.',
        ],
      },
      it: {
        name: 'Giove', kind: 'Pianeta 5',
        facts: [
          'Il pianeta più grande: dentro ci starebbero più di 1.300 Terre.',
          'La Grande Macchia Rossa è una tempesta più grande della Terra.',
          'Ha più di 90 lune.',
        ],
      },
    },
  },
  {
    id: 'saturn', texture: T('2k_saturn.jpg'),
    radius: 2.4, orbit: 54, angle: 125, tilt: -26.7, spin: 0.45,
    rings: { inner: 1.2, outer: 2.3, texture: T('2k_saturn_ring_alpha.png') },
    text: {
      en: {
        name: 'Saturn', kind: 'Planet 6',
        facts: [
          'Famous for its rings, made of ice and rock.',
          'It is so light it could float in a giant bathtub.',
          'It has more moons than any other planet.',
        ],
      },
      it: {
        name: 'Saturno', kind: 'Pianeta 6',
        facts: [
          'Famoso per i suoi anelli, fatti di ghiaccio e roccia.',
          'È così leggero che galleggerebbe in una vasca da bagno gigante.',
          'Ha più lune di qualsiasi altro pianeta.',
        ],
      },
    },
  },
  {
    id: 'uranus', texture: T('2k_uranus.jpg'),
    radius: 1.5, orbit: 67, angle: 150, tilt: 97.8, spin: 0.3,
    text: {
      en: {
        name: 'Uranus', kind: 'Planet 7',
        facts: [
          'It spins lying on its side, like a rolling ball.',
          'An ice giant: blue-green and very, very cold.',
          'One year there lasts 84 Earth years.',
        ],
      },
      it: {
        name: 'Urano', kind: 'Pianeta 7',
        facts: [
          'Gira sdraiato su un fianco, come una palla che rotola.',
          'Un gigante di ghiaccio: azzurro e freddissimo.',
          'Un anno lassù dura 84 anni della Terra.',
        ],
      },
    },
  },
  {
    id: 'neptune', texture: T('2k_neptune.jpg'),
    radius: 1.45, orbit: 78, angle: 175, tilt: 28.3, spin: 0.32,
    text: {
      en: {
        name: 'Neptune', kind: 'Planet 8',
        facts: [
          'The windiest planet: its winds are the fastest anywhere.',
          'Deep blue and very far away.',
          'One year there lasts 165 Earth years.',
        ],
      },
      it: {
        name: 'Nettuno', kind: 'Pianeta 8',
        facts: [
          'Il pianeta più ventoso: i suoi venti sono i più veloci di tutti.',
          'Blu intenso e lontanissimo.',
          'Un anno lassù dura 165 anni della Terra.',
        ],
      },
    },
  },
  {
    id: 'pluto', texture: T('2k_pluto.jpg'),
    radius: 0.3, orbit: 88, angle: 200, tilt: -57.5, spin: 0.08,
    text: {
      en: {
        name: 'Pluto', kind: 'Dwarf planet',
        facts: [
          'A dwarf planet, smaller than our Moon.',
          'It has a big glacier shaped like a heart.',
          'One year there lasts 248 Earth years.',
        ],
      },
      it: {
        name: 'Plutone', kind: 'Pianeta nano',
        facts: [
          'Un pianeta nano, più piccolo della nostra Luna.',
          'Ha un grande ghiacciaio a forma di cuore.',
          'Un anno lassù dura 248 anni della Terra.',
        ],
      },
    },
  },
]

export function positionOf(body: Body): Vector3 {
  const a = (body.angle * Math.PI) / 180
  return new Vector3(body.orbit * Math.cos(a), 0, -body.orbit * Math.sin(a))
}

// The size to frame on screen: Saturn's rings count, but they spread sideways, where the screen is wider.
export function viewRadius(body: Body): number {
  return body.rings ? body.radius * body.rings.outer * 0.65 : body.radius
}
