import { Environment } from '@react-three/drei'
import { PALETTE } from './palette'

export function CityLighting({
  useHdr = true,
  hdrFile,
  fogDensity = 0.0016,
}: { useHdr?: boolean; hdrFile?: string; fogDensity?: number }) {
  return (
    <group>
      <fogExp2 attach="fog" args={[PALETTE.void, fogDensity]} />
      <ambientLight intensity={0.16} color={0x223049} />
      <hemisphereLight args={[0x2a4a8c, 0x1a0a2e, 0.45]} />
      <directionalLight position={[160, 240, -120]} intensity={1.15} color={0x9fc4ff} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} />
      <pointLight position={[0, 46, 0]} intensity={1.3} distance={300} decay={1.5} color={0xff3da6} />
      <pointLight position={[70, 26, 70]} intensity={0.85} distance={190} decay={1.7} color={0x35e6ff} />
      <pointLight position={[-80, 26, -55]} intensity={0.85} distance={190} decay={1.7} color={0x7b2ff7} />
      {useHdr && (
        <Environment files={hdrFile || '/cyber_assets/hdri/night_sky.hdr'} background={false} environmentIntensity={hdrFile ? 0.7 : 0.55} />
      )}
    </group>
  )
}
