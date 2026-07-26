/* ============================================================================
 * CityLighting.tsx — dark cyberpunk lighting. Fog for depth, low fills, one cool
 * key, a few capped colored point lights near the core for neon bounce, and
 * HDR/IBL for REFLECTIONS ONLY (never as the visible background).
 * ========================================================================== */
import { Environment } from '@react-three/drei'
import { PALETTE } from './palette'

export function CityLighting({ useHdr = true, hdrFile }: { useHdr?: boolean; hdrFile?: string }) {
  return (
    <group>
      <fogExp2 attach="fog" args={[PALETTE.void, 0.0022]} />
      <ambientLight intensity={0.18} color={0x223049} />
      <hemisphereLight args={[0x2a4a8c, 0x2a0f3e, 0.5]} />
      {/* cool moon key for form */}
      <directionalLight position={[140, 220, -100]} intensity={0.9} color={0x9fc4ff} castShadow shadow-mapSize={[2048, 2048]} />
      {/* neon bounce near the downtown core (capped + distance-limited) */}
      <pointLight position={[0, 40, 0]} intensity={1.2} distance={280} decay={1.5} color={0xff3da6} />
      <pointLight position={[60, 24, 60]} intensity={0.8} distance={180} decay={1.7} color={0x35e6ff} />
      <pointLight position={[-70, 24, -50]} intensity={0.8} distance={180} decay={1.7} color={0x7b2ff7} />
      {useHdr && (
        hdrFile
          ? <Environment files={hdrFile} background={false} environmentIntensity={0.6} />
          : <Environment preset="night" background={false} environmentIntensity={0.5} />
      )}
    </group>
  )
}
