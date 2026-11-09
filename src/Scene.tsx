import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import {
  BackSide, BufferGeometry, DoubleSide, IcosahedronGeometry, Line, LineBasicMaterial, MathUtils,
  Object3D, RingGeometry, SRGBColorSpace, TextureLoader, Vector3,
  type Group, type InstancedMesh, type Mesh, type Texture,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BELT, BODIES, overviewRadius, positionOf, viewRadius, type Body } from './bodies'

// Side: level with the orbits. Top: from above, close to one body. All: the whole solar system from above.
export type View = 'side' | 'top' | 'all'

function useTexture(url: string): Texture {
  const texture = useLoader(TextureLoader, url)
  // Colour pictures are stored in sRGB; without this they look washed out.
  useLayoutEffect(() => {
    texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
  }, [texture])
  return texture
}

function Stars() {
  const map = useTexture('/textures/2k_stars_milky_way.jpg')
  return (
    <mesh>
      <sphereGeometry args={[2000, 64, 32]} />
      <meshBasicMaterial map={map} side={BackSide} depthWrite={false} color="#888" />
    </mesh>
  )
}

function Rings({ body }: { body: Body }) {
  const { inner, outer, texture } = body.rings!
  const map = useTexture(texture)
  // The ring picture is a strip that runs from the inner edge to the outer edge,
  // so each point of the ring takes the colour at its distance from the planet.
  const geometry = useMemo(() => {
    const g = new RingGeometry(inner * body.radius, outer * body.radius, 128, 1)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    const v = new Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      uv.setXY(i, (v.length() - inner * body.radius) / ((outer - inner) * body.radius), 0.5)
    }
    return g
  }, [inner, outer, body.radius])

  return (
    <mesh geometry={geometry} rotation-x={-Math.PI / 2}>
      {/* Unlit: the Sun hits the rings almost edge-on, which would make them nearly black */}
      <meshBasicMaterial map={map} side={DoubleSide} transparent color="#d8d2c4" />
    </mesh>
  )
}

function Clouds({ url, radius, spin }: { url: string; radius: number; spin: number }) {
  const alpha = useLoader(TextureLoader, url)
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    ref.current!.rotation.y += delta * spin
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius * 1.015, 64, 32]} />
      <meshStandardMaterial color="white" alphaMap={alpha} transparent depthWrite={false} />
    </mesh>
  )
}

function Planet({ body, overview, onPick }: { body: Body; overview: boolean; onPick: () => void }) {
  const map = useTexture(body.texture)
  const surface = useRef<Mesh>(null)
  const sized = useRef<Group>(null)
  const isSun = body.id === 'sun'

  useFrame((_, delta) => {
    surface.current!.rotation.y += delta * body.spin
    // Grows smoothly for the whole-solar-system view, and back again.
    const scale = overview ? overviewRadius(body) / body.radius : 1
    sized.current!.scale.setScalar(MathUtils.damp(sized.current!.scale.x, scale, 3, delta))
  })

  // A click picks the body, but not the end of a drag that happened to start on it.
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return
    e.stopPropagation()
    onPick()
  }

  return (
    <group position={positionOf(body)} ref={sized} onClick={click}>
      {/* Tilted group: the planet spins around its own tilted axis, and the rings sit on its equator */}
      <group rotation-z={MathUtils.degToRad(body.tilt)}>
        <mesh ref={surface}>
          <sphereGeometry args={[body.radius, 64, 32]} />
          {isSun ? (
            <meshBasicMaterial map={map} toneMapped={false} />
          ) : (
            <meshStandardMaterial map={map} roughness={1} metalness={0} />
          )}
        </mesh>
        {body.clouds && <Clouds url={body.clouds} radius={body.radius} spin={body.spin * 1.2} />}
        {body.rings && <Rings body={body} />}
      </group>
    </group>
  )
}

// Same numbers every time, so the rocks don't jump about between visits.
function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A lumpy rock: a ball pushed in and out. Each point moves by an amount worked out from where it is,
// so the corners shared by neighbouring faces move together and the rock stays closed.
function rockGeometry(detail: number) {
  const g = new IcosahedronGeometry(1, detail)
  const pos = g.attributes.position
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const bump = Math.sin(v.x * 5.1 + v.y * 3.7) * Math.cos(v.z * 4.3 - v.x * 2.9)
    v.multiplyScalar(1 + 0.28 * bump).multiply(new Vector3(1.25, 0.85, 1))
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

type RocksProps = { count: number; seed: number; detail: number; place: (random: () => number, at: Object3D) => void }

function Rocks({ count, seed, detail, place }: RocksProps) {
  const ref = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => rockGeometry(detail), [detail])
  useLayoutEffect(() => {
    const random = seededRandom(seed)
    const at = new Object3D()
    for (let i = 0; i < count; i++) {
      at.position.set(0, 0, 0)
      at.rotation.set(random() * 6.3, random() * 6.3, random() * 6.3)
      place(random, at)
      at.updateMatrix()
      ref.current!.setMatrixAt(i, at.matrix)
    }
    ref.current!.instanceMatrix.needsUpdate = true
  }, [count, seed, place])
  return (
    <instancedMesh ref={ref} args={[geometry, undefined, count]}>
      <meshStandardMaterial color="#8d8378" roughness={1} flatShading />
    </instancedMesh>
  )
}

// Anywhere in the belt except right around Ceres, where the camera stops: placeNearCeres fills that.
function placeInBelt(random: () => number, at: Object3D) {
  const ceres = positionOf(BODIES.find((b) => b.id === 'belt')!)
  do {
    const angle = random() * Math.PI * 2
    // More rocks in the middle of the belt than at its edges.
    const r = BELT.inner + (BELT.outer - BELT.inner) * (random() + random()) / 2
    at.position.set(r * Math.cos(angle), (random() - 0.5) * 1.2, -r * Math.sin(angle))
  } while (at.position.distanceTo(ceres) < 2.5)
  at.scale.setScalar(0.03 + random() ** 3 * 0.14)
}

// Small rocks around Ceres, but none on the camera's side, where they would block the view.
function placeNearCeres(random: () => number, at: Object3D) {
  const ceres = BODIES.find((b) => b.id === 'belt')!
  const toCamera = poseFor(ceres, 'side').position.sub(positionOf(ceres)).normalize()
  const direction = new Vector3()
  do {
    direction.set(random() - 0.5, (random() - 0.5) * 0.3, random() - 0.5).normalize()
  } while (direction.dot(toCamera) > 0.1)
  at.position.copy(direction.multiplyScalar(0.5 + random() * 2.2))
  at.scale.setScalar(0.008 + random() ** 3 * 0.035)
}

// Thousands of simple rocks round the Sun, plus more detailed ones close to Ceres so its stop is full of them.
// They stay still: drifting rocks would wander in front of the camera.
function AsteroidBelt() {
  const ceres = BODIES.find((b) => b.id === 'belt')!
  return (
    <>
      <Rocks count={5000} seed={1} detail={1} place={placeInBelt} />
      <group position={positionOf(ceres)}>
        <Rocks count={300} seed={2} detail={2} place={placeNearCeres} />
      </group>
    </>
  )
}

// A faint circle for each planet's path round the Sun: brighter while flying and from above,
// barely there next to a planet, where it would cut through it.
const orbitMaterial = new LineBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0, depthWrite: false })

function Orbits({ view, flying }: { view: View; flying: boolean }) {
  const lines = useMemo(
    () =>
      BODIES.filter((b) => b.orbit > 0 && b.id !== 'belt').map((b) => {
        const points = Array.from({ length: 257 }, (_, i) => {
          const a = (i / 256) * Math.PI * 2
          return new Vector3(b.orbit * Math.cos(a), 0, b.orbit * Math.sin(a))
        })
        return new Line(new BufferGeometry().setFromPoints(points), orbitMaterial)
      }),
    [],
  )
  useFrame((_, delta) => {
    const target = view !== 'side' ? 0.45 : flying ? 0.35 : 0.08
    orbitMaterial.opacity = MathUtils.damp(orbitMaterial.opacity, target, 3, delta)
  })
  return (
    <>
      {lines.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </>
  )
}

type Pose = { position: Vector3; target: Vector3 }

// Where the camera sits to look at a body.
// Side view: level with the orbits, a little off the line to the Sun, so the body is mostly lit
// with a sliver of night on one side.
// From above: high over the body, leaning back a little so the Sun is towards the top of the screen.
// Whole solar system: high over the Sun, tilted a little so the planets look round, not flat.
const OVERVIEW: Pose = { target: new Vector3(0, 0, 4), position: new Vector3(0, 175, 70) }

function poseFor(body: Body, view: View): Pose {
  if (view === 'all') return { target: OVERVIEW.target.clone(), position: OVERVIEW.position.clone() }
  const centre = positionOf(body)
  if (view === 'top') {
    const height = Math.max(viewRadius(body) * 8, 18)
    const away = body.orbit === 0 ? new Vector3(0, 0, 1) : centre.clone().normalize()
    return { target: centre, position: centre.clone().addScaledVector(away, height * 0.12).setY(height) }
  }
  // Aim a little below the body, so it sits in the space between the name and the facts.
  const target = centre.clone().setY(-viewRadius(body) * 0.3)
  if (body.orbit === 0) {
    return { target, position: new Vector3(0.35, 0.15, 1).normalize().multiplyScalar(body.radius * 5) }
  }
  const towardSun = centre.clone().negate().normalize()
  towardSun.applyAxisAngle(new Vector3(0, 1, 0), 0.7)
  towardSun.y = 0.18
  const position = centre.clone().add(towardSun.normalize().multiplyScalar(viewRadius(body) * 5))
  return { position, target }
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function bezier(p0: Vector3, c0: Vector3, c1: Vector3, p1: Vector3, t: number, out: Vector3) {
  const u = 1 - t
  return out
    .copy(p0).multiplyScalar(u * u * u)
    .addScaledVector(c0, 3 * u * u * t)
    .addScaledVector(c1, 3 * u * t * t)
    .addScaledVector(p1, t * t * t)
}

type Flight = {
  from: Pose
  to: Pose
  c0: Vector3
  c1: Vector3
  duration: number
  elapsed: number
  // How much the camera turns toward the Sun halfway.
  glance: number
  // A new body: tell the app when we get there. Just changing the view: nothing to announce.
  announce: boolean
}

// Flies the camera from body to body: up and back so the Sun and the other planets come into view,
// then down into the next one. Changing the view is a shorter, direct swoop.
// Between flights you can drag to turn around the body, scroll or pinch to zoom, and right-drag to slide.
function CameraRig({ index, view, onArrive }: { index: number; view: View; onArrive: () => void }) {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  const controls = useMemo(() => {
    const c = new OrbitControls(camera, canvas)
    c.enableDamping = true
    c.maxDistance = 600
    return c
  }, [camera, canvas])
  useEffect(() => () => controls.dispose(), [controls])
  // Where the camera looks: the controls turn around this point, the flights move it.
  const lookAt = useRef(controls.target)
  const flight = useRef<Flight | null>(null)
  const shown = useRef<{ index: number; view: View } | null>(null)
  const arrive = useRef(onArrive)
  useLayoutEffect(() => {
    arrive.current = onArrive
  }, [onArrive])

  useLayoutEffect(() => {
    // React may run this twice for the same thing: only a new body or view starts a flight.
    const was = shown.current
    if (was?.index === index && was.view === view) return
    shown.current = { index, view }
    // Close to a body, zooming stops before going inside it.
    controls.minDistance = view === 'all' ? 10 : viewRadius(BODIES[index]) * 1.6
    const to = poseFor(BODIES[index], view)
    if (!was) {
      camera.position.copy(to.position)
      lookAt.current.copy(to.target)
      camera.lookAt(lookAt.current)
      return
    }
    // Whole solar system: the camera stays put, a new body is just highlighted.
    if (was.view === 'all' && view === 'all') {
      arrive.current()
      return
    }
    // Start from wherever the camera is now, even halfway through another flight.
    const from = { position: camera.position.clone(), target: lookAt.current.clone() }
    if (was.index === index) {
      const c0 = from.position.clone().lerp(to.position, 1 / 3)
      const c1 = from.position.clone().lerp(to.position, 2 / 3)
      flight.current = { from, to, c0, c1, duration: 1.8, elapsed: 0, glance: 0, announce: false }
      return
    }
    const gap = from.target.distanceTo(to.target)
    const lift = Math.max(gap * 0.8, 24)
    const away = (p: Pose) => p.position.clone().sub(p.target).setY(0).normalize()
    const c0 = from.position.clone().addScaledVector(away(from), lift * 0.8).setY(from.position.y + lift)
    const c1 = to.position.clone().addScaledVector(away(to), lift * 0.8).setY(to.position.y + lift)
    flight.current = { from, to, c0, c1, duration: 2.4 + Math.min(1.6, gap / 50), elapsed: 0, glance: 0.6, announce: true }
  }, [index, view, camera, controls])

  const sun = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    const f = flight.current
    controls.enabled = !f
    if (!f) {
      controls.update(delta)
      return
    }
    f.elapsed = Math.min(f.duration, f.elapsed + delta)
    const t = easeInOut(f.elapsed / f.duration)
    bezier(f.from.position, f.c0, f.c1, f.to.position, t, camera.position)
    // Halfway, the camera glances toward the Sun so you see where you are in the solar system.
    lookAt.current.lerpVectors(f.from.target, f.to.target, t).lerp(sun, Math.sin(Math.PI * t) * f.glance)
    camera.lookAt(lookAt.current)
    if (f.elapsed >= f.duration) {
      flight.current = null
      if (f.announce) arrive.current()
    }
  })

  return null
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

// Keeps the name labels of the whole-solar-system view next to their bodies, wherever the camera goes.
function Labels({ labels, view }: { labels: RefObject<(HTMLElement | null)[]>; view: View }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const point = useMemo(() => new Vector3(), [])
  useFrame(() => {
    if (view !== 'all') return
    BODIES.forEach((body, i) => {
      const label = labels.current[i]
      if (!label) return
      // Just below the body: towards the bottom of the screen is towards +z, seen from above.
      point.copy(positionOf(body)).add(new Vector3(0, 0, overviewRadius(body) * 1.15)).project(camera)
      const x = ((point.x + 1) / 2) * size.width
      const y = ((1 - point.y) / 2) * size.height
      label.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`
      label.style.visibility = point.z < 1 ? 'visible' : 'hidden'
    })
  })
  return null
}

type SceneProps = {
  index: number
  view: View
  flying: boolean
  labels: RefObject<(HTMLElement | null)[]>
  onPick: (index: number) => void
  onArrive: () => void
  onReady: () => void
}

export default function Scene({ index, view, flying, labels, onPick, onArrive, onReady }: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} />
      <Stars />
      <Orbits view={view} flying={flying} />
      <AsteroidBelt />
      {BODIES.map((body, i) => (
        <Planet key={body.id} body={body} overview={view === 'all'} onPick={() => onPick(i)} />
      ))}
      <CameraRig index={index} view={view} onArrive={onArrive} />
      <Labels labels={labels} view={view} />
      <Ready onReady={onReady} />
    </>
  )
}
