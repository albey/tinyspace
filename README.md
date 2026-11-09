# TinySpace

A simple space game for toddlers. Fly from the Sun out to Pluto, through the asteroid belt, one stop at a time: each planet spins on the screen with its name and a few facts, and the camera flies through the solar system to get from one to the next.

## How to play

| Control | What it does |
|---|---|
| → or the right button | Fly to the next planet, outward from the Sun |
| ← or the left button | Fly back toward the Sun |
| Dots at the bottom | Jump straight to any stop |
| ↑ / ↓, or the buttons top left | Step between Side view (level with the planets), From above (over the current planet) and Whole solar system |
| Drag | Turn around the planet (or the whole solar system) |
| Scroll or pinch | Zoom in and out |
| Right-drag or two-finger drag | Slide the view |
| Click a planet or its name | Fly to it |
| Enter, Space or 🔊 | Hear the name and the facts |
| 🇬🇧 EN / 🇮🇹 IT | Switch language (names, facts and voice) |

A link like `/#saturn` starts at that body.

## Run it

You need Node.js. Then:

```sh
npm install
npm run dev
```

and open the address it prints (http://localhost:5173).

## Credits

- Sun and planet textures, the star map, and Ceres (an artist's version, not a real map): [Solar System Scope](https://www.solarsystemscope.com/textures/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Pluto: NASA / Johns Hopkins APL / SwRI, New Horizons colour map (public domain), with the unmapped south filled in

## Licence

Code: MIT. Textures: see Credits.
