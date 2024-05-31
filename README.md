# Cesium-ZZTS

## Usage

```typescript
import CesiumZZTS from 'cesium-zzts'

const zzts = new CesiumZZTS(viewer, {
    url: 'url here',
    layerName: 'layerName here',
    customParameters: {
        layerId: 'layerId here',
    },
    onLoad(capabilities) {
        zzts.fly()
        console.log(capabilities)
    }
})
```