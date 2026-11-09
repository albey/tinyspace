import { useFrame, useLoader, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BackSide, DoubleSide, MathUtils, RingGeometry, SRGBColorSpace, TextureLoader, Vector3,
  type Mesh, type Texture,
} from 'three'
import { BODIES, positionOf, viewRadius, type Body } from './bodies'

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

function Planet({ body }: { body: Body }) {
  const map = useTexture(body.texture)
  const surface = useRef<Mesh>(null)
  const isSun = body.id === 'sun'

  useFrame((_, delta) => {
    surface.current!.rotation.y += delta * body.spin
  })

  return (
    <group position={positionOf(body)}>
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

type Pose = { position: Vector3; target: Vector3 }

// Where the camera sits to look at a body: a little off the line to the Sun,
// so the body is mostly lit with a sliver of night on one side.
function poseFor(body: Body): Pose {
  const centre = positionOf(body)
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
}

// Flies the camera from body to body: up and back so the Sun and the other planets come into view,
// then down into the next one.
function CameraRig({ index, onArrive }: { index: number; onArrive: () => void }) {
  const camera = useThree((s) => s.camera)
  const lookAt = useRef(new Vector3())
  const flight = useRef<Flight | null>(null)
  const shown = useRef<number | null>(null)
  const arrive = useRef(onArrive)
  useLayoutEffect(() => {
    arrive.current = onArrive
  }, [onArrive])

  useLayoutEffect(() => {
    // React may run this twice for the same body: only a new body starts a flight.
    if (shown.current === index) return
    const first = shown.current === null
    shown.current = index
    const to = poseFor(BODIES[index])
    if (first) {
      camera.position.copy(to.position)
      lookAt.current.copy(to.target)
      camera.lookAt(lookAt.current)
      return
    }
    // Start from wherever the camera is now, even halfway through another flight.
    const from = { position: camera.position.clone(), target: lookAt.current.clone() }
    const gap = from.target.distanceTo(to.target)
    const lift = Math.max(gap * 0.8, 24)
    const away = (p: Pose) => p.position.clone().sub(p.target).setY(0).normalize()
    const c0 = from.position.clone().addScaledVector(away(from), lift * 0.8).setY(from.position.y + lift)
    const c1 = to.position.clone().addScaledVector(away(to), lift * 0.8).setY(to.position.y + lift)
    flight.current = { from, to, c0, c1, duration: 2.4 + Math.min(1.6, gap / 50), elapsed: 0 }
  }, [index, camera])

  const sun = useMemo(() => new Vector3(), [])

  useFrame((_, delta) => {
    const f = flight.current
    if (!f) return
    f.elapsed = Math.min(f.duration, f.elapsed + delta)
    const t = easeInOut(f.elapsed / f.duration)
    bezier(f.from.position, f.c0, f.c1, f.to.position, t, camera.position)
    // Halfway, the camera glances toward the Sun so you see where you are in the solar system.
    lookAt.current.lerpVectors(f.from.target, f.to.target, t).lerp(sun, Math.sin(Math.PI * t) * 0.6)
    camera.lookAt(lookAt.current)
    if (f.elapsed >= f.duration) {
      flight.current = null
      arrive.current()
    }
  })

  return null
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

export default function Scene({ index, onArrive, onReady }: { index: number; onArrive: () => void; onReady: () => void }) {
  return (
    <>
      <ambientLight intensity={0.12} />
      <pointLight position={[0, 0, 0]} intensity={3} decay={0} />
      <Stars />
      {BODIES.map((body) => (
        <Planet key={body.id} body={body} />
      ))}
      <CameraRig index={index} onArrive={onArrive} />
      <Ready onReady={onReady} />
    </>
  )
}
